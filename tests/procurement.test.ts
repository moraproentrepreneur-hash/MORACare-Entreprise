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
 * Achats, vente, plans thérapeutiques, tournées et transferts.
 *
 * Références : BP17 (achats), BP18 §12 (réapprovisionnements internes),
 * BP19 §6 (plans), §10 (vente et délivrance), §11 (dispensation hospitalière).
 *
 * Ces règles portent sur des médicaments et sur de l'argent : elles sont tenues
 * par la base, et ces tests vérifient qu'elles le sont réellement.
 */

let db: TestDatabase;
let establishment: string;
let voisin: string;
let admin: string;
let pharmacist: string;
let nurse: string;
let patient: string;
let pharmacy: string;
let secondPharmacy: string;
let supplier: string;
let item: string;
let doctor: string;

const one = async <T>(sql: string, params: unknown[] = []): Promise<T> => {
  const rows = await db.query<T>(sql, params);
  return rows.rows[0];
};

const lotQuantity = async (lotId: string): Promise<number> =>
  (await one<{ quantity: number }>(`SELECT quantity FROM public.medication_lots WHERE id = $1`, [lotId]))
    .quantity;

const stockOf = async (itemId: string): Promise<number> =>
  (
    await one<{ stock_quantity: number }>(
      `SELECT stock_quantity FROM public.pharmacy_items WHERE id = $1`,
      [itemId],
    )
  ).stock_quantity;

beforeAll(async () => {
  db = await createTestDatabase();

  establishment = await createEstablishment(db, 'Clinique Achats');
  voisin = await createEstablishment(db, 'Clinique Voisine');

  admin = await createUser(db, {
    email: 'admin@achats.km',
    role: 'establishment_admin',
    establishmentId: establishment,
  });
  pharmacist = await createUser(db, {
    email: 'pharma@achats.km',
    role: 'pharmacist',
    establishmentId: establishment,
  });
  nurse = await createUser(db, {
    email: 'nurse@achats.km',
    role: 'nurse',
    establishmentId: establishment,
  });
  doctor = await createUser(db, {
    email: 'doc@achats.km',
    role: 'doctor',
    establishmentId: establishment,
  });

  patient = await createPatient(db, establishment, 'Achat');

  pharmacy = (
    await one<{ id: string }>(
      `INSERT INTO public.pharmacies (establishment_id, name, is_default)
       VALUES ($1, 'Pharmacie Centrale', TRUE) RETURNING id`,
      [establishment],
    )
  ).id;

  secondPharmacy = (
    await one<{ id: string }>(
      `INSERT INTO public.pharmacies (establishment_id, name, is_service_cabinet, service, supplied_by)
       VALUES ($1, 'Armoire Réanimation', TRUE, 'Réanimation', $2) RETURNING id`,
      [establishment, pharmacy],
    )
  ).id;

  supplier = (
    await one<{ id: string }>(
      `INSERT INTO public.suppliers (establishment_id, name, supplier_type)
       VALUES ($1, 'Grossiste Océan Indien', 'grossiste') RETURNING id`,
      [establishment],
    )
  ).id;

  item = (
    await one<{ id: string }>(
      `INSERT INTO public.pharmacy_items
         (establishment_id, name, generic_name, category, unit_price, purchase_price, unit)
       VALUES ($1, 'Amoxicilline 500', 'Amoxicilline', 'Antibiotique', 1200, 800, 'Boîte')
       RETURNING id`,
      [establishment],
    )
  ).id;
}, 180_000);

afterAll(async () => {
  await db?.close();
});

// ---------------------------------------------------------------------------

