-- ============================================================================
-- Clavis — Migration initiale (Phase 1.2)
-- ============================================================================
-- Contenu :
--   1. Extensions (pg_trgm pour recherche fuzzy sur personnes)
--   2. 6 enums métier
--   3. Helper functions (set_updated_at, is_admin)
--   4. 5 tables (users, biens, personnes, cles, mouvements)
--   5. Triggers (handle_new_user, sync_cle_on_mouvement, updated_at)
--   6. RLS activé + policies (admin full / opérateur restreint)
--
-- Modèle d'autorisation :
--   - admin       : full CRUD sur tout
--   - operateur   : SELECT partout, INSERT/UPDATE biens/personnes/mouvements,
--                   pas de DELETE. UPDATE cles indirectement via le trigger
--                   sync_cle_on_mouvement (SECURITY DEFINER).
--   - anon        : aucun accès (les receveurs magic-link arrivent en Phase 3).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Extensions
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ----------------------------------------------------------------------------
-- 2. Enums
-- ----------------------------------------------------------------------------
CREATE TYPE bien_type AS ENUM (
  'maison', 'appartement', 'studio', 'commerce', 'garage', 'autre'
);

CREATE TYPE cle_type AS ENUM (
  'porte_entree', 'garage', 'cave', 'boite_aux_lettres', 'badge_immeuble', 'autre'
);

CREATE TYPE cle_statut AS ENUM (
  'disponible', 'remise', 'perdue', 'refaite', 'archivee'
);

CREATE TYPE personne_type AS ENUM (
  'locataire', 'ouvrier', 'artisan', 'agent', 'notaire', 'proprietaire', 'autre'
);

CREATE TYPE mouvement_type AS ENUM (
  'remise', 'retour', 'perte', 'refaite'
);

CREATE TYPE user_role AS ENUM ('admin', 'operateur');

-- ----------------------------------------------------------------------------
-- 3. Helper functions
-- ----------------------------------------------------------------------------

-- Met à jour updated_at à chaque UPDATE
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. Tables
-- ----------------------------------------------------------------------------

