"use client";

// lib/api.ts — Gateway 客户端
//
// 设计要点：
//   - 所有 fetch 自动注入 Authorization: Bearer <accessToken>
//   - 401 自动尝试 /auth/refresh（refresh token 由后端 HttpOnly Cookie 保存）
//   - SSE 用 fetch + ReadableStream 实现（EventSource 不支持自定义 header）
//   - 响应统一拆 envelope { data, meta } / { error: { code, message } }
//   - 错误抛 APIError，调用方按 e.code 区分

import type {
  BlackEntry, WhiteEntry, KnowledgeArticle, ScamRule, ScamSample,
  Recording, ManagedUser, Appeal, CallLog, AuditLog, VoiceModel,
} from "./domain-types";

const API_BASE =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) ||
  "http://localhost:8080";

// ── Token 存储 ───────────────────────────────────────────────────
const TOKEN_KEY = "sentinel.v1.token";
const REFRESH_KEY = "sentinel.v1.refresh";
let accessTokenMemory: string | null = null;

export function getAccessToken(): string | null {
  if (accessTokenMemory) return accessTokenMemory;
  if (typeof window === "undefined") return null;
  try {
    const legacy = window.localStorage.getItem(TOKEN_KEY);
    if (legacy) {
      accessTokenMemory = legacy;
      window.localStorage.removeItem(TOKEN_KEY);
      return legacy;
    }
    return null;
  } catch {
    return null;
  }
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    // 仅用于从旧版本 localStorage 迁移；新版本不再持久化 refresh token。
    return window.localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

export function setTokens(access: string, refresh?: string) {
  accessTokenMemory = access;
  if (typeof window === "undefined") return;
  try {
    void refresh;
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_KEY);
  } catch {}
}

export function clearTokens() {
  accessTokenMemory = null;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_KEY);
  } catch {}
}

// ── 类型 ──────────────────────────────────────────────────────────
export interface User {
  id: string;
  tenantId: string;
  name: string;
  phone?: string;
  email?: string;
  role: "family" | "biz" | "family_admin" | "admin" | "sysadmin";
  status: string;
  dept?: string;
  hasAvatar?: boolean;
}

export interface EmergencyContact {
  id: string;
  userId: string;
  name: string;
  phone: string;
  relation: string;
  createdAt: string;
}

export interface SessionView {
  token: string;
  deviceLabel: string;
  ip: string;
  userAgent: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  current: boolean;
}

// 后端 /devices 真实返回结构（区别于前端展示型 Device：tenant/lastSeen）
export interface ApiDevice {
  id: string;
  name: string;
  tenantId?: string;
  type: "enterprise" | "family";
  status: "online" | "offline" | "warn";
  version: string;
  lastSeenAt?: string;
  contact: string;
}

// 后端 /devices/audit 返回结构（domain.AuditLog）
export interface ApiAuditLog {
  id: number;
  ts: string;
  actorId?: string;
  action: string;
  target: string;
  result: string;
  ip?: string;
}

export interface Envelope<T> {
  data: T;
  meta?: { page?: number; pageSize?: number; total: number };
}

export class APIError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

// ── 核心 fetch 封装 ───────────────────────────────────────────────

interface FetchOptions extends RequestInit {
  // skipAuth=true 时不附 Authorization（用于 login/register/refresh 本身）
  skipAuth?: boolean;
}

