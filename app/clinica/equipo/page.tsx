"use client";

import { FormEvent, Suspense, useCallback, useEffect, useState } from "react";
import { ClinicLoginForm } from "../ClinicLoginForm";
import { useClinicSession } from "../useClinicSession";

type ClinicUser = {
  id: string;
  username: string;
  role: "admin" | "staff";
  isActive: boolean;
  createdAt: string;
};

function ClinicTeamContent() {
  const {
    clinicSlug,
    token,
    usernameInput,
    setUsernameInput,
    passwordInput,
    setPasswordInput,
    isLoggingIn,
    loginError,
    handleLoginSubmit,
  } = useClinicSession((slug) => `/clinica/equipo?clinic=${encodeURIComponent(slug)}`);

  const [users, setUsers] = useState<ClinicUser[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "staff">("staff");
  const [freshCredentials, setFreshCredentials] = useState<{
    username: string;
    password: string;
  } | null>(null);

  const loadUsers = useCallback(async () => {
    if (!token || !clinicSlug) {
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/clinic/team?clinic=${encodeURIComponent(clinicSlug)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.error ?? "No se pudo cargar el equipo.");
        return;
      }

      setUsers(payload.users);
    } catch {
      setMessage("No se pudo cargar el equipo.");
    } finally {
      setIsLoading(false);
    }
  }, [token, clinicSlug]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadUsers();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadUsers]);

  async function addUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setFreshCredentials(null);

    try {
      const response = await fetch("/api/clinic/team", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clinic: clinicSlug,
          username: newUsername.trim(),
          role: newRole,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.error ?? "No se pudo crear la cuenta.");
        return;
      }

      setFreshCredentials({ username: payload.username, password: payload.password });
      setNewUsername("");
      loadUsers();
    } catch {
      setMessage("No se pudo crear la cuenta.");
    }
  }

  async function updateUser(
    user: ClinicUser,
    body: { isActive?: boolean; regeneratePassword?: boolean }
  ) {
    setMessage("");
    setFreshCredentials(null);

    try {
      const response = await fetch(`/api/clinic/team/${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ clinic: clinicSlug, ...body }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.error ?? "No se pudo actualizar la cuenta.");
        return;
      }

      if (payload.password) {
        setFreshCredentials({ username: payload.username, password: payload.password });
      }

      loadUsers();
    } catch {
      setMessage("No se pudo actualizar la cuenta.");
    }
  }

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Equipo de la clínica</h1>
      <p className="mt-1 text-sm text-slate-400">
        Solo un admin de esta clínica puede agregar o gestionar cuentas.
      </p>

      {!token && (
        <ClinicLoginForm
          usernameInput={usernameInput}
          onUsernameChange={setUsernameInput}
          passwordInput={passwordInput}
          onPasswordChange={setPasswordInput}
          isLoggingIn={isLoggingIn}
          loginError={loginError}
          onSubmit={handleLoginSubmit}
        />
      )}

      {token && (
        <>
          <form
            onSubmit={addUser}
            className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/5 p-5"
          >
            <h2 className="text-xl font-black">Agregar cuenta</h2>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                value={newUsername}
                onChange={(event) => setNewUsername(event.target.value)}
                placeholder="usuario"
                className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-[#102638] p-4 text-white outline-none"
              />
              <select
                value={newRole}
                onChange={(event) =>
                  setNewRole(event.target.value as "admin" | "staff")
                }
                className="rounded-2xl border border-white/10 bg-[#102638] p-4 text-white outline-none"
              >
                <option value="staff">Personal</option>
                <option value="admin">Admin de la clínica</option>
              </select>
              <button className="rounded-2xl bg-[#00C9A7] px-5 py-3 font-bold text-[#071826]">
                Crear
              </button>
            </div>
          </form>

          {freshCredentials && (
            <div className="mt-4 rounded-2xl border border-[#00C9A7]/30 bg-[#00C9A7]/10 p-4">
              <p className="text-sm font-semibold text-[#00C9A7]">
                Cuenta lista — guardá esto ahora, la contraseña no se vuelve a
                mostrar
              </p>
              <p className="mt-2 text-sm text-slate-300">Usuario</p>
              <p className="font-mono text-sm text-white">
                {freshCredentials.username}
              </p>
              <p className="mt-2 text-sm text-slate-300">Contraseña</p>
              <p className="font-mono text-sm text-white">
                {freshCredentials.password}
              </p>
            </div>
          )}

          {message && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
              {message}
            </div>
          )}

          <div className="mt-8 space-y-3">
            {isLoading && <p className="text-sm text-slate-300">Cargando...</p>}

            {users.map((user) => (
              <div
                key={user.id}
                className="flex flex-col justify-between gap-3 rounded-2xl border border-white/10 bg-[#102638] p-4 sm:flex-row sm:items-center"
              >
                <div>
                  <p className="font-bold">{user.username}</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {user.role === "admin" ? "Admin de la clínica" : "Personal"} ·{" "}
                    {user.isActive ? "Activa" : "Inactiva"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      updateUser(user, { isActive: !user.isActive })
                    }
                    className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/10"
                  >
                    {user.isActive ? "Desactivar" : "Activar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => updateUser(user, { regeneratePassword: true })}
                    className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/10"
                  >
                    Nueva contraseña
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

export default function ClinicTeamPage() {
  return (
    <Suspense fallback={null}>
      <ClinicTeamContent />
    </Suspense>
  );
}
