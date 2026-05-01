import type { LucideIcon } from "lucide-react";

type DashboardCardProps = {
  title: string;
  value: number;
  detail: string;
  icon: LucideIcon;
};

export function DashboardCard({
  title,
  value,
  detail,
  icon: Icon,
}: DashboardCardProps) {
  return (
    <article className="group rounded-lg border border-slate-200/80 bg-white/80 p-5 shadow-sm shadow-slate-200/40 transition duration-200 hover:-translate-y-0.5 hover:border-teal-200 hover:bg-white hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            {title}
          </p>
          <p className="mt-4 text-4xl font-semibold tracking-normal text-slate-950 tabular-nums">
            {value}
          </p>
        </div>
        <div className="rounded-md bg-teal-50 p-2 text-teal-700 transition group-hover:bg-teal-700 group-hover:text-white">
          <Icon aria-hidden="true" size={22} />
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-600">{detail}</p>
    </article>
  );
}
