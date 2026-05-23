"use client";

// lib/theme.tsx — 全局主题（light / dark / auto）
//
// - 读 localStorage["sentinel.v1.theme"]，以 .dark 类形式应用到 <html>
// - 切换 auto 时跟随系统 prefers-color-scheme
// - 通过 setTheme 暴露写入 + 立即应用；同 tab 用 CustomEvent 同步
// - 首屏闪白通过 layout.tsx 里的 inline 引导脚本预先涂色避免

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";

export type ThemeMode = "light" | "dark" | "auto";

const KEY = "sentinel.v1.theme";
const EVENT = "sentinel:theme-changed";

interface ThemeCtx {
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
}

const Ctx = createContext<ThemeCtx>({ theme: "light", setTheme: () => {} });

function readTheme(): ThemeMode {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === "dark" || raw === "light" || raw === "auto") return raw;
  } catch {}
  return "light";
}

function applyTheme(t: ThemeMode) {
  const root = document.documentElement;
  const isDark =
    t === "dark" ||
    (t === "auto" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  if (isDark) root.classList.add("dark");
  else root.classList.remove("dark");
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("light");

  useEffect(() => {
    const t = readTheme();
    setThemeState(t);
    applyTheme(t);
  }, []);

  // 系统主题变化时若 auto 也跟着切
  useEffect(() => {
    if (theme !== "auto") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("auto");
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, [theme]);

  // 同 tab 监听
  useEffect(() => {
    const onLocal = (e: Event) => {
      const ce = e as CustomEvent<ThemeMode>;
      if (ce.detail) {
        setThemeState(ce.detail);
        applyTheme(ce.detail);
      }
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key !== KEY) return;
      const next = readTheme();
      setThemeState(next);
      applyTheme(next);
    };
    window.addEventListener(EVENT, onLocal as EventListener);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(EVENT, onLocal as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const setTheme = useCallback((t: ThemeMode) => {
    try { window.localStorage.setItem(KEY, t); } catch {}
    setThemeState(t);
    applyTheme(t);
    try { window.dispatchEvent(new CustomEvent(EVENT, { detail: t })); } catch {}
  }, []);

  return <Ctx.Provider value={{ theme, setTheme }}>{children}</Ctx.Provider>;
}

export function useTheme() {
  return useContext(Ctx);
}

// Inline 引导脚本：在 React 挂载前读取 localStorage 并即时给 <html> 加 .dark，
// 避免主题切换后下次刷新出现"先白后黑"的闪烁。
export const themeBootScript = `
(function(){
  try {
    var raw = localStorage.getItem('${KEY}');
    var t = (raw === 'dark' || raw === 'light' || raw === 'auto') ? raw : 'light';
    var dark = t === 'dark' || (t === 'auto' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  } catch (_) {}
})();
`;
