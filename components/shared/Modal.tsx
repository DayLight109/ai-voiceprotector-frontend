"use client";
import { X } from "lucide-react";
import { useEffect } from "react";

export default function Modal({
  open,
  onClose,
  title,
  desc,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  desc?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const w = size === "sm" ? "max-w-md" : size === "lg" ? "max-w-3xl" : "max-w-xl";

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-deep/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className={`relative w-full ${w} bg-surface rounded-3xl shadow-xl border border-border overflow-hidden rise`}>
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-border">
          <div className="flex-1">
            <h3 className="font-display text-[calc(20px*var(--fz))] font-extrabold tracking-tight">{title}</h3>
            {desc && <p className="mt-1 text-[calc(13px*var(--fz))] text-ink-soft font-medium">{desc}</p>}
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl hover:bg-canvas-2 flex items-center justify-center text-ink-soft"
            aria-label="关闭"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-border bg-canvas-2/60 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
