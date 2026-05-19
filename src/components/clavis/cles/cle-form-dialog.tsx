"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { type CleInput, createCle, updateCle } from "@/app/(app)/cles/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Database } from "@/types/database";

type CleRow = Database["public"]["Tables"]["cles"]["Row"];
type CleType = Database["public"]["Enums"]["cle_type"];

export type BienOption = {
  id: string;
  nom: string;
  ville: string;
};

const TYPE_LABELS: Record<CleType, string> = {
  porte_entree: "Porte d'entrée",
  garage: "Garage",
  cave: "Cave",
  boite_aux_lettres: "Boîte aux lettres",
  badge_immeuble: "Badge immeuble",
  autre: "Autre",
};

function emptyState(firstBienId: string | undefined): CleInput {
  return {
    bien_id: firstBienId ?? "",
    code: "",
    type: "porte_entree",
    description: "",
  };
}

function fromCle(c: CleRow): CleInput {
  return {
    bien_id: c.bien_id,
    code: c.code,
    type: c.type,
    description: c.description ?? "",
  };
}

export function CleFormDialog({
  mode,
  cle,
  biens,
  trigger,
}: {
  mode: "create" | "edit";
  cle?: CleRow;
  biens: BienOption[];
  trigger: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<CleInput>(
    cle ? fromCle(cle) : emptyState(biens[0]?.id),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setValues(cle ? fromCle(cle) : emptyState(biens[0]?.id));
      setErrors({});
    }
  }, [open, cle, biens]);

  function set<K extends keyof CleInput>(key: K, value: CleInput[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createCle(values)
          : await updateCle(cle!.id, values);

      if (result.ok) {
        toast.success(result.message ?? "Enregistré");
        setOpen(false);
      } else {
        if (result.fieldErrors) setErrors(result.fieldErrors);
        toast.error(result.message);
      }
    });
  }

  const noBiens = biens.length === 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Nouvelle clé" : "Modifier la clé"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Ajoute une clé physique rattachée à un bien."
              : "Modifie le rattachement et les détails de la clé. Le statut est géré par les mouvements."}
          </DialogDescription>
        </DialogHeader>

        {noBiens ? (
          <p className="text-muted-foreground text-sm">
            Aucun bien enregistré. Crée d'abord un bien dans{" "}
            <a href="/biens" className="underline">
              la section Biens
            </a>{" "}
            avant d'ajouter une clé.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <Field id="bien_id" label="Bien" error={errors.bien_id}>
              <Select
                value={values.bien_id}
                onValueChange={(v) => set("bien_id", v ?? "")}
                disabled={pending}
              >
                <SelectTrigger id="bien_id" className="w-full">
                  <SelectValue placeholder="Choisis un bien" />
                </SelectTrigger>
                <SelectContent>
                  {biens.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.nom} — {b.ville}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <div className="grid grid-cols-3 gap-3">
              <Field
                id="code"
                label="Code"
                error={errors.code}
                className="col-span-1"
              >
                <Input
                  id="code"
                  maxLength={50}
                  value={values.code ?? ""}
                  onChange={(e) => set("code", e.target.value)}
                  placeholder={mode === "create" ? "Auto si vide" : "CLV-0042"}
                  disabled={pending}
                />
              </Field>
              <Field
                id="type"
                label="Type"
                error={errors.type}
                className="col-span-2"
              >
                <Select
                  value={values.type}
                  onValueChange={(v) => set("type", v as CleType)}
                  disabled={pending}
                >
                  <SelectTrigger id="type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TYPE_LABELS) as CleType[]).map((t) => (
                      <SelectItem key={t} value={t}>
                        {TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field
              id="description"
              label="Description (optionnel)"
              error={errors.description}
            >
              <Textarea
                id="description"
                maxLength={500}
                rows={2}
                value={values.description ?? ""}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Clé Vachette dorée, double, etc."
                disabled={pending}
              />
            </Field>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={pending}>
                {pending
                  ? "Enregistrement…"
                  : mode === "create"
                    ? "Créer la clé"
                    : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({
  id,
  label,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label htmlFor={id} className="mb-1.5 inline-block">
        {label}
      </Label>
      {children}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
