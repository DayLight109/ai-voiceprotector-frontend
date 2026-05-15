"use client";
import { useState } from "react";
import { User, Shield, Bell, Palette, Key, Smartphone, LogOut, Home, Users, Settings as SettingsIcon, ChevronRight, CheckCircle2, Fingerprint, ScanFace } from "lucide-react";
import AppShell from "@/components/AppShell";

const NAV = [
  { href: "/app", label: "首页", icon: Home },
  { href: "/family-admin/users", label: "家属同步", icon: Users },
  { href: "/settings", label: "系统设置", icon: SettingsIcon },
];

type TabKey = "profile" | "security" | "notify" | "appearance";

const TABS: { k: TabKey; label: string; icon: any; desc: string }[] = [
  { k: "profile", label: "个人信息", icon: User, desc: "头像、昵称、联系方式" },
  { k: "security", label: "账户安全", icon: Shield, desc: "密码、生物认证、设备" },
  { k: "notify", label: "告警与通知", icon: Bell, desc: "推送渠道、静音时段" },
  { k: "appearance", label: "外观偏好", icon: Palette, desc: "主题、密度、字号" },
];

export default function SettingsPage() {
  const [tab, setTab] = useState<TabKey>("profile");

  return (
    <AppShell
      role="family"
      userName="王磊"
      nav={NAV}
      breadcrumb={["SENTINEL", "设置", TABS.find((t) => t.k === tab)!.label]}
    >
      <div className="mb-8">
        <h1 className="font-display text-[32px] md:text-[40px] font-extrabold tracking-tight">系统设置</h1>
        <p className="mt-2 text-[14px] text-ink-soft font-medium">管理账户、安全、通知与外观偏好。</p>
      </div>

      <div className="grid grid-cols-12 gap-5">
        <aside className="col-span-12 md:col-span-4 lg:col-span-3 space-y-1.5">
          {TABS.map((t) => {
            const active = t.k === tab;
            return (
              <button
                key={t.k}
                onClick={() => setTab(t.k)}
                className="w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-colors"
                style={{
                  background: active ? "var(--surface)" : "transparent",
                  boxShadow: active ? "var(--shadow-sm)" : "none",
                  border: active ? "1px solid var(--border)" : "1px solid transparent",
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: active ? "var(--indigo-soft)" : "var(--canvas-2)",
                    color: active ? "var(--indigo-deep)" : "var(--ink-soft)",
                  }}
                >
                  <t.icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-[14px] font-extrabold" style={{ color: active ? "var(--ink)" : "var(--ink-2)" }}>{t.label}</div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft font-bold truncate">{t.desc}</div>
                </div>
                {active && <ChevronRight size={14} className="text-ink-soft" />}
              </button>
            );
          })}
        </aside>

        <section className="col-span-12 md:col-span-8 lg:col-span-9 panel p-6 md:p-8">
          {tab === "profile" && <Profile />}
          {tab === "security" && <Security />}
          {tab === "notify" && <Notify />}
          {tab === "appearance" && <Appearance />}
        </section>
      </div>
    </AppShell>
  );
}

