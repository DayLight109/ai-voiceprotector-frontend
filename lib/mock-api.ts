"use client";

import {
  SEED,
  type Appeal,
  type AuditLog,
  type BlackEntry,
  type CallLog,
  type Device,
  type KnowledgeArticle,
  type ManagedUser,
  type Recording,
  type ScamRule,
  type ScamSample,
  type VoiceModel,
  type WhiteEntry,
} from "./mock";

type AppRole = "family" | "biz" | "family_admin" | "admin" | "sysadmin";

interface MockUser {
  id: string;
  tenantId: string;
  name: string;
  phone?: string;
  email?: string;
  role: AppRole;
  status: string;
  dept?: string;
  hasAvatar?: boolean;
  account: string;
  password: string;
}

interface MockEmergencyContact {
  id: string;
  userId: string;
  name: string;
  phone: string;
  relation: string;
  createdAt: string;
}

interface MockSessionView {
  token: string;
  userId: string;
  deviceLabel: string;
  ip: string;
  userAgent: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  current: boolean;
}

interface MockPhoto {
  slot: string;
  name: string;
  size: number;
  mime: string;
  dataUrl: string;
  updatedAt: string;
}

interface MockCredential {
  userId: string;
  kind: string;
  masked?: string;
  verified?: boolean;
  value?: string;
  updatedAt?: string;
  photos?: MockPhoto[];
}

interface MockVoiceSample {
  id: string;
  name: string;
  size: number;
  tag: "synth" | "human";
  createdAt: string;
}

interface MockPermissionItem {
  key: string;
  enabled: boolean;
}

interface MockAdminApply {
  id: string;
  userId: string;
  scope: "family" | "biz";
  reason: string;
  contact: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  decidedAt?: string;
  decidedBy?: string;
}

interface MockRiskRule {
  id: string;
  level: 1 | 2 | 3 | 4 | 5;
  keyword: string;
  weight: number;
  enabled: boolean;
}

interface MockDB {
  authUsers: MockUser[];
  blacklist: BlackEntry[];
  whitelist: WhiteEntry[];
  knowledge: KnowledgeArticle[];
  rules: ScamRule[];
  samples: ScamSample[];
  recordings: Recording[];
  managedUsers: ManagedUser[];
  appeals: Appeal[];
  callLogs: CallLog[];
  devices: Device[];
  audit: AuditLog[];
  voiceModels: VoiceModel[];
  voiceSamples: MockVoiceSample[];
  emergencyContacts: MockEmergencyContact[];
  sessions: MockSessionView[];
  credentials: MockCredential[];
  identityModes: MockPermissionItem[];
  familyPermissions: MockPermissionItem[];
  bizPermissions: MockPermissionItem[];
  adminApplications: MockAdminApply[];
  riskLevelState: { activeLevel: 1 | 2 | 3 | 4 | 5 };
  riskRules: MockRiskRule[];
  agentDisplayWords: string[];
  agentWhisper: Record<string, unknown>;
  agentQwen: Record<string, unknown>;
  recordingPolicy: { tenantId: string; uploadEnabled: boolean };
  avatars: Record<string, string>;
  defcon: 1 | 2 | 3 | 4 | 5;
}

export class MockHTTPError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

type MockRequestOptions = {
  method?: string;
  body?: BodyInit | null;
  skipAuth?: boolean;
};

type Envelope<T> = { data: T; meta?: { page?: number; pageSize?: number; total: number } };

const DB_KEY = "sentinel.v1.mock.db";
const TOKEN_KEY = "sentinel.v1.token";
const REFRESH_KEY = "sentinel.v1.refresh";

const SAMPLE_PENDING: ScamSample["status"] = SEED.samples[0]?.status ?? "待审核";
const SAMPLE_APPROVED =
  (SEED.samples.find((item) => item.status !== SAMPLE_PENDING)?.status ?? "已审核") as ScamSample["status"];
const SAMPLE_REJECTED =
  [...new Set(SEED.samples.map((item) => item.status))].find(
    (item) => item !== SAMPLE_PENDING && item !== SAMPLE_APPROVED,
  ) ?? "已驳回";
const RECORDING_BLOCKED: Recording["verdict"] = SEED.recordings[0]?.verdict ?? "拦截";
const RECORDING_WARN =
  (SEED.recordings.find((item) => item.verdict !== RECORDING_BLOCKED)?.verdict ?? "预警") as Recording["verdict"];
const RECORDING_PASS =
  [...new Set(SEED.recordings.map((item) => item.verdict))].find(
    (item) => item !== RECORDING_BLOCKED && item !== RECORDING_WARN,
  ) ?? "通过";

let memoryDB: MockDB | null = null;

export function isMockApiEnabled() {
  const useMock =
    typeof process !== "undefined" ? process.env.NEXT_PUBLIC_USE_MOCK : undefined;
  const apiUrl =
    typeof process !== "undefined" ? process.env.NEXT_PUBLIC_API_URL : undefined;
  return useMock === "1" || !apiUrl;
}

export function getMockAvatarDataUrl(userId: string) {
  return readDB().avatars[userId] ?? null;
}

