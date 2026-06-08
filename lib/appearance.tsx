"use client";

// lib/appearance.tsx — 界面密度 + 降低动画
//
// 与 lib/font-size.tsx 同一套路：Provider + Context + localStorage 持久化 +
// 往 <html> 挂 data 属性让全局 CSS 生效 + 引导脚本防首屏闪烁。
//
// - density：compact / normal / loose，写到 <html data-density>。
//   globals.css 用 [data-density] 覆盖 Tailwind 的 --spacing 变量，
//   只缩放间距类（p/m/gap/space…），不触碰 text-* 字号 —— 因此与
//   font-size.tsx 的 zoom（整体文字/界面缩放）完全正交、互不影响。
// - reduceMotion：true 时写 <html data-reduce-motion="1">，
//   globals.css 用该选择器把动画/过渡时长归零。

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";

const KEY_DENSITY = "sentinel.v1.density";
const KEY_MOTION = "sentinel.v1.reduceMotion";
const EVENT = "sentinel:appearance-changed";

export type Density = "compact" | "normal" | "loose";
const DENSITIES: Density[] = ["compact", "normal", "loose"];
const DENSITY_DEFAULT: Density = "normal";

interface AppearanceCtx {
  density: Density;
  reduceMotion: boolean;
  setDensity: (d: Density) => void;
  setReduceMotion: (v: boolean) => void;
}

const Ctx = createContext<AppearanceCtx>({
  density: DENSITY_DEFAULT,
  reduceMotion: false,
  setDensity: () => {},
  setReduceMotion: () => {},
});

function readDensity(): Density {
  try {
    const raw = window.localStorage.getItem(KEY_DENSITY);
    if (raw && (DENSITIES as string[]).includes(raw)) return raw as Density;
  } catch {}
  return DENSITY_DEFAULT;
}
function readMotion(): boolean {
  try { return window.localStorage.getItem(KEY_MOTION) === "1"; } catch { return false; }
}

function apply(density: Density, reduceMotion: boolean) {
  const el = document.documentElement;
  el.setAttribute("data-density", density);
  if (reduceMotion) el.setAttribute("data-reduce-motion", "1");
  else el.removeAttribute("data-reduce-motion");
}

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [density, setDensityState] = useState<Density>(DENSITY_DEFAULT);
  const [reduceMotion, setMotionState] = useState<boolean>(false);

  useEffect(() => {
    const d = readDensity();
    const m = readMotion();
    setDensityState(d);
    setMotionState(m);
    apply(d, m);
  }, []);

  useEffect(() => {
    const onLocal = (e: Event) => {
      const ce = e as CustomEvent<{ density: Density; reduceMotion: boolean }>;
      if (!ce.detail) return;
      setDensityState(ce.detail.density);
      setMotionState(ce.detail.reduceMotion);
      apply(ce.detail.density, ce.detail.reduceMotion);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key !== KEY_DENSITY && e.key !== KEY_MOTION) return;
      const d = readDensity();
      const m = readMotion();
      setDensityState(d);
      setMotionState(m);
      apply(d, m);
    };
    window.addEventListener(EVENT, onLocal as EventListener);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(EVENT, onLocal as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const persist = useCallback((d: Density, m: boolean) => {
    try { window.localStorage.setItem(KEY_DENSITY, d); } catch {}
    try { window.localStorage.setItem(KEY_MOTION, m ? "1" : "0"); } catch {}
    setDensityState(d);
    setMotionState(m);
    apply(d, m);
    try { window.dispatchEvent(new CustomEvent(EVENT, { detail: { density: d, reduceMotion: m } })); } catch {}
  }, []);

  const setDensity = useCallback((d: Density) => persist(d, reduceMotion), [reduceMotion, persist]);
  const setReduceMotion = useCallback((v: boolean) => persist(density, v), [density, persist]);

  return (
    <Ctx.Provider value={{ density, reduceMotion, setDensity, setReduceMotion }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAppearance() {
  return useContext(Ctx);
}

export const appearanceBootScript = `
(function(){
  try {
    var d = localStorage.getItem('${KEY_DENSITY}');
    if (d !== 'compact' && d !== 'loose') d = '${DENSITY_DEFAULT}';
    document.documentElement.setAttribute('data-density', d);
    if (localStorage.getItem('${KEY_MOTION}') === '1') {
      document.documentElement.setAttribute('data-reduce-motion', '1');
    }
  } catch (_) {}
})();
`;
