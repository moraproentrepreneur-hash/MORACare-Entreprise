import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createTestDatabase,
  createEstablishment,
  createUser,
  type TestDatabase,
} from './helpers/database';
import {
  DEFAULT_PASSWORD_POLICY,
  describePasswordError,
  evaluatePassword,
  generatePassword,
  generateVerificationCode,
  isPasswordValid,
} from '../src/lib/password-policy';
import { computePrice } from '../src/services/subscription.service';

/**
 * Sécurité : politique des mots de passe, verrouillage, codes de vérification
 * et tarification par durée.
 *
 * Les règles vérifiées ici sont celles qui doivent tenir quelle que soit
 * l'interface : contraintes de la base d'un côté, invariants du générateur de
 * l'autre.
 */

describe('Politique des mots de passe', () => {
  it('exige huit caractères, une majuscule, une minuscule et un chiffre', () => {
    expect(DEFAULT_PASSWORD_POLICY.minLength).toBe(8);
    expect(DEFAULT_PASSWORD_POLICY.requireUppercase).toBe(true);
    expect(DEFAULT_PASSWORD_POLICY.requireLowercase).toBe(true);
    expect(DEFAULT_PASSWORD_POLICY.requireDigit).toBe(true);
  });

  it('accepte un mot de passe conforme', () => {
    expect(isPasswordValid('Moracare2026')).toBe(true);
    expect(describePasswordError('Moracare2026')).toBeNull();
  });

  it.each([
    ['Abc123', 'trop court'],
    ['moracare2026', 'sans majuscule'],
    ['MORACARE2026', 'sans minuscule'],
    ['MoracareSante', 'sans chiffre'],
  ])('refuse « %s » (%s)', (password) => {
    expect(isPasswordValid(password)).toBe(false);
    expect(describePasswordError(password)).not.toBeNull();
  });

  it('détaille chaque règle non satisfaite', () => {
    const rules = evaluatePassword('abc');
    expect(rules.find((r) => r.id === 'length')?.satisfied).toBe(false);
    expect(rules.find((r) => r.id === 'uppercase')?.satisfied).toBe(false);
    expect(rules.find((r) => r.id === 'lowercase')?.satisfied).toBe(true);
    expect(rules.find((r) => r.id === 'digit')?.satisfied).toBe(false);
  });

  it('applique la même exigence quel que soit le compte', () => {
    // Aucune dérogation n'existe : la validation ne reçoit que le mot de passe
    // et la politique, jamais un rôle. Un compte privilégié n'a pas de raison
    // d'être moins bien protégé — ce test fige cette décision.
    const candidates = ['Moracare2026', 'Superadmin1', 'Infirmier9X'];
    for (const password of candidates) {
      expect(isPasswordValid(password)).toBe(true);
    }
    expect(isPasswordValid('admin')).toBe(false);
  });
});

describe('Génération de secrets', () => {
  it('produit des mots de passe toujours conformes à la politique', () => {
    for (let i = 0; i < 200; i += 1) {
      expect(isPasswordValid(generatePassword())).toBe(true);
    }
  });

  it('respecte une politique renforcée', () => {
    const strict = {
      minLength: 16,
      requireUppercase: true,
      requireLowercase: true,
      requireDigit: true,
      requireSpecial: true,
    };

    for (let i = 0; i < 100; i += 1) {
      const password = generatePassword(strict);
      expect(password.length).toBeGreaterThanOrEqual(16);
      expect(isPasswordValid(password, strict)).toBe(true);
    }
  });

  it('ne répète pas le même mot de passe', () => {
    const produced = new Set(Array.from({ length: 500 }, () => generatePassword()));
    expect(produced.size).toBe(500);
  });

  it('écarte les caractères ambigus, qui se recopient mal', () => {
    const sample = Array.from({ length: 200 }, () => generatePassword()).join('');
    for (const ambiguous of ['I', 'l', 'O', '0', '1']) {
      expect(sample).not.toContain(ambiguous);
    }
  });

  it('produit des codes de six chiffres, zéro initial conservé', () => {
    for (let i = 0; i < 300; i += 1) {
      expect(generateVerificationCode()).toMatch(/^\d{6}$/);
    }
  });
});

