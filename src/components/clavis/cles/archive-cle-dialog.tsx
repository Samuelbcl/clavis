"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { setCleArchive } from "@/app/(app)/cles/actions";
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

export function ArchiveCleDialog({
  cleId,
  cleCode,
  archive,
  trigger,
}: {
  cleId: string;
  cleCode: string;
  archive: boolean; // true = archiver, false = désarchiver
  trigger: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function onConfirm() {
    startTransition(async () => {
      const result = await setCleArchive(cleId, archive);
      if (result.ok) {
        toast.success(result.message ?? "Mis à jour");
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
          <AlertDialogTitle>
            {archive
              ? `Archiver la clé ${cleCode} ?`
              : `Réactiver la clé ${cleCode} ?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {archive
              ? "La clé n'apparaîtra plus dans les listes de remise. Son historique de mouvements reste consultable. Tu pourras la réactiver à tout moment."
              : "La clé sera à nouveau disponible pour des remises. Son statut repassera à « disponible »."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            variant={archive ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={pending}
          >
            {pending
              ? "…"
              : archive
                ? "Archiver"
                : "Réactiver"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
