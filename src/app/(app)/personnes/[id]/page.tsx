import {
  Building2,
  ChevronLeft,
  HandCoins,
  KeyRound,
  Mail,
  Pencil,
  Phone,
  RefreshCw,
  ShieldX,
  StickyNote,
  Undo2,
  User,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DeletePersonneDialog } from "@/components/clavis/personnes/delete-personne-dialog";
import { PersonneFormDialog } from "@/components/clavis/personnes/personne-form-dialog";
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

type MouvementType = Database["public"]["Enums"]["mouvement_type"];
type PersonneType = Database["public"]["Enums"]["personne_type"];

const TYPE_LABELS: Record<PersonneType, string> = {
  locataire: "Locataire",
  ouvrier: "Ouvrier",
  artisan: "Artisan",
  agent: "Agent immobilier",
  notaire: "Notaire",
  proprietaire: "Propriétaire",
  autre: "Autre",
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

export default async function PersonneDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const supabase = await createClient();

  // 3 queries en parallèle.
  const [personneRes, clesRes, mouvementsRes] = await Promise.all([
    supabase
      .from("personnes")
      .select("*")
      .eq("id", id)
      .single(),
    // Clés actuellement détenues par cette personne.
    supabase
      .from("cles")
      .select(
        `id, code, type, statut,
         bien:biens!cles_bien_id_fkey (id, nom, ville)`,
      )
      .eq("personne_actuelle_id", id)
      .order("code"),
    // Historique des mouvements impliquant cette personne.
    supabase
      .from("mouvements")
      .select(
        `id, type, date_mouvement, notes,
         cle:cles!inner (id, code,
           bien:biens!cles_bien_id_fkey (id, nom, ville)
         ),
         operateur:users!mouvements_operateur_id_fkey (id, nom, prenom)`,
      )
      .eq("personne_id", id)
      .order("date_mouvement", { ascending: false })
      .limit(100),
  ]);

  const personne = personneRes.data;
  if (personneRes.error || !personne) {
    notFound();
  }

  const clesActuelles = clesRes.data ?? [];
  const mouvements = mouvementsRes.data ?? [];
  const isAdmin = user.role === "admin";
  const fullName = `${personne.prenom} ${personne.nom}`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button variant="ghost" size="sm" render={<Link href="/personnes" />}>
          <ChevronLeft aria-hidden />
          Toutes les personnes
        </Button>
      </div>

      <header className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{fullName}</h1>
            <Badge variant="secondary">{TYPE_LABELS[personne.type]}</Badge>
            {personne.metier && (
              <Badge variant="outline">{personne.metier}</Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            {clesActuelles.length === 0
              ? "Aucune clé détenue actuellement."
              : `Détient actuellement ${clesActuelles.length} clé${clesActuelles.length > 1 ? "s" : ""}.`}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <PersonneFormDialog
            mode="edit"
            personne={personne}
            trigger={
              <Button variant="outline">
                <Pencil aria-hidden />
                Éditer
              </Button>
            }
          />
          {isAdmin && (
            <DeletePersonneDialog
              personneId={personne.id}
              personneNom={fullName}
              redirectTo="/personnes"
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
            <CardTitle className="text-base">Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <InfoRow icon={User} label="Nom complet">
              {fullName}
            </InfoRow>
            <InfoRow icon={Phone} label="Téléphone">
              <PhoneLink phone={personne.telephone} />
            </InfoRow>
            {personne.email && (
              <InfoRow icon={Mail} label="Email">
                <a
                  href={`mailto:${personne.email}`}
                  className="hover:text-primary transition-colors hover:underline"
                >
                  {personne.email}
                </a>
              </InfoRow>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profil</CardTitle>
            <CardDescription>Catégorie et notes internes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <InfoRow icon={User} label="Type">
              {TYPE_LABELS[personne.type]}
            </InfoRow>
            {personne.metier && (
              <InfoRow
                icon={Pencil}
                label={
                  personne.type === "autre" ? "Précision" : "Métier"
                }
              >
                {personne.metier}
              </InfoRow>
            )}
            {personne.notes && (
              <InfoRow icon={StickyNote} label="Notes">
                <span className="whitespace-pre-wrap">{personne.notes}</span>
              </InfoRow>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Clés détenues actuellement</CardTitle>
          <CardDescription>
            {clesActuelles.length === 0
              ? "Aucune clé en sa possession à cet instant."
              : `${clesActuelles.length} clé${clesActuelles.length > 1 ? "s" : ""} en cours.`}
          </CardDescription>
        </CardHeader>
        {clesActuelles.length > 0 && (
          <CardContent>
            <ul className="divide-y">
              {clesActuelles.map((c) => {
                const bien = c.bien
                  ? Array.isArray(c.bien)
                    ? c.bien[0]
                    : c.bien
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
                    {bien && (
                      <span className="text-muted-foreground text-sm">
                        — {bien.nom}, {bien.ville}
                      </span>
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
          <CardTitle className="text-base">Historique</CardTitle>
          <CardDescription>
            {mouvements.length === 0
              ? "Aucun mouvement impliquant cette personne."
              : `${mouvements.length} mouvement${mouvements.length > 1 ? "s" : ""}, du plus récent au plus ancien.`}
          </CardDescription>
        </CardHeader>
        {mouvements.length > 0 && (
          <CardContent>
            <ol className="relative space-y-6 border-l pl-6">
              {mouvements.map((m) => {
                const Icon = MOUVEMENT_ICONS[m.type];
                const cle = Array.isArray(m.cle) ? m.cle[0] : m.cle;
                const bien = cle?.bien
                  ? Array.isArray(cle.bien)
                    ? cle.bien[0]
                    : cle.bien
                  : null;
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
                        {bien && (
                          <span className="text-muted-foreground text-xs">
                            · {bien.nom}, {bien.ville}
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

// Building2 importé pour usage potentiel; eviter le warning.
void Building2;
