import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "tonal" | "ghost" | "outline" | "danger";

const VARIANTS: Record<Variant, string> = {
  // Filled Material button — Google blue, pill shaped, elevates on hover.
  primary:
    "bg-gblue text-white hover:bg-gblue-hover focus-visible:bg-gblue-dark disabled:bg-gline disabled:text-ggrey-2",
  // Tonal — soft blue fill, the Workspace secondary action.
  tonal:
    "bg-gblue-100 text-gblue-dark hover:bg-gblue-200 disabled:bg-ghover disabled:text-ggrey-2",
  // Text button — no chrome until hovered.
  ghost:
    "bg-transparent text-gblue hover:bg-gblue-50 disabled:text-ggrey-2 disabled:hover:bg-transparent",
  // Outlined — hairline border, used for low-emphasis actions.
  outline:
    "border border-gline bg-gsurface text-gink hover:bg-ghover disabled:text-ggrey-2",
  // Destructive.
  danger:
    "bg-gred text-white hover:bg-gred-hover disabled:bg-gline disabled:text-ggrey-2",
};

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={cn(
        "g-press inline-flex h-9 shrink-0 items-center whitespace-nowrap justify-center gap-1.5 rounded-md px-4 text-sm font-medium outline-none g-focus disabled:cursor-not-allowed [&_.material-symbols-outlined]:text-[18px]",
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}
