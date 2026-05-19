import { MoreHorizontal, Plus } from "lucide-react";

import { BienFormDialog } from "@/components/clavis/biens/bien-form-dialog";
import { BiensFilters } from "@/components/clavis/biens/biens-filters";
import { DeleteBienDialog } from "@/components/clavis/biens/delete-bien-dialog";
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

type BienType = Database["public"]["Enums"]["bien_type"];

const TYPE_LABELS: Record<BienType, string> = {
  maison: "Maison",
  appartement: "Appartement",
  studio: "Studio",
  commerce: "Commerce",
  garage: "Garage",
  autre: "Autre",
};

const VALID_TYPES = new Set<BienType>([
  "maison",
  "appartement",
  "studio",
  "commerce",
  "garage",
  "autre",
]);

function sanitizeForIlike(input: string): string {
  // Retire les caractères qui ont une signification dans le filter syntax de
  // PostgREST (`,` `(` `)`) et les wildcards SQL (`%` `_`), pour éviter
  // toute injection de filtres ou de wildcards inattendus depuis l'UI.
  return input.replace(/[%_,()]/g, " ").trim();
}

export default async function BiensPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; type_precise?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const typeParam = params.type;
  const typeFilter =
    typeParam && VALID_TYPES.has(typeParam as BienType)
      ? (typeParam as BienType)
      : null;
  const typePrecise = params.type_precise?.trim() ?? "";

  const user = await getCurrentUser();
  const supabase = await createClient();

  let query = supabase
    .from("biens")
    .select(
      "id, nom, adresse_complete, code_postal, ville, type, notes, created_at, updated_at",
    )
    .order("nom", { ascending: true });

  if (q) {
    const safe = sanitizeForIlike(q);
    if (safe.length > 0) {
      const pattern = `%${safe}%`;
      query = query.or(
        [
          `nom.ilike.${pattern}`,
          `adresse_complete.ilike.${pattern}`,
          `ville.ilike.${pattern}`,
          `notes.ilike.${pattern}`,
        ].join(","),
      );
    }
  }

  if (typeFilter) {
    query = query.eq("type", typeFilter);
  }

  // Filtre "autre" + précision : affine sur nom + notes.
  if (typeFilter === "autre" && typePrecise) {
    const safe = sanitizeForIlike(typePrecise);
    if (safe.length > 0) {
      const pattern = `%${safe}%`;
      query = query.or(`nom.ilike.${pattern},notes.ilike.${pattern}`);
    }
  }

  let biens: Awaited<typeof query>["data"] = null;
  let error: Awaited<typeof query>["error"] = null;
  try {
    const res = await query;
    biens = res.data;
    error = res.error;
  } catch (err) {
    console.error("[biens/page] query threw:", err);
    error = {
      code: "unknown",
      message: err instanceof Error ? err.message : String(err),
      details: "",
      hint: "",
      name: "PostgrestError",
    } as never;
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Biens</h1>
          <p className="text-muted-foreground text-sm">
            Parc immobilier suivi par Clavis.
          </p>
        </div>
        <BienFormDialog
          mode="create"
          trigger={
            <Button className="self-start sm:self-auto">
              <Plus aria-hidden />
              Nouveau bien
            </Button>
          }
        />
      </header>

      <BiensFilters />

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

      {!error && (!biens || biens.length === 0) && (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground text-sm">
              {q || typeFilter
                ? "Aucun bien ne correspond aux filtres."
                : "Aucun bien encore. Ajoute-en un avec « Nouveau bien »."}
            </p>
          </CardContent>
        </Card>
      )}

      {!error && biens && biens.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Adresse</TableHead>
                <TableHead>Ville</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="w-12 text-right" aria-label="Actions" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {biens.map((bien) => (
                <TableRow key={bien.id}>
                  <TableCell className="font-medium">{bien.nom}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {bien.adresse_complete}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {bien.code_postal} {bien.ville}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{TYPE_LABELS[bien.type]}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Actions pour ${bien.nom}`}
                          />
                        }
                      >
                        <MoreHorizontal aria-hidden />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <BienFormDialog
                          mode="edit"
                          bien={bien}
                          trigger={
                            <DropdownMenuItem closeOnClick={false}>
                              Éditer
                            </DropdownMenuItem>
                          }
                        />
                        {user.role === "admin" && (
                          <>
                            <DropdownMenuSeparator />
                            <DeleteBienDialog
                              bienId={bien.id}
                              bienNom={bien.nom}
                              trigger={
                                <DropdownMenuItem
                                  variant="destructive"
                                  closeOnClick={false}
                                >
                                  Supprimer
                                </DropdownMenuItem>
                              }
                            />
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
