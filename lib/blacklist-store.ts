"use client";

// 混合存储：后端为唯一数据源，乐观写入只在内存里短暂存在。
//
// 设计要点
// - 企业管理员 / 企业用户的"私有黑名单"页用此 Hook：CRUD 先在内存里乐观追加，
//   再 await 后端 /api/v1/blacklist。后端返回成功后用真记录替换 `local-*` 临时项；
//   失败时把临时项回滚。乐观状态不写 localStorage，避免切账号时上一账号的待
//   同步条目被当前账号 token 重发，污染另一条 tenant。
// - sysadmin 下发的全局条目（is_global=true）走 /sysadmin/blacklist，不经此 Hook。
//   这里用一个独立的 `global` 数组返回，UI 上可以渲染成只读"云端同步"区块。
// - 列表显示：内存乐观条目 + 后端本租户条目（is_global=false）；按 number 去重。

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, APIError } from "./api";
import { uid } from "./storage";
import { type BlackEntry } from "./mock";

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
  dispatch: (id: string) => Promise<void>;
  importMany: (items: Partial<BlackEntry>[]) => Promise<{ imported: number; skipped: number }>;
}

export function useHybridBlacklist(): UseHybridBlacklist {
  const [localRows, setLocalRows] = useState<BlackEntry[]>([]);
  const [serverRows, setServerRows] = useState<RawEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  // 旧版本曾把乐观行写到 localStorage["sentinel.v1.blacklist.tenant"]，会让
  // 切账号时上一账号的待同步条目被当前账号 token 重发，跨 tenant 串数据。
  // 这里挂载时清掉这条历史 key（幂等）。
  useEffect(() => {
    try {
      window.localStorage.removeItem("sentinel.v1.blacklist.tenant");
    } catch {}
  }, []);

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
        // 任何失败都回滚乐观行：不再有 localStorage 暂存，下次重发的窗口也已删掉
        setLocalRows((prev) => prev.filter((x) => x.id !== tempId));
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

  // 下发：把举报通过自动入库的待下发条目正式生效（dispatched=false → true）。
  // admin 就地本租户生效；sysadmin 提升为全局（后端处理，前端只需替换该行）。
  const dispatch: UseHybridBlacklist["dispatch"] = useCallback(
    async (id) => {
      const updated = (await api.blacklist.dispatch(id)) as RawEntry;
      setServerRows((prev) => prev.map((r) => (r.id === id ? updated : r)));
    },
    [],
  );

  return { tenant, global, loading, error, refresh, create, update, remove, dispatch, importMany };
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
    dispatched: r.dispatched ?? true,
    createdAt: c as string,
  };
}

function byCreatedDesc(a: BlackEntry, b: BlackEntry) {
  return a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0;
}
