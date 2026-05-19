"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { recupererCle } from "@/app/(app)/cles/actions";
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
import { Textarea } from "@/components/ui/textarea";

export function RecupererCleDialog({
  cleId,
  cleCode,
  detenteurLabel,
  trigger,
}: {
  cleId: string;
  cleCode: string;
  detenteurLabel: string | null;
  trigger: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open) setNotes("");
  }, [open]);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await recupererCle({
        cleId,
        notes: notes.trim() || undefined,
      });
      if (result.ok) {
        toast.success(result.message ?? "Clé récupérée");
        setOpen(false);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Récupérer la clé {cleCode}</DialogTitle>
          <DialogDescription>
            {detenteurLabel
              ? `Détenue actuellement par ${detenteurLabel}. Confirme le retour au bureau.`
              : "Confirme le retour au bureau."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-3">
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
              placeholder="État de la clé, contexte du retour, etc."
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
            <Button type="submit" disabled={pending}>
              {pending ? "Enregistrement…" : "Confirmer le retour"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
