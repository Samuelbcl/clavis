import {
  Archive,
  ArchiveRestore,
  HandCoins,
  Mail,
  MoreHorizontal,
  Phone,
  Plus,
  Undo2,
} from "lucide-react";

import { ArchiveCleDialog } from "@/components/clavis/cles/archive-cle-dialog";
import { CleFormDialog } from "@/components/clavis/cles/cle-form-dialog";
import { ClesFilters } from "@/components/clavis/cles/cles-filters";
import { RecupererCleDialog } from "@/components/clavis/cles/recuperer-cle-dialog";
import { RemettreCleDialog } from "@/components/clavis/cles/remettre-cle-dialog";
import { SortableHeader } from "@/components/clavis/cles/sortable-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type CleType = Database["public"]["Enums"]["cle_type"];
type CleStatut = Database["public"]["Enums"]["cle_statut"];
type PersonneType = Database["public"]["Enums"]["personne_type"];
type MouvementType = Database["public"]["Enums"]["mouvement_type"];

const TYPE_LABELS: Record<CleType, string> = {
  porte_entree: "Porte d'entrée",
  garage: "Garage",
  cave: "Cave",
  boite_aux_lettres: "BàL",
  badge_immeuble: "Badge",
  autre: "Autre",
};

const STATUT_LABELS: Record<CleStatut, string> = {
  disponible: "Disponible",
  remise: "Remise",
  perdue: "Perdue",
  refaite: "Refaite",
  archivee: "Archivée",
};

const STATUT_VARIANT: Record<
  CleStatut,
  "default" | "secondary" | "destructive" | "outline"
> = {
  disponible: "default",
  remise: "secondary",
  perdue: "destructive",
  refaite: "outline",
  archivee: "outline",
};

const MOUVEMENT_LABELS: Record<MouvementType, string> = {
  remise: "Remise",
  retour: "Retour",
  perte: "Perte",
  refaite: "Refaite",
};

const VALID_STATUTS = new Set<CleStatut>([
  "disponible",
  "remise",
  "perdue",
  "refaite",
  "archivee",
]);

const VALID_CLE_TYPES = new Set<CleType>([
  "porte_entree",
  "garage",
  "cave",
  "boite_aux_lettres",
  "badge_immeuble",
  "autre",
]);

const VALID_PERSONNE_TYPES = new Set<PersonneType>([
  "locataire",
  "ouvrier",
  "artisan",
  "agent",
  "notaire",
  "proprietaire",
  "autre",
]);

// Tri : col URL → colonne DB cles_view.
const SORT_COLUMNS: Record<string, string> = {
  code: "code",
  bien: "bien_nom",
  statut: "statut",
  personne: "personne_nom",
  dernier: "dernier_mouvement_date",
};

