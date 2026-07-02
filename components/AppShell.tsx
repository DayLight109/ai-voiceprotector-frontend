"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Bell, Search, ChevronRight, ShieldCheck } from "lucide-react";
import { ToastProvider } from "./shared/Toast";
import { roleHomePath, useAuth } from "@/lib/auth";

type NavItem = { href: string; label: string; icon: any; badge?: string | number };
export type AppRole = "family" | "admin" | "biz" | "family-admin" | "sysadmin";

const ROLE_LABEL: Record<AppRole, string> = {
  family: "家庭用户",
  biz: "企业用户",
  admin: "企业管理员",
  "family-admin": "家庭管理员",
  sysadmin: "系统管理员",
};

export default function AppShell({
  role,
  userName,
  nav,
  children,
  breadcrumb,
}: {
  role: AppRole;
  userName?: string;
  nav: NavItem[];
  children: React.ReactNode;
  breadcrumb: string[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, status } = useAuth();
  const roleLabel = ROLE_LABEL[role];
  const requiredRole = role === "family-admin" ? "family_admin" : role;
  const enforceRole = pathname !== "/settings";
  const isFamilyPortal = role === "family" || role === "family-admin" || role === "biz";
  const useDarkSidebar = true;
  const familyFontStyle = isFamilyPortal
    ? { fontFamily: "var(--font-plus-jakarta), var(--font-noto-sans), system-ui, sans-serif" }
    : undefined;

  const navRef = useRef<HTMLElement | null>(null);
  const itemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [indicator, setIndicator] = useState<{ top: number; height: number } | null>(null);
  const [primed, setPrimed] = useState(false);

  const measure = useCallback(() => {
    if (!navRef.current) return;
    const activeHref = nav.find((n) => pathname === n.href)?.href ?? null;
    if (!activeHref) {
      setIndicator(null);
      return;
    }
    const el = itemRefs.current[activeHref];
    if (!el) return;
    const navRect = navRef.current.getBoundingClientRect();
    const itemRect = el.getBoundingClientRect();
    setIndicator({ top: itemRect.top - navRect.top + navRef.current.scrollTop, height: itemRect.height });
  }, [pathname, nav]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    const navEl = navRef.current;
    if (!navEl || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(navEl);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  useEffect(() => {
    const t = setTimeout(() => setPrimed(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (status === "anonymous") {
      router.replace("/login");
      return;
    }
    if (enforceRole && status === "authenticated" && user && user.role !== requiredRole) {
      router.replace(roleHomePath(user.role));
    }
  }, [enforceRole, requiredRole, router, status, user]);

  if (status === "loading" || !user || (enforceRole && user.role !== requiredRole)) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${isFamilyPortal ? "bg-canvas text-ink" : "bg-canvas text-ink"}`}
        style={familyFontStyle}
      >
        <div className="font-mono text-[calc(11px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">
          VERIFYING SESSION
        </div>
      </div>
    );
  }

  const displayName = user.name?.trim() || userName?.trim() || roleLabel;
  const initials = displayName.slice(0, 1);

  return (
    <ToastProvider>
      <div
        className={`relative min-h-screen flex ${useDarkSidebar ? "dark-shell" : ""} ${isFamilyPortal ? "family-portal overflow-hidden bg-canvas text-ink" : "bg-canvas text-ink"}`}
        style={familyFontStyle}
      >
        {isFamilyPortal && (
          <>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(203,219,245,0.42),transparent_31%),linear-gradient(180deg,#f8f9ff_0%,#eef4ff_100%)] dark:hidden" />
            <div className="pointer-events-none absolute right-[-130px] top-[-90px] h-[320px] w-[320px] rounded-full bg-[radial-gradient(circle,rgba(188,199,222,0.48),transparent_68%)] blur-3xl dark:hidden" />
            <div className="pointer-events-none absolute bottom-[-180px] right-[15%] h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,rgba(216,227,251,0.78),transparent_72%)] blur-3xl dark:hidden" />
          </>
        )}

        <aside className={`relative hidden shrink-0 flex-col lg:flex ${useDarkSidebar ? "w-[252px] border-r border-[#11161f] bg-black text-white" : "w-[260px] border-r border-border bg-surface"}`}>
          {useDarkSidebar ? (
            <>
              <div className="pointer-events-none absolute inset-x-0 top-0 h-[180px] bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.09),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0)_100%)]" />

              <div className="relative px-7 py-8">
                <Link href="/" className="flex items-center gap-3 group">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/18 bg-white shadow-[0_12px_24px_rgba(0,0,0,0.24)] transition-transform duration-300 group-hover:-translate-y-0.5">
                    <ShieldCheck size={21} className="text-black" strokeWidth={2.2} />
                  </span>
                  <div>
                    <div className="text-[19px] font-extrabold tracking-[-0.01em] text-white">
                      SENTINEL
                    </div>
                    <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#9fb0cb]">
                      {roleLabel}
                    </div>
                  </div>
                </Link>
              </div>

              <div className="relative flex flex-1 flex-col overflow-hidden bg-black text-white">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(85,240,230,0.12),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0)_32%)]" />
                <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-[linear-gradient(180deg,transparent,rgba(255,255,255,0.12),transparent)]" />

                <nav ref={navRef} className="relative flex-1 overflow-y-auto px-4 py-4 space-y-1.5">
                  {indicator && (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute left-4 right-4 rounded-xl"
                      style={{
                        top: indicator.top,
                        height: indicator.height,
                        background: "rgba(255,255,255,0.11)",
                        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
                        opacity: primed ? 1 : 0,
                        transition:
                          "top 380ms cubic-bezier(0.22,1,0.36,1), height 380ms cubic-bezier(0.22,1,0.36,1), opacity 240ms ease-out",
                      }}
                    />
                  )}
                  {nav.map((n) => {
                    const active = pathname === n.href;
                    return (
                      <Link
                        key={n.href}
                        href={n.href}
                        ref={(el) => {
                          itemRefs.current[n.href] = el;
                        }}
                        className="relative z-10 flex items-center gap-3 rounded-xl px-4 py-3 text-[14px] font-semibold transition-colors duration-300 hover:bg-white/[0.05]"
                        style={{
                          color: active ? "#f8fbff" : "#9fb0cb",
                        }}
                      >
                        <n.icon size={16} />
                        <span className="flex-1">{n.label}</span>
                        {n.badge && (
                          <span
                            className="px-2 py-1 font-mono text-[10px] font-extrabold"
                            style={{
                              background: "rgba(255,107,107,0.16)",
                              color: "#ffd6d6",
                            }}
                          >
                            {n.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </nav>

                <div className="relative p-4 pt-3">
                  <Link
                    href="/settings"
                    className="flex items-center gap-3 border border-white/10 bg-white/[0.06] p-4 shadow-[0_18px_36px_rgba(0,0,0,0.18)] transition-colors hover:bg-white/[0.08]"
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center font-display text-white font-extrabold"
                      style={{
                        background: "linear-gradient(135deg, #37d99c, #8fa6d7)",
                      }}
                    >
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-[14px] font-extrabold text-white">{displayName}</div>
                      <div className="mt-1 truncate text-[11px] font-bold uppercase tracking-[0.14em] text-[#8ea1c1]">{roleLabel}</div>
                    </div>
                    <ChevronRight size={14} className="text-[#8ea1c1]" />
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="p-6 border-b border-border">
                <Link href="/" className="flex items-center gap-3 group">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center font-display text-white font-extrabold shadow-md"
                    style={{ background: "linear-gradient(135deg, var(--indigo), var(--indigo-deep))" }}
                  >
                    S
                  </div>
                  <div>
                    <div className="font-display text-[calc(15px*var(--fz))] font-extrabold">SENTINEL</div>
                    <div className="font-mono text-[calc(9px*var(--fz))] uppercase tracking-[0.18em] text-ink-soft font-bold">{roleLabel}</div>
                  </div>
                </Link>
              </div>

              <nav ref={navRef} className="relative flex-1 overflow-y-auto p-4 space-y-1">
                {indicator && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute left-4 right-4 rounded-xl"
                    style={{
                      top: indicator.top,
                      height: indicator.height,
                      background: "var(--indigo-soft)",
                      opacity: primed ? 1 : 0,
                      transition:
                        "top 380ms cubic-bezier(0.22,1,0.36,1), height 380ms cubic-bezier(0.22,1,0.36,1), opacity 240ms ease-out",
                    }}
                  />
                )}
                {nav.map((n) => {
                  const active = pathname === n.href;
                  return (
                    <Link
                      key={n.href}
                      href={n.href}
                      ref={(el) => {
                        itemRefs.current[n.href] = el;
                      }}
                      className="relative z-10 flex items-center gap-3 px-3 py-2.5 rounded-xl text-[calc(13px*var(--fz))] font-semibold transition-colors duration-300"
                      style={{
                        color: active ? "var(--indigo-deep)" : "var(--ink-2)",
                      }}
                    >
                      <n.icon size={16} />
                      <span className="flex-1">{n.label}</span>
                      {n.badge && (
                        <span
                          className="px-1.5 py-0.5 rounded-full font-mono text-[calc(10px*var(--fz))] font-extrabold"
                          style={{
                            background: "var(--coral)",
                            color: "#fff",
                          }}
                        >
                          {n.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>

              <div className="p-4 border-t border-border">
                <Link href="/settings" className="flex items-center gap-3 p-3 rounded-xl hover:bg-canvas-2 transition-colors">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center font-display text-white font-extrabold"
                    style={{ background: "linear-gradient(135deg, var(--mint-deep), var(--indigo))" }}
                  >
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-[calc(13px*var(--fz))] font-extrabold truncate">{displayName}</div>
                    <div className="font-mono text-[calc(10px*var(--fz))] text-ink-soft font-bold truncate">{roleLabel}</div>
                  </div>
                  <ChevronRight size={14} className="text-ink-soft" />
                </Link>
              </div>
            </>
          )}
        </aside>

        <div className="relative flex-1 flex min-w-0 flex-col">
          <header className={`sticky top-0 z-20 ${isFamilyPortal ? "border-b border-border bg-canvas/88 backdrop-blur-xl" : "bg-canvas/85 backdrop-blur-xl border-b border-border"}`}>
            <div className={`flex items-center justify-between gap-4 ${isFamilyPortal ? "h-[78px] px-5 md:px-8" : "px-6 md:px-8 h-16"}`}>
              <div className={`flex items-center gap-2 overflow-hidden font-bold ${isFamilyPortal ? "text-[11px] uppercase tracking-[0.14em] text-ink-soft" : "font-mono text-[calc(11px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft"}`}>
                {breadcrumb.map((b, i) => (
                  <span key={i} className="flex items-center gap-2">
                    {i > 0 && <span className={isFamilyPortal ? "text-ink-ghost" : "text-ink-ghost"}>/</span>}
                    <span
                      style={{
                        color:
                          i === breadcrumb.length - 1
                            ? "var(--ink)"
                            : "var(--ink-soft)",
                      }}
                    >
                      {b}
                    </span>
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <div className={`hidden md:flex items-center gap-2 w-72 transition-shadow ${isFamilyPortal ? "search-pill h-11 rounded-full border border-border bg-surface px-4 shadow-[0_10px_24px_rgba(9,20,38,0.06)]" : "search-pill px-3 py-2 rounded-full bg-canvas-2 border border-border"}`}>
                  <Search size={14} className={isFamilyPortal ? "text-ink-soft" : "text-ink-soft"} />
                  <input
                    type="text"
                    placeholder="搜索告警、策略、号码..."
                    className={`flex-1 bg-transparent font-medium focus:outline-none ${isFamilyPortal ? "text-[13px] text-ink placeholder:text-ink-ghost" : "text-[calc(13px*var(--fz))] placeholder:text-ink-ghost"}`}
                  />
                  <span className={`font-bold ${isFamilyPortal ? "rounded-full bg-[var(--indigo-soft)] px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-[var(--indigo-deep)]" : "font-mono text-[calc(10px*var(--fz))] px-1.5 py-0.5 rounded bg-surface border border-border text-ink-soft"}`}>⌘K</span>
                </div>
                <button className={`relative flex items-center justify-center transition-colors ${isFamilyPortal ? "h-11 w-11 rounded-full border border-border bg-surface text-ink shadow-[0_10px_24px_rgba(9,20,38,0.06)] hover:bg-canvas-2" : "w-10 h-10 rounded-full bg-surface border border-border hover:bg-canvas-2"}`}>
                  <Bell size={15} />
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full" style={{ background: isFamilyPortal ? "var(--mint)" : "var(--coral)" }} />
                </button>
              </div>
            </div>
          </header>

          <main key={pathname} className={`relative flex-1 page-enter ${isFamilyPortal ? "px-5 py-6 md:px-8 md:py-8" : "p-6 md:p-8"}`}>
            {children}
          </main>
        </div>
        {useDarkSidebar && !isFamilyPortal && (
          <style jsx global>{`
            .dark-shell .btn-indigo {
              background: #071426;
              box-shadow: 0 18px 36px rgba(9, 20, 38, 0.2);
            }
            .dark-shell .btn-indigo:hover {
              background: #0b1c30;
            }
          `}</style>
        )}
        {isFamilyPortal && (
          <style jsx global>{`
            .family-portal .btn-indigo {
              background: linear-gradient(135deg, var(--indigo), var(--indigo-deep));
              box-shadow: 0 16px 32px rgba(91, 95, 222, 0.28);
            }
            .family-portal .btn-indigo:hover {
              background: linear-gradient(135deg, var(--indigo-deep), #3f43b8);
              box-shadow: 0 20px 40px rgba(91, 95, 222, 0.34);
            }
            .family-portal .btn-ghost {
              background: #ffffff;
              border-color: #d3d6df;
              color: #0b1c30;
              box-shadow: 0 10px 24px rgba(9, 20, 38, 0.06);
            }
            .family-portal .btn-ghost:hover {
              background: #eff4ff;
              border-color: var(--indigo);
            }
          `}</style>
        )}
      </div>
    </ToastProvider>
  );
}
