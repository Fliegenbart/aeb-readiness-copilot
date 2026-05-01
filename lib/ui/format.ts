export function formatStatus(value: string): string {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/\./g, " ")
    .replace(/_/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatStatusPill(
  value: string,
  options: { aviationCopy?: boolean } = {},
): string {
  if (value === "blocked" && options.aviationCopy) {
    return "Hold";
  }

  if (value === "notApplicable") {
    return "n/a";
  }

  return formatStatus(value);
}

export function formatAuditEventTitle(value: string): string {
  const titles: Record<string, string> = {
    "readiness.computed": "Pre-flight complete",
    "documents.analyzed": "Documents analyzed",
    "tasks.created": "Tasks created",
  };

  return titles[value] ?? formatStatus(value);
}

export function formatTarget(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatTimelineDate(date: Date): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}
