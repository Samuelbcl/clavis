"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  type PersonneInput,
  createPersonne,
  updatePersonne,
} from "@/app/(app)/personnes/actions";
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

type PersonneRow = Database["public"]["Tables"]["personnes"]["Row"];
type PersonneType = Database["public"]["Enums"]["personne_type"];

const TYPE_LABELS: Record<PersonneType, string> = {
  locataire: "Locataire",
  ouvrier: "Ouvrier",
  artisan: "Artisan",
  agent: "Agent immobilier",
  notaire: "Notaire",
  proprietaire: "Propriétaire",
  autre: "Autre",
};

function emptyState(): PersonneInput {
  return {
    nom: "",
    prenom: "",
    telephone: "",
    email: "",
    type: "locataire",
    metier: "",
    notes: "",
  };
}

function fromPersonne(p: PersonneRow): PersonneInput {
  return {
    nom: p.nom,
    prenom: p.prenom,
    telephone: p.telephone,
    email: p.email ?? "",
    type: p.type,
    metier: p.metier ?? "",
    notes: p.notes ?? "",
  };
}

export function PersonneFormDialog({
  mode,
  personne,
  trigger,
}: {
  mode: "create" | "edit";
  personne?: PersonneRow;
  trigger: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<PersonneInput>(
    personne ? fromPersonne(personne) : emptyState(),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setValues(personne ? fromPersonne(personne) : emptyState());
      setErrors({});
    }
  }, [open, personne]);

  function set<K extends keyof PersonneInput>(key: K, value: PersonneInput[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createPersonne(values)
          : await updatePersonne(personne!.id, values);

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
            {mode === "create" ? "Nouvelle personne" : "Modifier la personne"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Ajoute une personne susceptible de recevoir une clé."
              : "Modifie les coordonnées et le profil de la personne."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field id="prenom" label="Prénom" error={errors.prenom}>
              <Input
                id="prenom"
                required
                maxLength={100}
                value={values.prenom}
                onChange={(e) => set("prenom", e.target.value)}
                placeholder="Jean"
                disabled={pending}
              />
            </Field>
            <Field id="nom" label="Nom" error={errors.nom}>
              <Input
                id="nom"
                required
                maxLength={100}
                value={values.nom}
                onChange={(e) => set("nom", e.target.value)}
                placeholder="Dupont"
                disabled={pending}
              />
            </Field>
          </div>

          <Field id="telephone" label="Téléphone" error={errors.telephone}>
            <Input
              id="telephone"
              type="tel"
              required
              maxLength={50}
              value={values.telephone}
              onChange={(e) => set("telephone", e.target.value)}
              placeholder="0475 12 34 56"
              disabled={pending}
            />
          </Field>

          <Field id="email" label="Email (optionnel)" error={errors.email}>
            <Input
              id="email"
              type="email"
              maxLength={200}
              value={values.email ?? ""}
              onChange={(e) => set("email", e.target.value)}
              placeholder="jean.dupont@exemple.be"
              disabled={pending}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field id="type" label="Type" error={errors.type}>
              <Select
                value={values.type}
                onValueChange={(v) => set("type", v as PersonneType)}
                disabled={pending}
              >
                <SelectTrigger id="type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TYPE_LABELS) as PersonneType[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field id="metier" label="Métier (optionnel)" error={errors.metier}>
              <Input
                id="metier"
                maxLength={100}
                value={values.metier ?? ""}
                onChange={(e) => set("metier", e.target.value)}
                placeholder="Plombier"
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
              placeholder="Toute info utile : préférences, horaires de contact, etc."
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
                  ? "Créer la personne"
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
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={id} className="mb-1.5 inline-block">
        {label}
      </Label>
      {children}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
