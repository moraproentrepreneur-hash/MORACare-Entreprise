import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  asUser,
  createEstablishment,
  createPatient,
  createTestDatabase,
  createUser,
  queryAsAuthenticated,
  type TestDatabase,
} from './helpers/database';

/**
 * Patients, Rendez-vous et Consultations (BP13, BP14, BP15).
 *
 * Les règles vérifiées ici sont celles que le blueprint énonce comme des règles
 * métier numérotées : elles engagent la cohérence du dossier médical et ne
 * peuvent pas dépendre du formulaire qui les précède.
 */

let db: TestDatabase;
let establishment: string;
let voisin: string;
let admin: string;
let doctor: string;
let secondDoctor: string;
let nurse: string;
let patient: string;

const one = async <T>(sql: string, params: unknown[] = []): Promise<T> => {
  const rows = await db.query<T>(sql, params);
  return rows.rows[0];
};

beforeAll(async () => {
  db = await createTestDatabase();

  establishment = await createEstablishment(db, 'Clinique Clinique');
  voisin = await createEstablishment(db, 'Clinique Voisine');

  admin = await createUser(db, {
    email: 'admin@clin.km',
    role: 'establishment_admin',
    establishmentId: establishment,
  });
  doctor = await createUser(db, {
    email: 'doc@clin.km',
    role: 'doctor',
    establishmentId: establishment,
  });
  secondDoctor = await createUser(db, {
    email: 'doc2@clin.km',
    role: 'doctor',
    establishmentId: establishment,
  });
  nurse = await createUser(db, {
    email: 'inf@clin.km',
    role: 'nurse',
    establishmentId: establishment,
  });

  patient = await createPatient(db, establishment, 'Principal');
}, 180_000);

afterAll(async () => {
  await db?.close();
});

// ---------------------------------------------------------------------------

describe('Dossier patient (BP13 §5 à §9)', () => {
  it('accueille les informations administratives et médicales du blueprint', async () => {
    await db.query(
      `UPDATE public.patients
          SET nationality = 'Comorienne', profession = 'Enseignante',
              marital_status = 'Mariée', city = 'Moroni', country = 'Comores',
              phone_secondary = '+269 111 22 33', preferred_language = 'Français',
              passport_number = 'P123456', social_security_number = 'SS-778899',
              height_cm = 168, weight_kg = 62.5, intolerances = 'Lactose',
              medical_history = 'Paludisme 2021', surgical_history = 'Appendicectomie 2015',
              current_treatments = 'Fer', vaccinations = 'BCG, DTC', disability = 'Aucun',
              is_pregnant = TRUE, pregnancy_due_date = CURRENT_DATE + 120
        WHERE id = $1`,
      [patient],
    );

    const row = await one<{ nationality: string; height_cm: string; is_pregnant: boolean }>(
      `SELECT nationality, height_cm, is_pregnant FROM public.patients WHERE id = $1`,
      [patient],
    );

    expect(row.nationality).toBe('Comorienne');
    expect(Number(row.height_cm)).toBe(168);
    expect(row.is_pregnant).toBe(true);
  });

  it('refuse une taille manifestement erronée', async () => {
    // 1 680 cm au lieu de 168 : le zéro de trop est l'erreur de saisie la plus
    // courante sur une fiche d'admission.
    await expect(
      db.query(`UPDATE public.patients SET height_cm = 1680 WHERE id = $1`, [patient]),
    ).rejects.toThrow();
  });

  it('accepte plusieurs contacts d’urgence et un responsable légal', async () => {
    await db.query(
      `INSERT INTO public.patient_contacts
         (establishment_id, patient_id, contact_type, first_name, last_name, relationship, phone)
       VALUES
         ($1, $2, 'emergency', 'Ali', 'Mohamed', 'Époux', '+269 333 11 11'),
         ($1, $2, 'emergency', 'Fatima', 'Said', 'Sœur', '+269 333 22 22'),
         ($1, $2, 'legal_guardian', 'Said', 'Ahmed', 'Père', '+269 333 33 33')`,
      [establishment, patient],
    );

    const rows = await db.query<{ contact_type: string }>(
      `SELECT contact_type FROM public.patient_contacts WHERE patient_id = $1`,
      [patient],
    );
    expect(rows.rows).toHaveLength(3);
  });

  it('n’accepte qu’une seule assurance principale', async () => {
    await db.query(
      `INSERT INTO public.patient_insurances
         (establishment_id, patient_id, company, policy_number, coverage_percent, is_primary)
       VALUES ($1, $2, 'Assurance Comores', 'POL-1', 80, TRUE)`,
      [establishment, patient],
    );

    // Deux assurances principales rendraient le montant pris en charge
    // indéterminé.
    await expect(
      db.query(
        `INSERT INTO public.patient_insurances
           (establishment_id, patient_id, company, policy_number, is_primary)
         VALUES ($1, $2, 'Autre Assureur', 'POL-2', TRUE)`,
        [establishment, patient],
      ),
    ).rejects.toThrow();
  });

  it('refuse une couverture hors des bornes', async () => {
    await expect(
      db.query(
        `INSERT INTO public.patient_insurances
           (establishment_id, patient_id, company, coverage_percent)
         VALUES ($1, $2, 'Assureur', 150)`,
        [establishment, patient],
      ),
    ).rejects.toThrow();
  });
});

