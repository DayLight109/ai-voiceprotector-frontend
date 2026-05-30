// 各角色侧栏 NAV 配置 - 由各页面 import 使用
import {
  Home, Radio, Bell, ListChecks, Users, PhoneCall, Settings,
  BookOpen, ShieldCheck, IdCard, UserPlus, KeyRound,
  Building2, MessageSquareWarning, ScrollText, Inbox,
  LayoutDashboard, Sliders, Shield, FileBarChart2, Database, FileLock2, Server, Mic2,
  BookMarked, FlaskConical, Bot, AlertOctagon, HardDrive, Activity,
} from "lucide-react";

export const FAMILY_NAV = [
  { href: "/app", label: "首页", icon: Home },
  { href: "/app/protection", label: "实时安全防护", icon: ShieldCheck },
  { href: "/app/knowledge", label: "反诈知识库", icon: BookOpen },
  { href: "/app/identity", label: "身份认证", icon: IdCard },
  { href: "/app/admin-apply", label: "管理员申请", icon: UserPlus },
  { href: "/app/permissions", label: "用户权限设置", icon: KeyRound },
  { href: "/settings", label: "个人设置", icon: Settings },
];

export const BIZ_NAV = [
  { href: "/biz", label: "首页", icon: Home },
  { href: "/biz/protection", label: "实时安全防护", icon: ShieldCheck },
  { href: "/biz/knowledge", label: "反诈知识库", icon: BookOpen },
  { href: "/biz/calls", label: "通话记录", icon: PhoneCall },
  { href: "/biz/appeal", label: "申诉与举报", icon: MessageSquareWarning },
  { href: "/biz/permissions", label: "权限设置", icon: KeyRound },
  { href: "/settings", label: "个人设置", icon: Settings },
];

export const FAMILY_ADMIN_NAV = [
  { href: "/family-admin", label: "总览", icon: LayoutDashboard },
  { href: "/family-admin/users", label: "多用户管理", icon: Users },
  { href: "/family-admin/recordings", label: "录音管理", icon: Mic2 },
  { href: "/family-admin/risk-level", label: "风控等级", icon: Sliders },
  { href: "/family-admin/blacklist", label: "私有黑名单库", icon: Database },
  { href: "/settings", label: "个人资料", icon: Settings },
];

export const ADMIN_NAV = [
  { href: "/admin", label: "总览", icon: LayoutDashboard },
  { href: "/admin/users", label: "员工管理", icon: Users },
  { href: "/admin/recordings", label: "录音数据", icon: Mic2 },
  { href: "/admin/risk-level", label: "风控等级", icon: Sliders },
  { href: "/admin/blacklist", label: "企业黑名单", icon: Database },
  { href: "/admin/appeals", label: "举报审批", icon: Inbox },
  { href: "/warroom", label: "指挥中心", icon: Shield },
  { href: "/settings", label: "个人资料", icon: Settings },
];

export const SYSADMIN_NAV = [
  { href: "/sysadmin", label: "总览", icon: LayoutDashboard },
  { href: "/sysadmin/rules", label: "诈骗规则库", icon: ScrollText },
  { href: "/sysadmin/knowledge", label: "反诈知识库", icon: BookMarked },
  { href: "/sysadmin/blacklist", label: "黑名单总库", icon: Database },
  { href: "/sysadmin/appeals", label: "申诉处理", icon: Inbox },
  { href: "/sysadmin/samples", label: "样本审核", icon: FlaskConical },
  { href: "/sysadmin/audio-config", label: "音频分析配置", icon: Mic2 },
  { href: "/sysadmin/agents", label: "智能体管理", icon: Bot },
  { href: "/sysadmin/risk-dashboard", label: "风险大屏", icon: AlertOctagon },
  { href: "/sysadmin/devices/enterprise", label: "企业端设备", icon: Server },
  { href: "/sysadmin/devices/family", label: "家庭端设备", icon: HardDrive },
];
