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
 * Isolation multi-tenant (TD06 §8, BP09 §2, BP30 BR-286).
 *
 * « Les utilisateurs d'un établissement ne peuvent jamais accéder aux données
 * d'un autre établissement. » Ces tests vérifient que la garantie tient au
 * niveau de PostgreSQL, indépendamment de l'interface.
 */

describe('Isolation multi-tenant', () => {
  let db: TestDatabase;
  let clinicA: string;
  let clinicB: string;
  let doctorA: string;
  let doctorB: string;
  let superAdmin: string;

  beforeAll(async () => {
    db = await createTestDatabase();

    clinicA = await createEstablishment(db, 'Clinique A');
    clinicB = await createEstablishment(db, 'Clinique B');

    doctorA = await createUser(db, { email: 'a@clinicA.km', role: 'doctor', establishmentId: clinicA });
    doctorB = await createUser(db, { email: 'b@clinicB.km', role: 'doctor', establishmentId: clinicB });
    superAdmin = await createUser(db, { email: 'sa@mora.km', role: 'super_admin', establishmentId: null });

    await createPatient(db, clinicA, 'AlphaPatient');
    await createPatient(db, clinicB, 'BetaPatient');
  });

  afterAll(async () => {
    await db?.close();
  });

  const patientsSeenBy = async (userId: string) => {
    const rows = await queryAsAuthenticated<{ last_name: string }>(
      db,
      userId,
      'SELECT last_name FROM public.patients ORDER BY last_name',
    );
    return rows.map((r) => r.last_name);
  };

  it("un médecin ne voit que les patients de son établissement", async () => {
    expect(await patientsSeenBy(doctorA)).toEqual(['AlphaPatient']);
  });

  it("un médecin ne voit jamais les patients d'un autre établissement", async () => {
    const seen = await patientsSeenBy(doctorB);
    expect(seen).toEqual(['BetaPatient']);
    expect(seen).not.toContain('AlphaPatient');
  });

  it('le Super Admin voit les patients de tous les établissements', async () => {
    // Note : cet accès existe pour l'administration de la plateforme. BP06
    // §10 bis lui interdit par ailleurs l'accès applicatif aux modules de soins.
    const seen = await patientsSeenBy(superAdmin);
    expect(seen).toHaveLength(2);
  });

  it("une écriture dans un autre établissement est refusée (WITH CHECK)", async () => {
    await expect(
      queryAsAuthenticated(
        db,
        doctorA,
        `INSERT INTO public.patients (establishment_id, first_name, last_name, gender, birth_date, phone)
         VALUES ($1, 'Intrus', 'Intrus', 'M', '1990-01-01', '+269')`,
        [clinicB],
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it("une écriture dans son propre établissement est acceptée", async () => {
    await queryAsAuthenticated(
      db,
      doctorA,
      `INSERT INTO public.patients (establishment_id, first_name, last_name, gender, birth_date, phone)
       VALUES ($1, 'Nouveau', 'GammaPatient', 'F', '1995-05-05', '+269222222')`,
      [clinicA],
    );

    expect(await patientsSeenBy(doctorA)).toContain('GammaPatient');
    expect(await patientsSeenBy(doctorB)).not.toContain('GammaPatient');
  });

  it("un utilisateur sans établissement ne voit aucun patient", async () => {
    const orphan = await createUser(db, {
      email: 'orphan@nowhere.km',
      role: 'doctor',
      establishmentId: null,
    });
    expect(await patientsSeenBy(orphan)).toEqual([]);
  });
});
