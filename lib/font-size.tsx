"use client";

// lib/font-size.tsx — 全局字号微调 + 关怀模式
//
// - zoom：A- / A+ 按钮可逐级微调（步进 0.04，范围 0.88 ~ 1.08）；A 重置为 1.0
// - care：关怀模式开关；启用时强制 zoom = 1.12（覆盖 zoom 值）
// - 持久化到 localStorage：sentinel.v1.fontZoom / sentinel.v1.fontCare
// - 实际效果通过 document.documentElement.style.zoom 应用，整页缩放
// - 首屏闪烁通过 layout.tsx 里的 inline 引导脚本预先设置避免

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";

const KEY_ZOOM = "sentinel.v1.fontZoom";
const KEY_CARE = "sentinel.v1.fontCare";
const EVENT = "sentinel:font-size-changed";

export const FONT_MIN = 0.88;
export const FONT_MAX = 1.08;
export const FONT_STEP = 0.04;
export const FONT_DEFAULT = 1.0;
export const FONT_CARE = 1.12;

interface FontSizeCtx {
  zoom: number;
  care: boolean;
  inc: () => void;
  dec: () => void;
  reset: () => void;
  setCare: (v: boolean) => void;
  canInc: boolean;
  canDec: boolean;
}

const Ctx = createContext<FontSizeCtx>({
  zoom: FONT_DEFAULT,
  care: false,
  inc: () => {}, dec: () => {}, reset: () => {}, setCare: () => {},
  canInc: true, canDec: true,
});

const clamp = (z: number) => Math.min(FONT_MAX, Math.max(FONT_MIN, Math.round(z * 100) / 100));

function readZoom(): number {
  try {
    const raw = window.localStorage.getItem(KEY_ZOOM);
    const n = raw == null ? NaN : parseFloat(raw);
    if (Number.isFinite(n)) return clamp(n);
  } catch {}
  return FONT_DEFAULT;
}
function readCare(): boolean {
  try { return window.localStorage.getItem(KEY_CARE) === "1"; } catch { return false; }
}

function applyZoom(zoom: number, care: boolean) {
  const v = care ? FONT_CARE : clamp(zoom);
  (document.documentElement.style as any).zoom = String(v);
}

export function FontSizeProvider({ children }: { children: ReactNode }) {
  const [zoom, setZoom] = useState<number>(FONT_DEFAULT);
  const [care, setCareState] = useState<boolean>(false);

  useEffect(() => {
    const z = readZoom();
    const c = readCare();
    setZoom(z);
    setCareState(c);
    applyZoom(z, c);
  }, []);

  useEffect(() => {
    const onLocal = (e: Event) => {
      const ce = e as CustomEvent<{ zoom: number; care: boolean }>;
      if (!ce.detail) return;
      setZoom(ce.detail.zoom);
      setCareState(ce.detail.care);
      applyZoom(ce.detail.zoom, ce.detail.care);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key !== KEY_ZOOM && e.key !== KEY_CARE) return;
      const z = readZoom();
      const c = readCare();
      setZoom(z);
      setCareState(c);
      applyZoom(z, c);
    };
    window.addEventListener(EVENT, onLocal as EventListener);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(EVENT, onLocal as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const persistZoom = useCallback((z: number, c: boolean) => {
    try { window.localStorage.setItem(KEY_ZOOM, String(z)); } catch {}
    try { window.localStorage.setItem(KEY_CARE, c ? "1" : "0"); } catch {}
    setZoom(z);
    setCareState(c);
    applyZoom(z, c);
    try { window.dispatchEvent(new CustomEvent(EVENT, { detail: { zoom: z, care: c } })); } catch {}
  }, []);

  const inc = useCallback(() => {
    if (care) return;
    persistZoom(clamp(zoom + FONT_STEP), false);
  }, [zoom, care, persistZoom]);

  const dec = useCallback(() => {
    if (care) return;
    persistZoom(clamp(zoom - FONT_STEP), false);
  }, [zoom, care, persistZoom]);

  const reset = useCallback(() => {
    persistZoom(FONT_DEFAULT, false);
  }, [persistZoom]);

  const setCare = useCallback((v: boolean) => {
    persistZoom(zoom, v);
  }, [zoom, persistZoom]);

  const canInc = !care && zoom < FONT_MAX - 1e-6;
  const canDec = !care && zoom > FONT_MIN + 1e-6;

  return (
    <Ctx.Provider value={{ zoom, care, inc, dec, reset, setCare, canInc, canDec }}>
      {children}
    </Ctx.Provider>
  );
}

export function useFontSize() {
  return useContext(Ctx);
}

export const fontSizeBootScript = `
(function(){
  try {
    var raw = localStorage.getItem('${KEY_ZOOM}');
    var z = raw == null ? NaN : parseFloat(raw);
    if (!isFinite(z)) z = ${FONT_DEFAULT};
    z = Math.min(${FONT_MAX}, Math.max(${FONT_MIN}, z));
    var care = localStorage.getItem('${KEY_CARE}') === '1';
    var v = care ? ${FONT_CARE} : z;
    document.documentElement.style.zoom = String(v);
  } catch (_) {}
})();
`;