export async function mockRequest<T = unknown>(
  path: string,
  opts: MockRequestOptions = {},
): Promise<Envelope<T>> {
  const url = new URL(path, "http://mock.local");
  const pathname = normalizePath(url.pathname);
  const method = (opts.method || "GET").toUpperCase();
  const body = await parseBody(opts.body);
  const db = readDB();

  if (pathname === "/api/v1/auth/login" && method === "POST") {
    return ok(handleLogin(db, body)) as Envelope<T>;
  }
  if (pathname === "/api/v1/auth/register" && method === "POST") {
    return ok(handleRegister(db, body)) as Envelope<T>;
  }
  if (pathname === "/api/v1/auth/refresh" && method === "POST") {
    return ok(handleRefresh(db, body)) as Envelope<T>;
  }
  if (pathname === "/api/v1/auth/logout" && method === "POST") {
    const user = currentUser(db);
    if (user) {
      const token = readStorage(TOKEN_KEY);
      db.sessions = db.sessions.filter((session) => session.token !== token);
      writeDB(db);
    }
    return ok(undefined as T);
  }

  const user = opts.skipAuth ? null : requireUser(db);

  if (pathname === "/api/v1/me" && method === "GET") {
    return ok(publicUser(user!)) as Envelope<T>;
  }
  if (pathname === "/api/v1/me" && method === "PUT") {
    Object.assign(user!, pick(body, ["name", "phone", "email", "dept"]));
    writeDB(db);
    return ok(publicUser(user!)) as Envelope<T>;
  }
  if (pathname === "/api/v1/me/avatar" && method === "PUT") {
    const file = body instanceof FormData ? (body.get("file") as File | null) : null;
    if (!file) throw new MockHTTPError("VALIDATION_FAILED", "avatar file is required", 400);
    db.avatars[user!.id] = await fileToDataUrl(file);
    user!.hasAvatar = true;
    writeDB(db);
    return ok(publicUser(user!)) as Envelope<T>;
  }
  if (pathname === "/api/v1/me/avatar" && method === "DELETE") {
    delete db.avatars[user!.id];
    user!.hasAvatar = false;
    writeDB(db);
    return ok(publicUser(user!)) as Envelope<T>;
  }
  if (pathname === "/api/v1/me/emergency-contacts" && method === "GET") {
    return ok(listMine(db.emergencyContacts, user!.id)) as Envelope<T>;
  }
  if (pathname === "/api/v1/me/emergency-contacts" && method === "POST") {
    const created = {
      id: nextId("ec"),
      userId: user!.id,
      name: String(body?.name || "").trim(),
      phone: String(body?.phone || "").trim(),
      relation: String(body?.relation || "").trim(),
      createdAt: displayTime(),
    };
    db.emergencyContacts.unshift(created);
    writeDB(db);
    return ok(created as T);
  }
  if (pathname.startsWith("/api/v1/me/emergency-contacts/")) {
    const id = pathname.split("/").pop()!;
    const current = db.emergencyContacts.find((item) => item.id === id && item.userId === user!.id);
    if (!current) throw new MockHTTPError("NOT_FOUND", "contact not found", 404);
    if (method === "PUT") {
      Object.assign(current, pick(body, ["name", "phone", "relation"]));
      writeDB(db);
      return ok(current as T);
    }
    if (method === "DELETE") {
      db.emergencyContacts = db.emergencyContacts.filter((item) => item.id !== id);
      writeDB(db);
      return ok(undefined as T);
    }
  }
  if (pathname === "/api/v1/me/password" && method === "PUT") {
    const oldPassword = String(body?.oldPassword || "");
    const newPassword = String(body?.newPassword || "");
    if (oldPassword !== user!.password) {
      throw new MockHTTPError("AUTH_BAD_PASSWORD", "current password is invalid", 400);
    }
    user!.password = newPassword;
    writeDB(db);
    return ok({ ok: true } as T);
  }
  if (pathname === "/api/v1/me/sessions" && method === "GET") {
    touchCurrentSession(db);
    const rows = db.sessions
      .filter((session) => session.userId === user!.id)
      .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt))
      .map(({ userId: _userId, ...rest }) => rest);
    writeDB(db);
    return ok(rows as T);
  }
  if (pathname === "/api/v1/me/sessions/others" && method === "DELETE") {
    const token = readStorage(TOKEN_KEY);
    const before = db.sessions.length;
    db.sessions = db.sessions.filter(
      (session) => session.userId !== user!.id || session.token === token,
    );
    writeDB(db);
    return ok({ revoked: before - db.sessions.length } as T);
  }
  if (pathname.startsWith("/api/v1/me/sessions/") && method === "DELETE") {
    const token = decodeURIComponent(pathname.split("/").pop()!);
    db.sessions = db.sessions.filter((session) => session.token !== token);
    writeDB(db);
    return ok(undefined as T);
  }

  if (pathname === "/api/v1/defcon" && method === "GET") {
    return ok({ level: db.defcon } as T);
  }
  if (pathname === "/api/v1/defcon" && method === "POST") {
    const next = Number(body?.level);
    db.defcon = clamp(next, 1, 5) as 1 | 2 | 3 | 4 | 5;
    writeDB(db);
    return ok({ level: db.defcon } as T);
  }
  if (pathname === "/api/v1/stats" && method === "GET") {
    return ok(buildStats(db) as T);
  }

  if (pathname === "/api/v1/blacklist/import" && method === "POST") {
    const rows = Array.isArray(body) ? body : [];
    const created = rows.map((item) => ({
      id: nextId("bl"),
      number: String(item.number || ""),
      reason: String(item.reason || ""),
      category: String(item.category || ""),
      risk: Number(item.risk || 0),
      source: String(item.source || "manual"),
      createdAt: displayTime(),
    })) as BlackEntry[];
    db.blacklist = [...created, ...db.blacklist];
    writeDB(db);
    return ok({ imported: created.length, skipped: 0 } as T);
  }

  if (pathname === "/api/v1/risk-level/state" && method === "GET") {
    return ok(db.riskLevelState as T);
  }
  if (pathname === "/api/v1/risk-level/state" && method === "PUT") {
    db.riskLevelState.activeLevel = clamp(Number(body?.activeLevel), 1, 5) as 1 | 2 | 3 | 4 | 5;
    writeDB(db);
    return ok(db.riskLevelState as T);
  }
  if (pathname === "/api/v1/risk-level/rules" && method === "GET") {
    return listOk(applyFilters(db.riskRules, url.searchParams), url.searchParams) as Envelope<T>;
  }
  if (pathname === "/api/v1/risk-level/rules" && method === "POST") {
    const created: MockRiskRule = {
      id: nextId("rr"),
      level: clamp(Number(body?.level), 1, 5) as 1 | 2 | 3 | 4 | 5,
      keyword: String(body?.keyword || ""),
      weight: Number(body?.weight || 0),
      enabled: body?.enabled !== false,
    };
    db.riskRules.unshift(created);
    writeDB(db);
    return ok(created as T);
  }
  if (pathname.startsWith("/api/v1/risk-level/rules/")) {
    const id = pathname.split("/").pop()!;
    const item = db.riskRules.find((rule) => rule.id === id);
    if (!item) throw new MockHTTPError("NOT_FOUND", "risk rule not found", 404);
    if (method === "PUT") {
      Object.assign(item, pick(body, ["keyword", "weight", "enabled", "level"]));
      writeDB(db);
      return ok(item as T);
    }
    if (method === "DELETE") {
      db.riskRules = db.riskRules.filter((rule) => rule.id !== id);
      writeDB(db);
      return ok(undefined as T);
    }
  }

  if (pathname === "/api/v1/samples" && method === "GET") {
    return listOk(applyFilters(db.samples, url.searchParams), url.searchParams) as Envelope<T>;
  }
  if (pathname.startsWith("/api/v1/samples/") && pathname.endsWith("/analyze") && method === "POST") {
    const id = pathname.split("/")[4];
    const item = db.samples.find((sample) => sample.id === id);
    if (!item) throw new MockHTTPError("NOT_FOUND", "sample not found", 404);
    item.status = SAMPLE_APPROVED;
    writeDB(db);
    return ok({
      id: item.id,
      status: item.status,
      classification: item.classification,
      hits: [{ category: item.classification, weight: 92 }],
    } as T);
  }
  if (pathname.startsWith("/api/v1/samples/") && pathname.endsWith("/reject") && method === "POST") {
    const id = pathname.split("/")[4];
    const item = db.samples.find((sample) => sample.id === id);
    if (!item) throw new MockHTTPError("NOT_FOUND", "sample not found", 404);
    item.status = SAMPLE_REJECTED;
    writeDB(db);
    return ok({ id: item.id, status: item.status } as T);
  }
  if (pathname.startsWith("/api/v1/samples/") && method === "GET") {
    const id = pathname.split("/").pop()!;
    const item = db.samples.find((sample) => sample.id === id);
    if (!item) throw new MockHTTPError("NOT_FOUND", "sample not found", 404);
    return ok(item as T);
  }

  if (pathname === "/api/v1/recordings/policy" && method === "GET") {
    return ok(db.recordingPolicy as T);
  }
  if (pathname === "/api/v1/recordings/policy" && method === "PUT") {
    db.recordingPolicy.uploadEnabled = body?.uploadEnabled !== false;
    writeDB(db);
    return ok(db.recordingPolicy as T);
  }
  if (pathname === "/api/v1/recordings" && method === "POST") {
    const file = body instanceof FormData ? (body.get("file") as File | null) : null;
    const created: Recording = {
      id: nextId("rec"),
      owner: publicUser(user!).name,
      phone: String(body instanceof FormData ? body.get("phone") || user!.phone || "" : user!.phone || ""),
      duration: "00:42",
      size: humanSize(file?.size ?? 0),
      verdict: RECORDING_PASS,
      createdAt: displayTime(),
    };
    db.recordings.unshift(created);
    writeDB(db);
    return ok(created as T);
  }
  if (pathname.startsWith("/api/v1/recordings/") && pathname.endsWith("/download") && method === "GET") {
    const id = pathname.split("/")[4];
    const item = db.recordings.find((record) => record.id === id);
    if (!item) throw new MockHTTPError("NOT_FOUND", "recording not found", 404);
    return ok({
      url: objectUrl("audio/wav", `Mock recording for ${item.phone}`),
      expiresIn: 3600,
    } as T);
  }

  if (pathname === "/api/v1/voice-models" && method === "POST") {
    const form = body instanceof FormData ? body : null;
    const file = form?.get("file") as File | null;
    const version = String(form?.get("version") || file?.name || `voiceguard-${nextId("vm")}`);
    const created: VoiceModel = {
      id: nextId("vm"),
      version,
      accuracy: 97 + Math.random() * 2,
      size: humanSize(file?.size ?? 0),
      uploadedAt: displayDate(),
      active: db.voiceModels.length === 0,
    };
    db.voiceModels.unshift(created);
    writeDB(db);
    return ok(created as T);
  }
  if (pathname.startsWith("/api/v1/voice-models/") && pathname.endsWith("/activate") && method === "POST") {
    const id = pathname.split("/")[4];
    db.voiceModels = db.voiceModels.map((model) => ({ ...model, active: model.id === id }));
    writeDB(db);
    return ok({ id, active: true } as T);
  }

  if (pathname === "/api/v1/voice-samples" && method === "POST") {
    const form = body instanceof FormData ? body : null;
    const file = form?.get("file") as File | null;
    const tag = String(form?.get("tag") || "human") === "synth" ? "synth" : "human";
    const created: MockVoiceSample = {
      id: nextId("vs"),
      name: file?.name || `sample-${nextId("f")}.wav`,
      size: file?.size ?? 0,
      tag,
      createdAt: displayTime(),
    };
    db.voiceSamples.unshift(created);
    writeDB(db);
    return ok(created as T);
  }

  if (pathname === "/api/v1/agents/display-words") {
    if (method === "GET") return ok(db.agentDisplayWords as T);
    if (method === "PUT") {
      db.agentDisplayWords = Array.isArray(body?.value) ? [...body.value] : [];
      writeDB(db);
      return ok(db.agentDisplayWords as T);
    }
  }
  if (pathname === "/api/v1/agents/whisper") {
    if (method === "GET") return ok(db.agentWhisper as T);
    if (method === "PUT") {
      db.agentWhisper = typeof body?.value === "object" && body?.value ? { ...body.value } : {};
      writeDB(db);
      return ok(db.agentWhisper as T);
    }
  }
  if (pathname === "/api/v1/agents/qwen") {
    if (method === "GET") return ok(db.agentQwen as T);
    if (method === "PUT") {
      db.agentQwen = typeof body?.value === "object" && body?.value ? { ...body.value } : {};
      writeDB(db);
      return ok(db.agentQwen as T);
    }
  }

  if (pathname === "/api/v1/admin-apply/status" && method === "GET") {
    const mine = db.adminApplications.find((item) => item.userId === user!.id) ?? { status: "none" };
    return ok(mine as T);
  }
  if (pathname === "/api/v1/admin-apply" && method === "GET") {
    return listOk(applyFilters(db.adminApplications, url.searchParams), url.searchParams) as Envelope<T>;
  }
  if (pathname === "/api/v1/admin-apply" && method === "POST") {
    const pending = db.adminApplications.find(
      (item) => item.userId === user!.id && item.status === "pending",
    );
    if (pending) {
      throw new MockHTTPError("ADMIN_APPLY_PENDING", "application already pending", 409);
    }
    const created: MockAdminApply = {
      id: nextId("aa"),
      userId: user!.id,
      scope: body?.scope === "biz" ? "biz" : "family",
      reason: String(body?.reason || ""),
      contact: String(body?.contact || ""),
      status: "pending",
      createdAt: displayTime(),
    };
    db.adminApplications.unshift(created);
    writeDB(db);
    return ok(created as T);
  }
  if (pathname === "/api/v1/admin-apply/mine" && method === "DELETE") {
    const before = db.adminApplications.length;
    db.adminApplications = db.adminApplications.filter(
      (item) => !(item.userId === user!.id && item.status === "pending"),
    );
    writeDB(db);
    if (before === db.adminApplications.length) {
      throw new MockHTTPError("NOT_FOUND", "pending application not found", 404);
    }
    return ok(undefined as T);
  }
  if (pathname.startsWith("/api/v1/admin-apply/") && pathname.endsWith("/review") && method === "PUT") {
    const id = pathname.split("/")[4];
    const item = db.adminApplications.find((row) => row.id === id);
    if (!item) throw new MockHTTPError("NOT_FOUND", "application not found", 404);
    item.status = body?.status === "approved" ? "approved" : "rejected";
    item.decidedAt = displayTime();
    item.decidedBy = user!.id;
    writeDB(db);
    return ok(item as T);
  }

  if (pathname === "/api/v1/permissions/family") {
    if (method === "GET") return ok(db.familyPermissions as T);
    if (method === "PUT") {
      db.familyPermissions = Array.isArray(body?.items) ? [...body.items] : [];
      writeDB(db);
      return ok(db.familyPermissions as T);
    }
  }
  if (pathname === "/api/v1/permissions/biz") {
    if (method === "GET") return ok(db.bizPermissions as T);
    if (method === "PUT") {
      db.bizPermissions = Array.isArray(body?.items) ? [...body.items] : [];
      writeDB(db);
      return ok(db.bizPermissions as T);
    }
  }

  if (pathname === "/api/v1/me/credentials" && method === "GET") {
    return ok(db.credentials.filter((item) => item.userId === user!.id).map(stripCredential) as T);
  }
  if (pathname.startsWith("/api/v1/me/credentials/") && pathname.endsWith("/upload") && method === "POST") {
    const kind = pathname.split("/")[5];
    const form = body instanceof FormData ? body : null;
    const slot = String(form?.get("slot") || "");
    const file = form?.get("file") as File | null;
    if (!file) throw new MockHTTPError("VALIDATION_FAILED", "credential file is required", 400);
    const record = ensureCredential(db, user!.id, kind);
    record.photos = record.photos || [];
    const dataUrl = await fileToDataUrl(file);
    const next: MockPhoto = {
      slot,
      name: file.name,
      size: file.size,
      mime: file.type,
      dataUrl,
      updatedAt: new Date().toISOString(),
    };
    record.photos = [...record.photos.filter((item) => item.slot !== slot), next];
    record.updatedAt = new Date().toISOString();
    writeDB(db);
    return ok(stripCredential(record) as T);
  }
  if (pathname.startsWith("/api/v1/me/credentials/") && pathname.includes("/photos/") && method === "DELETE") {
    const [, , , , , kind, , slot] = pathname.split("/");
    const record = db.credentials.find((item) => item.userId === user!.id && item.kind === kind);
    if (!record) throw new MockHTTPError("NOT_FOUND", "credential not found", 404);
    record.photos = (record.photos || []).filter((item) => item.slot !== slot);
    record.updatedAt = new Date().toISOString();
    writeDB(db);
    return ok(stripCredential(record) as T);
  }
  if (pathname.startsWith("/api/v1/me/credentials/")) {
    const kind = pathname.split("/").pop()!;
    if (method === "POST") {
      const record = ensureCredential(db, user!.id, kind);
      record.value = String(body?.value || "");
      record.masked = maskCredential(kind, record.value);
      record.verified = !!body?.verified;
      record.updatedAt = new Date().toISOString();
      writeDB(db);
      return ok(stripCredential(record) as T);
    }
    if (method === "DELETE") {
      db.credentials = db.credentials.filter(
        (item) => !(item.userId === user!.id && item.kind === kind),
      );
      writeDB(db);
      return ok(undefined as T);
    }
  }
  if (pathname === "/api/v1/me/identity-modes" && method === "GET") {
    return ok(db.identityModes as T);
  }
  if (pathname === "/api/v1/me/identity-modes" && method === "PATCH") {
    db.identityModes = Array.isArray(body?.items) ? [...body.items] : [];
    writeDB(db);
    return ok(db.identityModes as T);
  }

  if (pathname === "/api/v1/analyze" && method === "POST") {
    return ok({
      callId: String(body?.callId || nextId("call")),
      ts: new Date().toISOString(),
      trace: { shownRegistry: "CN/BJ", actualOrigin: "MM", mismatch: true, hopCount: 5, risk: 86 },
      voiceprint: { synthProbability: 0.92, regularity: 0.88, risk: 92, verdict: "SYNTH" },
      script: { hits: [{ category: "TRANSFER", weight: 92 }], risk: 96 },
      riskScore: 94,
      riskLevel: "BLOCK",
      action: "block",
      latencyMillis: 28,
    } as T);
  }

  const simpleListRoutes: Array<{ path: string; source: keyof MockDB }> = [
    { path: "/api/v1/blacklist", source: "blacklist" },
    { path: "/api/v1/me/whitelist", source: "whitelist" },
    { path: "/api/v1/knowledge", source: "knowledge" },
    { path: "/api/v1/scam-rules", source: "rules" },
    { path: "/api/v1/recordings", source: "recordings" },
    { path: "/api/v1/voice-models", source: "voiceModels" },
    { path: "/api/v1/voice-samples", source: "voiceSamples" },
    { path: "/api/v1/calls", source: "callLogs" },
    { path: "/api/v1/users", source: "managedUsers" },
    { path: "/api/v1/appeals", source: "appeals" },
    { path: "/api/v1/devices", source: "devices" },
    { path: "/api/v1/devices/audit", source: "audit" },
    { path: "/api/v1/audit", source: "audit" },
  ];

  for (const route of simpleListRoutes) {
    if (pathname === route.path && method === "GET") {
      const rows = applyFilters(asArray(db[route.source]), url.searchParams);
      return listOk(rows, url.searchParams) as Envelope<T>;
    }
  }

  if (pathname === "/api/v1/appeals" && method === "POST") {
    const created: Appeal = {
      id: nextId("ap"),
      type: String(body?.type || "appeal") as Appeal["type"],
      number: String(body?.number || ""),
      reason: String(body?.reason || ""),
      status: String(body?.status || "pending") as Appeal["status"],
      createdAt: displayTime(),
    };
    db.appeals.unshift(created);
    writeDB(db);
    return ok(created as T);
  }
  if (pathname.startsWith("/api/v1/appeals/") && pathname.endsWith("/status") && method === "PUT") {
    const id = pathname.split("/")[4];
    const item = db.appeals.find((row) => row.id === id);
    if (!item) throw new MockHTTPError("NOT_FOUND", "appeal not found", 404);
    item.status = String(body?.status || item.status) as Appeal["status"];
    writeDB(db);
    return ok(item as T);
  }

  if (pathname === "/api/v1/devices" && method === "POST") {
    const created: Device = {
      id: nextId("dev"),
      name: String(body?.name || "New Device"),
      tenant: String(body?.tenant || "Demo Tenant"),
      type: String(body?.type || SEED.devices[0]?.type || "enterprise") as Device["type"],
      status: "online",
      version: String(body?.version || "v2.6.1"),
      lastSeen: displayTime(),
      contact: String(body?.contact || user?.name || "Operator"),
    };
    db.devices.unshift(created);
    writeDB(db);
    return ok(created as T);
  }

  const crudRoutes: Array<{
    base: string;
    source: keyof MockDB;
    makeCreate?: (payload: any) => any;
    onUpdate?: (target: any, payload: any) => void;
  }> = [
    {
      base: "/api/v1/blacklist",
      source: "blacklist",
      makeCreate: (payload) => ({
        id: nextId("bl"),
        number: String(payload?.number || ""),
        reason: String(payload?.reason || ""),
        category: String(payload?.category || ""),
        risk: Number(payload?.risk || 0),
        source: String(payload?.source || "manual"),
        createdAt: displayTime(),
      }),
    },
    {
      base: "/api/v1/me/whitelist",
      source: "whitelist",
      makeCreate: (payload) => ({
        id: nextId("wl"),
        phone: String(payload?.phone || payload?.number || ""),
        name: String(payload?.name || ""),
        relation: String(payload?.relation || ""),
        createdAt: displayTime(),
      }),
      onUpdate: (target, payload) => {
        if (payload?.phone !== undefined) target.phone = payload.phone;
        if (payload?.number !== undefined) target.phone = payload.number;
        if (payload?.name !== undefined) target.name = payload.name;
        if (payload?.relation !== undefined) target.relation = payload.relation;
      },
    },
    {
      base: "/api/v1/knowledge",
      source: "knowledge",
      makeCreate: (payload) => ({
        id: nextId("k"),
        title: String(payload?.title || ""),
        category: String(payload?.category || ""),
        summary: String(payload?.summary || ""),
        body: String(payload?.body || ""),
        views: 0,
        updatedAt: displayDate(),
      }),
      onUpdate: (target, payload) => {
        Object.assign(target, pick(payload, ["title", "category", "summary", "body"]));
        target.updatedAt = displayDate();
      },
    },
    {
      base: "/api/v1/scam-rules",
      source: "rules",
      makeCreate: (payload) => ({
        id: nextId("sr"),
        category: String(payload?.category || ""),
        keyword: String(payload?.keyword || ""),
        weight: Number(payload?.weight || 0),
        enabled: payload?.enabled !== false,
      }),
    },
    {
      base: "/api/v1/users",
      source: "managedUsers",
      makeCreate: (payload) => ({
        id: nextId("usr"),
        name: String(payload?.name || ""),
        role: String(payload?.role || "viewer") as ManagedUser["role"],
        dept: String(payload?.dept || ""),
        status: String(payload?.status || "active") as ManagedUser["status"],
        email: String(payload?.email || ""),
        last: "just now",
      }),
    },
    {
      base: "/api/v1/recordings",
      source: "recordings",
    },
    {
      base: "/api/v1/voice-models",
      source: "voiceModels",
    },
    {
      base: "/api/v1/voice-samples",
      source: "voiceSamples",
    },
    {
      base: "/api/v1/calls",
      source: "callLogs",
    },
    {
      base: "/api/v1/devices",
      source: "devices",
    },
  ];

  for (const route of crudRoutes) {
    if (pathname === route.base && method === "POST" && route.makeCreate) {
      const created = route.makeCreate(body);
      (db[route.source] as any[]).unshift(created);
      writeDB(db);
      return ok(created as T);
    }
    if (pathname.startsWith(`${route.base}/`)) {
      const id = pathname.slice(route.base.length + 1).split("/")[0];
      const rows = db[route.source] as any[];
      const item = rows.find((row) => String(row.id) === id);
      if (!item) continue;
      if (method === "GET") return ok(item as T);
      if (method === "PUT") {
        if (route.onUpdate) route.onUpdate(item, body);
        else Object.assign(item, body || {});
        writeDB(db);
        return ok(item as T);
      }
      if (method === "DELETE") {
        db[route.source] = rows.filter((row) => String(row.id) !== id) as any;
        writeDB(db);
        return ok(undefined as T);
      }
    }
  }

  if (pathname === "/api/v1/dashboard/risk-index" && method === "GET") {
    return ok({ value: 71, delta: 4 } as T);
  }
  if (pathname === "/api/v1/dashboard/regions" && method === "GET") {
    return ok([
      { region: "Beijing", value: 81 },
      { region: "Shanghai", value: 73 },
      { region: "Hangzhou", value: 69 },
    ] as T);
  }
  if (pathname === "/api/v1/dashboard/events" && method === "GET") {
    return listOk(
      db.callLogs.map((item) => ({
        id: item.id,
        title: item.phone,
        level: item.verdict,
        ts: item.createdAt,
      })),
      url.searchParams,
    ) as Envelope<T>;
  }

  throw new MockHTTPError("MOCK_NOT_IMPLEMENTED", `Unmocked route: ${method} ${pathname}`, 500);
}

