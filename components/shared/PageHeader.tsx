import { ReactNode } from "react";

export default function PageHeader({
  eyebrow,
  title,
  desc,
  actions,
}: {
  eyebrow?: string;
  title: string;
  desc?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 rise-soft">
      <div className="flex-1 min-w-0">
        {eyebrow && (
          <div className="font-mono text-[calc(11px*var(--fz))] uppercase tracking-[0.18em] text-ink-soft font-bold mb-2">
            {eyebrow}
          </div>
        )}
        <h1 className="font-display text-[calc(32px*var(--fz))] md:text-[calc(40px*var(--fz))] font-extrabold tracking-tight">
          {title}
        </h1>
        {desc && <p className="mt-2 text-[calc(14px*var(--fz))] text-ink-soft font-medium max-w-3xl">{desc}</p>}
      </div>
      {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
    </div>
  );
}
