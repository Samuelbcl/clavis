# Roadmap — Clavis

## Phase 1 — MVP fondations 🎯 PRIORITÉ

L'objectif : un outil **utilisable au quotidien par l'admin seul**, sans QR ni SMS. Juste un super tableau de gestion.

- [ ] **1.1** Setup Supabase (client + server + env)
- [ ] **1.2** Schéma SQL : 5 tables + enums + RLS + trigger sync `cles`
- [ ] **1.3** Génération types TS (`src/types/database.ts`)
- [ ] **1.4** Auth Supabase (login email/password + middleware protection routes)
- [ ] **1.5** Layout principal : sidebar shadcn (Dashboard, Biens, Clés, Personnes, Historique)
- [ ] **1.6** CRUD **Biens** (liste + créer + éditer + supprimer)
- [ ] **1.7** CRUD **Personnes** (liste + créer + éditer + supprimer)
- [ ] **1.8** CRUD **Clés** (liste + créer + éditer + archiver — pas de delete)
- [ ] **1.9** Action **"Remettre une clé"** : modal avec choix personne, crée un mouvement
- [ ] **1.10** Action **"Récupérer une clé"** : crée un mouvement de retour
- [ ] **1.11** Écran central **"Toutes les clés"** :
  - Colonnes : code, bien, statut, personne actuelle, téléphone, dernier mouvement
  - Recherche fulltext (code, nom, adresse, téléphone)
  - Filtres : statut, type de personne, bien
  - Tri par colonne
- [ ] **1.12** Fiche détaillée d'une clé avec historique complet de ses mouvements
- [ ] **1.13** Page Historique global (audit log de tous les mouvements)
- [ ] **1.14** Déploiement Vercel + variables d'env prod

**🚀 Livrable Phase 1 : le client peut commencer à l'utiliser et migrer ses données.**

---

## Phase 2 — QR codes & workflow scan 📱

L'objectif : transformer l'usage quotidien grâce au scan.

- [ ] **2.1** Génération QR code pour chaque clé (avec lib `qrcode`)
- [ ] **2.2** Page "Imprimer les QR" : grille A4 imprimable, plusieurs QR par feuille
- [ ] **2.3** Page `/scan` : ouvre la caméra (html5-qrcode)
- [ ] **2.4** Après scan, redirige vers la fiche de la clé avec actions rapides
- [ ] **2.5** Workflow "Remettre" depuis le scan (mobile-first)
- [ ] **2.6** Workflow "Récupérer" depuis le scan
- [ ] **2.7** Gestion des erreurs : QR inconnu, clé archivée, etc.

---

## Phase 3 — Confirmation receveur 📲

L'objectif : preuve juridique + traçabilité.

- [ ] **3.1** Setup Twilio ou Vonage (SMS)
- [ ] **3.2** Génération de lien magique signé (JWT court, expire en 24h)
- [ ] **3.3** Envoi SMS au receveur au moment de la remise
- [ ] **3.4** Page publique `/confirmer/[token]` : affiche les détails de la remise
- [ ] **3.5** Composant signature digitale (canvas tactile)
- [ ] **3.6** Upload signature vers Supabase Storage
- [ ] **3.7** Marquer le mouvement comme `confirmee_par_receveur = true`
- [ ] **3.8** Upload photo optionnelle au moment de la remise (par l'opérateur)
- [ ] **3.9** Badge "non confirmé" pendant 24h après remise dans l'UI

---

## Phase 4 — Polish & PWA ✨

L'objectif : rendre l'outil agréable à utiliser sur la durée.

- [ ] **4.1** Dashboard avec stats : nb clés en circulation, top receveurs, durée moyenne de détention
- [ ] **4.2** Alertes : clés non rendues depuis > X jours (paramétrable)
- [ ] **4.3** Export CSV de l'historique (filtré)
- [ ] **4.4** Mode sombre (Tailwind theme)
- [ ] **4.5** PWA manifest + service worker (installable)
- [ ] **4.6** Notifications push pour alertes
- [ ] **4.7** Gestion des utilisateurs internes (page admin)
- [ ] **4.8** Audit log : qui a fait quoi quand (au-delà des mouvements)

---

## Idées futures (out of scope MVP)

- Multi-tenant (transformer en SaaS pour vendre à d'autres promoteurs)
- App mobile native (React Native / Expo)
- Intégration agenda (rappels avant échéances de bail)
- OCR pour scanner d'anciens trousseaux avec étiquettes papier
- Statistiques avancées (heatmap des clés les plus mobiles)
