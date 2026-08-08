import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  asUser,
  createEstablishment,
  createTestDatabase,
  createUser,
  queryAsAuthenticated,
  type TestDatabase,
} from './helpers/database';

/**
 * Centre de notifications — portée de lecture et cycle de vie.
 *
 * Le Super Admin et le responsable d'établissement partagent le même écran :
 * seules les politiques RLS décident de ce que chacun voit. Ces tests fixent
 * cette frontière, et vérifient que l'archivage se comporte identiquement des
 * deux côtés — c'est le défaut signalé en recette.
 */

let db: TestDatabase;
let establishmentA: string;
let establishmentB: string;
let superAdmin: string;
let adminA: string;
let nurseA: string;

const insertNotification = async (
  establishmentId: string | null,
  title: string,
  archived: boolean,
): Promise<string> => {
  const rows = await db.query<{ id: string }>(
    `INSERT INTO public.notifications
       (user_id, establishment_id, category, severity, type, title, message, is_read, is_archived, archived_at)
     VALUES (NULL, $1, 'system', 'info', 'info', $2, 'Message', $3, $3, CASE WHEN $3 THEN NOW() END)
     RETURNING id`,
    [establishmentId, title, archived],
  );
  return rows.rows[0].id;
};

beforeAll(async () => {
  db = await createTestDatabase();

  establishmentA = await createEstablishment(db, 'Clinique Alpha');
  establishmentB = await createEstablishment(db, 'Clinique Beta');

  superAdmin = await createUser(db, {
    email: 'super@moracare.km',
    role: 'super_admin',
    establishmentId: null,
  });
  adminA = await createUser(db, {
    email: 'admin.a@moracare.km',
    role: 'establishment_admin',
    establishmentId: establishmentA,
  });
  nurseA = await createUser(db, {
    email: 'nurse.a@moracare.km',
    role: 'nurse',
    establishmentId: establishmentA,
  });

  await insertNotification(null, 'Plateforme active', false);
  await insertNotification(null, 'Plateforme archivée', true);
  await insertNotification(establishmentA, 'Alpha active', false);
  await insertNotification(establishmentA, 'Alpha archivée', true);
  await insertNotification(establishmentB, 'Beta archivée', true);
}, 180_000);

afterAll(async () => {
  await db?.close();
});

/** Reproduit la requête du Centre selon la portée choisie. */
const readAs = (userId: string, includeArchived: boolean) =>
  queryAsAuthenticated<{ title: string; is_archived: boolean }>(
    db,
    userId,
    includeArchived
      ? `SELECT title, is_archived FROM public.notifications ORDER BY title`
      : `SELECT title, is_archived FROM public.notifications WHERE is_archived = false ORDER BY title`,
  );

describe('Portée de lecture', () => {
  it('le Super Admin lit les notifications archivées de tous les établissements', async () => {
    const rows = await readAs(superAdmin, true);
    const archived = rows.filter((row) => row.is_archived).map((row) => row.title);

    // Le filtre « Archivées » du Centre ne doit rien perdre côté éditeur : les
    // trois archives, plateforme comprise, doivent lui parvenir.
    expect(archived.sort()).toEqual(['Alpha archivée', 'Beta archivée', 'Plateforme archivée']);
  });

  it('le responsable ne lit que les archives de son établissement', async () => {
    const rows = await readAs(adminA, true);
    const titles = rows.map((row) => row.title).sort();

    expect(titles).toEqual(['Alpha active', 'Alpha archivée']);
    expect(titles).not.toContain('Beta archivée');
    expect(titles).not.toContain('Plateforme archivée');
  });

  it('le personnel soignant ne voit aucune notification d’établissement', async () => {
    // Les échéances d'abonnement et les incidents relèvent de la gestion de la
    // structure, pas du soin.
    const rows = await readAs(nurseA, true);
    expect(rows).toHaveLength(0);
  });

  it('la portée « actives » masque les archives des deux côtés', async () => {
    expect((await readAs(superAdmin, false)).every((row) => !row.is_archived)).toBe(true);
    expect((await readAs(adminA, false)).every((row) => !row.is_archived)).toBe(true);
  });
});

describe('Cycle de vie', () => {
  it('archiver puis désarchiver ramène la notification dans les actives', async () => {
    const id = await insertNotification(establishmentA, 'Cycle', false);

    await asUser(
      db,
      adminA,
      `UPDATE public.notifications SET is_archived = true, archived_at = NOW(), is_read = true WHERE id = $1`,
      [id],
    );
    expect(
      (await readAs(adminA, false)).some((row) => row.title === 'Cycle'),
    ).toBe(false);

    await asUser(
      db,
      adminA,
      `UPDATE public.notifications SET is_archived = false, archived_at = NULL WHERE id = $1`,
      [id],
    );
    expect((await readAs(adminA, false)).some((row) => row.title === 'Cycle')).toBe(true);
  });

  it('un responsable ne peut pas archiver la notification d’un autre établissement', async () => {
    const id = await insertNotification(establishmentB, 'Beta protégée', false);

    const updated = await queryAsAuthenticated<{ id: string }>(
      db,
      adminA,
      `UPDATE public.notifications SET is_archived = true WHERE id = $1 RETURNING id`,
      [id],
    );

    // RLS ne lève pas d'erreur : elle rend simplement la ligne invisible, donc
    // aucune ligne n'est modifiée. C'est la garantie d'isolation.
    expect(updated).toHaveLength(0);
  });

  it('les alertes d’échéance ne sont émises qu’une fois par seuil', async () => {
    const plan = await db.query<{ id: string }>(
      `SELECT id FROM public.subscription_plans ORDER BY created_at LIMIT 1`,
    );

    await db.query(
      `INSERT INTO public.subscriptions (establishment_id, plan_id, status, start_date, end_date, duration_months)
       VALUES ($1, $2, 'active', CURRENT_DATE, CURRENT_DATE + 5, 1)`,
      [establishmentA, plan.rows[0].id],
    );

    const first = await db.query<{ emit_subscription_expiry_alerts: number }>(
      `SELECT public.emit_subscription_expiry_alerts()`,
    );
    const second = await db.query<{ emit_subscription_expiry_alerts: number }>(
      `SELECT public.emit_subscription_expiry_alerts()`,
    );

    // Une pour le Super Admin, une pour le responsable ; le second appel ne
    // doit rien produire, sans quoi ouvrir le Centre créerait des doublons.
    expect(first.rows[0].emit_subscription_expiry_alerts).toBe(2);
    expect(second.rows[0].emit_subscription_expiry_alerts).toBe(0);
  });
});