export async function mockBlob(path: string): Promise<Blob> {
  const url = new URL(path, "http://mock.local");
  const pathname = normalizePath(url.pathname);
  const db = readDB();

  if (pathname === "/api/v1/blacklist/export") {
    const lines = [
      "number,category,reason,risk,source,createdAt",
      ...db.blacklist.map((item) =>
        csvRow([item.number, item.category, item.reason, item.risk, item.source, item.createdAt]),
      ),
    ];
    return new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  }

  if (pathname.startsWith("/api/v1/samples/") && pathname.endsWith("/export-doc")) {
    const id = pathname.split("/")[4];
    const item = db.samples.find((sample) => sample.id === id);
    if (!item) throw new MockHTTPError("NOT_FOUND", "sample not found", 404);
    const content = [
      `Call ID: ${item.callId}`,
      `Classification: ${item.classification}`,
      `Origin: ${item.origin}`,
      `Received At: ${item.receivedAt}`,
      "",
      item.transcript,
    ].join("\n");
    return new Blob([content], { type: "application/msword" });
  }

  throw new MockHTTPError("MOCK_NOT_IMPLEMENTED", `Unmocked blob route: ${pathname}`, 500);
}

function buildStats(db: MockDB) {
  const blocked = db.callLogs.filter((item) => item.verdict === RECORDING_BLOCKED).length;
  const warn = db.callLogs.filter((item) => item.verdict === RECORDING_WARN).length;
  return {
    intercepted: 14382910 + db.callLogs.length * 17,
    blocked: 284917 + blocked,
    aiClones: 1283 + warn,
  };
}

