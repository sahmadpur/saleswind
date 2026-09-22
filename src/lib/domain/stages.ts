import type { Stage } from "@prisma/client";
import { ORDER } from "@/lib/domain/lifecycle";

/**
 * One place for how a stage looks. Tailwind class names must be literal strings so the
 * scanner can see them; charts need a hex, because Recharts takes colours, not classes.
 *
 * `hex` is a re-stepped version of the UI colour, not the same value: side by side as
 * chart bars, gsales (#1d4ed8) and gviolet (#6d28d9) are indistinguishable — ΔE 11 to
 * normal vision and 0.3 under deuteranopia. These four steps keep the same hue families
 * and pass every check in the dataviz validator against a light surface.
 */
export const STAGE_META: Record<Stage, { label: string; bar: string; dot: string; hex: string }> = {
  PROSPECT: { label: "Prospect", bar: "bg-gyellow", dot: "bg-gyellow", hex: "#d97706" },
  SALES: { label: "Sales", bar: "bg-gsales", dot: "bg-gsales", hex: "#0284c7" },
  CONTRACT: { label: "Contract", bar: "bg-gviolet", dot: "bg-gviolet", hex: "#7e22ce" },
  PROJECT: { label: "Project", bar: "bg-ggreen", dot: "bg-ggreen", hex: "#15803d" },
};

/** Status colours are reserved for state, never reused as a series colour. */
export const STATUS_CHART_HEX: Record<string, string> = {
  Cancelled: "#b91c1c",
  Lost: "#b91c1c",
  Pending: "#d97706",
  Delayed: "#d97706",
  Implemented: "#15803d",
  "In Progress": "#0284c7",
  "Not Started": "#8b93a5",
};

export const statusHex = (label: string) => STATUS_CHART_HEX[label] ?? "#5b6478";

export const stageLabel = (s: Stage) => STAGE_META[s].label;

export { ORDER as STAGE_ORDER };
