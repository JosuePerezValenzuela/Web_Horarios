"use client"

/**
 * TopHeader Component
 * Header with toggle sidebar, breadcrumbs and user actions
 */

import { useAuth } from "@/features/auth/application/useAuth"
import { useUIStore } from "@/shared/stores/uiStore"
import { cn } from "@/lib/utils"
import { Moon, Bell, HelpCircle, User, LogOut, PanelLeftClose, PanelLeft } from "lucide-react"

interface TopHeaderProps {
  className?: string
  breadcrumbs?: Array<{
    name: string
    href?: string
  }>
}

export function TopHeader({ className, breadcrumbs = [] }: TopHeaderProps) {
  const { logout } = useAuth()
  const { sidebarCollapsed, toggleSidebar } = useUIStore()

  const handleLogout = () => {
    logout()
    window.location.href = "/login"
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-30 h-16 bg-white/80 backdrop-blur-md border-b border-stone-100 shadow-sm font-sans text-sm tracking-wide",
        className
      )}
    >
      <div className="flex items-center justify-between px-4 md:px-6 lg:px-8 h-full">
        {/* Left: Toggle + System Name + Breadcrumbs */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Toggle Sidebar Button */}
          <button
            onClick={toggleSidebar}
            className="text-muted-foreground hover:text-primary transition-colors flex items-center justify-center"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? (
              <PanelLeft className="w-5 h-5" />
            ) : (
              <PanelLeftClose className="w-5 h-5" />
            )}
          </button>

          {/* System Name - hidden on small screens */}
          <div className="font-semibold text-primary hidden md:block">Sistema de Horarios UMSS</div>

          {/* Breadcrumbs - hidden on small screens */}
          <div className="hidden lg:flex items-center text-sm border-l border-outline-variant/20 pl-4 gap-2 text-muted-foreground">
            <a className="hover:text-primary transition-colors" href="/dashboard">
              Inicio
            </a>
            {breadcrumbs.map((crumb, index) => (
              <span key={index} className="flex items-center gap-2">
                <span className="text-outline-variant text-xs">/</span>
                {crumb.href ? (
                  <a className="hover:text-primary transition-colors" href={crumb.href}>
                    {crumb.name}
                  </a>
                ) : (
                  <span className="text-primary font-medium">{crumb.name}</span>
                )}
              </span>
            ))}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Mobile Breadcrumb */}
          <div className="lg:hidden flex items-center text-sm text-muted-foreground">
            {breadcrumbs.length > 0 && (
              <span className="font-medium">{breadcrumbs[breadcrumbs.length - 1].name}</span>
            )}
          </div>

          <button className="text-muted-foreground hover:text-primary transition-colors flex items-center justify-center">
            <Moon className="w-5 h-5" />
          </button>
          <button className="text-muted-foreground hover:text-primary transition-colors flex items-center justify-center">
            <Bell className="w-5 h-5" />
          </button>
          <button className="text-muted-foreground hover:text-primary transition-colors flex items-center justify-center">
            <HelpCircle className="w-5 h-5" />
          </button>

          {/* Profile + Logout */}
          <div className="flex items-center gap-2 ml-1">
            <div className="w-8 h-8 rounded-full bg-surface-container-high border border-outline-variant/10 overflow-hidden flex items-center justify-center text-muted-foreground">
              <User className="w-5 h-5" />
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1 hidden sm:flex"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
