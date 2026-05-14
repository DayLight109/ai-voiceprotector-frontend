"use client";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/shared/PageHeader";
import RiskLevelEditor from "@/components/shared/RiskLevelEditor";
import { FAMILY_ADMIN_NAV } from "@/lib/nav";

export default function FamilyRiskLevelPage() {
  return (
    <AppShell role="family-admin" userName="李梦楠" nav={FAMILY_ADMIN_NAV} breadcrumb={["SENTINEL", "家庭管理员", "风控等级"]}>
      <PageHeader
        eyebrow="RISK LEVEL"
        title="风控等级 L1–L5"
        desc="选择当前家庭风控等级并为每一级定义触发关键词、权重与启停状态。"
      />
      <RiskLevelEditor storageKey="family.riskRules" />
    </AppShell>
  );
}
