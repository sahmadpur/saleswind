export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-white p-6 shadow-sm ${className}`}>{children}</div>;
}
