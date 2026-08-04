/**
 * Politique des mots de passe — règle unique de la plateforme.
 *
 * Elle vaut pour tout le monde, du Super Admin au personnel : un compte
 * privilégié n'a aucune raison d'être moins bien protégé qu'un autre.
 *
 * Ce module est isolé de tout accès réseau et de React afin d'être utilisé
 * indifféremment par le navigateur (retour immédiat pendant la saisie) et par
 * le serveur (contrôle qui fait foi). Le serveur ne fait jamais confiance au
 * navigateur : il revalide systématiquement.
 */

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireDigit: boolean;
  requireSpecial: boolean;
}

/**
 * Politique par défaut, appliquée tant que la base n'a rien dit d'autre.
 *
 * Identique au contenu de `security_settings` fourni par la migration : la
 * valeur de repli ne doit jamais être plus permissive que la configuration.
 */
export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireDigit: true,
  requireSpecial: false,
};

export interface PasswordRule {
  /** Identifiant stable, pour les tests et les listes React. */
  id: string;
  label: string;
  satisfied: boolean;
}

/**
 * Détaille règle par règle ce qui manque.
 *
 * Un simple booléen obligerait l'utilisateur à deviner : la liste permet à
 * l'interface d'afficher précisément ce qui reste à corriger.
 */
export const evaluatePassword = (
  password: string,
  policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY,
): PasswordRule[] => {
  const rules: PasswordRule[] = [
    {
      id: 'length',
      label: `${policy.minLength} caractères minimum`,
      satisfied: password.length >= policy.minLength,
    },
  ];

  if (policy.requireUppercase) {
    rules.push({
      id: 'uppercase',
      label: 'Une lettre majuscule',
      satisfied: /[A-ZÀ-ÖØ-Þ]/.test(password),
    });
  }

  if (policy.requireLowercase) {
    rules.push({
      id: 'lowercase',
      label: 'Une lettre minuscule',
      satisfied: /[a-zà-öø-ÿ]/.test(password),
    });
  }

  if (policy.requireDigit) {
    rules.push({ id: 'digit', label: 'Un chiffre', satisfied: /\d/.test(password) });
  }

  if (policy.requireSpecial) {
    rules.push({
      id: 'special',
      label: 'Un caractère spécial',
      satisfied: /[^\p{L}\p{N}]/u.test(password),
    });
  }

  return rules;
};

export const isPasswordValid = (
  password: string,
  policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY,
): boolean => evaluatePassword(password, policy).every((rule) => rule.satisfied);

/**
 * Message d'erreur unique, énumérant ce qui manque.
 *
 * Renvoie `null` quand le mot de passe convient, pour s'écrire
 * `const error = describePasswordError(...)`.
 */
export const describePasswordError = (
  password: string,
  policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY,
): string | null => {
  const missing = evaluatePassword(password, policy).filter((rule) => !rule.satisfied);
  if (missing.length === 0) return null;

  return `Le mot de passe doit respecter : ${missing
    .map((rule) => rule.label.toLowerCase())
    .join(', ')}.`;
};

/** Résumé lisible de la politique, affiché sous les champs de saisie. */
export const describePolicy = (policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY): string => {
  const parts = [`${policy.minLength} caractères minimum`];
  if (policy.requireUppercase) parts.push('une majuscule');
  if (policy.requireLowercase) parts.push('une minuscule');
  if (policy.requireDigit) parts.push('un chiffre');
  if (policy.requireSpecial) parts.push('un caractère spécial');
  return parts.join(', ') + '.';
};

// ---------------------------------------------------------------------------
// Génération
// ---------------------------------------------------------------------------

/**
 * Alphabets sans caractères ambigus.
 *
 * `I`, `l`, `1`, `O` et `0` sont écartés : un mot de passe temporaire est lu à
 * voix haute ou recopié à la main, et une confusion coûte un appel au support.
 */
const UPPERCASE = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijkmnopqrstuvwxyz';
const DIGITS = '23456789';
const SPECIAL = '!@#$%&*+-=?';

/**
 * Tirage uniforme dans un alphabet, à partir du générateur cryptographique.
 *
 * `Math.random()` est prohibé ici : il est prédictible, et c'est un mot de
 * passe qui est produit. Le rejet des valeurs hors du plus grand multiple de
 * la taille de l'alphabet évite le biais du modulo.
 */
const pick = (alphabet: string, random: Crypto): string => {
  const limit = Math.floor(256 / alphabet.length) * alphabet.length;
  const buffer = new Uint8Array(1);

  for (;;) {
    random.getRandomValues(buffer);
    if (buffer[0] < limit) return alphabet[buffer[0] % alphabet.length];
  }
};

const shuffle = (characters: string[], random: Crypto): string[] => {
  const buffer = new Uint32Array(1);
  for (let i = characters.length - 1; i > 0; i -= 1) {
    random.getRandomValues(buffer);
    const j = buffer[0] % (i + 1);
    [characters[i], characters[j]] = [characters[j], characters[i]];
  }
  return characters;
};

/**
 * Produit un mot de passe temporaire conforme à la politique.
 *
 * Chaque contrainte est d'abord satisfaite par un caractère dédié, le reste est
 * complété au hasard, puis l'ensemble est mélangé : sans ce mélange, la place
 * de la majuscule et du chiffre serait toujours la même.
 *
 * Fonctionne dans le navigateur comme sur le serveur : `crypto` est global dans
 * les deux depuis Node 18.
 */
export const generatePassword = (
  policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY,
  length = 12,
): string => {
  const random = globalThis.crypto;
  if (!random?.getRandomValues) {
    throw new Error("Générateur cryptographique indisponible : mot de passe non généré.");
  }

  const required: string[] = [];
  let alphabet = '';

  if (policy.requireUppercase) {
    required.push(pick(UPPERCASE, random));
    alphabet += UPPERCASE;
  }
  if (policy.requireLowercase) {
    required.push(pick(LOWERCASE, random));
    alphabet += LOWERCASE;
  }
  if (policy.requireDigit) {
    required.push(pick(DIGITS, random));
    alphabet += DIGITS;
  }
  if (policy.requireSpecial) {
    required.push(pick(SPECIAL, random));
    alphabet += SPECIAL;
  }

  // Une politique qui n'exigerait rien laisserait l'alphabet vide.
  if (alphabet === '') alphabet = UPPERCASE + LOWERCASE + DIGITS;

  const target = Math.max(length, policy.minLength, required.length);
  const characters = [...required];
  while (characters.length < target) {
    characters.push(pick(alphabet, random));
  }

  return shuffle(characters, random).join('');
};

/**
 * Code de vérification à six chiffres.
 *
 * Même exigence d'imprévisibilité que pour un mot de passe : il ouvre l'accès à
 * un compte. Le zéro initial est conservé — le code est une chaîne, pas un
 * nombre.
 */
export const generateVerificationCode = (): string => {
  const random = globalThis.crypto;
  if (!random?.getRandomValues) {
    throw new Error('Générateur cryptographique indisponible : code non généré.');
  }

  return Array.from({ length: 6 }, () => pick('0123456789', random)).join('');
};
