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
 * Module Hospitalisation — chambres, lits et parcours du séjour (BP16).
 *
 * Les règles vérifiées ici sont celles que l'interface ne peut pas garantir
 * seule : un second onglet, une reprise de données ou un correctif pressé
 * contourneraient un contrôle porté par le seul formulaire. Elles doivent tenir
 * dans la base.
 */

let db: TestDatabase;
let establishment: string;
let otherEstablishment: string;
let admin: string;
let doctor: string;
let patientA: string;
let patientB: string;
let room: string;
let bedOne: string;
let bedTwo: string;

const one = async <T>(sql: string, params: unknown[] = []): Promise<T> => {
  const rows = await db.query<T>(sql, params);
  return rows.rows[0];
};

const createRoom = async (
  establishmentId: string,
  code: string,
  capacity = 2,
): Promise<string> => {
  const row = await one<{ id: string }>(
    `INSERT INTO public.rooms (establishment_id, code, room_type, service, capacity, daily_rate)
     VALUES ($1, $2, 'Chambre individuelle', 'Médecine générale', $3, 15000) RETURNING id`,
    [establishmentId, code, capacity],
  );
  return row.id;
};

const createBed = async (
  establishmentId: string,
  roomId: string,
  code: string,
): Promise<string> => {
  const row = await one<{ id: string }>(
    `INSERT INTO public.beds (establishment_id, room_id, code) VALUES ($1, $2, $3) RETURNING id`,
    [establishmentId, roomId, code],
  );
  return row.id;
};

const admit = async (patientId: string, bedId: string | null, roomId: string | null) =>
  one<{ id: string }>(
    `INSERT INTO public.hospitalizations
       (establishment_id, patient_id, doctor_id, room_id, bed_id, service, admission_reason, stay_status)
     VALUES ($1, $2, $3, $4, $5, 'Médecine générale', 'Surveillance', 'in_stay')
     RETURNING id`,
    [establishment, patientId, doctor, roomId, bedId],
  );

beforeAll(async () => {
  db = await createTestDatabase();

  establishment = await createEstablishment(db, 'Clinique Hospi');
  otherEstablishment = await createEstablishment(db, 'Clinique Voisine');

  admin = await createUser(db, {
    email: 'admin@hospi.km',
    role: 'establishment_admin',
    establishmentId: establishment,
  });
  doctor = await createUser(db, {
    email: 'doc@hospi.km',
    role: 'doctor',
    establishmentId: establishment,
  });

  patientA = await createPatient(db, establishment, 'Alpha');
  patientB = await createPatient(db, establishment, 'Beta');

  room = await createRoom(establishment, '204', 2);
  bedOne = await createBed(establishment, room, 'A');
  bedTwo = await createBed(establishment, room, 'B');
}, 180_000);

afterAll(async () => {
  await db?.close();
});

describe('Chambres et lits', () => {
  it('attribue une référence métier séquentielle', async () => {
    const row = await one<{ business_reference: string }>(
      `SELECT business_reference FROM public.rooms WHERE id = $1`,
      [room],
    );
    expect(row.business_reference).toMatch(/^MORA-CHB-\d{6}$/);
  });

  it('refuse deux chambres portant le même numéro dans l’établissement', async () => {
    // La casse ne fait pas une chambre différente : « 204 » et « 204 » sont la
    // même porte.
    await expect(createRoom(establishment, '204')).rejects.toThrow();
  });

  it('accepte le même numéro dans un autre établissement', async () => {
    await expect(createRoom(otherEstablishment, '204')).resolves.toBeTruthy();
  });

  it('refuse plus de lits que la capacité déclarée', async () => {
    await expect(createBed(establishment, room, 'C')).rejects.toThrow(/plus de 2 lit/);
  });

  it('refuse un lit rattaché à la chambre d’un autre établissement', async () => {
    await expect(
      db.query(
        `INSERT INTO public.beds (establishment_id, room_id, code) VALUES ($1, $2, 'X')`,
        [otherEstablishment, room],
      ),
    ).rejects.toThrow(/même établissement/);
  });
});

