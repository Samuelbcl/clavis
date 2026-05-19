-- ============================================================================
-- Clavis — Migration 0002 (Phase 1.11)
-- Vue dénormalisée cles_view : sert d'écran central
-- ============================================================================
-- Pourquoi une vue :
--   - Recherche fulltext cross-table (code, description, nom bien, adresse, ville,
--     nom/prénom/téléphone du détenteur actuel) en un seul .or() ou .textSearch().
--   - Tri par colonnes joinées (bien_nom, personne_nom) sans gymnastique JS.
--   - Colonne "dernier mouvement" via LATERAL join (1 row par clé).
--
-- security_invoker=true :
--   La vue s'exécute avec les droits de l'appelant (donc les RLS de cles, biens,
--   personnes, mouvements s'appliquent normalement). Sans ça, la vue tourne en
--   security definer et bypass tout RLS, ce qui exposerait des données à des
--   utilisateurs non autorisés.
-- ============================================================================

CREATE OR REPLACE VIEW public.cles_view
WITH (security_invoker = true) AS
SELECT
  c.id,
  c.code,
  c.bien_id,
  c.statut,
  c.type,
  c.description,
  c.personne_actuelle_id,
  c.created_at,
  c.updated_at,

  -- Bien rattaché
  b.nom              AS bien_nom,
  b.adresse_complete AS bien_adresse_complete,
  b.code_postal      AS bien_code_postal,
  b.ville            AS bien_ville,
  b.type             AS bien_type,

  -- Détenteur actuel (null si dispo)
  p.nom        AS personne_nom,
  p.prenom     AS personne_prenom,
  p.telephone  AS personne_telephone,
  p.email      AS personne_email,
  p.type       AS personne_type,

  -- Dernier mouvement (null si la clé n'en a jamais eu)
  last_m.type           AS dernier_mouvement_type,
  last_m.date_mouvement AS dernier_mouvement_date,

  -- Vecteur de recherche fulltext (config simple : pas de stemming FR/EN, juste
  -- lowercase + tokenisation, suffisant pour de la recherche par fragment).
  to_tsvector(
    'simple',
    coalesce(c.code, '')              || ' ' ||
    coalesce(c.description, '')       || ' ' ||
    coalesce(b.nom, '')               || ' ' ||
    coalesce(b.adresse_complete, '')  || ' ' ||
    coalesce(b.ville, '')             || ' ' ||
    coalesce(b.code_postal, '')       || ' ' ||
    coalesce(p.nom, '')               || ' ' ||
    coalesce(p.prenom, '')            || ' ' ||
    coalesce(p.telephone, '')         || ' ' ||
    coalesce(p.email, '')
  ) AS search_vector
FROM public.cles c
LEFT JOIN public.biens b
  ON b.id = c.bien_id
LEFT JOIN public.personnes p
  ON p.id = c.personne_actuelle_id
LEFT JOIN LATERAL (
  SELECT m.type, m.date_mouvement
  FROM public.mouvements m
  WHERE m.cle_id = c.id
  ORDER BY m.date_mouvement DESC
  LIMIT 1
) last_m ON true;

-- Note : pas d'index sur search_vector (impossible sur une vue non-matérialisée).
-- Pour < 1000 clés c'est OK. Si le parc dépasse, on bumpera en MATERIALIZED VIEW
-- avec refresh sur trigger des tables sources.

COMMENT ON VIEW public.cles_view IS
  'Vue dénormalisée pour l''écran central : cle + bien + détenteur actuel + dernier mouvement + vecteur de recherche fulltext.';
