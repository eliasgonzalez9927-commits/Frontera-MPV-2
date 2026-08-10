"use client";

import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type AdminClinic = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  hasHashedToken: boolean;
  hasLegacyToken: boolean;
};

type ClinicKit = {
  clinic: AdminClinic;
  token: string;
};

const adminSessionStorageKey = "frontera-admin-session";

function buildSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function buildClinicLinks(origin: string, slug: string) {
  const encodedSlug = encodeURIComponent(slug);

  return {
    qrUrl: `${origin}/clinica/qr?clinic=${encodedSlug}`,
    dashboardUrl: `${origin}/clinica/dashboard?clinic=${encodedSlug}`,
    intakeUrl: `${origin}/pretriaje?source=qr&clinic=${encodedSlug}`,
  };
}

export default function AdminClinicsPage() {
  const [adminSession, setAdminSession] = useState(() =>
    typeof window === "undefined"
      ? ""
      : sessionStorage.getItem(adminSessionStorageKey) ?? ""
  );
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [clinics, setClinics] = useState<AdminClinic[]>([]);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [kit, setKit] = useState<ClinicKit | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const origin = useMemo(
    () => (typeof window === "undefined" ? "" : window.location.origin),
    []
  );
  const previewSlug = buildSlug(name);

  const loadClinics = useCallback(async () => {
    if (!adminSession) {
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/clinics", {
        headers: {
          Authorization: `Bearer ${adminSession}`,
        },
      });
      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.error ?? "No se pudieron cargar las clinicas.");
        return;
      }

      setClinics(payload.clinics);
    } catch {
      setMessage("No se pudieron cargar las clinicas.");
    } finally {
      setIsLoading(false);
    }
  }, [adminSession]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadClinics();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadClinics]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setCopyMessage("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.error ?? "No pudimos iniciar sesion.");
        return;
      }

      sessionStorage.setItem(adminSessionStorageKey, payload.adminToken);
      setAdminSession(payload.adminToken);
      setPassword("");
      setMessage("Sesion admin iniciada.");
    } catch {
      setMessage("No pudimos iniciar sesion.");
    }
  }

  function clearAdminSession() {
    sessionStorage.removeItem(adminSessionStorageKey);
    setAdminSession("");
    setClinics([]);
    setKit(null);
    setMessage("");
    setCopyMessage("");
  }

  async function createClinic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage("");
    setCopyMessage("");
    setKit(null);

    try {
      const response = await fetch("/api/admin/clinics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminSession}`,
        },
        body: JSON.stringify({
          name,
          slug: previewSlug,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.error ?? "No se pudo crear la clinica.");
        return;
      }

      const nextKit = {
        clinic: payload.clinic,
        token: payload.clinicAccessToken,
      };

      setClinics((current) => [payload.clinic, ...current]);
      setKit(nextKit);
      setName("");
      setMessage("Kit de prueba listo.");
    } catch {
      setMessage("No se pudo crear la clinica.");
    } finally {
      setIsSaving(false);
    }
  }

  async function updateClinic(
    clinic: AdminClinic,
    body: { isActive?: boolean; regenerateToken?: boolean }
  ) {
    setMessage("");
    setCopyMessage("");
    setKit(null);

    try {
      const response = await fetch(
        `/api/admin/clinics/${encodeURIComponent(clinic.slug)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminSession}`,
          },
          body: JSON.stringify(body),
        }
      );
      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.error ?? "No se pudo actualizar la clinica.");
        return;
      }

      setClinics((current) =>
        current.map((item) =>
          item.slug === payload.clinic.slug ? payload.clinic : item
        )
      );

      if (payload.clinicAccessToken) {
        setKit({
          clinic: payload.clinic,
          token: payload.clinicAccessToken,
        });
      }

      setMessage(
        payload.clinicAccessToken
          ? "Token regenerado. Guardalo ahora."
          : "Clinica actualizada."
      );
    } catch {
      setMessage("No se pudo actualizar la clinica.");
    }
  }

  async function copyText(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyMessage(`${label} copiado.`);
    } catch {
      setCopyMessage("No se pudo copiar.");
    }
  }

  async function copyKit(nextKit: ClinicKit) {
    const links = buildClinicLinks(origin, nextKit.clinic.slug);
    const text = [
      `Clinica: ${nextKit.clinic.name}`,
      `QR imprimible: ${links.qrUrl}`,
      `Dashboard: ${links.dashboardUrl}`,
      `Token de acceso: ${nextKit.token}`,
    ].join("\n");

    await copyText(text, "Kit de prueba");
  }

  return (
    <main className="min-h-screen bg-[#071923] px-6 py-8 text-white">
      <section className="mx-auto max-w-6xl">
        <Link href="/" className="text-sm text-[#9df3e9]">
          ← Volver
        </Link>

        <header className="mt-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold text-[#9df3e9]">
              Administracion interna
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-tight">
              Clinicas
            </h1>
            <p className="mt-2 max-w-2xl text-slate-300">
              Crea una clinica de prueba y obtene en un solo lugar el QR, el
              dashboard y el token para el equipo.
            </p>
          </div>

          {adminSession && (
            <button
              type="button"
              onClick={clearAdminSession}
              className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10"
            >
              Cerrar sesion
            </button>
          )}
        </header>

        {!adminSession && (
          <form
            onSubmit={login}
            className="mt-8 max-w-xl rounded-[1.5rem] border border-white/10 bg-white/5 p-5"
          >
            <h2 className="text-xl font-black">Acceso admin</h2>
            <label className="mt-5 block text-sm font-semibold text-slate-200">
              Usuario
            </label>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0d2530] p-4 text-white outline-none"
            />

            <label className="mt-4 block text-sm font-semibold text-slate-200">
              Contrasena
            </label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0d2530] p-4 text-white outline-none"
            />
            <button className="mt-4 w-full rounded-2xl bg-[#52d6c4] px-5 py-3 font-black text-[#071923]">
              Entrar
            </button>
          </form>
        )}

        {adminSession && (
          <div className="mt-8 grid gap-6 lg:grid-cols-[380px_1fr]">
            <div className="space-y-6">
              <form
                onSubmit={createClinic}
                className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5"
              >
                <h2 className="text-xl font-black">Crear clinica de prueba</h2>
                <label className="mt-5 block text-sm font-semibold text-slate-200">
                  Nombre de la clinica
                </label>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0d2530] p-4 text-white outline-none"
                  placeholder="Ej: Clinica San Martin"
                />
                <p className="mt-3 break-all text-sm text-slate-400">
                  Slug automatico:{" "}
                  <span className="font-semibold text-slate-200">
                    {previewSlug || "se genera con el nombre"}
                  </span>
                </p>

                <button
                  type="submit"
                  disabled={isSaving || !previewSlug}
                  className="mt-5 w-full rounded-2xl bg-[#52d6c4] px-5 py-3 font-black text-[#071923] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSaving ? "Creando kit..." : "Crear clinica y kit"}
                </button>
              </form>

              {kit && (
                <TestKit
                  kit={kit}
                  origin={origin}
                  onCopyKit={() => copyKit(kit)}
                  onCopyText={copyText}
                />
              )}
            </div>

            <section className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-xl font-black">Clinicas creadas</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Accesos y estado operativo.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadClinics}
                  disabled={isLoading}
                  className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Actualizar
                </button>
              </div>

              {isLoading && (
                <p className="mt-5 text-sm text-slate-300">
                  Cargando clinicas...
                </p>
              )}

              <div className="mt-5 space-y-4">
                {clinics.map((clinic) => {
                  const links = buildClinicLinks(origin, clinic.slug);

                  return (
                    <article
                      key={clinic.id}
                      className="rounded-2xl border border-white/10 bg-[#0d2530] p-4"
                    >
                      <div className="flex flex-col justify-between gap-3 sm:flex-row">
                        <div>
                          <h3 className="text-lg font-black">{clinic.name}</h3>
                          <p className="mt-1 text-sm text-slate-400">
                            {clinic.slug}
                          </p>
                          <p className="mt-2 text-sm font-semibold text-[#9df3e9]">
                            {clinic.isActive ? "Activa" : "Inactiva"} ·{" "}
                            {clinic.hasHashedToken
                              ? "Token seguro"
                              : clinic.hasLegacyToken
                                ? "Token legacy"
                                : "Sin token"}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              updateClinic(clinic, {
                                isActive: !clinic.isActive,
                              })
                            }
                            className="rounded-2xl border border-white/10 px-3 py-2 text-sm font-bold text-white transition hover:bg-white/10"
                          >
                            {clinic.isActive ? "Desactivar" : "Activar"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                window.confirm(
                                  "Esto invalida el token anterior de la clinica. ¿Continuar?"
                                )
                              ) {
                                updateClinic(clinic, {
                                  regenerateToken: true,
                                });
                              }
                            }}
                            className="rounded-2xl border border-white/10 px-3 py-2 text-sm font-bold text-white transition hover:bg-white/10"
                          >
                            Nuevo token
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <ActionLink
                          label="QR imprimible"
                          value={links.qrUrl}
                          href={links.qrUrl}
                          onCopy={() => copyText(links.qrUrl, "QR")}
                        />
                        <ActionLink
                          label="Dashboard"
                          value={links.dashboardUrl}
                          href={links.dashboardUrl}
                          onCopy={() =>
                            copyText(links.dashboardUrl, "Dashboard")
                          }
                        />
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {(message || copyMessage) && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
            {message || copyMessage}
          </div>
        )}
      </section>
    </main>
  );
}

