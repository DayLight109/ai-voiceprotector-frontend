"use client";
import { UploadCloud, FileSpreadsheet } from "lucide-react";
import { DragEvent, useState } from "react";

export default function UploadZone({
  accept = ".xls,.xlsx",
  hint = "支持 XLS / XLSX 格式，单次最多 5 MB",
  onFiles,
}: {
  accept?: string;
  hint?: string;
  onFiles: (files: { name: string; size: number; lines: number }[]) => void;
}) {
  const [drag, setDrag] = useState(false);
  const [pending, setPending] = useState(false);

  const handle = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    setPending(true);
    const out: { name: string; size: number; lines: number }[] = [];
    for (const f of Array.from(list)) {
      // 仅模拟：读出名字 + 大小，假装解析出若干行
      out.push({
        name: f.name,
        size: f.size,
        lines: Math.floor(f.size / 64) + Math.floor(Math.random() * 18 + 4),
      });
    }
    await new Promise((r) => setTimeout(r, 280));
    onFiles(out);
    setPending(false);
  };

  return (
    <label
      onDragOver={(e: DragEvent) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e: DragEvent) => {
        e.preventDefault();
        setDrag(false);
        handle(e.dataTransfer.files);
      }}
      className="block cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-colors"
      style={{
        borderColor: drag ? "var(--indigo)" : "var(--border)",
        background: drag ? "var(--indigo-soft)" : "var(--surface)",
      }}
    >
      <input
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={(e) => handle(e.target.files)}
      />
      <div className="mx-auto w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: "var(--indigo-soft)", color: "var(--indigo-deep)" }}>
        {pending ? <FileSpreadsheet size={20} className="animate-pulse" /> : <UploadCloud size={20} />}
      </div>
      <div className="font-display text-[15px] font-extrabold">
        {pending ? "正在解析…" : drag ? "松手即可上传" : "拖入文件 / 点击选择"}
      </div>
      <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft font-bold">{hint}</div>
    </label>
  );
}
