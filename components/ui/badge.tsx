import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-emerald focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-emerald text-cream hover:bg-emerald-hover",
        secondary:
          "border-charcoal-border bg-charcoal-surface text-cream",
        outline:
          "border-charcoal-border text-cream",
        destructive:
          "border-transparent bg-red-900/60 text-red-200 border-red-700/50",
        success:
          "border-emerald/40 bg-emerald/20 text-emerald-light",
        veg:
          "border-green-600/40 bg-green-950/40 text-green-400 font-medium",
        nonveg:
          "border-red-600/40 bg-red-950/40 text-red-400 font-medium",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
