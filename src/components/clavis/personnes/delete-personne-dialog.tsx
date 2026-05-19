"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { deletePersonne } from "@/app/(app)/personnes/actions";
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

export function DeletePersonneDialog({
  personneId,
  personneNom,
  trigger,
}: {
  personneId: string;
  personneNom: string;
  trigger: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function onConfirm() {
    startTransition(async () => {
      const result = await deletePersonne(personneId);
      if (result.ok) {
        toast.success(result.message ?? "Personne supprimée");
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
          <AlertDialogTitle>Supprimer cette personne ?</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-medium">{personneNom}</span> sera retiré
            définitivement. Si elle apparaît dans l'historique des mouvements,
            la suppression sera bloquée — utilise plutôt l'édition pour
            l'archiver.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? "Suppression…" : "Supprimer"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
