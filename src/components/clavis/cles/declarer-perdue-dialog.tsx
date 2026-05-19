"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { declarerPerdueCle } from "@/app/(app)/cles/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function DeclarerPerdueDialog({
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

  function onConfirm() {
    startTransition(async () => {
      const result = await declarerPerdueCle({
        cleId,
        notes: notes.trim() || undefined,
      });
      if (result.ok) {
        toast.success(result.message ?? "Clé déclarée perdue");
        setOpen(false);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={trigger} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Déclarer {cleCode} perdue ?</AlertDialogTitle>
          <AlertDialogDescription>
            {detenteurLabel
              ? `Détenue par ${detenteurLabel} au moment de la perte. Le statut passera à « Perdue » et l'historique conservera cette information.`
              : "Le statut passera à « Perdue ». La clé reste consultable dans l'historique."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div>
          <Label htmlFor="perdue-notes" className="mb-1.5 inline-block text-xs">
            Notes (optionnel)
          </Label>
          <Textarea
            id="perdue-notes"
            maxLength={2000}
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Circonstances de la perte, démarches en cours…"
            disabled={pending}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? "Enregistrement…" : "Déclarer perdue"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
