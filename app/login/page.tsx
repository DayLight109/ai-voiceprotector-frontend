"use client";
import { useState } from "react";
import Link from "next/link";
import { Mail, Lock, Building2, Home, Fingerprint, Smartphone, Eye, EyeOff, ArrowRight } from "lucide-react";
import AuthShell from "@/components/AuthShell";

type Role = "enterprise" | "family";

export default function LoginPage() {
  const [role, setRole] = useState<Role>("family");
  const [show, setShow] = useState(false);

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
      <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-canvas-2 border border-border mb-6">
        {[
          { k: "family", label: "家庭用户", icon: Home },
          { k: "enterprise", label: "企业用户", icon: Building2 },
        ].map((r) => {
          const active = role === r.k;
          return (
            <button
              key={r.k}
              onClick={() => setRole(r.k as Role)}
              className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-[14px] transition-all"
              style={{
                background: active ? "var(--surface)" : "transparent",
                color: active ? "var(--ink)" : "var(--ink-soft)",
                boxShadow: active ? "var(--shadow-sm)" : "none",
              }}
            >
              <r.icon size={16} />
              {r.label}
            </button>
          );
        })}
      </div>

      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        {/* 账号 */}
        <div>
          <label className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold">
            {content.account}
          </label>
          <div className="relative mt-2">
            <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input
              type="text"
              placeholder={content.acctPlaceholder}
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-surface border border-border font-body text-[14px] font-medium placeholder:text-ink-ghost focus:outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/20 transition-all"
            />
          </div>
        </div>

        {/* 密码 */}
        <div>
          <div className="flex items-center justify-between">
            <label className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold">
              密码
            </label>
            <Link href="/forgot" className="font-mono text-[10px] uppercase tracking-[0.14em] text-indigo-deep font-bold hover:underline">
              忘记密码?
            </Link>
          </div>
          <div className="relative mt-2">
            <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input
              type={show ? "text" : "password"}
              placeholder="••••••••"
              className="w-full pl-11 pr-12 py-3.5 rounded-2xl bg-surface border border-border font-body text-[14px] font-medium placeholder:text-ink-ghost focus:outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/20 transition-all"
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

        {/* 记住我 */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 rounded border-border accent-indigo" defaultChecked />
          <span className="text-[13px] font-medium text-ink-2">在这台设备上保持登录</span>
        </label>

        {/* 主按钮 */}
        <button
          type="submit"
          className="btn-indigo w-full justify-center py-3.5 text-[14px]"
          style={{ width: "100%" }}
        >
          登录 SENTINEL
          <ArrowRight size={16} />
        </button>

        {/* 分隔线 */}
        <div className="flex items-center gap-3 py-2">
          <div className="flex-1 h-px bg-border" />
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold">或使用</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* 第三方 */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            className="flex items-center justify-center gap-2 py-3 rounded-2xl border border-border bg-surface font-semibold text-[13px] hover:bg-canvas-2 transition-colors"
          >
            <Fingerprint size={16} style={{ color: "var(--mint-deep)" }} />
            指纹登录
          </button>
          <button
            type="button"
            className="flex items-center justify-center gap-2 py-3 rounded-2xl border border-border bg-surface font-semibold text-[13px] hover:bg-canvas-2 transition-colors"
          >
            <Smartphone size={16} style={{ color: "var(--indigo-deep)" }} />
            短信验证
          </button>
        </div>

        {/* 注册入口 */}
        <div className="pt-4 text-center text-[13px] text-ink-soft font-medium">
          还没有账号？
          <Link href="/register" className="ml-1 text-indigo-deep font-bold hover:underline">
            立即注册
          </Link>
        </div>

        <div className="pt-2 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-ink-ghost font-bold">
          登录即代表同意《服务协议》与《隐私政策》
        </div>
      </form>
    </AuthShell>
  );
}