describe('Alertes médicales (BP13 §11, BR-035)', () => {
  it('sont exposées à tous les modules par une source unique', async () => {
    await db.query(
      `INSERT INTO public.patient_alerts
         (establishment_id, patient_id, alert_type, severity, label)
       VALUES
         ($1, $2, 'allergy', 'critical', 'Allergie à la pénicilline'),
         ($1, $2, 'chronic', 'warning', 'Diabète de type 2')`,
      [establishment, patient],
    );

    const row = await one<{
      alert_count: string;
      critical_count: string;
      has_critical: boolean;
      labels: string[];
    }>(
      `SELECT alert_count, critical_count, has_critical, labels
         FROM public.patient_active_alerts WHERE patient_id = $1`,
      [patient],
    );

    expect(Number(row.alert_count)).toBe(2);
    expect(Number(row.critical_count)).toBe(1);
    expect(row.has_critical).toBe(true);
    // Les critiques passent devant : c'est ce qu'on doit voir en premier.
    expect(row.labels[0]).toBe('Allergie à la pénicilline');
  });

  it('disparaissent partout dès qu’elles sont levées', async () => {
    await db.query(
      `UPDATE public.patient_alerts SET is_active = FALSE WHERE alert_type = 'chronic'`,
    );

    const row = await one<{ alert_count: string }>(
      `SELECT alert_count FROM public.patient_active_alerts WHERE patient_id = $1`,
      [patient],
    );
    expect(Number(row.alert_count)).toBe(1);
  });
});

