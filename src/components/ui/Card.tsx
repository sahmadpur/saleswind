import { cn } from "@/lib/cn";

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-gline-2 bg-gsurface p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Section heading used inside cards — small caps-ish Google label. */
export function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 text-sm font-semibold text-gink">{children}</h2>
  );
}
