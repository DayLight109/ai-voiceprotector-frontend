"use client";
import { useEffect, useState } from "react";

const PREFIX = "sentinel.v1.";

export function useLocalStorage<T>(key: string, fallback: T): [T, (v: T | ((p: T) => T)) => void] {
  const fullKey = PREFIX + key;
  const [value, setValue] = useState<T>(fallback);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(fullKey);
      if (raw != null) setValue(JSON.parse(raw) as T);
    } catch {}
    setHydrated(true);
  }, [fullKey]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(fullKey, JSON.stringify(value));
    } catch {}
  }, [fullKey, value, hydrated]);

  return [value, setValue];
}

export function uid(prefix = "id") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function downloadBlob(filename: string, content: BlobPart, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
