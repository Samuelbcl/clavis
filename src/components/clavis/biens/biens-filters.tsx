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

type BienType = Database["public"]["Enums"]["bien_type"];

const TYPE_OPTIONS: { value: BienType | "all"; label: string }[] = [
  { value: "all", label: "Tous les types" },
  { value: "maison", label: "Maison" },
  { value: "appartement", label: "Appartement" },
  { value: "studio", label: "Studio" },
  { value: "commerce", label: "Commerce" },
  { value: "garage", label: "Garage" },
  { value: "autre", label: "Autre" },
];

export function BiensFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const [q, setQ] = useState(params.get("q") ?? "");
  const type = params.get("type") ?? "all";

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

  const activeFilters = type !== "all" ? 1 : 0;

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
          placeholder="Rechercher par nom, adresse, ville…"
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
              Affine la liste des biens par type.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4">
            <div>
              <Label
                htmlFor="f-type"
                className="mb-1.5 inline-block text-xs font-medium"
              >
                Type de bien
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
              onClick={() => pushParams({ type: null })}
              disabled={activeFilters === 0}
            >
              <X aria-hidden />
              Réinitialiser
            </Button>
            <SheetClose render={<Button>Voir les résultats</Button>} />
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