describe('Doublons et fusion (BP13 §15, §16 ; BR-031, BR-036)', () => {
  let duplicate: string;

  it('détecte un doublon sur l’identité et la date de naissance', async () => {
    duplicate = await createPatient(db, establishment, 'Principal');

    const rows = await db.query<{ patient_id: string; score: number; reason: string }>(
      `SELECT patient_id, score, reason
         FROM public.find_patient_duplicates($1, 'Patient', 'Principal', '1990-01-01',
                                             NULL, NULL, $2)`,
      [establishment, duplicate],
    );

    expect(rows.rows.length).toBeGreaterThan(0);
    expect(rows.rows[0].patient_id).toBe(patient);
    expect(rows.rows[0].score).toBeGreaterThanOrEqual(80);
    expect(rows.rows[0].reason).toContain('date de naissance');
  });

  it('classe la pièce d’identité au-dessus de l’homonymie', async () => {
    await db.query(`UPDATE public.patients SET national_id = 'CNI-4242' WHERE id = $1`, [patient]);

    const rows = await db.query<{ score: number; reason: string }>(
      `SELECT score, reason
         FROM public.find_patient_duplicates($1, 'Autre', 'Nom', '1980-05-05', NULL,
                                             'CNI-4242', NULL)`,
      [establishment],
    );

    expect(rows.rows[0].score).toBe(100);
    expect(rows.rows[0].reason).toContain('pièce d');
  });

  it('ne franchit jamais la frontière d’un établissement', async () => {
    await createPatient(db, voisin, 'Principal');

    const rows = await db.query<{ patient_id: string }>(
      `SELECT patient_id
         FROM public.find_patient_duplicates($1, 'Patient', 'Principal', '1990-01-01',
                                             NULL, NULL, NULL)`,
      [voisin],
    );

    // Un dossier du voisin ne doit jamais remonter comme doublon.
    for (const row of rows.rows) {
      const check = await one<{ establishment_id: string }>(
        `SELECT establishment_id FROM public.patients WHERE id = $1`,
        [row.patient_id],
      );
      expect(check.establishment_id).toBe(voisin);
    }
  });

  it('reporte tout le dossier absorbé sur le dossier conservé', async () => {
    await db.query(
      `INSERT INTO public.appointments
         (establishment_id, patient_id, doctor_id, appointment_date, reason)
       VALUES ($1, $2, $3, NOW() + INTERVAL '3 days', 'Contrôle')`,
      [establishment, duplicate, doctor],
    );
    await db.query(
      `INSERT INTO public.consultations
         (establishment_id, patient_id, doctor_id, chief_complaint)
       VALUES ($1, $2, $3, 'Fièvre')`,
      [establishment, duplicate, doctor],
    );

    const moved = await asUser<{ merge_patients: number }>(
      db,
      admin,
      `SELECT public.merge_patients($1, $2, $3)`,
      [patient, duplicate, admin],
    );

    expect(moved[0].merge_patients).toBeGreaterThanOrEqual(2);

    const absorbed = await one<{ patient_status: string; merged_into: string }>(
      `SELECT patient_status, merged_into FROM public.patients WHERE id = $1`,
      [duplicate],
    );

    // BR-033 : jamais de suppression physique. Le dossier reste, marqué fusionné.
    expect(absorbed.patient_status).toBe('merged');
    expect(absorbed.merged_into).toBe(patient);

    const consultations = await db.query(
      `SELECT id FROM public.consultations WHERE patient_id = $1`,
      [duplicate],
    );
    expect(consultations.rows).toHaveLength(0);
  });

  it('refuse une seconde fusion du même dossier', async () => {
    await expect(
      asUser(db, admin, `SELECT public.merge_patients($1, $2, $3)`, [patient, duplicate, admin]),
    ).rejects.toThrow(/déjà été fusionné/);
  });

  it('refuse de fusionner un dossier avec lui-même', async () => {
    await expect(
      asUser(db, admin, `SELECT public.merge_patients($1, $1, $2)`, [patient, admin]),
    ).rejects.toThrow(/avec lui-même/);
  });

  it('BR-036 : réserve la fusion aux utilisateurs autorisés', async () => {
    const a = await createPatient(db, establishment, 'FusionA');
    const b = await createPatient(db, establishment, 'FusionB');

    // Un infirmier ne doit pas pouvoir fusionner deux dossiers : l'opération est
    // irréversible.
    const refused = await queryAsAuthenticated(
      db,
      nurse,
      `SELECT public.merge_patients($1, $2, $3)`,
      [a, b, nurse],
    ).catch(() => 'refusé');

    expect(refused).toBe('refusé');
  });
});

