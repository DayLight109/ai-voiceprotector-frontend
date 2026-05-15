"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Bell, Search, ChevronRight } from "lucide-react";
import { ToastProvider } from "./shared/Toast";

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
  userName: string;
  nav: NavItem[];
  children: React.ReactNode;
  breadcrumb: string[];
}) {
  const pathname = usePathname();
  const roleLabel = ROLE_LABEL[role];
  const initials = userName.slice(0, 1);

  const navRef = useRef<HTMLElement | null>(null);
  const itemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [indicator, setIndicator] = useState<{ top: number; height: number } | null>(null);
  const [primed, setPrimed] = useState(false);

  useLayoutEffect(() => {
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

  useEffect(() => {
    const t = setTimeout(() => setPrimed(true), 60);
    return () => clearTimeout(t);
  }, []);

  return (
    <ToastProvider>
    <div className="min-h-screen bg-canvas text-ink flex">
      {/* 侧栏 */}
      <aside className="hidden lg:flex w-[260px] shrink-0 border-r border-border bg-surface flex-col">
        <div className="p-6 border-b border-border">
          <Link href="/" className="flex items-center gap-3 group">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center font-display text-white font-extrabold shadow-md"
              style={{ background: "linear-gradient(135deg, var(--indigo), var(--indigo-deep))" }}
            >
              S
            </div>
            <div>
              <div className="font-display text-[15px] font-extrabold">SENTINEL</div>
              <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-soft font-bold">{roleLabel}</div>
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
                className="relative z-10 flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-colors duration-300"
                style={{
                  color: active ? "var(--indigo-deep)" : "var(--ink-2)",
                }}
              >
                <n.icon size={16} />
                <span className="flex-1">{n.label}</span>
                {n.badge && (
                  <span
                    className="px-1.5 py-0.5 rounded-full font-mono text-[10px] font-extrabold"
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
              <div className="font-display text-[13px] font-extrabold truncate">{userName}</div>
              <div className="font-mono text-[10px] text-ink-soft font-bold truncate">{roleLabel}</div>
            </div>
            <ChevronRight size={14} className="text-ink-soft" />
          </Link>
        </div>
      </aside>

      {/* 主体 */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-canvas/85 backdrop-blur-xl border-b border-border">
          <div className="px-6 md:px-8 h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft font-bold overflow-hidden">
              {breadcrumb.map((b, i) => (
                <span key={i} className="flex items-center gap-2">
                  {i > 0 && <span className="text-ink-ghost">/</span>}
                  <span style={{ color: i === breadcrumb.length - 1 ? "var(--ink)" : "var(--ink-soft)" }}>{b}</span>
                </span>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-full bg-canvas-2 border border-border w-72">
                <Search size={14} className="text-ink-soft" />
                <input
                  type="text"
                  placeholder="搜索告警、策略、号码…"
                  className="flex-1 bg-transparent text-[13px] font-medium placeholder:text-ink-ghost focus:outline-none"
                />
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface border border-border text-ink-soft font-bold">⌘K</span>
              </div>
              <button className="relative w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center hover:bg-canvas-2 transition-colors">
                <Bell size={15} />
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full" style={{ background: "var(--coral)" }} />
              </button>
            </div>
          </div>
        </header>

        <main key={pathname} className="flex-1 p-6 md:p-8 page-enter">{children}</main>
      </div>
    </div>
    </ToastProvider>
  );
}
