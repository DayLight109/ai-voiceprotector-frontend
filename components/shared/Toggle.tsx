"use client";

export default function Toggle({
  checked,
  onChange,
  accent = "var(--indigo)",
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  accent?: string;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      data-toggle
      data-on={checked ? "true" : "false"}
      className="ui-toggle relative w-11 h-6 rounded-full transition-colors shrink-0"
      style={{ background: checked ? accent : "var(--canvas-3)" }}
      aria-pressed={checked}
    >
      <span
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all"
        style={{ left: checked ? "22px" : "2px" }}
      />
    </button>
  );
}
