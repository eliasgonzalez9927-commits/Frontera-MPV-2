import { cn } from "@/lib/v2/utils/cn";

export function FronteraMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      className={className}
    >
      <rect width="100" height="100" rx="24" fill="var(--f2-brand)" />
      <rect x="32" y="24" width="14" height="52" fill="#fff" />
      <rect x="32" y="24" width="34" height="14" fill="#fff" />
      <rect x="32" y="46" width="26" height="13" fill="#fff" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <FronteraMark />
      <span className="text-[1.125rem] font-bold tracking-tight text-f2-ink">Frontera</span>
    </span>
  );
}