describe('Demandes d’achat (BP17 §6, §7)', () => {
  let requisition: string;

  it('porte une référence métier et un circuit de validation', async () => {
    const row = await one<{ id: string; business_reference: string; status: string }>(
      `INSERT INTO public.purchase_requisitions
         (establishment_id, requesting_service, justification, priority, requested_by)
       VALUES ($1, 'Pharmacie', 'Réapprovisionnement trimestriel', 'haute', $2)
       RETURNING id, business_reference, status`,
      [establishment, pharmacist],
    );
    requisition = row.id;

    expect(row.business_reference).toMatch(/^MORA-DAC-\d{6}$/);
    expect(row.status).toBe('draft');

    await db.query(
      `INSERT INTO public.purchase_requisition_lines
         (requisition_id, item_id, label, quantity, unit, estimated_price)
       VALUES ($1, $2, 'Amoxicilline 500', 100, 'Boîte', 800)`,
      [requisition, item],
    );
  });

  it('trace la décision et son auteur', async () => {
    await db.query(
      `UPDATE public.purchase_requisitions
          SET status = 'approved', decided_by = $2, decided_at = NOW(),
              decision_note = 'Budget disponible'
        WHERE id = $1`,
      [requisition, admin],
    );

    const row = await one<{ status: string; decided_by: string; decision_note: string }>(
      `SELECT status, decided_by, decision_note FROM public.purchase_requisitions WHERE id = $1`,
      [requisition],
    );

    expect(row.status).toBe('approved');
    expect(row.decided_by).toBe(admin);
    expect(row.decision_note).toBe('Budget disponible');
  });

  it('n’accepte qu’une seule offre retenue par demande (BP17 §9)', async () => {
    const quote = async (name: string, amount: number) => {
      const s = await one<{ id: string }>(
        `INSERT INTO public.suppliers (establishment_id, name) VALUES ($1, $2) RETURNING id`,
        [establishment, name],
      );
      return one<{ id: string }>(
        `INSERT INTO public.supplier_quotes
           (establishment_id, requisition_id, supplier_id, consultation_type, total_amount, delivery_days)
         VALUES ($1, $2, $3, 'devis', $4, 10) RETURNING id`,
        [establishment, requisition, s.id, amount],
      );
    };

    const a = await quote('Fournisseur A', 80000);
    const b = await quote('Fournisseur B', 76000);

    await db.query(`UPDATE public.supplier_quotes SET is_selected = TRUE WHERE id = $1`, [b.id]);

    // Deux offres retenues rendraient l'historique du choix inexploitable.
    await expect(
      db.query(`UPDATE public.supplier_quotes SET is_selected = TRUE WHERE id = $1`, [a.id]),
    ).rejects.toThrow();
  });

  it('refuse deux consultations du même fournisseur sur une demande', async () => {
    await expect(
      db.query(
        `INSERT INTO public.supplier_quotes
           (establishment_id, requisition_id, supplier_id, consultation_type, total_amount)
         VALUES ($1, $2, $3, 'devis', 1000)`,
        [establishment, requisition, supplier],
      ),
    ).resolves.toBeTruthy();

    await expect(
      db.query(
        `INSERT INTO public.supplier_quotes
           (establishment_id, requisition_id, supplier_id, consultation_type, total_amount)
         VALUES ($1, $2, $3, 'devis', 1100)`,
        [establishment, requisition, supplier],
      ),
    ).rejects.toThrow();
  });
});

