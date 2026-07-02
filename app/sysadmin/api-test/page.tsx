"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Database,
  FileJson,
  Filter,
  FlaskConical,
  Lock,
  Play,
  RefreshCw,
  Search,
  ShieldCheck,
  SkipForward,
  TerminalSquare,
  XCircle,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/shared/PageHeader";
import { SYSADMIN_NAV } from "@/lib/nav";
import { getAccessToken } from "@/lib/api";

const API =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) ||
  "http://localhost:8080";

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type RunMode = "safe" | "mutation" | "upload" | "stream" | "manual";
type ResultState = "idle" | "running" | "pass" | "fail" | "skip";

type ApiCase = {
  id: string;
  group: string;
  title: string;
  method: Method;
  path: string;
  mode: RunMode;
  expected: number[];
  body?: unknown;
  note?: string;
};

type ApiResult = {
  state: ResultState;
  status?: number;
  latencyMs?: number;
  message: string;
  body?: string;
  at?: string;
};

const GROUPS = [
  "Auth",
  "Me",
  "Analyze",
  "Realtime",
  "Blacklist",
  "Whitelist",
  "Knowledge",
  "Rules",
  "Risk",
  "Samples",
  "Voice",
  "Agents",
  "Recordings",
  "Calls",
  "Users",
  "Appeals",
  "AdminApply",
  "Permissions",
  "Devices",
  "Audit",
  "Dashboard",
  "Ops",
] as const;

