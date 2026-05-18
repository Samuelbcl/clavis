"use client";

import { useState, useTransition } from "react";

import { sendMagicLink, type SendMagicLinkResult } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({ initialError }: { initialError?: string }) {
  const [email, setEmail] = useState("");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<SendMagicLinkResult | null>(
    initialError ? { ok: false, message: initialError } : null,
  );

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const res = await sendMagicLink(email);
      setResult(res);
    });
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Connexion à Clavis</CardTitle>
        <CardDescription>
          Reçois un lien magique par email pour te connecter.
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="space-y-3 px-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="toi@exemple.be"
              disabled={pending || result?.ok === true}
            />
          </div>
          {result && (
            <p
              className={
                result.ok
                  ? "text-sm text-green-700 dark:text-green-400"
                  : "text-destructive text-sm"
              }
              role={result.ok ? "status" : "alert"}
            >
              {result.message}
            </p>
          )}
        </CardContent>
        <CardFooter className="px-4">
          <Button
            type="submit"
            className="w-full"
            disabled={pending || result?.ok === true}
          >
            {pending
              ? "Envoi…"
              : result?.ok
                ? "Lien envoyé ✓"
                : "Recevoir le lien magique"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