function Row({ label, desc, children }: any) {
  return (
    <div className="flex items-start justify-between gap-6 py-5 border-b border-border last:border-b-0">
      <div className="flex-1 min-w-0">
        <div className="font-display text-[14px] font-extrabold">{label}</div>
        {desc && <div className="mt-1 text-[12px] text-ink-soft font-medium">{desc}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ defaultChecked = false }: { defaultChecked?: boolean }) {
  const [on, setOn] = useState(defaultChecked);
  return (
    <button
      onClick={() => setOn(!on)}
      className="relative w-11 h-6 rounded-full transition-colors"
      style={{ background: on ? "var(--indigo)" : "var(--canvas-3)" }}
    >
      <span
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all"
        style={{ left: on ? "22px" : "2px" }}
      />
    </button>
  );
}

function Profile() {
  return (
    <div>
      <div className="pb-6 mb-2 border-b border-border">
        <div className="flex items-center gap-5">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center font-display text-white font-extrabold text-[28px] shadow-md"
            style={{ background: "linear-gradient(135deg, var(--indigo), var(--coral))" }}
          >
            王
          </div>
          <div className="flex-1">
            <div className="font-display text-[22px] font-extrabold">王磊</div>
            <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft font-bold">FAMILY USER · UID 00284931</div>
            <div className="mt-3 flex items-center gap-2">
              <button className="btn-ghost py-2 px-3 text-[12px]">更换头像</button>
              <button className="btn-ghost py-2 px-3 text-[12px]" style={{ color: "var(--coral-deep)", borderColor: "var(--coral-soft)" }}>删除头像</button>
            </div>
          </div>
        </div>
      </div>

      <Row label="昵称" desc="家属同步告警中显示的名称">
        <input defaultValue="王磊" className="w-56 px-4 py-2.5 rounded-xl bg-surface border border-border font-medium text-[13px] focus:outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/20" />
      </Row>
      <Row label="手机号" desc="用于登录与重要告警短信">
        <input defaultValue="138 0013 4921" className="w-56 px-4 py-2.5 rounded-xl bg-surface border border-border font-medium text-[13px] focus:outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/20" />
      </Row>
      <Row label="紧急联系人" desc="发生拦截时一并推送">
        <button className="btn-ghost py-2 px-3 text-[12px]">+ 添加</button>
      </Row>
      <Row label="常用地址" desc="用于号段归属对比">
        <span className="font-mono text-[12px] text-ink-soft font-bold">北京 · 海淀区</span>
      </Row>
    </div>
  );
}

function Security() {
  return (
    <div>
      <div className="mb-6 p-4 rounded-2xl" style={{ background: "var(--mint-soft)" }}>
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-mint-deep mb-1">
          <CheckCircle2 size={13} /> 账户安全等级：高
        </div>
        <div className="text-[12px] text-mint-deep font-semibold">
          已启用指纹登录 + 短信二次验证，近期无异常登录。
        </div>
      </div>

      <Row label="登录密码" desc="上次修改：2026-03-18">
        <button className="btn-ghost py-2 px-3 text-[12px]">
          <Key size={12} /> 修改密码
        </button>
      </Row>
      <Row label="指纹登录" desc="在支持的设备上快速登录">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-mint-deep flex items-center gap-1">
            <Fingerprint size={12} /> 已启用
          </span>
          <Toggle defaultChecked />
        </div>
      </Row>
      <Row label="活体人脸" desc="高危操作前自动触发">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-ink-soft flex items-center gap-1">
            <ScanFace size={12} /> 可选
          </span>
          <Toggle />
        </div>
      </Row>
      <Row label="二次验证" desc="登录时向手机发送动态码">
        <Toggle defaultChecked />
      </Row>
      <Row label="信任的设备" desc="3 台在线">
        <button className="btn-ghost py-2 px-3 text-[12px]">
          <Smartphone size={12} /> 管理设备
        </button>
      </Row>
      <Row label="退出全部会话" desc="立即注销除当前外的所有设备">
        <button className="btn-ghost py-2 px-3 text-[12px]" style={{ color: "var(--coral-deep)", borderColor: "var(--coral-soft)" }}>
          <LogOut size={12} /> 注销
        </button>
      </Row>
    </div>
  );
}

function Notify() {
  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        {[
          { k: "APP 推送", icon: Bell, on: true, tint: "var(--indigo)", soft: "var(--indigo-soft)" },
          { k: "短信", icon: Smartphone, on: true, tint: "var(--mint-deep)", soft: "var(--mint-soft)" },
          { k: "邮件", icon: User, on: false, tint: "var(--amber-deep)", soft: "var(--amber-soft)" },
        ].map((c) => (
          <div key={c.k} className="p-4 rounded-2xl border border-border">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: c.soft, color: c.tint }}>
                <c.icon size={15} />
              </div>
              <Toggle defaultChecked={c.on} />
            </div>
            <div className="mt-3 font-display text-[14px] font-extrabold">{c.k}</div>
            <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft font-bold">
              {c.on ? "已启用" : "未启用"}
            </div>
          </div>
        ))}
      </div>

      <Row label="高危拦截" desc="AI 合成 / 话术命中 / 信令伪冒">
        <Toggle defaultChecked />
      </Row>
      <Row label="家属同步" desc="同时推送给紧急联系人">
        <Toggle defaultChecked />
      </Row>
      <Row label="白名单变动" desc="新增或移除时通知">
        <Toggle />
      </Row>
      <Row label="静音时段" desc="工作日 22:00 - 次日 07:00">
        <button className="btn-ghost py-2 px-3 text-[12px]">调整</button>
      </Row>
      <Row label="周报邮件" desc="每周一早上 09:00 送达">
        <Toggle defaultChecked />
      </Row>
    </div>
  );
}

function Appearance() {
  const [theme, setTheme] = useState<"light" | "dark" | "auto">("light");
  return (
    <div>
      <div className="mb-6">
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold mb-3">主题</div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { k: "light", label: "浅色", grad: "linear-gradient(135deg, #F2F3F7, #FFFFFF)" },
            { k: "dark", label: "深色", grad: "linear-gradient(135deg, #23273B, #1A1E30)" },
            { k: "auto", label: "跟随系统", grad: "linear-gradient(135deg, #F2F3F7 50%, #23273B 50%)" },
          ].map((t) => {
            const active = theme === t.k;
            return (
              <button
                key={t.k}
                onClick={() => setTheme(t.k as any)}
                className="p-3 rounded-2xl border-2 text-left transition-all"
                style={{ borderColor: active ? "var(--indigo)" : "var(--border)" }}
              >
                <div className="h-20 rounded-xl border border-border" style={{ background: t.grad }} />
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-display text-[13px] font-extrabold">{t.label}</span>
                  {active && <CheckCircle2 size={14} style={{ color: "var(--indigo)" }} />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <Row label="界面密度" desc="紧凑模式可在小屏幕上显示更多">
        <div className="flex items-center gap-1 p-1 rounded-full bg-canvas-2 border border-border">
          {["紧凑", "标准", "宽松"].map((d, i) => (
            <button
              key={d}
              className="px-3 py-1 rounded-full text-[12px] font-bold"
              style={{
                background: i === 1 ? "var(--surface)" : "transparent",
                color: i === 1 ? "var(--ink)" : "var(--ink-soft)",
              }}
            >
              {d}
            </button>
          ))}
        </div>
      </Row>

      <Row label="字号" desc="影响所有文本显示大小">
        <div className="flex items-center gap-1 p-1 rounded-full bg-canvas-2 border border-border">
          {["A-", "A", "A+"].map((d, i) => (
            <button
              key={d}
              className="w-9 py-1 rounded-full text-[12px] font-extrabold"
              style={{
                background: i === 1 ? "var(--surface)" : "transparent",
                color: i === 1 ? "var(--ink)" : "var(--ink-soft)",
              }}
            >
              {d}
            </button>
          ))}
        </div>
      </Row>

      <Row label="语言" desc="Language / 語言">
        <select className="px-4 py-2.5 rounded-xl bg-surface border border-border font-medium text-[13px] focus:outline-none focus:border-indigo">
          <option>简体中文</option>
          <option>English</option>
          <option>繁體中文</option>
        </select>
      </Row>

      <Row label="降低动画" desc="减少过渡动效，缓解晕动症">
        <Toggle />
      </Row>
    </div>
  );
}