const CASES: ApiCase[] = [
  tc("Auth", "GET", "/api/v1/health", "Gateway health", "safe", [200, 503]),
  tc("Auth", "POST", "/api/v1/auth/login", "Login", "manual", [200, 400, 401], { account: "demo", password: "change-me" }, "会签发新会话，默认不自动跑"),
  tc("Auth", "POST", "/api/v1/auth/register", "Register", "mutation", [201, 400, 409], { name: "API Test", phone: "13900000000", password: "Passw0rd!", role: "family" }),
  tc("Auth", "POST", "/api/v1/auth/refresh", "Refresh token", "manual", [200, 400, 401]),
  tc("Auth", "POST", "/api/v1/auth/logout", "Logout", "manual", [200]),

  tc("Me", "GET", "/api/v1/me", "Current user", "safe", [200]),
  tc("Me", "PUT", "/api/v1/me", "Update profile", "mutation", [200, 400], { name: "API Test User" }),
  tc("Me", "PUT", "/api/v1/me/password", "Change password", "mutation", [200, 400, 401], { oldPassword: "old-pass", newPassword: "NewPassw0rd!" }),
  tc("Me", "GET", "/api/v1/me/sessions", "List sessions", "safe", [200]),
  tc("Me", "DELETE", "/api/v1/me/sessions/others", "Revoke other sessions", "mutation", [200]),
  tc("Me", "DELETE", "/api/v1/me/sessions/{token}", "Revoke session", "manual", [204, 404]),
  tc("Me", "GET", "/api/v1/me/avatar", "Get avatar", "safe", [200, 404]),
  tc("Me", "PUT", "/api/v1/me/avatar", "Upload avatar", "upload", [200, 400, 502], undefined, "multipart: file"),
  tc("Me", "DELETE", "/api/v1/me/avatar", "Delete avatar", "mutation", [200, 204, 404]),
  tc("Me", "GET", "/api/v1/me/credentials", "List credentials", "safe", [200]),
  tc("Me", "POST", "/api/v1/me/credentials/{kind}", "Submit credential", "mutation", [201, 400], { value: "110101199001010011" }),
  tc("Me", "DELETE", "/api/v1/me/credentials/{kind}", "Delete credential", "mutation", [204, 500]),
  tc("Me", "POST", "/api/v1/me/credentials/{kind}/upload", "Upload credential photo", "upload", [201, 400], undefined, "multipart: slot + file"),
  tc("Me", "DELETE", "/api/v1/me/credentials/{kind}/photos/{slot}", "Delete credential photo", "mutation", [204, 404]),
  tc("Me", "GET", "/api/v1/me/identity-modes", "Identity modes", "safe", [200]),
  tc("Me", "PATCH", "/api/v1/me/identity-modes", "Patch identity modes", "mutation", [200, 400], { items: [{ key: "identity.id_card", enabled: true }] }),
  tc("Me", "GET", "/api/v1/me/emergency-contacts", "Emergency contacts", "safe", [200]),
  tc("Me", "POST", "/api/v1/me/emergency-contacts", "Create emergency contact", "mutation", [201, 400, 409], { name: "紧急联系人", phone: "13800000000", relation: "family" }),
  tc("Me", "PUT", "/api/v1/me/emergency-contacts/{id}", "Update emergency contact", "manual", [200, 400, 404], { name: "紧急联系人", phone: "13800000000", relation: "family" }),
  tc("Me", "DELETE", "/api/v1/me/emergency-contacts/{id}", "Delete emergency contact", "manual", [204, 404]),

  tc("Analyze", "POST", "/api/v1/analyze", "Run AI analyze", "mutation", [200, 400, 502], {
    callId: "api-test-call",
    shownNumber: "+8613800000000",
    signalOriginCC: "CN",
    audioSeconds: 12,
    audioKey: "recordings/demo.wav",
    transcriptHint: "我是公安局的，你的账户涉嫌洗钱。",
  }),

  tc("Realtime", "GET", "/api/v1/stats", "Stats", "safe", [200]),
  tc("Realtime", "GET", "/api/v1/defcon", "Get DEFCON", "safe", [200]),
  tc("Realtime", "POST", "/api/v1/defcon", "Set DEFCON", "mutation", [200, 400, 403], { level: 3 }),
  tc("Realtime", "GET", "/api/v1/feed", "Feed recent", "safe", [200]),
  tc("Realtime", "GET", "/api/v1/feed/stream", "Feed stream", "stream", [200]),
  tc("Realtime", "GET", "/api/v1/threats", "Threats", "safe", [200]),
  tc("Realtime", "GET", "/api/v1/warroom/overview", "Warroom overview", "safe", [200]),

  crud("Blacklist", "/api/v1/blacklist", { number: "13900000000", reason: "api-test", category: "其他", risk: 30, source: "手动" }),
  tc("Blacklist", "GET", "/api/v1/blacklist/export", "Export blacklist CSV", "safe", [200]),
  tc("Blacklist", "POST", "/api/v1/blacklist/import", "Import blacklist JSON", "mutation", [200, 400], [{ number: "13900000001", category: "其他", risk: 20, source: "手动" }]),
  tc("Blacklist", "POST", "/api/v1/blacklist/{id}/dispatch", "Dispatch blacklist entry", "manual", [200, 404, 409]),

  crud("Whitelist", "/api/v1/whitelist", { number: "13800000000", name: "可信联系人", relation: "family" }),
  crud("Knowledge", "/api/v1/knowledge", { title: "API Test", category: "AI合成", summary: "test", body: "test", status: "draft" }),
  crud("Rules", "/api/v1/scam-rules", { category: "公检法冒充", keyword: "安全账户", weight: 80, enabled: true }),

  tc("Risk", "GET", "/api/v1/risk-level/state", "Risk state", "safe", [200]),
  tc("Risk", "PUT", "/api/v1/risk-level/state", "Set risk state", "mutation", [200, 400], { activeLevel: 2 }),
  tc("Risk", "GET", "/api/v1/risk-level/rules?pageSize=1", "Risk rules", "safe", [200]),
  tc("Risk", "POST", "/api/v1/risk-level/rules", "Create risk rule", "mutation", [201, 400], { level: 2, keyword: "转账", weight: 50, enabled: true }),
  tc("Risk", "PUT", "/api/v1/risk-level/rules/{id}", "Update risk rule", "manual", [200, 400, 404], { level: 2, keyword: "转账", weight: 50, enabled: true }),
  tc("Risk", "DELETE", "/api/v1/risk-level/rules/{id}", "Delete risk rule", "manual", [204, 404]),

  tc("Samples", "GET", "/api/v1/samples?pageSize=1", "Samples", "safe", [200]),
  tc("Samples", "GET", "/api/v1/samples/{id}", "Get sample", "manual", [200, 404]),
  tc("Samples", "POST", "/api/v1/samples/{id}/analyze", "Analyze sample", "manual", [200, 404, 502]),
  tc("Samples", "POST", "/api/v1/samples/{id}/reject", "Reject sample", "manual", [200, 404]),
  tc("Samples", "GET", "/api/v1/samples/{id}/export-doc", "Export sample doc", "manual", [200, 404]),

  tc("Voice", "GET", "/api/v1/voice-models?pageSize=1", "Voice models", "safe", [200]),
  tc("Voice", "POST", "/api/v1/voice-models", "Upload voice model", "upload", [201, 400, 502], undefined, "multipart: file + version + accuracy"),
  tc("Voice", "POST", "/api/v1/voice-models/{id}/activate", "Activate voice model", "manual", [200, 404]),
  tc("Voice", "DELETE", "/api/v1/voice-models/{id}", "Delete voice model", "manual", [204, 404]),
  tc("Voice", "GET", "/api/v1/voice-samples?pageSize=1", "Voice samples", "safe", [200]),
  tc("Voice", "POST", "/api/v1/voice-samples", "Upload voice sample", "upload", [201, 400, 502], undefined, "multipart: file + tag"),
  tc("Voice", "DELETE", "/api/v1/voice-samples/{id}", "Delete voice sample", "manual", [204, 404]),

  tc("Agents", "GET", "/api/v1/agents/display-words", "Display words config", "safe", [200]),
  tc("Agents", "PUT", "/api/v1/agents/display-words", "Set display words", "mutation", [200, 400], { value: { blocked: ["拦截"] } }),
  tc("Agents", "GET", "/api/v1/agents/whisper", "Whisper config", "safe", [200]),
  tc("Agents", "PUT", "/api/v1/agents/whisper", "Set whisper config", "mutation", [200, 400], { value: { provider: "local" } }),
  tc("Agents", "GET", "/api/v1/agents/qwen", "Qwen config", "safe", [200]),
  tc("Agents", "PUT", "/api/v1/agents/qwen", "Set qwen config", "mutation", [200, 400], { value: { model: "qwen-max", temperature: 0.2 } }),

  tc("Recordings", "GET", "/api/v1/recordings?pageSize=1", "Recordings", "safe", [200]),
  tc("Recordings", "POST", "/api/v1/recordings", "Upload recording", "upload", [201, 400, 403, 502], undefined, "multipart: file + phone + duration + verdict"),
  tc("Recordings", "GET", "/api/v1/recordings/policy", "Recording policy", "safe", [200]),
  tc("Recordings", "PUT", "/api/v1/recordings/policy", "Set recording policy", "mutation", [200, 400, 403], { uploadEnabled: true }),
  tc("Recordings", "GET", "/api/v1/recordings/{id}/download", "Download recording", "manual", [200, 403, 404, 502]),
  tc("Recordings", "DELETE", "/api/v1/recordings/{id}", "Delete recording", "manual", [204, 403, 404]),

  tc("Calls", "GET", "/api/v1/calls?pageSize=1", "Calls", "safe", [200]),
  tc("Calls", "GET", "/api/v1/calls/{id}", "Get call", "manual", [200, 404]),

  crud("Users", "/api/v1/users", { name: "API Test User", phone: "13700000000", password: "Passw0rd!", role: "family", status: "active" }),

  tc("Appeals", "GET", "/api/v1/appeals?pageSize=1", "Appeals", "safe", [200]),
  tc("Appeals", "POST", "/api/v1/appeals", "Create appeal", "mutation", [201, 400], { type: "号码举报", number: "13900000000", reason: "api-test", scope: "cloud" }),
  tc("Appeals", "PUT", "/api/v1/appeals/{id}/status", "Review appeal", "manual", [200, 400, 404], { status: "已驳回" }),

  tc("AdminApply", "GET", "/api/v1/admin-apply?pageSize=1", "Admin applications", "safe", [200]),
  tc("AdminApply", "GET", "/api/v1/admin-apply/status", "My admin application status", "safe", [200, 404]),
  tc("AdminApply", "POST", "/api/v1/admin-apply", "Submit admin application", "mutation", [201, 400, 409], { scope: "family", reason: "api-test", contact: "13800000000" }),
  tc("AdminApply", "DELETE", "/api/v1/admin-apply/mine", "Withdraw admin application", "mutation", [204, 404]),
  tc("AdminApply", "PUT", "/api/v1/admin-apply/{id}/review", "Review admin application", "manual", [200, 400, 404], { status: "rejected" }),

  tc("Permissions", "GET", "/api/v1/permissions/family", "Family permissions", "safe", [200]),
  tc("Permissions", "PUT", "/api/v1/permissions/family", "Set family permissions", "mutation", [200, 400, 403, 404], { targetUserId: "__target_user_id__", items: [{ key: "family.blacklist", enabled: true }] }),
  tc("Permissions", "GET", "/api/v1/permissions/biz", "Biz permissions", "safe", [200]),
  tc("Permissions", "PUT", "/api/v1/permissions/biz", "Set biz permissions", "mutation", [200, 400, 403, 404], { targetUserId: "__target_user_id__", items: [{ key: "biz.calls", enabled: true }] }),

  tc("Devices", "GET", "/api/v1/devices?pageSize=1", "Devices", "safe", [200]),
  tc("Devices", "POST", "/api/v1/devices", "Create device", "mutation", [201, 400], { name: "API Test Device", type: "family", status: "offline", version: "0.0.1", contact: "api-test" }),
  tc("Devices", "PUT", "/api/v1/devices/{id}", "Update device", "manual", [200, 400, 404], { name: "API Test Device", type: "family", status: "offline", version: "0.0.1", contact: "api-test" }),
  tc("Devices", "DELETE", "/api/v1/devices/{id}", "Delete device", "manual", [204, 404]),
  tc("Devices", "GET", "/api/v1/devices/audit?pageSize=1", "Device audit", "safe", [200, 403]),

  tc("Audit", "GET", "/api/v1/audit?pageSize=1", "Audit logs", "safe", [200, 403]),
  tc("Dashboard", "GET", "/api/v1/dashboard/risk-index", "Risk index", "safe", [200]),
  tc("Dashboard", "GET", "/api/v1/dashboard/regions", "Dashboard regions", "safe", [200]),
  tc("Dashboard", "GET", "/api/v1/dashboard/events?limit=5", "Dashboard events", "safe", [200]),

  tc("Ops", "GET", "/api/v1/ops/ping", "Ops ping", "safe", [200, 403]),
  tc("Ops", "GET", "/api/v1/ops/health", "Ops health", "safe", [200, 403]),
  tc("Ops", "GET", "/api/v1/ops/series", "Ops series", "safe", [200, 403]),
  tc("Ops", "GET", "/api/v1/ops/info", "Ops info", "safe", [200, 403]),
].flat();

