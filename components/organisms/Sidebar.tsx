"use client"

/**
 * Sidebar Component
 * Navigation sidebar fixed to the left
 */

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  Calendar,
  ClipboardList,
  FileBarChart,
  Settings,
  User,
  LogOut,
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
    name: "Asignaciones",
    href: "/asignaciones",
    icon: ClipboardList,
  },
  {
    name: "Reportes",
    href: "/reportes",
    icon: FileBarChart,
  },
  {
    name: "Administración",
    href: "/admin",
    icon: Settings,
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
    action: true,
  },
]

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen w-64 bg-surface-container-low flex flex-col border-r border-outline-variant/10 font-sans",
        className
      )}
    >
      <div className="flex flex-col h-full justify-between py-6">
        {/* Brand */}
        <div>
          <div className="px-6 pb-8">
            <h1 className="text-lg font-bold tracking-tighter text-primary uppercase">
              UMSS Schedule
            </h1>
            <p className="text-sm text-muted-foreground">Institutional Archive</p>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col space-y-1 px-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "px-4 py-3 transition-all flex items-center gap-3 mx-2 rounded-lg",
                    isActive
                      ? "bg-muted text-primary font-semibold border-l-4 border-primary"
                      : "text-muted-foreground hover:text-primary hover:bg-muted"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Footer Links */}
        <div className="px-2 mt-auto border-t border-outline-variant/10 pt-4">
          <nav className="flex flex-col space-y-1">
            {bottomNavItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "px-4 py-3 transition-all flex items-center gap-3 mx-2 rounded-lg",
                    "text-muted-foreground hover:text-primary hover:bg-muted"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>
    </aside>
  )
}
