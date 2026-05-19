import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/types/database";

const PUBLIC_PATHS = ["/login", "/auth"];

// Détecte la présence d'un cookie d'auth Supabase sans faire d'appel réseau.
// Supabase nomme ses cookies `sb-<project-ref>-auth-token[.X]`.
// On ne valide PAS le token ici — la validation se fait dans le layout
// via supabase.auth.getUser() qui peut aussi rafraîchir la session.
function hasSupabaseAuthCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const hasAuthCookie = hasSupabaseAuthCookie(request);

  // Court-circuit rapide (zéro réseau) :
  //   - Pas de cookie + route protégée → /login direct
  //   - Cookie + on est sur /login → / direct
  if (!hasAuthCookie && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (hasAuthCookie && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Sur route publique sans cookie, ou route protégée avec cookie : on
  // initialise quand même le client supabase. Le refresh de session se
  // fait paresseusement à la première query (via cookies adapter).
  let response = NextResponse.next({ request });

  // Init du client uniquement si on a un cookie à éventuellement rafraîchir.
  // Si pas de cookie sur route publique, inutile de créer le client.
  if (hasAuthCookie) {
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value),
            );
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      },
    );
    // Touch léger pour permettre au client supabase de rafraîchir le token
    // si nécessaire (lit le cookie, pas d'appel réseau si encore valide).
    await supabase.auth.getSession();
  }

  return response;
}
