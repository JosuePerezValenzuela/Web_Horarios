"use client"

/**
 * AppLayout Component
 * Main layout with Sidebar + TopHeader + Content area
 * Used for all protected routes (except login)
 * Sidebar is fixed, only main content scrolls
 */

import type { ReactNode } from "react"
import { Sidebar } from "./Sidebar"
import { TopHeader } from "./TopHeader"
import { useUIStore } from "@/shared/stores/uiStore"
import { cn } from "@/lib/utils"

interface AppLayoutProps {
  children: ReactNode
  breadcrumbs?: Array<{
    name: string
    href?: string
  }>
  className?: string
}

export function AppLayout({ children, breadcrumbs, className }: AppLayoutProps) {
  const { sidebarCollapsed } = useUIStore()

  return (
    <div className="flex flex-col min-h-screen font-sans">
      {/* Top Header - Full width at top */}
      <TopHeader breadcrumbs={breadcrumbs} />

      {/* Main container with sidebar as fixed */}
      <div className="flex-1">
        {/* Sidebar - fixed position, doesn't scroll */}
        <div
          className={cn(
            "fixed left-0 top-16 bottom-0 z-20 transition-all duration-300 overflow-hidden",
            sidebarCollapsed ? "w-16" : "w-64"
          )}
        >
          <Sidebar />
        </div>

        {/* Main Content - scrolls independently */}
        <main
          className={cn(
            "pt-6 px-6 lg:px-8 xl:px-12 overflow-y-auto",
            sidebarCollapsed ? "ml-16" : "ml-64",
            className
          )}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
