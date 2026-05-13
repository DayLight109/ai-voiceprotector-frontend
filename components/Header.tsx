"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X, ArrowUpRight } from "lucide-react";

const NAV = [
  { href: "#crisis", label: "现状" },
  { href: "#defense", label: "三层防御" },
  { href: "#simulator", label: "实战演示" },
  { href: "#compare", label: "对比" },
  { href: "#policy", label: "政策" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
            <span className="font-display text-white text-[14px] font-extrabold">S</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-[19px] font-extrabold tracking-tight">
              SENTINEL
            </span>
            <span className="font-mono text-[11px] text-ink-soft">/ 声纹捕手</span>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-1 p-1 rounded-full bg-surface border border-border shadow-sm">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="px-4 py-1.5 rounded-full text-[13px] font-semibold text-ink-soft hover:text-ink hover:bg-canvas-2 transition-all"
            >
              {n.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/login" className="hidden md:inline-flex text-[13px] font-semibold text-ink-soft hover:text-ink transition-colors">
            登录
          </Link>
          <Link href="/warroom" className="btn-primary text-[13px] py-2 px-4">
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
                className="px-4 py-3 rounded-xl text-[14px] font-semibold hover:bg-canvas-2"
              >
                {n.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
