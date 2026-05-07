import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-brand-100 text-brand-800",
        urgent: "bg-red-100 text-red-800",
        high: "bg-orange-100 text-orange-800",
        normal: "bg-surface-200 text-surface-700",
        low: "bg-surface-100 text-surface-500",
        success: "bg-emerald-100 text-emerald-800",
        outline: "border border-surface-300 text-surface-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
