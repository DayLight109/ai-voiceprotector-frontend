"use client";

// lib/auth.tsx — 全局 Auth Context
//
// - 启动时尝试用 localStorage 的 access token 调 /me，恢复当前用户
// - login(account, password) → 调 api.login，更新 user
// - logout() → 调 api.logout，清 user + token
// - role 决定页面侧栏与 RBAC 默认入口

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { api, User, APIError, clearTokens } from "./api";

export type AuthStatus = "loading" | "anonymous" | "authenticated";

interface AuthCtx {
  user: User | null;
  status: AuthStatus;
  login: (account: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const refreshMe = useCallback(async () => {
    try {
      const me = await api.me();
      setUser(me);
      setStatus("authenticated");
    } catch (e) {
      // 401 + refresh 都失败时 api 层已清 token
      if (e instanceof APIError && e.status === 401) {
        clearTokens();
      }
      setUser(null);
      setStatus("anonymous");
    }
  }, []);

  useEffect(() => {
    void refreshMe();
  }, [refreshMe]);

  const login = useCallback(async (account: string, password: string) => {
    const u = await api.login(account, password);
    setUser(u);
    setStatus("authenticated");
    return u;
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
    setStatus("anonymous");
  }, []);

  return (
    <Ctx.Provider value={{ user, status, login, logout, refreshMe }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
}

/**
 * roleHomePath 根据用户角色返回该角色的默认入口路径。
 * 与前端 lib/nav.ts 的 5 个角色映射保持一致。
 */
export function roleHomePath(role: User["role"]): string {
  switch (role) {
    case "family":
      return "/app";
    case "biz":
      return "/biz";
    case "family_admin":
      return "/family-admin";
    case "admin":
      return "/admin";
    case "sysadmin":
      return "/sysadmin";
    default:
      return "/";
  }
}
