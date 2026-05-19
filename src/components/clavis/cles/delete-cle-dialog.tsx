"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { deleteCle } from "@/app/(app)/cles/actions";
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

export function DeleteCleDialog({
  cleId,
  cleCode,
  trigger,
  redirectTo,
}: {
  cleId: string;
  cleCode: string;
  trigger: React.ReactElement;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function onConfirm() {
    startTransition(async () => {
      const result = await deleteCle(cleId);
      if (result.ok) {
        toast.success(result.message ?? "Clé supprimée");
        setOpen(false);
        if (redirectTo) router.push(redirectTo);
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
          <AlertDialogTitle>Supprimer la clé {cleCode} ?</AlertDialogTitle>
          <AlertDialogDescription>
            Suppression définitive. Cette action n'est possible que si la clé
            n'a aucun mouvement enregistré. Sinon, archive-la plutôt pour
            préserver l'historique.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? "Suppression…" : "Supprimer définitivement"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
