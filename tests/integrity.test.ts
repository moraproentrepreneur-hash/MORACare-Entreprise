import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createTestDatabase,
  createEstablishment,
  createUser,
  createPatient,
  queryAsAuthenticated,
  type TestDatabase,
} from './helpers/database';

/**
 * Garanties structurelles du schéma (TD02, BP26B, BP28A).
 *
 * Ces règles doivent tenir quelle que soit l'interface : elles sont donc
 * testées directement contre PostgreSQL.
 */

describe('Intégrité et sécurité du schéma', () => {
  let db: TestDatabase;
  let establishment: string;

  beforeAll(async () => {
    db = await createTestDatabase();
    establishment = await createEstablishment(db, 'Clinique Intégrité');
  });

  afterAll(async () => {
    await db?.close();
  });

  describe('Références métier (TD02 §8)', () => {
    it('sont séquentielles et préfixées par entité', async () => {
      const first = await createPatient(db, establishment, 'Un');
      const second = await createPatient(db, establishment, 'Deux');

      const rows = await db.query<{ business_reference: string }>(
        `SELECT business_reference FROM public.patients WHERE id IN ($1, $2) ORDER BY business_reference`,
        [first, second],
      );

      expect(rows.rows[0].business_reference).toMatch(/^MORA-PAT-\d{6}$/);
      const numbers = rows.rows.map((r) => Number(r.business_reference.split('-')[2]));
      expect(numbers[1]).toBe(numbers[0] + 1);
    });

    it('sont non modifiables une fois attribuées', async () => {
      const patient = await createPatient(db, establishment, 'Immuable');

      await expect(
        db.query(`UPDATE public.patients SET business_reference = 'MORA-PAT-999999' WHERE id = $1`, [
          patient,
        ]),
      ).rejects.toThrow(/non modifiable/i);
    });

    it('sont uniques', async () => {
      await expect(
        db.query(
          `INSERT INTO public.patients (establishment_id, business_reference, first_name, last_name, gender, birth_date, phone)
           SELECT $1, business_reference, 'X', 'Y', 'M', '1990-01-01', '+269'
           FROM public.patients LIMIT 1`,
          [establishment],
        ),
      ).rejects.toThrow();
    });
  });

  describe('Horodatage (TD05 §9)', () => {
    it('updated_at est mis à jour automatiquement', async () => {
      const patient = await createPatient(db, establishment, 'Horodaté');

      const before = await db.query<{ updated_at: string }>(
        `SELECT updated_at FROM public.patients WHERE id = $1`,
        [patient],
      );

      await db.query(`UPDATE public.patients SET first_name = 'Modifié' WHERE id = $1`, [patient]);

      const after = await db.query<{ updated_at: string }>(
        `SELECT updated_at FROM public.patients WHERE id = $1`,
        [patient],
      );

      expect(new Date(after.rows[0].updated_at).getTime()).toBeGreaterThanOrEqual(
        new Date(before.rows[0].updated_at).getTime(),
      );
    });
  });

  describe("Journal d'audit inaltérable (BP26B)", () => {
    it("n'accepte ni modification ni suppression", async () => {
      const admin = await createUser(db, {
        email: 'admin@integrite.km',
        role: 'establishment_admin',
        establishmentId: establishment,
      });

      await queryAsAuthenticated(
        db,
        admin,
        `INSERT INTO public.audit_logs (establishment_id, user_id, action, entity_name)
         VALUES ($1, $2, 'test_action', 'patients')`,
        [establishment, admin],
      );

      // Aucune politique UPDATE ni DELETE n'existe : PostgreSQL refuse
      // silencieusement en ne touchant aucune ligne.
      const updated = await queryAsAuthenticated(
        db,
        admin,
        `UPDATE public.audit_logs SET action = 'falsifie' WHERE action = 'test_action' RETURNING id`,
      );
      expect(updated).toHaveLength(0);

      const deleted = await queryAsAuthenticated(
        db,
        admin,
        `DELETE FROM public.audit_logs WHERE action = 'test_action' RETURNING id`,
      );
      expect(deleted).toHaveLength(0);

      const still = await queryAsAuthenticated<{ n: number }>(
        db,
        admin,
        `SELECT count(*)::int AS n FROM public.audit_logs WHERE action = 'test_action'`,
      );
      expect(still[0].n).toBe(1);
    });
  });

  describe('Montants calculés par la base', () => {
    it("l'écart de caisse ne peut pas être falsifié", async () => {
      const registerRows = await db.query<{ id: string }>(
        `INSERT INTO public.cash_registers (establishment_id, name, opening_balance, current_balance)
         VALUES ($1, 'Caisse test', 1000, 1000) RETURNING id`,
        [establishment],
      );

      const closure = await db.query<{ variance_amount: string }>(
        `INSERT INTO public.cash_closures
           (establishment_id, cash_register_id, theoretical_balance, physical_cash_count)
         VALUES ($1, $2, 1000, 850) RETURNING variance_amount`,
        [establishment, registerRows.rows[0].id],
      );

      expect(Number(closure.rows[0].variance_amount)).toBe(-150);
    });

    it('le salaire net découle des composantes', async () => {
      const employee = await db.query<{ id: string }>(
        `INSERT INTO public.employees (establishment_id, department, position, hire_date, base_salary)
         VALUES ($1, 'Médecine', 'Médecin', '2020-01-01', 250000) RETURNING id`,
        [establishment],
      );

      const slip = await db.query<{ net_salary: string }>(
        `INSERT INTO public.payroll_slips
           (establishment_id, employee_id, period_month, period_year, base_salary, guard_bonuses, deductions)
         VALUES ($1, $2, 7, 2026, 250000, 35000, 15000) RETURNING net_salary`,
        [establishment, employee.rows[0].id],
      );

      expect(Number(slip.rows[0].net_salary)).toBe(270000);
    });
  });

  describe('Référentiel des modules (BP12 §4)', () => {
    it('les modules essentiels ne sont pas désactivables', async () => {
      const rows = await db.query<{ code: string }>(
        `SELECT code FROM public.modules WHERE is_core = true ORDER BY code`,
      );
      expect(rows.rows.map((r) => r.code)).toEqual([
        'dashboard',
        'saas_platform',
        'settings',
        'user_management',
      ]);
    });

    it('chaque module porte sa référence Blueprint', async () => {
      const rows = await db.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM public.modules WHERE blueprint_reference IS NULL`,
      );
      expect(rows.rows[0].n).toBe(0);
    });

    it('les codes de modules sont uniques', async () => {
      await expect(
        db.query(
          `INSERT INTO public.modules (code, name) VALUES ('patients', 'Doublon')`,
        ),
      ).rejects.toThrow();
    });
  });

  describe('Protection des données (TD02 §10)', () => {
    it('les tables métier disposent de la suppression logique', async () => {
      const rows = await db.query<{ tablename: string }>(`
        SELECT t.tablename FROM pg_tables t
        WHERE t.schemaname = 'public'
          AND t.tablename IN ('patients','consultations','appointments','hospitalizations','invoices')
          AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns c
            WHERE c.table_schema='public' AND c.table_name=t.tablename AND c.column_name='deleted_at'
          )`);
      expect(rows.rows).toEqual([]);
    });

    it('toutes les tables publiques sont protégées par RLS', async () => {
      const rows = await db.query<{ relname: string }>(`
        SELECT c.relname FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity`);
      expect(rows.rows).toEqual([]);
    });

    it('aucune table sous RLS ne reste sans politique', async () => {
      const rows = await db.query<{ relname: string }>(`
        SELECT c.relname FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relrowsecurity
          AND NOT EXISTS (
            SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename = c.relname
          )`);
      expect(rows.rows).toEqual([]);
    });
  });
});
