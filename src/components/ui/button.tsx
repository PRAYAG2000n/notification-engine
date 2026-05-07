import { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800",
        secondary:
          "bg-surface-100 text-surface-700 hover:bg-surface-200 active:bg-surface-300",
        ghost: "text-surface-600 hover:bg-surface-100 hover:text-surface-800",
        danger: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800",
        outline:
          "border border-surface-300 text-surface-700 hover:bg-surface-50",
      },
      size: {
        sm: "h-8 px-3 text-xs gap-1.5",
        md: "h-9 px-4 gap-2",
        lg: "h-11 px-6 text-base gap-2.5",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
