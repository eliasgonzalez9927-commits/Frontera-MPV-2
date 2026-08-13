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

const tabs = [
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

  return (
    <main className="min-h-screen bg-[#071826] px-6 py-8 text-white">
      <section className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between print:hidden">
          <div>
            <Link
              href={isSuperAdminSession ? "/admin/clinicas" : "/"}
              className="text-sm text-[#00C9A7]"
            >
              ← {isSuperAdminSession ? "Volver al panel de admin" : "Volver"}
            </Link>

            {isSuperAdminSession && (
              <nav
                aria-label="breadcrumb"
                className="mt-2 flex flex-wrap items-center gap-1 text-xs text-slate-400"
              >
                <Link href="/admin/clinicas" className="hover:text-slate-200 hover:underline">
                  Admin
                </Link>
                {clinicSlug && (
                  <>
                    <span>/</span>
                    <Link
                      href={`/clinica/dashboard${query}`}
                      className="hover:text-slate-200 hover:underline"
                    >
                      {clinicName || clinicSlug}
                    </Link>
                  </>
                )}
                {currentPageLabel && (
                  <>
                    <span>/</span>
                    <span className="text-slate-300">{currentPageLabel}</span>
                  </>
                )}
              </nav>
            )}

            <p className="mt-3 font-brand text-2xl font-bold tracking-tight">
              {clinicName || (clinicSlug ? `Clínica: ${clinicSlug}` : "Frontera")}
            </p>
          </div>

          {clinicSlug && (
            <nav className="flex flex-wrap gap-2">
              {tabs.map((tab) => {
                const isActive = pathname === tab.href;
                return (
                  <Link
                    key={tab.href}
                    href={`${tab.href}${query}`}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      isActive
                        ? "border-[#00C9A7] bg-[#00C9A7] text-[#071826]"
                        : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                    }`}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </nav>
          )}
        </header>

        <div className="pt-8">{children}</div>
      </section>
    </main>
  );
}
