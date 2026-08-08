import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createEstablishment,
  createPatient,
  createTestDatabase,
  createUser,
  queryAsAuthenticated,
  type TestDatabase,
} from './helpers/database';

/**
 * Module Pharmacie — circuit du médicament et stocks (BP17, BP18, BP19).
 *
 * Ces règles portent sur des médicaments : un stock faux, un lot périmé
 * délivré ou un mouvement effacé ne sont pas des défauts d'affichage. Elles
 * sont donc tenues par la base, et non par le formulaire qui les précède.
 */

let db: TestDatabase;
let establishment: string;
let voisin: string;
let admin: string;
let pharmacist: string;
let nurse: string;
let patient: string;
let pharmacy: string;
let item: string;

const one = async <T>(sql: string, params: unknown[] = []): Promise<T> => {
  const rows = await db.query<T>(sql, params);
  return rows.rows[0];
};

const createItem = async (
  establishmentId: string,
  name: string,
  options: { reorder?: number; rule?: string; controlled?: boolean } = {},
): Promise<string> => {
  const row = await one<{ id: string }>(
    `INSERT INTO public.pharmacy_items
       (establishment_id, name, generic_name, category, unit_price, purchase_price,
        reorder_level, issue_rule, is_controlled, form, dosage, unit)
     VALUES ($1, $2, $2, 'Antibiotique', 1200, 800, $3, $4, $5, 'Comprimé', '500 mg', 'Boîte')
     RETURNING id`,
    [establishmentId, name, options.reorder ?? 0, options.rule ?? 'FEFO', options.controlled ?? false],
  );
  return row.id;
};

const createLot = async (
  itemId: string,
  lotNumber: string,
  expiresOn: string | null,
): Promise<string> => {
  const row = await one<{ id: string }>(
    `INSERT INTO public.medication_lots
       (establishment_id, item_id, pharmacy_id, lot_number, expires_on, unit_cost)
     VALUES ($1, $2, $3, $4, $5, 800) RETURNING id`,
    [establishment, itemId, pharmacy, lotNumber, expiresOn],
  );
  return row.id;
};

const move = (
  itemId: string,
  lotId: string | null,
  quantity: number,
  kind = 'entry',
): Promise<unknown> =>
  db.query(
    `INSERT INTO public.stock_movements
       (establishment_id, item_id, lot_id, pharmacy_id, kind, quantity, unit_cost, reason)
     VALUES ($1, $2, $3, $4, $5::public.stock_movement_kind, $6, 800, 'Test')`,
    [establishment, itemId, lotId, pharmacy, kind, quantity],
  );

const lotQuantity = async (lotId: string): Promise<number> =>
  (await one<{ quantity: number }>(`SELECT quantity FROM public.medication_lots WHERE id = $1`, [lotId]))
    .quantity;

beforeAll(async () => {
  db = await createTestDatabase();

  establishment = await createEstablishment(db, 'Clinique Pharma');
  voisin = await createEstablishment(db, 'Clinique Voisine');

  admin = await createUser(db, {
    email: 'admin@pharma.km',
    role: 'establishment_admin',
    establishmentId: establishment,
  });
  pharmacist = await createUser(db, {
    email: 'pharma@pharma.km',
    role: 'pharmacist',
    establishmentId: establishment,
  });
  nurse = await createUser(db, {
    email: 'nurse@pharma.km',
    role: 'nurse',
    establishmentId: establishment,
  });

  patient = await createPatient(db, establishment, 'Delta');

  const site = await one<{ id: string }>(
    `INSERT INTO public.stock_locations (establishment_id, level, code, name)
     VALUES ($1, 'site', 'DEPOT', 'Dépôt Central') RETURNING id`,
    [establishment],
  );

  pharmacy = (
    await one<{ id: string }>(
      `INSERT INTO public.pharmacies (establishment_id, name, location_id, is_default)
       VALUES ($1, 'Pharmacie Centrale', $2, TRUE) RETURNING id`,
      [establishment, site.id],
    )
  ).id;

  item = await createItem(establishment, 'Amoxicilline', { reorder: 20 });
}, 180_000);

afterAll(async () => {
  await db?.close();
});