function sanitizeForIlike(input: string): string {
  return input.replace(/[%_,()]/g, " ").trim();
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("fr-BE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function ClesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    statut?: string;
    type?: string;
    bien?: string;
    personne_type?: string;
    sort?: string;
    dir?: string;
  }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";

  const statutFilter =
    params.statut === "all"
      ? "all"
      : params.statut && VALID_STATUTS.has(params.statut as CleStatut)
        ? (params.statut as CleStatut)
        : "actives";
  const typeFilter =
    params.type && VALID_CLE_TYPES.has(params.type as CleType)
      ? (params.type as CleType)
      : null;
  const personneTypeFilter =
    params.personne_type &&
    VALID_PERSONNE_TYPES.has(params.personne_type as PersonneType)
      ? (params.personne_type as PersonneType)
      : null;
  const bienFilter =
    params.bien && params.bien !== "all" ? params.bien : null;

  const sortKey = params.sort && SORT_COLUMNS[params.sort] ? params.sort : "code";
  const sortColumn = SORT_COLUMNS[sortKey];
  const sortDir: "asc" | "desc" = params.dir === "desc" ? "desc" : "asc";

  const user = await getCurrentUser();
  const supabase = await createClient();

  const { data: biensRaw } = await supabase
    .from("biens")
    .select("id, nom, ville")
    .order("nom");
  const biens = biensRaw ?? [];

  const { data: personnesRaw } = await supabase
    .from("personnes")
    .select("id, nom, prenom, type")
    .order("nom")
    .order("prenom");
  const personnes = personnesRaw ?? [];

  let query = supabase
    .from("cles_view")
    .select(
      `id, code, type, statut, description, bien_id, personne_actuelle_id, created_at, updated_at,
       bien_nom, bien_adresse_complete, bien_code_postal, bien_ville, bien_type,
       personne_nom, personne_prenom, personne_telephone, personne_email, personne_type,
       dernier_mouvement_type, dernier_mouvement_date`,
    )
    .order(sortColumn, { ascending: sortDir === "asc", nullsFirst: false });

  // Tri secondaire stable : par code asc (sauf si on trie déjà par code).
  if (sortColumn !== "code") {
    query = query.order("code", { ascending: true });
  }

  if (statutFilter === "actives") {
    query = query.neq("statut", "archivee");
  } else if (statutFilter !== "all") {
    query = query.eq("statut", statutFilter);
  }

  if (typeFilter) query = query.eq("type", typeFilter);
  if (bienFilter) query = query.eq("bien_id", bienFilter);
  if (personneTypeFilter) query = query.eq("personne_type", personneTypeFilter);

  if (q) {
    const safe = sanitizeForIlike(q);
    if (safe.length > 0) {
      const pattern = `%${safe}%`;
      // Recherche fulltext cross-table : on tape sur les colonnes plates de la vue.
      query = query.or(
        [
          `code.ilike.${pattern}`,
          `description.ilike.${pattern}`,
          `bien_nom.ilike.${pattern}`,
          `bien_adresse_complete.ilike.${pattern}`,
          `bien_ville.ilike.${pattern}`,
          `bien_code_postal.ilike.${pattern}`,
          `personne_nom.ilike.${pattern}`,
          `personne_prenom.ilike.${pattern}`,
          `personne_telephone.ilike.${pattern}`,
          `personne_email.ilike.${pattern}`,
        ].join(","),
      );
    }
  }

  let cles: Awaited<typeof query>["data"] = null;
  let error: Awaited<typeof query>["error"] = null;
  try {
    const res = await query;
    cles = res.data;
    error = res.error;
  } catch (err) {
    console.error("[cles/page] query threw:", err);
    error = {
      code: "unknown",
      message: err instanceof Error ? err.message : String(err),
      details: "",
      hint: "",
      name: "PostgrestError",
    } as never;
  }

  const isAdmin = user.role === "admin";

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clés</h1>
          <p className="text-muted-foreground text-sm">
            Tableau central : toutes les clés du parc, leur statut et leur
            détenteur actuel.
          </p>
        </div>
        {isAdmin && (
          <CleFormDialog
            mode="create"
            biens={biens}
            trigger={
              <Button>
                <Plus aria-hidden />
                Nouvelle clé
              </Button>
            }
          />
        )}
      </header>

      <ClesFilters biens={biens} />

      {error && (
        <Card>
          <CardHeader>
            <CardTitle>Erreur de chargement</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive text-sm">{error.message}</p>
          </CardContent>
        </Card>
      )}

      {!error && (!cles || cles.length === 0) && (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground text-sm">
              {q ||
              typeFilter ||
              bienFilter ||
              personneTypeFilter ||
              statutFilter !== "actives"
                ? "Aucune clé ne correspond aux filtres."
                : isAdmin
                  ? "Aucune clé encore. Ajoute-en une avec « Nouvelle clé »."
                  : "Aucune clé encore. Demande à un administrateur d'en créer."}
            </p>
          </CardContent>
        </Card>
      )}

      {!error && cles && cles.length > 0 && (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <SortableHeader column="code" label="Code" />
                </TableHead>
                <TableHead>
                  <SortableHeader column="bien" label="Bien" />
                </TableHead>
                <TableHead>Type</TableHead>
                <TableHead>
                  <SortableHeader column="statut" label="Statut" />
                </TableHead>
                <TableHead>
                  <SortableHeader column="personne" label="Détenteur" />
                </TableHead>
                <TableHead>
                  <SortableHeader column="dernier" label="Dernier mouvement" />
                </TableHead>
                <TableHead className="w-12 text-right" aria-label="Actions" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {cles.map((c) => {
                // L'id et les champs cles non-nullable sont en pratique toujours
                // remplis (la vue lit la table cles qui les a NOT NULL).
                const cleId = c.id!;
                const cleCode = c.code!;
                const cleType = c.type!;
                const cleStatut = c.statut!;
                const cleBienId = c.bien_id!;
                const canRemettre = cleStatut === "disponible";
                const canRecuperer = cleStatut === "remise";
                const hasMouvementAction = canRemettre || canRecuperer;
                const showMenu = isAdmin || hasMouvementAction;
                const bienLabel = c.bien_nom
                  ? `${c.bien_nom} — ${c.bien_ville ?? ""}`
                  : "—";
                const detenteurLabel =
                  c.personne_nom && c.personne_prenom
                    ? `${c.personne_prenom} ${c.personne_nom}`
                    : null;

                return (
                  <TableRow key={cleId}>
                    <TableCell className="font-mono font-medium">
                      {cleCode}
                    </TableCell>
                    <TableCell>
                      {c.bien_nom ? (
                        <div className="flex flex-col">
                          <span className="text-sm">{c.bien_nom}</span>
                          <span className="text-muted-foreground text-xs">
                            {c.bien_ville}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {TYPE_LABELS[cleType]}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUT_VARIANT[cleStatut]}>
                        {STATUT_LABELS[cleStatut]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {detenteurLabel ? (
                        <div className="flex flex-col">
                          <span className="text-sm">{detenteurLabel}</span>
                          <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                            <Phone aria-hidden className="size-3" />
                            {c.personne_telephone}
                          </span>
                          {c.personne_email && (
                            <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                              <Mail aria-hidden className="size-3" />
                              {c.personne_email}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {c.dernier_mouvement_type ? (
                        <div className="flex flex-col">
                          <span>
                            {MOUVEMENT_LABELS[c.dernier_mouvement_type]}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {formatDate(c.dernier_mouvement_date)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Jamais</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {showMenu && (
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Actions pour ${cleCode}`}
                              />
                            }
                          >
                            <MoreHorizontal aria-hidden />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canRemettre && (
                              <RemettreCleDialog
                                cleId={cleId}
                                cleCode={cleCode}
                                bienLabel={bienLabel}
                                personnes={personnes}
                                trigger={
                                  <DropdownMenuItem closeOnClick={false}>
                                    <HandCoins aria-hidden />
                                    Remettre
                                  </DropdownMenuItem>
                                }
                              />
                            )}
                            {canRecuperer && (
                              <RecupererCleDialog
                                cleId={cleId}
                                cleCode={cleCode}
                                detenteurLabel={detenteurLabel}
                                trigger={
                                  <DropdownMenuItem closeOnClick={false}>
                                    <Undo2 aria-hidden />
                                    Récupérer
                                  </DropdownMenuItem>
                                }
                              />
                            )}
                            {isAdmin && hasMouvementAction && (
                              <DropdownMenuSeparator />
                            )}
                            {isAdmin && (
                              <CleFormDialog
                                mode="edit"
                                cle={{
                                  id: cleId,
                                  bien_id: cleBienId,
                                  code: cleCode,
                                  type: cleType,
                                  description: c.description,
                                }}
                                biens={biens}
                                trigger={
                                  <DropdownMenuItem closeOnClick={false}>
                                    Éditer
                                  </DropdownMenuItem>
                                }
                              />
                            )}
                            {isAdmin && <DropdownMenuSeparator />}
                            {isAdmin && cleStatut === "archivee" && (
                              <ArchiveCleDialog
                                cleId={cleId}
                                cleCode={cleCode}
                                archive={false}
                                trigger={
                                  <DropdownMenuItem closeOnClick={false}>
                                    <ArchiveRestore aria-hidden />
                                    Réactiver
                                  </DropdownMenuItem>
                                }
                              />
                            )}
                            {isAdmin && cleStatut !== "archivee" && (
                              <ArchiveCleDialog
                                cleId={cleId}
                                cleCode={cleCode}
                                archive={true}
                                trigger={
                                  <DropdownMenuItem
                                    variant="destructive"
                                    closeOnClick={false}
                                  >
                                    <Archive aria-hidden />
                                    Archiver
                                  </DropdownMenuItem>
                                }
                              />
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
