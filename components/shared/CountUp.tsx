"use client";
import { useEffect, useRef, useState } from "react";

export default function CountUp({
  to,
  duration = 900,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
}: {
  to: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    let cancelled = false;
    let rafId: number | null = null;
    let started = false;

    const animate = () => {
      const start = performance.now();
      const step = (t: number) => {
        if (cancelled) return;
        const p = Math.min(1, (t - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        setVal(to * eased);
        if (p < 1) rafId = requestAnimationFrame(step);
      };
      rafId = requestAnimationFrame(step);
    };

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !started) {
          started = true;
          animate();
        }
      },
      { threshold: 0.25 }
    );
    obs.observe(node);

    return () => {
      cancelled = true;
      if (rafId != null) cancelAnimationFrame(rafId);
      obs.disconnect();
    };
  }, [to, duration]);

  const formatted = decimals > 0 ? val.toFixed(decimals) : Math.round(val).toLocaleString();
  return <span ref={ref} className={className}>{prefix}{formatted}{suffix}</span>;
}