describe('Commandes et réceptions (BP17 §10 à §13)', () => {
  let order: string;
  let orderLine: string;
  let receipt: string;

  it('recalcule le total de la commande depuis ses lignes', async () => {
    const head = await one<{ id: string }>(
      `INSERT INTO public.purchase_orders
         (establishment_id, supplier_id, pharmacy_id, status, shipping_cost)
       VALUES ($1, $2, $3, 'ordered', 5000) RETURNING id`,
      [establishment, supplier, pharmacy],
    );
    order = head.id;

    const line = await one<{ id: string }>(
      `INSERT INTO public.purchase_order_lines
         (order_id, item_id, quantity_ordered, unit_price)
       VALUES ($1, $2, 100, 800) RETURNING id`,
      [order, item],
    );
    orderLine = line.id;

    const row = await one<{ total_amount: string }>(
      `SELECT total_amount FROM public.purchase_orders WHERE id = $1`,
      [order],
    );
    // 100 × 800 + 5 000 de port.
    expect(Number(row.total_amount)).toBe(85000);
  });

  it('refuse de réceptionner plus que ce qui a été commandé', async () => {
    await expect(
      db.query(
        `UPDATE public.purchase_order_lines SET quantity_received = 150 WHERE id = $1`,
        [orderLine],
      ),
    ).rejects.toThrow();
  });

  it('BR-068 : refuse la mise en stock sans contrôle qualité', async () => {
    const head = await one<{ id: string; business_reference: string }>(
      `INSERT INTO public.purchase_receipts
         (establishment_id, order_id, pharmacy_id, delivery_note, received_by)
       VALUES ($1, $2, $3, 'BL-2026-001', $4) RETURNING id, business_reference`,
      [establishment, order, pharmacy, pharmacist],
    );
    receipt = head.id;
    expect(head.business_reference).toMatch(/^MORA-REC-\d{6}$/);

    await db.query(
      `INSERT INTO public.purchase_receipt_lines
         (receipt_id, order_line_id, item_id, quantity_received, lot_number, expires_on, unit_price)
       VALUES ($1, $2, $3, 60, 'LOT-RECEP-1', '2029-06-30', 800)`,
      [receipt, orderLine, item],
    );

    await expect(
      db.query(`SELECT public.post_purchase_receipt($1, $2)`, [receipt, pharmacist]),
    ).rejects.toThrow(/contrôlée avant sa mise en stock/);
  });

  it('refuse la mise en stock d’une réception refusée', async () => {
    await db.query(
      `UPDATE public.purchase_receipts
          SET quality_result = 'refused', quality_note = 'Chaîne du froid rompue',
              controlled_by = $2, controlled_at = NOW()
        WHERE id = $1`,
      [receipt, pharmacist],
    );

    await expect(
      db.query(`SELECT public.post_purchase_receipt($1, $2)`, [receipt, pharmacist]),
    ).rejects.toThrow(/refusée/);

    // La marchandise refusée n'a jamais été du stock disponible.
    expect(await stockOf(item)).toBe(0);
  });

  it('BR-069 : une réception acceptée crée le lot et l’entrée de stock', async () => {
    await db.query(
      `UPDATE public.purchase_receipts
          SET quality_result = 'accepted', quality_note = NULL
        WHERE id = $1`,
      [receipt],
    );

    const posted = await one<{ post_purchase_receipt: number }>(
      `SELECT public.post_purchase_receipt($1, $2)`,
      [receipt, pharmacist],
    );

    expect(posted.post_purchase_receipt).toBe(1);
    expect(await stockOf(item)).toBe(60);

    const lot = await one<{ quantity: number; expires_on: string; supplier_id: string }>(
      `SELECT quantity, expires_on, supplier_id FROM public.medication_lots
        WHERE lot_number = 'LOT-RECEP-1'`,
    );
    expect(lot.quantity).toBe(60);
    expect(lot.supplier_id).toBe(supplier);
  });

  it('fait avancer la commande en livraison partielle', async () => {
    const row = await one<{ status: string }>(
      `SELECT status::TEXT FROM public.purchase_orders WHERE id = $1`,
      [order],
    );
    // 60 reçus sur 100 commandés.
    expect(row.status).toBe('partially_received');
  });

  it('refuse une seconde mise en stock de la même réception', async () => {
    await expect(
      db.query(`SELECT public.post_purchase_receipt($1, $2)`, [receipt, pharmacist]),
    ).rejects.toThrow(/déjà été mise en stock/);
  });

  it('solde la commande lorsque tout est reçu', async () => {
    const second = await one<{ id: string }>(
      `INSERT INTO public.purchase_receipts
         (establishment_id, order_id, pharmacy_id, received_by, quality_result, controlled_at)
       VALUES ($1, $2, $3, $4, 'accepted_with_reserve', NOW()) RETURNING id`,
      [establishment, order, pharmacy, pharmacist],
    );

    await db.query(
      `INSERT INTO public.purchase_receipt_lines
         (receipt_id, order_line_id, item_id, quantity_received, lot_number, expires_on, unit_price)
       VALUES ($1, $2, $3, 40, 'LOT-RECEP-2', '2030-01-31', 800)`,
      [second.id, orderLine, item],
    );

    await db.query(`SELECT public.post_purchase_receipt($1, $2)`, [second.id, pharmacist]);

    const row = await one<{ status: string }>(
      `SELECT status::TEXT FROM public.purchase_orders WHERE id = $1`,
      [order],
    );
    expect(row.status).toBe('received');
    expect(await stockOf(item)).toBe(100);
  });
});

