"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Gauge,
  House,
  Lock,
  Network,
  ShieldCheck,
  UserRound,
  Eye,
  EyeOff,
} from "lucide-react";
import { useAuth, roleHomePath } from "@/lib/auth";
import { APIError } from "@/lib/api";
import { AuthVisualPanel } from "@/components/AuthVisualPanel";
import familyLoginImage from "@/photopack/jiating01.jpg";
import enterpriseLoginImage from "@/photopack/qiye01.jpeg";

type Role = "enterprise" | "family";

export default function LoginPage() {
  const router = useRouter();
  const { login, logout } = useAuth();
  const [role, setRole] = useState<Role>("family");
  const [show, setShow] = useState(false);
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const content = role === "enterprise"
    ? {
        account: "企业账号 / 邮箱",
        placeholder: "请输入企业账号或邮箱",
        title: "登录企业控制台",
        subtitle: "输入企业账户凭证，进入 SENTINEL 管理与策略中枢。",
        sideTitle: "企业级反诈中枢，开箱即接入。",
        body: "SENTINEL 将来电溯源、声纹取证与话术语义判定接入企业防护链路，让客服、风控与管理团队在同一个安全中枢里完成处置。",
        image: enterpriseLoginImage,
        cards: [
          { icon: Gauge, title: "毫秒级判决", body: "API 对接运营商 / 金融风控，通话接入后快速完成风险判定。" },
          { icon: Network, title: "集中策略矩阵", body: "统一管理员工账号、角色权限和企业黑白名单策略。" },
          { icon: House, title: "证据链留存", body: "判决过程、录音策略和审计日志按权限加密留存。" },
        ],
      }
    : {
        account: "手机号 / 身份证",
        placeholder: "请输入手机号或身份证号",
        title: "欢迎回家",
        subtitle: "用手机号或身份证登录，开启家人的声纹守护。",
        sideTitle: "让每一位家人都活在算法的保护里。",
        body: "声纹捕手在陌生来电进入的瞬间并行检查信令来源、声纹特征和高风险话术，尽量把危险挡在家人接听之前。",
        image: familyLoginImage,
        cards: [
          { icon: Gauge, title: "毫秒级响应", body: "识别高风险来电后即时提醒、拦截或同步给紧急联系人。" },
          { icon: Network, title: "三层判决机制", body: "来电溯源、声纹取证、话术语义并行工作，减少单点误判。" },
          { icon: House, title: "家庭安心防护", body: "老人手机托管、家属同步告警，关键时刻不再错过。" },
        ],
      };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!account.trim() || !password) {
      setError("请输入账号和密码");
      return;
    }
    setLoading(true);
    try {
      const user = await login(account.trim(), password);
      const allowed = role === "enterprise"
        ? user.role === "biz" || user.role === "admin"
        : user.role === "family" || user.role === "family_admin";
      if (!allowed) {
        await logout();
        setError("账号或密码错误");
        return;
      }
      router.push(roleHomePath(user.role));
    } catch (e) {
      if (e instanceof APIError) {
        setError(messageForAuthError(e));
      } else {
        setError("网络异常，请稍后再试");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="min-h-dvh overflow-x-hidden bg-[#f8f9ff] text-[#0b1c30] login-replica"
      style={{ fontFamily: "var(--font-plus-jakarta), var(--font-noto-sans), system-ui, sans-serif" }}
    >
      <div className="grid min-h-dvh lg:grid-cols-[clamp(500px,37.5vw,600px)_minmax(0,1fr)]">
        <section className="relative flex min-h-dvh flex-col bg-[#f8f9ff] px-[clamp(28px,3.125vw,50px)] py-[clamp(28px,3.9vh,50px)]">
          <Link href="/" className="group flex w-fit items-center gap-[14px] text-[#101828]">
            <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#071426] shadow-[0_12px_24px_rgba(9,20,38,0.18)] transition-transform duration-300 group-hover:-translate-y-0.5">
              <ShieldCheck size={22} className="text-white" strokeWidth={2.2} />
            </span>
            <span className="text-[19px] font-semibold tracking-[-0.01em]">声纹捕手</span>
          </Link>

          <div className="mx-auto mt-[clamp(60px,11vh,142px)] w-full max-w-[400px]">
            <div className="space-y-[12px]">
              <h1 className="text-[clamp(28px,2vw,33px)] font-extrabold leading-[1.14] tracking-[-0.025em] text-[#0b1c30]">
                {content.title}
              </h1>
              <p className="text-[15px] font-normal leading-[1.6] tracking-[0.005em] text-[#5b6475]">
                {content.subtitle}
              </p>
            </div>

            <div className="relative mt-[clamp(26px,3.4vh,42px)] grid h-[54px] grid-cols-2 rounded-full bg-[#dfeaff] p-[5px] shadow-[inset_0_0_0_1px_rgba(19,38,68,0.06)]">
              <span
                aria-hidden
                className="absolute bottom-[5px] left-[5px] top-[5px] rounded-full bg-white shadow-[0_8px_22px_rgba(30,41,59,0.12)] transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
                style={{
                  width: "calc(50% - 5px)",
                  transform: role === "enterprise" ? "translateX(100%)" : "translateX(0)",
                }}
              />
              <button
                type="button"
                onClick={() => setRole("family")}
                className={`relative z-10 rounded-full text-[15px] font-semibold tracking-[0.01em] transition-colors duration-200 ${role === "family" ? "text-[#091426]" : "text-[#737d92]"}`}
              >
                家庭用户
              </button>
              <button
                type="button"
                onClick={() => setRole("enterprise")}
                className={`relative z-10 rounded-full text-[15px] font-semibold tracking-[0.01em] transition-colors duration-200 ${role === "enterprise" ? "text-[#091426]" : "text-[#737d92]"}`}
              >
                企业用户
              </button>
            </div>

            <form className="mt-[clamp(26px,3vh,38px)]" onSubmit={onSubmit}>
              <label className="block text-[12px] font-bold uppercase tracking-[0.09em] text-[#5b6475]">
                {content.account}
              </label>
              <div className="relative mt-[10px]">
                <UserRound
                  size={20}
                  className="absolute left-[22px] top-1/2 -translate-y-1/2 text-[#aab0bd]"
                  strokeWidth={2}
                />
                <input
                  type="text"
                  autoComplete="username"
                  placeholder={content.placeholder}
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  className="h-[58px] w-full rounded-full border border-[#d3d6df] bg-white pl-[54px] pr-6 text-[16px] font-medium tracking-[0] text-[#0b1c30] shadow-[0_1px_2px_rgba(30,41,59,0.04)] outline-none transition duration-200 placeholder:text-[#b9beca] placeholder:font-normal focus:border-[#091426] focus:shadow-[0_2px_8px_rgba(9,20,38,0.08)] focus:ring-4 focus:ring-[#d8e3fb]"
                />
              </div>

              <div className="mt-[clamp(18px,2.1vh,26px)]">
                <label className="block text-[12px] font-bold uppercase tracking-[0.09em] text-[#5b6475]">
                  安全密码
                </label>
                <div className="relative mt-[10px]">
                  <Lock
                    size={20}
                    className="absolute left-[22px] top-1/2 -translate-y-1/2 text-[#aab0bd]"
                    strokeWidth={2}
                  />
                  <input
                    type={show ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-[58px] w-full rounded-full border border-[#d3d6df] bg-white pl-[54px] pr-[58px] text-[16px] font-semibold tracking-[0] text-[#0b1c30] shadow-[0_1px_2px_rgba(30,41,59,0.04)] outline-none transition duration-200 placeholder:text-[#b9beca] placeholder:font-normal focus:border-[#091426] focus:shadow-[0_2px_8px_rgba(9,20,38,0.08)] focus:ring-4 focus:ring-[#d8e3fb]"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    className="absolute right-[16px] top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-[#aab0bd] transition hover:bg-[#eff4ff] hover:text-[#091426]"
                    aria-label={show ? "隐藏密码" : "显示密码"}
                  >
                    {show ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mt-5 rounded-[18px] border border-[#f1b8b8] bg-[#ffeded] px-5 py-[14px] text-[14px] font-medium text-[#93000a]"
                >
                  {error}
                </div>
              )}

              <div className="mt-[clamp(22px,2.5vh,30px)] flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-[10px] text-[14px] font-medium tracking-[0] text-[#3c475a]">
                  <input type="checkbox" defaultChecked className="peer sr-only" />
                  <span className="h-[20px] w-[20px] rounded-full border-[2px] border-[#c1c5ce] bg-white transition peer-checked:border-[#091426] peer-checked:bg-[#091426] peer-checked:shadow-[inset_0_0_0_5px_#fff]" />
                  记住我
                </label>
                <button
                  type="button"
                  className="text-[14px] font-semibold tracking-[0] text-[#3c475a] transition hover:text-[#091426]"
                >
                  忘记密码？
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-[clamp(22px,2.4vh,30px)] h-[58px] w-full rounded-full bg-[#071426] text-[16px] font-bold tracking-[0.02em] text-white shadow-[0_14px_28px_rgba(9,20,38,0.22)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#0b1c30] hover:shadow-[0_18px_34px_rgba(9,20,38,0.28)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "登入中…" : "安全登入"}
              </button>
            </form>

            <div className="mt-[clamp(24px,3vh,38px)] text-center text-[14px] font-medium tracking-[0] text-[#5b6475]">
              尚未开启防护？
              <Link href="/register" className="ml-2 font-semibold text-[#091426] transition hover:text-[#545f73]">
                新用户注册
              </Link>
            </div>
          </div>

          <div className="mt-auto pt-10 text-[13px] font-medium uppercase tracking-[0.08em] text-[#8a909c]">
            © 2026 SENTINEL 声纹捕手 · 实时 AI 语音反诈平台
          </div>
        </section>

        <AuthVisualPanel content={content} />
      </div>
    </main>
  );
}

function messageForAuthError(e: APIError): string {
  switch (e.code) {
    case "AUTH_INVALID_CREDENTIALS":
      return "账号或密码错误";
    case "AUTH_USER_SUSPENDED":
      return "账号已被停用，请联系管理员";
    case "AUTH_ACCOUNT_LOCKED":
      return "登录尝试过多，请稍后再试";
    case "VALIDATION_FAILED":
      return e.message || "输入校验失败";
    case "RATE_LIMITED":
      return "登录尝试过于频繁，请稍后再试";
    default:
      return e.message || "登录失败，请稍后再试";
  }
}
