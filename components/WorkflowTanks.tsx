"use client";

/**
 * Compact readiness visualization for the eight AEB-adjacent target workflows.
 * Each vertical tank shows status by fill level and color while staying keyboard
 * accessible when click handling is enabled.
 */
export type WorkflowTankStatus = "ready" | "warning" | "blocked" | "na";

export type WorkflowTank = {
  id: string;
  label: string;
  status: WorkflowTankStatus;
  score?: number;
};

export type WorkflowTanksProps = {
  workflows: WorkflowTank[];
  size?: "sm" | "md" | "lg";
  showLabels?: boolean;
  onTankClick?: (workflowId: string) => void;
};

const STATUS_META: Record<
  WorkflowTankStatus,
  {
    label: string;
    color: string;
    fill: number;
  }
> = {
  ready: {
    label: "Ready",
    color: "#10b981",
    fill: 1,
  },
  warning: {
    label: "Warning",
    color: "#f59e0b",
    fill: 0.6,
  },
  blocked: {
    label: "Blocked",
    color: "#ef4444",
    fill: 0.2,
  },
  na: {
    label: "n/a",
    color: "#d1d5db",
    fill: 0,
  },
};

const SIZE_META = {
  sm: {
    tankWidth: 7,
    tankHeight: 18,
    gapClass: "gap-1",
    labelClass: "w-4 text-[8px]",
  },
  md: {
    tankWidth: 12,
    tankHeight: 28,
    gapClass: "gap-1.5",
    labelClass: "w-5 text-[9px]",
  },
  lg: {
    tankWidth: 18,
    tankHeight: 44,
    gapClass: "gap-3",
    labelClass: "w-6 text-[10px]",
  },
} as const;

export function WorkflowTanks({
  workflows,
  size = "md",
  showLabels = false,
  onTankClick,
}: WorkflowTanksProps) {
  const sizeMeta = SIZE_META[size];
  const isClickable = Boolean(onTankClick);

  return (
    <div
      aria-label="Readiness across 8 AEB workflows"
      className={`inline-flex items-end ${sizeMeta.gapClass}`}
      role="group"
    >
      {workflows.map((workflow) => (
        <TankItem
          key={workflow.id}
          isClickable={isClickable}
          onTankClick={onTankClick}
          showIcon={size === "lg"}
          showLabels={showLabels}
          sizeMeta={sizeMeta}
          workflow={workflow}
        />
      ))}
    </div>
  );
}

function TankItem({
  workflow,
  sizeMeta,
  showLabels,
  showIcon,
  isClickable,
  onTankClick,
}: {
  workflow: WorkflowTank;
  sizeMeta: (typeof SIZE_META)[keyof typeof SIZE_META];
  showLabels: boolean;
  showIcon: boolean;
  isClickable: boolean;
  onTankClick?: (workflowId: string) => void;
}) {
  const meta = STATUS_META[workflow.status];
  const title = `${workflow.label}: ${meta.label}${
    typeof workflow.score === "number" ? ` · ${workflow.score}%` : ""
  }`;
  const ariaLabel = `${workflow.label}: ${workflow.status}`;
  const content = (
    <>
      {showIcon ? (
        <StatusIcon color={meta.color} status={workflow.status} />
      ) : null}
      <TankSvg
        fillColor={meta.color}
        fillRatio={meta.fill}
        height={sizeMeta.tankHeight}
        isNotApplicable={workflow.status === "na"}
        width={sizeMeta.tankWidth}
      />
      {showLabels ? (
        <span
          className={`mt-1 truncate text-center font-medium leading-tight text-slate-500 ${sizeMeta.labelClass}`}
        >
          {workflow.label}
        </span>
      ) : null}
    </>
  );
  const baseClass =
    "group flex flex-col items-center rounded-md transition duration-150 ease-out hover:scale-110";

  if (isClickable) {
    return (
      <button
        aria-label={ariaLabel}
        className={`${baseClass} cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2`}
        onClick={() => onTankClick?.(workflow.id)}
        title={title}
        type="button"
      >
        {content}
      </button>
    );
  }

  return (
    <div
      aria-label={ariaLabel}
      className={baseClass}
      title={title}
    >
      {content}
    </div>
  );
}

function TankSvg({
  width,
  height,
  fillRatio,
  fillColor,
  isNotApplicable,
}: {
  width: number;
  height: number;
  fillRatio: number;
  fillColor: string;
  isNotApplicable: boolean;
}) {
  const inset = 1.5;
  const innerWidth = width - inset * 2;
  const innerHeight = height - inset * 2;

  return (
    <svg
      aria-hidden="true"
      className="block drop-shadow-[0_1px_1px_rgba(15,23,42,0.10)]"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
    >
      <rect
        fill="rgba(255,255,255,0.78)"
        height={height - 1}
        rx="3.5"
        stroke={isNotApplicable ? "#d1d5db" : "rgba(15,23,42,0.24)"}
        strokeDasharray={isNotApplicable ? "2 2" : undefined}
        strokeWidth="1"
        width={width - 1}
        x="0.5"
        y="0.5"
      />
      <rect
        fill={fillColor}
        height={innerHeight}
        opacity={fillRatio > 0 ? "0.92" : "0"}
        rx="2.5"
        style={{
          transform: `scaleY(${fillRatio})`,
          transformBox: "fill-box",
          transformOrigin: "center bottom",
          transition:
            "transform 360ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 240ms ease",
        }}
        width={innerWidth}
        x={inset}
        y={inset}
      />
      <rect
        fill="rgba(255,255,255,0.34)"
        height={Math.max(3, height * 0.16)}
        rx="2"
        width={Math.max(2, width - 4)}
        x="2"
        y="2"
      />
    </svg>
  );
}

function StatusIcon({
  status,
  color,
}: {
  status: WorkflowTankStatus;
  color: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className="mb-1"
      fill="none"
      height="13"
      viewBox="0 0 13 13"
      width="13"
    >
      {status === "ready" ? (
        <path
          d="M3.1 6.7 5.4 9l4.5-5"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      ) : null}
      {status === "warning" ? (
        <>
          <path
            d="M6.5 2.1 11 10.3H2L6.5 2.1Z"
            stroke={color}
            strokeLinejoin="round"
            strokeWidth="1.4"
          />
          <path
            d="M6.5 5.1v2.4"
            stroke={color}
            strokeLinecap="round"
            strokeWidth="1.4"
          />
          <circle cx="6.5" cy="9" fill={color} r="0.7" />
        </>
      ) : null}
      {status === "blocked" ? (
        <path
          d="M3.6 3.6 9.4 9.4M9.4 3.6 3.6 9.4"
          stroke={color}
          strokeLinecap="round"
          strokeWidth="1.8"
        />
      ) : null}
      {status === "na" ? (
        <path
          d="M3.2 6.5h6.6"
          stroke={color}
          strokeLinecap="round"
          strokeWidth="1.8"
        />
      ) : null}
    </svg>
  );
}
