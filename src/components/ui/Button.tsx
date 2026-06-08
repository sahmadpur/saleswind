import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";

export function Button({ className, variant = "primary", ...props }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  const styles = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    ghost: "bg-transparent text-neutral-700 hover:bg-neutral-100",
    danger: "bg-red-600 text-white hover:bg-red-700",
  }[variant];
  return <button className={cn("rounded-lg px-4 py-2 text-sm font-medium transition", styles, className)} {...props} />;
}
