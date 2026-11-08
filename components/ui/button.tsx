import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        default:
          "bg-emerald text-cream hover:bg-emerald-hover shadow-sm active:scale-[0.98]",
        secondary:
          "bg-charcoal-surface text-cream border border-charcoal-border hover:bg-charcoal-border/70",
        outline:
          "border border-charcoal-border bg-transparent text-cream hover:bg-charcoal-card hover:border-charcoal-muted",
        ghost:
          "text-cream/90 hover:bg-charcoal-surface hover:text-cream",
        destructive:
          "bg-red-600/90 text-white hover:bg-red-600 focus-visible:ring-red-500",
        cream:
          "bg-cream text-charcoal-dark hover:bg-cream-muted font-semibold shadow-sm active:scale-[0.98]",
        link:
          "text-emerald underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-lg px-8 text-base",
        icon: "h-9 w-9 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
