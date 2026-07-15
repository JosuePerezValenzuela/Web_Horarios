"use client"

/**
 * UI Store for global UI state (sidebar, etc.)
 */

import { create } from "zustand"

interface UIState {
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void

  // CopilotKit states
  copilotSidebarOpen: boolean
  toggleCopilotSidebar: () => void
  setCopilotSidebarOpen: (open: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  // CopilotKit actions and states
  copilotSidebarOpen: false,
  toggleCopilotSidebar: () => set((state) => ({ copilotSidebarOpen: !state.copilotSidebarOpen })),
  setCopilotSidebarOpen: (open) => set({ copilotSidebarOpen: open }),
}))
