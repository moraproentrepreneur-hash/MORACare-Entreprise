/**
 * Gabarits des messages envoyés par MORACare.
 *
 * Rassemblés ici pour que le ton et les mentions légales restent cohérents, et
 * pour qu'une correction de formulation n'oblige pas à fouiller les Route
 * Handlers. Texte brut volontairement : il s'affiche correctement partout, et
 * le même contenu servira le jour où WhatsApp sera branché.
 */

const SIGNATURE = [
  '',
  '— MORACare Enterprise',
  'Édité par MORA Shawiri',
  'contact@morashawiri.com · +269 430 63 06',
].join('\n');

export interface RenderedMessage {
  subject: string;
  body: string;
  template: string;
}

export const activationCodeMessage = (params: {
  firstName: string;
  establishmentName: string;
  code: string;
  validMinutes: number;
}): RenderedMessage => ({
  template: 'account_activation_code',
  subject: `Code d'activation MORACare : ${params.code}`,
  body: [
    `Bonjour ${params.firstName},`,
    '',
    `Votre compte MORACare pour « ${params.establishmentName} » est prêt.`,
    "Saisissez ce code pour l'activer :",
    '',
    `    ${params.code}`,
    '',
    `Ce code est valable ${params.validMinutes} minutes et ne peut servir qu'une fois.`,
    "Sans lui, le compte reste inactif et l'accès au tableau de bord est refusé.",
    '',
    "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message et",
    'prévenez MORA Shawiri.',
    SIGNATURE,
  ].join('\n'),
});

export const temporaryPasswordMessage = (params: {
  firstName: string;
  username: string;
  password: string;
  establishmentName: string;
}): RenderedMessage => ({
  template: 'temporary_password',
  subject: 'Vos identifiants MORACare',
  body: [
    `Bonjour ${params.firstName},`,
    '',
    `Un accès MORACare vient d'être créé pour « ${params.establishmentName} ».`,
    '',
    `Identifiant       : ${params.username}`,
    `Mot de passe      : ${params.password}`,
    '',
    'Ce mot de passe est temporaire : il vous sera demandé de le remplacer dès',
    'votre première connexion. Ne le communiquez à personne.',
    SIGNATURE,
  ].join('\n'),
});

export const passwordResetAcknowledgement = (params: {
  identifier: string;
  reference: string;
}): RenderedMessage => ({
  template: 'password_reset_ack',
  subject: 'Votre demande de réinitialisation MORACare',
  body: [
    'Bonjour,',
    '',
    `Une demande de réinitialisation de mot de passe a été enregistrée pour`,
    `l'identifiant « ${params.identifier} ».`,
    '',
    `Référence : ${params.reference}`,
    '',
    'Elle sera traitée par un administrateur, qui vous communiquera un nouveau',
    'mot de passe temporaire.',
    '',
    "Si vous n'êtes pas à l'origine de cette demande, aucune action n'est requise :",
    "votre mot de passe actuel reste valable tant qu'un administrateur ne l'a pas",
    'changé.',
    SIGNATURE,
  ].join('\n'),
});

export const passwordResetIssuedMessage = (params: {
  firstName: string;
  username: string;
  password: string;
}): RenderedMessage => ({
  template: 'password_reset_issued',
  subject: 'Votre nouveau mot de passe MORACare',
  body: [
    `Bonjour ${params.firstName},`,
    '',
    'Votre mot de passe a été réinitialisé par un administrateur.',
    '',
    `Identifiant       : ${params.username}`,
    `Mot de passe      : ${params.password}`,
    '',
    'Ce mot de passe est temporaire : il vous sera demandé de le remplacer dès',
    'votre prochaine connexion.',
    SIGNATURE,
  ].join('\n'),
});
