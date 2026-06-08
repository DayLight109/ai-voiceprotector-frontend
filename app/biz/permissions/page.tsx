"use client";
import { useMemo } from "react";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/shared/PageHeader";
import FormRow from "@/components/shared/FormRow";
import Toggle from "@/components/shared/Toggle";
import { FieldsSkeleton } from "@/components/shared/Skeleton";
import { useToast } from "@/components/shared/Toast";
import { BIZ_NAV } from "@/lib/nav";
import { api, APIError } from "@/lib/api";
import { useSingle } from "@/lib/use-resource";
import { useAuth } from "@/lib/auth";
import { Bell, Smartphone, PhoneCall, Heart, ListChecks, Eye, ShieldAlert } from "lucide-react";

type Perms = {
  viewCalls: boolean;
  autoBlockHigh: boolean;
  careMode: boolean;
  viewHistory: boolean;
  apiAccess: boolean;
  webhookEvents: boolean;
  workdayMute: boolean;
};

const DEFAULT: Perms = {
  viewCalls: true, autoBlockHigh: true, careMode: false,
  viewHistory: true, apiAccess: true, webhookEvents: true, workdayMute: false,
};

const PERM_KEYS = Object.keys(DEFAULT) as (keyof Perms)[];

export default function BizPermsPage() {
  const toast = useToast();
  const { user } = useAuth();
  const permsRes = useSingle<any[]>(() => api.permissions.getBiz());

  const p = useMemo<Perms>(() => {
    const m: Perms = { ...DEFAULT };
    for (const it of permsRes.data || []) {
      if (it?.key && it.key in m) (m as any)[it.key] = !!it.enabled;
    }
    return m;
  }, [permsRes.data]);

  const upd = async <K extends keyof Perms>(k: K, v: Perms[K]) => {
    if (!user?.id) {
      toast("error", "未登录");
      return;
    }
    try {
      const items = PERM_KEYS.map((key) => ({
        key,
        enabled: key === k ? (v as boolean) : p[key],
      }));
      await api.permissions.setBiz(user.id, items);
      toast("info", "已更新", k);
      permsRes.refresh();
    } catch (e) {
      if (e instanceof APIError && e.status === 403) {
        toast("error", "权限不足", "仅企业管理员可改");
      } else {
        toast("error", e instanceof APIError ? e.message : "保存失败");
      }
    }
  };

  return (
    <AppShell role="biz" userName="周珩" nav={BIZ_NAV} breadcrumb={["SENTINEL", "企业用户", "权限设置"]}>
      <PageHeader
        eyebrow="ENTERPRISE PERMISSIONS"
        title="权限设置"
        desc="控制通话记录可见性、高危处置策略与 API 接入开关。"
      />

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12 lg:col-span-7 space-y-4">
          <div className="panel p-6">
            <Title icon={PhoneCall} label="通话能力" />
            {permsRes.loading && !permsRes.data ? (
              <FieldsSkeleton rows={4} />
            ) : (
              <>
                <FormRow label="查看通话记录" desc="允许查看所有客服线路通话明细"><Toggle checked={p.viewCalls} onChange={(v) => upd("viewCalls", v)} /></FormRow>
                <FormRow label="是否拦截高危来电" desc="风险分 ≥ 85 自动挂断 + 上报"><Toggle checked={p.autoBlockHigh} onChange={(v) => upd("autoBlockHigh", v)} /></FormRow>
                <FormRow label="关怀模式" desc="老年 / 高净值客户来电时启用增强提示"><Toggle checked={p.careMode} onChange={(v) => upd("careMode", v)} /></FormRow>
                <FormRow label="查看历史拦截记录" desc="保留 90 天证据链可审计"><Toggle checked={p.viewHistory} onChange={(v) => upd("viewHistory", v)} /></FormRow>
              </>
            )}
          </div>
          <div className="panel p-6">
            <Title icon={Smartphone} label="集成接入" />
            {permsRes.loading && !permsRes.data ? (
              <FieldsSkeleton rows={3} />
            ) : (
              <>
                <FormRow label="API 接入" desc="启用 /v1/analyze 实时判决端点"><Toggle checked={p.apiAccess} onChange={(v) => upd("apiAccess", v)} /></FormRow>
                <FormRow label="Webhook 事件推送" desc="将拦截 / 申诉等事件 POST 至业务系统"><Toggle checked={p.webhookEvents} onChange={(v) => upd("webhookEvents", v)} /></FormRow>
                <FormRow label="工作日静音时段" desc="22:00 – 次日 07:00 不下推非紧急告警"><Toggle checked={p.workdayMute} onChange={(v) => upd("workdayMute", v)} /></FormRow>
              </>
            )}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5 space-y-4">
          <div className="panel p-6">
            <Title icon={ListChecks} label="权限摘要" />
            {permsRes.loading && !permsRes.data ? (
              <FieldsSkeleton rows={5} />
            ) : (
            <ul className="space-y-3">
              {[
                { ok: p.viewCalls, label: "通话明细查阅" },
                { ok: p.autoBlockHigh, label: "高危自动拦截" },
                { ok: p.careMode, label: "关怀模式" },
                { ok: p.apiAccess, label: "API 接入" },
                { ok: p.webhookEvents, label: "事件 Webhook" },
              ].map((x) => (
                <li key={x.label} className="flex items-center justify-between text-[calc(13px*var(--fz))] font-medium">
                  <span>{x.label}</span>
                  <span className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] px-2 py-1 rounded-full font-bold" style={{ background: x.ok ? "var(--mint-soft)" : "var(--canvas-2)", color: x.ok ? "var(--mint-deep)" : "var(--ink-soft)" }}>
                    {x.ok ? "已启用" : "未启用"}
                  </span>
                </li>
              ))}
            </ul>
            )}
          </div>
          <div className="panel p-6" style={{ background: "var(--coral-soft)" }}>
            <div className="flex items-center gap-2 mb-2 font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] font-bold text-coral-deep">
              <ShieldAlert size={12} /> 合规提醒
            </div>
            <div className="text-[calc(12px*var(--fz))] font-semibold text-coral-deep leading-[1.7]">
              所有通话留样需符合《数据安全法》《个保法》最小必要原则。Webhook 启用后将记录推送审计日志。
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Title({ icon: Icon, label }: any) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--indigo-soft)", color: "var(--indigo-deep)" }}>
        <Icon size={14} />
      </div>
      <div className="font-display text-[calc(15px*var(--fz))] font-extrabold">{label}</div>
    </div>
  );
}
