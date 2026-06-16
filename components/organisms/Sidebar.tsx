"use client"

/**
 * Sidebar Component
 * Navigation sidebar with collapse functionality
 */

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useUIStore } from "@/shared/stores/uiStore"
import { useAuth } from "@/features/auth/application/useAuth"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  FileText,
  FileBarChart,
  User,
  LogOut,
  Calendar,
} from "lucide-react"

interface SidebarProps {
  className?: string
}

const navItems = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Docentes",
    href: "/docentes",
    icon: Users,
  },
  {
    name: "Horarios",
    href: "/horarios",
    icon: Calendar,
  },
  {
    name: "Partes Diarias",
    href: "/partes-diarias",
    icon: FileText,
  },
  {
    name: "Partes Consolidadas",
    href: "/partes-consolidadas",
    icon: FileBarChart,
  },
]

const bottomNavItems = [
  {
    name: "Perfil",
    href: "/perfil",
    icon: User,
  },
  {
    name: "Cerrar sesión",
    href: "/login",
    icon: LogOut,
  },
]

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const { sidebarCollapsed } = useUIStore()
  const { logout } = useAuth()

  return (
    <aside
      className={cn(
        "h-full pt-6 bg-muted flex flex-col border-r border-border font-sans transition-all duration-300 overflow-hidden",
        sidebarCollapsed ? "w-16" : "w-64",
        className
      )}
    >
      <div
        className={cn("flex flex-col h-full justify-between", sidebarCollapsed ? "px-1" : "px-3")}
      >
        {/* Brand */}
        <div>
          <div className={cn("px-3", sidebarCollapsed ? "px-2 text-center" : "")}>
            <h1
              className={cn(
                "font-bold tracking-tighter text-primary uppercase",
                sidebarCollapsed ? "text-xs" : "text-lg"
              )}
            >
              UMSS
            </h1>
            {!sidebarCollapsed && (
              <p className="text-sm text-muted-foreground">Sistema de Horarios</p>
            )}
          </div>

          {/* Navigation Links */}
          <nav className={cn("flex flex-col space-y-1 mt-4", sidebarCollapsed ? "px-1" : "px-2")}>
            {navItems.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "transition-all flex items-center gap-3 rounded-lg",
                    isActive
                      ? "bg-muted text-primary font-semibold border-l-4 border-primary"
                      : "text-muted-foreground hover:text-primary hover:bg-muted",
                    sidebarCollapsed ? "justify-center px-2 py-3" : "px-4 py-3 mx-2"
                  )}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {!sidebarCollapsed && <span>{item.name}</span>}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Footer Links */}
        <div className={cn("border-t border-border pt-4", sidebarCollapsed ? "px-1" : "px-2")}>
          <nav className="flex flex-col space-y-1">
            {bottomNavItems.map((item) => {
              const Icon = item.icon
              if (item.name === "Cerrar sesión") {
                const handleLogout = (e: React.MouseEvent) => {
                  e.preventDefault()
                  logout()
                  const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"
                  window.location.href = `${backendUrl}/auth/logout`
                }
                return (
                  <button
                    key={item.name}
                    onClick={handleLogout}
                    className={cn(
                      "transition-all flex items-center gap-3 rounded-lg w-full text-left",
                      "text-muted-foreground hover:text-primary hover:bg-muted",
                      sidebarCollapsed ? "justify-center px-2 py-3" : "px-4 py-3 mx-2"
                    )}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    {!sidebarCollapsed && <span>{item.name}</span>}
                  </button>
                )
              }
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "transition-all flex items-center gap-3 rounded-lg",
                    "text-muted-foreground hover:text-primary hover:bg-muted",
                    sidebarCollapsed ? "justify-center px-2 py-3" : "px-4 py-3 mx-2"
                  )}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {!sidebarCollapsed && <span>{item.name}</span>}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>
    </aside>
  )
}
