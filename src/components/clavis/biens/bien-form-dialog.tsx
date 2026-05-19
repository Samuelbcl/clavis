"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  type BienInput,
  createBien,
  updateBien,
} from "@/app/(app)/biens/actions";
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

type BienRow = Database["public"]["Tables"]["biens"]["Row"];
type BienType = Database["public"]["Enums"]["bien_type"];

const TYPE_LABELS: Record<BienType, string> = {
  maison: "Maison",
  appartement: "Appartement",
  studio: "Studio",
  commerce: "Commerce",
  garage: "Garage",
  autre: "Autre",
};

function emptyState(): BienInput {
  return {
    nom: "",
    adresse_complete: "",
    code_postal: "",
    ville: "",
    type: "appartement",
    notes: "",
  };
}

function fromBien(b: BienRow): BienInput {
  return {
    nom: b.nom,
    adresse_complete: b.adresse_complete,
    code_postal: b.code_postal,
    ville: b.ville,
    type: b.type,
    notes: b.notes ?? "",
  };
}

export function BienFormDialog({
  mode,
  bien,
  trigger,
}: {
  mode: "create" | "edit";
  bien?: BienRow;
  trigger: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<BienInput>(
    bien ? fromBien(bien) : emptyState(),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  // Reset les valeurs quand on rouvre le dialog (au cas où l'utilisateur a tapé
  // puis annulé, on ne veut pas garder l'état précédent).
  useEffect(() => {
    if (open) {
      setValues(bien ? fromBien(bien) : emptyState());
      setErrors({});
    }
  }, [open, bien]);

  function set<K extends keyof BienInput>(key: K, value: BienInput[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createBien(values)
          : await updateBien(bien!.id, values);

      if (result.ok) {
        toast.success(result.message ?? "Enregistré");
        setOpen(false);
      } else {
        if (result.fieldErrors) setErrors(result.fieldErrors);
        toast.error(result.message);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Nouveau bien" : "Modifier le bien"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Ajoute un bien immobilier au parc."
              : "Modifie les informations du bien."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-3">
          <Field id="type" label="Type" error={errors.type}>
            <Select
              value={values.type}
              onValueChange={(v) => set("type", v as BienType)}
              disabled={pending}
            >
              <SelectTrigger id="type" className="w-full">
                <SelectValue>
                  {(val: string) =>
                    TYPE_LABELS[val as BienType] ?? val
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TYPE_LABELS) as BienType[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field
            id="nom"
            label={
              values.type === "autre"
                ? "Précisez le type"
                : "Nom (identifiant interne)"
            }
            error={errors.nom}
          >
            <Input
              id="nom"
              required
              maxLength={200}
              value={values.nom}
              onChange={(e) => set("nom", e.target.value)}
              placeholder={
                values.type === "autre"
                  ? "Cabane de jardin, terrain, bureau partagé…"
                  : "App 4B, Étage 2, La Maison du Bois…"
              }
              disabled={pending}
            />
          </Field>

          <Field
            id="adresse_complete"
            label="Adresse"
            error={errors.adresse_complete}
          >
            <Input
              id="adresse_complete"
              required
              maxLength={500}
              value={values.adresse_complete}
              onChange={(e) => set("adresse_complete", e.target.value)}
              placeholder="Rue de la Paix 12"
              disabled={pending}
            />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field
              id="code_postal"
              label="Code postal"
              error={errors.code_postal}
              className="col-span-1"
            >
              <Input
                id="code_postal"
                required
                inputMode="numeric"
                pattern="\d{4,5}"
                maxLength={5}
                value={values.code_postal}
                onChange={(e) => set("code_postal", e.target.value)}
                placeholder="1000"
                disabled={pending}
              />
            </Field>
            <Field
              id="ville"
              label="Ville"
              error={errors.ville}
              className="col-span-2"
            >
              <Input
                id="ville"
                required
                maxLength={100}
                value={values.ville}
                onChange={(e) => set("ville", e.target.value)}
                placeholder="Bruxelles"
                disabled={pending}
              />
            </Field>
          </div>

          <Field id="notes" label="Notes (optionnel)" error={errors.notes}>
            <Textarea
              id="notes"
              maxLength={2000}
              rows={3}
              value={values.notes ?? ""}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Code interphone, particularité d'accès, etc."
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
                  ? "Créer le bien"
                  : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
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
