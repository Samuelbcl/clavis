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
import type { Database } from "@/types/database";

type MouvementType = Database["public"]["Enums"]["mouvement_type"];

const TYPE_OPTIONS: { value: MouvementType | "all"; label: string }[] = [
  { value: "all", label: "Tous les types" },
  { value: "remise", label: "Remises" },
  { value: "retour", label: "Retours" },
  { value: "perte", label: "Pertes" },
  { value: "refaite", label: "Refaites" },
];

export function HistoriqueFilters({
  defaultFrom,
  defaultTo,
}: {
  defaultFrom: string;
  defaultTo: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const from = params.get("from") ?? defaultFrom;
  const to = params.get("to") ?? defaultTo;
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

  const hasCustomDate =
    params.get("from") !== null || params.get("to") !== null;
  const activeFilters = [hasCustomDate, type !== "all"].filter(Boolean).length;

  function resetAll() {
    startTransition(() => router.push(pathname));
  }

  // Résumé compact des filtres actifs affiché à côté du bouton.
  const dateLabel =
    !hasCustomDate
      ? "30 derniers jours"
      : `${formatHumanDate(from)} → ${formatHumanDate(to)}`;
  const typeLabel = type === "all" ? null : findTypeLabel(type);

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

          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4">
            <div className="grid grid-cols-2 gap-3">
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
                  max={to}
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
                  min={from}
                />
              </div>
            </div>

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
        <span>{dateLabel}</span>
        {typeLabel && (
          <>
            <span>·</span>
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
  try {
    return new Date(iso).toLocaleDateString("fr-BE", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return iso;
  }
}

function findTypeLabel(value: string): string {
  return TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}
