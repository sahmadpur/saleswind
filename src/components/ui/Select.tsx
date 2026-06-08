import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

// Google-style chevron baked in as a background SVG so the control reads as Material.
const CHEVRON =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%235f6368' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")";

export function Select({ className, style, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      style={{
        backgroundImage: CHEVRON,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 0.75rem center",
        ...style,
      }}
      className={cn(
        "h-10 w-full appearance-none rounded-lg border border-gline bg-gsurface pl-4 pr-10 text-sm text-gink",
        "outline-none transition-colors duration-150",
        "hover:border-ggrey-2 focus:border-gblue focus:ring-1 focus:ring-gblue",
        "disabled:bg-ghover disabled:text-ggrey-2",
        className,
      )}
    />
  );
}