describe('Rendez-vous (BP14, BR-041, BR-042, BR-044)', () => {
  const book = (
    doctorId: string,
    at: string,
    duration = 30,
    status = 'scheduled',
  ): Promise<unknown> =>
    db.query(
      `INSERT INTO public.appointments
         (establishment_id, patient_id, doctor_id, appointment_date, duration_minutes,
          status, reason)
       VALUES ($1, $2, $3, $4::TIMESTAMPTZ, $5, $6, 'Consultation')`,
      [establishment, patient, doctorId, at, duration, status],
    );

  it('BR-041 : refuse deux rendez-vous qui se chevauchent', async () => {
    await book(doctor, '2026-09-01 09:00:00+00', 30);

    // 9 h 15 tombe dans le créneau de 9 h à 9 h 30 : c'est exactement le
    // conflit que la règle veut éviter.
    await expect(book(doctor, '2026-09-01 09:15:00+00', 30)).rejects.toThrow(/déjà le rendez-vous/);
  });

  it('accepte un créneau contigu', async () => {
    await expect(book(doctor, '2026-09-01 09:30:00+00', 30)).resolves.toBeTruthy();
  });

  it('n’oppose pas les agendas de deux praticiens', async () => {
    await expect(book(secondDoctor, '2026-09-01 09:00:00+00', 30)).resolves.toBeTruthy();
  });

  it('libère le créneau d’un rendez-vous annulé (BR-044)', async () => {
    await db.query(
      `UPDATE public.appointments
          SET status = 'canceled', cancellation_reason = 'Patient empêché'
        WHERE doctor_id = $1 AND appointment_date = '2026-09-01 09:00:00+00'`,
      [doctor],
    );

    await expect(book(doctor, '2026-09-01 09:10:00+00', 20)).resolves.toBeTruthy();

    // BR-044 : le rendez-vous annulé reste dans l'historique.
    const kept = await one<{ count: string }>(
      `SELECT count(*) FROM public.appointments WHERE status = 'canceled'`,
    );
    expect(Number(kept.count)).toBe(1);
  });

  it('BR-042 : historise chaque changement d’état', async () => {
    const appointment = await one<{ id: string }>(
      `SELECT id FROM public.appointments WHERE status = 'canceled' LIMIT 1`,
    );

    const events = await db.query<{ from_status: string | null; to_status: string }>(
      `SELECT from_status, to_status FROM public.appointment_events
        WHERE appointment_id = $1 ORDER BY occurred_at`,
      [appointment.id],
    );

    // Création puis annulation : deux événements, dont le second porte la
    // transition.
    expect(events.rows).toHaveLength(2);
    expect(events.rows[0].from_status).toBeNull();
    expect(events.rows[1].to_status).toBe('canceled');
  });

  it('conserve le lien vers le rendez-vous reporté (BP14 §12)', async () => {
    const origin = await one<{ id: string }>(
      `SELECT id FROM public.appointments WHERE status = 'canceled' LIMIT 1`,
    );

    const moved = await one<{ rescheduled_from: string }>(
      `INSERT INTO public.appointments
         (establishment_id, patient_id, doctor_id, appointment_date, reason, rescheduled_from)
       VALUES ($1, $2, $3, '2026-09-05 10:00:00+00', 'Report', $4)
       RETURNING rescheduled_from`,
      [establishment, patient, doctor, origin.id],
    );

    expect(moved.rescheduled_from).toBe(origin.id);
  });

  it('l’historique des rendez-vous est immuable', async () => {
    // Il retrace ce qui s'est produit : le réécrire n'aurait aucun sens.
    await expect(
      db.query(`UPDATE public.appointment_events SET to_status = 'falsifie'`),
    ).rejects.toThrow(/immuable/);

    await expect(db.query(`DELETE FROM public.appointment_events`)).rejects.toThrow(/immuable/);
  });
});

