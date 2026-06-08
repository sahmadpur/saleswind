import { cn } from "@/lib/cn";

/** Google Material Symbol. `name` is the icon ligature, e.g. "search", "add", "notifications". */
export function Icon({
  name,
  className,
  filled = false,
  style,
}: {
  name: string;
  className?: string;
  filled?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <span
      aria-hidden
      style={style}
      className={cn("material-symbols-outlined", filled && "fill", className)}
    >
      {name}
    </span>
  );
}
