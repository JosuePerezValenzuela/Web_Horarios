"use client"

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
    <div className="flex flex-col min-h-screen font-sans bg-background">
      {/* Top Header - Full width at top */}
      <TopHeader breadcrumbs={breadcrumbs} />

      {/* Main container - flex layout horizontal */}
      <div className="flex flex-1 pt-16">
        {/* Sidebar - fixed + spacing inside */}
        <Sidebar />

        {/* Main Content - scrolls independently */}
        <main
          className={cn(
            "flex-1 pt-6 px-6 lg:px-8 xl:px-12 overflow-y-auto pb-20 md:pb-6",
            className
          )}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