describe('Consultations (BP15, BR-049)', () => {
  let consultation: string;

  it('accueille les constantes et l’orientation du blueprint', async () => {
    const row = await one<{ id: string }>(
      `INSERT INTO public.consultations
         (establishment_id, patient_id, doctor_id, consultation_type, chief_complaint,
          respiratory_rate, oxygen_saturation, pain_level, outcome, next_visit_date)
       VALUES ($1, $2, $3, 'urgence', 'Douleur thoracique', 22, 96, 7,
               'hospitalisation', CURRENT_DATE + 15)
       RETURNING id`,
      [establishment, patient, doctor],
    );
    consultation = row.id;

    const check = await one<{ outcome: string; pain_level: number }>(
      `SELECT outcome, pain_level FROM public.consultations WHERE id = $1`,
      [consultation],
    );
    expect(check.outcome).toBe('hospitalisation');
    expect(check.pain_level).toBe(7);
  });

  it('refuse une orientation inconnue', async () => {
    await expect(
      db.query(`UPDATE public.consultations SET outcome = 'ailleurs' WHERE id = $1`, [consultation]),
    ).rejects.toThrow();
  });

  it('BR-049 : accepte plusieurs diagnostics', async () => {
    await db.query(
      `INSERT INTO public.consultation_diagnoses
         (establishment_id, consultation_id, label, icd10_code, diagnosis_type, certainty)
       VALUES
         ($1, $2, 'Angine de poitrine', 'I20.9', 'principal', 'confirme'),
         ($1, $2, 'Hypertension artérielle', 'I10', 'associe', 'confirme'),
         ($1, $2, 'Reflux gastro-œsophagien', 'K21.9', 'differentiel', 'suspecte')`,
      [establishment, consultation],
    );

    const rows = await db.query<{ diagnosis_type: string }>(
      `SELECT diagnosis_type FROM public.consultation_diagnoses WHERE consultation_id = $1`,
      [consultation],
    );
    expect(rows.rows).toHaveLength(3);
  });

  it('n’accepte qu’un seul diagnostic principal', async () => {
    await expect(
      db.query(
        `INSERT INTO public.consultation_diagnoses
           (establishment_id, consultation_id, label, diagnosis_type)
         VALUES ($1, $2, 'Second principal', 'principal')`,
        [establishment, consultation],
      ),
    ).rejects.toThrow();
  });

  it('produit un certificat médical rattaché à la consultation (BP15 §12)', async () => {
    const row = await one<{ business_reference: string }>(
      `INSERT INTO public.medical_certificates
         (establishment_id, patient_id, consultation_id, doctor_id, certificate_type,
          starts_on, ends_on, rest_days, content)
       VALUES ($1, $2, $3, $4, 'arret_travail', CURRENT_DATE, CURRENT_DATE + 5, 5,
               'Repos de cinq jours prescrit.')
       RETURNING business_reference`,
      [establishment, patient, consultation, doctor],
    );

    expect(row.business_reference).toMatch(/^MORA-CER-\d{6}$/);
  });

  it('refuse un certificat dont la période est inversée', async () => {
    await expect(
      db.query(
        `INSERT INTO public.medical_certificates
           (establishment_id, patient_id, doctor_id, certificate_type,
            starts_on, ends_on, content)
         VALUES ($1, $2, $3, 'aptitude', CURRENT_DATE + 10, CURRENT_DATE, 'Test')`,
        [establishment, patient, doctor],
      ),
    ).rejects.toThrow();
  });
});

describe('Isolation entre établissements', () => {
  it('les alertes, contacts et certificats restent cloisonnés', async () => {
    const foreign = await createPatient(db, voisin, 'Étranger');
    await db.query(
      `INSERT INTO public.patient_alerts (establishment_id, patient_id, alert_type, label)
       VALUES ($1, $2, 'allergy', 'Alerte du voisin')`,
      [voisin, foreign],
    );

    const rows = await queryAsAuthenticated<{ label: string }>(
      db,
      doctor,
      `SELECT label FROM public.patient_alerts`,
    );

    expect(rows.map((r) => r.label)).not.toContain('Alerte du voisin');
  });

  it('un praticien ne crée pas un certificat chez un voisin', async () => {
    const refused = await queryAsAuthenticated(
      db,
      doctor,
      `INSERT INTO public.medical_certificates
         (establishment_id, patient_id, doctor_id, certificate_type, content)
       VALUES ($1, $2, $3, 'aptitude', 'Pirate') RETURNING id`,
      [voisin, patient, doctor],
    ).catch(() => 'refusé');

    expect(refused).toBe('refusé');
  });
});