function tc(
  group: string,
  method: Method,
  path: string,
  title: string,
  mode: RunMode,
  expected: number[],
  body?: unknown,
  note?: string,
): ApiCase {
  const id = `${method} ${path}`;
  return { id, group, method, path, title, mode, expected, body, note };
}

function crud(group: string, base: string, body: unknown): ApiCase[] {
  return [
    tc(group, "GET", `${base}?pageSize=1`, `${group} list`, "safe", [200]),
    tc(group, "GET", `${base}/{id}`, `${group} get`, "manual", [200, 404]),
    tc(group, "POST", base, `${group} create`, "mutation", [200, 201, 400, 403, 409], body),
    tc(group, "PUT", `${base}/{id}`, `${group} update`, "manual", [200, 400, 403, 404], body),
    tc(group, "DELETE", `${base}/{id}`, `${group} delete`, "manual", [204, 403, 404]),
  ];
}

function resolvePath(path: string): string {
  return path
    .replaceAll("{id}", "__missing_id__")
    .replaceAll("{token}", "__missing_token__")
    .replaceAll("{kind}", "id_card")
    .replaceAll("{slot}", "face");
}

function pretty(value: unknown): string {
  if (value === undefined) return "";
  return JSON.stringify(value, null, 2);
}

function methodColor(method: Method) {
  switch (method) {
    case "GET":
      return "var(--mint-deep)";
    case "POST":
      return "var(--indigo)";
    case "PUT":
    case "PATCH":
      return "var(--amber-deep)";
    case "DELETE":
      return "var(--coral)";
  }
}