function handleLogin(db: MockDB, body: any) {
  const account = normalizeAccount(String(body?.account || ""));
  const password = String(body?.password || "");
  if (!account || !password) {
    throw new MockHTTPError("VALIDATION_FAILED", "account and password are required", 400);
  }
  const user = resolveLoginUser(db, account);
  const accessToken = `mock-access:${user.id}:${Date.now()}`;
  const refreshToken = `mock-refresh:${user.id}:${Date.now()}`;
  upsertSession(db, user.id, accessToken);
  writeDB(db);
  return {
    user: publicUser(user),
    accessToken,
    refreshToken,
    expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
  };
}

function handleRegister(db: MockDB, body: any) {
  const role: AppRole = body?.role === "biz" ? "biz" : "family";
  const name = String(body?.name || "New User").trim();
  const account = String(body?.account || body?.email || body?.phone || `${role}-${Date.now()}`).trim();
  const created: MockUser = {
    id: nextId("auth"),
    tenantId: role === "biz" ? "tenant-biz" : "tenant-family",
    name,
    phone: body?.phone ? String(body.phone) : undefined,
    email: body?.email ? String(body.email) : undefined,
    role,
    status: "active",
    dept: role === "biz" ? "Operations" : "Household",
    hasAvatar: false,
    account,
    password: String(body?.password || "123456"),
  };
  db.authUsers.unshift(created);
  writeDB(db);
  return publicUser(created);
}

