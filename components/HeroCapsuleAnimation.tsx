"use client";

import { useEffect, useMemo, useState } from "react";

import { WorkflowTanks, type WorkflowTank } from "@/components/WorkflowTanks";

type Phase = {
  duration: number;
  score: number;
  activeRow?: IntakeRowId;
  visibleRows: IntakeRowId[];
  statuses: Partial<Record<IntakeRowId, IntakeRowStatus>>;
  showReadyTag: boolean;
  pulseScore: boolean;
  isReset?: boolean;
};

type IntakeRowId = "invoice" | "packing" | "erp" | "endUse";
type IntakeRowStatus = "queued" | "matched" | "review" | "parsed";

const ROWS: Array<{
  id: IntakeRowId;
  label: string;
}> = [
  { id: "invoice", label: "Commercial invoice" },
  { id: "packing", label: "Packing list" },
  { id: "erp", label: "ERP export" },
  { id: "endUse", label: "End-use statement" },
];

const PHASES: Phase[] = [
  {
    duration: 500,
    score: 0,
    visibleRows: ["invoice", "packing", "erp"],
    statuses: {},
    showReadyTag: false,
    pulseScore: false,
  },
  {
    duration: 1000,
    score: 25,
    activeRow: "invoice",
    visibleRows: ["invoice", "packing", "erp"],
    statuses: { invoice: "matched" },
    showReadyTag: false,
    pulseScore: false,
  },
  {
    duration: 1000,
    score: 45,
    activeRow: "packing",
    visibleRows: ["invoice", "packing", "erp"],
    statuses: { invoice: "matched", packing: "review" },
    showReadyTag: false,
    pulseScore: false,
  },
  {
    duration: 1000,
    score: 65,
    activeRow: "erp",
    visibleRows: ["invoice", "packing", "erp"],
    statuses: { invoice: "matched", packing: "review", erp: "parsed" },
    showReadyTag: false,
    pulseScore: false,
  },
  {
    duration: 1000,
    score: 76,
    activeRow: "endUse",
    visibleRows: ["invoice", "packing", "erp", "endUse"],
    statuses: {
      invoice: "matched",
      packing: "review",
      erp: "parsed",
      endUse: "matched",
    },
    showReadyTag: false,
    pulseScore: false,
  },
  {
    duration: 1000,
    score: 76,
    visibleRows: ["invoice", "packing", "erp", "endUse"],
    statuses: {
      invoice: "matched",
      packing: "review",
      erp: "parsed",
      endUse: "matched",
    },
    showReadyTag: true,
    pulseScore: true,
  },
  {
    duration: 1000,
    score: 76,
    visibleRows: ["invoice", "packing", "erp", "endUse"],
    statuses: {
      invoice: "matched",
      packing: "review",
      erp: "parsed",
      endUse: "matched",
    },
    showReadyTag: true,
    pulseScore: false,
  },
  {
    duration: 300,
    score: 0,
    visibleRows: ["invoice", "packing", "erp"],
    statuses: {},
    showReadyTag: false,
    pulseScore: false,
    isReset: true,
  },
];

const FINAL_PHASE = PHASES[5];

export function HeroCapsuleAnimation() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const phase = prefersReducedMotion ? FINAL_PHASE : PHASES[phaseIndex];
  const workflows = useMemo(() => buildWorkflows(phase), [phase]);

  useEffect(() => {
    if (prefersReducedMotion || isPaused) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setPhaseIndex((current) => (current + 1) % PHASES.length);
    }, phase.duration);

    return () => window.clearTimeout(timeout);
  }, [isPaused, phase.duration, prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion) {
      setPhaseIndex(5);
    }
  }, [prefersReducedMotion]);

  return (
    <div
      aria-label="Animated mock shipment capsule"
      className="w-full rounded-xl border border-white/10 bg-white/10 p-5 shadow-2xl shadow-black/20 backdrop-blur"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        className={`transition-opacity duration-300 ${
          phase.isReset ? "opacity-0" : "opacity-100"
        }`}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-200">
          Mock shipment capsule
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-white">
          EU-DE-4288 / Industrial valves
        </h2>

        <dl className="mt-5 grid min-h-[180px] gap-3 text-sm">
          {ROWS.map((row) => (
            <IntakeRow
              key={row.id}
              isActive={phase.activeRow === row.id}
              isVisible={phase.visibleRows.includes(row.id)}
              label={row.label}
              status={phase.statuses[row.id] ?? "queued"}
            />
          ))}
          <div className="flex min-h-10 items-center justify-between rounded-lg bg-teal-300/15 px-3 py-2">
            <dt className="text-slate-200">AEB-ready score</dt>
            <dd className="flex items-center gap-2 font-semibold text-white">
              <span>{phase.score}%</span>
              <span
                className={`rounded-full border border-teal-200/30 bg-teal-200/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-teal-100 transition duration-300 ${
                  phase.showReadyTag
                    ? "translate-y-0 opacity-100"
                    : "translate-y-1 opacity-0"
                }`}
              >
                AEB-ready
              </span>
            </dd>
          </div>
        </dl>

        <div
          className={`mt-5 h-2 overflow-hidden rounded-full bg-white/10 ${
            phase.pulseScore ? "hero-score-pulse" : ""
          }`}
        >
          <div
            className="h-full w-full origin-left rounded-full bg-gradient-to-r from-amber-300 to-teal-300 transition-transform duration-500 ease-out"
            style={{ transform: `scaleX(${phase.score / 100})` }}
          />
        </div>

        <div className="mt-5 flex items-end justify-between gap-4 rounded-lg bg-white/10 px-3 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
              Workflows
            </p>
            <p className="mt-1 text-xs text-slate-400">8 target checks</p>
          </div>
          <WorkflowTanks size="md" workflows={workflows} />
        </div>
      </div>
    </div>
  );
}

