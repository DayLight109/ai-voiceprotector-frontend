"use client";
import { useState } from "react";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/shared/PageHeader";
import FormRow from "@/components/shared/FormRow";
import Toggle from "@/components/shared/Toggle";
import { useToast } from "@/components/shared/Toast";
import { FAMILY_NAV } from "@/lib/nav";
import { useLocalStorage } from "@/lib/storage";
import { Smartphone, IdCard, BookOpen, ShieldCheck, Plane, CheckCircle2, ScanFace, Users, Heart } from "lucide-react";

type CredKey = "phone" | "id" | "passport" | "military" | "hkmo";

const CREDS: { k: CredKey; label: string; icon: any; example: string }[] = [
  { k: "phone", label: "手机号", icon: Smartphone, example: "138 0013 4921" },
  { k: "id", label: "身份证", icon: IdCard, example: "110101 ···· 1234" },
  { k: "passport", label: "护照", icon: BookOpen, example: "E12345678" },
  { k: "military", label: "军人证", icon: ShieldCheck, example: "军 / 武警证号" },
  { k: "hkmo", label: "港澳台居民证", icon: Plane, example: "港澳台居民居住证号" },
];

export default function IdentityPage() {
  const toast = useToast();
  const [tab, setTab] = useState<CredKey>("phone");
  const [verified, setVerified] = useLocalStorage<Record<CredKey, boolean>>("identity.verified", {
    phone: true, id: true, passport: false, military: false, hkmo: false,
  });
  const [offline, setOffline] = useLocalStorage("identity.offline", false);
  const [relative, setRelative] = useLocalStorage("identity.relative", true);
  const [care, setCare] = useLocalStorage("identity.care", false);

  const verifyOne = (k: CredKey) => {
    setVerified({ ...verified, [k]: true });
    toast("success", "认证已提交", "公安信息接口异步回执，预计 1 分钟内完成");
  };

  return (
    <AppShell role="family" userName="王磊" nav={FAMILY_NAV} breadcrumb={["SENTINEL", "家庭用户", "身份认证"]}>
      <PageHeader
        eyebrow="IDENTITY"
        title="身份认证"
        desc="多源证件实名 + 线下 / 亲属 / 关怀模式，建立可追溯的本机身份档案。"
      />

      {/* 状态卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {CREDS.map((c) => (
          <div key={c.k} className="panel p-4">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center mb-2"
              style={{ background: verified[c.k] ? "var(--mint-soft)" : "var(--canvas-2)", color: verified[c.k] ? "var(--mint-deep)" : "var(--ink-soft)" }}
            >
              <c.icon size={14} />
            </div>
            <div className="font-display text-[13px] font-extrabold truncate">{c.label}</div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] font-bold" style={{ color: verified[c.k] ? "var(--mint-deep)" : "var(--ink-soft)" }}>
              {verified[c.k] ? "已认证" : "未认证"}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-5">
        <section className="col-span-12 lg:col-span-7 panel p-6">
          <div className="flex items-center gap-1 p-1 rounded-full bg-canvas-2 border border-border mb-6 overflow-x-auto">
            {CREDS.map((c) => {
              const active = c.k === tab;
              return (
                <button
                  key={c.k}
                  onClick={() => setTab(c.k)}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-bold transition-colors whitespace-nowrap"
                  style={{
                    background: active ? "var(--surface)" : "transparent",
                    color: active ? "var(--ink)" : "var(--ink-soft)",
                    boxShadow: active ? "var(--shadow-sm)" : "none",
                  }}
                >
                  <c.icon size={12} />
                  {c.label}
                </button>
              );
            })}
          </div>

          {(() => {
            const cur = CREDS.find((c) => c.k === tab)!;
            return (
              <div>
                <div className="font-display text-[18px] font-extrabold mb-1">{cur.label} 认证</div>
                <p className="text-[13px] text-ink-soft font-medium mb-5">
                  填写或拍照上传后，调用公安身份信息核验接口异步比对。
                </p>

                <div className="space-y-4">
                  <Field label="姓名">
                    <input className="ipt" placeholder="张三" />
                  </Field>
                  <Field label={cur.label + " 号"}>
                    <input className="ipt" placeholder={cur.example} />
                  </Field>
                  {tab === "id" && (
                    <div className="grid grid-cols-2 gap-3">
                      {["人像面", "国徽面"].map((s) => (
                        <div key={s} className="p-4 rounded-2xl border-2 border-dashed border-border hover:border-indigo cursor-pointer text-center transition-colors">
                          <ScanFace size={22} className="mx-auto text-ink-soft mb-1" />
                          <div className="font-display text-[12px] font-extrabold">上传{s}</div>
                          <div className="font-mono text-[10px] text-ink-soft font-bold">JPG / PNG · ≤ 5MB</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {(tab === "passport" || tab === "military" || tab === "hkmo") && (
                    <Field label="证件照片">
                      <div className="p-5 rounded-2xl border-2 border-dashed border-border hover:border-indigo cursor-pointer text-center transition-colors">
                        <ScanFace size={26} className="mx-auto text-ink-soft mb-1" />
                        <div className="font-display text-[13px] font-extrabold">点击上传证件</div>
                        <div className="font-mono text-[10px] text-ink-soft font-bold">JPG / PNG · ≤ 5MB</div>
                      </div>
                    </Field>
                  )}

                  <button onClick={() => verifyOne(cur.k)} className="btn-indigo w-full justify-center py-3 text-[14px]" style={{ width: "100%" }}>
                    {verified[cur.k] ? <CheckCircle2 size={14} /> : <ScanFace size={14} />}
                    {verified[cur.k] ? "重新提交认证" : "提交认证"}
                  </button>
                </div>
              </div>
            );
          })()}
        </section>

        <section className="col-span-12 lg:col-span-5 space-y-3">
          <div className="panel p-6">
            <div className="font-display text-[16px] font-extrabold mb-1">认证模式</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold mb-3">VERIFICATION MODE</div>
            <FormRow label="线下认证" desc="对接公安政务大厅人工核验，72 小时内回执">
              <Toggle checked={offline} onChange={setOffline} />
            </FormRow>
            <FormRow label="亲属认证" desc="允许已认证亲属为我担保，适用老人 / 儿童">
              <Toggle checked={relative} onChange={setRelative} />
            </FormRow>
            <FormRow label="关怀模式" desc="放大字体、简化操作、亲属同步重要告警">
              <Toggle checked={care} onChange={setCare} />
            </FormRow>
          </div>

          <div className="panel p-6" style={{ background: "linear-gradient(135deg, var(--indigo-soft), var(--mint-soft))" }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white shadow-sm">
                <Heart size={16} style={{ color: "var(--coral)" }} />
              </div>
              <div>
                <div className="font-display text-[14px] font-extrabold">关怀模式特性</div>
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold">FOR ELDERS</div>
              </div>
            </div>
            <ul className="space-y-2 text-[13px] font-medium text-ink-2">
              <li className="flex items-center gap-2"><Users size={12} style={{ color: "var(--indigo)" }} /> 来电警示自动同步儿女</li>
              <li className="flex items-center gap-2"><ShieldCheck size={12} style={{ color: "var(--mint-deep)" }} /> 转账类话术自动挂断 + 弹屏</li>
              <li className="flex items-center gap-2"><BookOpen size={12} style={{ color: "var(--amber-deep)" }} /> 大字模式 + 反诈语音助手</li>
            </ul>
          </div>
        </section>
      </div>

      <style>{`
        .ipt { width: 100%; padding: 12px 14px; border-radius: 14px; border: 1px solid var(--border); background: var(--surface); font-size: 13px; font-weight: 500; }
        .ipt:focus { outline: none; border-color: var(--indigo); box-shadow: 0 0 0 3px color-mix(in srgb, var(--indigo) 18%, transparent); }
      `}</style>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold block mb-1.5">{label}</label>
      {children}
    </div>
  );
}