function handleRefresh(db: MockDB, body: any) {
  const refreshToken = String(body?.refreshToken || readStorage(REFRESH_KEY) || "");
  const userId = refreshToken.split(":")[1];
  const user = db.authUsers.find((item) => item.id === userId);
  if (!user) {
    throw new MockHTTPError("AUTH_REQUIRED", "refresh token is invalid", 401);
  }
  const accessToken = `mock-access:${user.id}:${Date.now()}`;
  const nextRefresh = `mock-refresh:${user.id}:${Date.now()}`;
  upsertSession(db, user.id, accessToken);
  writeDB(db);
  return {
    user: publicUser(user),
    accessToken,
    refreshToken: nextRefresh,
    expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
  };
}

function resolveLoginUser(db: MockDB, account: string) {
  const direct = db.authUsers.find((item) =>
    [item.account, item.email, item.phone]
      .filter(Boolean)
      .map((value) => normalizeAccount(String(value)))
      .includes(account),
  );
  if (direct) return direct;

  if (account.includes("sys")) return byRole(db, "sysadmin");
  if (account.includes("family-admin")) return byRole(db, "family_admin");
  if (account.includes("admin")) return byRole(db, "admin");
  if (account.includes("@") || account.includes("biz") || account.includes("company")) {
    return byRole(db, "biz");
  }
  return byRole(db, "family");
}

