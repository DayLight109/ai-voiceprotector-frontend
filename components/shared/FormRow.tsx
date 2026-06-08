import { ReactNode } from "react";

export default function FormRow({
  label,
  desc,
  children,
}: {
  label: string;
  desc?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-5 border-b border-border last:border-b-0">
      <div className="flex-1 min-w-0">
        <div className="font-display text-[calc(14px*var(--fz))] font-extrabold">{label}</div>
        {desc && <div className="mt-1 text-[calc(12px*var(--fz))] text-ink-soft font-medium">{desc}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
