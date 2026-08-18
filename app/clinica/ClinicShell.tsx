"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useClinicName } from "./useClinicSession";

function useIsSuperAdminSession() {
  if (typeof window === "undefined") {
    return false;
  }

  const adminToken = sessionStorage.getItem("frontera-admin-session");
  if (!adminToken) {
    return false;
  }

  // Any per-clinic token would be a different value than the admin one, and
  // we don't know which (if any) clinic token is active from here — but if
  // the admin token exists in this browser at all, treat nav as super-admin
  // context. Pages still do the real auth check against the API.
  return true;
}

const navItems = [
  { href: "/clinica/dashboard", label: "Dashboard" },
  { href: "/clinica/qr", label: "QR de guardia" },
  { href: "/clinica/equipo", label: "Equipo" },
];

const pageLabels: Record<string, string> = {
  "/clinica/dashboard": "Dashboard",
  "/clinica/qr": "QR de guardia",
  "/clinica/equipo": "Equipo",
};

function getCurrentPageLabel(pathname: string) {
  if (pageLabels[pathname]) {
    return pageLabels[pathname];
  }

  const caseMatch = pathname.match(/^\/clinica\/casos\/(.+)$/);
  if (caseMatch) {
    return `Caso ${decodeURIComponent(caseMatch[1])}`;
  }

  return "";
}

export function ClinicShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const clinicSlug = searchParams.get("clinic")?.trim() ?? "";
  const clinicName = useClinicName(clinicSlug);
  const isSuperAdminSession = useIsSuperAdminSession();
  const query = clinicSlug ? `?clinic=${encodeURIComponent(clinicSlug)}` : "";
  const currentPageLabel = getCurrentPageLabel(pathname);

  const isOnDashboard = pathname === "/clinica/dashboard";
  let backHref = "/";
  let backLabel = "Volver";
  if (isSuperAdminSession) {
    backHref = "/admin/clinicas";
    backLabel = "Panel de admin";
  } else if (clinicSlug && !isOnDashboard) {
    backHref = `/clinica/dashboard${query}`;
    backLabel = "Volver al dashboard";
  }

  return (
    <div className="flex min-h-screen bg-[var(--surface)] text-[var(--text)]">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 flex-shrink-0 flex-col border-r border-[var(--border)] px-5 py-6 md:flex print:hidden">
        <Link href={backHref} className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0A1D3A] text-xs font-black text-white">
            F
          </span>
          <span className="font-brand text-lg font-bold tracking-tight">
            FRON<span className="text-[var(--accent-text)]">TERA</span>
          </span>
        </Link>

        <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface-overlay-05)] px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">
            Clínica
          </p>
          <p className="mt-0.5 truncate text-sm font-bold">
            {clinicName || (clinicSlug ? clinicSlug : "—")}
          </p>
        </div>

        {clinicSlug && (
          <nav className="mt-6 flex flex-1 flex-col gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={`${item.href}${query}`}
                  className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                    isActive
                      ? "bg-[#00C9A7]/15 text-[var(--accent-text)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-overlay-05)]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}

        <div className="mt-auto border-t border-[var(--border)] pt-4">
          <Link
            href={backHref}
            className="text-xs font-semibold text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
          >
            ← {backLabel}
          </Link>
        </div>
      </aside>

      {/* Content column */}
      <div className="min-w-0 flex-1">
        {/* Mobile top bar */}
        <header className="flex flex-col gap-3 border-b border-[var(--border)] px-5 py-4 md:hidden print:hidden">
          <div className="flex items-center justify-between">
            <Link href={backHref} className="text-sm font-semibold text-[var(--accent-text)]">
              ← {backLabel}
            </Link>
            <p className="truncate text-sm font-bold">
              {clinicName || (clinicSlug ? clinicSlug : "Frontera")}
            </p>
          </div>

          {clinicSlug && (
            <nav className="flex gap-2 overflow-x-auto">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={`${item.href}${query}`}
                    className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      isActive
                        ? "border-[#00C9A7] bg-[#00C9A7] text-[var(--accent-contrast)]"
                        : "border-[var(--border)] bg-[var(--surface-overlay-05)] text-[var(--text-secondary)]"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          )}
        </header>

        <div className="px-5 py-6 md:px-10 md:py-8">
          {isSuperAdminSession && (
            <nav
              aria-label="breadcrumb"
              className="mb-5 flex flex-wrap items-center gap-1 text-xs text-[var(--text-tertiary)] print:hidden"
            >
              <Link href="/admin/clinicas" className="hover:text-[var(--text-secondary)] hover:underline">
                Admin
              </Link>
              {clinicSlug && (
                <>
                  <span>/</span>
                  <Link
                    href={`/clinica/dashboard${query}`}
                    className="hover:text-[var(--text-secondary)] hover:underline"
                  >
                    {clinicName || clinicSlug}
                  </Link>
                </>
              )}
              {currentPageLabel && (
                <>
                  <span>/</span>
                  <span className="text-[var(--text-secondary)]">{currentPageLabel}</span>
                </>
              )}
            </nav>
          )}

          <div className="mx-auto max-w-5xl">{children}</div>
        </div>
      </div>
    </div>
  );
}
