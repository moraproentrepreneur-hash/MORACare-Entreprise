import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDatabase, createEstablishment, type TestDatabase } from './helpers/database';

/**
 * Abonnements, licences et formules (BP09, BP30).
 *
 * Vérifie les règles métier qui doivent tenir au niveau de la base, donc quelle
 * que soit l'interface : historisation systématique, unicité des licences,
 * complétude de la configuration des formules.
 */

describe('Abonnements et licences', () => {
  let db: TestDatabase;

  const planId = async (code: string): Promise<string> => {
    const rows = await db.query<{ id: string }>(
      'SELECT id FROM public.subscription_plans WHERE code = $1',
      [code],
    );
    return rows.rows[0].id;
  };

  beforeAll(async () => {
    db = await createTestDatabase();
  });

  afterAll(async () => {
    await db?.close();
  });

  describe('Formules officielles (BP09 §4)', () => {
    it('les cinq formules documentées existent', async () => {
      const rows = await db.query<{ code: string }>(
        'SELECT code FROM public.subscription_plans ORDER BY display_order',
      );
      expect(rows.rows.map((r) => r.code)).toEqual([
        'essai',
        'gratuit',
        'standard',
        'business',
        'vip',
      ]);
    });

    it('les tarifs officiels sont enregistrés en KMF', async () => {
      const rows = await db.query<{ code: string; price_amount: string; price_currency: string }>(
        'SELECT code, price_amount, price_currency FROM public.subscription_plans ORDER BY display_order',
      );

      const prices = Object.fromEntries(rows.rows.map((r) => [r.code, Number(r.price_amount)]));

      expect(prices).toEqual({
        essai: 0,
        gratuit: 0,
        standard: 5000,
        business: 10000,
        vip: 15000,
      });
      expect(rows.rows.every((r) => r.price_currency === 'KMF')).toBe(true);
    });

    it("l'Essai dure 3 jours et s'active automatiquement (BP09 §4, BR-002)", async () => {
      const rows = await db.query<{ duration_days: number; is_automatic: boolean }>(
        `SELECT duration_days, is_automatic FROM public.subscription_plans WHERE code = 'essai'`,
      );
      expect(rows.rows[0].duration_days).toBe(3);
      expect(rows.rows[0].is_automatic).toBe(true);
    });

    it('le plan Gratuit exige une validation du Super Admin (BR-003)', async () => {
      const rows = await db.query<{ requires_approval: boolean }>(
        `SELECT requires_approval FROM public.subscription_plans WHERE code = 'gratuit'`,
      );
      expect(rows.rows[0].requires_approval).toBe(true);
    });

    it('aucune formule ne reste sans composition', async () => {
      const rows = await db.query<{ code: string }>(
        `SELECT p.code FROM public.subscription_plans p
         WHERE NOT EXISTS (SELECT 1 FROM public.plan_modules pm WHERE pm.plan_id = p.id)`,
      );
      expect(rows.rows).toEqual([]);
    });

    it('chaque formule est entièrement configurée', async () => {
      const rows = await db.query<{ code: string }>(
        `SELECT code FROM public.subscription_plans
         WHERE storage_mb IS NULL
            OR support_level IS NULL
            OR backup_frequency IS NULL
            OR retention_days IS NULL
            OR cta_label IS NULL`,
      );
      expect(rows.rows).toEqual([]);
    });

    it('VIP inclut tous les modules de l’espace établissement (BP09 §4)', async () => {
      const rows = await db.query<{ missing: number }>(
        `SELECT count(*)::int AS missing
         FROM public.modules m
         WHERE m.workspace = 'establishment'
           AND NOT EXISTS (
             SELECT 1 FROM public.plan_modules pm
             JOIN public.subscription_plans p ON p.id = pm.plan_id
             WHERE p.code = 'vip' AND pm.module_id = m.id
           )`,
      );
      expect(rows.rows[0].missing).toBe(0);
    });

    it('toutes les formules donnent accès à tous les modules', async () => {
      // Le modèle commercial ne se différencie plus par la composition en
      // modules : ceux-ci sont tous inclus et s'activent depuis les Paramètres
      // de l'établissement. Une formule qui en priverait serait une régression.
      const rows = await db.query<{ code: string; missing: number }>(
        `SELECT p.code,
                count(*) FILTER (
                  WHERE NOT EXISTS (
                    SELECT 1 FROM public.plan_modules pm
                    WHERE pm.plan_id = p.id AND pm.module_id = m.id
                  )
                )::int AS missing
         FROM public.subscription_plans p
         CROSS JOIN public.modules m
         WHERE m.workspace = 'establishment'
         GROUP BY p.code`,
      );
      expect(rows.rows.filter((row) => row.missing > 0)).toEqual([]);
    });

    it('la progression commerciale est croissante en limites', async () => {
      // `NULL` vaut « illimité » : il est ramené à une borne haute pour être
      // comparable, sans quoi VIP passerait pour la formule la plus restrictive.
      const rows = await db.query<{ code: string; users: number; records: number }>(
        `SELECT code,
                COALESCE(max_users, 1000000) AS users,
                COALESCE(max_records_per_module, 1000000) AS records
         FROM public.subscription_plans ORDER BY display_order`,
      );
      const byCode = Object.fromEntries(
        rows.rows.map((r) => [r.code, { users: Number(r.users), records: Number(r.records) }]),
      );

      expect(byCode.gratuit.users).toBeLessThan(byCode.standard.users);
      expect(byCode.standard.users).toBeLessThan(byCode.business.users);
      expect(byCode.business.users).toBeLessThan(byCode.vip.users);

      expect(byCode.gratuit.records).toBeLessThan(byCode.standard.records);
      expect(byCode.standard.records).toBeLessThan(byCode.business.records);
      expect(byCode.business.records).toBeLessThan(byCode.vip.records);
    });
  });

  describe('Cycle de vie (BP09 §5, §6, §12)', () => {
    it('la création est historisée automatiquement (BR-009)', async () => {
      const est = await createEstablishment(db, 'Clinique Historique');
      const plan = await planId('standard');

      const created = await db.query<{ id: string }>(
        `INSERT INTO public.subscriptions (establishment_id, plan_id, status)
         VALUES ($1, $2, 'active') RETURNING id`,
        [est, plan],
      );

      const events = await db.query<{ event_type: string; new_status: string }>(
        `SELECT event_type, new_status::text FROM public.subscription_events WHERE subscription_id = $1`,
        [created.rows[0].id],
      );

      expect(events.rows).toHaveLength(1);
      expect(events.rows[0].event_type).toBe('created');
      expect(events.rows[0].new_status).toBe('active');
    });

    it('un changement de statut est historisé sans intervention applicative', async () => {
      const est = await createEstablishment(db, 'Clinique Suspension');
      const plan = await planId('business');

      const created = await db.query<{ id: string }>(
        `INSERT INTO public.subscriptions (establishment_id, plan_id, status)
         VALUES ($1, $2, 'active') RETURNING id`,
        [est, plan],
      );
      const subId = created.rows[0].id;

      await db.query(`UPDATE public.subscriptions SET status = 'suspended' WHERE id = $1`, [subId]);

      const events = await db.query<{ event_type: string; previous_status: string; new_status: string }>(
        `SELECT event_type, previous_status::text, new_status::text
         FROM public.subscription_events WHERE subscription_id = $1 ORDER BY created_at`,
        [subId],
      );

      expect(events.rows).toHaveLength(2);
      expect(events.rows[1]).toMatchObject({
        event_type: 'status_changed',
        previous_status: 'active',
        new_status: 'suspended',
      });
    });

    it('un changement de formule est tracé distinctement', async () => {
      const est = await createEstablishment(db, 'Clinique Montée');
      const created = await db.query<{ id: string }>(
        `INSERT INTO public.subscriptions (establishment_id, plan_id, status)
         VALUES ($1, $2, 'active') RETURNING id`,
        [est, await planId('standard')],
      );

      await db.query(`UPDATE public.subscriptions SET plan_id = $1 WHERE id = $2`, [
        await planId('vip'),
        created.rows[0].id,
      ]);

      const events = await db.query<{ event_type: string }>(
        `SELECT event_type FROM public.subscription_events
         WHERE subscription_id = $1 ORDER BY created_at`,
        [created.rows[0].id],
      );
      expect(events.rows.map((e) => e.event_type)).toEqual(['created', 'plan_changed']);
    });

    it("une référence métier séquentielle est attribuée", async () => {
      const est = await createEstablishment(db, 'Clinique Référence');
      const rows = await db.query<{ business_reference: string }>(
        `INSERT INTO public.subscriptions (establishment_id, plan_id)
         VALUES ($1, $2) RETURNING business_reference`,
        [est, await planId('gratuit')],
      );
      expect(rows.rows[0].business_reference).toMatch(/^MORA-ABO-\d{6}$/);
    });
  });

  describe('Licences (BP09 §11, BP30 §8)', () => {
    it('une licence appartient à un seul établissement (BR-008)', async () => {
      const est = await createEstablishment(db, 'Clinique Licence');

      await db.query(`INSERT INTO public.licenses (establishment_id) VALUES ($1)`, [est]);

      await expect(
        db.query(`INSERT INTO public.licenses (establishment_id) VALUES ($1)`, [est]),
      ).rejects.toThrow();
    });

    it('un numéro de licence séquentiel est généré', async () => {
      const est = await createEstablishment(db, 'Clinique Numéro');
      const rows = await db.query<{ license_number: string }>(
        `INSERT INTO public.licenses (establishment_id) VALUES ($1) RETURNING license_number`,
        [est],
      );
      expect(rows.rows[0].license_number).toMatch(/^MORA-LIC-\d{6}$/);
    });

    it('la suspension est historisée et ne supprime rien (BR-290)', async () => {
      const est = await createEstablishment(db, 'Clinique Suspendue');
      const created = await db.query<{ id: string }>(
        `INSERT INTO public.licenses (establishment_id, status) VALUES ($1, 'active') RETURNING id`,
        [est],
      );

      await db.query(`UPDATE public.licenses SET status = 'suspended' WHERE id = $1`, [
        created.rows[0].id,
      ]);

      const events = await db.query<{ event_type: string }>(
        `SELECT event_type FROM public.license_events WHERE license_id = $1 ORDER BY created_at`,
        [created.rows[0].id],
      );
      expect(events.rows.map((e) => e.event_type)).toEqual(['created', 'status_changed']);

      // L'établissement et ses données existent toujours.
      const est_rows = await db.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM public.establishments WHERE id = $1`,
        [est],
      );
      expect(est_rows.rows[0].n).toBe(1);
    });
  });
});
