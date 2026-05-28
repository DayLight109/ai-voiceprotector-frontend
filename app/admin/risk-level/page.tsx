"use client";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/shared/PageHeader";
import RiskLevelEditor from "@/components/shared/RiskLevelEditor";
import { ADMIN_NAV } from "@/lib/nav";

export default function AdminRiskLevelPage() {
  return (
    <AppShell role="admin" userName="李梦楠" nav={ADMIN_NAV} breadcrumb={["SENTINEL", "企业管理员", "风控等级"]}>
      <PageHeader
        eyebrow="ENTERPRISE RISK LEVEL"
        title="企业风控等级 L1–L5"
        desc="为企业租户定义当前风控等级及自定义规则。所有命中事件可追溯至审计日志。"
      />
      <RiskLevelEditor storageKey="admin.riskRules" />
    </AppShell>
  );
}
