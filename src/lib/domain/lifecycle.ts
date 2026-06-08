import type { State } from "@prisma/client";

export const ORDER: State[] = ["PROSPECT", "SALES", "CONTRACT", "PROJECT"];

export function nextState(s: State): State | null {
  const i = ORDER.indexOf(s);
  return i >= 0 && i < ORDER.length - 1 ? ORDER[i + 1] : null;
}

export function prevState(s: State): State | null {
  const i = ORDER.indexOf(s);
  return i > 0 ? ORDER[i - 1] : null;
}

export function canAdvance(s: State): boolean {
  return nextState(s) !== null;
}

export function canMoveBack(s: State): boolean {
  return prevState(s) !== null;
}