function byRole(db: MockDB, role: AppRole) {
  return db.authUsers.find((item) => item.role === role) ?? db.authUsers[0];
}

function requireUser(db: MockDB) {
  const user = currentUser(db);
  if (!user) throw new MockHTTPError("AUTH_REQUIRED", "please log in first", 401);
  return user;
}

function currentUser(db: MockDB) {
  const token = readStorage(TOKEN_KEY);
  const userId = token?.split(":")[1];
  if (!userId) return null;
  const user = db.authUsers.find((item) => item.id === userId) ?? null;
  if (user) touchCurrentSession(db, token);
  return user;
}

function touchCurrentSession(db: MockDB, token = readStorage(TOKEN_KEY)) {
  if (!token) return;
  const now = new Date().toISOString();
  let found = false;
  db.sessions = db.sessions.map((session) => {
    const current = session.token === token;
    if (current) {
      found = true;
      return { ...session, current: true, lastSeenAt: now };
    }
    return { ...session, current: false };
  });
  if (found) writeDB(db);
}

function upsertSession(db: MockDB, userId: string, token: string) {
  const now = new Date().toISOString();
  db.sessions = db.sessions.filter((session) => session.token !== token);
  db.sessions.unshift({
    token,
    userId,
    deviceLabel: "Current browser",
    ip: "127.0.0.1",
    userAgent:
      typeof navigator !== "undefined" && navigator.userAgent ? navigator.userAgent : "Mock Browser",
    createdAt: now,
    lastSeenAt: now,
    expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    current: true,
  });
}

