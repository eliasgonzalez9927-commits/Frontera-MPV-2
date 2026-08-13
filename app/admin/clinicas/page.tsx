"use client";

import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { buildClinicWhatsappUrl } from "@/lib/whatsappLink";

type AdminClinic = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  hasLogin: boolean;
};

type FreshCredentials = {
  username: string;
  password: string;
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
    qrPageUrl: `${origin}/clinica/qr?clinic=${encodedSlug}`,
    dashboardUrl: `${origin}/clinica/dashboard?clinic=${encodedSlug}`,
    whatsappUrl: buildClinicWhatsappUrl(slug),
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
  const [freshCredentials, setFreshCredentials] = useState<
    Record<string, FreshCredentials>
  >({});
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
    setFreshCredentials({});
    setMessage("");
    setCopyMessage("");
  }

  async function createClinic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage("");
    setCopyMessage("");

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

      setClinics((current) => [payload.clinic, ...current]);
      setFreshCredentials((current) => ({
        ...current,
        [payload.clinic.slug]: {
          username: payload.clinicUsername,
          password: payload.clinicPassword,
        },
      }));
      setName("");
      setMessage(`Clínica "${payload.clinic.name}" creada.`);
    } catch {
      setMessage("No se pudo crear la clinica.");
    } finally {
      setIsSaving(false);
    }
  }

  async function updateClinic(
    clinic: AdminClinic,
    body: { isActive?: boolean; regeneratePassword?: boolean }
  ) {
    setMessage("");
    setCopyMessage("");

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

      if (payload.clinicPassword) {
        setFreshCredentials((current) => ({
          ...current,
          [payload.clinic.slug]: {
            username: payload.clinicUsername,
            password: payload.clinicPassword,
          },
        }));
      }

      setMessage(
        payload.clinicPassword
          ? "Contraseña nueva generada. Guardala ahora."
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

  async function copyKit(clinic: AdminClinic) {
    const links = buildClinicLinks(origin, clinic.slug);
    const credentials = freshCredentials[clinic.slug];
    const lines = [
      `Clinica: ${clinic.name}`,
      `QR / link de WhatsApp: ${links.whatsappUrl}`,
      `Dashboard: ${links.dashboardUrl}`,
    ];

    if (credentials) {
      lines.push(`Usuario: ${credentials.username}`, `Contraseña: ${credentials.password}`);
    } else {
      lines.push(
        `Usuario: ${clinic.slug} (la contraseña no se puede volver a mostrar — usá "Nueva contraseña" si se perdió)`
      );
    }

    await copyText(lines.join("\n"), "Kit");
  }

  return (
    <main className="min-h-screen bg-[#071826] px-6 py-8 text-white">
      <section className="mx-auto max-w-6xl">
        <Link href="/" className="text-sm text-[#00C9A7]">
          ← Volver
        </Link>

        <header className="mt-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold text-[#00C9A7]">
              Administracion interna
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-tight">
              Clinicas
            </h1>
            <p className="mt-2 max-w-2xl text-slate-300">
              Cada clínica u hospital tiene su propio usuario y contraseña
              para entrar a su dashboard — no un token para pegar a mano.
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
              className="mt-2 w-full rounded-2xl border border-white/10 bg-[#102638] p-4 text-white outline-none"
            />

            <label className="mt-4 block text-sm font-semibold text-slate-200">
              Contrasena
            </label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-[#102638] p-4 text-white outline-none"
            />
            <button className="mt-4 w-full rounded-2xl bg-[#00C9A7] px-5 py-3 font-black text-[#071826]">
              Entrar
            </button>
          </form>
        )}

        {adminSession && (
          <div className="mt-8 grid gap-6 lg:grid-cols-[380px_1fr]">
            <form
              onSubmit={createClinic}
              className="h-fit rounded-[1.5rem] border border-white/10 bg-white/5 p-5"
            >
              <h2 className="text-xl font-black">Crear clinica nueva</h2>
              <label className="mt-5 block text-sm font-semibold text-slate-200">
                Nombre de la clinica
              </label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-[#102638] p-4 text-white outline-none"
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
                className="mt-5 w-full rounded-2xl bg-[#00C9A7] px-5 py-3 font-black text-[#071826] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSaving ? "Creando..." : "Crear clinica"}
              </button>
            </form>

            <section className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-xl font-black">Clinicas</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {clinics.length} clínica{clinics.length === 1 ? "" : "s"}
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

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {clinics.map((clinic) => (
                  <ClinicCard
                    key={clinic.id}
                    clinic={clinic}
                    origin={origin}
                    freshCredentials={freshCredentials[clinic.slug]}
                    onToggleActive={() =>
                      updateClinic(clinic, { isActive: !clinic.isActive })
                    }
                    onRegeneratePassword={() => {
                      if (
                        window.confirm(
                          "Esto invalida la contraseña anterior de la clinica. ¿Continuar?"
                        )
                      ) {
                        updateClinic(clinic, { regeneratePassword: true });
                      }
                    }}
                    onCopyText={copyText}
                    onCopyKit={() => copyKit(clinic)}
                  />
                ))}
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

function ClinicCard({
  clinic,
  origin,
  freshCredentials,
  onToggleActive,
  onRegeneratePassword,
  onCopyText,
  onCopyKit,
}: {
  clinic: AdminClinic;
  origin: string;
  freshCredentials?: FreshCredentials;
  onToggleActive: () => void;
  onRegeneratePassword: () => void;
  onCopyText: (value: string, label: string) => void;
  onCopyKit: () => void;
}) {
  const links = buildClinicLinks(origin, clinic.slug);

  return (
    <article className="rounded-2xl border border-white/10 bg-[#102638] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black">{clinic.name}</h3>
          <p className="mt-1 text-sm text-slate-400">
            Usuario: <span className="font-mono">{clinic.slug}</span>
          </p>
          <p className="mt-2 text-sm font-semibold text-[#00C9A7]">
            {clinic.isActive ? "Activa" : "Inactiva"}
          </p>
        </div>

        <div className="rounded-xl bg-white p-2">
          <QRCodeSVG
            value={links.whatsappUrl}
            size={96}
            level="M"
            marginSize={2}
            title={`QR de pre-triaje por WhatsApp — ${clinic.name}`}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={links.qrPageUrl}
          className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/10"
        >
          Ver QR de guardia
        </Link>
        <Link
          href={links.dashboardUrl}
          className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/10"
        >
          Abrir dashboard
        </Link>
        <button
          type="button"
          onClick={onCopyKit}
          className="rounded-xl bg-[#00C9A7] px-3 py-2 text-xs font-bold text-[#071826]"
        >
          Copiar kit
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onToggleActive}
          className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/10"
        >
          {clinic.isActive ? "Desactivar" : "Activar"}
        </button>
        <button
          type="button"
          onClick={onRegeneratePassword}
          className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/10"
        >
          {clinic.hasLogin ? "Nueva contraseña" : "Generar acceso"}
        </button>
      </div>

      {freshCredentials && (
        <div className="mt-3 rounded-xl border border-[#00C9A7]/30 bg-[#00C9A7]/10 p-3">
          <p className="text-xs font-semibold text-[#00C9A7]">
            Acceso del dashboard — guardalo ahora, la contraseña no se vuelve
            a mostrar
          </p>
          <p className="mt-2 text-xs text-slate-300">Usuario</p>
          <p className="text-xs font-mono text-white">
            {freshCredentials.username}
          </p>
          <p className="mt-2 text-xs text-slate-300">Contraseña</p>
          <p className="text-xs font-mono text-white">
            {freshCredentials.password}
          </p>
          <button
            type="button"
            onClick={() =>
              onCopyText(
                `Usuario: ${freshCredentials.username}\nContraseña: ${freshCredentials.password}`,
                "Acceso"
              )
            }
            className="mt-2 rounded-lg border border-white/10 px-2 py-1 text-xs font-bold text-white transition hover:bg-white/10"
          >
            Copiar acceso
          </button>
        </div>
      )}

      <details className="mt-3 text-xs text-slate-400">
        <summary className="cursor-pointer font-semibold">
          Ver links completos
        </summary>
        <div className="mt-2 space-y-2 break-all">
          <p>
            WhatsApp: {links.whatsappUrl}{" "}
            <button
              type="button"
              onClick={() => onCopyText(links.whatsappUrl, "Link de WhatsApp")}
              className="font-bold text-white underline"
            >
              copiar
            </button>
          </p>
          <p>
            Dashboard: {links.dashboardUrl}{" "}
            <button
              type="button"
              onClick={() => onCopyText(links.dashboardUrl, "Dashboard")}
              className="font-bold text-white underline"
            >
              copiar
            </button>
          </p>
        </div>
      </details>
    </article>
  );
}
