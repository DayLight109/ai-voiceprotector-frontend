"use client";
import { useMemo } from "react";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/shared/PageHeader";
import FormRow from "@/components/shared/FormRow";
import Toggle from "@/components/shared/Toggle";
import { useToast } from "@/components/shared/Toast";
import { FAMILY_NAV } from "@/lib/nav";
import { api, APIError } from "@/lib/api";
import { useSingle } from "@/lib/use-resource";
import { useAuth } from "@/lib/auth";
import { Bell, Smartphone, Mic, PhoneOff, ListChecks, Users, ShieldAlert, Eye } from "lucide-react";

type Perms = {
  pushApp: boolean; pushSms: boolean; pushEmail: boolean;
  recordSync: boolean; familySync: boolean;
  autoBlock: boolean; warnPopup: boolean;
  shareWhite: boolean; viewHistory: boolean;
  geoMatch: boolean;
};

const DEFAULT: Perms = {
  pushApp: true, pushSms: true, pushEmail: false,
  recordSync: true, familySync: true,
  autoBlock: true, warnPopup: true,
  shareWhite: false, viewHistory: true,
  geoMatch: true,
};

const PERM_KEYS = Object.keys(DEFAULT) as (keyof Perms)[];

export default function PermissionsPage() {
  const toast = useToast();
  const { user } = useAuth();
  const permsRes = useSingle<any[]>(() => api.permissions.getFamily());

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
      await api.permissions.setFamily(user.id, items);
      toast("info", "已更新", k);
      permsRes.refresh();
    } catch (e) {
      if (e instanceof APIError && e.status === 403) {
        toast("error", "权限不足", "仅家庭管理员可改");
      } else {
        toast("error", e instanceof APIError ? e.message : "保存失败");
      }
    }
  };

  return (
    <AppShell role="family" userName="王磊" nav={FAMILY_NAV} breadcrumb={["SENTINEL", "家庭用户", "用户权限设置"]}>
      <PageHeader
        eyebrow="PERMISSIONS"
        title="用户权限设置"
        desc="控制告警推送渠道、家属同步范围与本机自动处置策略。"
      />

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12 lg:col-span-7 space-y-4 stagger">
          <div className="panel p-6">
            <SectionTitle icon={Bell} label="告警与推送" />
            <FormRow label="App 内推送" desc="即时弹窗 + 通知栏"><Toggle checked={p.pushApp} onChange={(v) => upd("pushApp", v)} /></FormRow>
            <FormRow label="短信通知" desc="高危事件同步至本机短信"><Toggle checked={p.pushSms} onChange={(v) => upd("pushSms", v)} /></FormRow>
            <FormRow label="邮件周报" desc="每周一 09:00 接收防护周报"><Toggle checked={p.pushEmail} onChange={(v) => upd("pushEmail", v)} /></FormRow>
          </div>

          <div className="panel p-6">
            <SectionTitle icon={PhoneOff} label="自动处置" />
            <FormRow label="自动拦截 AI 合成"><Toggle checked={p.autoBlock} onChange={(v) => upd("autoBlock", v)} /></FormRow>
            <FormRow label="话术警示弹屏" desc="命中转账 / 公检法话术时强制弹窗"><Toggle checked={p.warnPopup} onChange={(v) => upd("warnPopup", v)} /></FormRow>
            <FormRow label="境外信令拦截" desc="发现实际信令在境外即标红"><Toggle checked={p.geoMatch} onChange={(v) => upd("geoMatch", v)} /></FormRow>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5 space-y-4 stagger">
          <div className="panel p-6">
            <SectionTitle icon={Mic} label="数据与隐私" />
            <FormRow label="录音同步至云端" desc="便于跨设备查看，可被管理员审计"><Toggle checked={p.recordSync} onChange={(v) => upd("recordSync", v)} /></FormRow>
            <FormRow label="历史拦截可查" desc="保留 30 天通话拦截详情"><Toggle checked={p.viewHistory} onChange={(v) => upd("viewHistory", v)} /></FormRow>
          </div>
          <div className="panel p-6">
            <SectionTitle icon={Users} label="家属与共享" />
            <FormRow label="家属同步" desc="拦截事件同时推送至紧急联系人"><Toggle checked={p.familySync} onChange={(v) => upd("familySync", v)} /></FormRow>
            <FormRow label="共享白名单" desc="允许家属互访各自白名单"><Toggle checked={p.shareWhite} onChange={(v) => upd("shareWhite", v)} /></FormRow>
          </div>

          <div className="panel p-6" style={{ background: "var(--mint-soft)" }}>
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-mint-deep mb-2">
              <ShieldAlert size={12} /> 隐私守则
            </div>
            <div className="text-[12px] text-mint-deep font-semibold leading-[1.7]">
              SENTINEL 不上传通话原始音频。开关云端录音后，仅波形特征会进入云端用于跨设备审计。
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function SectionTitle({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--indigo-soft)", color: "var(--indigo-deep)" }}>
        <Icon size={14} />
      </div>
      <div className="font-display text-[15px] font-extrabold">{label}</div>
    </div>
  );
}