describe('Emplacements et pharmacies', () => {
  it('n’accepte un emplacement sans parent que s’il est un site', async () => {
    // BP18 §4 : la hiérarchie part toujours d'un site. Un magasin orphelin
    // rendrait la localisation d'un article indéterminable.
    await expect(
      db.query(
        `INSERT INTO public.stock_locations (establishment_id, level, code, name)
         VALUES ($1, 'warehouse', 'ORPHELIN', 'Magasin sans site')`,
        [establishment],
      ),
    ).rejects.toThrow();
  });

  it('n’autorise qu’une seule pharmacie par défaut', async () => {
    await expect(
      db.query(
        `INSERT INTO public.pharmacies (establishment_id, name, is_default)
         VALUES ($1, 'Pharmacie des Urgences', TRUE)`,
        [establishment],
      ),
    ).rejects.toThrow();
  });

  it('accepte plusieurs pharmacies et armoires de service', async () => {
    const urgences = await one<{ business_reference: string }>(
      `INSERT INTO public.pharmacies (establishment_id, name) VALUES ($1, 'Pharmacie des Urgences')
       RETURNING business_reference`,
      [establishment],
    );
    const armoire = await one<{ is_service_cabinet: boolean }>(
      `INSERT INTO public.pharmacies (establishment_id, name, is_service_cabinet, service, supplied_by)
       VALUES ($1, 'Armoire Réanimation', TRUE, 'Réanimation', $2)
       RETURNING is_service_cabinet`,
      [establishment, pharmacy],
    );

    expect(urgences.business_reference).toMatch(/^MORA-PHM-\d{6}$/);
    expect(armoire.is_service_cabinet).toBe(true);
  });
});

describe('Lots et mouvements', () => {
  it('reporte l’entrée sur le lot et sur l’article', async () => {
    const lot = await createLot(item, 'LOT-A', '2027-06-30');
    await move(item, lot, 50);

    expect(await lotQuantity(lot)).toBe(50);

    const article = await one<{ stock_quantity: number }>(
      `SELECT stock_quantity FROM public.pharmacy_items WHERE id = $1`,
      [item],
    );
    expect(article.stock_quantity).toBe(50);
  });

  it('refuse une sortie supérieure au stock du lot', async () => {
    const lot = await one<{ id: string }>(
      `SELECT id FROM public.medication_lots WHERE lot_number = 'LOT-A'`,
    );

    await expect(move(item, lot.id, -80, 'exit')).rejects.toThrow(/Stock insuffisant/);
    // Le refus ne doit rien avoir consommé.
    expect(await lotQuantity(lot.id)).toBe(50);
  });

  it('refuse un mouvement dont le lot ne correspond pas au produit', async () => {
    const autre = await createItem(establishment, 'Paracétamol');
    const lot = await one<{ id: string }>(
      `SELECT id FROM public.medication_lots WHERE lot_number = 'LOT-A'`,
    );

    await expect(move(autre, lot.id, 10)).rejects.toThrow(/ne correspond pas/);
  });

  it('BR-079 : le registre des mouvements est immuable', async () => {
    const mouvement = await one<{ id: string }>(
      `SELECT id FROM public.stock_movements ORDER BY created_at LIMIT 1`,
    );

    await expect(
      db.query(`UPDATE public.stock_movements SET quantity = 999 WHERE id = $1`, [mouvement.id]),
    ).rejects.toThrow(/immuable/);

    await expect(
      db.query(`DELETE FROM public.stock_movements WHERE id = $1`, [mouvement.id]),
    ).rejects.toThrow(/immuable/);
  });

  it('marque périmé un lot dont la date est dépassée', async () => {
    const lot = await createLot(item, 'LOT-PERIME', '2020-01-01');
    await move(item, lot, 10);

    const row = await one<{ state: string }>(
      `SELECT state FROM public.medication_lots WHERE id = $1`,
      [lot],
    );
    expect(row.state).toBe('expired');
  });

  it('refuse une date de fabrication postérieure à la péremption', async () => {
    await expect(
      db.query(
        `INSERT INTO public.medication_lots
           (establishment_id, item_id, lot_number, manufactured_on, expires_on)
         VALUES ($1, $2, 'LOT-INVERSE', '2027-01-01', '2026-01-01')`,
        [establishment, item],
      ),
    ).rejects.toThrow();
  });
});

