"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Database } from "@/types/database";

type CleType = Database["public"]["Enums"]["cle_type"];
type CleStatut = Database["public"]["Enums"]["cle_statut"];
type PersonneType = Database["public"]["Enums"]["personne_type"];

const STATUT_OPTIONS: { value: CleStatut | "all" | "actives"; label: string }[] = [
  { value: "actives", label: "Actives (hors archivées)" },
  { value: "all", label: "Toutes" },
  { value: "disponible", label: "Disponibles" },
  { value: "remise", label: "Remises" },
  { value: "perdue", label: "Perdues" },
  { value: "refaite", label: "Refaites" },
  { value: "archivee", label: "Archivées" },
];

const TYPE_OPTIONS: { value: CleType | "all"; label: string }[] = [
  { value: "all", label: "Tous les types" },
  { value: "porte_entree", label: "Porte d'entrée" },
  { value: "garage", label: "Garage" },
  { value: "cave", label: "Cave" },
  { value: "boite_aux_lettres", label: "Boîte aux lettres" },
  { value: "badge_immeuble", label: "Badge immeuble" },
  { value: "autre", label: "Autre" },
];

const PERSONNE_TYPE_OPTIONS: { value: PersonneType | "all"; label: string }[] = [
  { value: "all", label: "Tous détenteurs" },
  { value: "locataire", label: "Locataire" },
  { value: "ouvrier", label: "Ouvrier" },
  { value: "artisan", label: "Artisan" },
  { value: "agent", label: "Agent immo" },
  { value: "notaire", label: "Notaire" },
  { value: "proprietaire", label: "Propriétaire" },
  { value: "autre", label: "Autre" },
];

export function ClesFilters({
  biens,
}: {
  biens: { id: string; nom: string; ville: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const [q, setQ] = useState(params.get("q") ?? "");
  const statut = params.get("statut") ?? "actives";
  const type = params.get("type") ?? "all";
  const bien = params.get("bien") ?? "all";
  const personneType = params.get("personne_type") ?? "all";

  useEffect(() => {
    const current = params.get("q") ?? "";
    if (q === current) return;
    const timer = setTimeout(() => {
      pushParams({ q: q || null });
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function pushParams(updates: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  const hasFilters =
    (params.get("q") ?? "") !== "" ||
    statut !== "actives" ||
    type !== "all" ||
    bien !== "all" ||
    personneType !== "all";

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative flex-1 sm:max-w-xs">
        <Search
          aria-hidden
          className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
        />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Code, description…"
          className="pl-8"
        />
      </div>

      <Select
        value={statut}
        onValueChange={(v) => pushParams({ statut: v === "actives" ? null : v })}
      >
        <SelectTrigger className="w-full sm:w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUT_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={type}
        onValueChange={(v) => pushParams({ type: v === "all" ? null : v })}
      >
        <SelectTrigger className="w-full sm:w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TYPE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {biens.length > 0 && (
        <Select
          value={bien}
          onValueChange={(v) => pushParams({ bien: v === "all" ? null : v })}
        >
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les biens</SelectItem>
            {biens.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.nom} — {b.ville}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select
        value={personneType}
        onValueChange={(v) =>
          pushParams({ personne_type: v === "all" ? null : v })
        }
      >
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PERSONNE_TYPE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setQ("");
            startTransition(() => router.push(pathname));
          }}
        >
          <X aria-hidden />
          Réinitialiser
        </Button>
      )}
    </div>
  );
}
