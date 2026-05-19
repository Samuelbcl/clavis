"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

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
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database";

type MouvementType = Database["public"]["Enums"]["mouvement_type"];

const TYPE_OPTIONS: { value: MouvementType | "all"; label: string }[] = [
  { value: "all", label: "Tous les types" },
  { value: "remise", label: "Remises" },
  { value: "retour", label: "Retours" },
  { value: "perte", label: "Pertes" },
  { value: "refaite", label: "Refaites" },
];

// Presets de période. La valeur est le nombre de jours OU "all" pour tout.
// "30" est le default historique implicite (pas de param URL).
const PERIODE_PRESETS = [
  { value: "1", label: "24 h" },
  { value: "2", label: "48 h" },
  { value: "7", label: "7 j" },
  { value: "15", label: "15 j" },
  { value: "30", label: "30 j" },
  { value: "all", label: "Tout" },
] as const;

type PresetValue = (typeof PERIODE_PRESETS)[number]["value"];

function getCurrentPreset(params: URLSearchParams): PresetValue | "custom" {
  const periode = params.get("periode");
  // Si l'utilisateur a touché Du/Au manuellement, on bascule en "custom".
  if (params.get("from") || params.get("to")) return "custom";
  if (
    periode &&
    PERIODE_PRESETS.some((p) => p.value === periode)
  ) {
    return periode as PresetValue;
  }
  return "30"; // default
}

export function HistoriqueFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const currentPreset = getCurrentPreset(
    new URLSearchParams(params.toString()),
  );
  const isCustom = currentPreset === "custom";
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const type = params.get("type") ?? "all";

  function pushParams(updates: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    next.delete("page");
    const qs = next.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  function selectPreset(value: PresetValue) {
    // Reset Du/Au quand on choisit un preset.
    pushParams({
      periode: value === "30" ? null : value,
      from: null,
      to: null,
    });
  }

  function toggleCustom() {
    // Bascule vers mode dates libres : on enleve le preset + on init from/to.
    const today = new Date();
    const lastMonth = new Date(today);
    lastMonth.setDate(lastMonth.getDate() - 30);
    pushParams({
      periode: null,
      from: lastMonth.toISOString().slice(0, 10),
      to: today.toISOString().slice(0, 10),
    });
  }

  const periodLabel =
    currentPreset === "custom"
      ? `${formatHumanDate(from)} → ${formatHumanDate(to)}`
      : PERIODE_PRESETS.find((p) => p.value === currentPreset)?.label ?? "30 j";

  const activeFilters =
    (currentPreset !== "30" ? 1 : 0) + (type !== "all" ? 1 : 0);

  const typeLabel =
    type === "all"
      ? null
      : TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;

  function resetAll() {
    startTransition(() => router.push(pathname));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Sheet>
        <SheetTrigger
          render={
            <Button variant="outline" className="h-10 gap-2">
              <SlidersHorizontal aria-hidden className="size-4" />
              <span>Filtres</span>
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
            <SheetTitle>Filtres de l'historique</SheetTitle>
            <SheetDescription>
              Choisis la période et le type de mouvement à afficher.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4">
            <div>
              <Label className="mb-2 inline-block text-xs font-medium">
                Période
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {PERIODE_PRESETS.map((preset) => {
                  const active = currentPreset === preset.value;
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => selectPreset(preset.value)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                        active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background hover:bg-muted",
                      )}
                    >
                      {preset.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={toggleCustom}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    isCustom
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-muted",
                  )}
                >
                  Personnalisé…
                </button>
              </div>
            </div>

            {isCustom && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label
                    htmlFor="f-from"
                    className="mb-1.5 inline-block text-xs font-medium"
                  >
                    Du
                  </Label>
                  <Input
                    id="f-from"
                    type="date"
                    value={from}
                    onChange={(e) =>
                      pushParams({ from: e.target.value || null })
                    }
                    max={to || undefined}
                  />
                </div>
                <div>
                  <Label
                    htmlFor="f-to"
                    className="mb-1.5 inline-block text-xs font-medium"
                  >
                    Au
                  </Label>
                  <Input
                    id="f-to"
                    type="date"
                    value={to}
                    onChange={(e) => pushParams({ to: e.target.value || null })}
                    min={from || undefined}
                  />
                </div>
              </div>
            )}

            <div>
              <Label
                htmlFor="f-type"
                className="mb-1.5 inline-block text-xs font-medium"
              >
                Type de mouvement
              </Label>
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
            </div>
          </div>

          <SheetFooter className="border-t">
            <Button
              variant="outline"
              onClick={resetAll}
              disabled={activeFilters === 0}
            >
              <X aria-hidden />
              Réinitialiser
            </Button>
            <SheetClose render={<Button>Voir les résultats</Button>} />
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
        <span>{periodLabel}</span>
        {typeLabel && (
          <>
            <span aria-hidden>·</span>
            <span>{typeLabel}</span>
          </>
        )}
      </div>

      {activeFilters > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={resetAll}
          className="ml-auto h-10"
        >
          <X aria-hidden />
          <span className="hidden sm:inline">Tout effacer</span>
        </Button>
      )}
    </div>
  );
}

function formatHumanDate(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-BE", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return iso;
  }
}
