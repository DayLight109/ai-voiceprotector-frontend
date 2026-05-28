"use client";
import { ReactNode, useMemo, useState } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

export type Column<T> = {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  width?: string;
  align?: "left" | "right" | "center";
};

export default function DataTable<T extends { id: string }>({
  rows,
  columns,
  searchKeys,
  pageSize = 8,
  actions,
  empty,
}: {
  rows: T[];
  columns: Column<T>[];
  searchKeys?: (keyof T)[];
  pageSize?: number;
  actions?: (row: T) => ReactNode;
  empty?: ReactNode;
}) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!q.trim() || !searchKeys?.length) return rows;
    const needle = q.toLowerCase();
    return rows.filter((r) =>
      searchKeys.some((k) => String(r[k] ?? "").toLowerCase().includes(needle))
    );
  }, [rows, q, searchKeys]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const curPage = Math.min(page, pages - 1);
  const view = filtered.slice(curPage * pageSize, (curPage + 1) * pageSize);

  return (
    <div className="space-y-3">
      {searchKeys && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-canvas-2 border border-border w-72">
          <Search size={14} className="text-ink-soft" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
            placeholder="搜索…"
            className="flex-1 bg-transparent text-[13px] font-medium placeholder:text-ink-ghost focus:outline-none"
          />
          {q && (
            <button onClick={() => setQ("")} className="text-ink-soft text-[11px] font-bold">
              清除
            </button>
          )}
        </div>
      )}

      <div className="overflow-x-auto -mx-2">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className="px-3 py-3"
                  style={{ width: c.width, textAlign: c.align ?? "left" }}
                >
                  {c.label}
                </th>
              ))}
              {actions && <th className="px-3 py-3 text-right">操作</th>}
            </tr>
          </thead>
          <tbody>
            {view.length === 0 && (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="px-3 py-12 text-center text-ink-soft">
                  {empty ?? "暂无数据"}
                </td>
              </tr>
            )}
            {view.map((row) => (
              <tr key={row.id} className="border-t border-border hover:bg-canvas-2/60 transition-colors">
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className="px-3 py-3 align-middle"
                    style={{ textAlign: c.align ?? "left" }}
                  >
                    {c.render ? c.render(row) : (row as any)[c.key]}
                  </td>
                ))}
                {actions && <td className="px-3 py-3 text-right">{actions(row)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold">
            共 {filtered.length} 条 · 第 {curPage + 1} / {pages} 页
          </div>
          <div className="flex items-center gap-1">
            <button
              disabled={curPage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="w-8 h-8 rounded-lg border border-border bg-surface flex items-center justify-center disabled:opacity-40 hover:bg-canvas-2"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              disabled={curPage >= pages - 1}
              onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
              className="w-8 h-8 rounded-lg border border-border bg-surface flex items-center justify-center disabled:opacity-40 hover:bg-canvas-2"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