function publicUser(user: MockUser) {
  return {
    id: user.id,
    tenantId: user.tenantId,
    name: user.name,
    phone: user.phone,
    email: user.email,
    role: user.role,
    status: user.status,
    dept: user.dept,
    hasAvatar: !!user.hasAvatar,
  };
}

function ensureCredential(db: MockDB, userId: string, kind: string) {
  let record = db.credentials.find((item) => item.userId === userId && item.kind === kind);
  if (!record) {
    record = { userId, kind, verified: false, photos: [], updatedAt: new Date().toISOString() };
    db.credentials.push(record);
  }
  return record;
}

function stripCredential(record: MockCredential) {
  return {
    kind: record.kind,
    masked: record.masked,
    verified: record.verified,
    photos: record.photos,
    updatedAt: record.updatedAt,
  };
}

function maskCredential(kind: string, value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (kind === "phone" && trimmed.length >= 7) {
    return `${trimmed.slice(0, 3)}****${trimmed.slice(-4)}`;
  }
  if (trimmed.length <= 4) return `${trimmed[0]}***`;
  return `${trimmed.slice(0, 2)}***${trimmed.slice(-2)}`;
}

function normalizePath(pathname: string) {
  return pathname.replace(/\/+$/, "") || "/";
}

function normalizeAccount(value: string) {
  return value.trim().toLowerCase().replace(/[\s-]/g, "");
}

function pick(source: any, keys: string[]) {
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    if (source && source[key] !== undefined) out[key] = source[key];
  }
  return out;
}

function listMine<T extends { userId?: string }>(rows: T[], userId: string) {
  return rows.filter((item) => item.userId === userId);
}

function applyFilters<T>(rows: T[], params: URLSearchParams) {
  const q = params.get("q")?.trim().toLowerCase();
  let next = [...rows];
  for (const key of ["status", "category", "type", "actor"] as const) {
    const value = params.get(key);
    if (value) {
      next = next.filter((item) => String((item as any)?.[key] ?? "") === value);
    }
  }
  if (q) {
    next = next.filter((item) => JSON.stringify(item).toLowerCase().includes(q));
  }
  return next;
}

function listOk<T>(rows: T[], params: URLSearchParams): Envelope<T[]> {
  const page = Math.max(1, Number(params.get("page") || 1));
  const pageSize = Math.max(1, Number(params.get("pageSize") || rows.length || 100));
  const start = (page - 1) * pageSize;
  return {
    data: rows.slice(start, start + pageSize),
    meta: { page, pageSize, total: rows.length },
  };
}

function ok<T>(data: T): Envelope<T> {
  return { data };
}

function readDB(): MockDB {
  if (typeof window === "undefined") {
    if (!memoryDB) memoryDB = createDefaultDB();
    return memoryDB;
  }
  try {
    const raw = window.localStorage.getItem(DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MockDB;
      memoryDB = parsed;
      return parsed;
    }
  } catch {}
  const fresh = createDefaultDB();
  writeDB(fresh);
  return fresh;
}

