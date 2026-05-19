import { Mail, MoreHorizontal, Phone, Plus } from "lucide-react";
import Link from "next/link";

import { PhoneLink } from "@/components/clavis/phone-link";
import { DeletePersonneDialog } from "@/components/clavis/personnes/delete-personne-dialog";
import { PersonneFormDialog } from "@/components/clavis/personnes/personne-form-dialog";
import { PersonnesFilters } from "@/components/clavis/personnes/personnes-filters";
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

type PersonneType = Database["public"]["Enums"]["personne_type"];

const TYPE_LABELS: Record<PersonneType, string> = {
  locataire: "Locataire",
  ouvrier: "Ouvrier",
  artisan: "Artisan",
  agent: "Agent immo.",
  notaire: "Notaire",
  proprietaire: "Propriétaire",
  autre: "Autre",
};

const VALID_TYPES = new Set<PersonneType>([
  "locataire",
  "ouvrier",
  "artisan",
  "agent",
  "notaire",
  "proprietaire",
  "autre",
]);

function sanitizeForIlike(input: string): string {
  return input.replace(/[%_,()]/g, " ").trim();
}

export default async function PersonnesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; type_precise?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const typeParam = params.type;
  const typeFilter =
    typeParam && VALID_TYPES.has(typeParam as PersonneType)
      ? (typeParam as PersonneType)
      : null;
  const typePrecise = params.type_precise?.trim() ?? "";

  const user = await getCurrentUser();
  const supabase = await createClient();

  let query = supabase
    .from("personnes")
    .select(
      "id, nom, prenom, telephone, email, type, metier, notes, created_at, updated_at",
    )
    .order("nom", { ascending: true })
    .order("prenom", { ascending: true });

  if (q) {
    const safe = sanitizeForIlike(q);
    if (safe.length > 0) {
      const pattern = `%${safe}%`;
      query = query.or(
        [
          `nom.ilike.${pattern}`,
          `prenom.ilike.${pattern}`,
          `telephone.ilike.${pattern}`,
          `metier.ilike.${pattern}`,
          `email.ilike.${pattern}`,
        ].join(","),
      );
    }
  }

  if (typeFilter) {
    query = query.eq("type", typeFilter);
  }

  // Quand on filtre par "autre" + une précision, on cherche dans le métier
  // (et les notes) pour affiner. Permet au client d'avoir ses sous-types
  // personnalisés (huissier, ami, expert-comptable, etc.).
  if (typeFilter === "autre" && typePrecise) {
    const safe = sanitizeForIlike(typePrecise);
    if (safe.length > 0) {
      const pattern = `%${safe}%`;
      query = query.or(`metier.ilike.${pattern},notes.ilike.${pattern}`);
    }
  }

  let personnes: Awaited<typeof query>["data"] = null;
  let error: Awaited<typeof query>["error"] = null;
  try {
    const res = await query;
    personnes = res.data;
    error = res.error;
  } catch (err) {
    console.error("[personnes/page] query threw:", err);
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
          <h1 className="text-2xl font-bold tracking-tight">Personnes</h1>
          <p className="text-muted-foreground text-sm">
            Locataires, ouvriers, artisans, agents et autres détenteurs
            potentiels de clés.
          </p>
        </div>
        <PersonneFormDialog
          mode="create"
          trigger={
            <Button className="self-start sm:self-auto">
              <Plus aria-hidden />
              Nouvelle personne
            </Button>
          }
        />
      </header>

      <PersonnesFilters />

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

      {!error && (!personnes || personnes.length === 0) && (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground text-sm">
              {q || typeFilter
                ? "Aucune personne ne correspond aux filtres."
                : "Aucune personne enregistrée. Ajoute-en une avec « Nouvelle personne »."}
            </p>
          </CardContent>
        </Card>
      )}

      {!error && personnes && personnes.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Métier</TableHead>
                <TableHead className="w-12 text-right" aria-label="Actions" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {personnes.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/personnes/${p.id}`}
                      className="text-primary underline-offset-4 transition-colors hover:underline"
                    >
                      {p.prenom} {p.nom}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <div className="flex flex-col gap-0.5 text-xs">
                      <span className="inline-flex items-center gap-1.5">
                        <Phone aria-hidden className="size-3" />
                        <PhoneLink phone={p.telephone} />
                      </span>
                      {p.email && (
                        <a
                          href={`mailto:${p.email}`}
                          className="hover:text-primary inline-flex items-center gap-1.5 transition-colors hover:underline"
                        >
                          <Mail aria-hidden className="size-3" />
                          {p.email}
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{TYPE_LABELS[p.type]}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {p.metier ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Actions pour ${p.prenom} ${p.nom}`}
                          />
                        }
                      >
                        <MoreHorizontal aria-hidden />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <PersonneFormDialog
                          mode="edit"
                          personne={p}
                          trigger={
                            <DropdownMenuItem closeOnClick={false}>
                              Éditer
                            </DropdownMenuItem>
                          }
                        />
                        {user.role === "admin" && (
                          <>
                            <DropdownMenuSeparator />
                            <DeletePersonneDialog
                              personneId={p.id}
                              personneNom={`${p.prenom} ${p.nom}`}
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
