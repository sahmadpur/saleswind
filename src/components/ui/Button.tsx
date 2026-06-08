import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "tonal" | "ghost" | "outline" | "danger";

const VARIANTS: Record<Variant, string> = {
  // Filled Material button — Google blue, pill shaped, elevates on hover.
  primary:
    "bg-gblue text-white shadow-g1 hover:bg-gblue-hover hover:shadow-g2 focus-visible:bg-gblue-dark disabled:bg-gline disabled:text-ggrey-2 disabled:shadow-none",
  // Tonal — soft blue fill, the Workspace secondary action.
  tonal:
    "bg-gblue-100 text-gblue-dark hover:bg-gblue-200 disabled:bg-ghover disabled:text-ggrey-2",
  // Text button — no chrome until hovered.
  ghost:
    "bg-transparent text-gblue hover:bg-gblue-50 disabled:text-ggrey-2 disabled:hover:bg-transparent",
  // Outlined — hairline border, used for low-emphasis actions.
  outline:
    "border border-gline bg-transparent text-gblue hover:bg-gblue-50 hover:border-gline disabled:text-ggrey-2",
  // Destructive.
  danger:
    "bg-gred text-white shadow-g1 hover:bg-gred-hover hover:shadow-g2 disabled:bg-gline disabled:text-ggrey-2 disabled:shadow-none",
};

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={cn(
        "g-press inline-flex h-9 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium tracking-[0.0107em] outline-none g-focus disabled:cursor-not-allowed [&_.material-symbols-outlined]:text-[18px]",
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}
