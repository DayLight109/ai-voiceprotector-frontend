import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] transition-colors",
  {
    variants: {
      variant: {
        default: "border-border bg-secondary text-secondary-foreground",
        outline: "border-foreground/30 bg-transparent text-foreground",
        destructive:
          "border-vermillion/40 bg-vermillion/10 text-vermillion",
        olive:
          "border-olive/40 bg-olive/10 text-olive",
        caramel:
          "border-caramel/45 bg-caramel/15 text-[color-mix(in_oklab,var(--caramel)_75%,black_25%)]",
        ink:
          "border-foreground bg-foreground text-background",
        muted:
          "border-transparent bg-muted text-muted-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
