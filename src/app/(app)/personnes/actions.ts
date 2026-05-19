"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

const PERSONNE_TYPES = [
  "locataire",
  "ouvrier",
  "artisan",
  "agent",
  "notaire",
  "proprietaire",
  "autre",
] as const;

// Normalise un numéro tapé librement par l'utilisateur (BE-friendly).
// - retire espaces, points, tirets, parenthèses
// - "0032..." → "+32..."
// - "00<cc>..." → "+<cc>..."
// - "0..." (pas de +) → "+32..." (default Belgique, le client cible étant belge)
// - "+..." conservé tel quel
// Pas de validation stricte côté DB : on stocke ce qu'on a après nettoyage.
function normalizePhone(raw: string): string {
  const cleaned = raw.replace(/[\s.\-()]/g, "");
  if (cleaned.startsWith("0032")) return "+32" + cleaned.slice(4);
  if (cleaned.startsWith("00")) return "+" + cleaned.slice(2);
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("0")) return "+32" + cleaned.slice(1);
  return cleaned;
}

const personneSchema = z.object({
  nom: z.string().trim().min(1, "Nom requis").max(100),
  prenom: z.string().trim().min(1, "Prénom requis").max(100),
  telephone: z
    .string()
    .trim()
    .min(1, "Téléphone requis")
    .max(50)
    .transform(normalizePhone)
    .refine(
      (v) => /^\+?\d{7,}$/.test(v),
      "Téléphone invalide (au moins 7 chiffres)",
    ),
  email: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => {
      if (!v || v.length === 0) return null;
      return v;
    })
    .refine(
      (v) => v === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      "Email invalide",
    ),
  type: z.enum(PERSONNE_TYPES),
  metier: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export type PersonneInput = z.input<typeof personneSchema>;

type ActionResult<T = void> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

function zodToActionError<T>(error: z.ZodError): ActionResult<T> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    if (path && !fieldErrors[path]) fieldErrors[path] = issue.message;
  }
  return { ok: false, message: "Validation échouée", fieldErrors };
}

function unexpectedError<T>(action: string, err: unknown): ActionResult<T> {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[personnes/${action}] unhandled:`, err);
  return { ok: false, message: `Erreur serveur (${action}) : ${message}` };
}

export async function createPersonne(
  input: PersonneInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = personneSchema.safeParse(input);
    if (!parsed.success) return zodToActionError(parsed.error);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("personnes")
      .insert(parsed.data)
      .select("id")
      .single();

    if (error) {
      console.error("[personnes/create] supabase error:", error);
      return { ok: false, message: error.message };
    }

    revalidatePath("/personnes");
    return { ok: true, data: { id: data.id }, message: "Personne créée." };
  } catch (err) {
    return unexpectedError("create", err);
  }
}

export async function updatePersonne(
  id: string,
  input: PersonneInput,
): Promise<ActionResult> {
  try {
    const parsed = personneSchema.safeParse(input);
    if (!parsed.success) return zodToActionError(parsed.error);

    const supabase = await createClient();
    const { error, data } = await supabase
      .from("personnes")
      .update(parsed.data)
      .eq("id", id)
      .select("id");

    if (error) {
      console.error("[personnes/update] supabase error:", error);
      return { ok: false, message: error.message };
    }
    if (!data || data.length === 0) {
      return { ok: false, message: "Personne introuvable ou accès refusé." };
    }

    revalidatePath("/personnes");
    return { ok: true, message: "Personne mise à jour." };
  } catch (err) {
    return unexpectedError("update", err);
  }
}

export async function deletePersonne(id: string): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (user.role !== "admin") {
      return { ok: false, message: "Suppression réservée à l'admin." };
    }

    const supabase = await createClient();
    const { error, data } = await supabase
      .from("personnes")
      .delete()
      .eq("id", id)
      .select("id");

    if (error) {
      console.error("[personnes/delete] supabase error:", error);
      if (error.code === "23503") {
        return {
          ok: false,
          message:
            "Impossible de supprimer : cette personne apparaît dans l'historique de mouvements. Désactive-la plutôt en modifiant son type.",
        };
      }
      return { ok: false, message: error.message };
    }
    if (!data || data.length === 0) {
      return { ok: false, message: "Personne introuvable." };
    }

    revalidatePath("/personnes");
    return { ok: true, message: "Personne supprimée." };
  } catch (err) {
    return unexpectedError("delete", err);
  }
}
