"use client";

import {
  Building2,
  History,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Users,
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
  { href: "/", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/biens", label: "Biens", icon: Building2 },
  { href: "/cles", label: "Clés", icon: KeyRound },
  { href: "/personnes", label: "Personnes", icon: Users },
  { href: "/historique", label: "Historique", icon: History },
] as const;

function isActive(currentPath: string, href: string): boolean {
  if (href === "/") return currentPath === "/";
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

export function AppSidebar({
  user,
}: {
  user: { email: string; role: "admin" | "operateur" };
}) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  // Ferme le drawer mobile à chaque navigation. No-op sur desktop.
  const closeMobile = () => setOpenMobile(false);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <KeyRound className="size-5 text-primary" aria-hidden />
          <span className="font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
            Clavis
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={<Link href={item.href} onClick={closeMobile} />}
                    isActive={isActive(pathname, item.href)}
                    tooltip={item.label}
                  >
                    <item.icon aria-hidden />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex flex-col gap-0.5 px-2 py-1.5 text-xs group-data-[collapsible=icon]:hidden">
              <span className="text-muted-foreground">Connecté en tant que</span>
              <span className="truncate font-medium" title={user.email}>
                {user.email}
              </span>
              <span className="text-muted-foreground capitalize">
                {user.role}
              </span>
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <form action={signOut}>
              <SidebarMenuButton type="submit" tooltip="Déconnexion">
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
