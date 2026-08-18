"use client";

type ClinicLoginFormProps = {
  usernameInput: string;
  onUsernameChange: (value: string) => void;
  passwordInput: string;
  onPasswordChange: (value: string) => void;
  isLoggingIn: boolean;
  loginError: string;
  onSubmit: () => void;
};

export function ClinicLoginForm({
  usernameInput,
  onUsernameChange,
  passwordInput,
  onPasswordChange,
  isLoggingIn,
  loginError,
  onSubmit,
}: ClinicLoginFormProps) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="mt-8 max-w-md rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface-overlay-05)] p-5"
    >
      <label className="text-sm font-semibold text-[var(--text-secondary)]">Usuario</label>
      <input
        value={usernameInput}
        onChange={(event) => onUsernameChange(event.target.value)}
        autoComplete="username"
        className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-4 text-[var(--text)] outline-none"
      />

      <label className="mt-4 block text-sm font-semibold text-[var(--text-secondary)]">
        Contraseña
      </label>
      <input
        type="password"
        value={passwordInput}
        onChange={(event) => onPasswordChange(event.target.value)}
        autoComplete="current-password"
        className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-4 text-[var(--text)] outline-none"
      />

      <button
        disabled={isLoggingIn}
        className="mt-4 w-full rounded-2xl bg-[#00C9A7] px-5 py-3 font-bold text-[var(--accent-contrast)] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isLoggingIn ? "Entrando..." : "Entrar"}
      </button>

      {loginError && (
        <p className="mt-3 text-sm text-[var(--status-danger-text)]">{loginError}</p>
      )}
    </form>
  );
}
