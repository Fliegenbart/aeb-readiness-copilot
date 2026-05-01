import { formatStatus, formatStatusPill } from "@/lib/ui/format";

type StatusBadgeProps = {
  status: string;
  labelStyle?: "default" | "aviation";
  size?: "sm" | "md";
  className?: string;
};

type SeverityBadgeProps = {
  severity: string;
  className?: string;
};

const STATUS_CLASSES: Record<string, string> = {
  ready: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  blocked: "border-red-200 bg-red-50 text-red-800",
  notApplicable: "border-slate-200 bg-slate-50 text-slate-700",
  draft: "border-slate-200 bg-slate-50 text-slate-700",
  analyzing: "border-blue-200 bg-blue-50 text-blue-800",
  open: "border-slate-200 bg-slate-50 text-slate-800",
  inProgress: "border-blue-200 bg-blue-50 text-blue-800",
  resolved: "border-emerald-200 bg-emerald-50 text-emerald-800",
  dismissed: "border-slate-200 bg-slate-50 text-slate-700",
};

const SEVERITY_CLASSES: Record<string, string> = {
  blocking: "border-red-200 bg-red-50 text-red-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  info: "border-slate-200 bg-slate-50 text-slate-700",
};

export function StatusBadge({
  status,
  labelStyle = "default",
  size = "sm",
  className,
}: StatusBadgeProps) {
  const sizeClass =
    size === "md"
      ? "inline-flex h-10 items-center rounded-md border px-3 text-sm font-semibold"
      : "inline-flex w-fit rounded-md border px-2 py-1 text-xs font-semibold";

  return (
    <span
      className={joinClassNames(
        sizeClass,
        STATUS_CLASSES[status] ?? STATUS_CLASSES.notApplicable,
        className,
      )}
    >
      {formatStatusPill(status, { aviationCopy: labelStyle === "aviation" })}
    </span>
  );
}

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  return (
    <span
      className={joinClassNames(
        "inline-flex w-fit rounded-md border px-2 py-1 text-xs font-semibold",
        SEVERITY_CLASSES[severity] ?? SEVERITY_CLASSES.info,
        className,
      )}
    >
      {formatStatus(severity)}
    </span>
  );
}

function joinClassNames(...classes: Array<string | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
