"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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

  // Debounce search.
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

  // Compte les filtres autres que la recherche (le bouton "Filtres" reflète
  // ces filtres-là, la search étant toujours visible).
  const activeFilters = [
    statut !== "actives",
    type !== "all",
    bien !== "all",
    personneType !== "all",
  ].filter(Boolean).length;

  function resetSheetFilters() {
    pushParams({
      statut: null,
      type: null,
      bien: null,
      personne_type: null,
    });
  }

  function resetAll() {
    setQ("");
    startTransition(() => router.push(pathname));
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1 sm:max-w-md">
        <Search
          aria-hidden
          className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
        />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Code, bien, adresse, personne, téléphone…"
          className="h-10 pl-9"
        />
      </div>

      <Sheet>
        <SheetTrigger
          render={
            <Button variant="outline" className="h-10 gap-2">
              <SlidersHorizontal aria-hidden className="size-4" />
              <span className="hidden sm:inline">Filtres</span>
              {activeFilters > 0 && (
                <Badge variant="secondary" className="ml-0.5 h-5 px-1.5">
                  {activeFilters}
                </Badge>
              )}
            </Button>
          }
        />
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader className="border-b">
            <SheetTitle>Filtres</SheetTitle>
            <SheetDescription>
              Affine ton tableau de clés selon le statut, le type, le bien ou
              le détenteur.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4">
            <FilterField id="f-statut" label="Statut">
              <Select
                value={statut}
                onValueChange={(v) =>
                  pushParams({ statut: v === "actives" ? null : v })
                }
              >
                <SelectTrigger id="f-statut" className="w-full">
                  <SelectValue>
                    {(val: string) =>
                      STATUT_OPTIONS.find((o) => o.value === val)?.label ?? val
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {STATUT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>

            <FilterField id="f-type" label="Type de clé">
              <Select
                value={type}
                onValueChange={(v) =>
                  pushParams({ type: v === "all" ? null : v })
                }
              >
                <SelectTrigger id="f-type" className="w-full">
                  <SelectValue>
                    {(val: string) =>
                      TYPE_OPTIONS.find((o) => o.value === val)?.label ?? val
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>

            {biens.length > 0 && (
              <FilterField id="f-bien" label="Bien">
                <Select
                  value={bien}
                  onValueChange={(v) =>
                    pushParams({ bien: v === "all" ? null : v })
                  }
                >
                  <SelectTrigger id="f-bien" className="w-full">
                    <SelectValue>
                      {(val: string) => {
                        if (val === "all") return "Tous les biens";
                        const b = biens.find((b) => b.id === val);
                        return b ? `${b.nom} — ${b.ville}` : val;
                      }}
                    </SelectValue>
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
              </FilterField>
            )}

            <FilterField id="f-pt" label="Type de détenteur">
              <Select
                value={personneType}
                onValueChange={(v) =>
                  pushParams({ personne_type: v === "all" ? null : v })
                }
              >
                <SelectTrigger id="f-pt" className="w-full">
                  <SelectValue>
                    {(val: string) =>
                      PERSONNE_TYPE_OPTIONS.find((o) => o.value === val)
                        ?.label ?? val
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PERSONNE_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
          </div>

          <SheetFooter className="border-t">
            <Button
              variant="outline"
              onClick={resetSheetFilters}
              disabled={activeFilters === 0}
            >
              <X aria-hidden />
              Réinitialiser
            </Button>
            <SheetClose
              render={<Button>Voir les résultats</Button>}
            />
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {((params.get("q") ?? "") !== "" || activeFilters > 0) && (
        <Button variant="ghost" size="sm" onClick={resetAll} className="h-10">
          <X aria-hidden />
          <span className="hidden sm:inline">Tout effacer</span>
        </Button>
      )}
    </div>
  );
}

function FilterField({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={id} className="mb-1.5 inline-block text-xs font-medium">
        {label}
      </Label>
      {children}
    </div>
  );
}