describe('Affectation d’un lit', () => {
  it('marque le lit occupé à l’admission', async () => {
    await admit(patientA, bedOne, room);

    const bed = await one<{ status: string }>(`SELECT status FROM public.beds WHERE id = $1`, [
      bedOne,
    ]);
    expect(bed.status).toBe('occupied');
  });

  it('BR-058 : refuse deux patients sur le même lit', async () => {
    await expect(admit(patientB, bedOne, room)).rejects.toThrow();
  });

  it('refuse un lit qui n’appartient pas à la chambre choisie', async () => {
    const autre = await createRoom(establishment, '205', 1);

    await expect(admit(patientB, bedTwo, autre)).rejects.toThrow(/n'appartient pas à la chambre/);
  });

  it('refuse un lit hors service', async () => {
    const isolation = await createRoom(establishment, '300', 1);
    const bed = await createBed(establishment, isolation, 'A');
    await db.query(`UPDATE public.beds SET status = 'out_of_service' WHERE id = $1`, [bed]);

    await expect(admit(patientB, bed, isolation)).rejects.toThrow(/indisponible/);
  });

  it('refuse une sortie non validée quand le paramètre l’exige', async () => {
    const stay = await one<{ id: string }>(
      `SELECT id FROM public.hospitalizations WHERE bed_id = $1`,
      [bedOne],
    );

    // Le réglage « Exiger une validation médicale avant la sortie » est actif
    // par défaut : il doit bloquer, et pas seulement afficher un avertissement.
    await expect(
      db.query(
        `UPDATE public.hospitalizations SET stay_status = 'discharged' WHERE id = $1`,
        [stay.id],
      ),
    ).rejects.toThrow(/validée par un praticien/);
  });

  it('BR-060 : la sortie libère automatiquement le lit', async () => {
    const stay = await one<{ id: string }>(
      `SELECT id FROM public.hospitalizations WHERE bed_id = $1`,
      [bedOne],
    );

    await db.query(
      `UPDATE public.hospitalizations
          SET stay_status = 'discharged', discharge_date = NOW(),
              discharge_validated_by = $2, discharge_validated_at = NOW()
        WHERE id = $1`,
      [stay.id, doctor],
    );

    const bed = await one<{ status: string }>(`SELECT status FROM public.beds WHERE id = $1`, [
      bedOne,
    ]);
    expect(bed.status).toBe('available');

    // Le lit libéré doit redevenir attribuable.
    await expect(admit(patientB, bedOne, room)).resolves.toBeTruthy();
  });

  it('libère l’ancien lit lors d’un transfert', async () => {
    const stay = await one<{ id: string }>(
      `SELECT id FROM public.hospitalizations WHERE bed_id = $1 AND stay_status = 'in_stay'`,
      [bedOne],
    );

    await db.query(`UPDATE public.hospitalizations SET bed_id = $1 WHERE id = $2`, [bedTwo, stay.id]);

    const ancien = await one<{ status: string }>(`SELECT status FROM public.beds WHERE id = $1`, [
      bedOne,
    ]);
    const nouveau = await one<{ status: string }>(`SELECT status FROM public.beds WHERE id = $1`, [
      bedTwo,
    ]);

    expect(ancien.status).toBe('available');
    expect(nouveau.status).toBe('occupied');
  });
});

describe('Disponibilité', () => {
  it('la vue distingue les lits attribuables des lits occupés', async () => {
    const rows = await queryAsAuthenticated<{
      bed_code: string;
      is_assignable: boolean;
      patient_id: string | null;
    }>(
      db,
      admin,
      `SELECT bed_code, is_assignable, patient_id
         FROM public.bed_availability
        WHERE room_id = $1 ORDER BY bed_code`,
      [room],
    );

    const libre = rows.find((r) => r.bed_code === 'A');
    const occupe = rows.find((r) => r.bed_code === 'B');

    expect(libre?.is_assignable).toBe(true);
    expect(libre?.patient_id).toBeNull();
    expect(occupe?.is_assignable).toBe(false);
    expect(occupe?.patient_id).not.toBeNull();
  });

  it('n’expose jamais les lits d’un autre établissement', async () => {
    const rows = await queryAsAuthenticated<{ establishment_id: string }>(
      db,
      admin,
      `SELECT DISTINCT establishment_id FROM public.bed_availability`,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].establishment_id).toBe(establishment);
  });
});

describe('Suivi du séjour', () => {
  it('enregistre soins, visites et transferts avec leur référence', async () => {
    const stay = await one<{ id: string }>(
      `SELECT id FROM public.hospitalizations WHERE stay_status = 'in_stay' LIMIT 1`,
    );

    const care = await one<{ business_reference: string }>(
      `INSERT INTO public.hospitalization_care
         (establishment_id, hospitalization_id, care_type, temperature, heart_rate, observations, caregiver_id)
       VALUES ($1, $2, 'Constantes', 37.2, 78, 'Patient stable', $3)
       RETURNING business_reference`,
      [establishment, stay.id, doctor],
    );

    const visit = await one<{ business_reference: string }>(
      `INSERT INTO public.hospitalization_visits
         (establishment_id, hospitalization_id, doctor_id, observations, decision)
       VALUES ($1, $2, $3, 'Évolution favorable', 'Poursuite du traitement')
       RETURNING business_reference`,
      [establishment, stay.id, doctor],
    );

    const transfer = await one<{ business_reference: string }>(
      `INSERT INTO public.hospitalization_transfers
         (establishment_id, hospitalization_id, transfer_type, reason, performed_by)
       VALUES ($1, $2, 'service', 'Rapprochement du plateau technique', $3)
       RETURNING business_reference`,
      [establishment, stay.id, doctor],
    );

    expect(care.business_reference).toMatch(/^MORA-SOI-\d{6}$/);
    expect(visit.business_reference).toMatch(/^MORA-VIS-\d{6}$/);
    expect(transfer.business_reference).toMatch(/^MORA-TRF-\d{6}$/);
  });

  it('refuse une constante manifestement erronée', async () => {
    const stay = await one<{ id: string }>(
      `SELECT id FROM public.hospitalizations WHERE stay_status = 'in_stay' LIMIT 1`,
    );

    // 380 °C au lieu de 38,0 : la virgule oubliée est l'erreur de saisie la
    // plus courante sur une feuille de constantes.
    await expect(
      db.query(
        `INSERT INTO public.hospitalization_care
           (establishment_id, hospitalization_id, care_type, temperature)
         VALUES ($1, $2, 'Constantes', 380)`,
        [establishment, stay.id],
      ),
    ).rejects.toThrow();
  });
});

describe('Isolation entre établissements', () => {
  it('un responsable ne voit que ses propres chambres', async () => {
    const rows = await queryAsAuthenticated<{ code: string }>(
      db,
      admin,
      `SELECT code FROM public.rooms ORDER BY code`,
    );

    // « 204 » existe dans les deux établissements : une seule doit remonter.
    expect(rows.filter((r) => r.code === '204')).toHaveLength(1);
  });

  it('un responsable ne peut pas créer une chambre chez un voisin', async () => {
    const inserted = await queryAsAuthenticated(
      db,
      admin,
      `INSERT INTO public.rooms (establishment_id, code, room_type, capacity)
       VALUES ($1, 'PIRATE', 'Standard', 1) RETURNING id`,
      [otherEstablishment],
    ).catch(() => 'refusé');

    expect(inserted).toBe('refusé');
  });
});