describe('Retours fournisseurs (BP17 §17, BR-074)', () => {
  it('la marchandise ne quitte le stock qu’à l’expédition', async () => {
    const lot = await one<{ id: string; quantity: number }>(
      `SELECT id, quantity FROM public.medication_lots WHERE lot_number = 'LOT-RECEP-1'`,
    );

    const head = await one<{ id: string; business_reference: string }>(
      `INSERT INTO public.supplier_returns
         (establishment_id, supplier_id, pharmacy_id, return_type, reason)
       VALUES ($1, $2, $3, 'partiel', 'Conditionnement endommagé')
       RETURNING id, business_reference`,
      [establishment, supplier, pharmacy],
    );
    expect(head.business_reference).toMatch(/^MORA-RET-\d{6}$/);

    await db.query(
      `INSERT INTO public.supplier_return_lines (return_id, item_id, lot_id, quantity, unit_price)
       VALUES ($1, $2, $3, 10, 800)`,
      [head.id, item, lot.id],
    );

    // Tant que le retour n'est pas parti, les produits sont encore là.
    expect(await lotQuantity(lot.id)).toBe(lot.quantity);

    const posted = await one<{ post_supplier_return: number }>(
      `SELECT public.post_supplier_return($1, $2)`,
      [head.id, pharmacist],
    );

    expect(posted.post_supplier_return).toBe(1);
    expect(await lotQuantity(lot.id)).toBe(lot.quantity - 10);

    await expect(
      db.query(`SELECT public.post_supplier_return($1, $2)`, [head.id, pharmacist]),
    ).rejects.toThrow(/déjà été expédié/);
  });
});

describe('Réapprovisionnement interne (BP18 §12, BR-071)', () => {
  it('refuse un transfert d’un magasin vers lui-même', async () => {
    await expect(
      db.query(
        `INSERT INTO public.stock_transfers (establishment_id, from_pharmacy_id, to_pharmacy_id)
         VALUES ($1, $2, $2)`,
        [establishment, pharmacy],
      ),
    ).rejects.toThrow();
  });

  it('génère une sortie du magasin source et une entrée au destinataire', async () => {
    const lot = await one<{ id: string; quantity: number }>(
      `SELECT id, quantity FROM public.medication_lots WHERE lot_number = 'LOT-RECEP-1'`,
    );
    const totalBefore = await stockOf(item);

    const transfer = await one<{ id: string; business_reference: string }>(
      `INSERT INTO public.stock_transfers
         (establishment_id, from_pharmacy_id, to_pharmacy_id, status, requested_by)
       VALUES ($1, $2, $3, 'requested', $4) RETURNING id, business_reference`,
      [establishment, pharmacy, secondPharmacy, pharmacist],
    );
    expect(transfer.business_reference).toMatch(/^MORA-TSF-\d{6}$/);

    await db.query(
      `INSERT INTO public.stock_transfer_lines (transfer_id, item_id, lot_id, quantity_requested)
       VALUES ($1, $2, $3, 15)`,
      [transfer.id, item, lot.id],
    );

    const moved = await one<{ ship_stock_transfer: number }>(
      `SELECT public.ship_stock_transfer($1, $2)`,
      [transfer.id, pharmacist],
    );
    expect(moved.ship_stock_transfer).toBe(1);

    // Le lot source est débité, un lot jumeau naît chez le destinataire.
    expect(await lotQuantity(lot.id)).toBe(lot.quantity - 15);

    const target = await one<{ quantity: number; expires_on: string }>(
      `SELECT quantity, expires_on FROM public.medication_lots
        WHERE lot_number = 'LOT-RECEP-1' AND pharmacy_id = $1`,
      [secondPharmacy],
    );
    expect(target.quantity).toBe(15);

    // Le stock total de l'établissement ne change pas : seule sa répartition
    // entre magasins évolue.
    expect(await stockOf(item)).toBe(totalBefore);
  });

  it('refuse une seconde expédition du même transfert', async () => {
    const transfer = await one<{ id: string }>(
      `SELECT id FROM public.stock_transfers ORDER BY created_at DESC LIMIT 1`,
    );

    await expect(
      db.query(`SELECT public.ship_stock_transfer($1, $2)`, [transfer.id, pharmacist]),
    ).rejects.toThrow(/déjà été expédié/);
  });
});

