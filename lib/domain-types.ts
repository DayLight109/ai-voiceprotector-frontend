// 全局共享的业务实体类型定义。

export type BlackEntry = {
  id: string;
  number: string;
  reason: string;
  category: "AI合成" | "话术诈骗" | "号码伪冒" | "其他";
  risk: number;
  source: "本地" | "云端" | "手动" | "举报";
  // 举报通过自动入库的条目：false=待审核方手动下发；普通条目为 true（已生效）。
  dispatched?: boolean;
  createdAt: string;
};

export type WhiteEntry = {
  id: string;
  number: string;
  name: string;
  relation: string;
  createdAt: string;
};

export type KnowledgeArticle = {
  id: string;
  title: string;
  category: "AI合成" | "公检法冒充" | "刷单返利" | "投资理财" | "情感诈骗" | "贷款代办";
  summary: string;
  body: string;
  views: number;
  updatedAt: string;
};

export type ScamRule = {
  id: string;
  category: string;
  keyword: string;
  weight: number;
  enabled: boolean;
};

export type ScamSample = {
  id: string;
  callId: string;
  transcript: string;
  duration: string;
  origin: string;
  status: "待审核" | "已审核" | "已驳回";
  classification: string;
  receivedAt: string;
};

export type Recording = {
  id: string;
  owner: string;
  phone: string;
  duration: string;
  size: string;
  verdict: "拦截" | "预警" | "通过";
  createdAt: string;
};

export type ManagedUser = {
  id: string;
  name: string;
  role: "family" | "biz" | "family_admin" | "admin" | "sysadmin";
  dept?: string;
  status: "active" | "review" | "suspended";
  email?: string;
  phone?: string;
  lastLoginAt?: string;
  createdAt?: string;
};

export type Appeal = {
  id: string;
  type: "误判申诉" | "号码举报";
  number: string;
  reason: string;
  status: "处理中" | "已通过" | "已驳回";
  createdAt: string;
  // 号码举报分流：local=企业管理员处理 / cloud=系统管理员处理。误判申诉恒为 local。
  scope?: "local" | "cloud";
  recordingId?: string;
  userId?: string;
  userAccount?: string;
  userRole?: string;
};

export type CallLog = {
  id: string;
  phone: string;
  region: string;
  duration: string;
  verdict: "拦截" | "预警" | "通过";
  reason: string;
  createdAt: string;
};

export type Device = {
  id: string;
  name: string;
  tenant: string;
  type: "企业端" | "家庭端";
  status: "online" | "offline" | "warn";
  version: string;
  lastSeen: string;
  contact: string;
};

export type AuditLog = {
  id: string;
  ts: string;
  actor: string;
  action: string;
  target: string;
  result: "成功" | "失败";
};

export type VoiceModel = {
  id: string;
  version: string;
  accuracy: number;
  size: string;
  uploadedAt: string;
  active: boolean;
};
