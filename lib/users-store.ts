"use client";

// 成员管理 store：后端为唯一数据源，乐观写只在内存里短暂存在。
// 与 blacklist-store 相同的"乐观写 + 失败回滚"模式；不写 localStorage ——
// 一是创建成员必须携带初始密码（绝不可落盘），二是避免切账号时上一账号的
// 待同步条目被当前账号 token 重发、污染另一个 tenant（blacklist-store 踩过的坑）。

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, APIError } from "./api";
import { uid } from "./storage";
import { type ManagedUser } from "./domain-types";

// 旧版本写过的 localStorage key，挂载时清掉（幂等）
const LEGACY_LOCAL_KEY = "managed-users.tenant";

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

export interface CreateManagedUserInput {
  name: string;
  role: ManagedUser["role"];
  status: ManagedUser["status"];
  password: string; // 后端 createUser 必填，作为成员初始登录密码
  dept?: string;
  email?: string;
  phone?: string;
}

export interface UseHybridUsers {
  items: ManagedUser[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  create: (input: CreateManagedUserInput) => Promise<void>;
  update: (id: string, patch: Partial<Omit<ManagedUser, "id">>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export function useHybridUsers(): UseHybridUsers {
  const [localRows, setLocalRows] = useState<ManagedUser[]>([]);
  const [serverRows, setServerRows] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    try {
      window.localStorage.removeItem(LEGACY_LOCAL_KEY);
    } catch {}
  }, []);

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

  const items = useMemo(
    () => dedupeByEmail([...localRows, ...serverRows]),
    [localRows, serverRows],
  );

  const create: UseHybridUsers["create"] = useCallback(async (input) => {
    const tempId = uid("local");
    const optimistic: ManagedUser = {
      id: tempId,
      name: input.name,
      role: input.role,
      dept: input.dept,
      email: input.email,
      status: input.status,
    };
    setLocalRows((prev) => [optimistic, ...prev]);
    try {
      const created = (await api.users.create({
        name: input.name,
        role: input.role,
        dept: input.dept,
        email: input.email,
        status: input.status,
        password: input.password,
      } as any)) as ManagedUser;
      setLocalRows((prev) => prev.filter((x) => x.id !== tempId));
      setServerRows((prev) => [created, ...prev]);
    } catch (e) {
      // 回滚乐观行：密码不落盘，不存在"留待下次重试"的可能
      setLocalRows((prev) => prev.filter((x) => x.id !== tempId));
      throw e;
    }
  }, []);

  const update: UseHybridUsers["update"] = useCallback(async (id, patch) => {
    if (isLocalId(id)) {
      setLocalRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
      return;
    }
    const updated = (await api.users.update(id, patch)) as ManagedUser;
    setServerRows((prev) => prev.map((r) => (r.id === id ? updated : r)));
  }, []);

  const remove: UseHybridUsers["remove"] = useCallback(async (id) => {
    if (isLocalId(id)) {
      setLocalRows((prev) => prev.filter((r) => r.id !== id));
      return;
    }
    await api.users.remove(id);
    setServerRows((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return { items, loading, error, refresh, create, update, remove };
}

