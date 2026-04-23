"use client"

/**
 * AppLayout Component
 * Main layout with Sidebar + TopHeader + Content area
 * Used for all protected routes (except login)
 */

import type { ReactNode } from "react"
import { Sidebar } from "./Sidebar"
import { TopHeader } from "./TopHeader"
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
  return (
    <div className="min-h-screen font-['Inter']">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Wrapper */}
      <div className="ml-64 flex flex-col min-h-screen">
        {/* Top Header */}
        <TopHeader breadcrumbs={breadcrumbs} />

        {/* Main Canvas */}
        <main className={cn("flex-1 mt-16 p-8 lg:p-12 overflow-y-auto", className)}>
          {children}
        </main>
      </div>
    </div>
  )
}
