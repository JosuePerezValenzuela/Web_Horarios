"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useAuth as useAppAuth } from "@/features/auth/application/useAuth"
import {
  LayoutDashboard,
  Users,
  Calendar,
  LogOut,
  MapPin,
  AlertCircle,
  ClipboardList,
  Settings2,
} from "lucide-react"

interface SidebarItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const defaultSidebarItems: SidebarItem[] = [
  {
    title: "Inicio",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Docentes",
    href: "/docentes",
    icon: Users,
  },
  {
    title: "Horarios",
    href: "/horarios",
    icon: Calendar,
  },
  {
    title: "Reservas",
    href: "/reservas",
    icon: MapPin,
  },
  {
    title: "Solapamientos",
    href: "/solapamientos",
    icon: AlertCircle,
  },
  {
    title: "Partes Diarios",
    href: "/partes-diarios",
    icon: ClipboardList,
  },
  {
    title: "Reglas Asistencia",
    href: "/configuracion-reglas-asistencia",
    icon: Settings2,
  },
]

interface SidebarProps {
  sidebarItems?: SidebarItem[]
  pathname?: string // 🔧 Ruta activa enviada por el framework
  useAuth?: () => {
    hasToken: boolean
    cargando: boolean
    cerrarSesion: () => void
  }
  systemName?: string // 🔧 Opcional por si quieren cambiar el nombre del sistema por prop
  SystemIcon?: React.ComponentType<{ className?: string }> // 🔧 Permite inyectar el icono del sistema
  LinkComponent?: React.ElementType
}

export function Sidebar({
  sidebarItems = defaultSidebarItems,
  pathname: propPathname,
  useAuth: propUseAuth,
  systemName = "Horarios",
  LinkComponent = Link,
}: SidebarProps) {
  const localPathname = usePathname()
  const pathname = propPathname ?? localPathname

  const { isAuthenticated, isLoading, logout } = useAppAuth()

  const defaultUseAuth = () => {
    return {
      hasToken: isAuthenticated,
      cargando: isLoading,
      cerrarSesion: async () => {
        try {
          const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"
          await fetch(`${backendUrl}/auth/logout`, { credentials: "include" })
        } catch (error) {
          console.error("Error en logout:", error)
        }
        logout()
        window.location.href = "/"
      },
    }
  }

  const { hasToken, cargando, cerrarSesion } = propUseAuth ? propUseAuth() : defaultUseAuth()

  const [isHovered, setIsHovered] = useState(false)
  const NavigationLink = LinkComponent

  if (cargando || !hasToken) return null

  return (
    <>
      {/* 1. COMPORTAMIENTO MÓVIL */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-umss-side-bg border-t border-border z-50 flex justify-around items-center px-2 shadow-lg">
        {sidebarItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <NavigationLink
              key={item.title}
              href={item.href}
              target={item.href.startsWith("http") ? "_blank" : "_self"}
              className={`flex flex-col items-center justify-center grow py-1 rounded-xl transition-all ${
                isActive
                  ? "text-[#002855] dark:text-blue-400 font-bold scale-105"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : "stroke-2"}`} />
              <span className="text-[10px] mt-1 tracking-tight truncate max-w-17.5">
                {item.title.split(" ")[0]}
              </span>
            </NavigationLink>
          )
        })}

        <button
          onClick={cerrarSesion}
          className="flex flex-col items-center justify-center grow py-1 text-[#BC000C] rounded-xl cursor-pointer"
          title="Cerrar Sesión"
        >
          <LogOut className="w-5 h-5 stroke-2" />
          <span className="text-[10px] mt-1 tracking-tight">Salir</span>
        </button>
      </div>

      {/* 2. COMPORTAMIENTO ESCRITORIO */}
      <div className="hidden md:block w-16 shrink-0 transition-all duration-300 ease-in-out" />

      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`hidden md:block fixed top-16 left-0 z-40 h-[calc(100vh-4rem)] overflow-hidden transition-all duration-300 ease-in-out bg-umss-side-bg border-r border-border ${
          isHovered ? "w-64 shadow-2xl" : "w-16"
        }`}
      >
        <div className="h-full px-3 py-4 flex flex-col justify-between">
          <div className="flex flex-col">
            {/* 💻 Identidad Dinámica del Sistema */}
            <div
              className={`flex items-center border-b border-border pb-2 transition-all duration-300 ${
                isHovered ? "gap-3 px-3" : "justify-center px-0"
              }`}
            >
              <div className="relative w-8 h-8 shrink-0 flex items-center justify-center">
                <Image
                  src="/umss1.png"
                  alt="Escudo UMSS"
                  width={32}
                  height={32}
                  className="object-contain"
                  priority
                />
              </div>
              <div
                className={`flex flex-col whitespace-nowrap transition-all duration-300 ${
                  isHovered
                    ? "opacity-100 translate-x-0"
                    : "opacity-0 -translate-x-4 pointer-events-none absolute"
                }`}
              >
                <span className="text-xs font-black text-[#001B47] dark:text-white leading-none uppercase tracking-wide">
                  {systemName}
                </span>
                <span className="text-[11px] font-bold text-[#BC000C]">SAN SIMÓN</span>
              </div>
            </div>

            {/* Links del Menú */}
            <div className="mt-4">
              <p
                className={`px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider transition-all duration-200 ${
                  isHovered ? "opacity-100 max-h-6 mb-2" : "opacity-0 max-h-0 overflow-hidden mb-0"
                }`}
              >
                Menú
              </p>
              <ul className="space-y-1">
                {sidebarItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href

                  return (
                    <li key={item.title}>
                      <NavigationLink
                        href={item.href}
                        target={item.href.startsWith("http") ? "_blank" : "_self"}
                        className={`w-full flex items-center text-sm font-bold rounded-lg transition-all duration-200 group py-3 ${
                          isHovered ? "px-3 justify-start gap-3" : "px-0 justify-center"
                        } ${isActive ? "bg-[#002855] text-white" : "text-[#001B47] dark:text-gray-300 hover:bg-umss-side-hover"}`}
                      >
                        <Icon
                          className={`w-5 h-5 shrink-0 transition-colors ${
                            isActive
                              ? "text-white"
                              : "text-[#003770] dark:text-blue-400 group-hover:text-[#BC000C]"
                          }`}
                        />
                        <span
                          className={`whitespace-nowrap transition-all duration-300 ${isHovered ? "opacity-100" : "opacity-0 absolute pointer-events-none"}`}
                        >
                          {item.title}
                        </span>
                      </NavigationLink>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>

          {/* Footer del Sidebar con Logout */}
          <div className="pt-4 border-t border-border flex flex-col gap-2">
            {/* Botón de Logout estilizado de forma nativa */}
            <button
              onClick={cerrarSesion}
              className={`w-full flex items-center text-sm font-bold text-[#BC000C] hover:text-[#870009] hover:bg-red-50 dark:hover:bg-red-950/30 py-3 rounded-lg transition-all cursor-pointer ${
                isHovered ? "px-3 justify-start gap-3" : "px-0 justify-center"
              }`}
            >
              <LogOut className="w-5 h-5 shrink-0" />
              <span
                className={`whitespace-nowrap ${isHovered ? "opacity-100" : "opacity-0 absolute"}`}
              >
                CERRAR SESIÓN
              </span>
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
