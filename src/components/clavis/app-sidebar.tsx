"use client";

import {
  Building2,
  ClipboardClock,
  Home,
  KeyRound,
  LogOut,
  Sparkles,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { signOut } from "@/app/(app)/actions";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const NAV_ITEMS = [
  { href: "/", label: "Tableau de bord", icon: Home },
  { href: "/biens", label: "Biens", icon: Building2 },
  { href: "/cles", label: "Clés", icon: KeyRound },
  { href: "/personnes", label: "Personnes", icon: UsersRound },
  { href: "/historique", label: "Historique", icon: ClipboardClock },
] as const;

function isActive(currentPath: string, href: string): boolean {
  if (href === "/") return currentPath === "/";
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

function initials(prenom?: string, nom?: string, email?: string): string {
  const a = (prenom ?? "").trim()[0] ?? "";
  const b = (nom ?? "").trim()[0] ?? "";
  if (a || b) return (a + b).toUpperCase();
  return (email ?? "?").charAt(0).toUpperCase();
}

export function AppSidebar({
  user,
}: {
  user: {
    email: string;
    role: "admin" | "operateur";
    prenom?: string;
    nom?: string;
  };
}) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  // Ferme le drawer mobile à chaque navigation. No-op sur desktop.
  const closeMobile = () => setOpenMobile(false);

  const displayName =
    [user.prenom, user.nom].filter(Boolean).join(" ").trim() || user.email;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg shadow-sm">
            <KeyRound className="size-4" aria-hidden />
          </div>
          <div className="flex flex-col leading-none group-data-[collapsible=icon]:hidden">
            <span className="text-base font-semibold tracking-tight">
              Clavis
            </span>
            <span className="text-muted-foreground text-[10px] tracking-wider uppercase">
              Gestion de clés
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={
                        <Link href={item.href} onClick={closeMobile} />
                      }
                      isActive={active}
                      tooltip={item.label}
                      className="h-9 font-medium"
                    >
                      <item.icon
                        aria-hidden
                        className={active ? "text-primary" : ""}
                      />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2.5 px-2 py-2 group-data-[collapsible=icon]:hidden">
              <div className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                {initials(user.prenom, user.nom, user.email)}
              </div>
              <div className="flex min-w-0 flex-1 flex-col leading-tight">
                <span
                  className="truncate text-sm font-medium"
                  title={displayName}
                >
                  {displayName}
                </span>
                <span className="text-muted-foreground inline-flex items-center gap-1 text-[10px] tracking-wide uppercase">
                  {user.role === "admin" && (
                    <Sparkles aria-hidden className="size-2.5" />
                  )}
                  {user.role}
                </span>
              </div>
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <form action={signOut}>
              <SidebarMenuButton
                type="submit"
                tooltip="Déconnexion"
                className="h-9 font-medium"
              >
                <LogOut aria-hidden />
                <span>Déconnexion</span>
              </SidebarMenuButton>
            </form>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