function writeDB(db: MockDB) {
  memoryDB = db;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch {}
}

function readStorage(key: string) {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function createDefaultDB(): MockDB {
  const authUsers: MockUser[] = [
    {
      id: "auth-family",
      tenantId: "tenant-family",
      name: "Wang Lei",
      phone: "13800134921",
      email: "family@sentinel.local",
      role: "family",
      status: "active",
      dept: "Household",
      hasAvatar: false,
      account: "13800134921",
      password: "123456",
    },
    {
      id: "auth-biz",
      tenantId: "tenant-biz",
      name: "Zhou Yan",
      email: "admin@sentinel.cn",
      role: "biz",
      status: "active",
      dept: "Operations",
      hasAvatar: false,
      account: "admin@sentinel.cn",
      password: "123456",
    },
    {
      id: "auth-family-admin",
      tenantId: "tenant-family",
      name: "Li Meng",
      email: "family-admin@sentinel.local",
      role: "family_admin",
      status: "active",
      dept: "Household Admin",
      hasAvatar: false,
      account: "family-admin",
      password: "123456",
    },
    {
      id: "auth-admin",
      tenantId: "tenant-biz",
      name: "Admin Demo",
      email: "admin@enterprise.local",
      role: "admin",
      status: "active",
      dept: "Security",
      hasAvatar: false,
      account: "admin",
      password: "123456",
    },
    {
      id: "auth-sysadmin",
      tenantId: "tenant-core",
      name: "SysAdmin Demo",
      email: "sysadmin@sentinel.local",
      role: "sysadmin",
      status: "active",
      dept: "Platform",
      hasAvatar: false,
      account: "sysadmin",
      password: "123456",
    },
  ];

  const riskRules: MockRiskRule[] = [
    { id: "rr1", level: 1, keyword: "normal", weight: 10, enabled: true },
    { id: "rr2", level: 2, keyword: "verify", weight: 35, enabled: true },
    { id: "rr3", level: 3, keyword: "transfer", weight: 60, enabled: true },
    { id: "rr4", level: 4, keyword: "authority", weight: 82, enabled: true },
    { id: "rr5", level: 5, keyword: "deepfake", weight: 96, enabled: true },
  ];

  const voiceSamples: MockVoiceSample[] = [
    { id: "vs1", name: "caller_synth_01.wav", size: 178432, tag: "synth", createdAt: displayTime() },
    { id: "vs2", name: "caller_human_01.wav", size: 212304, tag: "human", createdAt: displayTime() },
  ];

  return {
    authUsers,
    blacklist: deepCopy(SEED.blacklist),
    whitelist: deepCopy(SEED.whitelist),
    knowledge: deepCopy(SEED.knowledge),
    rules: deepCopy(SEED.rules),
    samples: deepCopy(SEED.samples),
    recordings: deepCopy(SEED.recordings),
    managedUsers: deepCopy(SEED.managedUsers),
    appeals: deepCopy(SEED.appeals),
    callLogs: deepCopy(SEED.callLogs),
    devices: deepCopy(SEED.devices),
    audit: deepCopy(SEED.audit),
    voiceModels: deepCopy(SEED.voiceModels),
    voiceSamples,
    emergencyContacts: [
      { id: "ec1", userId: "auth-family", name: "Parent", phone: "13900112233", relation: "family", createdAt: displayTime() },
      { id: "ec2", userId: "auth-family", name: "Sibling", phone: "13755556666", relation: "family", createdAt: displayTime() },
    ],
    sessions: [
      {
        token: "mock-access:auth-family:seed",
        userId: "auth-family",
        deviceLabel: "Demo iPhone",
        ip: "192.168.1.12",
        userAgent: "Mozilla/5.0",
        createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
        lastSeenAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(),
        current: false,
      },
    ],
    credentials: [],
    identityModes: [],
    familyPermissions: [],
    bizPermissions: [],
    adminApplications: [],
    riskLevelState: { activeLevel: 3 },
    riskRules,
    agentDisplayWords: [
      "AI synth suspected",
      "Origin mismatch",
      "Transfer request",
      "Authority impersonation",
      "Credential harvesting",
    ],
    agentWhisper: {
      model: "large-v3",
      language: "zh",
      vadFilter: true,
      beamSize: 5,
      temperature: 0,
    },
    agentQwen: {
      model: "qwen-max",
      endpoint: "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation",
      apiKey: "sk-demo",
      temperature: 0.2,
      topP: 0.9,
      maxTokens: 1024,
      systemPrompt: "You are a telecom anti-fraud analyst.",
    },
    recordingPolicy: { tenantId: "tenant-demo", uploadEnabled: true },
    avatars: {},
    defcon: 2,
  };
}

function deepCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

async function parseBody(body: BodyInit | null | undefined) {
  if (!body) return undefined;
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  }
  return body;
}

async function fileToDataUrl(file: File) {
  if (typeof FileReader === "undefined") return "";
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("file read failed"));
    reader.readAsDataURL(file);
  });
}

function asArray<T>(value: unknown) {
  return Array.isArray(value) ? (value as T[]) : [];
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function nextId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function displayDate() {
  return new Date().toISOString().slice(0, 10);
}

function displayTime() {
  return new Date().toISOString().slice(0, 16).replace("T", " ");
}

function humanSize(size: number) {
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  if (size >= 1024) return `${Math.round(size / 1024)} KB`;
  return `${size} B`;
}

function csvRow(parts: Array<string | number>) {
  return parts
    .map((part) => `"${String(part).replace(/"/g, '""')}"`)
    .join(",");
}

function objectUrl(type: string, content: string) {
  if (typeof window === "undefined" || typeof URL === "undefined") return "";
  const blob = new Blob([content], { type });
  return URL.createObjectURL(blob);
}
