"use client"

/**
 * TopHeader Component
 * Header with breadcrumbs and user actions
 */

import { useAuth } from "@/features/auth/application/useAuth"
import { cn } from "@/lib/utils"
import { Menu, Moon, Bell, HelpCircle, User, LogOut } from "lucide-react"

interface TopHeaderProps {
  className?: string
  breadcrumbs?: Array<{
    name: string
    href?: string
  }>
}

export function TopHeader({ className, breadcrumbs = [] }: TopHeaderProps) {
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    window.location.href = "/login"
  }

  return (
    <header
      className={cn(
        "fixed top-0 right-0 h-16 bg-white/80 backdrop-blur-md z-40 border-b border-stone-100 shadow-sm shadow-black/5 font-sans text-sm tracking-wide",
        className
      )}
    >
      <div className="flex items-center justify-between px-8 h-full">
        {/* Left: Breadcrumb */}
        <div className="flex items-center gap-4">
          <button className="text-muted-foreground hover:text-primary transition-colors flex items-center justify-center">
            <Menu className="w-5 h-5" />
          </button>
          <div className="font-semibold text-primary hidden sm:block">Sistema de Horarios UMSS</div>
          <div className="hidden md:flex items-center text-sm ml-4 border-l border-outline-variant/20 pl-4 gap-2 text-muted-foreground">
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
        <div className="flex items-center gap-4">
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
          <div className="flex items-center gap-2 ml-2">
            <div className="w-8 h-8 rounded-full bg-surface-container-high border border-outline-variant/10 overflow-hidden flex items-center justify-center text-muted-foreground">
              <User className="w-5 h-5" />
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
