import { cn } from "@/lib/cn";

// Google-ish deterministic avatar tints (no Math.random — stable per name).
const TINTS = [
  "bg-[#0f766e]",
  "bg-[#1d4ed8]",
  "bg-[#6d28d9]",
  "bg-[#b45309]",
  "bg-[#15803d]",
  "bg-[#b91c1c]",
  "bg-[#0e7490]",
  "bg-[#4338ca]",
];

function tintFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
}

export function Avatar({
  name,
  size = 32,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const initial = (name?.trim()?.[0] ?? "?").toUpperCase();
  return (
    <span
      style={{ width: size, height: size, fontSize: size * 0.44 }}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-medium text-white",
        tintFor(name || "?"),
        className,
      )}
      title={name}
    >
      {initial}
    </span>
  );
}
