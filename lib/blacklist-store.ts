"use client";

// 混合存储：本地缓存为主，写入后异步同步后端。
//
// 设计要点
// - 企业管理员 / 企业用户的"私有黑名单"页用此 Hook：所有 CRUD 立刻写 localStorage，
//   再后台 fire-and-forget 同步到后端 /api/v1/blacklist。后端落库成功后，把本地
//   `local-*` 临时记录替换为后端返回的正式记录（id、source、createdAt 都更新）。
// - sysadmin 下发的全局条目（is_global=true）走 /sysadmin/blacklist，不经此 Hook。
//   这里用一个独立的 `global` 数组返回，UI 上可以渲染成只读"云端同步"区块。
// - 列表显示：本地条目（含 local-*）+ 后端本租户条目（is_global=false）；
//   按 number 去重，已同步的后端记录优先于同号码的临时本地记录。

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, APIError } from "./api";
import { useLocalStorage, uid } from "./storage";
import { type BlackEntry } from "./mock";

const LOCAL_KEY = "blacklist.tenant";

// 后端 list 返回的形状里 isGlobal 不是 BlackEntry 的字段，单独读
type RawEntry = BlackEntry & { isGlobal?: boolean; tenantId?: string };

function isLocalId(id: string) {
  return id.startsWith("local-");
}

function dedupeByNumber(rows: BlackEntry[]): BlackEntry[] {
  // 同号码：source !== "本地" 的优先（已同步），否则保留靠前的那一条
  const seen = new Map<string, BlackEntry>();
  for (const r of rows) {
    const key = r.number.replace(/\s+/g, "");
    const prev = seen.get(key);
    if (!prev) {
      seen.set(key, r);
      continue;
    }
    const prevSynced = prev.source !== "本地";
    const curSynced = r.source !== "本地";
    if (curSynced && !prevSynced) seen.set(key, r);
  }
  return Array.from(seen.values());
}

export interface UseHybridBlacklist {
  tenant: BlackEntry[]; // 本租户条目（合并：本地 + 后端 tenant 行）
  global: BlackEntry[]; // 系统管理员下发的全局条目（只读）
  loading: boolean;
  error: string | null;
  refresh: () => void;
  create: (input: Omit<BlackEntry, "id" | "createdAt" | "source"> & { source?: BlackEntry["source"] }) => Promise<void>;
  update: (id: string, patch: Partial<Pick<BlackEntry, "number" | "category" | "reason" | "risk">>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  importMany: (items: Partial<BlackEntry>[]) => Promise<{ imported: number; skipped: number }>;
}

export function useHybridBlacklist(): UseHybridBlacklist {
  const [localRows, setLocalRows] = useLocalStorage<BlackEntry[]>(LOCAL_KEY, []);
  const [serverRows, setServerRows] = useState<RawEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  // 拉一次后端列表
  useEffect(() => {
    let stop = false;
    setLoading(true);
    api.blacklist
      .list({ pageSize: 200 })
      .then(({ data }) => {
        if (stop) return;
        setServerRows((data || []) as RawEntry[]);
        setError(null);
      })
      .catch((e) => {
        if (stop) return;
        setError(e instanceof APIError ? e.message : "加载失败");
      })
      .finally(() => {
        if (!stop) setLoading(false);
      });
    return () => {
      stop = true;
    };
  }, [tick]);

  // 挂载后把仍是 local-* 的条目重发一次（之前离线/失败的）
  const retriedRef = useRef(false);
  useEffect(() => {
    if (retriedRef.current) return;
    if (loading) return;
    retriedRef.current = true;
    const pending = localRows.filter((r) => isLocalId(r.id));
    if (pending.length === 0) return;
    void (async () => {
      for (const r of pending) {
        try {
          const created = (await api.blacklist.create({
            number: r.number,
            category: r.category,
            reason: r.reason,
            risk: r.risk,
            source: "手动",
          } as any)) as RawEntry;
          setLocalRows((prev) => prev.filter((x) => x.id !== r.id));
          setServerRows((prev) => [normalize(created), ...prev]);
        } catch {
          // 留在本地，下次再试
        }
      }
    })();
  }, [loading, localRows, setLocalRows]);

  const tenant = useMemo(() => {
    const tenantServer = serverRows.filter((r) => !r.isGlobal).map(normalize);
    return dedupeByNumber([...localRows, ...tenantServer]).sort(byCreatedDesc);
  }, [localRows, serverRows]);

  const global = useMemo(
    () => serverRows.filter((r) => r.isGlobal).map(normalize).sort(byCreatedDesc),
    [serverRows],
  );

  const create: UseHybridBlacklist["create"] = useCallback(
    async (input) => {
      const tempId = uid("local");
      const optimistic: BlackEntry = {
        id: tempId,
        number: input.number,
        category: input.category,
        reason: input.reason,
        risk: input.risk,
        source: "本地",
        createdAt: new Date().toISOString().replace("T", " ").slice(0, 16),
      };
      setLocalRows((prev) => [optimistic, ...prev]);
      try {
        const created = (await api.blacklist.create({
          number: input.number,
          category: input.category,
          reason: input.reason,
          risk: input.risk,
          source: input.source ?? "手动",
        } as any)) as RawEntry;
        setLocalRows((prev) => prev.filter((x) => x.id !== tempId));
        setServerRows((prev) => [normalize(created), ...prev]);
      } catch (e) {
        // duplicate 也按"已存在云端"处理：把本地这条摘掉，避免重复显示
        if (e instanceof APIError && /duplicate/i.test(e.code)) {
          setLocalRows((prev) => prev.filter((x) => x.id !== tempId));
        }
        throw e;
      }
    },
    [setLocalRows],
  );

  const update: UseHybridBlacklist["update"] = useCallback(
    async (id, patch) => {
      if (isLocalId(id)) {
        setLocalRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
        return;
      }
      const updated = (await api.blacklist.update(id, patch)) as RawEntry;
      setServerRows((prev) => prev.map((r) => (r.id === id ? updated : r)));
    },
    [setLocalRows],
  );

  const remove: UseHybridBlacklist["remove"] = useCallback(
    async (id) => {
      if (isLocalId(id)) {
        setLocalRows((prev) => prev.filter((r) => r.id !== id));
        return;
      }
      await api.blacklist.remove(id);
      setServerRows((prev) => prev.filter((r) => r.id !== id));
    },
    [setLocalRows],
  );

  const importMany: UseHybridBlacklist["importMany"] = useCallback(
    async (items) => {
      const res = await api.blacklist.importJSON(items);
      // 后端导入完拉一次最新列表覆盖
      const { data } = await api.blacklist.list({ pageSize: 200 });
      setServerRows((data || []) as RawEntry[]);
      return res;
    },
    [],
  );

  return { tenant, global, loading, error, refresh, create, update, remove, importMany };
}

function normalize(r: RawEntry): BlackEntry {
  // 后端 createdAt 是 ISO，UI 想要 "YYYY-MM-DD HH:mm" — 兼容两种
  const c =
    typeof r.createdAt === "string" && r.createdAt.includes("T")
      ? r.createdAt.replace("T", " ").slice(0, 16)
      : r.createdAt;
  return {
    id: r.id,
    number: r.number,
    reason: r.reason,
    category: r.category as BlackEntry["category"],
    risk: r.risk,
    source: (r.source as BlackEntry["source"]) ?? "手动",
    createdAt: c as string,
  };
}

function byCreatedDesc(a: BlackEntry, b: BlackEntry) {
  return a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0;
}
