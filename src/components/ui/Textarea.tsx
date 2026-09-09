import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Textarea({ className, rows = 8, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      rows={rows}
      {...props}
      className={cn(
        "w-full resize-y rounded-md border border-gline bg-gsurface px-3 py-2 text-sm text-gink",
        "placeholder:text-ggrey-2 outline-none transition-colors duration-150",
        "hover:border-ggrey-2 focus:border-gblue focus:ring-2 focus:ring-gblue/25",
        "disabled:bg-ghover disabled:text-ggrey-2",
        className,
      )}
    />
  );
}
