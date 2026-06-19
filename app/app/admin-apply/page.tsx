"use client";
import { useState } from "react";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/shared/PageHeader";
import { useToast } from "@/components/shared/Toast";
import { FAMILY_NAV } from "@/lib/nav";
import { api, APIError } from "@/lib/api";
import { useSingle } from "@/lib/use-resource";
import { SkeletonBar } from "@/components/shared/Skeleton";
import { UserPlus, ShieldCheck, Building2, CheckCircle2, Clock, AlertTriangle } from "lucide-react";

type Status = "none" | "pending" | "approved" | "rejected";

export default function AdminApplyPage() {
  const toast = useToast();
  const statusRes = useSingle<any>(() => api.adminApply.myStatus());
  const [form, setForm] = useState({ scope: "family", reason: "", contact: "" });
  const [submitting, setSubmitting] = useState(false);

  const rawStatus = (statusRes.data?.status as Status | undefined) ?? "none";
  const status: Status = rawStatus;

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!form.reason.trim() || !form.contact.trim()) {
      toast("error", "信息不完整", "请填写申请理由与联系方式");
      return;
    }
    setSubmitting(true);
    try {
      await api.adminApply.submit({
        scope: form.scope as "family" | "biz",
        reason: form.reason.trim(),
        contact: form.contact.trim(),
      });
      toast("success", "申请已提交", "管理员将在 24 小时内审核");
      statusRes.refresh();
    } catch (e) {
      if (e instanceof APIError && e.code === "ADMIN_APPLY_PENDING") {
        toast("error", "已存在审核中申请", "请等待结果或先撤回再提交");
        statusRes.refresh();
      } else if (e instanceof APIError && e.status === 403) {
        toast("error", "权限不足");
      } else {
        toast("error", e instanceof APIError ? e.message : "提交失败");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const withdraw = async () => {
    try {
      await api.adminApply.withdraw();
      setForm({ scope: "family", reason: "", contact: "" });
      toast("success", "已撤回申请");
      statusRes.refresh();
    } catch (e) {
      if (e instanceof APIError && e.status === 404) {
        toast("error", "无可撤回的申请");
        statusRes.refresh();
      } else {
        toast("error", e instanceof APIError ? e.message : "撤回失败");
      }
    }
  };

  return (
    <AppShell role="family" nav={FAMILY_NAV} breadcrumb={["SENTINEL", "家庭用户", "管理员申请"]}>
      <PageHeader
        eyebrow="ADMIN APPLY"
        title="管理员申请"
        desc="申请成为家庭管理员或企业管理员后，可管理多用户、调整风控等级、维护私有黑名单库。"
      />

      <div className="grid grid-cols-12 gap-5">
        <section className="col-span-12 lg:col-span-7 panel p-6 md:p-8 rise-soft" style={{ animationDelay: "60ms" }}>
          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold block mb-2">
                申请范围
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { k: "family", label: "家庭管理员", desc: "管理家庭成员、共享黑名单、调整告警等级", icon: ShieldCheck, tint: "var(--coral)", soft: "var(--coral-soft)" },
                  { k: "biz", label: "企业管理员", desc: "管理企业账号、API 接入、风控策略", icon: Building2, tint: "var(--indigo)", soft: "var(--indigo-soft)" },
                ].map((s) => {
                  const active = form.scope === s.k;
                  return (
                    <button
                      key={s.k}
                      type="button"
                      onClick={() => setForm({ ...form, scope: s.k })}
                      className="p-4 rounded-2xl border-2 text-left transition-all"
                      style={{ borderColor: active ? s.tint : "var(--border)", background: active ? s.soft : "var(--surface)" }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white" style={{ background: s.tint }}>
                          <s.icon size={15} />
                        </div>
                        <span className="font-display text-[calc(14px*var(--fz))] font-extrabold">{s.label}</span>
                      </div>
                      <div className="text-[calc(12px*var(--fz))] text-ink-soft font-medium leading-[1.6]">{s.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold block mb-1.5">
                申请理由
              </label>
              <textarea
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                rows={5}
                className="w-full px-4 py-3 rounded-2xl bg-surface border border-border font-body text-[calc(14px*var(--fz))] font-medium focus:outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/20"
                placeholder="请说明你将管理的家庭成员或机构、当前负责的工作以及为何需要管理员权限……"
              />
            </div>

            <div>
              <label className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold block mb-1.5">
                可联系到的方式
              </label>
              <input
                value={form.contact}
                onChange={(e) => setForm({ ...form, contact: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl bg-surface border border-border font-body text-[calc(14px*var(--fz))] font-medium focus:outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/20"
                placeholder="手机号 / 邮箱 / 单位办公电话"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              {status === "pending" && (
                <button type="button" onClick={withdraw} className="btn-ghost py-2.5 px-4 text-[calc(13px*var(--fz))]">
                  撤回申请
                </button>
              )}
              <button type="submit" disabled={status === "pending" || submitting} className="btn-indigo py-2.5 px-5 text-[calc(13px*var(--fz))] disabled:opacity-60">
                <UserPlus size={14} />
                {status === "pending" ? "审核中" : submitting ? "提交中" : "提交申请"}
              </button>
            </div>
          </form>
        </section>

        <section className="col-span-12 lg:col-span-5 space-y-4 stagger">
          <div className="panel p-6">
            <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold mb-3">CURRENT STATUS</div>
            {statusRes.loading && !statusRes.data ? (
              <div aria-hidden>
                <div className="flex items-center gap-2 mb-2">
                  <SkeletonBar className="w-10 h-10 rounded-xl shrink-0" />
                  <SkeletonBar className="h-5 w-24" />
                </div>
                <div className="space-y-2 mt-1">
                  <SkeletonBar className="h-3 w-full" />
                  <SkeletonBar className="h-3 w-2/3" />
                </div>
              </div>
            ) : (
              <div key={status} className="fade-in">
                <StatusBlock status={status} />
              </div>
            )}
          </div>

          <div className="panel p-6" style={{ background: "var(--indigo-soft)" }}>
            <div className="font-display text-[calc(14px*var(--fz))] font-extrabold mb-2" style={{ color: "var(--indigo-deep)" }}>
              管理员权限范围
            </div>
            <ul className="text-[calc(13px*var(--fz))] font-medium space-y-2" style={{ color: "var(--indigo-deep)" }}>
              <li>· 添加 / 移除 / 编辑下辖用户</li>
              <li>· 查看 / 删除所辖通话录音</li>
              <li>· 调整 L1–L5 风控等级与自定义规则</li>
              <li>· 维护私有黑名单库（CSV / XLSX 导入）</li>
            </ul>
          </div>

          <div className="panel p-6">
            <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold mb-3">SLA</div>
            <div className="space-y-3 text-[calc(13px*var(--fz))] text-ink-2 font-medium">
              <div className="flex items-center justify-between"><span>初审反馈</span><span className="font-mono font-bold">≤ 24 小时</span></div>
              <div className="flex items-center justify-between"><span>复核与开通</span><span className="font-mono font-bold">≤ 72 小时</span></div>
              <div className="flex items-center justify-between"><span>客服</span><span className="font-mono font-bold">96110</span></div>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function StatusBlock({ status }: { status: Status }) {
  if (status === "pending") {
    return (
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--amber-soft)", color: "var(--amber-deep)" }}>
            <Clock size={16} />
          </div>
          <span className="font-display text-[calc(16px*var(--fz))] font-extrabold">审核中</span>
        </div>
        <div className="text-[calc(13px*var(--fz))] text-ink-soft font-medium">申请已进入审核队列，预计 24 小时内完成初审，请保持联系方式畅通。</div>
      </div>
    );
  }
  if (status === "approved") {
    return (
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--mint-soft)", color: "var(--mint-deep)" }}>
            <CheckCircle2 size={16} />
          </div>
          <span className="font-display text-[calc(16px*var(--fz))] font-extrabold">已通过</span>
        </div>
        <div className="text-[calc(13px*var(--fz))] text-ink-soft font-medium">恭喜！你已被授予管理员权限，可前往对应控制台开始管理。</div>
      </div>
    );
  }
  if (status === "rejected") {
    return (
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--coral-soft)", color: "var(--coral-deep)" }}>
            <AlertTriangle size={16} />
          </div>
          <span className="font-display text-[calc(16px*var(--fz))] font-extrabold">未通过</span>
        </div>
        <div className="text-[calc(13px*var(--fz))] text-ink-soft font-medium">本次申请未通过。请完善申请理由或联系当前管理员后再次提交。</div>
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-canvas-2 text-ink-soft">
          <UserPlus size={16} />
        </div>
        <span className="font-display text-[calc(16px*var(--fz))] font-extrabold">尚未申请</span>
      </div>
      <div className="text-[calc(13px*var(--fz))] text-ink-soft font-medium">填写左侧表单后提交，管理员将在 24 小时内审核。</div>
    </div>
  );
}

