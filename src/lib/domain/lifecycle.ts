import type { Stage } from "@prisma/client";

export const ORDER: readonly Stage[] = ["PROSPECT", "SALES", "CONTRACT", "PROJECT"];

export function nextStage(s: Stage): Stage | null {
  const i = ORDER.indexOf(s);
  return i >= 0 && i < ORDER.length - 1 ? ORDER[i + 1] : null;
}

export function prevStage(s: Stage): Stage | null {
  const i = ORDER.indexOf(s);
  return i > 0 ? ORDER[i - 1] : null;
}

export function canAdvance(s: Stage): boolean {
  return nextStage(s) !== null;
}

export function canMoveBack(s: Stage): boolean {
  return prevStage(s) !== null;
}
