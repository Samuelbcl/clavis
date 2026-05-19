"use client";

import { X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

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
    // Reset la pagination à chaque changement de filtre.
    next.delete("page");
    const qs = next.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  const hasFilters =
    params.get("from") !== null ||
    params.get("to") !== null ||
    (type !== "all");

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap">
      <div className="flex-1 sm:max-w-[180px]">
        <Label htmlFor="from" className="mb-1.5 inline-block text-xs">
          Du
        </Label>
        <Input
          id="from"
          type="date"
          value={from}
          onChange={(e) => pushParams({ from: e.target.value || null })}
          max={to}
        />
      </div>

      <div className="flex-1 sm:max-w-[180px]">
        <Label htmlFor="to" className="mb-1.5 inline-block text-xs">
          Au
        </Label>
        <Input
          id="to"
          type="date"
          value={to}
          onChange={(e) => pushParams({ to: e.target.value || null })}
          min={from}
        />
      </div>

      <div className="flex-1 sm:max-w-[180px]">
        <Label htmlFor="type" className="mb-1.5 inline-block text-xs">
          Type
        </Label>
        <Select
          value={type}
          onValueChange={(v) => pushParams({ type: v === "all" ? null : v })}
        >
          <SelectTrigger id="type" className="w-full">
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

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
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
