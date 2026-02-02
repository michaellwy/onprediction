import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow",
        outline: "text-foreground",
        // Category variants
        fundamentals: "border-transparent bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
        design: "border-transparent bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
        microstructure: "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
        platforms: "border-transparent bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
        applications: "border-transparent bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
        business: "border-transparent bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
        commentary: "border-transparent bg-slate-100 text-slate-800 dark:bg-slate-800/30 dark:text-slate-300",
        // Difficulty variants
        beginner: "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
        intermediate: "border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
        advanced: "border-transparent bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
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