describe('Vente au comptoir (BP19 §10)', () => {
  const sell = async (
    quantity: number,
    options: { patientId?: string | null; customer?: string | null } = {},
  ) => {
    const lot = await one<{ id: string }>(
      `SELECT id FROM public.medication_lots
        WHERE lot_number = 'LOT-RECEP-1' AND pharmacy_id = $1`,
      [pharmacy],
    );

    const head = await one<{ id: string }>(
      `INSERT INTO public.dispensations
         (establishment_id, pharmacy_id, patient_id, customer_name, channel,
          payment_method, paid_amount, dispensed_by, status)
       VALUES ($1, $2, $3, $4, 'sale', 'Espèces', 0, $5, 'delivered') RETURNING id`,
      [
        establishment,
        pharmacy,
        options.patientId === undefined ? patient : options.patientId,
        options.customer ?? null,
        pharmacist,
      ],
    );

    await db.query(
      `INSERT INTO public.dispensation_lines (dispensation_id, item_id, lot_id, quantity, unit_price)
       VALUES ($1, $2, $3, $4, 1200)`,
      [head.id, item, lot.id, quantity],
    );

    return head.id;
  };

  it('décrémente le stock et crée un mouvement de vente', async () => {
    const before = await stockOf(item);
    const id = await sell(5);

    expect(await stockOf(item)).toBe(before - 5);

    const movement = await one<{ kind: string; quantity: number; reason: string }>(
      `SELECT kind::TEXT, quantity, reason FROM public.stock_movements
        WHERE source_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [id],
    );
    expect(movement.kind).toBe('exit');
    expect(movement.quantity).toBe(-5);
    expect(movement.reason).toBe('Vente au comptoir');
  });

  it('cumule le montant de la vente', async () => {
    const row = await one<{ total_amount: string }>(
      `SELECT total_amount FROM public.dispensations
        WHERE channel = 'sale' ORDER BY created_at DESC LIMIT 1`,
    );
    expect(Number(row.total_amount)).toBe(5 * 1200);
  });

  it('n’exige pas de prescription, contrairement à la délivrance nominative', async () => {
    // Le réglage de validation pharmaceutique est actif par défaut : il ne doit
    // pas bloquer une vente au comptoir, qui n'a pas d'ordonnance à valider.
    await expect(sell(1)).resolves.toBeTruthy();
  });

  it('accepte une vente à un acquéreur sans dossier patient', async () => {
    await expect(sell(1, { patientId: null, customer: 'Client de passage' })).resolves.toBeTruthy();
  });

  it('refuse une vente qui ne désigne personne', async () => {
    await expect(sell(1, { patientId: null, customer: null })).rejects.toThrow(
      /désigner un patient ou un acquéreur/,
    );
  });

  it('refuse de vendre plus que le stock disponible', async () => {
    await expect(sell(100000)).rejects.toThrow(/Stock insuffisant/);
  });

  it('refuse une délivrance nominative sans prescription (BR-085)', async () => {
    await expect(
      db.query(
        `INSERT INTO public.dispensations
           (establishment_id, pharmacy_id, patient_id, channel, dispensed_by)
         VALUES ($1, $2, $3, 'prescription', $4)`,
        [establishment, pharmacy, patient, pharmacist],
      ),
    ).rejects.toThrow(/rattachée à une prescription/);
  });
});

describe('Plans thérapeutiques (BP19 §6)', () => {
  let plan: string;

  it('regroupe les traitements d’un patient', async () => {
    const head = await one<{ id: string; business_reference: string }>(
      `INSERT INTO public.therapeutic_plans
         (establishment_id, patient_id, doctor_id, label, indication)
       VALUES ($1, $2, $3, 'Antibiothérapie', 'Pneumopathie')
       RETURNING id, business_reference`,
      [establishment, patient, doctor],
    );
    plan = head.id;
    expect(head.business_reference).toMatch(/^MORA-PLT-\d{6}$/);

    await db.query(
      `INSERT INTO public.therapeutic_plan_lines
         (plan_id, item_id, medication_label, treatment_type, dosage, frequency,
          administration_times, duration_days, quantity_per_intake)
       VALUES ($1, $2, 'Amoxicilline 500', 'medication', '500 mg', '3 fois par jour',
               ARRAY['08:00','14:00','20:00'], 7, 1)`,
      [plan, item],
    );

    const line = await one<{ administration_times: string[]; duration_days: number }>(
      `SELECT administration_times, duration_days FROM public.therapeutic_plan_lines
        WHERE plan_id = $1`,
      [plan],
    );
    expect(line.administration_times).toHaveLength(3);
    expect(line.duration_days).toBe(7);
  });

  it('refuse une date de fin antérieure au début', async () => {
    await expect(
      db.query(
        `UPDATE public.therapeutic_plans SET ended_on = started_on - 1 WHERE id = $1`,
        [plan],
      ),
    ).rejects.toThrow();
  });

  it('rattache une prescription à son plan (BR-084)', async () => {
    const prescription = await one<{ therapeutic_plan_id: string }>(
      `INSERT INTO public.prescriptions
         (establishment_id, patient_id, doctor_id, medications, therapeutic_plan_id)
       VALUES ($1, $2, $3, '[]'::JSONB, $4) RETURNING therapeutic_plan_id`,
      [establishment, patient, doctor, plan],
    );
    expect(prescription.therapeutic_plan_id).toBe(plan);
  });
});

describe('Dispensation hospitalière (BP19 §11)', () => {
  let round: string;
  let stay: string;

  it('n’autorise qu’une tournée par service, date et moment', async () => {
    const head = await one<{ id: string; business_reference: string }>(
      `INSERT INTO public.ward_rounds
         (establishment_id, pharmacy_id, service, slot, prepared_by)
       VALUES ($1, $2, 'Réanimation', 'matin', $3) RETURNING id, business_reference`,
      [establishment, pharmacy, pharmacist],
    );
    round = head.id;
    expect(head.business_reference).toMatch(/^MORA-TRN-\d{6}$/);

    // Deux tournées concurrentes feraient administrer le traitement deux fois.
    await expect(
      db.query(
        `INSERT INTO public.ward_rounds (establishment_id, pharmacy_id, service, slot)
         VALUES ($1, $2, 'Réanimation', 'matin')`,
        [establishment, pharmacy],
      ),
    ).rejects.toThrow();
  });

  it('consigne l’administration dans le dossier du patient', async () => {
    const room = await one<{ id: string }>(
      `INSERT INTO public.rooms (establishment_id, code, room_type, capacity)
       VALUES ($1, 'R1', 'Réanimation', 1) RETURNING id`,
      [establishment],
    );
    const bed = await one<{ id: string }>(
      `INSERT INTO public.beds (establishment_id, room_id, code) VALUES ($1, $2, 'A') RETURNING id`,
      [establishment, room.id],
    );
    const admission = await one<{ id: string }>(
      `INSERT INTO public.hospitalizations
         (establishment_id, patient_id, doctor_id, room_id, bed_id, service,
          admission_reason, stay_status)
       VALUES ($1, $2, $3, $4, $5, 'Réanimation', 'Surveillance', 'in_stay') RETURNING id`,
      [establishment, patient, doctor, room.id, bed.id],
    );
    stay = admission.id;

    const administration = await one<{ id: string }>(
      `INSERT INTO public.ward_round_administrations
         (round_id, hospitalization_id, item_id, medication_label, quantity)
       VALUES ($1, $2, $3, 'Amoxicilline 500', 1) RETURNING id`,
      [round, stay, item],
    );

    const before = await one<{ count: string }>(
      `SELECT count(*) FROM public.hospitalization_care WHERE hospitalization_id = $1`,
      [stay],
    );

    await db.query(
      `UPDATE public.ward_round_administrations
          SET status = 'administered', administered_at = NOW(), administered_by = $2
        WHERE id = $1`,
      [administration.id, nurse],
    );

    const after = await one<{ count: string }>(
      `SELECT count(*) FROM public.hospitalization_care WHERE hospitalization_id = $1`,
      [stay],
    );

    // BP19 §11 : « Chaque administration est enregistrée dans le dossier ».
    expect(Number(after.count)).toBe(Number(before.count) + 1);

    const care = await one<{ care_type: string; observations: string }>(
      `SELECT care_type, observations FROM public.hospitalization_care
        WHERE hospitalization_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [stay],
    );
    expect(care.care_type).toBe('Administration de médicament');
    expect(care.observations).toContain('Amoxicilline 500');
  });

  it('ne consigne rien pour un refus', async () => {
    const administration = await one<{ id: string }>(
      `INSERT INTO public.ward_round_administrations
         (round_id, hospitalization_id, medication_label, quantity)
       VALUES ($1, $2, 'Paracétamol', 1) RETURNING id`,
      [round, stay],
    );

    const before = await one<{ count: string }>(
      `SELECT count(*) FROM public.hospitalization_care WHERE hospitalization_id = $1`,
      [stay],
    );

    await db.query(
      `UPDATE public.ward_round_administrations
          SET status = 'refused', refusal_reason = 'Refus du patient' WHERE id = $1`,
      [administration.id],
    );

    const after = await one<{ count: string }>(
      `SELECT count(*) FROM public.hospitalization_care WHERE hospitalization_id = $1`,
      [stay],
    );
    expect(after.count).toBe(before.count);
  });
});