describe('Règle FEFO (BR-087)', () => {
  it('propose d’abord le lot dont la péremption est la plus proche', async () => {
    const lointain = await createLot(item, 'LOT-2030', '2030-01-01');
    const proche = await createLot(item, 'LOT-2027', '2027-01-15');
    await move(item, lointain, 100);
    await move(item, proche, 30);

    const rows = await db.query<{ lot_number: string; take: number }>(
      `SELECT lot_number, take FROM public.suggest_lots($1, $2, 40)`,
      [item, pharmacy],
    );

    // 30 pris sur le lot proche, le reste sur le suivant : c'est l'ordre FEFO,
    // celui qui limite les pertes.
    expect(rows.rows[0].lot_number).toBe('LOT-2027');
    expect(rows.rows[0].take).toBe(30);
    expect(rows.rows[1].take).toBe(10);
  });

  it('n’propose jamais un lot périmé', async () => {
    const rows = await db.query<{ lot_number: string }>(
      `SELECT lot_number FROM public.suggest_lots($1, $2, 500)`,
      [item, pharmacy],
    );

    expect(rows.rows.map((r) => r.lot_number)).not.toContain('LOT-PERIME');
  });

  it('respecte la règle FIFO lorsqu’elle est configurée sur l’article', async () => {
    const fifo = await createItem(establishment, 'Sérum physiologique', { rule: 'FIFO' });
    const ancien = await createLot(fifo, 'FIFO-ANCIEN', '2029-12-31');
    const recent = await createLot(fifo, 'FIFO-RECENT', '2028-01-01');
    await move(fifo, ancien, 10);
    await move(fifo, recent, 10);

    const rows = await db.query<{ lot_number: string }>(
      `SELECT lot_number FROM public.suggest_lots($1, $2, 5)`,
      [fifo, pharmacy],
    );

    // En FIFO, c'est l'ordre d'entrée qui décide, pas la péremption.
    expect(rows.rows[0].lot_number).toBe('FIFO-ANCIEN');
  });
});

