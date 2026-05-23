// 全局共享的 mock 种子数据。所有页面通过 useLocalStorage 读写各自分片。

export type BlackEntry = {
  id: string;
  number: string;
  reason: string;
  category: "AI合成" | "话术诈骗" | "号码伪冒" | "其他";
  risk: number;
  source: "本地" | "云端" | "手动";
  createdAt: string;
};

export type WhiteEntry = {
  id: string;
  phone: string;
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
  role: "admin" | "operator" | "viewer";
  dept: string;
  status: "active" | "review" | "suspended";
  email: string;
  last: string;
};

export type Appeal = {
  id: string;
  type: "误判申诉" | "号码举报";
  number: string;
  reason: string;
  status: "处理中" | "已通过" | "已驳回";
  createdAt: string;
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

export const SEED = {
  blacklist: <BlackEntry[]>[
    { id: "b1", number: "+855-23-8123-4551", reason: "克隆孙子声纹", category: "AI合成", risk: 96, source: "云端", createdAt: "2026-05-12 14:37" },
    { id: "b2", number: "+95-9-7712-8830", reason: "冒充公安转账", category: "话术诈骗", risk: 92, source: "云端", createdAt: "2026-05-11 09:24" },
    { id: "b3", number: "+86-186-6688-7712", reason: "信令层穿透", category: "号码伪冒", risk: 88, source: "本地", createdAt: "2026-05-10 21:08" },
    { id: "b4", number: "+84-28-6677-2210", reason: "刷单返利诱导", category: "话术诈骗", risk: 81, source: "本地", createdAt: "2026-05-09 16:52" },
    { id: "b5", number: "+960-7-3344-2111", reason: "AI 换声实时对话", category: "AI合成", risk: 94, source: "云端", createdAt: "2026-05-08 11:30" },
  ],
  whitelist: <WhiteEntry[]>[
    { id: "w1", phone: "+86 138 0013 4921", name: "父亲 · 王建国", relation: "亲属", createdAt: "2026-04-01 10:00" },
    { id: "w2", phone: "+86 139 0011 2233", name: "母亲 · 李秀芬", relation: "亲属", createdAt: "2026-04-01 10:01" },
    { id: "w3", phone: "+86 155 8866 9988", name: "建设银行 95533", relation: "银行", createdAt: "2026-04-15 09:30" },
    { id: "w4", phone: "+86 010 5566 7788", name: "海淀公安分局", relation: "公检法", createdAt: "2026-04-20 14:10" },
  ],
  knowledge: <KnowledgeArticle[]>[
    {
      id: "k1",
      title: "如何识破 3 秒 AI 克隆声音的诈骗电话",
      category: "AI合成",
      summary: "AI 只需一段抖音、微信语音片段就能合成 85% 相似度的声音，但实时对话仍有破绽。",
      body: "1. 听到熟悉声音也要核对二次身份；\n2. 让对方说一段未在公开内容中出现的具体记忆；\n3. 主动挂断并回拨本机通讯录里的号码；\n4. 任何涉及转账的「亲属来电」请坚持当面或视频确认。",
      views: 12480,
      updatedAt: "2026-05-10",
    },
    {
      id: "k2",
      title: "公检法不会通过电话要求你转账到「安全账户」",
      category: "公检法冒充",
      summary: "真正的公检法机关办案有严格当面流程，永远不会通过电话指挥你把钱转到任何账户。",
      body: "「安全账户」是诈骗的标志性话术。如接到自称公检法的电话要求转账或下载 APP，请立即挂断并拨打 96110。",
      views: 8921,
      updatedAt: "2026-05-08",
    },
    {
      id: "k3",
      title: "刷单返利：最常见、损失最高的诈骗类型",
      category: "刷单返利",
      summary: "「轻松兼职、高额佣金」背后是逐渐加码的本金陷阱。",
      body: "凡是先要垫付资金的兼职都是诈骗。真正的兼职平台不会要求你充值、连单或解冻。",
      views: 6540,
      updatedAt: "2026-05-07",
    },
    {
      id: "k4",
      title: "虚假投资理财平台的 5 个共同特征",
      category: "投资理财",
      summary: "「内部消息」「百倍杠杆」「老师带单」是骗局三件套。",
      body: "投资有风险，但骗局是确定亏损。注意辨识无牌照交易平台、PS 截图盈利、群内托儿等。",
      views: 4310,
      updatedAt: "2026-05-05",
    },
    {
      id: "k5",
      title: "「杀猪盘」情感诈骗的全流程拆解",
      category: "情感诈骗",
      summary: "从添加好友到诱导投资，杀猪盘有一套标准化剧本。",
      body: "陌生人在社交平台主动靠近、晒成功生活、最后引导到陌生投资平台 —— 整个链条都是脚本化的。",
      views: 5820,
      updatedAt: "2026-05-04",
    },
    {
      id: "k6",
      title: "冒充客服「退款」诈骗：电商节后高发",
      category: "贷款代办",
      summary: "「订单异常需要退款」的来电是 618 / 双十一后的高发骗术。",
      body: "退款只会原路返回，不需要你提供验证码、下载 APP 或开屏共享。",
      views: 3210,
      updatedAt: "2026-05-02",
    },
  ],
  rules: <ScamRule[]>[
    { id: "r1", category: "切断外部联系", keyword: "不要告诉爸妈", weight: 78, enabled: true },
    { id: "r2", category: "切断外部联系", keyword: "保持通话不能挂", weight: 76, enabled: true },
    { id: "r3", category: "制造紧迫感", keyword: "今天必须办", weight: 72, enabled: true },
    { id: "r4", category: "制造紧迫感", keyword: "12 小时内", weight: 70, enabled: true },
    { id: "r5", category: "引导转账", keyword: "安全账户", weight: 92, enabled: true },
    { id: "r6", category: "引导转账", keyword: "资金核查", weight: 88, enabled: true },
    { id: "r7", category: "假冒权威", keyword: "我是公安", weight: 86, enabled: true },
    { id: "r8", category: "假冒权威", keyword: "涉嫌洗钱", weight: 84, enabled: true },
    { id: "r9", category: "索要敏感信息", keyword: "验证码", weight: 88, enabled: true },
    { id: "r10", category: "索要敏感信息", keyword: "银行卡号", weight: 86, enabled: true },
  ],
  samples: <ScamSample[]>[
    {
      id: "s1",
      callId: "case-2026-05-13-1437",
      transcript: "你好，这里是北京海淀公安局，你涉嫌一起洗钱案件，需要把资金转到我们的安全账户进行核查，不要告诉任何人……",
      duration: "00:47",
      origin: "缅甸 · 仰光",
      status: "待审核",
      classification: "公检法冒充 / 引导转账",
      receivedAt: "2026-05-13 14:37",
    },
    {
      id: "s2",
      callId: "case-2026-05-13-1422",
      transcript: "奶奶是我啊，我现在出事了急需用钱，你不要告诉爸妈，快把钱打到这个账户……",
      duration: "01:12",
      origin: "柬埔寨 · 金边",
      status: "待审核",
      classification: "AI 克隆 / 亲情诈骗",
      receivedAt: "2026-05-13 14:22",
    },
    {
      id: "s3",
      callId: "case-2026-05-13-1108",
      transcript: "您好，我是建设银行客服，您的信用卡有一笔异常消费，请提供短信验证码进行身份核验……",
      duration: "00:38",
      origin: "越南 · 胡志明",
      status: "已审核",
      classification: "客服冒充 / 索要凭证",
      receivedAt: "2026-05-13 11:08",
    },
    {
      id: "s4",
      callId: "case-2026-05-12-2103",
      transcript: "恭喜您被我们后台抽中刷单兼职，先垫付 200 元立返 50，您的任务编号是……",
      duration: "02:05",
      origin: "泰国 · 曼谷",
      status: "已审核",
      classification: "刷单返利",
      receivedAt: "2026-05-12 21:03",
    },
  ],
  recordings: <Recording[]>[
    { id: "rec1", owner: "父亲 · 王建国", phone: "+855 23 8123 4551", duration: "01:42", size: "1.6 MB", verdict: "拦截", createdAt: "2026-05-13 14:37" },
    { id: "rec2", owner: "母亲 · 李秀芬", phone: "+86 186 6688 7712", duration: "00:54", size: "892 KB", verdict: "预警", createdAt: "2026-05-13 12:21" },
    { id: "rec3", owner: "王磊", phone: "+86 138 0013 4921", duration: "02:18", size: "2.1 MB", verdict: "通过", createdAt: "2026-05-13 09:08" },
    { id: "rec4", owner: "父亲 · 王建国", phone: "+95 9 7712 8830", duration: "00:38", size: "612 KB", verdict: "拦截", createdAt: "2026-05-12 22:45" },
  ],
  managedUsers: <ManagedUser[]>[
    { id: "u1", name: "王磊", role: "admin", dept: "户主", status: "active", email: "wanglei@home.cn", last: "刚刚" },
    { id: "u2", name: "李梦楠", role: "operator", dept: "夫人", status: "active", email: "limengnan@home.cn", last: "12 分钟前" },
    { id: "u3", name: "王建国", role: "viewer", dept: "父亲", status: "active", email: "—", last: "1 小时前" },
    { id: "u4", name: "李秀芬", role: "viewer", dept: "母亲", status: "review", email: "—", last: "今天 09:24" },
  ],
  appeals: <Appeal[]>[
    { id: "ap1", type: "误判申诉", number: "+86 138 8800 1234", reason: "客户经理常用号码，被误判为话术诈骗。", status: "处理中", createdAt: "2026-05-13 10:21" },
    { id: "ap2", type: "号码举报", number: "+855 23 8123 4551", reason: "AI 合成冒充孙子，已造成损失，附录音证据。", status: "已通过", createdAt: "2026-05-12 16:08" },
    { id: "ap3", type: "误判申诉", number: "+86 010 5566 7788", reason: "为公司前台座机，请加入企业白名单。", status: "已通过", createdAt: "2026-05-11 11:42" },
  ],
  callLogs: <CallLog[]>[
    { id: "cl1", phone: "+86 138 0013 4921", region: "北京 · 联通", duration: "02:18", verdict: "通过", reason: "白名单 · 已通过验证", createdAt: "2026-05-13 14:37" },
    { id: "cl2", phone: "+855 23 8123 4551", region: "柬埔寨 · 金边", duration: "00:08", verdict: "拦截", reason: "AI 合成 0.94 · 自动挂断", createdAt: "2026-05-13 12:21" },
    { id: "cl3", phone: "+86 186 6688 7712", region: "缅甸 · 仰光", duration: "00:46", verdict: "预警", reason: "命中转账话术 · 已弹窗", createdAt: "2026-05-13 11:08" },
    { id: "cl4", phone: "+84 28 6677 2210", region: "越南 · 胡志明", duration: "00:12", verdict: "拦截", reason: "信令层伪冒 · 自动挂断", createdAt: "2026-05-13 09:24" },
    { id: "cl5", phone: "+86 173 1234 5678", region: "北京 · 移动", duration: "03:55", verdict: "通过", reason: "可信联系人", createdAt: "2026-05-12 22:45" },
  ],
  devices: <Device[]>[
    { id: "d1", name: "海淀反诈中心 · 网关 01", tenant: "杭州反诈中心", type: "企业端", status: "online", version: "v2.6.1", lastSeen: "1 分钟前", contact: "周珩" },
    { id: "d2", name: "建设银行 95533 · 集群", tenant: "建设银行", type: "企业端", status: "online", version: "v2.6.1", lastSeen: "1 分钟前", contact: "刘旭东" },
    { id: "d3", name: "中国联通安全部 · 探针", tenant: "中国联通", type: "企业端", status: "warn", version: "v2.5.4", lastSeen: "8 分钟前", contact: "陈安怡" },
    { id: "d4", name: "王磊家 · 智能盒子", tenant: "王磊家", type: "家庭端", status: "online", version: "v2.6.0", lastSeen: "刚刚", contact: "王磊" },
    { id: "d5", name: "李梦楠家 · 智能盒子", tenant: "李梦楠家", type: "家庭端", status: "offline", version: "v2.5.4", lastSeen: "3 小时前", contact: "李梦楠" },
    { id: "d6", name: "张伟家 · 手机端", tenant: "张伟家", type: "家庭端", status: "online", version: "v2.6.1", lastSeen: "2 分钟前", contact: "张伟" },
  ],
  audit: <AuditLog[]>[
    { id: "a1", ts: "2026-05-13 14:37:21", actor: "周珩", action: "新增黑名单", target: "+855 23 8123 4551", result: "成功" },
    { id: "a2", ts: "2026-05-13 14:21:08", actor: "李梦楠", action: "调整风控等级", target: "L3 → L4", result: "成功" },
    { id: "a3", ts: "2026-05-13 13:42:11", actor: "刘旭东", action: "上传声纹模型", target: "voiceguard-v2.6.1.onnx", result: "成功" },
    { id: "a4", ts: "2026-05-13 11:08:24", actor: "陈安怡", action: "删除录音", target: "rec-20260513-1108", result: "成功" },
    { id: "a5", ts: "2026-05-13 10:21:55", actor: "王磊", action: "提交申诉", target: "+86 138 8800 1234", result: "成功" },
    { id: "a6", ts: "2026-05-13 09:14:32", actor: "周珩", action: "尝试登录", target: "192.168.10.4", result: "失败" },
  ],
  voiceModels: <VoiceModel[]>[
    { id: "vm1", version: "voiceguard-v2.6.1", accuracy: 99.24, size: "184 MB", uploadedAt: "2026-05-10", active: true },
    { id: "vm2", version: "voiceguard-v2.5.4", accuracy: 98.81, size: "180 MB", uploadedAt: "2026-04-22", active: false },
    { id: "vm3", version: "voiceguard-v2.5.0", accuracy: 98.32, size: "176 MB", uploadedAt: "2026-03-15", active: false },
  ],
};
