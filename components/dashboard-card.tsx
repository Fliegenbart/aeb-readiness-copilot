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
      line: "from-indigo-500 to-sky-400",
      icon: "bg-indigo-50 text-indigo-700 group-hover:bg-indigo-600",
      value: "text-indigo-950",
    },
  }[tone];

  return (
    <article className="group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white/85 p-5 shadow-sm shadow-slate-200/40 backdrop-blur transition duration-200 hover:-translate-y-1 hover:bg-white hover:shadow-lg hover:shadow-slate-300/40">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${tones.line}`} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            {title}
          </p>
          <p className={`mt-4 text-4xl font-semibold tracking-normal tabular-nums ${tones.value}`}>
            {value}
          </p>
        </div>
        <div className={`rounded-lg p-2 transition ${tones.icon} group-hover:text-white`}>
          <Icon aria-hidden="true" size={22} />
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-600">{detail}</p>
    </article>
  );
}
