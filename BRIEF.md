# CLAVIS — Application de gestion de clés pour promoteur immobilier

> **Master prompt du projet — à référencer dans Claude Code à chaque nouvelle session avec : "réfère-toi à BRIEF.md".**

## Contexte client

Je développe **Clavis**, une application web (PWA) one-shot pour un promoteur immobilier belge qui gère plusieurs dizaines de biens (maisons, appartements). Son problème quotidien : il perd un temps fou à savoir qui détient quelle clé de quel bien à un moment donné, entre locataires, ouvriers, artisans, agents, etc. Clavis doit devenir son réflexe quotidien pour tracer, attribuer et retrouver chaque clé.

## Stack technique

- **Next.js 15** (App Router, TypeScript, src-dir, alias `@/*`)
- **Tailwind CSS** + **shadcn/ui** (style New York, base Slate, CSS variables)
- **Supabase** : Postgres + Auth + Storage (signatures/photos)
- **html5-qrcode** pour scanner les QR codes
- **qrcode** (npm) pour générer les QR à imprimer sur porte-clés
- **Twilio ou Vonage** pour SMS (phase 3)
- Déploiement **Vercel**

Structure de dossiers cible :

```
src/
├── app/                  (Next App Router)
├── components/
│   ├── ui/               (shadcn)
│   └── clavis/           (composants métier)
├── lib/supabase/         (clients server + client)
├── types/                (types TS, schemas Supabase)
└── hooks/                (React hooks custom)
```

## Modèle utilisateurs

**3 niveaux, seuls les 2 premiers ont un compte :**

1. **Admin** (le promoteur) : full CRUD, gère les comptes, voit tout l'historique.
2. **Opérateurs** (assistante, chef de chantier) : créent des mouvements, scannent, consultent. Pas de suppression de biens/clés/personnes.
3. **Receveurs** (locataires, ouvriers, artisans) : **AUCUN compte**. Reçoivent un SMS avec lien magique pour confirmer la réception (signature digitale). L'opérateur scanne et enregistre — le statut se met à jour automatiquement.

## Modèle de données

Voir `docs/DATA_MODEL.md` pour les 5 tables détaillées : `biens`, `cles`, `personnes`, `mouvements`, `users`.

Toutes les tables doivent avoir **RLS activé** avec policies adaptées aux rôles.

## Phases de développement

Voir `docs/ROADMAP.md` pour le détail des 4 phases.

- **Phase 1** : MVP fondations (auth, CRUD biens/personnes/clés, tableau central avec recherche).
- **Phase 2** : QR codes, scan, workflow remise/retour.
- **Phase 3** : SMS confirmation, signature digitale, photos.
- **Phase 4** : Dashboard stats, export, PWA, notifications.

## Règles de code

- **TypeScript strict** partout, jamais de `any`
- **Server Components par défaut**, Client Components uniquement quand nécessaire (formulaires, scan QR, interactivité)
- **Server Actions** pour les mutations plutôt que des API routes (sauf cas spécifiques)
- **Zod** pour valider toutes les entrées (formulaires + Server Actions)
- **shadcn/ui** pour TOUS les composants UI — pas de réinvention de boutons/inputs
- Composants métier dans `src/components/clavis/`, jamais directement dans `app/`
- Nommage : français pour les concepts métier (`biens`, `cles`, `personnes`, `mouvements`), anglais pour le technique
- Fichiers courts et focalisés, max ~200 lignes
- Commits conventionnels (`feat:`, `fix:`, `chore:`, `refactor:`)

## Mode de travail attendu de Claude Code

Tu travailles **étape par étape**, jamais en chaînant plusieurs étapes d'un coup.

À chaque étape :
1. Explique ce que tu vas faire (3 lignes max)
2. Pose les questions nécessaires plutôt que de présumer
3. Exécute uniquement l'étape en cours
4. **Stoppe et attends ma validation** avant de passer à la suivante

## Étape 1 — Phase 1.1 : Setup Supabase

Au lancement de la prochaine session avec ce brief :

1. Demande-moi mes credentials Supabase (URL + anon key + service role key)
2. Crée les fichiers de config (`src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`)
3. Crée le `.env.local`
4. Mets à jour `.gitignore`
5. Confirme-moi en 3 lignes ce que tu as fait et propose l'étape 1.2

Étapes suivantes (à valider une par une) :
- **1.2** : Générer le SQL des 5 tables + enums + RLS dans `supabase/migrations/0001_initial_schema.sql`
- **1.3** : Générer les types TypeScript dans `src/types/database.ts`
- **1.4** : Mise en place auth Supabase (login + middleware)
- **1.5** : Layout principal avec sidebar de navigation shadcn
- **1.6** : CRUD biens (liste + créer + éditer + supprimer)
- ... (cf ROADMAP.md)
