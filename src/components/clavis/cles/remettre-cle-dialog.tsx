"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { remettreCle } from "@/app/(app)/cles/actions";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type PersonneOption = {
  id: string;
  nom: string;
  prenom: string;
  type: string;
};

const TYPE_SHORT: Record<string, string> = {
  locataire: "Locataire",
  ouvrier: "Ouvrier",
  artisan: "Artisan",
  agent: "Agent immo",
  notaire: "Notaire",
  proprietaire: "Propriétaire",
  autre: "Autre",
};

export function RemettreCleDialog({
  cleId,
  cleCode,
  bienLabel,
  personnes,
  trigger,
}: {
  cleId: string;
  cleCode: string;
  bienLabel: string;
  personnes: PersonneOption[];
  trigger: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [personneId, setPersonneId] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setPersonneId("");
      setNotes("");
    }
  }, [open]);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!personneId) {
      toast.error("Sélectionne une personne.");
      return;
    }
    startTransition(async () => {
      const result = await remettreCle({
        cleId,
        personneId,
        notes: notes.trim() || undefined,
      });
      if (result.ok) {
        toast.success(result.message ?? "Clé remise");
        setOpen(false);
      } else {
        toast.error(result.message);
      }
    });
  }

  const noPersonnes = personnes.length === 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Remettre la clé {cleCode}</DialogTitle>
          <DialogDescription>
            {bienLabel} — choisis la personne qui reçoit la clé.
          </DialogDescription>
        </DialogHeader>

        {noPersonnes ? (
          <p className="text-muted-foreground text-sm">
            Aucune personne enregistrée. Crée d'abord une fiche dans{" "}
            <a href="/personnes" className="underline">
              la section Personnes
            </a>
            .
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <Label htmlFor="personne_id" className="mb-1.5 inline-block">
                Receveur
              </Label>
              <Select
                value={personneId}
                onValueChange={(v) => setPersonneId(v ?? "")}
                disabled={pending}
              >
                <SelectTrigger id="personne_id" className="w-full">
                  <SelectValue placeholder="Choisis une personne" />
                </SelectTrigger>
                <SelectContent>
                  {personnes.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.prenom} {p.nom} — {TYPE_SHORT[p.type] ?? p.type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notes" className="mb-1.5 inline-block">
                Notes (optionnel)
              </Label>
              <Textarea
                id="notes"
                maxLength={2000}
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contexte de la remise, durée prévue, etc."
                disabled={pending}
              />
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={pending || !personneId}>
                {pending ? "Enregistrement…" : "Remettre"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