describe('Isolation et permissions (BP17 §24, BP19 §25)', () => {
  it('un établissement ne voit pas les achats d’un autre', async () => {
    await db.query(
      `INSERT INTO public.purchase_requisitions
         (establishment_id, requesting_service, justification)
       VALUES ($1, 'Pharmacie', 'Demande du voisin')`,
      [voisin],
    );

    const rows = await queryAsAuthenticated<{ justification: string }>(
      db,
      pharmacist,
      `SELECT justification FROM public.purchase_requisitions`,
    );

    expect(rows.map((r) => r.justification)).not.toContain('Demande du voisin');
  });

  it('les lignes suivent l’isolation de leur document parent', async () => {
    const foreign = await one<{ id: string }>(
      `SELECT id FROM public.purchase_requisitions WHERE establishment_id = $1 LIMIT 1`,
      [voisin],
    );

    await db.query(
      `INSERT INTO public.purchase_requisition_lines (requisition_id, label, quantity)
       VALUES ($1, 'Ligne du voisin', 1)`,
      [foreign.id],
    );

    const rows = await queryAsAuthenticated<{ label: string }>(
      db,
      pharmacist,
      `SELECT label FROM public.purchase_requisition_lines`,
    );

    expect(rows.map((r) => r.label)).not.toContain('Ligne du voisin');
  });

  it('un transfert ne peut pas être créé pour un autre établissement', async () => {
    const refused = await queryAsAuthenticated(
      db,
      pharmacist,
      `INSERT INTO public.stock_transfers (establishment_id, from_pharmacy_id, to_pharmacy_id)
       VALUES ($1, $2, $3) RETURNING id`,
      [voisin, pharmacy, secondPharmacy],
    ).catch(() => 'refusé');

    expect(refused).toBe('refusé');
  });

  it('le personnel soignant ne modifie pas le stock', async () => {
    const rows = await queryAsAuthenticated<{ can_create: boolean; can_update: boolean }>(
      db,
      nurse,
      `SELECT rp.can_create, rp.can_update
         FROM public.role_permissions rp JOIN public.modules m ON m.id = rp.module_id
        WHERE m.code = 'pharmacy' AND rp.role = 'nurse'`,
    );
    expect(rows[0]).toMatchObject({ can_create: false, can_update: false });
  });
});

