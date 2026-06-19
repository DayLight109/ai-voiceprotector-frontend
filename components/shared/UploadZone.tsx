"use client";
import { UploadCloud, FileSpreadsheet } from "lucide-react";
import { DragEvent, useState } from "react";

export type UploadedFile = {
  file: File;
  name: string;
  size: number;
};

export default function UploadZone({
  accept = ".xls,.xlsx",
  hint = "支持 XLS / XLSX 格式，单次最多 5 MB",
  onFiles,
}: {
  accept?: string;
  hint?: string;
  onFiles: (files: UploadedFile[]) => void | Promise<void>;
}) {
  const [drag, setDrag] = useState(false);
  const [pending, setPending] = useState(false);

  const handle = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    setPending(true);
    try {
      await onFiles(
        Array.from(list).map((file) => ({
          file,
          name: file.name,
          size: file.size,
        })),
      );
    } finally {
      setPending(false);
    }
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
        onChange={(e) => {
          void handle(e.target.files);
          e.currentTarget.value = "";
        }}
      />
      <div className="mx-auto w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: "var(--indigo-soft)", color: "var(--indigo-deep)" }}>
        {pending ? <FileSpreadsheet size={20} className="animate-pulse" /> : <UploadCloud size={20} />}
      </div>
      <div className="font-display text-[calc(15px*var(--fz))] font-extrabold">
        {pending ? "正在解析…" : drag ? "松手即可上传" : "拖入文件 / 点击选择"}
      </div>
      <div className="mt-1 font-mono text-[calc(11px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">{hint}</div>
    </label>
  );
}