function TestKit({
  kit,
  origin,
  onCopyKit,
  onCopyText,
}: {
  kit: ClinicKit;
  origin: string;
  onCopyKit: () => void;
  onCopyText: (value: string, label: string) => void;
}) {
  const links = buildClinicLinks(origin, kit.clinic.slug);

  return (
    <section className="rounded-[1.5rem] border border-[#52d6c4]/30 bg-[#52d6c4]/10 p-5">
      <p className="text-sm font-black uppercase tracking-[0.16em] text-[#9df3e9]">
        Kit de prueba listo
      </p>
      <h2 className="mt-2 text-2xl font-black">{kit.clinic.name}</h2>

      <div className="mt-5 rounded-2xl bg-white p-4 text-center text-[#071923]">
        <QRCodeSVG
          value={links.intakeUrl}
          size={220}
          level="M"
          marginSize={4}
          title={`QR de pre-triaje ${kit.clinic.name}`}
        />
        <p className="mt-3 break-all text-xs font-semibold">
          {links.intakeUrl}
        </p>
      </div>

      <div className="mt-4 space-y-3">
        <KitLine
          label="QR imprimible"
          value={links.qrUrl}
          onCopy={() => onCopyText(links.qrUrl, "QR")}
        />
        <KitLine
          label="Dashboard"
          value={links.dashboardUrl}
          onCopy={() => onCopyText(links.dashboardUrl, "Dashboard")}
        />
        <KitLine
          label="Token de clinica"
          value={kit.token}
          onCopy={() => onCopyText(kit.token, "Token")}
        />
      </div>

      <button
        type="button"
        onClick={onCopyKit}
        className="mt-5 w-full rounded-2xl bg-[#52d6c4] px-5 py-3 font-black text-[#071923]"
      >
        Copiar kit completo
      </button>
      <p className="mt-3 text-sm text-slate-300">
        Guardá el token ahora. Frontera no vuelve a mostrarlo.
      </p>
    </section>
  );
}

function KitLine({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: () => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d2530] p-3">
      <p className="text-sm font-semibold text-slate-300">{label}</p>
      <p className="mt-1 break-all text-xs text-slate-400">{value}</p>
      <button
        type="button"
        onClick={onCopy}
        className="mt-3 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/10"
      >
        Copiar
      </button>
    </div>
  );
}

function ActionLink({
  label,
  value,
  href,
  onCopy,
}: {
  label: string;
  value: string;
  href: string;
  onCopy: () => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <p className="text-sm font-semibold text-slate-300">{label}</p>
      <p className="mt-1 break-all text-xs text-slate-400">{value}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={href}
          className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/10"
        >
          Abrir
        </Link>
        <button
          type="button"
          onClick={onCopy}
          className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/10"
        >
          Copiar
        </button>
      </div>
    </div>
  );
}