describe('Délivrance (BR-085, BR-086)', () => {
  const dispense = async (lotId: string, quantity: number): Promise<string> => {
    const head = await one<{ id: string }>(
      `INSERT INTO public.dispensations
         (establishment_id, pharmacy_id, patient_id, dispensed_by, status)
       VALUES ($1, $2, $3, $4, 'delivered') RETURNING id`,
      [establishment, pharmacy, patient, pharmacist],
    );

    await db.query(
      `INSERT INTO public.dispensation_lines (dispensation_id, item_id, lot_id, quantity, unit_price)
       VALUES ($1, $2, $3, $4, 1200)`,
      [head.id, item, lotId, quantity],
    );

    return head.id;
  };

  it('décrémente le stock automatiquement', async () => {
    const lot = await one<{ id: string; quantity: number }>(
      `SELECT id, quantity FROM public.medication_lots WHERE lot_number = 'LOT-2030'`,
    );

    await dispense(lot.id, 12);

    expect(await lotQuantity(lot.id)).toBe(lot.quantity - 12);
  });

  it('crée le mouvement de sortie rattaché au patient', async () => {
    const mouvement = await one<{ kind: string; quantity: number; patient_id: string }>(
      `SELECT kind::TEXT, quantity, patient_id FROM public.stock_movements
        WHERE source_table = 'dispensations' ORDER BY created_at DESC LIMIT 1`,
    );

    expect(mouvement.kind).toBe('exit');
    expect(mouvement.quantity).toBe(-12);
    expect(mouvement.patient_id).toBe(patient);
  });

  it('cumule le montant de la délivrance', async () => {
    const row = await one<{ total_amount: string }>(
      `SELECT total_amount FROM public.dispensations ORDER BY created_at DESC LIMIT 1`,
    );
    expect(Number(row.total_amount)).toBe(12 * 1200);
  });

  it('refuse un lot périmé lorsque le paramètre l’interdit', async () => {
    const lot = await one<{ id: string }>(
      `SELECT id FROM public.medication_lots WHERE lot_number = 'LOT-PERIME'`,
    );

    await expect(dispense(lot.id, 1)).rejects.toThrow(/périmé/);
  });

  it('autorise le lot périmé si le paramètre de l’établissement le permet', async () => {
    // Le réglage « Interdire la délivrance d'un produit périmé » doit piloter
    // réellement le module : c'est la base qui le lit, pas seulement l'écran.
    await db.query(
      `UPDATE public.establishments
          SET module_settings = jsonb_set(module_settings, '{pharmacy,blockExpiredDispensing}', 'false')
        WHERE id = $1`,
      [establishment],
    );

    const lot = await one<{ id: string }>(
      `SELECT id FROM public.medication_lots WHERE lot_number = 'LOT-PERIME'`,
    );

    await expect(dispense(lot.id, 1)).resolves.toBeTruthy();

    await db.query(
      `UPDATE public.establishments
          SET module_settings = jsonb_set(module_settings, '{pharmacy,blockExpiredDispensing}', 'true')
        WHERE id = $1`,
      [establishment],
    );
  });

  it('BP19 §8 : refuse la délivrance d’une prescription non validée', async () => {
    const lot = await one<{ id: string }>(
      `SELECT id FROM public.medication_lots WHERE lot_number = 'LOT-2030'`,
    );
    const prescription = await one<{ id: string }>(
      `INSERT INTO public.prescriptions
         (establishment_id, patient_id, doctor_id, medications)
       VALUES ($1, $2, $3, '[]'::JSONB) RETURNING id`,
      [establishment, patient, pharmacist],
    );

    const head = await one<{ id: string }>(
      `INSERT INTO public.dispensations
         (establishment_id, pharmacy_id, patient_id, prescription_id, dispensed_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [establishment, pharmacy, patient, prescription.id, pharmacist],
    );

    const line = () =>
      db.query(
        `INSERT INTO public.dispensation_lines (dispensation_id, item_id, lot_id, quantity, unit_price)
         VALUES ($1, $2, $3, 1, 1200)`,
        [head.id, item, lot.id],
      );

    await expect(line()).rejects.toThrow(/validée par le pharmacien/);

    // Une fois validée, la même délivrance passe.
    await db.query(
      `UPDATE public.prescriptions
          SET pharmacy_status = 'validated', validated_by = $2, validated_at = NOW()
        WHERE id = $1`,
      [prescription.id, pharmacist],
    );

    await expect(line()).resolves.toBeTruthy();
  });

  it('refuse toujours un lot rappelé, quel que soit le paramétrage', async () => {
    const lot = await createLot(item, 'LOT-RAPPEL', '2029-01-01');
    await move(item, lot, 20);
    await db.query(
      `UPDATE public.medication_lots
          SET state = 'recalled', recalled_at = NOW(), recall_reason = 'Rappel fabricant'
        WHERE id = $1`,
      [lot],
    );

    await expect(dispense(lot, 1)).rejects.toThrow(/rappel/);
  });
});

describe('Inventaire (BP18 §13)', () => {
  it('transforme les écarts constatés en mouvements', async () => {
    const lot = await one<{ id: string; quantity: number }>(
      `SELECT id, quantity FROM public.medication_lots WHERE lot_number = 'LOT-2030'`,
    );

    const inventaire = await one<{ id: string }>(
      `INSERT INTO public.stock_inventories (establishment_id, pharmacy_id, inventory_type)
       VALUES ($1, $2, 'targeted') RETURNING id`,
      [establishment, pharmacy],
    );

    // Comptage physique inférieur de 3 unités au théorique.
    await db.query(
      `INSERT INTO public.stock_inventory_lines
         (inventory_id, item_id, lot_id, expected_quantity, counted_quantity, counted_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [inventaire.id, item, lot.id, lot.quantity, lot.quantity - 3],
    );

    const adjusted = await one<{ close_stock_inventory: number }>(
      `SELECT public.close_stock_inventory($1, $2)`,
      [inventaire.id, pharmacist],
    );

    expect(adjusted.close_stock_inventory).toBe(1);
    expect(await lotQuantity(lot.id)).toBe(lot.quantity - 3);

    const mouvement = await one<{ kind: string; quantity: number }>(
      `SELECT kind::TEXT, quantity FROM public.stock_movements
        WHERE source_table = 'stock_inventories' ORDER BY created_at DESC LIMIT 1`,
    );
    expect(mouvement.kind).toBe('inventory');
    expect(mouvement.quantity).toBe(-3);
  });

  it('refuse de clôturer deux fois le même inventaire', async () => {
    const inventaire = await one<{ id: string }>(
      `SELECT id FROM public.stock_inventories ORDER BY created_at DESC LIMIT 1`,
    );

    await expect(
      db.query(`SELECT public.close_stock_inventory($1, $2)`, [inventaire.id, pharmacist]),
    ).rejects.toThrow(/déjà clôturé/);
  });
});

describe('État du stock', () => {
  it('applique le seuil des Paramètres quand l’article n’en porte pas', async () => {
    const sansSeuil = await createItem(establishment, 'Ibuprofène');

    const row = await queryAsAuthenticated<{ effective_reorder_level: number }>(
      db,
      admin,
      `SELECT effective_reorder_level FROM public.pharmacy_stock_state WHERE item_id = $1`,
      [sansSeuil],
    );

    // Valeur par défaut posée par la migration des réglages de module.
    expect(row[0].effective_reorder_level).toBe(10);
  });

  it('conserve le seuil propre à l’article lorsqu’il en a un', async () => {
    const row = await queryAsAuthenticated<{ effective_reorder_level: number }>(
      db,
      admin,
      `SELECT effective_reorder_level FROM public.pharmacy_stock_state WHERE item_id = $1`,
      [item],
    );
    expect(row[0].effective_reorder_level).toBe(20);
  });

  it('distingue les quantités périmées de celles qui approchent', async () => {
    const bientot = await createItem(establishment, 'Ceftriaxone');
    const lot = await one<{ id: string }>(
      `INSERT INTO public.medication_lots (establishment_id, item_id, pharmacy_id, lot_number, expires_on)
       VALUES ($1, $2, $3, 'LOT-BIENTOT', CURRENT_DATE + 10) RETURNING id`,
      [establishment, bientot, pharmacy],
    );
    await move(bientot, lot.id, 40);

    const row = await queryAsAuthenticated<{
      expiring_quantity: number;
      expired_quantity: number;
      stock_value: string;
    }>(
      db,
      admin,
      `SELECT expiring_quantity, expired_quantity, stock_value
         FROM public.pharmacy_stock_state WHERE item_id = $1`,
      [bientot],
    );

    expect(row[0].expiring_quantity).toBe(40);
    expect(row[0].expired_quantity).toBe(0);
    expect(Number(row[0].stock_value)).toBe(40 * 800);
  });
});

describe('Permissions et isolation (BP19 §25)', () => {
  it('le pharmacien gère le stock', async () => {
    const rows = await queryAsAuthenticated<{ can_create: boolean; can_update: boolean }>(
      db,
      pharmacist,
      `SELECT rp.can_create, rp.can_update
         FROM public.role_permissions rp JOIN public.modules m ON m.id = rp.module_id
        WHERE m.code = 'pharmacy' AND rp.role = 'pharmacist'`,
    );
    expect(rows[0]).toMatchObject({ can_create: true, can_update: true });
  });

  it('le responsable d’établissement gère aussi son module', async () => {
    const rows = await queryAsAuthenticated<{ can_create: boolean; can_delete: boolean }>(
      db,
      admin,
      `SELECT rp.can_create, rp.can_delete
         FROM public.role_permissions rp JOIN public.modules m ON m.id = rp.module_id
        WHERE m.code = 'pharmacy' AND rp.role = 'establishment_admin'`,
    );
    expect(rows[0]).toMatchObject({ can_create: true, can_delete: true });
  });

  it('l’infirmier consulte le stock sans pouvoir le modifier', async () => {
    const rows = await queryAsAuthenticated<{ can_view: boolean; can_create: boolean }>(
      db,
      nurse,
      `SELECT rp.can_view, rp.can_create
         FROM public.role_permissions rp JOIN public.modules m ON m.id = rp.module_id
        WHERE m.code = 'pharmacy' AND rp.role = 'nurse'`,
    );
    expect(rows[0]).toMatchObject({ can_view: true, can_create: false });
  });

  it('aucun stock d’un autre établissement n’est visible', async () => {
    await createItem(voisin, 'Produit du voisin');

    const rows = await queryAsAuthenticated<{ name: string }>(
      db,
      pharmacist,
      `SELECT name FROM public.pharmacy_stock_state ORDER BY name`,
    );

    expect(rows.map((r) => r.name)).not.toContain('Produit du voisin');
  });

  it('un lot ne peut pas être créé pour un autre établissement', async () => {
    const refused = await queryAsAuthenticated(
      db,
      pharmacist,
      `INSERT INTO public.medication_lots (establishment_id, item_id, lot_number)
       VALUES ($1, $2, 'PIRATE') RETURNING id`,
      [voisin, item],
    ).catch(() => 'refusé');

    expect(refused).toBe('refusé');
  });
});
