"use client"

import type { ReactNode } from "react"
import { Sidebar } from "./Sidebar"
import { TopHeader } from "./TopHeader"
import { cn } from "@/lib/utils"

import { CustomCopilotSidebar } from "./CustomCopilotSidebar"
import { useUIStore } from "@/shared/stores/uiStore"

interface AppLayoutProps {
  children: ReactNode
  breadcrumbs?: Array<{
    name: string
    href?: string
  }>
  className?: string
}

export function AppLayout({ children, breadcrumbs, className }: AppLayoutProps) {
  const { copilotSidebarOpen, toggleCopilotSidebar } = useUIStore()

  return (
    <div className="flex flex-col min-h-screen font-sans bg-background h-screen overflow-hidden">
      {/* Top Header - Full width at top */}
      <TopHeader breadcrumbs={breadcrumbs} />

      {/* Main container - flex layout horizontal */}
      <div className="flex flex-1 pt-16 overflow-hidden">
        {/* Sidebar - fixed + spacing inside */}
        <Sidebar />

        {/* Content container - Main + Custom Pushing Sidebar */}
        <div className="flex-1 flex overflow-hidden relative">
          <main
            className={cn(
              "flex-1 pt-6 px-6 lg:px-8 xl:px-12 overflow-y-auto pb-20 md:pb-6 transition-all duration-300",
              className
            )}
          >
            {children}
          </main>

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
      </div>
    </div>
  )
}