async function rawFetch(path: string, opts: FetchOptions = {}): Promise<Response> {
  const headers: Record<string, string> = {
    ...(opts.headers as Record<string, string> | undefined),
  };
  if (opts.body && typeof opts.body === "string" && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  if (!opts.skipAuth) {
    const tk = getAccessToken();
    if (tk) headers["Authorization"] = `Bearer ${tk}`;
  }
  return fetch(`${API_BASE}${path}`, {
    ...opts,
    credentials: opts.credentials ?? "include",
    headers,
  });
}

// 401 时尝试一次 refresh，成功则返回 true。
// 单飞（single-flight）：并发 401 共享同一次刷新请求。后端 refresh 是旋转式
// （旧 refresh 用过即废），若并发各自刷新，第二个必失败并把第一个刚写入的
// 新 token 清掉，表现为"access 过期后打开多请求页面随机被登出"。
let refreshInFlight: Promise<boolean> | null = null;

function tryRefresh(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = doRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function doRefresh(): Promise<boolean> {
  const legacyRefresh = getRefreshToken();
  try {
    const refreshBody = legacyRefresh ? JSON.stringify({ refreshToken: legacyRefresh }) : undefined;
    const resp = await rawFetch("/api/v1/auth/refresh", {
      method: "POST",
      body: refreshBody,
      skipAuth: true,
    });
    if (!resp.ok) {
      // 仅在确定 refresh 已失效（401/403）时清空；5xx / 网关抖动不清，
      // 避免临时故障把用户踢下线。
      if (resp.status === 401 || resp.status === 403) clearTokens();
      return false;
    }
    const body = await resp.json();
    const d = body?.data;
    if (d?.accessToken) {
      setTokens(d.accessToken, d.refreshToken);
      return true;
    }
    clearTokens();
    return false;
  } catch {
    // 网络层失败视为暂时性，不清 token，下次请求再试
    return false;
  }
}

/** request<T> 解 envelope.data；用于单实体 / 无分页接口 */
export async function request<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  let resp = await rawFetch(path, opts);

  if (resp.status === 401 && !opts.skipAuth) {
    if (await tryRefresh()) {
      resp = await rawFetch(path, opts);
    }
  }

  const text = await resp.text();
  const body = text ? safeParse(text) : {};
  if (!resp.ok) {
    const err = body?.error || { code: "UNKNOWN", message: resp.statusText };
    throw new APIError(err.code, err.message || "请求失败", resp.status);
  }
  return body?.data as T;
}

/** requestList<T> 同 request 但返回 { data, meta }；用于分页列表接口 */
export async function requestList<T>(
  path: string,
  opts: FetchOptions = {},
): Promise<Envelope<T>> {
  let resp = await rawFetch(path, opts);

  if (resp.status === 401 && !opts.skipAuth) {
    if (await tryRefresh()) {
      resp = await rawFetch(path, opts);
    }
  }

  const text = await resp.text();
  const body = text ? safeParse(text) : {};
  if (!resp.ok) {
    const err = body?.error || { code: "UNKNOWN", message: resp.statusText };
    throw new APIError(err.code, err.message || "请求失败", resp.status);
  }
  return body as Envelope<T>;
}

function safeParse(s: string): any {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}

// ── SSE 客户端（fetch + ReadableStream） ─────────────────────────────

export interface FeedEvent {
  id: string;
  ts: string;
  side: string;
  verb: string;
  level: "info" | "warn" | "danger";
  payload: string;
}

export interface StreamHandlers {
  onEvent: (ev: FeedEvent) => void;
  onOpen?: () => void;
  onError?: (e: unknown) => void;
  onClose?: () => void;
}

export function streamFeed(handlers: StreamHandlers): () => void {
  const controller = new AbortController();
  (async () => {
    try {
      const token = getAccessToken();
      const resp = await fetch(`${API_BASE}/api/v1/feed/stream`, {
        signal: controller.signal,
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok || !resp.body) {
        throw new APIError("STREAM_OPEN_FAILED", `SSE 连接失败: ${resp.status}`, resp.status);
      }
      handlers.onOpen?.();
      const reader = resp.body.pipeThrough(new TextDecoderStream()).getReader();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += value;
        let idx: number;
        while ((idx = buf.indexOf("\n\n")) >= 0) {
          const block = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          parseSSEBlock(block, handlers.onEvent);
        }
      }
    } catch (e) {
      if ((e as any)?.name === "AbortError") return;
      handlers.onError?.(e);
    } finally {
      handlers.onClose?.();
    }
  })();
  return () => controller.abort();
}

function parseSSEBlock(block: string, onEvent: (ev: FeedEvent) => void) {
  let event = "";
  let data = "";
  for (const line of block.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) data += line.slice(5).trim();
  }
  if (event === "feed" && data) {
    try { onEvent(JSON.parse(data)); } catch {}
  }
}

// ── 查询参数 ─────────────────────────────────────────────────────

export interface PageParams {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: string;
  category?: string;
  type?: string;
  actor?: string;
}

export function qs(p?: PageParams | Record<string, any>): string {
  if (!p) return "";
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) {
    if (v !== undefined && v !== null && v !== "") u.set(k, String(v));
  }
  const s = u.toString();
  return s ? `?${s}` : "";
}

// ── 通用 CRUD 模板 ──────────────────────────────────────────────
//
// 每个资源都有 list/get/create/update/remove 标准操作；用泛型工厂统一生成。
// 各资源接口的特殊端点（CSV import/export、analyze、activate、heartbeat…）
// 在下面单独挂载到 api.<resource> 上。

