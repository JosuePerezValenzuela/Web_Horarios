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
  ShieldCheck,
} from "lucide-react"
import { Layout, ScrollArea } from "@umss/estilos-base/components"
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
  {
    title: "Justificaciones",
    href: "/justificaciones",
    icon: ShieldCheck,
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

  const useAuthAdapter = () => {
    return {
      hasToken: true,
      cargando: false,
      userData: null,
      cerrarSesion: () => {
        window.location.href = "/login"
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
