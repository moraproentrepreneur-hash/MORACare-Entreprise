# Déploiement Vercel — configuration requise

Ce document répond au message **« Connexion à la base de données non configurée »** constaté sur l'environnement déployé.

---

## 1. Pourquoi ce message apparaît

Le message est **exact** : la base n'était effectivement pas atteignable depuis Vercel.

La cause n'est pas dans le code. Elle tient à ceci : les identifiants Supabase vivent dans `.env.local`, et ce fichier est **volontairement exclu du dépôt** par `.gitignore`. C'est une règle de sécurité non négociable — une clé `service_role` versionnée sur un dépôt public donnerait à quiconque un accès total aux données de santé.

Conséquence : Vercel a reçu le code, mais aucune variable d'environnement. L'application a donc détecté l'absence de configuration et l'a signalé, plutôt que d'échouer silencieusement.

Un diagnostic exécuté contre le projet Supabase réel confirme que **tout fonctionne côté base** : les cinq formules sont lisibles par un visiteur non authentifié, le dépôt d'une demande de démonstration aboutit, et les politiques RLS sont correctes.

---

## 2. Variables à renseigner dans Vercel

Dans **Project Settings › Environment Variables**, ajoutez les trois variables suivantes.
Cochez les trois environnements : *Production*, *Preview* et *Development*.

| Nom | Où la trouver | Sensibilité |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase › Project Settings › API › Project URL | Publique |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase › Project Settings › API Keys › clé **publiable** | Publique — protégée par RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase › Project Settings › API Keys › clé **secrète** | **Critique** |

Les valeurs exactes de ce projet figurent dans votre fichier `.env.local` local.

### Avertissement sur la clé secrète

`SUPABASE_SERVICE_ROLE_KEY` **contourne toutes les politiques RLS**. Elle n'est utilisée que par trois routes serveur — création de compte, modification de compte, dépôt d'une demande de démonstration — et n'atteint jamais le navigateur : le fichier `src/lib/supabase/admin.ts` importe `server-only`, ce qui transforme toute inclusion accidentelle côté client en erreur de compilation.

Ne la préfixez **jamais** de `NEXT_PUBLIC_`.

---

## 3. Point crucial : un redéploiement est obligatoire

Les variables `NEXT_PUBLIC_*` sont **inlinées dans le bundle JavaScript au moment du build**, pas lues à l'exécution.

Ajouter les variables ne suffit donc pas : le déploiement en cours a été compilé sans elles et continuera d'afficher le message. Après les avoir enregistrées, lancez un **redéploiement complet** :

> Deployments › dernier déploiement › menu ⋯ › **Redeploy**
> puis décochez « Use existing Build Cache ».

---

## 4. Vérifier que la connexion fonctionne

Trois contrôles, dans l'ordre :

1. **Page d'accueil** — la section « Nos formules » affiche cinq cartes avec les tarifs (0, 0, 5 000, 10 000 et 15 000 KMF). Si les cartes s'affichent mais que la base est injoignable, les valeurs proviennent du repli documenté : c'est normal et voulu, la page commerciale ne doit jamais rester vide.

2. **Écran de connexion** — le bandeau orange « Connexion à la base de données non configurée » doit avoir disparu. S'il persiste, les variables ne sont pas prises en compte : vérifiez leur portée (Production) et refaites un redéploiement sans cache.

3. **Formulaire de démonstration** — soumettez une demande. Le message « Votre demande est enregistrée » doit s'afficher, et la ligne apparaître en base :

   ```sql
   SELECT business_reference, full_name, status, created_at
   FROM public.registration_requests
   ORDER BY created_at DESC;
   ```

---

## 5. Ce qu'il ne faut pas faire

- **Ne versionnez jamais `.env.local`.** Il est ignoré par git, et doit le rester.
- **Ne collez pas la clé secrète dans une variable `NEXT_PUBLIC_*`** : elle serait livrée à chaque visiteur.
- **Ne déployez pas sans avoir appliqué les migrations** : l'application interrogerait des tables inexistantes. Les migrations sont déjà appliquées sur le projet `oolaiauhhrfgncjpxucx`.

---

## 6. Vérification en local

Avant tout déploiement, la commande suivante rejoue l'ensemble des contrôles :

```bash
npm run verify              # migrations, types, TypeScript, ESLint, tests
npm run db:verify           # schéma réel : RLS, politiques, référentiel
npm run db:diagnose-public  # accès visiteur : formules et formulaire
```

Chacune doit se terminer sans erreur.