describe('Calcul tarifaire', () => {
  /** Règle de l'éditeur : tarif normal à un mois, −1 000 KMF/mois dès deux. */
  const rule = (basePrice: number) => ({
    basePrice,
    discountPerMonth: 1000,
    minMonths: 2,
    maxMonths: 12,
    currency: 'KMF',
  });

  it('applique le tarif normal pour un seul mois', () => {
    const result = computePrice(rule(5000), 1);
    expect(result.monthlyPrice).toBe(5000);
    expect(result.totalPrice).toBe(5000);
    expect(result.totalSavings).toBe(0);
    expect(result.discountApplied).toBe(false);
  });

  it.each([
    [2, 8000],
    [3, 12000],
    [6, 24000],
    [12, 48000],
  ])('STANDARD sur %i mois coûte %i KMF', (months, total) => {
    const result = computePrice(rule(5000), months);
    expect(result.monthlyPrice).toBe(4000);
    expect(result.totalPrice).toBe(total);
    expect(result.totalSavings).toBe(1000 * months);
  });

  it.each([
    [1, 10000, 10000],
    [2, 9000, 18000],
    [3, 9000, 27000],
    [12, 9000, 108000],
  ])('BUSINESS sur %i mois : %i / mois, %i au total', (months, monthly, total) => {
    const result = computePrice(rule(10000), months);
    expect(result.monthlyPrice).toBe(monthly);
    expect(result.totalPrice).toBe(total);
  });

  it.each([
    [1, 15000, 15000],
    [2, 14000, 28000],
    [3, 14000, 42000],
    [12, 14000, 168000],
  ])('VIP sur %i mois : %i / mois, %i au total', (months, monthly, total) => {
    const result = computePrice(rule(15000), months);
    expect(result.monthlyPrice).toBe(monthly);
    expect(result.totalPrice).toBe(total);
  });

  it('le tarif remisé ne dépend pas de la durée au-delà du seuil', () => {
    const prices = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(
      (months) => computePrice(rule(5000), months).monthlyPrice,
    );
    expect(new Set(prices).size).toBe(1);
  });

  it('borne les durées hors plage plutôt que de produire un montant absurde', () => {
    expect(computePrice(rule(5000), 0).months).toBe(1);
    expect(computePrice(rule(5000), -3).months).toBe(1);
    expect(computePrice(rule(5000), 99).months).toBe(12);
  });

  it('une formule gratuite reste gratuite quelle que soit la durée', () => {
    const free = { ...rule(0), discountPerMonth: 0 };
    for (const months of [1, 2, 12]) {
      const result = computePrice(free, months);
      expect(result.totalPrice).toBe(0);
      expect(result.totalSavings).toBe(0);
    }
  });

  it('le total est toujours le tarif appliqué multiplié par la durée', () => {
    for (const base of [5000, 10000, 15000]) {
      for (let months = 1; months <= 12; months += 1) {
        const result = computePrice(rule(base), months);
        expect(result.totalPrice).toBe(result.monthlyPrice * months);
      }
    }
  });
});

