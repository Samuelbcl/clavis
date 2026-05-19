"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";

export function SortableHeader({
  column,
  label,
}: {
  column: string;
  label: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const currentSort = params.get("sort");
  const currentDir = params.get("dir") === "desc" ? "desc" : "asc";
  const isActive = currentSort === column;

  function toggleSort() {
    const next = new URLSearchParams(params.toString());
    if (!isActive) {
      // Première activation : asc.
      next.set("sort", column);
      next.set("dir", "asc");
    } else if (currentDir === "asc") {
      // Active asc → desc.
      next.set("dir", "desc");
    } else {
      // Active desc → reset (revient au tri par défaut côté serveur).
      next.delete("sort");
      next.delete("dir");
    }
    const qs = next.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  const Icon = !isActive ? ArrowUpDown : currentDir === "asc" ? ArrowUp : ArrowDown;

  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-2 h-8 px-2 data-[active=true]:bg-accent"
      data-active={isActive}
      onClick={toggleSort}
    >
      {label}
      <Icon
        aria-hidden
        className={isActive ? "" : "text-muted-foreground/50"}
      />
    </Button>
  );
}
