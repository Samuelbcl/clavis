import {
  Archive,
  ArchiveRestore,
  MoreHorizontal,
  Phone,
  Plus,
} from "lucide-react";

import { ArchiveCleDialog } from "@/components/clavis/cles/archive-cle-dialog";
import { CleFormDialog } from "@/components/clavis/cles/cle-form-dialog";
import { ClesFilters } from "@/components/clavis/cles/cles-filters";
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

const VALID_STATUTS = new Set<CleStatut>([
  "disponible",
  "remise",
  "perdue",
  "refaite",
  "archivee",
]);

const VALID_TYPES = new Set<CleType>([
  "porte_entree",
  "garage",
  "cave",
  "boite_aux_lettres",
  "badge_immeuble",
  "autre",
]);

function sanitizeForIlike(input: string): string {
  return input.replace(/[%_,()]/g, " ").trim();
}

export default async function ClesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    statut?: string;
    type?: string;
    bien?: string;
  }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const statutParam = params.statut;
  const typeParam = params.type;
  const bienFilter = params.bien;

  const statutFilter =
    statutParam === "all"
      ? "all"
      : statutParam && VALID_STATUTS.has(statutParam as CleStatut)
        ? (statutParam as CleStatut)
        : "actives";
  const typeFilter =
    typeParam && VALID_TYPES.has(typeParam as CleType)
      ? (typeParam as CleType)
      : null;

  const user = await getCurrentUser();
  const supabase = await createClient();

  const { data: biensRaw } = await supabase
    .from("biens")
    .select("id, nom, ville")
    .order("nom");
  const biens = biensRaw ?? [];

  let query = supabase
    .from("cles")
    .select(
      `id, code, type, statut, description, bien_id, personne_actuelle_id, created_at, updated_at,
       bien:biens!cles_bien_id_fkey (id, nom, ville),
       personne_actuelle:personnes!cles_personne_actuelle_id_fkey (id, nom, prenom, telephone)`,
    )
    .order("code", { ascending: true });

  if (statutFilter === "actives") {
    query = query.neq("statut", "archivee");
  } else if (statutFilter !== "all") {
    query = query.eq("statut", statutFilter);
  }

  if (typeFilter) query = query.eq("type", typeFilter);
  if (bienFilter && bienFilter !== "all") query = query.eq("bien_id", bienFilter);

  if (q) {
    const safe = sanitizeForIlike(q);
    if (safe.length > 0) {
      const pattern = `%${safe}%`;
      query = query.or(`code.ilike.${pattern},description.ilike.${pattern}`);
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
            Inventaire de toutes les clés physiques rattachées à un bien.
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
              {q || typeFilter || bienFilter || statutFilter !== "actives"
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
                <TableHead>Code</TableHead>
                <TableHead>Bien</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Détenteur actuel</TableHead>
                {isAdmin && (
                  <TableHead className="w-12 text-right" aria-label="Actions" />
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {cles.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono font-medium">
                    {c.code}
                  </TableCell>
                  <TableCell>
                    {c.bien ? (
                      <div className="flex flex-col">
                        <span className="text-sm">{c.bien.nom}</span>
                        <span className="text-muted-foreground text-xs">
                          {c.bien.ville}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {TYPE_LABELS[c.type]}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUT_VARIANT[c.statut]}>
                      {STATUT_LABELS[c.statut]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {c.personne_actuelle ? (
                      <div className="flex flex-col">
                        <span className="text-sm">
                          {c.personne_actuelle.prenom}{" "}
                          {c.personne_actuelle.nom}
                        </span>
                        <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                          <Phone aria-hidden className="size-3" />
                          {c.personne_actuelle.telephone}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Actions pour ${c.code}`}
                            />
                          }
                        >
                          <MoreHorizontal aria-hidden />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <CleFormDialog
                            mode="edit"
                            cle={c}
                            biens={biens}
                            trigger={
                              <DropdownMenuItem closeOnClick={false}>
                                Éditer
                              </DropdownMenuItem>
                            }
                          />
                          <DropdownMenuSeparator />
                          {c.statut === "archivee" ? (
                            <ArchiveCleDialog
                              cleId={c.id}
                              cleCode={c.code}
                              archive={false}
                              trigger={
                                <DropdownMenuItem closeOnClick={false}>
                                  <ArchiveRestore aria-hidden />
                                  Réactiver
                                </DropdownMenuItem>
                              }
                            />
                          ) : (
                            <ArchiveCleDialog
                              cleId={c.id}
                              cleCode={c.code}
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
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
