"use client"

import type { ReactNode } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  LayoutDashboard,
  Users,
  Calendar,
  AlertCircle,
  ClipboardList,
  Settings2,
  CalendarDays,
} from "lucide-react"
import { Layout, ScrollArea } from "@umss/estilos-base/components"
import { useAuth as useAppAuth } from "@/features/auth/application/useAuth"
import { cn } from "@/lib/utils"

const defaultSidebarItems = [
  {
    title: "Inicio",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Docentes",
    href: "/docentes",
    icon: Users,
  },
  {
    title: "Horarios",
    href: "/horarios",
    icon: Calendar,
  },
  {
    title: "Solapamientos",
    href: "/solapamientos",
    icon: AlertCircle,
  },
  {
    title: "Partes Diarios",
    href: "/partes-diarios",
    icon: ClipboardList,
  },
  {
    title: "Partes Mensuales",
    href: "/partes-mensuales",
    icon: CalendarDays,
  },
  {
    title: "Reglas Asistencia",
    href: "/configuracion-reglas-asistencia",
    icon: Settings2,
  },
]

interface AppLayoutProps {
  children: ReactNode
  breadcrumbs?: Array<{
    name: string
    href?: string
  }>
  className?: string
  disablePageScroll?: boolean
}

export function AppLayout({ children, className, disablePageScroll = false }: AppLayoutProps) {
  const pathname = usePathname()
  const { isAuthenticated, isLoading, user, logout } = useAppAuth()

  const useAuthAdapter = () => {
    return {
      hasToken: isAuthenticated,
      cargando: isLoading,
      userData: user ? { name: user.name, email: user.email } : null,
      cerrarSesion: async () => {
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"
        logout()
        window.location.href = `${backendUrl}/auth/logout`
      },
    }
  }

  return (
    <Layout
      useAuth={useAuthAdapter}
      pathname={pathname}
      sidebarItems={defaultSidebarItems}
      systemName="Horarios"
      logoSrc="/umss1.png"
      LinkComponent={Link}
      toggleThemeAnimationType="circle-spread"
      mainClassName="h-[calc(100vh-4rem)] overflow-hidden flex flex-col relative"
    >
      <div className="relative flex-1 h-full w-full flex overflow-hidden">
        {/* If page handles its own layout/scroll (e.g. tables with internal scroll), avoid ScrollArea */}
        {disablePageScroll ? (
          <div className="flex-1 h-full w-full min-h-0 min-w-0 overflow-y-auto overflow-x-hidden flex flex-col">
            <div
              className={cn(
                "flex-1 min-h-0 min-w-0 min-h-full lg:h-full w-full max-w-full flex flex-col",
                className
              )}
            >
              {children}
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1 h-full w-full" data-slot="layout-scroll-area">
            <div className={cn("p-4 md:p-6 lg:p-8", className)}>{children}</div>
          </ScrollArea>
        )}
      </div>
    </Layout>
  )
}
