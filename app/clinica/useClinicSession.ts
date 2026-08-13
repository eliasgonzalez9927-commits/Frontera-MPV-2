import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/** Fetches a clinic's public display name for a given slug. */
export function useClinicName(clinicSlug: string) {
  const [clinicName, setClinicName] = useState("");

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      if (!clinicSlug) {
        setClinicName("");
        return;
      }

      fetch(`/api/clinics/${clinicSlug}`)
        .then((response) => (response.ok ? response.json() : null))
        .then((payload) => {
          if (active && payload?.clinic?.name) {
            setClinicName(payload.clinic.name);
          }
        })
        .catch(() => {
          if (active) {
            setClinicName("");
          }
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [clinicSlug]);

  return clinicName;
}

/**
 * Shared clinic-session logic: reads the clinic slug from the URL, resolves
 * an existing token from sessionStorage (per-clinic, or the super-admin
 * bypass token if present), and handles the username/password login form.
 * Used by every /clinica/* page instead of each one re-implementing this.
 */
export function useClinicSession(buildRedirectPath: (slug: string) => string) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clinicSlug = searchParams.get("clinic")?.trim() ?? "";
  const tokenStorageKey = clinicSlug
    ? `frontera-clinic-token:${clinicSlug}`
    : "frontera-clinic-token";

  const [token, setToken] = useState(() =>
    typeof window === "undefined"
      ? ""
      : sessionStorage.getItem(tokenStorageKey) ??
        sessionStorage.getItem("frontera-admin-session") ??
        ""
  );
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState("");

  const isSuperAdminSession =
    typeof window !== "undefined" &&
    Boolean(token) &&
    sessionStorage.getItem("frontera-admin-session") === token;

  const handleLoginSubmit = useCallback(async () => {
    setLoginError("");
    setIsLoggingIn(true);

    try {
      const response = await fetch("/api/clinic/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: usernameInput.trim(),
          password: passwordInput,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setLoginError(payload.error ?? "No pudimos iniciar sesión.");
        return;
      }

      const realSlug = payload.clinic.slug as string;
      sessionStorage.setItem(`frontera-clinic-token:${realSlug}`, payload.clinicToken);
      setPasswordInput("");

      if (realSlug !== clinicSlug) {
        router.replace(buildRedirectPath(realSlug));
        return;
      }

      setToken(payload.clinicToken);
    } catch {
      setLoginError("No pudimos iniciar sesión.");
    } finally {
      setIsLoggingIn(false);
    }
  }, [usernameInput, passwordInput, clinicSlug, router, buildRedirectPath]);

  return {
    clinicSlug,
    token,
    setToken,
    isSuperAdminSession,
    usernameInput,
    setUsernameInput,
    passwordInput,
    setPasswordInput,
    isLoggingIn,
    loginError,
    handleLoginSubmit,
  };
}
