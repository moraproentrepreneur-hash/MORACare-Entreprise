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

  describe('Tarification par durée', () => {
    it('la grille officielle est chargée pour les trois offres payantes', async () => {
      const rows = await db.query<{
        code: string;
        months: number;
        monthly_price: string;
        total_price: string;
      }>(
        `SELECT p.code, d.months, d.monthly_price, d.total_price
           FROM public.plan_durations d
           JOIN public.subscription_plans p ON p.id = d.plan_id
          ORDER BY p.display_order, d.months`,
      );

      expect(rows.rows).toHaveLength(9);

      const grid = Object.fromEntries(
        rows.rows.map((r) => [
          `${r.code}-${r.months}`,
          { monthly: Number(r.monthly_price), total: Number(r.total_price) },
        ]),
      );

      // Grille fixée par l'éditeur, reproduite à l'identique.
      expect(grid['standard-1']).toEqual({ monthly: 5000, total: 5000 });
      expect(grid['standard-2']).toEqual({ monthly: 4000, total: 8000 });
      expect(grid['standard-3']).toEqual({ monthly: 3000, total: 9000 });
      expect(grid['business-1']).toEqual({ monthly: 10000, total: 10000 });
      expect(grid['business-2']).toEqual({ monthly: 9000, total: 18000 });
      expect(grid['business-3']).toEqual({ monthly: 8000, total: 24000 });
      expect(grid['vip-1']).toEqual({ monthly: 15000, total: 15000 });
      expect(grid['vip-2']).toEqual({ monthly: 14000, total: 28000 });
      expect(grid['vip-3']).toEqual({ monthly: 13000, total: 39000 });
    });

    it('chaque total correspond au prix mensuel multiplié par la durée', async () => {
      const rows = await db.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM public.plan_durations
          WHERE total_price <> monthly_price * months`,
      );
      expect(rows.rows[0].n).toBe(0);
    });

    it('le tarif mensuel décroît quand la durée augmente', async () => {
      const rows = await db.query<{ code: string; months: number; monthly_price: string }>(
        `SELECT p.code, d.months, d.monthly_price
           FROM public.plan_durations d
           JOIN public.subscription_plans p ON p.id = d.plan_id
          ORDER BY p.code, d.months`,
      );

      const byPlan = new Map<string, number[]>();
      for (const row of rows.rows) {
        const list = byPlan.get(row.code) ?? [];
        list.push(Number(row.monthly_price));
        byPlan.set(row.code, list);
      }

      for (const prices of byPlan.values()) {
        for (let i = 1; i < prices.length; i += 1) {
          expect(prices[i]).toBeLessThan(prices[i - 1]);
        }
      }
    });

    it('les offres gratuites ne portent aucune grille', async () => {
      const rows = await db.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM public.plan_durations d
           JOIN public.subscription_plans p ON p.id = d.plan_id
          WHERE p.price_amount = 0`,
      );
      expect(rows.rows[0].n).toBe(0);
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
