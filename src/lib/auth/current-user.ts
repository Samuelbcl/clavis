import { redirect } from "next/navigation";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  role: "admin" | "operateur";
};

// cache() : dédupe les appels dans une même requête (le layout + chaque page peuvent
// l'appeler sans payer N queries supabase).
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.email) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id, role, nom, prenom")
    .eq("id", authUser.id)
    .single();

  if (!profile) {
    redirect("/login?error=missing_profile");
  }

  return {
    id: profile.id,
    email: authUser.email,
    nom: profile.nom,
    prenom: profile.prenom,
    role: profile.role,
  };
});
