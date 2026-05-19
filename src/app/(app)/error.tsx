"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Visible dans la console DevTools du browser. Le digest est aussi loggué
    // côté serveur (Vercel Runtime Logs) — on peut faire la correspondance.
    // eslint-disable-next-line no-console
    console.error("[AppError]", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl py-10">
      <Card>
        <CardHeader>
          <CardTitle>Erreur côté serveur</CardTitle>
          <CardDescription>
            Une erreur est survenue pendant le rendu de la page. Le détail est
            masqué en production — partage le digest ci-dessous au dev.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="bg-muted rounded-md p-3 font-mono text-xs">
            <div>
              <span className="text-muted-foreground">Message :</span>{" "}
              {error.message || "(masqué en prod)"}
            </div>
            {error.digest && (
              <div>
                <span className="text-muted-foreground">Digest :</span>{" "}
                {error.digest}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={reset}>Réessayer</Button>
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/")}
            >
              Retour au tableau de bord
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
