import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/shared/utils/index"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none transition-all duration-200 overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-blue-500 text-white [a&]:hover:bg-blue-600 shadow-sm",
        secondary:
          "border-transparent bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 [a&]:hover:bg-gray-200 dark:[a&]:hover:bg-gray-600",
        destructive:
          "border-transparent bg-red-500 text-white [a&]:hover:bg-red-600 shadow-sm",
        warning:
          "border-transparent bg-amber-500 text-white [a&]:hover:bg-amber-600 shadow-sm",
        success:
          "border-transparent bg-green-500 text-white [a&]:hover:bg-green-600 shadow-sm",
        outline:
          "bg-transparent border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 [a&]:hover:bg-gray-50 dark:[a&]:hover:bg-gray-800 [a&]:hover:border-gray-400 dark:[a&]:hover:border-gray-500",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
