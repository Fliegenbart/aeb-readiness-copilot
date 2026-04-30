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
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-4 text-4xl font-semibold tracking-normal text-slate-950">
            {value}
          </p>
        </div>
        <div className="rounded-md bg-teal-50 p-2 text-teal-700">
          <Icon aria-hidden="true" size={22} />
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-600">{detail}</p>
    </article>
  );
}
