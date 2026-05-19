import {
  ChevronLeft,
  ChevronRight,
  HandCoins,
  RefreshCw,
  ShieldX,
  Undo2,
} from "lucide-react";
import Link from "next/link";

import { HistoriqueFilters } from "@/components/clavis/historique/historique-filters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type MouvementType = Database["public"]["Enums"]["mouvement_type"];

const PAGE_SIZE = 50;
const DEFAULT_RANGE_DAYS = 30;

const TYPE_LABELS: Record<MouvementType, string> = {
  remise: "Remise",
  retour: "Retour",
  perte: "Perte",
  refaite: "Refaite",
};

const TYPE_ICONS: Record<
  MouvementType,
  React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>
> = {
  remise: HandCoins,
  retour: Undo2,
  perte: ShieldX,
  refaite: RefreshCw,
};

const TYPE_VARIANT: Record<
  MouvementType,
  "default" | "secondary" | "destructive" | "outline"
> = {
  remise: "secondary",
  retour: "default",
  perte: "destructive",
  refaite: "outline",
};

const VALID_TYPES = new Set<MouvementType>([
  "remise",
  "retour",
  "perte",
  "refaite",
]);

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-BE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function HistoriquePage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    type?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;

  // Période par défaut : 30 derniers jours.
  const now = new Date();
  const defaultFrom = new Date(
    now.getTime() - DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000,
  );
  const defaultFromIso = toIsoDate(defaultFrom);
  const defaultToIso = toIsoDate(now);

  const fromIso = params.from ?? defaultFromIso;
  const toIso = params.to ?? defaultToIso;
  const typeFilter =
    params.type && VALID_TYPES.has(params.type as MouvementType)
      ? (params.type as MouvementType)
      : null;

  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  // Bornes UTC : start of from (00:00) à end of to (23:59:59.999).
  // Approximation TZ-naive : on traite les chaînes comme UTC. L'écart de 1-2h
  // par rapport à BE est acceptable pour un audit log (pas du temps réel).
  const fromTs = new Date(`${fromIso}T00:00:00Z`).toISOString();
  const toTs = new Date(`${toIso}T23:59:59.999Z`).toISOString();

  const supabase = await createClient();

  let query = supabase
    .from("mouvements")
    .select(
      `id, type, date_mouvement, notes, confirmee_par_receveur,
       cle:cles!inner (id, code, type,
         bien:biens!cles_bien_id_fkey (id, nom, ville)
       ),
       personne:personnes (id, nom, prenom),
       operateur:users!mouvements_operateur_id_fkey (id, nom, prenom)`,
      { count: "exact" },
    )
    .gte("date_mouvement", fromTs)
    .lte("date_mouvement", toTs)
    .order("date_mouvement", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (typeFilter) {
    query = query.eq("type", typeFilter);
  }

  let mouvements: Awaited<typeof query>["data"] = null;
  let error: Awaited<typeof query>["error"] = null;
  let total = 0;
  try {
    const res = await query;
    mouvements = res.data;
    error = res.error;
    total = res.count ?? 0;
  } catch (err) {
    console.error("[historique/page] query threw:", err);
    error = {
      code: "unknown",
      message: err instanceof Error ? err.message : String(err),
      details: "",
      hint: "",
      name: "PostgrestError",
    } as never;
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const showingFrom = total === 0 ? 0 : offset + 1;
  const showingTo = Math.min(offset + PAGE_SIZE, total);

  function pageHref(targetPage: number): string {
    const sp = new URLSearchParams();
    if (params.from) sp.set("from", params.from);
    if (params.to) sp.set("to", params.to);
    if (params.type) sp.set("type", params.type);
    if (targetPage > 1) sp.set("page", String(targetPage));
    const qs = sp.toString();
    return qs ? `/historique?${qs}` : "/historique";
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Historique</h1>
        <p className="text-muted-foreground text-sm">
          Audit log complet de tous les mouvements de clés.
        </p>
      </header>

      <HistoriqueFilters
        defaultFrom={defaultFromIso}
        defaultTo={defaultToIso}
      />

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

      {!error && (!mouvements || mouvements.length === 0) && (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground text-sm">
              Aucun mouvement pour la période ou les filtres sélectionnés.
            </p>
          </CardContent>
        </Card>
      )}

      {!error && mouvements && mouvements.length > 0 && (
        <>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Clé</TableHead>
                  <TableHead>Bien</TableHead>
                  <TableHead>Personne</TableHead>
                  <TableHead>Opérateur</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mouvements.map((m) => {
                  const Icon = TYPE_ICONS[m.type];
                  const cle = Array.isArray(m.cle) ? m.cle[0] : m.cle;
                  const bien = cle?.bien
                    ? Array.isArray(cle.bien)
                      ? cle.bien[0]
                      : cle.bien
                    : null;
                  const personne = Array.isArray(m.personne)
                    ? m.personne[0]
                    : m.personne;
                  const operateur = Array.isArray(m.operateur)
                    ? m.operateur[0]
                    : m.operateur;
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                        {formatDateTime(m.date_mouvement)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={TYPE_VARIANT[m.type]} className="gap-1.5">
                          <Icon aria-hidden className="size-3" />
                          {TYPE_LABELS[m.type]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {cle ? (
                          <Link
                            href={`/cles/${cle.id}`}
                            className="font-mono text-sm hover:underline"
                          >
                            {cle.code}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {bien ? (
                          <div className="flex flex-col">
                            <span>{bien.nom}</span>
                            <span className="text-muted-foreground text-xs">
                              {bien.ville}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {personne ? (
                          `${personne.prenom} ${personne.nom}`
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {operateur
                          ? `${operateur.prenom} ${operateur.nom}`.trim() ||
                            "—"
                          : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-xs truncate text-sm">
                        {m.notes || "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-muted-foreground text-xs">
              {showingFrom}–{showingTo} sur {total}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                render={
                  page <= 1 ? <span /> : <Link href={pageHref(page - 1)} />
                }
              >
                <ChevronLeft aria-hidden />
                Précédent
              </Button>
              <span className="text-muted-foreground text-xs">
                Page {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                render={
                  page >= totalPages ? (
                    <span />
                  ) : (
                    <Link href={pageHref(page + 1)} />
                  )
                }
              >
                Suivant
                <ChevronRight aria-hidden />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
