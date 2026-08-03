"use client"

import type { ReactNode } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { LayoutDashboard, Users, Calendar, MapPin, AlertCircle, ClipboardList } from "lucide-react"
import { Layout } from "@umss/estilos-base/components"
import { useAuth as useAppAuth } from "@/features/auth/application/useAuth"
import { useUIStore } from "@/shared/stores/uiStore"
import { CustomCopilotSidebar } from "./CustomCopilotSidebar"

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
    title: "Reservas",
    href: "/reservas",
    icon: MapPin,
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
]

interface AppLayoutProps {
  children: ReactNode
  breadcrumbs?: Array<{
    name: string
    href?: string
  }>
  className?: string
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname()
  const { isAuthenticated, isLoading, user, logout } = useAppAuth()
  const { copilotSidebarOpen, toggleCopilotSidebar } = useUIStore()

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
    >
      <div className="relative flex-1 h-full w-full">
        {children}

        {/* Custom Sidebar Panel that is absolute on mobile, relative (pushing) on desktop */}
        {copilotSidebarOpen && (
          <div className="absolute inset-y-0 right-0 w-full sm:w-[400px] lg:relative lg:inset-auto lg:w-[380px] lg:sm:w-[400px] border-l border-border h-full bg-white dark:bg-[#1a1a1a] flex flex-col shrink-0 animate-in slide-in-from-right duration-300 z-40 shadow-2xl lg:shadow-none">
            {/* Floating Close Button for Mobile/Tablet */}
            <button
              onClick={toggleCopilotSidebar}
              className="lg:hidden absolute top-3.5 left-4 z-50 p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-500 cursor-pointer shadow-sm text-xs font-bold uppercase transition-all"
              title="Cerrar Asistente"
            >
              Cerrar Chat
            </button>
            <div className="flex-1 h-full pt-12 lg:pt-0 flex flex-col">
              <CustomCopilotSidebar />
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
