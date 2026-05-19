"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

// Schéma et types : non exportés (un fichier "use server" ne peut exporter que des
// fonctions async). Les types sont ré-exportés via `export type` qui est effacé
// au build et donc autorisé.
const BIEN_TYPES = [
  "maison",
  "appartement",
  "studio",
  "commerce",
  "garage",
  "autre",
] as const;

const bienSchema = z.object({
  nom: z.string().trim().min(1, "Nom requis").max(200),
  adresse_complete: z.string().trim().min(1, "Adresse requise").max(500),
  code_postal: z
    .string()
    .trim()
    .regex(/^\d{4,5}$/, "Code postal invalide (4 ou 5 chiffres)"),
  ville: z.string().trim().min(1, "Ville requise").max(100),
  type: z.enum(BIEN_TYPES),
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export type BienInput = z.input<typeof bienSchema>;

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
  // Visible dans Vercel Runtime Logs.
  console.error(`[biens/${action}] unhandled:`, err);
  return { ok: false, message: `Erreur serveur (${action}) : ${message}` };
}

export async function createBien(
  input: BienInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = bienSchema.safeParse(input);
    if (!parsed.success) return zodToActionError(parsed.error);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("biens")
      .insert(parsed.data)
      .select("id")
      .single();

    if (error) {
      console.error("[biens/create] supabase error:", error);
      return { ok: false, message: error.message };
    }

    revalidatePath("/biens");
    return { ok: true, data: { id: data.id }, message: "Bien créé." };
  } catch (err) {
    return unexpectedError("create", err);
  }
}

export async function updateBien(
  id: string,
  input: BienInput,
): Promise<ActionResult> {
  try {
    const parsed = bienSchema.safeParse(input);
    if (!parsed.success) return zodToActionError(parsed.error);

    const supabase = await createClient();
    const { error, data } = await supabase
      .from("biens")
      .update(parsed.data)
      .eq("id", id)
      .select("id");

    if (error) {
      console.error("[biens/update] supabase error:", error);
      return { ok: false, message: error.message };
    }
    if (!data || data.length === 0) {
      return { ok: false, message: "Bien introuvable ou accès refusé." };
    }

    revalidatePath("/biens");
    return { ok: true, message: "Bien mis à jour." };
  } catch (err) {
    return unexpectedError("update", err);
  }
}

export async function deleteBien(id: string): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (user.role !== "admin") {
      return { ok: false, message: "Suppression réservée à l'admin." };
    }

    const supabase = await createClient();
    const { error, data } = await supabase
      .from("biens")
      .delete()
      .eq("id", id)
      .select("id");

    if (error) {
      console.error("[biens/delete] supabase error:", error);
      if (error.code === "23503") {
        return {
          ok: false,
          message:
            "Impossible de supprimer : ce bien a des clés avec des mouvements enregistrés. Archive-le plutôt.",
        };
      }
      return { ok: false, message: error.message };
    }
    if (!data || data.length === 0) {
      return { ok: false, message: "Bien introuvable." };
    }

    revalidatePath("/biens");
    return { ok: true, message: "Bien supprimé." };
  } catch (err) {
    return unexpectedError("delete", err);
  }
}
