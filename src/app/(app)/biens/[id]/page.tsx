import {
  Building2,
  ChevronLeft,
  Hash,
  HandCoins,
  KeyRound,
  MapPin,
  Pencil,
  RefreshCw,
  ShieldX,
  StickyNote,
  Undo2,
  User,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BienFormDialog } from "@/components/clavis/biens/bien-form-dialog";
import { DeleteBienDialog } from "@/components/clavis/biens/delete-bien-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type BienType = Database["public"]["Enums"]["bien_type"];
type CleStatut = Database["public"]["Enums"]["cle_statut"];
type MouvementType = Database["public"]["Enums"]["mouvement_type"];

const TYPE_LABELS: Record<BienType, string> = {
  maison: "Maison",
  appartement: "Appartement",
  studio: "Studio",
  commerce: "Commerce",
  garage: "Garage",
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

const MOUVEMENT_ICONS: Record<
  MouvementType,
  React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>
> = {
  remise: HandCoins,
  retour: Undo2,
  perte: ShieldX,
  refaite: RefreshCw,
};

const MOUVEMENT_RING: Record<MouvementType, string> = {
  remise: "ring-amber-500 bg-amber-100 text-amber-900",
  retour: "ring-emerald-500 bg-emerald-100 text-emerald-900",
  perte: "ring-destructive bg-destructive/15 text-destructive",
  refaite: "ring-blue-500 bg-blue-100 text-blue-900",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-BE", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function BienDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const supabase = await createClient();

  // 3 queries en parallèle.
  const [bienRes, clesRes, mouvementsRes] = await Promise.all([
    supabase.from("biens").select("*").eq("id", id).single(),
    // Clés rattachées à ce bien.
    supabase
      .from("cles")
      .select(
        `id, code, type, statut,
         personne_actuelle:personnes!cles_personne_actuelle_id_fkey (id, nom, prenom)`,
      )
      .eq("bien_id", id)
      .order("code"),
    // Mouvements sur les clés de ce bien — on filtre via inner join sur cles.bien_id.
    supabase
      .from("mouvements")
      .select(
        `id, type, date_mouvement, notes,
         cle:cles!inner (id, code, bien_id),
         personne:personnes (id, nom, prenom),
         operateur:users!mouvements_operateur_id_fkey (id, nom, prenom)`,
      )
      .eq("cle.bien_id", id)
      .order("date_mouvement", { ascending: false })
      .limit(100),
  ]);

  const bien = bienRes.data;
  if (bienRes.error || !bien) {
    notFound();
  }

  const cles = clesRes.data ?? [];
  const mouvements = mouvementsRes.data ?? [];
  const isAdmin = user.role === "admin";

  const clesActives = cles.filter((c) => c.statut !== "archivee").length;
  const clesRemises = cles.filter((c) => c.statut === "remise").length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button variant="ghost" size="sm" render={<Link href="/biens" />}>
          <ChevronLeft aria-hidden />
          Tous les biens
        </Button>
      </div>

      <header className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{bien.nom}</h1>
            <Badge variant="secondary">{TYPE_LABELS[bien.type]}</Badge>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            {bien.adresse_complete}, {bien.code_postal} {bien.ville}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <BienFormDialog
            mode="edit"
            bien={bien}
            trigger={
              <Button variant="outline">
                <Pencil aria-hidden />
                Éditer
              </Button>
            }
          />
          {isAdmin && (
            <DeleteBienDialog
              bienId={bien.id}
              bienNom={bien.nom}
              redirectTo="/biens"
              trigger={
                <Button variant="outline">
                  <ShieldX aria-hidden />
                  Supprimer
                </Button>
              }
            />
          )}
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <InfoRow icon={Building2} label="Type">
              {TYPE_LABELS[bien.type]}
            </InfoRow>
            <InfoRow icon={MapPin} label="Adresse">
              <div>{bien.adresse_complete}</div>
              <div className="text-muted-foreground text-xs">
                {bien.code_postal} {bien.ville}
              </div>
            </InfoRow>
            {bien.notes && (
              <InfoRow icon={StickyNote} label="Notes">
                <span className="whitespace-pre-wrap">{bien.notes}</span>
              </InfoRow>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Aperçu des clés</CardTitle>
            <CardDescription>État du jeu de clés rattaché.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <InfoRow icon={KeyRound} label="Clés actives">
              {clesActives}
            </InfoRow>
            <InfoRow icon={HandCoins} label="Actuellement remises">
              {clesRemises}
            </InfoRow>
            <InfoRow icon={Hash} label="Total (incl. archivées)">
              {cles.length}
            </InfoRow>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Clés rattachées</CardTitle>
          <CardDescription>
            {cles.length === 0
              ? "Aucune clé créée pour ce bien."
              : `${cles.length} clé${cles.length > 1 ? "s" : ""}.`}
          </CardDescription>
        </CardHeader>
        {cles.length > 0 && (
          <CardContent>
            <ul className="divide-y">
              {cles.map((c) => {
                const detenteur = c.personne_actuelle
                  ? Array.isArray(c.personne_actuelle)
                    ? c.personne_actuelle[0]
                    : c.personne_actuelle
                  : null;
                return (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 first:pt-0 last:pb-0"
                  >
                    <KeyRound
                      aria-hidden
                      className="text-muted-foreground size-4"
                    />
                    <Link
                      href={`/cles/${c.id}`}
                      className="text-primary font-mono text-sm underline-offset-4 transition-colors hover:underline"
                    >
                      {c.code}
                    </Link>
                    <Badge variant={STATUT_VARIANT[c.statut]}>
                      {STATUT_LABELS[c.statut]}
                    </Badge>
                    {detenteur && (
                      <Link
                        href={`/personnes/${detenteur.id}`}
                        className="text-muted-foreground inline-flex items-center gap-1 text-xs transition-colors hover:underline"
                      >
                        <User aria-hidden className="size-3" />
                        {detenteur.prenom} {detenteur.nom}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historique du bien</CardTitle>
          <CardDescription>
            {mouvements.length === 0
              ? "Aucun mouvement enregistré sur les clés de ce bien."
              : `${mouvements.length} mouvement${mouvements.length > 1 ? "s" : ""}, du plus récent au plus ancien.`}
          </CardDescription>
        </CardHeader>
        {mouvements.length > 0 && (
          <CardContent>
            <ol className="relative space-y-6 border-l pl-6">
              {mouvements.map((m) => {
                const Icon = MOUVEMENT_ICONS[m.type];
                const cle = Array.isArray(m.cle) ? m.cle[0] : m.cle;
                const personne = Array.isArray(m.personne)
                  ? m.personne[0]
                  : m.personne;
                const operateur = Array.isArray(m.operateur)
                  ? m.operateur[0]
                  : m.operateur;
                return (
                  <li key={m.id} className="relative">
                    <span
                      className={`absolute -left-[37px] inline-flex size-6 items-center justify-center rounded-full ring-4 ring-background ${MOUVEMENT_RING[m.type]}`}
                    >
                      <Icon aria-hidden className="size-3.5" />
                    </span>
                    <div>
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="text-sm font-medium">
                          {MOUVEMENT_LABELS[m.type]}
                        </span>
                        {cle && (
                          <Link
                            href={`/cles/${cle.id}`}
                            className="text-primary font-mono text-xs underline-offset-4 transition-colors hover:underline"
                          >
                            {cle.code}
                          </Link>
                        )}
                        {personne && (
                          <Link
                            href={`/personnes/${personne.id}`}
                            className="text-muted-foreground text-xs transition-colors hover:underline"
                          >
                            → {personne.prenom} {personne.nom}
                          </Link>
                        )}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {formatDateTime(m.date_mouvement)}
                        {operateur && (
                          <>
                            {" "}
                            · par {operateur.prenom} {operateur.nom}
                          </>
                        )}
                      </div>
                      {m.notes && (
                        <p className="mt-1 text-sm whitespace-pre-wrap">
                          {m.notes}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon
        aria-hidden
        className="text-muted-foreground mt-0.5 size-4 shrink-0"
      />
      <div className="flex-1">
        <div className="text-muted-foreground text-xs">{label}</div>
        <div>{children}</div>
      </div>
    </div>
  );
}