describe('Sécurité en base', () => {
  let db: TestDatabase;

  beforeAll(async () => {
    db = await createTestDatabase();
  });

  afterAll(async () => {
    await db?.close();
  });

  describe('Paramètres de sécurité', () => {
    it('une politique de plateforme existe dès la migration', async () => {
      const rows = await db.query<{
        password_min_length: number;
        max_login_attempts: number;
        lockout_minutes: number;
      }>('SELECT * FROM public.security_settings WHERE establishment_id IS NULL');

      expect(rows.rows).toHaveLength(1);
      expect(rows.rows[0].password_min_length).toBe(8);
      expect(rows.rows[0].max_login_attempts).toBe(3);
      expect(rows.rows[0].lockout_minutes).toBe(15);
    });

    it('refuse une seconde politique de plateforme', async () => {
      await expect(
        db.query('INSERT INTO public.security_settings (establishment_id) VALUES (NULL)'),
      ).rejects.toThrow();
    });

    it('refuse une longueur minimale inférieure à huit', async () => {
      await expect(
        db.query(
          'UPDATE public.security_settings SET password_min_length = 6 WHERE establishment_id IS NULL',
        ),
      ).rejects.toThrow();
    });

    it('refuse un canal de second facteur inconnu', async () => {
      await expect(
        db.query(
          "UPDATE public.security_settings SET two_factor_method = 'pigeon' WHERE establishment_id IS NULL",
        ),
      ).rejects.toThrow();
    });
  });

  describe('Cycle de vie des comptes', () => {
    it('les colonnes de verrouillage et de changement existent', async () => {
      const rows = await db.query<{ column_name: string }>(
        `SELECT column_name FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'profiles'
            AND column_name IN ('must_change_password','failed_login_attempts','locked_until',
                                'activation_required','email_verified_at','last_login_at')`,
      );
      expect(rows.rows).toHaveLength(6);
    });

    it('un compte est créé sans échec ni verrou', async () => {
      const rows = await db.query<{ failed_login_attempts: number; locked_until: string | null }>(
        `SELECT failed_login_attempts, locked_until FROM public.profiles LIMIT 1`,
      );
      if (rows.rows.length > 0) {
        expect(rows.rows[0].failed_login_attempts).toBe(0);
        expect(rows.rows[0].locked_until).toBeNull();
      }
    });
  });

  describe('Codes de vérification', () => {
    it('refuse un motif inconnu', async () => {
      const est = await createEstablishment(db, 'Clinique Code');
      const userId = await createUser(db, {
        email: 'code@test.km',
        role: 'doctor',
        establishmentId: est,
      });

      await expect(
        db.query(
          `INSERT INTO public.verification_codes (profile_id, purpose, code_hash, expires_at)
           VALUES ($1, 'usage_inconnu', 'x', NOW() + INTERVAL '1 hour')`,
          [userId],
        ),
      ).rejects.toThrow();
    });

    it('accepte les quatre motifs prévus', async () => {
      const est = await createEstablishment(db, 'Clinique Motifs');
      const userId = await createUser(db, {
        email: 'motifs@test.km',
        role: 'doctor',
        establishmentId: est,
      });

      for (const purpose of [
        'account_activation',
        'trial_activation',
        'password_reset',
        'two_factor',
      ]) {
        await db.query(
          `INSERT INTO public.verification_codes (profile_id, purpose, code_hash, expires_at)
           VALUES ($1, $2, 'condense', NOW() + INTERVAL '1 hour')`,
          [userId, purpose],
        );
      }

      const rows = await db.query<{ n: number }>(
        'SELECT count(*)::int AS n FROM public.verification_codes WHERE profile_id = $1',
        [userId],
      );
      expect(rows.rows[0].n).toBe(4);
    });

    it('aucune politique ne laisse lire un code depuis le navigateur', async () => {
      const rows = await db.query<{ qual: string }>(
        `SELECT qual FROM pg_policies
          WHERE schemaname = 'public' AND tablename = 'verification_codes'`,
      );
      expect(rows.rows.length).toBeGreaterThan(0);
      // La seule politique de lecture est un refus inconditionnel.
      expect(rows.rows.every((r) => r.qual.includes('false'))).toBe(true);
    });
  });

  describe('Demandes de réinitialisation', () => {
    it('reçoit une référence métier séquentielle', async () => {
      await db.query(
        `INSERT INTO public.password_reset_requests (identifier) VALUES ('utilisateur.un')`,
      );
      await db.query(
        `INSERT INTO public.password_reset_requests (identifier) VALUES ('utilisateur.deux')`,
      );

      const rows = await db.query<{ business_reference: string }>(
        `SELECT business_reference FROM public.password_reset_requests ORDER BY created_at`,
      );

      expect(rows.rows[0].business_reference).toMatch(/^MORA-RST-\d{6}$/);
      expect(rows.rows[1].business_reference).not.toBe(rows.rows[0].business_reference);
    });

    it('refuse un statut hors du vocabulaire commun', async () => {
      await expect(
        db.query(
          `INSERT INTO public.password_reset_requests (identifier, status)
           VALUES ('x', 'peut_etre')`,
        ),
      ).rejects.toThrow();
    });
  });

  describe('Remise longue durée', () => {
    it('les trois offres payantes accordent 1 000 KMF de remise dès deux mois', async () => {
      const rows = await db.query<{
        code: string;
        price_amount: string;
        discount_per_month: string;
        discount_min_months: number;
        max_duration_months: number;
      }>(
        `SELECT code, price_amount, discount_per_month, discount_min_months, max_duration_months
           FROM public.subscription_plans
          WHERE code IN ('standard','business','vip') ORDER BY display_order`,
      );

      expect(rows.rows).toHaveLength(3);

      for (const row of rows.rows) {
        expect(Number(row.discount_per_month)).toBe(1000);
        expect(row.discount_min_months).toBe(2);
        expect(row.max_duration_months).toBe(12);
      }
    });

    it('les offres gratuites n’accordent aucune remise', async () => {
      const rows = await db.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM public.subscription_plans
          WHERE price_amount = 0 AND discount_per_month <> 0`,
      );
      expect(rows.rows[0].n).toBe(0);
    });

    it('la remise ne peut pas dépasser le tarif', async () => {
      await expect(
        db.query(
          `UPDATE public.subscription_plans SET discount_per_month = 99999 WHERE code = 'standard'`,
        ),
      ).rejects.toThrow();
    });

    it('les demandes conservent le tarif normal et le tarif appliqué', async () => {
      const rows = await db.query<{ column_name: string }>(
        `SELECT column_name FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'registration_requests'
            AND column_name IN ('base_monthly_price','monthly_price','total_price','savings_amount')`,
      );
      expect(rows.rows).toHaveLength(4);
    });

    it('la grille de paliers a bien disparu', async () => {
      const rows = await db.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'plan_durations'`,
      );
      expect(rows.rows[0].n).toBe(0);
    });
  });

  describe('Centre de notifications', () => {
    it('refuse une catégorie inconnue', async () => {
      await expect(
        db.query(
          `INSERT INTO public.notifications (title, message, category)
           VALUES ('Test', 'Corps', 'categorie_inventee')`,
        ),
      ).rejects.toThrow();
    });

    it('refuse une gravité inconnue', async () => {
      await expect(
        db.query(
          `INSERT INTO public.notifications (title, message, severity)
           VALUES ('Test', 'Corps', 'catastrophique')`,
        ),
      ).rejects.toThrow();
    });

    it('accepte les dix catégories prévues', async () => {
      const categories = [
        'system',
        'activation_code',
        'registration_request',
        'contact_request',
        'password_reset',
        'establishment_created',
        'admin_created',
        'subscription_expiry',
        'license_expiry',
        'critical_error',
      ];

      for (const category of categories) {
        await db.query(
          `INSERT INTO public.notifications (title, message, category) VALUES ($1, 'Corps', $2)`,
          [`Notification ${category}`, category],
        );
      }

      const rows = await db.query<{ n: number }>(
        'SELECT count(*)::int AS n FROM public.notifications',
      );
      expect(rows.rows[0].n).toBe(categories.length);
    });

    it('reçoit une référence métier et naît non lue, non archivée', async () => {
      const rows = await db.query<{
        business_reference: string;
        is_read: boolean;
        is_archived: boolean;
      }>('SELECT business_reference, is_read, is_archived FROM public.notifications LIMIT 1');

      expect(rows.rows[0].business_reference).toMatch(/^MORA-NOT-\d{6}$/);
      expect(rows.rows[0].is_read).toBe(false);
      expect(rows.rows[0].is_archived).toBe(false);
    });

    it('une notification de plateforme n’a pas de destinataire nominatif', async () => {
      // `user_id` nul signifie « destinée aux Super Admins » : la notification
      // survit au changement de la personne qui devait la traiter.
      const rows = await db.query<{ n: number }>(
        'SELECT count(*)::int AS n FROM public.notifications WHERE user_id IS NULL',
      );
      expect(rows.rows[0].n).toBeGreaterThan(0);
    });
  });

  describe('Modes de paiement', () => {
    it('les cinq modes demandés sont disponibles', async () => {
      const rows = await db.query<{ code: string }>(
        'SELECT code FROM public.payment_methods WHERE is_active ORDER BY display_order',
      );
      expect(rows.rows.map((r) => r.code)).toEqual([
        'especes',
        'cheque',
        'mvola',
        'holo',
        'wakati',
      ]);
    });
  });

  describe('Demandes d’abonnement', () => {
    it('portent l’offre, la durée, le montant et le paiement', async () => {
      const rows = await db.query<{ column_name: string }>(
        `SELECT column_name FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'registration_requests'
            AND column_name IN ('plan_code','plan_name','duration_months','monthly_price',
                                'total_price','savings_amount','payment_method',
                                'start_option','start_date')`,
      );
      expect(rows.rows).toHaveLength(9);
    });

    it('refuse une date de démarrage hors du vocabulaire', async () => {
      await expect(
        db.query(
          `INSERT INTO public.registration_requests (full_name, email, establishment_name, start_option)
           VALUES ('Test', 'test@example.km', 'Clinique', 'un_jour')`,
        ),
      ).rejects.toThrow();
    });
  });

  describe('File des messages sortants', () => {
    it('refuse un canal inconnu', async () => {
      await expect(
        db.query(
          `INSERT INTO public.message_outbox (channel, recipient, body, template)
           VALUES ('telepathie', 'x@y.km', 'corps', 'test')`,
        ),
      ).rejects.toThrow();
    });

    it('accepte les canaux prévus pour les intégrations futures', async () => {
      for (const channel of ['email', 'whatsapp', 'sms']) {
        await db.query(
          `INSERT INTO public.message_outbox (channel, recipient, body, template)
           VALUES ($1, 'x@y.km', 'corps', 'test')`,
          [channel],
        );
      }

      const rows = await db.query<{ n: number }>(
        'SELECT count(*)::int AS n FROM public.message_outbox',
      );
      expect(rows.rows[0].n).toBe(3);
    });

    it('reçoit une référence métier', async () => {
      const rows = await db.query<{ business_reference: string }>(
        'SELECT business_reference FROM public.message_outbox LIMIT 1',
      );
      expect(rows.rows[0].business_reference).toMatch(/^MORA-MSG-\d{6}$/);
    });
  });
});
