"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Menu, X, ArrowUpRight, Activity } from "lucide-react";

const NAV = [
  { href: "#crisis", label: "现状" },
  { href: "#defense", label: "三层防御" },
  { href: "#simulator", label: "拦截流程" },
  { href: "#compare", label: "对比" },
  { href: "#policy", label: "政策" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const itemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sections = NAV
      .map((n) => document.getElementById(n.href.slice(1)))
      .filter((el): el is HTMLElement => el !== null);

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActive("#" + visible[0].target.id);
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
    );

    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const measure = useCallback(() => {
    if (!active || !navRef.current) {
      setIndicator(null);
      return;
    }
    const el = itemRefs.current[active];
    if (!el) return;
    const navRect = navRef.current.getBoundingClientRect();
    const itemRect = el.getBoundingClientRect();
    setIndicator({ left: itemRect.left - navRect.left, width: itemRect.width });
  }, [active]);

  useEffect(() => {
    measure();
  }, [measure]);

  // 字号 / 窗口变化会改变导航项宽度，高亮指示器需随之重测，否则错位
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

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "backdrop-blur-xl bg-canvas/80 border-b border-border"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="max-w-[1400px] mx-auto px-5 md:px-8 h-16 flex items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-3 group">
          <div
            className="w-9 h-9 rounded-2xl flex items-center justify-center shadow-md"
            style={{ background: "linear-gradient(135deg, var(--indigo), var(--indigo-deep))" }}
          >
            <span className="font-display text-white text-[calc(14px*var(--fz))] font-extrabold">S</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-[calc(19px*var(--fz))] font-extrabold tracking-tight">
              SENTINEL
            </span>
            <span className="font-mono text-[calc(11px*var(--fz))] text-ink-soft">/ 声纹捕手</span>
          </div>
        </Link>

        <nav
          ref={navRef}
          className="hidden lg:flex relative items-center gap-1 p-1 rounded-full bg-surface border border-border shadow-sm"
        >
          {indicator && (
            <span
              aria-hidden
              className="absolute top-1 bottom-1 rounded-full transition-all duration-500 ease-out pointer-events-none"
              style={{
                left: indicator.left,
                width: indicator.width,
                backgroundColor: "#5B5FDE",
              }}
            />
          )}
          {NAV.map((n) => {
            const isActive = active === n.href;
            return (
              <a
                key={n.href}
                href={n.href}
                ref={(el) => {
                  itemRefs.current[n.href] = el;
                }}
                onClick={() => setActive(n.href)}
                className={`relative z-10 px-4 py-1.5 rounded-full text-[calc(13px*var(--fz))] font-semibold transition-colors duration-300 ${
                  isActive
                    ? "text-white"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                {n.label}
              </a>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/ops/health"
            className="hidden md:inline-flex items-center gap-1.5 text-[calc(13px*var(--fz))] font-semibold text-ink-soft hover:text-ink transition-colors"
            title="服务运维监测"
          >
            <Activity size={14} />
            运维监测
          </Link>
          <Link href="/login" className="hidden md:inline-flex text-[calc(13px*var(--fz))] font-semibold text-ink-soft hover:text-ink transition-colors">
            登录
          </Link>
          <Link href="/warroom" className="btn-primary text-[calc(13px*var(--fz))] py-2 px-4">
            <span className="dot" />
            指挥中心
            <ArrowUpRight size={14} />
          </Link>
          <button
            onClick={() => setOpen(!open)}
            className="lg:hidden w-10 h-10 rounded-full border border-border flex items-center justify-center bg-surface"
            aria-label="菜单"
          >
            {open ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-border bg-surface">
          <div className="max-w-[1400px] mx-auto px-5 py-4 flex flex-col gap-1">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="px-4 py-3 rounded-xl text-[calc(14px*var(--fz))] font-semibold hover:bg-canvas-2"
              >
                {n.label}
              </a>
            ))}
            <Link
              href="/ops/health"
              onClick={() => setOpen(false)}
              className="px-4 py-3 rounded-xl text-[calc(14px*var(--fz))] font-semibold hover:bg-canvas-2 flex items-center gap-2"
            >
              <Activity size={14} />
              运维监测
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
