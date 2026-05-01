import {
  formatAuditEventTitle,
  formatTimelineDate,
} from "@/lib/ui/format";

type AuditTimelineEvent = {
  id: string;
  eventType: string;
  message: string;
  createdAt: Date;
};

type AuditTimelineProps = {
  auditEvents: AuditTimelineEvent[];
  fallback: {
    customerName: string;
    createdAt: Date;
  };
};

export function AuditTimeline({ auditEvents, fallback }: AuditTimelineProps) {
  return (
    <div className="divide-y divide-slate-200">
      {buildTimeline(auditEvents, fallback).map((event) => (
        <div key={event.key} className="p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <p className="font-semibold text-slate-950">{event.title}</p>
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
              {event.relativeFromPrevious ? (
                <span className="mr-2 rounded-full bg-slate-100 px-2 py-1 normal-case tracking-normal text-slate-500">
                  +{event.relativeFromPrevious}
                </span>
              ) : null}
              {formatTimelineDate(event.date)}
            </p>
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {event.message}
          </p>
        </div>
      ))}
    </div>
  );
}

function buildTimeline(
  auditEvents: AuditTimelineEvent[],
  fallback: AuditTimelineProps["fallback"],
) {
  const events =
    auditEvents.length > 0
      ? auditEvents
          .slice()
          .sort(
            (left, right) =>
              left.createdAt.getTime() - right.createdAt.getTime(),
          )
          .map((event) => ({
            key: event.id,
            title: formatAuditEventTitle(event.eventType),
            message: event.message,
            date: event.createdAt,
          }))
      : [
          {
            key: "created",
            title: "Created",
            message: `Capsule created for ${fallback.customerName}.`,
            date: fallback.createdAt,
          },
        ];

  return events.map((event, index) => ({
    ...event,
    relativeFromPrevious:
      index > 0 ? formatRelativeGap(events[index - 1].date, event.date) : null,
  }));
}

function formatRelativeGap(previous: Date, current: Date): string {
  const diffMinutes = Math.max(
    0,
    Math.round((current.getTime() - previous.getTime()) / 60000),
  );

  if (diffMinutes < 60) {
    return `${diffMinutes} min`;
  }

  const diffHours = Math.round(diffMinutes / 60);

  if (diffHours < 48) {
    return `${diffHours} hr`;
  }

  const diffDays = Math.round(diffHours / 24);

  return `${diffDays} days`;
}
