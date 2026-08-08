import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createEstablishment,
  createTestDatabase,
  createUser,
  queryAsAuthenticated,
  type TestDatabase,
} from './helpers/database';

/**
 * Facturation des abonnements SaaS (BP30, BP09).
 *
 * Deux exigences dominent : le prix figé à l'émission — un tarif révisé ne doit
 * pas réécrire une facture déjà envoyée — et la séparation des rôles : MORA
 * Shawiri facture, l'établissement consulte.
 */

let db: TestDatabase;
let establishment: string;
let voisin: string;
let superAdmin: string;
let admin: string;
let nurse: string;
let planId: string;
let subscriptionId: string;

const one = async <T>(sql: string, params: unknown[] = []): Promise<T> => {
  const rows = await db.query<T>(sql, params);
  return rows.rows[0];
};

const createSubscription = async (
  establishmentId: string,
  months: number,
): Promise<string> => {
  const row = await one<{ id: string }>(
    `INSERT INTO public.subscriptions
       (establishment_id, plan_id, status, start_date, end_date, duration_months)
     VALUES ($1, $2, 'active', CURRENT_DATE, CURRENT_DATE + ($3 * 30), $3)
     RETURNING id`,
    [establishmentId, planId, months],
  );
  return row.id;
};

beforeAll(async () => {
  db = await createTestDatabase();

  establishment = await createEstablishment(db, 'Clinique Factures');
  voisin = await createEstablishment(db, 'Clinique Voisine');

  superAdmin = await createUser(db, {
    email: 'super@billing.km',
    role: 'super_admin',
    establishmentId: null,
  });
  admin = await createUser(db, {
    email: 'admin@billing.km',
    role: 'establishment_admin',
    establishmentId: establishment,
  });
  nurse = await createUser(db, {
    email: 'nurse@billing.km',
    role: 'nurse',
    establishmentId: establishment,
  });

  // Formule payante avec remise à partir de deux mois : c'est la règle
  // tarifaire officielle — tarif normal au premier mois, remise fixe ensuite.
  const plan = await one<{ id: string }>(
    `UPDATE public.subscription_plans
        SET price_amount = 5000, discount_per_month = 1000, discount_min_months = 2
      WHERE code = 'standard'
      RETURNING id`,
  );
  planId = plan.id;
}, 180_000);

afterAll(async () => {
  await db?.close();
});

describe('Émission automatique', () => {
  it('facture la période dès la souscription', async () => {
    subscriptionId = await createSubscription(establishment, 1);

    const invoice = await one<{
      business_reference: string;
      total_amount: string;
      monthly_price: string;
      discount_amount: string;
      duration_months: number;
      status: string;
    }>(`SELECT * FROM public.subscription_invoices WHERE subscription_id = $1`, [subscriptionId]);

    expect(invoice.business_reference).toMatch(/^MORA-FSA-\d{6}$/);
    // Un mois : tarif normal, aucune remise.
    expect(Number(invoice.monthly_price)).toBe(5000);
    expect(Number(invoice.discount_amount)).toBe(0);
    expect(Number(invoice.total_amount)).toBe(5000);
    expect(invoice.status).toBe('issued');
  });

  it('applique la remise à partir de deux mois', async () => {
    const sub = await createSubscription(establishment, 6);

    const invoice = await one<{ monthly_price: string; discount_amount: string; total_amount: string }>(
      `SELECT * FROM public.subscription_invoices WHERE subscription_id = $1`,
      [sub],
    );

    // 1 000 de remise par mois, quelle que soit la durée : 4 000 × 6.
    expect(Number(invoice.monthly_price)).toBe(4000);
    expect(Number(invoice.discount_amount)).toBe(6000);
    expect(Number(invoice.total_amount)).toBe(24000);
  });

  it('ne facture pas deux fois la même période', async () => {
    const before = await one<{ count: string }>(
      `SELECT count(*) FROM public.subscription_invoices WHERE subscription_id = $1`,
      [subscriptionId],
    );

    await db.query(`SELECT public.issue_subscription_invoice($1, NULL)`, [subscriptionId]);

    const after = await one<{ count: string }>(
      `SELECT count(*) FROM public.subscription_invoices WHERE subscription_id = $1`,
      [subscriptionId],
    );

    expect(after.count).toBe(before.count);
  });

  it('émet une nouvelle facture au renouvellement', async () => {
    await db.query(
      `UPDATE public.subscriptions
          SET start_date = CURRENT_DATE + 40, end_date = CURRENT_DATE + 70
        WHERE id = $1`,
      [subscriptionId],
    );

    const count = await one<{ count: string }>(
      `SELECT count(*) FROM public.subscription_invoices WHERE subscription_id = $1`,
      [subscriptionId],
    );

    expect(Number(count.count)).toBe(2);
  });

  it('solde d’office une formule gratuite', async () => {
    const gratuit = await one<{ id: string }>(
      `SELECT id FROM public.subscription_plans WHERE price_amount = 0 LIMIT 1`,
    );

    const sub = await one<{ id: string }>(
      `INSERT INTO public.subscriptions
         (establishment_id, plan_id, status, start_date, end_date, duration_months)
       VALUES ($1, $2, 'active', CURRENT_DATE, CURRENT_DATE + 30, 1) RETURNING id`,
      [voisin, gratuit.id],
    );

    const invoice = await one<{ status: string; total_amount: string }>(
      `SELECT status, total_amount FROM public.subscription_invoices WHERE subscription_id = $1`,
      [sub.id],
    );

    // Laisser une facture à zéro en attente encombrerait les impayés.
    expect(Number(invoice.total_amount)).toBe(0);
    expect(invoice.status).toBe('paid');
  });
});

