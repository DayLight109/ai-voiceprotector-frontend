"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, Building2, Home, Fingerprint, Smartphone, Eye, EyeOff, ArrowRight } from "lucide-react";
import AuthShell from "@/components/AuthShell";
import { useAuth, roleHomePath } from "@/lib/auth";
import { APIError } from "@/lib/api";

type Role = "enterprise" | "family";

export default function LoginPage() {
  const router = useRouter();
  const { login, logout } = useAuth();
  const [role, setRole] = useState<Role>("family");
  const [show, setShow] = useState(false);
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const content = role === "enterprise"
    ? {
        account: "企业账号 / 邮箱",
        acctPlaceholder: "admin@sentinel.cn",
        sideTitle: "企业级反诈中枢，开箱即接入。",
        bullets: [
          "API 对接运营商 / 金融风控，毫秒级判决",
          "集中管理员工账号与策略配置，RBAC 授权",
          "判决证据链加密留存，符合 GB/T 35273 审计",
        ],
      }
    : {
        account: "手机号 / 身份证",
        acctPlaceholder: "138 0013 4921",
        sideTitle: "让每一位家人都活在算法的保护里。",
        bullets: [
          "老人手机一键托管，诈骗来电当场挂断",
          "家属实时同步告警，关心不再错过",
          "端侧推理，不上云、不留音，隐私守在本机",
        ],
      };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!account.trim() || !password) {
      setError("请输入账号和密码");
      return;
    }
    setLoading(true);
    try {
      const user = await login(account.trim(), password);
      const allowed = role === "enterprise"
        ? user.role === "biz" || user.role === "admin"
        : user.role === "family" || user.role === "family_admin";
      if (!allowed) {
        await logout();
        setError("账号或密码错误");
        return;
      }
      router.push(roleHomePath(user.role));
    } catch (e) {
      if (e instanceof APIError) {
        setError(messageForAuthError(e));
      } else {
        setError("网络异常，请稍后再试");
      }
    } finally {
      setLoading(false);
    }
  }

  async function demoLogin(account: string, target: string) {
    setError(null);
    setLoading(true);
    try {
      await login(account, "demo123");
      router.push(target);
    } catch (e) {
      setError(e instanceof APIError ? messageForAuthError(e) : "网络异常，请稍后再试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow={role === "enterprise" ? "ENTERPRISE LOGIN" : "HOUSEHOLD LOGIN"}
      title={role === "enterprise" ? "登录企业控制台" : "欢迎回家"}
      subtitle={role === "enterprise"
        ? "输入企业账户凭证，进入 SENTINEL 管理与策略中枢。"
        : "用手机号或身份证登录，开启家人的声纹守护。"}
      sideTitle={content.sideTitle}
      bullets={content.bullets}
    >
      {/* 角色切换 */}
      <div className="relative grid grid-cols-2 gap-2 p-1 rounded-2xl bg-canvas-2 border border-border mb-6">
        <span
          aria-hidden
          className="pointer-events-none absolute rounded-xl"
          style={{
            top: 4,
            bottom: 4,
            left: 4,
            width: "calc(50% - 8px)",
            background: "var(--surface)",
            boxShadow: "var(--shadow-sm)",
            transform: role === "enterprise" ? "translateX(calc(100% + 8px))" : "translateX(0)",
            transition: "transform 380ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />
        {[
          { k: "family", label: "家庭用户", icon: Home },
          { k: "enterprise", label: "企业用户", icon: Building2 },
        ].map((r) => {
          const active = role === r.k;
          return (
            <button
              key={r.k}
              type="button"
              onClick={() => setRole(r.k as Role)}
              className="relative z-10 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-[calc(14px*var(--fz))]"
              style={{
                color: active ? "var(--ink)" : "var(--ink-soft)",
                transition: "color 320ms cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            >
              <r.icon
                size={16}
                style={{
                  transform: active ? "scale(1.05)" : "scale(1)",
                  transition: "transform 320ms cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
              />
              {r.label}
            </button>
          );
        })}
      </div>

      <form className="space-y-4" onSubmit={onSubmit}>
        {/* 账号 */}
        <div>
          <label className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">
            {content.account}
          </label>
          <div className="relative mt-2">
            <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input
              type="text"
              autoComplete="username"
              placeholder={content.acctPlaceholder}
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-surface border border-border font-body text-[calc(14px*var(--fz))] font-medium placeholder:text-ink-ghost focus:outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/20 transition-all"
            />
          </div>
        </div>

        {/* 密码 */}
        <div>
          <div className="flex items-center justify-between">
            <label className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">
              密码
            </label>
            <Link href="/forgot" className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-indigo-deep font-bold hover:underline">
              忘记密码?
            </Link>
          </div>
          <div className="relative mt-2">
            <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input
              type={show ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-11 pr-12 py-3.5 rounded-2xl bg-surface border border-border font-body text-[calc(14px*var(--fz))] font-medium placeholder:text-ink-ghost focus:outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/20 transition-all"
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-canvas-2 text-ink-soft"
            >
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div
            role="alert"
            className="px-4 py-3 rounded-2xl text-[calc(13px*var(--fz))] font-medium"
            style={{
              background: "var(--coral-soft)",
              color: "var(--coral-deep)",
              border: "1px solid var(--coral)",
            }}
          >
            {error}
          </div>
        )}

        {/* 记住我 */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 rounded border-border accent-indigo" defaultChecked />
          <span className="text-[calc(13px*var(--fz))] font-medium text-ink-2">在这台设备上保持登录</span>
        </label>

        {/* 主按钮 */}
        <button
          type="submit"
          disabled={loading}
          className="btn-indigo w-full justify-center py-3.5 text-[calc(14px*var(--fz))] disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ width: "100%" }}
        >
          {loading ? "登录中…" : "登录 SENTINEL"}
          <ArrowRight size={16} />
        </button>

        {/* 分隔线 */}
        <div className="flex items-center gap-3 py-2">
          <div className="flex-1 h-px bg-border" />
          <span className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">或使用</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* 第三方 */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            className="flex items-center justify-center gap-2 py-3 rounded-2xl border border-border bg-surface font-semibold text-[calc(13px*var(--fz))] hover:bg-canvas-2 transition-colors"
          >
            <Fingerprint size={16} style={{ color: "var(--mint-deep)" }} />
            指纹登录
          </button>
          <button
            type="button"
            className="flex items-center justify-center gap-2 py-3 rounded-2xl border border-border bg-surface font-semibold text-[calc(13px*var(--fz))] hover:bg-canvas-2 transition-colors"
          >
            <Smartphone size={16} style={{ color: "var(--indigo-deep)" }} />
            短信验证
          </button>
        </div>

        {/* 注册入口 */}
        <div className="pt-4 text-center text-[calc(13px*var(--fz))] text-ink-soft font-medium">
          还没有账号？
          <Link href="/register" className="ml-1 text-indigo-deep font-bold hover:underline">
            立即注册
          </Link>
        </div>

        <div className="pt-3">
          <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold text-center mb-2">
            演示直达 · DEMO SHORTCUT
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {[
              { account: "family", href: "/app", label: "家庭用户", color: "var(--coral)" },
              { account: "biz", href: "/biz", label: "企业用户", color: "var(--indigo)" },
              { account: "family-admin", href: "/family-admin", label: "家庭管理员", color: "var(--mint-deep)" },
              { account: "admin", href: "/admin", label: "企业管理员", color: "var(--amber-deep)" },
              { account: "sysadmin", href: "/sysadmin", label: "系统管理员", color: "var(--indigo-deep)" },
            ].map((r) => (
              <button
                key={r.href}
                type="button"
                disabled={loading}
                onClick={() => demoLogin(r.account, r.href)}
                className="px-2 py-2 rounded-xl text-center font-mono text-[calc(10px*var(--fz))] font-extrabold uppercase tracking-[0.06em] hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "var(--canvas-2)", color: r.color, border: "1px solid var(--border)" }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-2 text-center font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-ghost font-bold">
          登录即代表同意《服务协议》与《隐私政策》
        </div>
      </form>
    </AuthShell>
  );
}

function messageForAuthError(e: APIError): string {
  switch (e.code) {
    case "AUTH_INVALID_CREDENTIALS":
      return "账号或密码错误";
    case "AUTH_USER_SUSPENDED":
      return "账号已被停用，请联系管理员";
    case "VALIDATION_FAILED":
      return e.message || "输入校验失败";
    case "RATE_LIMITED":
      return "登录尝试过于频繁，请稍后再试";
    default:
      return e.message || "登录失败，请稍后再试";
  }
}
