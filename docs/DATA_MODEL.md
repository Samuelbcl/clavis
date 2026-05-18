# Modèle de données — Clavis

## Vue d'ensemble

5 tables principales :

```
biens ─── 1:N ─── cles ─── N:1 ─── personnes
                    │
                    └── 1:N ─── mouvements ─── N:1 ─── personnes
                                    │
                                    └── N:1 ─── users
```

---

## Table : `biens`

Représente un bien immobilier (maison, appart, etc.).

| Champ              | Type        | Notes                                                       |
|--------------------|-------------|-------------------------------------------------------------|
| `id`               | uuid (PK)   | `gen_random_uuid()`                                         |
| `nom`              | text        | Ex: "Appart Rue de la Paix 12 - étage 2"                    |
| `adresse_complete` | text        |                                                             |
| `code_postal`      | text        |                                                             |
| `ville`            | text        |                                                             |
| `type`             | enum        | maison, appartement, studio, commerce, garage, autre        |
| `notes`            | text        | Nullable                                                    |
| `created_at`       | timestamptz |                                                             |
| `updated_at`       | timestamptz |                                                             |

---

## Table : `cles`

Chaque clé physique, attachée à un bien. Un bien peut avoir N clés (porte d'entrée, garage, etc.).

| Champ                  | Type        | Notes                                                          |
|------------------------|-------------|----------------------------------------------------------------|
| `id`                   | uuid (PK)   |                                                                |
| `bien_id`              | uuid (FK)   | → biens.id, ON DELETE CASCADE                                  |
| `code`                 | text UNIQUE | Ex: "CLV-0042", imprimé sur le QR code                         |
| `type`                 | enum        | porte_entree, garage, cave, boite_aux_lettres, badge, autre    |
| `description`          | text        | Nullable. Ex: "Clé Vachette dorée"                             |
| `statut`               | enum        | disponible, remise, perdue, refaite, archivee                  |
| `personne_actuelle_id` | uuid (FK)   | Nullable → personnes.id (dénormalisé pour perf)                |
| `created_at`           | timestamptz |                                                                |
| `updated_at`           | timestamptz |                                                                |

**Index** : sur `code`, `bien_id`, `statut`, `personne_actuelle_id`.

---

## Table : `personnes`

Toute personne susceptible de recevoir une clé. **N'a pas de compte sur l'app.**

| Champ         | Type        | Notes                                                          |
|---------------|-------------|----------------------------------------------------------------|
| `id`          | uuid (PK)   |                                                                |
| `nom`         | text        |                                                                |
| `prenom`      | text        |                                                                |
| `telephone`   | text        | Format international `+32...`                                  |
| `email`       | text        | Nullable                                                       |
| `type`        | enum        | locataire, ouvrier, artisan, agent, notaire, proprietaire, autre |
| `metier`      | text        | Nullable. Ex: "plombier", "électricien"                        |
| `notes`       | text        | Nullable                                                       |
| `created_at`  | timestamptz |                                                                |
| `updated_at`  | timestamptz |                                                                |

**Index** : sur `telephone`, `nom` (recherche fulltext).

---

## Table : `mouvements`

Historique complet de tous les transferts de clés. **Append-only** : on ne modifie/supprime jamais un mouvement, on en ajoute un nouveau.

| Champ                     | Type        | Notes                                                       |
|---------------------------|-------------|-------------------------------------------------------------|
| `id`                      | uuid (PK)   |                                                             |
| `cle_id`                  | uuid (FK)   | → cles.id                                                   |
| `personne_id`             | uuid (FK)   | Nullable → personnes.id (null si retour au bureau)          |
| `type`                    | enum        | remise, retour, perte, refaite                              |
| `date_mouvement`          | timestamptz |                                                             |
| `operateur_id`            | uuid (FK)   | → users.id (qui a fait l'action)                            |
| `confirmee_par_receveur`  | boolean     | Default false                                               |
| `date_confirmation`       | timestamptz | Nullable                                                    |
| `signature_url`           | text        | Nullable, URL Supabase Storage                              |
| `photo_url`               | text        | Nullable                                                    |
| `notes`                   | text        | Nullable                                                    |
| `created_at`              | timestamptz |                                                             |

**Index** : sur `cle_id`, `personne_id`, `date_mouvement DESC`.

---

## Table : `users`

Équipe interne uniquement (admin + opérateurs). Lié à `auth.users` de Supabase.

| Champ        | Type        | Notes                                       |
|--------------|-------------|---------------------------------------------|
| `id`         | uuid (PK)   | = `auth.users.id`                           |
| `nom`        | text        |                                             |
| `prenom`     | text        |                                             |
| `role`       | enum        | admin, operateur                            |
| `created_at` | timestamptz |                                             |

---

## Enums Postgres à créer

```sql
CREATE TYPE bien_type AS ENUM ('maison', 'appartement', 'studio', 'commerce', 'garage', 'autre');
CREATE TYPE cle_type AS ENUM ('porte_entree', 'garage', 'cave', 'boite_aux_lettres', 'badge_immeuble', 'autre');
CREATE TYPE cle_statut AS ENUM ('disponible', 'remise', 'perdue', 'refaite', 'archivee');
CREATE TYPE personne_type AS ENUM ('locataire', 'ouvrier', 'artisan', 'agent', 'notaire', 'proprietaire', 'autre');
CREATE TYPE mouvement_type AS ENUM ('remise', 'retour', 'perte', 'refaite');
CREATE TYPE user_role AS ENUM ('admin', 'operateur');
```

---

## Règles RLS (Row Level Security)

### Principe général

- **Admin** : tout est autorisé sur toutes les tables.
- **Opérateur** : SELECT sur tout, INSERT sur `mouvements`, UPDATE sur `cles.statut` et `cles.personne_actuelle_id` (via triggers/RPC plutôt que direct), INSERT/UPDATE sur `personnes` et `biens` (sans DELETE).
- Aucun anonyme n'a accès à quoi que ce soit (sauf endpoint public de confirmation via lien magique signé).

### Helper function

```sql
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

Le SQL complet sera généré à l'étape 1.2 par Claude Code.

---

## Logique métier importante

### Maintenir `cles.statut` et `cles.personne_actuelle_id` synchronisés

À chaque INSERT dans `mouvements`, il faut mettre à jour la clé concernée :

- `type = 'remise'` → `statut = 'remise'`, `personne_actuelle_id = mouvement.personne_id`
- `type = 'retour'` → `statut = 'disponible'`, `personne_actuelle_id = null`
- `type = 'perte'` → `statut = 'perdue'`, `personne_actuelle_id = null`
- `type = 'refaite'` → nouvelle clé créée, ancienne archivée

À implémenter via **trigger Postgres AFTER INSERT** sur `mouvements`, ou via **Server Action** Next.js qui fait les deux opérations en transaction.

→ Décision à valider avec Claude Code à l'étape 1.2 (trigger DB recommandé pour cohérence garantie).