function IntakeRow({
  label,
  status,
  isActive,
  isVisible,
}: {
  label: string;
  status: IntakeRowStatus;
  isActive: boolean;
  isVisible: boolean;
}) {
  const meta = statusMeta(status);

  return (
    <div
      className={`flex min-h-10 items-center justify-between rounded-lg px-3 py-2 transition duration-300 ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
      } ${isActive ? "bg-white/[0.16] ring-1 ring-white/20" : "bg-white/10"}`}
    >
      <dt className="text-slate-300">{label}</dt>
      <dd
        className={`font-semibold transition duration-300 ${
          isActive ? "scale-[1.02]" : "scale-100"
        } ${meta.className}`}
      >
        {meta.label}
      </dd>
    </div>
  );
}

function buildWorkflows(phase: Phase): WorkflowTank[] {
  return [
    {
      id: "CUSTOMS_BROKER_INTEGRATION",
      label: "Customs Broker Integration",
      status: phase.score >= 25 ? "ready" : "na",
      score: phase.score >= 25 ? 88 : undefined,
    },
    {
      id: "CUSTOMS_MANAGEMENT",
      label: "Customs Management",
      status: phase.score >= 45 ? "warning" : "na",
      score: phase.score >= 45 ? 62 : undefined,
    },
    {
      id: "PRODUCT_CLASSIFICATION",
      label: "Product Classification",
      status: phase.score >= 65 ? "ready" : "na",
      score: phase.score >= 65 ? 84 : undefined,
    },
    {
      id: "EXPORT_CONTROLS",
      label: "Export Controls",
      status: phase.score >= 65 ? "warning" : "na",
      score: phase.score >= 65 ? 58 : undefined,
    },
    {
      id: "COMPLIANCE_SCREENING",
      label: "Compliance Screening",
      status: phase.score >= 76 ? "ready" : "na",
      score: phase.score >= 76 ? 88 : undefined,
    },
    {
      id: "LICENSE_MANAGEMENT",
      label: "License Management",
      status: phase.score >= 76 ? "warning" : "na",
      score: phase.score >= 76 ? 64 : undefined,
    },
    {
      id: "RISK_ASSESSMENT",
      label: "Risk Assessment",
      status: phase.score >= 76 ? "ready" : "na",
      score: phase.score >= 76 ? 81 : undefined,
    },
    {
      id: "CARRIER_CONNECT",
      label: "Carrier Connect",
      status: "na",
    },
  ];
}

function statusMeta(status: IntakeRowStatus): {
  label: string;
  className: string;
} {
  if (status === "matched") {
    return {
      label: "Matched ✓",
      className: "text-emerald-200",
    };
  }

  if (status === "review") {
    return {
      label: "Needs review",
      className: "text-amber-200",
    };
  }

  if (status === "parsed") {
    return {
      label: "Parsed ✓",
      className: "text-emerald-200",
    };
  }

  return {
    label: "Queued",
    className: "text-slate-500",
  };
}

function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");

    setPrefersReducedMotion(query.matches);

    function handleChange(event: MediaQueryListEvent) {
      setPrefersReducedMotion(event.matches);
    }

    query.addEventListener("change", handleChange);

    return () => query.removeEventListener("change", handleChange);
  }, []);

  return prefersReducedMotion;
}
