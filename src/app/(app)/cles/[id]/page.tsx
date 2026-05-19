import {
  Archive,
  ArchiveRestore,
  Building2,
  ChevronLeft,
  HandCoins,
  Hash,
  Mail,
  Pencil,
  Phone,
  RefreshCw,
  ShieldX,
  Trash2,
  Undo2,
  User,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArchiveCleDialog } from "@/components/clavis/cles/archive-cle-dialog";
import { CleFormDialog } from "@/components/clavis/cles/cle-form-dialog";
import { DeclarerPerdueDialog } from "@/components/clavis/cles/declarer-perdue-dialog";
import { DeleteCleDialog } from "@/components/clavis/cles/delete-cle-dialog";
import { RecupererCleDialog } from "@/components/clavis/cles/recuperer-cle-dialog";
import { RemettreCleDialog } from "@/components/clavis/cles/remettre-cle-dialog";
import { PhoneLink } from "@/components/clavis/phone-link";
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

type CleStatut = Database["public"]["Enums"]["cle_statut"];
type CleType = Database["public"]["Enums"]["cle_type"];
type MouvementType = Database["public"]["Enums"]["mouvement_type"];

const TYPE_LABELS: Record<CleType, string> = {
  porte_entree: "Porte d'entrée",
  garage: "Garage",
  cave: "Cave",
  boite_aux_lettres: "Boîte aux lettres",
  badge_immeuble: "Badge immeuble",
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
  retour: "Retour au bureau",
  perte: "Déclarée perdue",
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
  const d = new Date(iso);
  return d.toLocaleString("fr-BE", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function CleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const supabase = await createClient();

  // 4 requêtes en parallèle : ~4x plus rapide qu'en série. Le mouvements query
  // utilise l'id de l'URL (pas besoin d'attendre cleRes pour avoir cleId).
  const [cleRes, biensRes, personnesRes, mouvementsRes] = await Promise.all([
    supabase
      .from("cles_view")
      .select(
        `id, code, type, statut, description, bien_id, personne_actuelle_id, created_at, updated_at,
         bien_nom, bien_adresse_complete, bien_code_postal, bien_ville, bien_type,
         personne_nom, personne_prenom, personne_telephone, personne_email, personne_type`,
      )
      .eq("id", id)
      .single(),
    supabase.from("biens").select("id, nom, ville").order("nom"),
    supabase
      .from("personnes")
      .select("id, nom, prenom, type")
      .order("nom")
      .order("prenom"),
    supabase
      .from("mouvements")
      .select(
        `id, type, date_mouvement, notes, confirmee_par_receveur, date_confirmation,
         personne:personnes (id, nom, prenom, telephone, type),
         operateur:users!mouvements_operateur_id_fkey (id, nom, prenom)`,
      )
      .eq("cle_id", id)
      .order("date_mouvement", { ascending: false }),
  ]);

  const { data: cle, error: cleError } = cleRes;
  if (cleError || !cle || !cle.id || !cle.code) {
    notFound();
  }

  const cleId = cle.id;
  const cleCode = cle.code;
  const cleType = cle.type!;
  const cleStatut = cle.statut!;
  const cleBienId = cle.bien_id!;
  const biens = biensRes.data ?? [];
  const personnes = personnesRes.data ?? [];
  const mouvements = mouvementsRes.data ?? [];

  const canRemettre = cleStatut === "disponible";
  const canRecuperer = cleStatut === "remise";
  const canDeclarerPerdue =
    cleStatut !== "perdue" &&
    cleStatut !== "archivee" &&
    cleStatut !== "refaite";
  const isAdmin = user.role === "admin";
  const detenteurLabel =
    cle.personne_nom && cle.personne_prenom
      ? `${cle.personne_prenom} ${cle.personne_nom}`
      : null;
  const bienLabel = cle.bien_nom
    ? `${cle.bien_nom} — ${cle.bien_ville ?? ""}`
    : "—";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button variant="ghost" size="sm" render={<Link href="/cles" />}>
          <ChevronLeft aria-hidden />
          Toutes les clés
        </Button>
      </div>

      <header className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-2xl font-bold tracking-tight">
              {cleCode}
            </h1>
            <Badge variant={STATUT_VARIANT[cleStatut]}>
              {STATUT_LABELS[cleStatut]}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            {TYPE_LABELS[cleType]} — {bienLabel}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {canRemettre && (
            <RemettreCleDialog
              cleId={cleId}
              cleCode={cleCode}
              bienLabel={bienLabel}
              personnes={personnes}
              trigger={
                <Button>
                  <HandCoins aria-hidden />
                  Remettre
                </Button>
              }
            />
          )}
          {canRecuperer && (
            <RecupererCleDialog
              cleId={cleId}
              cleCode={cleCode}
              detenteurLabel={detenteurLabel}
              trigger={
                <Button>
                  <Undo2 aria-hidden />
                  Récupérer
                </Button>
              }
            />
          )}
          {canDeclarerPerdue && (
            <DeclarerPerdueDialog
              cleId={cleId}
              cleCode={cleCode}
              detenteurLabel={detenteurLabel}
              trigger={
                <Button variant="outline">
                  <ShieldX aria-hidden />
                  Déclarer perdue
                </Button>
              }
            />
          )}
          {isAdmin && (
            <CleFormDialog
              mode="edit"
              cle={{
                id: cleId,
                bien_id: cleBienId,
                code: cleCode,
                type: cleType,
                description: cle.description,
              }}
              biens={biens}
              trigger={
                <Button variant="outline">
                  <Pencil aria-hidden />
                  Éditer
                </Button>
              }
            />
          )}
          {isAdmin && cleStatut === "archivee" && (
            <ArchiveCleDialog
              cleId={cleId}
              cleCode={cleCode}
              archive={false}
              trigger={
                <Button variant="outline">
                  <ArchiveRestore aria-hidden />
                  Réactiver
                </Button>
              }
            />
          )}
          {isAdmin && cleStatut !== "archivee" && (
            <ArchiveCleDialog
              cleId={cleId}
              cleCode={cleCode}
              archive={true}
              trigger={
                <Button variant="outline">
                  <Archive aria-hidden />
                  Archiver
                </Button>
              }
            />
          )}
          {isAdmin && (
            <DeleteCleDialog
              cleId={cleId}
              cleCode={cleCode}
              redirectTo="/cles"
              trigger={
                <Button variant="outline">
                  <Trash2 aria-hidden />
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
            <InfoRow icon={Hash} label="Code">
              <span className="font-mono">{cleCode}</span>
            </InfoRow>
            <InfoRow icon={Building2} label="Bien">
              {cle.bien_nom && cleBienId ? (
                <div>
                  <Link
                    href={`/biens/${cleBienId}`}
                    className="text-primary underline-offset-4 transition-colors hover:underline"
                  >
                    {cle.bien_nom}
                  </Link>
                  <div className="text-muted-foreground text-xs">
                    {cle.bien_adresse_complete}, {cle.bien_code_postal}{" "}
                    {cle.bien_ville}
                  </div>
                </div>
              ) : (
                "—"
              )}
            </InfoRow>
            {cle.description && (
              <InfoRow icon={Pencil} label="Description">
                {cle.description}
              </InfoRow>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Détenteur actuel</CardTitle>
            <CardDescription>
              {cleStatut === "remise"
                ? "Personne qui détient actuellement la clé."
                : "La clé n'est pas remise."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {detenteurLabel ? (
              <>
                <InfoRow icon={User} label="Nom">
                  {cle.personne_actuelle_id ? (
                    <Link
                      href={`/personnes/${cle.personne_actuelle_id}`}
                      className="text-primary underline-offset-4 transition-colors hover:underline"
                    >
                      {detenteurLabel}
                    </Link>
                  ) : (
                    detenteurLabel
                  )}
                </InfoRow>
                <InfoRow icon={Phone} label="Téléphone">
                  <PhoneLink phone={cle.personne_telephone} />
                </InfoRow>
                {cle.personne_email && (
                  <InfoRow icon={Mail} label="Email">
                    <a
                      href={`mailto:${cle.personne_email}`}
                      className="hover:text-primary transition-colors hover:underline"
                    >
                      {cle.personne_email}
                    </a>
                  </InfoRow>
                )}
              </>
            ) : (
              <p className="text-muted-foreground text-sm">—</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historique</CardTitle>
          <CardDescription>
            {mouvements.length === 0
              ? "Aucun mouvement enregistré."
              : `${mouvements.length} mouvement${mouvements.length > 1 ? "s" : ""} dans l'ordre chronologique inverse.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mouvements.length > 0 && (
            <ol className="relative space-y-6 border-l pl-6">
              {mouvements.map((m) => {
                const Icon = MOUVEMENT_ICONS[m.type];
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
                        {personne && (
                          <span className="text-muted-foreground text-sm">
                            → {personne.prenom} {personne.nom}
                          </span>
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
          )}
        </CardContent>
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