export default function ApiTestPanelPage() {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<string>("ALL");
  const [mode, setMode] = useState<RunMode | "ALL">("ALL");
  const [selectedId, setSelectedId] = useState(CASES[0]?.id ?? "");
  const [draftPath, setDraftPath] = useState(resolvePath(CASES[0]?.path ?? ""));
  const [draftBody, setDraftBody] = useState(pretty(CASES[0]?.body));
  const [results, setResults] = useState<Record<string, ApiResult>>({});
  const [running, setRunning] = useState(false);

  const selected = CASES.find((c) => c.id === selectedId) ?? CASES[0];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CASES.filter((c) => {
      if (group !== "ALL" && c.group !== group) return false;
      if (mode !== "ALL" && c.mode !== mode) return false;
      if (!q) return true;
      return (
        c.title.toLowerCase().includes(q) ||
        c.path.toLowerCase().includes(q) ||
        c.method.toLowerCase().includes(q) ||
        c.group.toLowerCase().includes(q)
      );
    });
  }, [group, mode, query]);

  const stats = useMemo(() => {
    const values = Object.values(results);
    return {
      total: CASES.length,
      safe: CASES.filter((c) => c.mode === "safe" || c.mode === "stream").length,
      pass: values.filter((r) => r.state === "pass").length,
      fail: values.filter((r) => r.state === "fail").length,
      skip: values.filter((r) => r.state === "skip").length,
    };
  }, [results]);

  const selectCase = useCallback((c: ApiCase) => {
    setSelectedId(c.id);
    setDraftPath(resolvePath(c.path));
    setDraftBody(pretty(c.body));
  }, []);

  const setResult = useCallback((id: string, result: ApiResult) => {
    setResults((prev) => ({ ...prev, [id]: result }));
  }, []);

  const runCase = useCallback(
    async (c: ApiCase, override?: { path?: string; body?: string }) => {
      if (c.mode === "upload") {
        setResult(c.id, {
          state: "skip",
          message: "multipart 用例需要真实文件，先在面板中登记，暂不自动执行。",
          at: new Date().toLocaleTimeString(),
        });
        return;
      }

      const path = override?.path ?? resolvePath(c.path);
      let bodyText = override?.body ?? pretty(c.body);
      let parsedBody: unknown = undefined;
      if (bodyText.trim()) {
        try {
          parsedBody = JSON.parse(bodyText);
        } catch {
          setResult(c.id, {
            state: "fail",
            message: "请求体不是合法 JSON",
            at: new Date().toLocaleTimeString(),
          });
          return;
        }
      }

      const ctrl = new AbortController();
      const timeout = window.setTimeout(() => ctrl.abort(), c.mode === "stream" ? 1800 : 12000);
      const start = performance.now();
      setResult(c.id, { state: "running", message: "running" });
      try {
        const headers: Record<string, string> = {};
        const token = getAccessToken();
        if (token) headers.Authorization = `Bearer ${token}`;
        if (parsedBody !== undefined) headers["Content-Type"] = "application/json";

        const resp = await fetch(`${API}${path}`, {
          method: c.method,
          headers,
          credentials: "include",
          cache: "no-store",
          signal: ctrl.signal,
          body: parsedBody === undefined ? undefined : JSON.stringify(parsedBody),
        });
        if (c.mode === "stream") {
          await resp.body?.cancel();
        }
        const text = c.mode === "stream" ? "" : await resp.text();
        const latencyMs = Math.round(performance.now() - start);
        const ok = c.expected.includes(resp.status);
        setResult(c.id, {
          state: ok ? "pass" : "fail",
          status: resp.status,
          latencyMs,
          message: ok ? "状态码符合预期" : `预期 ${c.expected.join(" / ")}，实际 ${resp.status}`,
          body: text.slice(0, 1800),
          at: new Date().toLocaleTimeString(),
        });
      } catch (e) {
        const isAbort = (e as { name?: string })?.name === "AbortError";
        setResult(c.id, {
          state: isAbort && c.mode === "stream" ? "pass" : "fail",
          latencyMs: Math.round(performance.now() - start),
          message: isAbort && c.mode === "stream" ? "SSE 握手后按测试窗口关闭" : String((e as Error)?.message ?? e),
          at: new Date().toLocaleTimeString(),
        });
      } finally {
        window.clearTimeout(timeout);
      }
    },
    [setResult],
  );

  const runSafe = useCallback(async () => {
    setRunning(true);
    for (const c of CASES.filter((x) => x.mode === "safe" || x.mode === "stream")) {
      await runCase(c);
    }
    setRunning(false);
  }, [runCase]);

  const runVisibleSafe = useCallback(async () => {
    setRunning(true);
    for (const c of filtered.filter((x) => x.mode === "safe" || x.mode === "stream")) {
      await runCase(c);
    }
    setRunning(false);
  }, [filtered, runCase]);

  const runSelected = useCallback(async () => {
    if (!selected) return;
    setRunning(true);
    await runCase(selected, { path: draftPath, body: draftBody });
    setRunning(false);
  }, [draftBody, draftPath, runCase, selected]);

  const clearResults = useCallback(() => setResults({}), []);

  return (
    <AppShell role="sysadmin" nav={SYSADMIN_NAV} breadcrumb={["SENTINEL", "系统管理员", "API 测试面板"]}>
      <PageHeader
        eyebrow="INTERNAL API TEST PANEL"
        title="后端接口测试面板"
        desc="隐藏入口，仅系统管理员可访问。默认只运行只读探测，写操作需选中后手动执行。"
        actions={
          <div className="flex flex-wrap gap-2">
            <button onClick={runSafe} disabled={running} className="btn-indigo py-2.5 px-4 text-[calc(13px*var(--fz))]">
              {running ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
              运行只读 smoke
            </button>
            <button onClick={clearResults} disabled={running} className="btn-ghost py-2.5 px-4 text-[calc(13px*var(--fz))]">
              <SkipForward size={14} />
              清空结果
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Stat icon={ClipboardList} label="接口用例" value={stats.total} color="var(--indigo)" />
        <Stat icon={ShieldCheck} label="默认可跑" value={stats.safe} color="var(--mint-deep)" />
        <Stat icon={CheckCircle2} label="通过" value={stats.pass} color="var(--mint-deep)" />
        <Stat icon={XCircle} label="失败" value={stats.fail} color="var(--coral)" />
        <Stat icon={AlertTriangle} label="跳过" value={stats.skip} color="var(--amber-deep)" />
      </div>

      <div className="grid grid-cols-12 gap-5">
        <section className="col-span-12 xl:col-span-7 panel p-5">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
            <div className="flex-1 min-w-0 search-pill flex items-center gap-2 px-3 py-2 rounded-full bg-canvas-2 border border-border">
              <Search size={14} className="text-ink-soft" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索接口、路径、模块..."
                className="flex-1 min-w-0 bg-transparent text-[calc(13px*var(--fz))] font-medium focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-ink-soft" />
              <select value={group} onChange={(e) => setGroup(e.target.value)} className="input-like h-10 px-3 rounded-xl bg-surface border border-border text-[calc(12px*var(--fz))] font-bold">
                <option value="ALL">全部模块</option>
                {GROUPS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              <select value={mode} onChange={(e) => setMode(e.target.value as RunMode | "ALL")} className="input-like h-10 px-3 rounded-xl bg-surface border border-border text-[calc(12px*var(--fz))] font-bold">
                <option value="ALL">全部类型</option>
                <option value="safe">只读</option>
                <option value="stream">SSE</option>
                <option value="mutation">写操作</option>
                <option value="upload">上传</option>
                <option value="manual">手动</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between mb-3">
            <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">
              {filtered.length} CASES
            </div>
            <button onClick={runVisibleSafe} disabled={running} className="text-[calc(12px*var(--fz))] font-bold text-indigo-deep hover:underline">
              运行当前筛选里的只读用例
            </button>
          </div>

          <div className="space-y-2 max-h-[680px] overflow-y-auto pr-1">
            {filtered.map((c) => {
              const r = results[c.id];
              const active = c.id === selectedId;
              return (
                <button
                  key={c.id}
                  onClick={() => selectCase(c)}
                  className="w-full text-left panel panel-lift p-3 flex items-center gap-3"
                  style={{ outline: active ? "2px solid var(--indigo)" : "none" }}
                >
                  <StatusDot state={r?.state ?? "idle"} />
                  <div className="w-16 shrink-0 font-mono text-[calc(11px*var(--fz))] font-extrabold" style={{ color: methodColor(c.method) }}>
                    {c.method}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-[calc(13px*var(--fz))] font-extrabold truncate">{c.title}</span>
                      <ModePill mode={c.mode} />
                    </div>
                    <div className="mt-0.5 font-mono text-[calc(10px*var(--fz))] text-ink-soft truncate">{c.path}</div>
                  </div>
                  <div className="hidden md:block text-right">
                    <div className="font-mono text-[calc(10px*var(--fz))] text-ink-soft font-bold">{c.group}</div>
                    {r?.status && <div className="font-mono text-[calc(11px*var(--fz))] font-extrabold">{r.status}</div>}
                  </div>
                  <ChevronRight size={14} className="text-ink-soft" />
                </button>
              );
            })}
          </div>
        </section>

        <section className="col-span-12 xl:col-span-5 space-y-5">
          <div className="panel p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">{selected?.group}</div>
                <h2 className="font-display text-[calc(22px*var(--fz))] font-extrabold mt-1">{selected?.title}</h2>
              </div>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: "var(--indigo-soft)", color: "var(--indigo-deep)" }}>
                {selected?.mode === "mutation" ? <Database size={18} /> : selected?.mode === "upload" ? <FileJson size={18} /> : <TerminalSquare size={18} />}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <Mini label="Method" value={selected?.method ?? ""} />
              <Mini label="Expected" value={selected?.expected.join(" / ") ?? ""} />
            </div>

            {selected?.note && (
              <div className="mb-4 rounded-2xl border border-border bg-canvas-2 p-3 flex gap-2 text-[calc(12px*var(--fz))] text-ink-soft font-semibold">
                <Lock size={14} className="shrink-0 mt-0.5" />
                <span>{selected.note}</span>
              </div>
            )}

            <label className="block mb-3">
              <span className="block mb-1 font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">Path</span>
              <input
                value={draftPath}
                onChange={(e) => setDraftPath(e.target.value)}
                className="w-full rounded-xl border border-border bg-canvas-2 px-3 py-2 font-mono text-[calc(12px*var(--fz))] focus:outline-none focus:ring-2 focus:ring-indigo/20"
              />
            </label>

            <label className="block mb-4">
              <span className="block mb-1 font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">JSON Body</span>
              <textarea
                value={draftBody}
                onChange={(e) => setDraftBody(e.target.value)}
                rows={10}
                placeholder="GET / DELETE 通常留空"
                className="w-full resize-y rounded-xl border border-border bg-canvas-2 px-3 py-2 font-mono text-[calc(12px*var(--fz))] leading-5 focus:outline-none focus:ring-2 focus:ring-indigo/20"
              />
            </label>

            <button onClick={runSelected} disabled={running} className="btn-indigo w-full py-3 text-[calc(13px*var(--fz))]">
              {running ? <RefreshCw size={15} className="animate-spin" /> : <Play size={15} />}
              运行当前用例
            </button>
          </div>

          <ResultPanel result={results[selectedId]} />
        </section>
      </div>
    </AppShell>
  );
}

