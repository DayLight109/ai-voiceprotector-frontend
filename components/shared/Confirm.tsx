"use client";
import { createContext, useCallback, useContext, useRef, useState } from "react";
import Modal from "@/components/shared/Modal";
import { AlertTriangle } from "lucide-react";

// 全局二次确认弹窗。仿 ToastProvider 的 provider 模式，
// 但 useConfirm() 返回一个 async 函数：await 它拿到 boolean。
//
// 用法（在调用不可逆 API 前拦一道）：
//   const confirm = useConfirm();
//   const ok = await confirm({ title: "删除录音？", desc: "删除即彻底擦除，无法恢复。", tone: "danger", confirmText: "删除" });
//   if (!ok) return;
//   await api.recordings.remove(id);

export type ConfirmTone = "danger" | "default";

export interface ConfirmOptions {
  title: string;
  desc?: string;
  confirmText?: string;
  cancelText?: string;
  tone?: ConfirmTone;
}

type Resolver = (ok: boolean) => void;

const Ctx = createContext<(opts: ConfirmOptions) => Promise<boolean>>(
  async () => false,
);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<Resolver | null>(null);

  const confirm = useCallback((o: ConfirmOptions) => {
    setOpts(o);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const settle = useCallback((ok: boolean) => {
    setOpen(false);
    resolverRef.current?.(ok);
    resolverRef.current = null;
  }, []);

  const tone = opts?.tone ?? "default";
  const danger = tone === "danger";

  return (
    <Ctx.Provider value={confirm}>
      {children}
      <Modal
        open={open}
        onClose={() => settle(false)}
        title={opts?.title ?? ""}
        size="sm"
        footer={
          <>
            <button onClick={() => settle(false)} className="btn-ghost py-2 px-4 text-[calc(13px*var(--fz))]">
              {opts?.cancelText ?? "取消"}
            </button>
            <button
              onClick={() => settle(true)}
              className={danger ? "py-2 px-4 text-[calc(13px*var(--fz))] rounded-xl font-bold" : "btn-indigo py-2 px-4 text-[calc(13px*var(--fz))]"}
              style={danger ? { background: "var(--coral)", color: "#fff" } : undefined}
            >
              {opts?.confirmText ?? "确定"}
            </button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          {danger && (
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "var(--coral-soft)", color: "var(--coral-deep)" }}
            >
              <AlertTriangle size={16} />
            </div>
          )}
          <p className="text-[calc(13px*var(--fz))] text-ink-soft font-medium leading-[1.7]">
            {opts?.desc ?? "确定要执行此操作吗？"}
          </p>
        </div>
      </Modal>
    </Ctx.Provider>
  );
}

export function useConfirm() {
  return useContext(Ctx);
}
