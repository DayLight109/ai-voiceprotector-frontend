"use client";

// 混合存储：本地缓存为主，写入后异步同步后端。
// 与 blacklist-store 同样的"乐观写 + 失败留痕 + 挂载重发"模式，
// 但用户管理没有"global vs tenant"两层概念，只是简单的本租户列表。

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, APIError } from "./api";
import { useLocalStorage, uid } from "./storage";
import { type ManagedUser } from "./mock";

const LOCAL_KEY = "managed-users.tenant";

function isLocalId(id: string) {
  return id.startsWith("local-");
}

function dedupeByEmail(rows: ManagedUser[]): ManagedUser[] {
  // 同 email（非空）：后端版本（非 local-* id）优先；email 为空时不去重
  const seen = new Map<string, ManagedUser>();
  const result: ManagedUser[] = [];
  for (const r of rows) {
    const key = r.email && r.email !== "—" ? r.email.toLowerCase() : "";
    if (!key) {
      result.push(r);
      continue;
    }
    const prev = seen.get(key);
    if (!prev) {
      seen.set(key, r);
      result.push(r);
      continue;
    }
    const prevSynced = !isLocalId(prev.id);
    const curSynced = !isLocalId(r.id);
    if (curSynced && !prevSynced) {
      const idx = result.indexOf(prev);
      if (idx >= 0) result[idx] = r;
      seen.set(key, r);
    }
  }
  return result;
}

export interface UseHybridUsers {
  items: ManagedUser[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  create: (input: Omit<ManagedUser, "id" | "last">) => Promise<void>;
  update: (id: string, patch: Partial<Omit<ManagedUser, "id" | "last">>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export function useHybridUsers(): UseHybridUsers {
  const [localRows, setLocalRows] = useLocalStorage<ManagedUser[]>(LOCAL_KEY, []);
  const [serverRows, setServerRows] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let stop = false;
    setLoading(true);
    api.users
      .list({ pageSize: 200 })
      .then(({ data }) => {
        if (stop) return;
        setServerRows((data || []) as ManagedUser[]);
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

  // 挂载后把仍是 local-* 的本地条目重发一次（之前离线/失败的）
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
          const created = (await api.users.create({
            name: r.name,
            role: r.role,
            dept: r.dept,
            email: r.email,
            status: r.status,
          } as any)) as ManagedUser;
          setLocalRows((prev) => prev.filter((x) => x.id !== r.id));
          setServerRows((prev) => [created, ...prev]);
        } catch {
          // 留在本地，下次再试
        }
      }
    })();
  }, [loading, localRows, setLocalRows]);

  const items = useMemo(
    () => dedupeByEmail([...localRows, ...serverRows]),
    [localRows, serverRows],
  );

  const create: UseHybridUsers["create"] = useCallback(
    async (input) => {
      const tempId = uid("local");
      const optimistic: ManagedUser = {
        id: tempId,
        name: input.name,
        role: input.role,
        dept: input.dept,
        email: input.email,
        status: input.status,
        last: "刚刚",
      };
      setLocalRows((prev) => [optimistic, ...prev]);
      try {
        const created = (await api.users.create({
          name: input.name,
          role: input.role,
          dept: input.dept,
          email: input.email,
          status: input.status,
        } as any)) as ManagedUser;
        setLocalRows((prev) => prev.filter((x) => x.id !== tempId));
        setServerRows((prev) => [created, ...prev]);
      } catch (e) {
        // 不抛弃本地条目（保留供下次重试），但把错抛给上层提示
        throw e;
      }
    },
    [setLocalRows],
  );

  const update: UseHybridUsers["update"] = useCallback(
    async (id, patch) => {
      if (isLocalId(id)) {
        setLocalRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
        return;
      }
      const updated = (await api.users.update(id, patch)) as ManagedUser;
      setServerRows((prev) => prev.map((r) => (r.id === id ? updated : r)));
    },
    [setLocalRows],
  );

  const remove: UseHybridUsers["remove"] = useCallback(
    async (id) => {
      if (isLocalId(id)) {
        setLocalRows((prev) => prev.filter((r) => r.id !== id));
        return;
      }
      await api.users.remove(id);
      setServerRows((prev) => prev.filter((r) => r.id !== id));
    },
    [setLocalRows],
  );

  return { items, loading, error, refresh, create, update, remove };
}