function crudFor<T>(base: string) {
  return {
    list: (p?: PageParams) => requestList<T[]>(`${base}${qs(p)}`),
    get: (id: string) => request<T>(`${base}/${id}`),
    create: (input: Partial<T> | Record<string, any>) =>
      request<T>(base, { method: "POST", body: JSON.stringify(input) }),
    update: (id: string, input: Partial<T> | Record<string, any>) =>
      request<T>(`${base}/${id}`, { method: "PUT", body: JSON.stringify(input) }),
    remove: (id: string) =>
      request<void>(`${base}/${id}`, { method: "DELETE" }),
  };
}

// ── auth 响应 ────────────────────────────────────────────────────
export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken?: string;
  expiresAt: string;
}

// ── 高层 API ─────────────────────────────────────────────────────

export const api = {
  // ── auth
  async login(account: string, password: string): Promise<User> {
    const d = await request<LoginResponse>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ account, password }),
      skipAuth: true,
    });
    setTokens(d.accessToken, d.refreshToken);
    return d.user;
  },
  async register(input: {
    name: string; phone?: string; email?: string;
    password: string; role: "family" | "biz"; tenantId?: string;
    account?: string;
  }): Promise<User> {
    return request<User>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
      skipAuth: true,
    });
  },
  async logout(): Promise<void> {
    try { await request<void>("/api/v1/auth/logout", { method: "POST" }); } catch {}
    clearTokens();
  },
  async me(): Promise<User> { return request<User>("/api/v1/me/"); },
  async updateMe(patch: { name?: string; phone?: string; email?: string; dept?: string }): Promise<User> {
    return request<User>("/api/v1/me/", { method: "PUT", body: JSON.stringify(patch) });
  },
  async uploadAvatar(file: File): Promise<User> {
    const fd = new FormData();
    fd.append("file", file, file.name);
    return request<User>("/api/v1/me/avatar", { method: "PUT", body: fd });
  },
  async deleteAvatar(): Promise<User> {
    return request<User>("/api/v1/me/avatar", { method: "DELETE" });
  },
  avatarURL(user: { id: string; hasAvatar?: boolean }, version = 0): string | null {
    if (!user.hasAvatar) return null;
    // GET /api/v1/me/avatar 需要 token；改用 fetch+blob 拉再 URL.createObjectURL，由调用方处理。
    // 这里只暴露原始路径，settings 页用 fetch+blob。
    return `${API_BASE}/api/v1/me/avatar?v=${version}`;
  },

  // ── 紧急联系人（/me/emergency-contacts）
  emergencyContacts: {
    list: () => request<EmergencyContact[]>("/api/v1/me/emergency-contacts"),
    create: (input: { name: string; phone: string; relation?: string }) =>
      request<EmergencyContact>("/api/v1/me/emergency-contacts", {
        method: "POST", body: JSON.stringify(input),
      }),
    update: (id: string, input: { name: string; phone: string; relation?: string }) =>
      request<EmergencyContact>(`/api/v1/me/emergency-contacts/${id}`, {
        method: "PUT", body: JSON.stringify(input),
      }),
    remove: (id: string) =>
      request<void>(`/api/v1/me/emergency-contacts/${id}`, { method: "DELETE" }),
  },

  // ── 修改密码（/me/password）
  changePassword: (oldPassword: string, newPassword: string) =>
    request<{ ok: boolean }>("/api/v1/me/password", {
      method: "PUT",
      body: JSON.stringify({ oldPassword, newPassword }),
    }),

  // ── 登录设备 / 会话（/me/sessions）
  sessions: {
    list: () => request<SessionView[]>("/api/v1/me/sessions"),
    revoke: (token: string) =>
      request<void>(`/api/v1/me/sessions/${encodeURIComponent(token)}`, { method: "DELETE" }),
    revokeOthers: () =>
      request<{ revoked: number }>("/api/v1/me/sessions/others", { method: "DELETE" }),
  },

  // ── warroom 兼容
  async getDefcon() { return request<{ level: number }>("/api/v1/defcon"); },
  async setDefcon(level: number) {
    return request<{ level: number }>("/api/v1/defcon", {
      method: "POST", body: JSON.stringify({ level }),
    });
  },
  async getStats() { return request<Record<string, number>>("/api/v1/stats"); },

  warroom: {
    overview: () =>
      request<{
        counters: {
          interceptedCalls: number; blockedCalls: number; aiJudgedFraud: number;
          scriptHits: number; smsBlocked: number; fundsHeldYuan: number;
        };
        defcon: number; since: string; nowUtc: string;
        hub: { subscribers: number; buffered: number; lastEventAt: string };
        engine: { analyzed: number; failed: number; lastAnalyzedAt: string };
        runtime: {
          cpuPct: number; memPct: number; netRxBps: number; netTxBps: number;
          goroutines: number; sampledAt: string;
        };
      }>("/api/v1/warroom/overview"),
  },

  // ── 业务资源（CRUD）
  blacklist: {
    ...crudFor<BlackEntry>("/api/v1/blacklist"),
    // CSV 导出：返回 Blob
    async exportCSV(): Promise<Blob> {
      const token = getAccessToken();
      const resp = await fetch(`${API_BASE}/api/v1/blacklist/export`, {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) throw new APIError("EXPORT_FAILED", "导出失败", resp.status);
      return resp.blob();
    },
    // JSON 批量导入（CSV 走 multipart，前端先实现 JSON）
    importJSON: (items: Partial<BlackEntry>[]) =>
      request<{ imported: number; skipped: number }>(
        "/api/v1/blacklist/import",
        { method: "POST", body: JSON.stringify(items) },
      ),
    // 下发待下发条目（举报通过自动入库的）。admin→本租户就地生效；sysadmin→提升全局。
    dispatch: (id: string) =>
      request<BlackEntry>(`/api/v1/blacklist/${id}/dispatch`, { method: "POST" }),
  },
  whitelist: crudFor<WhiteEntry>("/api/v1/whitelist"),
  knowledge: crudFor<KnowledgeArticle>("/api/v1/knowledge"),
  rules: crudFor<ScamRule>("/api/v1/scam-rules"),

  // ── 风控等级
  riskLevel: {
    getState: () => request<{ activeLevel: number }>("/api/v1/risk-level/state"),
    setState: (activeLevel: number) =>
      request<{ activeLevel: number }>("/api/v1/risk-level/state", {
        method: "PUT", body: JSON.stringify({ activeLevel }),
      }),
    listRules: (p?: PageParams) =>
      requestList<any[]>(`/api/v1/risk-level/rules${qs(p)}`),
    createRule: (input: any) =>
      request<any>("/api/v1/risk-level/rules", { method: "POST", body: JSON.stringify(input) }),
    updateRule: (id: string, input: any) =>
      request<any>(`/api/v1/risk-level/rules/${id}`, { method: "PUT", body: JSON.stringify(input) }),
    removeRule: (id: string) =>
      request<void>(`/api/v1/risk-level/rules/${id}`, { method: "DELETE" }),
  },

  // ── 样本审核
  samples: {
    list: (p?: PageParams) => requestList<ScamSample[]>(`/api/v1/samples${qs(p)}`),
    get: (id: string) => request<ScamSample>(`/api/v1/samples/${id}`),
    analyze: (id: string) =>
      request<{ id: string; status: string; classification: string; hits: any[] }>(
        `/api/v1/samples/${id}/analyze`, { method: "POST" },
      ),
    reject: (id: string) =>
      request<{ id: string; status: string }>(`/api/v1/samples/${id}/reject`, { method: "POST" }),
    // .doc 导出 URL（含 token 不便，直接给前端打开链接；如需带 token 用 fetch+blob 下载）
    async exportDoc(id: string): Promise<Blob> {
      const token = getAccessToken();
      const resp = await fetch(`${API_BASE}/api/v1/samples/${id}/export-doc`, {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) throw new APIError("EXPORT_FAILED", "导出失败", resp.status);
      return resp.blob();
    },
  },

  // ── 录音
  recordings: {
    list: (p?: PageParams) => requestList<Recording[]>(`/api/v1/recordings${qs(p)}`),
    remove: (id: string) => request<void>(`/api/v1/recordings/${id}`, { method: "DELETE" }),
    download: (id: string) =>
      request<{ url: string; expiresIn: number }>(`/api/v1/recordings/${id}/download`),
    getPolicy: () =>
      request<{ tenantId: string; uploadEnabled: boolean }>("/api/v1/recordings/policy"),
    setPolicy: (uploadEnabled: boolean) =>
      request<{ tenantId: string; uploadEnabled: boolean }>("/api/v1/recordings/policy", {
        method: "PUT", body: JSON.stringify({ uploadEnabled }),
      }),
    async upload(form: FormData) {
      const token = getAccessToken();
      const resp = await fetch(`${API_BASE}/api/v1/recordings`, {
        method: "POST", body: form,
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const text = await resp.text();
      const body = text ? safeParse(text) : {};
      if (!resp.ok) throw new APIError(body?.error?.code || "UPLOAD_FAILED", body?.error?.message || "上传失败", resp.status);
      return body.data as Recording;
    },
  },

  // ── 声纹模型
  voiceModels: {
    list: (p?: PageParams) => requestList<VoiceModel[]>(`/api/v1/voice-models${qs(p)}`),
    activate: (id: string) =>
      request<{ id: string; active: boolean }>(`/api/v1/voice-models/${id}/activate`, { method: "POST" }),
    remove: (id: string) => request<void>(`/api/v1/voice-models/${id}`, { method: "DELETE" }),
    async upload(form: FormData) {
      const token = getAccessToken();
      const resp = await fetch(`${API_BASE}/api/v1/voice-models`, {
        method: "POST", body: form,
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const text = await resp.text();
      const body = text ? safeParse(text) : {};
      if (!resp.ok) throw new APIError(body?.error?.code || "UPLOAD_FAILED", body?.error?.message || "上传失败", resp.status);
      return body.data as VoiceModel;
    },
  },

  // ── 声纹样本
  voiceSamples: {
    list: (p?: PageParams) =>
      requestList<{ id: string; name: string; size: number; tag: "synth" | "human"; createdAt: string }[]>(
        `/api/v1/voice-samples${qs(p)}`,
      ),
    remove: (id: string) => request<void>(`/api/v1/voice-samples/${id}`, { method: "DELETE" }),
    async upload(form: FormData) {
      const token = getAccessToken();
      const resp = await fetch(`${API_BASE}/api/v1/voice-samples`, {
        method: "POST", body: form,
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const text = await resp.text();
      const body = text ? safeParse(text) : {};
      if (!resp.ok) throw new APIError(body?.error?.code || "UPLOAD_FAILED", body?.error?.message || "上传失败", resp.status);
      return body.data;
    },
  },

  // ── Agent 配置（display_words / whisper / qwen 三组 jsonb；qwen 存通用 LLM 配置）
  // 后端返回 { key, value, updatedAt } 信封；这里统一解出 value，
  // 页面直接拿到存储的配置本体。
  agents: {
    getDisplayWords: () =>
      request<{ key: string; value: any }>("/api/v1/agents/display-words").then((r) => r?.value ?? null),
    setDisplayWords: (value: any) =>
      request<any>("/api/v1/agents/display-words", { method: "PUT", body: JSON.stringify({ value }) }),
    getWhisper: () =>
      request<{ key: string; value: any }>("/api/v1/agents/whisper").then((r) => r?.value ?? null),
    setWhisper: (value: any) =>
      request<any>("/api/v1/agents/whisper", { method: "PUT", body: JSON.stringify({ value }) }),
    getQwen: () =>
      request<{ key: string; value: any }>("/api/v1/agents/qwen").then((r) => r?.value ?? null),
    setQwen: (value: any) =>
      request<any>("/api/v1/agents/qwen", { method: "PUT", body: JSON.stringify({ value }) }),
  },

  // ── 通话记录
  calls: {
    list: (p?: PageParams) => requestList<CallLog[]>(`/api/v1/calls${qs(p)}`),
    get: (id: string) => request<any>(`/api/v1/calls/${id}`),
  },

  // ── 用户
  users: {
    ...crudFor<ManagedUser>("/api/v1/users"),
  },

  // ── 申诉
  appeals: {
    list: (p?: PageParams) => requestList<Appeal[]>(`/api/v1/appeals${qs(p)}`),
    // 审核方列表：后端按角色分流（sysadmin→全部云端 / admin→本租户本地 /
    // family_admin→本租户全部），同一 /appeals 端点，无独立 /all 端点。
    listAll: (p?: PageParams) => requestList<Appeal[]>(`/api/v1/appeals${qs(p)}`),
    create: (input: Partial<Appeal> & { scope?: "local" | "cloud"; recordingId?: string }) =>
      request<Appeal>("/api/v1/appeals", { method: "POST", body: JSON.stringify(input) }),
    setStatus: (id: string, status: string) =>
      request<Appeal>(`/api/v1/appeals/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }),
  },

  // ── 管理员申请
  adminApply: {
    list: (p?: PageParams) => requestList<any[]>(`/api/v1/admin-apply${qs(p)}`),
    myStatus: () => request<any>("/api/v1/admin-apply/status"),
    submit: (input: { scope: "family" | "biz"; reason: string; contact: string }) =>
      request<any>("/api/v1/admin-apply", { method: "POST", body: JSON.stringify(input) }),
    withdraw: () =>
      request<void>("/api/v1/admin-apply/mine", { method: "DELETE" }),
    review: (id: string, status: "approved" | "rejected") =>
      request<any>(`/api/v1/admin-apply/${id}/review`, {
        method: "PUT", body: JSON.stringify({ status }),
      }),
  },

  // ── 权限位图（管理员写他人）
  permissions: {
    getFamily: () => request<any[]>("/api/v1/permissions/family"),
    setFamily: (targetUserId: string, items: { key: string; enabled: boolean }[]) =>
      request<any[]>("/api/v1/permissions/family", {
        method: "PUT", body: JSON.stringify({ targetUserId, items }),
      }),
    getBiz: () => request<any[]>("/api/v1/permissions/biz"),
    setBiz: (targetUserId: string, items: { key: string; enabled: boolean }[]) =>
      request<any[]>("/api/v1/permissions/biz", {
        method: "PUT", body: JSON.stringify({ targetUserId, items }),
      }),
  },

  // ── 设备
  devices: {
    list: (p?: PageParams & { type?: "enterprise" | "family" }) =>
      requestList<ApiDevice[]>(`/api/v1/devices${qs(p)}`),
    create: (input: Partial<ApiDevice>) =>
      request<ApiDevice>("/api/v1/devices", { method: "POST", body: JSON.stringify(input) }),
    update: (id: string, input: Partial<ApiDevice>) =>
      request<ApiDevice>(`/api/v1/devices/${id}`, { method: "PUT", body: JSON.stringify(input) }),
    remove: (id: string) => request<void>(`/api/v1/devices/${id}`, { method: "DELETE" }),
    audit: (p?: PageParams) =>
      requestList<ApiAuditLog[]>(`/api/v1/devices/audit${qs(p)}`),
  },

  // ── 审计
  audit: {
    list: (p?: PageParams) => requestList<AuditLog[]>(`/api/v1/audit${qs(p)}`),
  },

  // ── 大屏（dashboard 聚合）
  dashboard: {
    riskIndex: () => request<{
      index: number; sampleSize: number; blocked: number;
      aiJudged: number; windowHours: number;
    }>("/api/v1/dashboard/risk-index"),
    regions: () => request<{ region: string; count: number }[]>("/api/v1/dashboard/regions"),
    events: (p?: { limit?: number }) => requestList<{
      id: string; phone: string; region: string; verdict: string;
      reason: string; riskScore: number; createdAt: string;
    }[]>(`/api/v1/dashboard/events${qs(p)}`),
  },

  // ── 身份证件
  credentials: {
    list: () => request<any[]>("/api/v1/me/credentials"),
    submit: (kind: string, value: string) =>
      request<any>(`/api/v1/me/credentials/${kind}`, {
        method: "POST", body: JSON.stringify({ value }),
      }),
    remove: (kind: string) =>
      request<void>(`/api/v1/me/credentials/${kind}`, { method: "DELETE" }),
    upload: async (kind: string, slot: "face" | "emblem" | "main", file: File) => {
      const fd = new FormData();
      fd.append("slot", slot);
      fd.append("file", file, file.name);
      return request<any>(`/api/v1/me/credentials/${kind}/upload`, {
        method: "POST", body: fd,
      });
    },
    removePhoto: (kind: string, slot: "face" | "emblem" | "main") =>
      request<any>(`/api/v1/me/credentials/${kind}/photos/${slot}`, { method: "DELETE" }),
    getModes: () => request<any[]>("/api/v1/me/identity-modes"),
    setModes: (items: { key: string; enabled: boolean }[]) =>
      request<any[]>("/api/v1/me/identity-modes", {
        method: "PATCH", body: JSON.stringify({ items }),
      }),
  },

  // ── 分析（端侧用，前端通常不直接调；保留入口便于测试）
  analyze: (input: any) =>
    request<any>("/api/v1/analyze", { method: "POST", body: JSON.stringify(input) }),
};

