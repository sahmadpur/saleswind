"use client";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";

/** Table row that navigates on click, ignoring clicks on interactive elements inside it. */
export function RowLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <tr
      className={cn("cursor-pointer", className)}
      tabIndex={0}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a,button,input,select,label")) return;
        router.push(href);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && e.target === e.currentTarget) router.push(href);
      }}
    >
      {children}
    </tr>
  );
}
