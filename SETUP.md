# Setup — Clavis

## Pré-requis

- Node.js 20+
- npm (ou pnpm)
- Un compte GitHub (CLI `gh` recommandée)
- Un compte Supabase (gratuit) : https://supabase.com

## 1. Initialiser le projet Next.js

Dans le dossier `clavis` (déjà créé, contenant ce fichier) :

```bash
npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*" --eslint --turbopack
```

⚠️ Quand il te demande "directory not empty, proceed?" → **réponds Yes**, il préservera les `.md` existants.

## 2. Initialiser shadcn/ui

```bash
npx shadcn@latest init
```

Réponses :
- **Style** : New York
- **Base color** : Slate
- **CSS variables** : Yes

## 3. Créer la structure de dossiers métier

```bash
mkdir -p src/lib/supabase src/types src/hooks src/components/clavis supabase/migrations
```

## 4. Installer les dépendances clés

```bash
npm install @supabase/supabase-js @supabase/ssr zod
npm install html5-qrcode qrcode
npm install -D @types/qrcode
```

## 5. Premier commit

```bash
git add .
git commit -m "chore: initial setup with Next.js + Tailwind + shadcn/ui"
```

## 6. Créer le repo GitHub

**Avec la CLI GitHub :**

```bash
gh repo create clavis --private --source=. --remote=origin --push
```

**Sans la CLI :** créer le repo `clavis` (privé) sur github.com/new puis :

```bash
git remote add origin https://github.com/TON_PSEUDO/clavis.git
git branch -M main
git push -u origin main
```

## 7. Créer le projet Supabase

1. Aller sur https://supabase.com → New project
2. Nom : `clavis`
3. Région : **Frankfurt** (le plus proche de la Belgique)
4. Mot de passe DB : noter dans un gestionnaire de mots de passe
5. Une fois créé, aller dans **Settings → API** et noter :
   - `Project URL`
   - `anon public key`
   - `service_role key` (à NE JAMAIS commiter)

## 8. Lancer le serveur de dev

```bash
npm run dev
```

→ http://localhost:3000

## 9. Démarrer la session Claude Code

Ouvrir Claude Code dans VS Code et envoyer :

> "Réfère-toi à BRIEF.md à la racine du projet. On commence l'étape 1.1 du Phase 1."

Claude Code prendra le relais et te demandera tes credentials Supabase.

---

## Ordre conseillé

1. ✅ Étapes 1 à 8 ci-dessus (~15 minutes)
2. ✅ Lancer la session Claude Code avec le BRIEF
3. ✅ Avancer étape par étape, sans laisser Claude Code chaîner plusieurs étapes
