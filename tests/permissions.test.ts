import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDatabase, type TestDatabase } from './helpers/database';

/**
 * Matrice des permissions (BP26A, UG01 → UG10).
 *
 * Ces tests valident le contenu réellement chargé en base par le seed, et non
 * une copie du code : c'est la base qui fait autorité depuis la Phase 5.
 */

describe('Matrice des permissions', () => {
  let db: TestDatabase;

  const can = async (role: string, moduleCode: string, action: string): Promise<boolean> => {
    const rows = await db.query<Record<string, boolean>>(
      `SELECT rp.${action} AS allowed
       FROM public.role_permissions rp
       JOIN public.modules m ON m.id = rp.module_id
       WHERE rp.role = $1::public.user_role_type AND m.code = $2`,
      [role, moduleCode],
    );
    return rows.rows[0]?.allowed ?? false;
  };

  beforeAll(async () => {
    db = await createTestDatabase();
  });

  afterAll(async () => {
    await db?.close();
  });

  describe('Super Admin — séparation des activités cliniques (BP06 §10 bis, UG01 §1)', () => {
    const CLINICAL = [
      'patients',
      'appointments',
      'consultations',
      'hospitalizations',
      'pharmacy',
      'laboratory',
      'imaging',
    ];

    it.each(CLINICAL)("n'a aucun accès au module %s", async (moduleCode) => {
      expect(await can('super_admin', moduleCode, 'can_view')).toBe(false);
    });

    it('administre la plateforme SaaS', async () => {
      expect(await can('super_admin', 'saas_platform', 'can_view')).toBe(true);
      expect(await can('super_admin', 'saas_platform', 'can_create')).toBe(true);
    });
  });

  describe('Médecin (UG03)', () => {
    it('crée des consultations', async () => {
      expect(await can('doctor', 'consultations', 'can_create')).toBe(true);
    });

    it("demande des examens de laboratoire et d'imagerie", async () => {
      expect(await can('doctor', 'laboratory', 'can_create')).toBe(true);
      expect(await can('doctor', 'imaging', 'can_create')).toBe(true);
    });

    it('consulte la pharmacie sans pouvoir la modifier', async () => {
      expect(await can('doctor', 'pharmacy', 'can_view')).toBe(true);
      expect(await can('doctor', 'pharmacy', 'can_update')).toBe(false);
    });

    it("n'accède pas à la gestion des utilisateurs", async () => {
      expect(await can('doctor', 'user_management', 'can_view')).toBe(false);
    });

    it('ne supprime jamais un dossier patient', async () => {
      expect(await can('doctor', 'patients', 'can_delete')).toBe(false);
    });
  });

  describe('Réceptionniste (UG05)', () => {
    it('crée des patients et des rendez-vous', async () => {
      expect(await can('receptionist', 'patients', 'can_create')).toBe(true);
      expect(await can('receptionist', 'appointments', 'can_create')).toBe(true);
    });

    it("n'accède ni aux consultations ni au laboratoire", async () => {
      expect(await can('receptionist', 'consultations', 'can_view')).toBe(false);
      expect(await can('receptionist', 'laboratory', 'can_view')).toBe(false);
    });
  });

  describe('Personnel spécialisé', () => {
    it('le pharmacien gère la pharmacie de bout en bout (UG06)', async () => {
      expect(await can('pharmacist', 'pharmacy', 'can_create')).toBe(true);
      expect(await can('pharmacist', 'pharmacy', 'can_delete')).toBe(true);
    });

    it("le laboratoire n'accède pas à l'imagerie (UG07)", async () => {
      expect(await can('lab_tech', 'laboratory', 'can_update')).toBe(true);
      expect(await can('lab_tech', 'imaging', 'can_view')).toBe(false);
    });

    it("l'imagerie n'accède pas au laboratoire (UG08)", async () => {
      expect(await can('radiologist', 'imaging', 'can_update')).toBe(true);
      expect(await can('radiologist', 'laboratory', 'can_view')).toBe(false);
    });

    it('le comptable gère la finance sans toucher au dossier médical (UG09)', async () => {
      expect(await can('accountant', 'finance', 'can_delete')).toBe(true);
      expect(await can('accountant', 'patients', 'can_view')).toBe(true);
      expect(await can('accountant', 'patients', 'can_update')).toBe(false);
      expect(await can('accountant', 'consultations', 'can_view')).toBe(false);
    });
  });

  describe("Responsable d'établissement (UG02)", () => {
    it('gère les comptes de son établissement', async () => {
      expect(await can('establishment_admin', 'user_management', 'can_create')).toBe(true);
    });

    it("consulte l'activité médicale sans la modifier", async () => {
      expect(await can('establishment_admin', 'consultations', 'can_view')).toBe(true);
      expect(await can('establishment_admin', 'consultations', 'can_update')).toBe(false);
    });

    it("n'administre pas la plateforme SaaS", async () => {
      expect(await can('establishment_admin', 'saas_platform', 'can_view')).toBe(false);
    });
  });

  describe('Patient (UG10, BP29)', () => {
    it("ne dispose que de son portail", async () => {
      expect(await can('patient', 'patient_portal', 'can_view')).toBe(true);
      expect(await can('patient', 'patients', 'can_view')).toBe(false);
      expect(await can('patient', 'consultations', 'can_view')).toBe(false);
      expect(await can('patient', 'finance', 'can_view')).toBe(false);
    });
  });

  describe('Cohérence générale', () => {
    it('chaque permission référence un module existant', async () => {
      const rows = await db.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM public.role_permissions rp
         WHERE NOT EXISTS (SELECT 1 FROM public.modules m WHERE m.id = rp.module_id)`,
      );
      expect(rows.rows[0].n).toBe(0);
    });

    it('aucun rôle ne dispose de droits d’écriture sans droit de lecture', async () => {
      const rows = await db.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM public.role_permissions
         WHERE can_view = false AND (can_create OR can_update OR can_delete)`,
      );
      expect(rows.rows[0].n).toBe(0);
    });

    it('les dix rôles documentés sont couverts', async () => {
      const rows = await db.query<{ role: string }>(
        `SELECT DISTINCT role::text AS role FROM public.role_permissions ORDER BY role`,
      );
      expect(rows.rows.map((r) => r.role)).toEqual([
        'accountant',
        'doctor',
        'establishment_admin',
        'lab_tech',
        'nurse',
        'patient',
        'pharmacist',
        'radiologist',
        'receptionist',
        'super_admin',
      ]);
    });
  });
});
