import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/v2/utils/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  loading?: boolean;
  fullWidth?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-f2-brand text-white hover:bg-f2-brand-hover disabled:bg-f2-border disabled:text-f2-muted",
  secondary:
    "border-2 border-f2-control bg-f2-surface text-f2-ink hover:bg-f2-brand-soft disabled:border-f2-border disabled:text-f2-muted",
  ghost:
    "text-f2-brand hover:bg-f2-brand-soft disabled:text-f2-muted",
  danger:
    "bg-f2-danger text-white hover:opacity-90 disabled:bg-f2-border disabled:text-f2-muted",
};

export function Button({
  variant = "primary",
  loading = false,
  fullWidth = true,
  iconLeft,
  iconRight,
  disabled,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        "f2-button f2-focus inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl px-5 py-3 transition-colors disabled:cursor-not-allowed",
        fullWidth && "w-full",
        variants[variant],
        className
      )}
      {...rest}
    >
      {loading ? (
        <Loader2 className="size-5 animate-spin" aria-hidden="true" />
      ) : (
        iconLeft
      )}
      <span>{children}</span>
      {!loading && iconRight}
    </button>
  );
}
