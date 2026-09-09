import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-10 w-full rounded-md border border-gline bg-gsurface px-3 text-sm text-gink",
        "placeholder:text-ggrey-2 outline-none transition-colors duration-150",
        "hover:border-ggrey-2 focus:border-gblue focus:ring-2 focus:ring-gblue/25",
        "disabled:bg-ghover disabled:text-ggrey-2",
        className,
      )}
    />
  );
}