describe('Identité documentaire de la plateforme (BP28C, BP30)', () => {
  it('n’existe qu’en un seul exemplaire', async () => {
    await expect(
      db.query(`INSERT INTO public.platform_identity (singleton) VALUES (TRUE)`),
    ).rejects.toThrow();
  });

  it('est lisible par un établissement, pour l’en-tête de ses factures', async () => {
    const rows = await queryAsAuthenticated<{ legal_name: string }>(
      db,
      admin,
      `SELECT legal_name FROM public.platform_identity`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].legal_name).toBe('MORA Shawiri');
  });

  it('n’est pas modifiable par un établissement', async () => {
    const updated = await queryAsAuthenticated(
      db,
      admin,
      `UPDATE public.platform_identity SET legal_name = 'Pirate' RETURNING id`,
    ).catch(() => 'refusé');

    expect(updated === 'refusé' || (Array.isArray(updated) && updated.length === 0)).toBe(true);

    const check = await one<{ legal_name: string }>(
      `SELECT legal_name FROM public.platform_identity`,
    );
    expect(check.legal_name).toBe('MORA Shawiri');
  });

  it('refuse une couleur qui n’est pas hexadécimale', async () => {
    await expect(
      db.query(`UPDATE public.platform_identity SET primary_color = 'bleu'`),
    ).rejects.toThrow();
  });
});

