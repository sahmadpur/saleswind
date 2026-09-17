/** Fixed palette admins pick status colours from. Class strings are literal so Tailwind can see them. */
export const STATUS_COLORS = {
  grey: { label: "Grey", wrap: "bg-ghover text-ggrey", dot: "bg-ggrey-2" },
  blue: { label: "Blue", wrap: "bg-gsales-50 text-gsales", dot: "bg-gsales" },
  teal: { label: "Teal", wrap: "bg-gblue-50 text-gblue-dark", dot: "bg-gblue" },
  green: { label: "Green", wrap: "bg-ggreen-50 text-ggreen", dot: "bg-ggreen" },
  amber: { label: "Amber", wrap: "bg-gyellow-50 text-gyellow-dark", dot: "bg-gyellow" },
  red: { label: "Red", wrap: "bg-gred-50 text-gred", dot: "bg-gred" },
  violet: { label: "Violet", wrap: "bg-gviolet-50 text-gviolet", dot: "bg-gviolet" },
} as const;

export type StatusColor = keyof typeof STATUS_COLORS;

export const isStatusColor = (c: string): c is StatusColor => c in STATUS_COLORS;

export const statusColor = (c: string | null | undefined) => STATUS_COLORS[c && isStatusColor(c) ? c : "grey"];
