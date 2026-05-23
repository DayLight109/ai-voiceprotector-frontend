"use client";

// lib/i18n.tsx — 多语言开关（zh-CN / en / zh-TW）
//
// - persist 到 localStorage["sentinel.v1.lang"]，并写到 <html lang="...">
// - 用「中文 key → 翻译」的极简词典；缺失即回退到 key 本身（中文原文）
// - 同 tab 用 CustomEvent 同步；首屏闪烁通过 boot script 抵消

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";

export type Lang = "zh-CN" | "en" | "zh-TW";

const KEY = "sentinel.v1.lang";
const EVENT = "sentinel:lang-changed";

const dict_en: Record<string, string> = {
  // nav / shell
  "首页": "Home",
  "家属同步": "Family Sync",
  "系统设置": "Settings",
  "设置": "Settings",
  // settings page header
  "管理账户、安全、通知与外观偏好。": "Manage account, security, notifications and appearance.",
  // tabs
  "个人信息": "Profile",
  "账户安全": "Account Security",
  "告警与通知": "Alerts & Notifications",
  "外观偏好": "Appearance",
  "头像、昵称、联系方式": "Avatar, name and contacts",
  "密码、生物认证、设备": "Password, biometrics, devices",
  "推送渠道、静音时段": "Push channels, quiet hours",
  "主题、密度、字号": "Theme, density, font",
  // appearance section
  "主题": "Theme",
  "浅色": "Light",
  "深色": "Dark",
  "跟随系统": "System",
  "界面密度": "Density",
  "紧凑模式可在小屏幕上显示更多": "Compact shows more on small screens",
  "紧凑": "Compact",
  "标准": "Standard",
  "宽松": "Comfy",
  "字号": "Font size",
  "点击 A- / A+ 微调，A 重置为默认": "Tap A- / A+ to adjust, A to reset",
  "缩小字号": "Decrease",
  "放大字号": "Enlarge",
  "重置字号": "Reset",
  "关怀模式": "Care Mode",
  "为视力不便的用户提供更大字号": "Larger text for low-vision users",
  "关怀模式开关": "Care Mode toggle",
  "语言": "Language",
  "降低动画": "Reduce Motion",
  "减少过渡动效，缓解晕动症": "Less motion to reduce motion sickness",
};

const dict_zhTW: Record<string, string> = {
  "首页": "首頁",
  "家属同步": "家屬同步",
  "系统设置": "系統設定",
  "设置": "設定",
  "管理账户、安全、通知与外观偏好。": "管理帳戶、安全、通知與外觀偏好。",
  "个人信息": "個人資訊",
  "账户安全": "帳戶安全",
  "告警与通知": "告警與通知",
  "外观偏好": "外觀偏好",
  "头像、昵称、联系方式": "頭像、暱稱、聯絡方式",
  "密码、生物认证、设备": "密碼、生物辨識、裝置",
  "推送渠道、静音时段": "推送通道、靜音時段",
  "主题、密度、字号": "主題、密度、字號",
  "主题": "主題",
  "浅色": "淺色",
  "深色": "深色",
  "跟随系统": "跟隨系統",
  "界面密度": "介面密度",
  "紧凑模式可在小屏幕上显示更多": "緊湊模式可在小螢幕上顯示更多",
  "紧凑": "緊湊",
  "标准": "標準",
  "宽松": "寬鬆",
  "字号": "字號",
  "点击 A- / A+ 微调,A 重置为默认": "點擊 A- / A+ 微調，A 重設為預設",
  "点击 A- / A+ 微调，A 重置为默认": "點擊 A- / A+ 微調，A 重設為預設",
  "缩小字号": "縮小字號",
  "放大字号": "放大字號",
  "重置字号": "重設字號",
  "关怀模式": "關懷模式",
  "为视力不便的用户提供更大字号": "為視力不便的使用者提供更大字號",
  "关怀模式开关": "關懷模式開關",
  "语言": "語言",
  "降低动画": "降低動畫",
  "减少过渡动效，缓解晕动症": "減少過渡動效，緩解暈動症",
};

const dicts: Record<Lang, Record<string, string>> = {
  "zh-CN": {},
  "en": dict_en,
  "zh-TW": dict_zhTW,
};

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const Ctx = createContext<I18nCtx>({
  lang: "zh-CN",
  setLang: () => {},
  t: (k) => k,
});

function readLang(): Lang {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === "zh-CN" || raw === "en" || raw === "zh-TW") return raw;
  } catch {}
  return "zh-CN";
}

function applyLang(l: Lang) {
  document.documentElement.lang = l;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setState] = useState<Lang>("zh-CN");

  useEffect(() => {
    const l = readLang();
    setState(l);
    applyLang(l);
  }, []);

  useEffect(() => {
    const onLocal = (e: Event) => {
      const ce = e as CustomEvent<Lang>;
      if (!ce.detail) return;
      setState(ce.detail);
      applyLang(ce.detail);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key !== KEY) return;
      const next = readLang();
      setState(next);
      applyLang(next);
    };
    window.addEventListener(EVENT, onLocal as EventListener);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(EVENT, onLocal as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const setLang = useCallback((l: Lang) => {
    try { window.localStorage.setItem(KEY, l); } catch {}
    setState(l);
    applyLang(l);
    try { window.dispatchEvent(new CustomEvent(EVENT, { detail: l })); } catch {}
  }, []);

  const t = useCallback((key: string) => {
    const d = dicts[lang];
    return (d && d[key]) || key;
  }, [lang]);

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useLang() {
  return useContext(Ctx);
}

export const i18nBootScript = `
(function(){
  try {
    var raw = localStorage.getItem('${KEY}');
    var l = (raw === 'zh-CN' || raw === 'en' || raw === 'zh-TW') ? raw : 'zh-CN';
    document.documentElement.lang = l;
  } catch (_) {}
})();
`;
