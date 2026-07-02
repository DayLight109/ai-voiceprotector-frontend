"use client";

// lib/theme.tsx — 按角色独立的主题（light / dark / auto）
//
// - 每个角色各存一份主题：localStorage["sentinel.v1.theme.<role>"]
// - 未登录 / 公开页（落地页、登录、注册）恒为浅色，不参与主题
// - 角色切换（登出换账号）时自动读取新角色自己的主题
// - 通过 setTheme 写入当前角色的 key + 立即应用；同 tab 用 CustomEvent 同步
// - 首屏闪白通过 layout.tsx 里的 inline 引导脚本预先涂色避免（按 lastRole 推断）

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "./auth";

export type ThemeMode = "light" | "dark" | "auto";

const KEY_PREFIX = "sentinel.v1.theme.";
const LAST_ROLE_KEY = "sentinel.v1.lastRole";
const LEGACY_KEY = "sentinel.v1.theme";
const EVENT = "sentinel:theme-changed";

// 公开页：恒浅色，不挂 .dark
const PUBLIC_PATHS = ["/", "/login", "/register"];

function isPublicPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return PUBLIC_PATHS.includes(pathname);
}

interface ThemeCtx {
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
}

const Ctx = createContext<ThemeCtx>({ theme: "light", setTheme: () => {} });

function keyForRole(role: string | null): string | null {
  if (!role) return null;
  return `${KEY_PREFIX}${role}`;
}

function readTheme(role: string | null): ThemeMode {
  const key = keyForRole(role);
  if (!key) return "light";
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === "dark" || raw === "light" || raw === "auto") return raw;
  } catch {}
  return "light";
}

function resolveIsDark(t: ThemeMode): boolean {
  return (
    t === "dark" ||
    (t === "auto" && window.matchMedia?.("(prefers-color-scheme: dark)").matches)
  );
}

function applyDark(isDark: boolean) {
  const root = document.documentElement;
  if (isDark) root.classList.add("dark");
  else root.classList.remove("dark");
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user, status } = useAuth();
  const pathname = usePathname();
  const role = user?.role ?? null;
  const [theme, setThemeState] = useState<ThemeMode>("light");

  // 清理旧版全局 key（一次性，避免残留干扰）
  useEffect(() => {
    try { window.localStorage.removeItem(LEGACY_KEY); } catch {}
  }, []);

  // 角色 / 登录态 / 路由变化时：决定当前应显示什么主题并应用
  useEffect(() => {
    // 公开页或未登录 → 恒浅色，不读角色主题
    if (isPublicPath(pathname) || status !== "authenticated" || !role) {
      setThemeState("light");
      applyDark(false);
      return;
    }
    // 记住最近登录的角色，供首屏 boot script 推断
    try { window.localStorage.setItem(LAST_ROLE_KEY, role); } catch {}
    const t = readTheme(role);
    setThemeState(t);
    applyDark(resolveIsDark(t));
  }, [role, status, pathname]);

  // auto 模式下系统主题变化时跟随（仅已登录非公开页）
  useEffect(() => {
    if (theme !== "auto") return;
    if (isPublicPath(pathname) || status !== "authenticated") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyDark(resolveIsDark("auto"));
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, [theme, pathname, status]);

  // 同 tab / 跨 tab 同步
  useEffect(() => {
    const onLocal = (e: Event) => {
      const ce = e as CustomEvent<ThemeMode>;
      if (ce.detail && !isPublicPath(pathname) && status === "authenticated") {
        setThemeState(ce.detail);
        applyDark(resolveIsDark(ce.detail));
      }
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key !== keyForRole(role)) return;
      if (isPublicPath(pathname) || status !== "authenticated") return;
      const next = readTheme(role);
      setThemeState(next);
      applyDark(resolveIsDark(next));
    };
    window.addEventListener(EVENT, onLocal as EventListener);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(EVENT, onLocal as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, [role, pathname, status]);

  const setTheme = useCallback((t: ThemeMode) => {
    const key = keyForRole(role);
    // 公开页 / 未登录无角色可写，忽略
    if (!key || isPublicPath(pathname) || status !== "authenticated") return;
    try { window.localStorage.setItem(key, t); } catch {}
    setThemeState(t);
    applyDark(resolveIsDark(t));
    try { window.dispatchEvent(new CustomEvent(EVENT, { detail: t })); } catch {}
  }, [role, pathname, status]);

  return <Ctx.Provider value={{ theme, setTheme }}>{children}</Ctx.Provider>;
}

export function useTheme() {
  return useContext(Ctx);
}

// Inline 引导脚本：在 React 挂载前按 lastRole 推断主题并即时给 <html> 加 .dark，
// 避免同角色刷新时的"先白后黑"闪烁。公开页（落地页 / 登录 / 注册）恒浅色，跳过。
export const themeBootScript = `
(function(){
  try {
    var path = window.location.pathname;
    var pub = (path === '/' || path === '/login' || path === '/register');
    if (pub) return;
    var role = localStorage.getItem('${LAST_ROLE_KEY}');
    if (!role) return;
    var raw = localStorage.getItem('${KEY_PREFIX}' + role);
    var t = (raw === 'dark' || raw === 'light' || raw === 'auto') ? raw : 'light';
    var dark = t === 'dark' || (t === 'auto' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  } catch (_) {}
})();
`;
