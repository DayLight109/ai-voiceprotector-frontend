"use client";

// components/shared/Skeleton.tsx — 加载骨架组件集
//
// 配合 lib/use-resource.ts：页面在 list.loading（且 items 为空）时渲染骨架，
// 形状贴近真实卡片/行，避免首屏「空→有」跳动。骨架用 .animate-pulse，
// 会被「降低动画」开关（[data-reduce-motion]）正确压制为静态占位。
//
// 形态：
//   <SkeletonBar />           单条占位（宽高可调）
//   <CardGridSkeleton />      卡片网格（samples / 样本库等 grid 页）
//   <ListRowSkeleton />       横向行列表（模型版本 / 表格类）
//   <StatCardsSkeleton />     顶部统计卡

import { cn } from "@/lib/utils";

export function SkeletonBar({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md", className)} style={{ background: "var(--canvas-3)" }} />;
}

/** 单张卡片骨架：标题条 + 几行文本 + 底部按钮区，贴近 panel 卡片 */
export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between mb-3">
        <SkeletonBar className="h-3 w-24" />
        <SkeletonBar className="h-5 w-16 rounded-full" />
      </div>
      <div className="flex items-center gap-2 mb-3">
        <SkeletonBar className="h-6 w-20 rounded-full" />
        <SkeletonBar className="h-3 w-16" />
      </div>
      <div className="space-y-2 mb-4 p-3 rounded-xl" style={{ background: "var(--canvas-2)" }}>
        {Array.from({ length: lines }).map((_, i) => (
          <SkeletonBar key={i} className={cn("h-3", i === lines - 1 ? "w-2/3" : "w-full")} />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <SkeletonBar className="h-9 flex-1 rounded-full" />
        <SkeletonBar className="h-9 w-16 rounded-full" />
      </div>
    </div>
  );
}

/** 卡片网格骨架，列数/数量可调 */
export function CardGridSkeleton({
  count = 4,
  cols = "grid-cols-1 md:grid-cols-2",
  lines = 3,
}: {
  count?: number;
  cols?: string;
  lines?: number;
}) {
  return (
    <div className={cn("grid gap-4", cols)} aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} lines={lines} />
      ))}
    </div>
  );
}

/** 横向行骨架：图标 + 主副文本 + 右侧数值/操作，贴近列表行 */
export function ListRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-2" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 rounded-2xl border border-border">
          <SkeletonBar className="w-11 h-11 rounded-2xl shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <SkeletonBar className="h-3.5 w-1/3" />
            <SkeletonBar className="h-2.5 w-1/2" />
          </div>
          <SkeletonBar className="h-8 w-20 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  );
}

/** 简易小卡网格（声纹样本库那种 4 列小卡） */
export function MiniCardGridSkeleton({
  count = 8,
  cols = "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
}: {
  count?: number;
  cols?: string;
}) {
  return (
    <div className={cn("grid gap-3", cols)} aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 rounded-2xl border border-border space-y-3">
          <div className="flex items-center gap-2">
            <SkeletonBar className="h-3.5 w-3.5 rounded" />
            <SkeletonBar className="h-3 w-16" />
          </div>
          <SkeletonBar className="h-3 w-3/4" />
          <SkeletonBar className="h-2.5 w-1/3" />
        </div>
      ))}
    </div>
  );
}

/** 顶部统计卡骨架 */
export function StatCardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="panel p-6 space-y-3">
          <SkeletonBar className="h-3 w-20" />
          <SkeletonBar className="h-9 w-24" />
          <SkeletonBar className="h-2.5 w-32" />
        </div>
      ))}
    </div>
  );
}

/** 详情字段骨架（useSingle 单实体页） */
export function FieldsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-5" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-6 py-4 border-b border-border last:border-0">
          <div className="space-y-2 flex-1">
            <SkeletonBar className="h-3.5 w-28" />
            <SkeletonBar className="h-2.5 w-40" />
          </div>
          <SkeletonBar className="h-9 w-40 rounded-xl shrink-0" />
        </div>
      ))}
    </div>
  );
}
