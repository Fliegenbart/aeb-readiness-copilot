import type { LucideIcon } from "lucide-react";

type DashboardCardProps = {
  title: string;
  value: number;
  detail: string;
  icon: LucideIcon;
  tone?: "teal" | "emerald" | "amber" | "rose" | "indigo";
};

export function DashboardCard({
  title,
  value,
  detail,
  icon: Icon,
  tone = "teal",
}: DashboardCardProps) {
  const tones = {
    teal: {
      line: "from-teal-500 to-cyan-400",
      icon: "bg-teal-50 text-teal-700 group-hover:bg-teal-600",
      value: "text-teal-950",
    },
    emerald: {
      line: "from-emerald-500 to-teal-400",
      icon: "bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600",
      value: "text-emerald-950",
    },
    amber: {
      line: "from-amber-400 to-orange-400",
      icon: "bg-amber-50 text-amber-700 group-hover:bg-amber-500",
      value: "text-amber-950",
    },
    rose: {
      line: "from-rose-500 to-red-400",
      icon: "bg-rose-50 text-rose-700 group-hover:bg-rose-600",
      value: "text-rose-950",
    },
    indigo: {
      line: "from-cyan-500 to-teal-400",
      icon: "bg-cyan-50 text-cyan-700 group-hover:bg-cyan-600",
      value: "text-cyan-950",
    },
  }[tone];

  return (
    <article className="premium-panel group relative overflow-hidden rounded-2xl p-5 transition duration-200 hover:-translate-y-1 hover:shadow-[0_20px_48px_rgba(15,23,42,0.1)]">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${tones.line}`} />
      <div className="precision-hatch absolute inset-y-0 right-0 w-20 opacity-60 transition duration-200 group-hover:opacity-90" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            {title}
          </p>
          <p
            className={`mt-4 text-4xl font-semibold tracking-normal tabular-nums ${tones.value}`}
          >
            {value}
          </p>
        </div>
        <div
          className={`rounded-xl p-2.5 shadow-sm transition ${tones.icon} group-hover:text-white`}
        >
          <Icon aria-hidden="true" size={22} />
        </div>
      </div>
      <p className="mt-4 max-w-[24ch] text-sm leading-6 text-slate-600">{detail}</p>
    </article>
  );
}
