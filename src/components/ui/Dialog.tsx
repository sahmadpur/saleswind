"use client";
export function Dialog({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gink/50 p-4"
      style={{ animation: "g-fade 0.15s ease both" }}
      onClick={onClose}
    >
      <div
        className="g-pop w-full max-w-md rounded-lg bg-gsurface p-6 shadow-g3"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
