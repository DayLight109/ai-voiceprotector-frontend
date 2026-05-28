"use client";

// lib/use-resource.ts — 列表资源通用 hook
//
// 替代 useLocalStorage 的最小变更模板。典型用法：
//
//   const list = useResource(() => api.blacklist.list({ page, pageSize, q }), [page, q]);
//   list.items, list.total, list.loading, list.error, list.refresh()
//
// 写操作请直接调 api.xxx，然后 list.refresh() 重拉；或用 list.setLocal 做乐观更新。

import { useCallback, useEffect, useState } from "react";
import { APIError, Envelope } from "./api";

export interface UseResource<T> {
  items: T[];
  total: number;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  setLocal: (updater: (prev: T[]) => T[]) => void;
}

export function useResource<T>(
  fetcher: () => Promise<Envelope<T[]>>,
  deps: any[] = [],
): UseResource<T> {
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let stop = false;
    setLoading(true);
    fetcher()
      .then(({ data, meta }) => {
        if (stop) return;
        setItems(data || []);
        setTotal(meta?.total ?? (data?.length ?? 0));
        setError(null);
      })
      .catch((e) => {
        if (stop) return;
        if (e instanceof APIError) {
          setError(e.message);
        } else {
          setError("加载失败");
        }
      })
      .finally(() => {
        if (!stop) setLoading(false);
      });
    return () => {
      stop = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);
  const setLocal = useCallback((updater: (prev: T[]) => T[]) => {
    setItems((prev) => updater(prev));
  }, []);

  return { items, total, loading, error, refresh, setLocal };
}

/**
 * useSingle — 单实体加载（GET /resource/{id}、GET /me 等）
 */
export function useSingle<T>(
  fetcher: () => Promise<T>,
  deps: any[] = [],
): { data: T | null; loading: boolean; error: string | null; refresh: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let stop = false;
    setLoading(true);
    fetcher()
      .then((d) => { if (!stop) { setData(d); setError(null); } })
      .catch((e) => {
        if (stop) return;
        setError(e instanceof APIError ? e.message : "加载失败");
      })
      .finally(() => { if (!stop) setLoading(false); });
    return () => { stop = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);

  return { data, loading, error, refresh: () => setTick((t) => t + 1) };
}
