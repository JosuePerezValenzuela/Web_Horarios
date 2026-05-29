"use client"

import { useTheme } from "next-themes"
import { Toaster as SonnerToaster, toast as rawToast } from "sonner"
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react"
import * as React from "react"

type ToastType = "success" | "error" | "info" | "warning" | "default"

interface CustomToastProps {
  message: string | React.ReactNode
  description?: string | React.ReactNode
  type: ToastType
  duration?: number
  id: string | number
}

function CustomToast({ message, description, type, duration = 4000, id }: CustomToastProps) {
  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />,
    error: <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />,
    info: <Info className="h-5 w-5 text-blue-500 shrink-0" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />,
    default: <Info className="h-5 w-5 text-muted-foreground shrink-0" />,
  }

  const borderColors = {
    success: "border-green-500/20 dark:border-green-500/30",
    error: "border-red-500/20 dark:border-red-500/30",
    info: "border-blue-500/20 dark:border-blue-500/30",
    warning: "border-amber-500/20 dark:border-amber-500/30",
    default: "border-border",
  }

  const bgColors = {
    success: "bg-green-50/50 dark:bg-green-950/20",
    error: "bg-red-50/50 dark:bg-red-950/20",
    info: "bg-blue-50/50 dark:bg-blue-950/20",
    warning: "bg-amber-50/50 dark:bg-amber-950/20",
    default: "bg-background/80",
  }

  const progressColors = {
    success: "bg-green-500",
    error: "bg-red-500",
    info: "bg-blue-500",
    warning: "bg-amber-500",
    default: "bg-muted-foreground/40",
  }

  return (
    <div
      className={`group relative flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border ${borderColors[type]} ${bgColors[type]} p-4 shadow-lg backdrop-blur-md transition-all duration-300 hover:shadow-xl`}
    >
      <div className="flex items-start gap-3">
        {icons[type]}
        <div className="flex-1 space-y-1">
          <div className="text-sm font-semibold text-foreground/95 leading-tight">{message}</div>
          {description && (
            <div className="text-xs text-muted-foreground leading-normal">{description}</div>
          )}
        </div>
        <button
          onClick={() => rawToast.dismiss(id)}
          className="text-muted-foreground/60 hover:text-foreground rounded-md p-0.5 transition-colors"
          aria-label="Cerrar notificación"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Progress Bar (synced with Sonner auto-dismiss timer) */}
      <div className="absolute bottom-0 inset-x-0 h-[3px] bg-muted/20">
        <div
          className={`h-full ${progressColors[type]} rounded-r-full animate-toast-progress`}
          style={{
            width: "100%",
            // Passing the custom duration dynamically to the CSS animation using a custom property
            // @ts-ignore
            "--toast-duration": `${duration}ms`,
          }}
        />
      </div>
    </div>
  )
}

export const toast = {
  success: (
    message: string | React.ReactNode,
    description?: string | React.ReactNode,
    duration = 4000
  ) => {
    return rawToast.custom(
      (id) => (
        <CustomToast
          id={id}
          message={message}
          description={description}
          type="success"
          duration={duration}
        />
      ),
      { duration }
    )
  },
  error: (
    message: string | React.ReactNode,
    description?: string | React.ReactNode,
    duration = 4000
  ) => {
    return rawToast.custom(
      (id) => (
        <CustomToast
          id={id}
          message={message}
          description={description}
          type="error"
          duration={duration}
        />
      ),
      { duration }
    )
  },
  info: (
    message: string | React.ReactNode,
    description?: string | React.ReactNode,
    duration = 4000
  ) => {
    return rawToast.custom(
      (id) => (
        <CustomToast
          id={id}
          message={message}
          description={description}
          type="info"
          duration={duration}
        />
      ),
      { duration }
    )
  },
  warning: (
    message: string | React.ReactNode,
    description?: string | React.ReactNode,
    duration = 4000
  ) => {
    return rawToast.custom(
      (id) => (
        <CustomToast
          id={id}
          message={message}
          description={description}
          type="warning"
          duration={duration}
        />
      ),
      { duration }
    )
  },
  custom: rawToast.custom,
  dismiss: rawToast.dismiss,
}

export function Toaster({ ...props }: React.ComponentProps<typeof SonnerToaster>) {
  const { theme } = useTheme()

  return (
    <SonnerToaster
      theme={theme as "light" | "dark" | "system"}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "bg-transparent border-0 shadow-none p-0 !bg-none !border-none !shadow-none",
        },
      }}
      {...props}
    />
  )
}
