"use client";

import Link from "next/link";
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

const adminTokenStorageKey = "frontera-admin-token";

function buildSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export default function AdminClinicsPage() {
  const [adminToken, setAdminToken] = useState(() =>
    typeof window === "undefined"
      ? ""
      : sessionStorage.getItem(adminTokenStorageKey) ?? ""
  );
  const [tokenInput, setTokenInput] = useState("");
  const [clinics, setClinics] = useState<AdminClinic[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [message, setMessage] = useState("");
  const [oneTimeToken, setOneTimeToken] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const origin = useMemo(
    () => (typeof window === "undefined" ? "" : window.location.origin),
    []
  );

  const loadClinics = useCallback(async () => {
    if (!adminToken) {
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/clinics", {
        headers: {
          Authorization: `Bearer ${adminToken}`,
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
  }, [adminToken]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadClinics();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadClinics]);

  function saveAdminToken(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextToken = tokenInput.trim();
    sessionStorage.setItem(adminTokenStorageKey, nextToken);
    setAdminToken(nextToken);
    setTokenInput("");
  }

  function handleNameChange(value: string) {
    setName(value);

    if (!slug) {
      setSlug(buildSlug(value));
    }
  }

  async function createClinic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage("");
    setOneTimeToken("");
    setCopyMessage("");

    try {
      const response = await fetch("/api/admin/clinics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name,
          slug,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.error ?? "No se pudo crear la clinica.");
        return;
      }

      setClinics((current) => [payload.clinic, ...current]);
      setOneTimeToken(payload.clinicAccessToken);
      setName("");
      setSlug("");
      setMessage("Clinica creada.");
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
    setOneTimeToken("");
    setCopyMessage("");

    try {
      const response = await fetch(
        `/api/admin/clinics/${encodeURIComponent(clinic.slug)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
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
        setOneTimeToken(payload.clinicAccessToken);
      }

      setMessage("Clinica actualizada.");
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

  return (
    <main className="min-h-screen bg-[#071923] px-6 py-8 text-white">
      <section className="mx-auto max-w-6xl">
        <Link href="/" className="text-sm text-[#9df3e9]">
          ← Volver
        </Link>

        <header className="mt-6">
          <p className="text-sm font-semibold text-[#9df3e9]">
            Administracion interna
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight">
            Clinicas
          </h1>
        </header>

        {!adminToken && (
          <form
            onSubmit={saveAdminToken}
            className="mt-8 rounded-[1.5rem] border border-white/10 bg-white/5 p-5"
          >
            <label className="text-sm font-semibold text-slate-200">
              Token interno de Frontera
            </label>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <input
                type="password"
                value={tokenInput}
                onChange={(event) => setTokenInput(event.target.value)}
                className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-[#0d2530] p-4 text-white outline-none"
              />
              <button className="rounded-2xl bg-[#52d6c4] px-5 py-3 font-bold text-[#071923]">
                Entrar
              </button>
            </div>
          </form>
        )}

        {adminToken && (
          <div className="mt-8 grid gap-6 lg:grid-cols-[360px_1fr]">
            <form
              onSubmit={createClinic}
              className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5"
            >
              <h2 className="text-xl font-black">Nueva clinica</h2>
              <label className="mt-5 block text-sm font-semibold text-slate-200">
                Nombre publico
              </label>
              <input
                value={name}
                onChange={(event) => handleNameChange(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0d2530] p-4 text-white outline-none"
                placeholder="Ej: Clinica San Martin"
              />

              <label className="mt-4 block text-sm font-semibold text-slate-200">
                Slug
              </label>
              <input
                value={slug}
                onChange={(event) => setSlug(buildSlug(event.target.value))}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0d2530] p-4 text-white outline-none"
                placeholder="clinica-san-martin"
              />

              <button
                type="submit"
                disabled={isSaving}
                className="mt-5 w-full rounded-2xl bg-[#52d6c4] px-5 py-3 font-black text-[#071923] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSaving ? "Creando..." : "Crear clinica"}
              </button>
            </form>

            <section className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <h2 className="text-xl font-black">Clinicas activas</h2>
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
                  const qrUrl = `${origin}/clinica/qr?clinic=${encodeURIComponent(
                    clinic.slug
                  )}`;
                  const dashboardUrl = `${origin}/clinica/dashboard?clinic=${encodeURIComponent(
                    clinic.slug
                  )}`;

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
                              ? "Token hasheado"
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
                            Regenerar token
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <ActionLink
                          label="QR"
                          value={qrUrl}
                          href={qrUrl}
                          onCopy={() => copyText(qrUrl, "QR")}
                        />
                        <ActionLink
                          label="Dashboard"
                          value={dashboardUrl}
                          href={dashboardUrl}
                          onCopy={() => copyText(dashboardUrl, "Dashboard")}
                        />
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {oneTimeToken && (
          <div className="mt-6 rounded-2xl border border-yellow-300/20 bg-yellow-300/10 p-5 text-yellow-50">
            <p className="text-sm font-black">Token de clinica</p>
            <p className="mt-2 break-all font-mono text-sm">{oneTimeToken}</p>
            <p className="mt-2 text-sm">
              Guardalo ahora. Frontera no vuelve a mostrar este token.
            </p>
            <button
              type="button"
              onClick={() => copyText(oneTimeToken, "Token")}
              className="mt-4 rounded-2xl border border-yellow-100/30 px-4 py-2 text-sm font-bold transition hover:bg-yellow-100/10"
            >
              Copiar token
            </button>
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
