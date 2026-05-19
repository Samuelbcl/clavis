"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

const CLE_TYPES = [
  "porte_entree",
  "garage",
  "cave",
  "boite_aux_lettres",
  "badge_immeuble",
  "autre",
] as const;

const cleSchema = z.object({
  bien_id: z.string().uuid("Bien requis"),
  code: z
    .string()
    .trim()
    .max(50)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : "")),
  type: z.enum(CLE_TYPES),
  description: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export type CleInput = z.input<typeof cleSchema>;

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
  console.error(`[cles/${action}] unhandled:`, err);
  return { ok: false, message: `Erreur serveur (${action}) : ${message}` };
}

// Génère le prochain code dispo au format CLV-XXXX (padding 4).
// Le padding garantit que le tri alpha == tri numérique jusqu'à CLV-9999.
async function nextAutoCode(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string> {
  const { data } = await supabase
    .from("cles")
    .select("code")
    .like("code", "CLV-%")
    .order("code", { ascending: false })
    .limit(1);

  if (!data || data.length === 0) return "CLV-0001";

  const match = data[0].code.match(/^CLV-(\d+)$/);
  if (!match) return "CLV-0001";

  const next = Number.parseInt(match[1], 10) + 1;
  return `CLV-${String(next).padStart(4, "0")}`;
}

export async function createCle(
  input: CleInput,
): Promise<ActionResult<{ id: string; code: string }>> {
  try {
    const user = await getCurrentUser();
    if (user.role !== "admin") {
      return { ok: false, message: "Création de clé réservée à l'admin." };
    }

    const parsed = cleSchema.safeParse(input);
    if (!parsed.success) return zodToActionError(parsed.error);

    const supabase = await createClient();
    const code = parsed.data.code || (await nextAutoCode(supabase));

    const { data, error } = await supabase
      .from("cles")
      .insert({
        bien_id: parsed.data.bien_id,
        code,
        type: parsed.data.type,
        description: parsed.data.description,
      })
      .select("id, code")
      .single();

    if (error) {
      console.error("[cles/create] supabase error:", error);
      if (error.code === "23505") {
        return {
          ok: false,
          message: `Code « ${code} » déjà utilisé. Choisis-en un autre ou laisse vide pour auto.`,
          fieldErrors: { code: "Déjà utilisé" },
        };
      }
      return { ok: false, message: error.message };
    }

    revalidatePath("/cles");
    return {
      ok: true,
      data: { id: data.id, code: data.code },
      message: `Clé ${data.code} créée.`,
    };
  } catch (err) {
    return unexpectedError("create", err);
  }
}

export async function updateCle(
  id: string,
  input: CleInput,
): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (user.role !== "admin") {
      return { ok: false, message: "Modification réservée à l'admin." };
    }

    const parsed = cleSchema.safeParse(input);
    if (!parsed.success) return zodToActionError(parsed.error);

    // Si le code a été vidé, ne pas écraser le code existant (l'auto-gen est
    // pour la création uniquement).
    const updatePayload: {
      bien_id: string;
      type: (typeof CLE_TYPES)[number];
      description: string | null;
      code?: string;
    } = {
      bien_id: parsed.data.bien_id,
      type: parsed.data.type,
      description: parsed.data.description,
    };
    if (parsed.data.code) updatePayload.code = parsed.data.code;

    const supabase = await createClient();
    const { error, data } = await supabase
      .from("cles")
      .update(updatePayload)
      .eq("id", id)
      .select("id");

    if (error) {
      console.error("[cles/update] supabase error:", error);
      if (error.code === "23505") {
        return {
          ok: false,
          message: "Ce code est déjà utilisé par une autre clé.",
          fieldErrors: { code: "Déjà utilisé" },
        };
      }
      return { ok: false, message: error.message };
    }
    if (!data || data.length === 0) {
      return { ok: false, message: "Clé introuvable ou accès refusé." };
    }

    revalidatePath("/cles");
    return { ok: true, message: "Clé mise à jour." };
  } catch (err) {
    return unexpectedError("update", err);
  }
}

// Remet une clé à une personne : INSERT mouvement type='remise'.
// Le trigger DB sync_cle_on_mouvement met à jour cles.statut + personne_actuelle_id.
export async function remettreCle(input: {
  cleId: string;
  personneId: string;
  notes?: string;
}): Promise<ActionResult<{ mouvementId: string }>> {
  try {
    if (!input.cleId || !input.personneId) {
      return { ok: false, message: "Clé et personne requises." };
    }

    const user = await getCurrentUser();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("mouvements")
      .insert({
        cle_id: input.cleId,
        personne_id: input.personneId,
        type: "remise",
        operateur_id: user.id,
        notes: input.notes?.trim() || null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[cles/remettre] supabase error:", error);
      return { ok: false, message: error.message };
    }

    revalidatePath("/cles");
    revalidatePath("/historique");
    return {
      ok: true,
      data: { mouvementId: data.id },
      message: "Clé remise.",
    };
  } catch (err) {
    return unexpectedError("remettre", err);
  }
}

// Récupère une clé : INSERT mouvement type='retour'.
// On préserve personne_id = détenteur actuel (avant que le trigger ne le clear)
// pour garder dans l'historique qui a rendu la clé.
export async function recupererCle(input: {
  cleId: string;
  notes?: string;
}): Promise<ActionResult<{ mouvementId: string }>> {
  try {
    if (!input.cleId) {
      return { ok: false, message: "Clé requise." };
    }

    const user = await getCurrentUser();
    const supabase = await createClient();

    // Capture le détenteur actuel avant que le trigger ne le clear.
    const { data: cle } = await supabase
      .from("cles")
      .select("personne_actuelle_id")
      .eq("id", input.cleId)
      .single();

    const { data, error } = await supabase
      .from("mouvements")
      .insert({
        cle_id: input.cleId,
        personne_id: cle?.personne_actuelle_id ?? null,
        type: "retour",
        operateur_id: user.id,
        notes: input.notes?.trim() || null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[cles/recuperer] supabase error:", error);
      return { ok: false, message: error.message };
    }

    revalidatePath("/cles");
    revalidatePath("/historique");
    return {
      ok: true,
      data: { mouvementId: data.id },
      message: "Clé récupérée.",
    };
  } catch (err) {
    return unexpectedError("recuperer", err);
  }
}

// Toggle archivage : 'archivee' <-> 'disponible'.
// On ne supprime jamais une clé (les mouvements doivent rester traçables).
export async function setCleArchive(
  id: string,
  archive: boolean,
): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (user.role !== "admin") {
      return { ok: false, message: "Action réservée à l'admin." };
    }

    const supabase = await createClient();
    const { error, data } = await supabase
      .from("cles")
      .update({ statut: archive ? "archivee" : "disponible" })
      .eq("id", id)
      .select("id, code");

    if (error) {
      console.error("[cles/setArchive] supabase error:", error);
      return { ok: false, message: error.message };
    }
    if (!data || data.length === 0) {
      return { ok: false, message: "Clé introuvable." };
    }

    revalidatePath("/cles");
    return {
      ok: true,
      message: archive
        ? `Clé ${data[0].code} archivée.`
        : `Clé ${data[0].code} réactivée.`,
    };
  } catch (err) {
    return unexpectedError("setArchive", err);
  }
}
