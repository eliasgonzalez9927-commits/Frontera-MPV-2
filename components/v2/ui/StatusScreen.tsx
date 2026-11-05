import { Inbox, Loader2, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/v2/utils/cn";

type StatusScreenProps = {
  icon: ReactNode;
  title: string;
  description: string;
  tone?: "neutral" | "warn" | "danger";
  /** Nivel del título. En una pantalla propia es 1; dentro de otra página (galería) conviene 3. */
  headingLevel?: 1 | 2 | 3;
  children?: ReactNode;
  className?: string;
};

const tones = {
  neutral: "bg-f2-brand-soft text-f2-brand",
  warn: "bg-f2-warn-soft text-f2-warn",
  danger: "bg-f2-danger-soft text-f2-danger",
};

// Base común de estados vacíos y pantallas de error/excepción.
export function StatusScreen({
  icon,
  title,
  description,
  tone = "neutral",
  headingLevel = 1,
  children,
  className,
}: StatusScreenProps) {
  const Heading = `h${headingLevel}` as "h1" | "h2" | "h3";

  return (
    <section className={cn("flex flex-col items-center py-8 text-center", className)}>
      <span
        aria-hidden="true"
        className={cn("flex size-14 items-center justify-center rounded-full", tones[tone])}
      >
        {icon}
      </span>
      <Heading className="f2-title mt-5 text-f2-ink">{title}</Heading>
      <p className="f2-body mt-2 max-w-[44ch] text-f2-muted">{description}</p>
      {children && <div className="mt-8 flex w-full flex-col gap-3">{children}</div>}
    </section>
  );
}

export function EmptyState(props: Omit<StatusScreenProps, "icon" | "tone">) {
  return <StatusScreen icon={<Inbox className="size-7" />} tone="neutral" {...props} />;
}

export function ErrorScreen(props: Omit<StatusScreenProps, "icon" | "tone"> & { icon?: ReactNode }) {
  const { icon, ...rest } = props;
  return <StatusScreen icon={icon ?? <TriangleAlert className="size-7" />} tone="danger" {...rest} />;
}

export function LoadingState({ label = "Cargando…" }: { label?: string }) {
  return (
    <div role="status" className="flex flex-col items-center gap-3 py-10 text-f2-muted">
      <Loader2 className="size-8 animate-spin text-f2-brand" aria-hidden="true" />
      <p className="f2-body">{label}</p>
    </div>
  );
}
