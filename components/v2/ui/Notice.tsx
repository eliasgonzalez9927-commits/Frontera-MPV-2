import { CircleCheck, Info, OctagonAlert, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/v2/utils/cn";

type NoticeVariant = "info" | "alert" | "danger" | "success";

const styles: Record<NoticeVariant, { box: string; Icon: typeof Info }> = {
  info: { box: "border-f2-border bg-f2-surface text-f2-ink", Icon: Info },
  success: { box: "border-f2-brand/30 bg-f2-brand-soft text-f2-ink", Icon: CircleCheck },
  alert: { box: "border-f2-warn-border bg-f2-warn-soft text-f2-warn", Icon: TriangleAlert },
  danger: { box: "border-f2-danger-border bg-f2-danger-soft text-f2-danger", Icon: OctagonAlert },
};

type NoticeProps = {
  variant?: NoticeVariant;
  title?: string;
  children?: ReactNode;
  /** Anuncia el mensaje a lectores de pantalla (úsalo solo para avisos dinámicos). */
  live?: boolean;
  className?: string;
};

export function Notice({ variant = "info", title, children, live, className }: NoticeProps) {
  const { box, Icon } = styles[variant];
  const role = live ? (variant === "danger" ? "alert" : "status") : undefined;

  return (
    <div role={role} className={cn("flex gap-3 rounded-2xl border p-4", box, className)}>
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div className="f2-body min-w-0">
        {title && <p className="f2-subtitle mb-0.5">{title}</p>}
        {children && <div>{children}</div>}
      </div>
    </div>
  );
}
