"use client"

/**
 * AppLayout Component
 * Main layout with Sidebar + TopHeader + Content area
 * Used for all protected routes (except login)
 * Uses flexbox for responsive layout
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

      {/* Main container - flex row below header */}
      <div className="flex flex-1">
        {/* Sidebar - flex item, shrinks only */}
        <div
          className={cn(
            "shrink-0 transition-all duration-300 overflow-hidden",
            sidebarCollapsed ? "w-16" : "w-64"
          )}
        >
          <Sidebar />
        </div>

        {/* Main Content - flex item, grows to fill space */}
        <main className={cn("flex-1 py-6 px-6 lg:px-8 xl:px-12 overflow-y-auto", className)}>
          {children}
        </main>
      </div>
    </div>
  )
}
