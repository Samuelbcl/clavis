"use server";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const emailSchema = z.string().trim().toLowerCase().email("Email invalide");

export type SendMagicLinkResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export async function sendMagicLink(
  email: string,
): Promise<SendMagicLinkResult> {
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Email invalide" };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      shouldCreateUser: true,
    },
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  return {
    ok: true,
    message: "Lien envoyé. Vérifie ta boîte mail (et les spams).",
  };
}
