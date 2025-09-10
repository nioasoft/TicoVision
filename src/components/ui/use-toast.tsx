import * as React from "react"
import { toast as sonnerToast } from "sonner"

interface ToastProps {
  title?: string
  description?: string
  variant?: "default" | "destructive"
  action?: React.ReactNode
}

export function useToast() {
  const toast = ({ title, description, variant = "default", ...props }: ToastProps) => {
    const message = title || description || ""
    
    if (variant === "destructive") {
      sonnerToast.error(message, {
        description: title ? description : undefined,
        ...props
      })
    } else {
      sonnerToast.success(message, {
        description: title ? description : undefined,
        ...props
      })
    }
  }

  return { toast }
}