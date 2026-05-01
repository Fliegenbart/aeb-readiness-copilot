export const SCORE_THRESHOLDS = {
  ready: 80,
  warning: 50,
} as const;

export const SCORE_THRESHOLD_TOOLTIP =
  "Ready ≥ 80 · Warning 50–79 · Blocked < 50";

export type ScoreBand = "ready" | "warning" | "blocked";

export function getScoreBand(score: number): ScoreBand {
  if (score >= SCORE_THRESHOLDS.ready) {
    return "ready";
  }

  if (score >= SCORE_THRESHOLDS.warning) {
    return "warning";
  }

  return "blocked";
}

export function clampScoreToPercent(score: number): number {
  return Math.min(100, Math.max(0, score));
}