function Stat({ icon: Icon, label, value, color }: { icon: typeof Activity; label: string; value: number; color: string }) {
  return (
    <div className="panel panel-lift p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "var(--canvas-2)", color }}>
        <Icon size={17} />
      </div>
      <div>
        <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">{label}</div>
        <div className="numplate text-[calc(26px*var(--fz))] leading-none mt-1">{value}</div>
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-canvas-2 border border-border p-3">
      <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">{label}</div>
      <div className="mt-1 font-mono text-[calc(13px*var(--fz))] font-extrabold truncate">{value}</div>
    </div>
  );
}

function StatusDot({ state }: { state: ResultState }) {
  const color =
    state === "pass"
      ? "var(--mint-deep)"
      : state === "fail"
      ? "var(--coral)"
      : state === "running"
      ? "var(--indigo)"
      : state === "skip"
      ? "var(--amber-deep)"
      : "var(--border)";
  return <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />;
}

function ModePill({ mode }: { mode: RunMode }) {
  const label: Record<RunMode, string> = {
    safe: "只读",
    mutation: "写",
    upload: "上传",
    stream: "SSE",
    manual: "手动",
  };
  return (
    <span className="shrink-0 rounded-full bg-canvas-2 border border-border px-2 py-0.5 font-mono text-[calc(9px*var(--fz))] uppercase tracking-[0.12em] text-ink-soft font-bold">
      {label[mode]}
    </span>
  );
}

