import { cn } from "@/lib/cn";

// Google-ish deterministic avatar tints (no Math.random — stable per name).
const TINTS = [
  "bg-[#1a73e8]",
  "bg-[#d93025]",
  "bg-[#1e8e3e]",
  "bg-[#e37400]",
  "bg-[#8430ce]",
  "bg-[#129eaf]",
  "bg-[#c5221f]",
  "bg-[#9334e6]",
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
