import {
  Building2,
  HandCoins,
  KeyRound,
  Plus,
  RefreshCw,
  ShieldX,
  Undo2,
  Users,
} from "lucide-react";
import Link from "next/link";

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

const MOUVEMENT_VARIANT: Record<
  MouvementType,
  "default" | "secondary" | "destructive" | "outline"
> = {
  remise: "secondary",
  retour: "default",
  perte: "destructive",
  refaite: "outline",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-BE", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const supabase = await createClient();

  // Toutes les requêtes en parallèle pour minimiser le TTFB.
  const [biensRes, clesRes, personnesRes, mouvementsRes] = await Promise.all([
    supabase.from("biens").select("*", { count: "exact", head: true }),
    supabase.from("cles").select("statut"),
    supabase.from("personnes").select("*", { count: "exact", head: true }),
    supabase
      .from("mouvements")
      .select(
        `id, type, date_mouvement, notes,
         cle:cles!inner (id, code),
         personne:personnes (id, nom, prenom)`,
      )
      .order("date_mouvement", { ascending: false })
      .limit(5),
  ]);

  const biensCount = biensRes.count ?? 0;
  const personnesCount = personnesRes.count ?? 0;

  const cles = clesRes.data ?? [];
  // Total = clés actives (non archivées).
  const clesActives = cles.filter((c) => c.statut !== "archivee").length;
  const clesRemises = cles.filter((c) => c.statut === "remise").length;
  const clesDisponibles = cles.filter((c) => c.statut === "disponible").length;
  const clesPerdues = cles.filter((c) => c.statut === "perdue").length;

  const recentMouvements = mouvementsRes.data ?? [];

  const isOnboarding = biensCount === 0;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">
          Bonjour {user.prenom || ""}
        </h1>
        <p className="text-muted-foreground text-sm">
          Vue d'ensemble du parc et des derniers mouvements.
        </p>
      </header>

      {isOnboarding ? (
        <Card>
          <CardHeader>
            <CardTitle>Premiers pas</CardTitle>
            <CardDescription>
              L'app est vide. Voici la marche à suivre pour t'y mettre :
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <OnboardingStep
              num={1}
              icon={Building2}
              title="Ajouter tes biens"
              description="Maisons, appartements, garages… commence par déclarer ton parc."
              href="/biens"
              cta="Aller aux biens"
            />
            <OnboardingStep
              num={2}
              icon={KeyRound}
              title="Créer les clés rattachées"
              description="Chaque clé est associée à un bien. Le code peut être auto-généré (CLV-0001, CLV-0002…)."
              href="/cles"
              cta="Aller aux clés"
            />
            <OnboardingStep
              num={3}
              icon={Users}
              title="Saisir les personnes"
              description="Locataires, ouvriers, artisans — tous ceux à qui tu prêtes des clés."
              href="/personnes"
              cta="Aller aux personnes"
            />
            <OnboardingStep
              num={4}
              icon={HandCoins}
              title="Remettre une clé"
              description="Depuis la fiche d'une clé disponible, utilise l'action « Remettre » pour tracer la remise."
              href="/cles"
              cta="Voir les clés"
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={Building2}
              label="Biens"
              value={biensCount}
              href="/biens"
            />
            <StatCard
              icon={KeyRound}
              label="Clés actives"
              value={clesActives}
              hint={
                clesPerdues > 0
                  ? `dont ${clesPerdues} déclarée${clesPerdues > 1 ? "s" : ""} perdue${clesPerdues > 1 ? "s" : ""}`
                  : undefined
              }
              href="/cles"
            />
            <StatCard
              icon={HandCoins}
              label="Clés remises"
              value={clesRemises}
              hint={`${clesDisponibles} disponible${clesDisponibles > 1 ? "s" : ""} au bureau`}
              href="/cles?statut=remise"
            />
            <StatCard
              icon={Users}
              label="Personnes"
              value={personnesCount}
              href="/personnes"
            />
          </div>

          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-base">Activité récente</CardTitle>
                <CardDescription>
                  {recentMouvements.length === 0
                    ? "Aucun mouvement enregistré pour l'instant."
                    : `Les ${recentMouvements.length} derniers mouvements.`}
                </CardDescription>
              </div>
              {recentMouvements.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  render={<Link href="/historique" />}
                >
                  Voir tout
                </Button>
              )}
            </CardHeader>
            {recentMouvements.length > 0 && (
              <CardContent>
                <ul className="divide-y">
                  {recentMouvements.map((m) => {
                    const Icon = MOUVEMENT_ICONS[m.type];
                    const cle = Array.isArray(m.cle) ? m.cle[0] : m.cle;
                    const personne = Array.isArray(m.personne)
                      ? m.personne[0]
                      : m.personne;
                    return (
                      <li
                        key={m.id}
                        className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                      >
                        <Badge
                          variant={MOUVEMENT_VARIANT[m.type]}
                          className="gap-1.5"
                        >
                          <Icon aria-hidden className="size-3" />
                          {MOUVEMENT_LABELS[m.type]}
                        </Badge>
                        {cle && (
                          <Link
                            href={`/cles/${cle.id}`}
                            className="font-mono text-sm hover:underline"
                          >
                            {cle.code}
                          </Link>
                        )}
                        {personne && (
                          <span className="text-muted-foreground text-sm">
                            → {personne.prenom} {personne.nom}
                          </span>
                        )}
                        <span className="text-muted-foreground ml-auto text-xs">
                          {formatDateTime(m.date_mouvement)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  href,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: number;
  hint?: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group block transition-opacity hover:opacity-80"
    >
      <Card size="sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            {label}
          </span>
          <Icon aria-hidden className="text-muted-foreground size-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tabular-nums">{value}</div>
          {hint && (
            <p className="text-muted-foreground mt-0.5 text-xs">{hint}</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function OnboardingStep({
  num,
  icon: Icon,
  title,
  description,
  href,
  cta,
}: {
  num: number;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  description: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-medium">
        {num}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 font-medium">
          <Icon aria-hidden className="size-4" />
          {title}
        </div>
        <p className="text-muted-foreground mt-0.5 text-sm">{description}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          render={<Link href={href} />}
        >
          <Plus aria-hidden />
          {cta}
        </Button>
      </div>
    </div>
  );
}