function ResultPanel({ result }: { result?: ApiResult }) {
  if (!result) {
    return (
      <div className="panel p-5">
        <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">RESULT</div>
        <div className="mt-4 rounded-2xl bg-canvas-2 border border-border p-5 text-[calc(13px*var(--fz))] text-ink-soft font-semibold">
          选择接口并运行后，这里会显示状态码、耗时和响应摘要。
        </div>
      </div>
    );
  }

  const Icon = result.state === "pass" ? CheckCircle2 : result.state === "fail" ? XCircle : result.state === "skip" ? AlertTriangle : RefreshCw;
  const color =
    result.state === "pass"
      ? "var(--mint-deep)"
      : result.state === "fail"
      ? "var(--coral)"
      : result.state === "skip"
      ? "var(--amber-deep)"
      : "var(--indigo)";

  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">RESULT</div>
        <div className="flex items-center gap-2 font-mono text-[calc(11px*var(--fz))] font-extrabold" style={{ color }}>
          <Icon size={14} className={result.state === "running" ? "animate-spin" : ""} />
          {result.state.toUpperCase()}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Mini label="Status" value={result.status ? String(result.status) : "-"} />
        <Mini label="Latency" value={result.latencyMs ? `${result.latencyMs}ms` : "-"} />
        <Mini label="At" value={result.at ?? "-"} />
      </div>
      <div className="rounded-2xl bg-canvas-2 border border-border p-3 mb-3 text-[calc(13px*var(--fz))] font-semibold">
        {result.message}
      </div>
      {result.body && (
        <pre className="max-h-[360px] overflow-auto rounded-2xl bg-[#10151f] text-[#d8e1f0] p-4 font-mono text-[12px] leading-5 whitespace-pre-wrap">
          {result.body}
        </pre>
      )}
    </div>
  );
}
