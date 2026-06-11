import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Textarea({ className, rows = 8, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      rows={rows}
      {...props}
      className={cn(
        "w-full resize-y rounded-lg border border-gline bg-gsurface px-4 py-2.5 text-sm text-gink",
        "placeholder:text-ggrey-2 outline-none transition-colors duration-150",
        "hover:border-ggrey-2 focus:border-gblue focus:ring-1 focus:ring-gblue",
        "disabled:bg-ghover disabled:text-ggrey-2",
        className,
      )}
    />
  );
}