describe('Encaissement et monnaie rendue (BP19 §10, BP22B)', () => {
  const sell = async (
    quantity: number,
    money: { paid: number; tendered: number | null },
  ): Promise<{ id: string; total: number }> => {
    const lot = await one<{ id: string }>(
      `SELECT id FROM public.medication_lots
        WHERE lot_number = 'LOT-RECEP-1' AND pharmacy_id = $1`,
      [pharmacy],
    );

    const head = await one<{ id: string }>(
      `INSERT INTO public.dispensations
         (establishment_id, pharmacy_id, patient_id, channel, payment_method,
          paid_amount, dispensed_by, status)
       VALUES ($1, $2, $3, 'sale', 'Espèces', 0, $4, 'delivered') RETURNING id`,
      [establishment, pharmacy, patient, pharmacist],
    );

    await db.query(
      `INSERT INTO public.dispensation_lines (dispensation_id, item_id, lot_id, quantity, unit_price)
       VALUES ($1, $2, $3, $4, 1200)`,
      [head.id, item, lot.id, quantity],
    );

    await db.query(
      `UPDATE public.dispensations SET paid_amount = $2, tendered_amount = $3 WHERE id = $1`,
      [head.id, money.paid, money.tendered],
    );

    return { id: head.id, total: quantity * 1200 };
  };

  it('enregistre le montant remis et permet d’en déduire la monnaie', async () => {
    // 5 × 1 200 = 6 000 dus, 10 000 donnés : 4 000 à rendre.
    const sale = await sell(5, { paid: 6000, tendered: 10000 });

    const row = await one<{ total_amount: string; paid_amount: string; tendered_amount: string }>(
      `SELECT total_amount, paid_amount, tendered_amount FROM public.dispensations WHERE id = $1`,
      [sale.id],
    );

    expect(Number(row.total_amount)).toBe(6000);
    expect(Number(row.paid_amount)).toBe(6000);
    expect(Number(row.tendered_amount)).toBe(10000);
    expect(Number(row.tendered_amount) - Number(row.total_amount)).toBe(4000);
  });

  it('refuse d’encaisser plus que ce qui est dû', async () => {
    // Au-delà du total, la différence est de la monnaie à rendre, pas une
    // recette : l'accepter gonflerait le chiffre d'affaires du jour.
    await expect(sell(2, { paid: 10000, tendered: 10000 })).rejects.toThrow();
  });

  it('refuse un montant remis inférieur à ce qui est encaissé', async () => {
    await expect(sell(3, { paid: 3600, tendered: 1000 })).rejects.toThrow();
  });

  it('accepte un règlement partiel', async () => {
    const sale = await sell(4, { paid: 2000, tendered: 2000 });

    const row = await one<{ total_amount: string; paid_amount: string }>(
      `SELECT total_amount, paid_amount FROM public.dispensations WHERE id = $1`,
      [sale.id],
    );

    expect(Number(row.total_amount)).toBe(4800);
    expect(Number(row.paid_amount)).toBe(2000);
  });
});

describe('Péremption obligatoire à la création d’un lot (BP19 §14)', () => {
  it('refuse un lot sans date de péremption', async () => {
    await expect(
      db.query(
        `INSERT INTO public.medication_lots (establishment_id, item_id, lot_number)
         VALUES ($1, $2, 'SANS-DATE')`,
        [establishment, item],
      ),
    ).rejects.toThrow(/date de péremption est obligatoire/);
  });

  it('l’accepte lorsque l’établissement ne suit pas les lots', async () => {
    // Un établissement qui gère des consommables sans péremption ne doit pas
    // être bloqué sur des produits qui n'en portent pas.
    await db.query(
      `UPDATE public.establishments
          SET module_settings = jsonb_set(module_settings, '{pharmacy,trackLots}', 'false')
        WHERE id = $1`,
      [establishment],
    );

    await expect(
      db.query(
        `INSERT INTO public.medication_lots (establishment_id, item_id, lot_number)
         VALUES ($1, $2, 'CONSOMMABLE')`,
        [establishment, item],
      ),
    ).resolves.toBeTruthy();

    await db.query(
      `UPDATE public.establishments
          SET module_settings = jsonb_set(module_settings, '{pharmacy,trackLots}', 'true')
        WHERE id = $1`,
      [establishment],
    );
  });

  it('refuse tout mouvement sur une pharmacie désactivée', async () => {
    const closed = await one<{ id: string }>(
      `INSERT INTO public.pharmacies (establishment_id, name, is_active)
       VALUES ($1, 'Pharmacie fermée', FALSE) RETURNING id`,
      [establishment],
    );

    await expect(
      db.query(
        `INSERT INTO public.stock_movements
           (establishment_id, item_id, pharmacy_id, kind, quantity, reason)
         VALUES ($1, $2, $3, 'entry', 10, 'Test')`,
        [establishment, item, closed.id],
      ),
    ).rejects.toThrow(/désactivée/);
  });

  it('ventile le stock par emplacement', async () => {
    const rows = await queryAsAuthenticated<{
      pharmacy_name: string;
      available_quantity: number;
    }>(
      db,
      pharmacist,
      `SELECT pharmacy_name, available_quantity
         FROM public.pharmacy_stock_by_location
        WHERE item_id = $1 ORDER BY pharmacy_name`,
      [item],
    );

    // Le lot a été partiellement transféré vers l'armoire de service : les deux
    // magasins doivent apparaître séparément.
    expect(rows.length).toBeGreaterThanOrEqual(2);
    expect(rows.map((r) => r.pharmacy_name)).toContain('Armoire Réanimation');
  });
});