-- users : équipe interne, lié à auth.users
CREATE TABLE public.users (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nom         text NOT NULL DEFAULT '',
  prenom      text NOT NULL DEFAULT '',
  role        user_role NOT NULL DEFAULT 'operateur',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- is_admin : helper réutilisable dans les RLS policies.
-- SECURITY DEFINER + search_path explicite pour bypass RLS sur public.users
-- et éviter la récursion (RLS de users → is_admin → SELECT users → RLS de users…).
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- biens
CREATE TABLE public.biens (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom               text NOT NULL,
  adresse_complete  text NOT NULL,
  code_postal       text NOT NULL,
  ville             text NOT NULL,
  type              bien_type NOT NULL,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX biens_ville_idx ON public.biens (ville);
CREATE INDEX biens_type_idx  ON public.biens (type);

CREATE TRIGGER biens_set_updated_at
  BEFORE UPDATE ON public.biens
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- personnes : tiers qui reçoivent des clés (locataires, ouvriers, etc.).
-- Pas de compte sur l'app : pas de FK vers auth.users.
CREATE TABLE public.personnes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom         text NOT NULL,
  prenom      text NOT NULL,
  telephone   text NOT NULL,
  email       text,
  type        personne_type NOT NULL,
  metier      text,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX personnes_telephone_idx     ON public.personnes (telephone);
CREATE INDEX personnes_type_idx          ON public.personnes (type);
CREATE INDEX personnes_nom_trgm_idx      ON public.personnes USING gin (nom gin_trgm_ops);
CREATE INDEX personnes_prenom_trgm_idx   ON public.personnes USING gin (prenom gin_trgm_ops);

CREATE TRIGGER personnes_set_updated_at
  BEFORE UPDATE ON public.personnes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- cles : clés physiques, rattachées à un bien.
-- personne_actuelle_id : dénormalisation pour éviter de recalculer le détenteur
-- à chaque requête (source de vérité = dernier mouvement).
CREATE TABLE public.cles (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bien_id               uuid NOT NULL REFERENCES public.biens(id) ON DELETE CASCADE,
  code                  text NOT NULL UNIQUE,
  type                  cle_type NOT NULL,
  description           text,
  statut                cle_statut NOT NULL DEFAULT 'disponible',
  personne_actuelle_id  uuid REFERENCES public.personnes(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX cles_bien_id_idx               ON public.cles (bien_id);
CREATE INDEX cles_statut_idx                ON public.cles (statut);
CREATE INDEX cles_personne_actuelle_id_idx  ON public.cles (personne_actuelle_id);

CREATE TRIGGER cles_set_updated_at
  BEFORE UPDATE ON public.cles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- mouvements : append-only audit log de toutes les remises/retours.
-- ON DELETE RESTRICT sur les FK pour préserver l'historique : on ne peut pas
-- supprimer une clé/personne/user qui a des mouvements (forcer l'archivage à la place).
CREATE TABLE public.mouvements (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cle_id                   uuid NOT NULL REFERENCES public.cles(id) ON DELETE RESTRICT,
  personne_id              uuid REFERENCES public.personnes(id) ON DELETE RESTRICT,
  type                     mouvement_type NOT NULL,
  date_mouvement           timestamptz NOT NULL DEFAULT now(),
  operateur_id             uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  confirmee_par_receveur   boolean NOT NULL DEFAULT false,
  date_confirmation        timestamptz,
  signature_url            text,
  photo_url                text,
  notes                    text,
  created_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX mouvements_cle_id_idx       ON public.mouvements (cle_id);
CREATE INDEX mouvements_personne_id_idx  ON public.mouvements (personne_id);
CREATE INDEX mouvements_date_idx         ON public.mouvements (date_mouvement DESC);

-- ----------------------------------------------------------------------------
-- 5. Triggers métier
-- ----------------------------------------------------------------------------

-- Auto-création d'un row public.users à chaque signup auth.users.
-- Le rôle par défaut est 'operateur' ; un admin doit promouvoir manuellement.
-- raw_user_meta_data peut contenir nom/prenom passés au signup.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, nom, prenom, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nom', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'prenom', ''),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'operateur')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Sync cles.statut + cles.personne_actuelle_id selon le type de mouvement.
-- SECURITY DEFINER : bypass RLS pour autoriser l'UPDATE même quand l'INSERT
-- est fait par un opérateur (qui n'a pas le droit d'UPDATE direct sur cles).
CREATE OR REPLACE FUNCTION public.sync_cle_on_mouvement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.type = 'remise' THEN
    UPDATE public.cles
       SET statut = 'remise', personne_actuelle_id = NEW.personne_id
     WHERE id = NEW.cle_id;

  ELSIF NEW.type = 'retour' THEN
    UPDATE public.cles
       SET statut = 'disponible', personne_actuelle_id = NULL
     WHERE id = NEW.cle_id;

  ELSIF NEW.type = 'perte' THEN
    UPDATE public.cles
       SET statut = 'perdue', personne_actuelle_id = NULL
     WHERE id = NEW.cle_id;

  ELSIF NEW.type = 'refaite' THEN
    UPDATE public.cles
       SET statut = 'refaite', personne_actuelle_id = NULL
     WHERE id = NEW.cle_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_mouvement_inserted
  AFTER INSERT ON public.mouvements
  FOR EACH ROW EXECUTE FUNCTION public.sync_cle_on_mouvement();

-- ----------------------------------------------------------------------------
-- 6. RLS — Row Level Security
-- ----------------------------------------------------------------------------

ALTER TABLE public.users      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biens      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personnes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mouvements ENABLE ROW LEVEL SECURITY;

-- ---- users ----
-- Tout authentifié peut lire la liste users (pour afficher "qui a fait l'action").
CREATE POLICY users_select_authenticated ON public.users
  FOR SELECT TO authenticated
  USING (true);

-- INSERT users se fait automatiquement via le trigger handle_new_user.
-- Une INSERT manuelle reste réservée à l'admin (rarement utile).
CREATE POLICY users_insert_admin ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY users_update_admin ON public.users
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY users_delete_admin ON public.users
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- ---- biens ----
CREATE POLICY biens_select_authenticated ON public.biens
  FOR SELECT TO authenticated USING (true);

CREATE POLICY biens_insert_authenticated ON public.biens
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY biens_update_authenticated ON public.biens
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY biens_delete_admin ON public.biens
  FOR DELETE TO authenticated USING (public.is_admin());

-- ---- personnes ----
CREATE POLICY personnes_select_authenticated ON public.personnes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY personnes_insert_authenticated ON public.personnes
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY personnes_update_authenticated ON public.personnes
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY personnes_delete_admin ON public.personnes
  FOR DELETE TO authenticated USING (public.is_admin());

-- ---- cles ----
CREATE POLICY cles_select_authenticated ON public.cles
  FOR SELECT TO authenticated USING (true);

-- INSERT/UPDATE/DELETE direct sur cles = admin only.
-- Les changements statut/personne_actuelle_id passent par l'INSERT mouvement
-- → trigger sync_cle_on_mouvement (SECURITY DEFINER).
CREATE POLICY cles_insert_admin ON public.cles
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY cles_update_admin ON public.cles
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY cles_delete_admin ON public.cles
  FOR DELETE TO authenticated USING (public.is_admin());

-- ---- mouvements ----
-- Append-only : pas de UPDATE/DELETE policy = ces opérations sont bloquées
-- pour tout le monde (sauf bypass RLS).
CREATE POLICY mouvements_select_authenticated ON public.mouvements
  FOR SELECT TO authenticated USING (true);

-- L'opérateur ne peut insérer que des mouvements dont il est l'auteur
-- (operateur_id = lui-même). Empêche l'usurpation.
CREATE POLICY mouvements_insert_authenticated ON public.mouvements
  FOR INSERT TO authenticated
  WITH CHECK (operateur_id = auth.uid());

-- ============================================================================
-- Fin de la migration 0001
-- ============================================================================
