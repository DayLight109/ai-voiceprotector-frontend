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
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="flex-1 min-w-0">
        {eyebrow && (
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft font-bold mb-2">
            {eyebrow}
          </div>
        )}
        <h1 className="font-display text-[32px] md:text-[40px] font-extrabold tracking-tight">
          {title}
        </h1>
        {desc && <p className="mt-2 text-[14px] text-ink-soft font-medium max-w-3xl">{desc}</p>}
      </div>
      {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
    </div>
  );
}