describe('Règlements', () => {
  let invoiceId: string;

  beforeAll(async () => {
    const invoice = await one<{ id: string }>(
      `SELECT id FROM public.subscription_invoices
        WHERE total_amount = 24000 ORDER BY created_at DESC LIMIT 1`,
    );
    invoiceId = invoice.id;
  });

  const pay = (amount: number) =>
    db.query(
      `INSERT INTO public.subscription_payments
         (establishment_id, invoice_id, amount, payment_method, paid_on)
       VALUES ($1, $2, $3, 'Espèces', CURRENT_DATE)`,
      [establishment, invoiceId, amount],
    );

  it('passe la facture en partiellement réglée', async () => {
    await pay(10000);

    const invoice = await one<{ paid_amount: string; status: string }>(
      `SELECT paid_amount, status FROM public.subscription_invoices WHERE id = $1`,
      [invoiceId],
    );

    expect(Number(invoice.paid_amount)).toBe(10000);
    expect(invoice.status).toBe('partially_paid');
  });

  it('solde la facture au règlement complet', async () => {
    await pay(14000);

    const invoice = await one<{ paid_amount: string; status: string }>(
      `SELECT paid_amount, status FROM public.subscription_invoices WHERE id = $1`,
      [invoiceId],
    );

    expect(Number(invoice.paid_amount)).toBe(24000);
    expect(invoice.status).toBe('paid');
  });

  it('refuse un règlement supérieur au dû', async () => {
    // Un excédent traduit presque toujours une saisie sur la mauvaise facture.
    await expect(pay(1)).rejects.toThrow(/dépasse le montant/);
  });

  it('remet la facture en attente si un règlement est annulé', async () => {
    const payment = await one<{ id: string }>(
      `SELECT id FROM public.subscription_payments
        WHERE invoice_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [invoiceId],
    );

    await db.query(`UPDATE public.subscription_payments SET deleted_at = NOW() WHERE id = $1`, [
      payment.id,
    ]);

    const invoice = await one<{ paid_amount: string; status: string }>(
      `SELECT paid_amount, status FROM public.subscription_invoices WHERE id = $1`,
      [invoiceId],
    );

    expect(Number(invoice.paid_amount)).toBe(10000);
    expect(invoice.status).toBe('partially_paid');
  });
});

describe('Impayés', () => {
  it('requalifie les factures échues et non soldées', async () => {
    const sub = await createSubscription(establishment, 1);
    await db.query(
      `UPDATE public.subscription_invoices
          SET due_on = CURRENT_DATE - 10
        WHERE subscription_id = $1`,
      [sub],
    );

    await db.query(`SELECT public.refresh_overdue_invoices()`);

    const invoice = await one<{ status: string }>(
      `SELECT status FROM public.subscription_invoices WHERE subscription_id = $1`,
      [sub],
    );

    expect(invoice.status).toBe('overdue');
  });

  it('ne touche pas aux factures déjà réglées', async () => {
    const paid = await one<{ count: string }>(
      `SELECT count(*) FROM public.subscription_invoices
        WHERE status = 'paid' AND due_on < CURRENT_DATE`,
    );

    await db.query(`SELECT public.refresh_overdue_invoices()`);

    const after = await one<{ count: string }>(
      `SELECT count(*) FROM public.subscription_invoices
        WHERE status = 'paid' AND due_on < CURRENT_DATE`,
    );

    expect(after.count).toBe(paid.count);
  });
});

describe('Séparation des rôles (BP30 BR-295)', () => {
  it('le Super Admin voit toutes les factures', async () => {
    const rows = await queryAsAuthenticated<{ establishment_id: string }>(
      db,
      superAdmin,
      `SELECT DISTINCT establishment_id FROM public.subscription_invoices`,
    );

    expect(rows.length).toBeGreaterThan(1);
  });

  it('le responsable ne voit que les factures de son établissement', async () => {
    const rows = await queryAsAuthenticated<{ establishment_id: string }>(
      db,
      admin,
      `SELECT DISTINCT establishment_id FROM public.subscription_invoices`,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].establishment_id).toBe(establishment);
  });

  it('le responsable ne peut pas enregistrer un règlement', async () => {
    const invoice = await one<{ id: string }>(
      `SELECT id FROM public.subscription_invoices WHERE establishment_id = $1 LIMIT 1`,
      [establishment],
    );

    const refused = await queryAsAuthenticated(
      db,
      admin,
      `INSERT INTO public.subscription_payments
         (establishment_id, invoice_id, amount, payment_method, paid_on)
       VALUES ($1, $2, 1, 'Espèces', CURRENT_DATE) RETURNING id`,
      [establishment, invoice.id],
    ).catch(() => 'refusé');

    expect(refused).toBe('refusé');
  });

  it('le responsable ne peut pas modifier une facture', async () => {
    const updated = await queryAsAuthenticated(
      db,
      admin,
      `UPDATE public.subscription_invoices SET status = 'paid'
        WHERE establishment_id = $1 RETURNING id`,
      [establishment],
    ).catch(() => 'refusé');

    // Aucune politique n'ouvre l'écriture : soit refus, soit zéro ligne.
    expect(updated === 'refusé' || (Array.isArray(updated) && updated.length === 0)).toBe(true);
  });

  it('le personnel soignant ne voit aucune facture d’abonnement', async () => {
    const rows = await queryAsAuthenticated(
      db,
      nurse,
      `SELECT id FROM public.subscription_invoices`,
    );

    expect(rows).toHaveLength(0);
  });
});
