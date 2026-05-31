"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { MencionesNotificaciones } from "@/app/components/MencionesNotificaciones";
import { UserEmailEditor } from "@/app/components/UserEmailEditor";
import { UserPhoneEditor } from "@/app/components/UserPhoneEditor";
import { ROLE_LABELS, type UserRole } from "@/lib/auth/roles";

type DashboardHeaderProps = {
  user: {
    id: string;
    nombre: string;
    rol: UserRole;
    telefono: string | null;
    email: string | null;
  };
};

type NavItem = { href: string; label: string };

function buildNavItems(rol: UserRole): NavItem[] {
  const items: NavItem[] = [
    { href: "/", label: "Dashboard" },
    { href: "/calendario", label: "Calendario" },
    { href: "/directorio", label: "Directorio" },
  ];
  if (rol === "admin") {
    items.push(
      { href: "/admin/comisiones", label: "Comisiones" },
      { href: "/admin/auditoria", label: "Auditoría" },
      { href: "/admin/usuarios", label: "Usuarios" },
    );
  }
  return items;
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const navItems = buildNavItems(user.rol);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-bloom-border bg-bloom-surface/95 backdrop-blur-sm">
      <div className="bloom-header-inner">
        <div className="flex items-center justify-between gap-3">
          {/* Móvil + desktop: logo */}
          <Link href="/" className="flex min-w-0 items-center gap-2.5 md:gap-4">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bloom-accent text-base font-semibold text-white shadow-sm md:h-11 md:w-11 md:text-lg"
              aria-hidden
            >
              B
            </div>
            <div className="min-w-0">
              <p className="font-display text-xl tracking-wide text-bloom-ink md:text-2xl">
                Bloom
              </p>
              <p className="hidden text-sm text-bloom-muted md:block">
                Gestión de bodas
              </p>
            </div>
          </Link>

          {/* Móvil: campana + hamburguesa */}
          <div className="flex shrink-0 items-center gap-1 md:hidden">
            <MencionesNotificaciones userId={user.id} />
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-bloom-border bg-bloom-surface text-bloom-ink transition-colors hover:bg-bloom-canvas"
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              aria-controls="bloom-mobile-nav"
              aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            >
              {menuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>

          {/* Desktop: usuario, campana, nav inline, cerrar sesión */}
          <div className="hidden min-w-0 text-right md:block">
            <p className="text-xs font-medium uppercase tracking-wider text-bloom-muted">
              {ROLE_LABELS[user.rol]}
            </p>
            <p className="font-medium text-bloom-ink">{user.nombre}</p>
            <div className="mt-3 hidden border-t border-bloom-border pt-3 md:block">
              <UserEmailEditor initialEmail={user.email} />
              <UserPhoneEditor initialTelefono={user.telefono} />
            </div>
            <div className="mt-2 flex items-center justify-end gap-2">
              <MencionesNotificaciones userId={user.id} />
              {navItems.map((item) => (
                <NavLink key={item.href} href={item.href} pathname={pathname}>
                  {item.label}
                </NavLink>
              ))}
              <button
                type="button"
                onClick={handleSignOut}
                className="bloom-btn-sm border border-bloom-border bg-bloom-surface text-bloom-ink hover:bg-bloom-canvas"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </div>

      {menuOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/30 md:hidden"
            aria-label="Cerrar menú"
            onClick={() => setMenuOpen(false)}
          />
          <div
            id="bloom-mobile-nav"
            className="fixed inset-y-0 right-0 z-50 flex w-[min(100%,20rem)] flex-col border-l border-bloom-border bg-bloom-surface shadow-xl md:hidden"
          >
            <div className="border-b border-bloom-border px-4 py-4">
              <p className="text-xs font-medium uppercase tracking-wider text-bloom-muted">
                {ROLE_LABELS[user.rol]}
              </p>
              <p className="mt-1 font-medium text-bloom-ink">{user.nombre}</p>
            </div>

            <nav
              className="flex-1 overflow-y-auto px-3 py-3"
              aria-label="Navegación móvil"
            >
              <ul className="space-y-1">
                {navItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex min-h-11 items-center rounded-xl px-4 text-base font-medium transition-colors ${
                        isActivePath(pathname, item.href)
                          ? "bg-bloom-accent text-white"
                          : "text-bloom-ink hover:bg-bloom-canvas"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="space-y-3 border-t border-bloom-border px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <UserEmailEditor initialEmail={user.email} />
              <UserPhoneEditor initialTelefono={user.telefono} />
              <button
                type="button"
                onClick={handleSignOut}
                className="bloom-btn-secondary w-full"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </>
      )}
    </header>
  );
}

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  href,
  pathname,
  children,
}: {
  href: string;
  pathname: string;
  children: React.ReactNode;
}) {
  const active = isActivePath(pathname, href);
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-bloom-accent bg-bloom-accent text-white"
          : "border-bloom-border text-bloom-ink hover:bg-bloom-canvas"
      }`}
    >
      {children}
    </Link>
  );
}

function MenuIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="h-5 w-5"
      aria-hidden
    >
      <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="h-5 w-5"
      aria-hidden
    >
      <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
