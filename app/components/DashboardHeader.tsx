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
    <>
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
    </header>

      {menuOpen && (
        <div className="md:hidden">
          <button
            type="button"
            className="fixed inset-0 z-[100] bg-black/50"
            aria-label="Cerrar menú"
            onClick={() => setMenuOpen(false)}
          />
          <aside
            id="bloom-mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-label="Menú de navegación"
            className="fixed inset-y-0 right-0 z-[110] flex h-full w-[80vw] max-w-sm flex-col bg-white shadow-2xl"
          >
            <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-4 pt-5">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-bloom-ink">{user.nombre}</p>
                <p className="mt-0.5 text-xs font-medium uppercase tracking-wider text-bloom-muted">
                  {ROLE_LABELS[user.rol]}
                </p>
              </div>
              <button
                type="button"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-bloom-border bg-white text-bloom-ink transition-colors hover:bg-bloom-canvas"
                onClick={() => setMenuOpen(false)}
                aria-label="Cerrar menú"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="shrink-0 border-t border-bloom-border" />

            <nav
              className="min-h-0 flex-1 overflow-y-auto px-3 py-3"
              aria-label="Navegación móvil"
            >
              <ul className="space-y-1">
                {navItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
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

            <div className="shrink-0 border-t border-bloom-border" />

            <div className="shrink-0 space-y-2 px-5 py-4">
              <UserEmailEditor initialEmail={user.email} />
              <UserPhoneEditor initialTelefono={user.telefono} />
            </div>

            <div className="shrink-0 border-t border-bloom-border" />

            <div className="shrink-0 px-5 py-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-red-300 bg-red-50 px-5 py-2.5 text-base font-medium text-red-700 transition-colors hover:bg-red-100"
              >
                Cerrar sesión
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
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
