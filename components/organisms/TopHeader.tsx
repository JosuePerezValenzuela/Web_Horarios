"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { useAuth as useAppAuth } from "@/features/auth/application/useAuth"
import { usePathname } from "next/navigation"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import {
  User,
  LogOut,
  ChevronDown,
  ShieldAlert,
  Check,
  Settings,
  MessageSquare,
} from "lucide-react"
import { useUIStore } from "@/shared/stores/uiStore"

interface TopHeaderProps {
  breadcrumbs?: Array<{
    name: string
    href?: string
  }>
  useAuth?: () => {
    hasToken: boolean
    userData: { name: string; email: string; role?: string } | null
    cerrarSesion: () => void
  }
  logoSrc?: string
  LinkComponent?: React.ElementType
}

export function TopHeader({
  breadcrumbs = [],
  useAuth: propUseAuth,
  logoSrc = "/umss1.png",
  LinkComponent = Link,
}: TopHeaderProps) {
  const pathname = usePathname()
  const { isAuthenticated, user, logout } = useAppAuth()

  const defaultUseAuth = () => {
    return {
      hasToken: isAuthenticated,
      userData: user ? { name: user.name, email: user.email, role: user.role } : null,
      cerrarSesion: async () => {
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"
        logout()
        window.location.href = `${backendUrl}/auth/logout`
      },
    }
  }

  const { hasToken, userData, cerrarSesion } = propUseAuth ? propUseAuth() : defaultUseAuth()

  const { copilotSidebarOpen, toggleCopilotSidebar } = useUIStore()

  const [roles] = useState<string[]>(["Administrador", "Gestor"])
  const [rolActivo, setRolActivo] = useState<string>("Gestor")

  const [prevUserRole, setPrevUserRole] = useState<string | undefined>(undefined)
  if (userData?.role !== prevUserRole) {
    setPrevUserRole(userData?.role)
    setRolActivo(userData?.role || "Gestor")
  }

  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const NavigationLink = LinkComponent

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    if (isDropdownOpen) document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [isDropdownOpen])

  const getInitials = () => {
    if (!userData?.name) return "U"
    const partes = userData.name.trim().split(/\s+/)
    if (partes.length >= 2) {
      return `${partes[0].charAt(0)}${partes[1].charAt(0)}`.toUpperCase()
    }
    return partes[0].charAt(0).toUpperCase()
  }

  const getFirstName = () => {
    if (!userData?.name) return "Usuario"
    return userData.name.trim().split(/\s+/)[0]
  }

  return (
    <nav className="fixed top-0 left-0 w-full h-16 z-50 bg-umss-nav-bg border-b border-border transition-all duration-300">
      <div
        className={`w-full h-full px-6 lg:px-8 flex justify-between items-center transition-all duration-300 ${
          hasToken ? "md:pl-22" : "pl-6"
        }`}
      >
        {/* 🏛️ Identidad Visual con el texto exacto solicitado */}
        <div className="flex items-center gap-2 select-none">
          <NavigationLink href="/" className="flex items-center gap-2 group">
            <div className="relative w-8 h-8 shrink-0">
              <Image
                src={logoSrc}
                alt="Escudo UMSS"
                width={32}
                height={32}
                className="object-contain"
                priority
              />
            </div>

            {/* Vista Escritorio / Tablet: Muestra el bloque de texto apilado en dos líneas */}
            <div className="hidden sm:flex flex-col whitespace-nowrap transition-all duration-300">
              <span className="text-xs font-black text-[#001B47] dark:text-white leading-none tracking-wide">
                UNIVERSIDAD
              </span>
              <span className="text-[11px] font-bold text-[#BC000C] leading-tight tracking-wider mt-0.5">
                SAN SIMÓN
              </span>
            </div>

            {/* Vista Móvil (< 640px): Muestra un texto compacto para que no colisione con los menús */}
            <span className="text-sm font-roboto font-black text-[#001B47] dark:text-white whitespace-nowrap sm:hidden">
              SAN <span className="text-[#BC000C] font-extrabold">SIMÓN</span>
            </span>
          </NavigationLink>

          {/* Breadcrumbs (si existen) */}
          {hasToken && breadcrumbs && breadcrumbs.length > 0 && (
            <div className="hidden lg:flex items-center text-xs border-l border-border pl-4 gap-2 text-gray-400 font-sans ml-4">
              <NavigationLink href="/" className="hover:text-primary transition-colors">
                Inicio
              </NavigationLink>
              {breadcrumbs.map((crumb, index) => (
                <span key={index} className="flex items-center gap-2">
                  <span>/</span>
                  {crumb.href ? (
                    <NavigationLink
                      href={crumb.href}
                      className="hover:text-primary transition-colors"
                    >
                      {crumb.name}
                    </NavigationLink>
                  ) : (
                    <span className="text-gray-600 dark:text-gray-200 font-medium">
                      {crumb.name}
                    </span>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Controles de Navegación del Header */}
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="hidden md:flex items-center gap-6">
            <NavigationLink
              href="/"
              className={`text-sm font-medium hover:text-[#001B47] dark:hover:text-white transition-colors pb-1 ${
                pathname === "/"
                  ? "text-[#001B47] dark:text-white border-b-2 border-[#BC000C]"
                  : "text-gray-700 dark:text-gray-300"
              }`}
            >
              Inicio
            </NavigationLink>
            <NavigationLink
              href="/#contacto"
              className="text-sm text-gray-700 dark:text-gray-300 font-medium hover:text-[#001B47] dark:hover:text-white transition-colors pb-1"
            >
              Contacto
            </NavigationLink>
          </div>

          {/* Toggle de tema (para Desktop) */}
          <div className="hidden md:block">
            <ThemeToggle />
          </div>

          {/* Botón CopilotKit Sidebar */}
          <div className="flex items-center gap-1.5 border-l border-border pl-3">
            <button
              onClick={toggleCopilotSidebar}
              className={`p-2 rounded-xl transition-all cursor-pointer relative group active:scale-95 ${
                copilotSidebarOpen
                  ? "bg-[#002855]/10 dark:bg-blue-400/20 text-[#002855] dark:text-blue-400 font-bold"
                  : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-800"
              }`}
              title="Copilot Sidebar"
            >
              <MessageSquare className="w-4.5 h-4.5" />
              <span className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900/90 backdrop-blur-sm border border-gray-800 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                Copilot AI
              </span>
            </button>
          </div>

          {/* Menú de Usuario Dinámico */}
          {hasToken && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-3 pl-1.5 pr-3 py-1.5 rounded-full border border-border bg-umss-side-bg hover:bg-umss-side-hover hover:shadow-sm hover:border-border transition-all cursor-pointer active:scale-98 select-none"
              >
                <div className="relative shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#002855] to-[#003770] flex items-center justify-center text-white text-xs font-bold shadow-inner shrink-0">
                    {getInitials()}
                  </div>
                  {/* Luz verde parpadeante de conexión */}
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-[#0b1120] rounded-full animate-pulse" />
                </div>

                <div className="hidden sm:flex flex-col text-left max-w-[130px] gap-0.5">
                  <span className="text-xs font-bold text-[#001B47] dark:text-gray-100 truncate leading-tight tracking-tight">
                    {getFirstName()}
                  </span>
                  <span className="inline-flex items-center w-fit px-2 py-0.5 rounded-md text-[9px] font-extrabold tracking-wider uppercase bg-[#BC000C]/10 text-[#BC000C] dark:bg-[#BC000C]/20 dark:text-red-400 leading-none">
                    {rolActivo}
                  </span>
                </div>

                <ChevronDown
                  className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-300 ${
                    isDropdownOpen ? "rotate-180" : "rotate-0"
                  }`}
                />
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2.5 w-64 bg-umss-nav-bg border border-border rounded-2xl shadow-2xl z-50 py-2 divide-y divide-border animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-3">
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold tracking-wider">
                      Sesión Iniciada
                    </p>
                    <p className="text-sm font-black text-[#001B47] dark:text-white truncate mt-1">
                      {userData?.name || "Usuario San Simón"}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {userData?.email || "institucional@umss.edu"}
                    </p>
                  </div>

                  {roles && roles.length > 1 && (
                    <div className="px-3 py-2.5">
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold tracking-wider px-2 mb-1.5 flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-[#BC000C]" /> Cambiar de Rol
                      </p>
                      <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                        {roles.map((rol) => {
                          const isSelected = rol === rolActivo
                          return (
                            <button
                              key={rol}
                              onClick={() => {
                                setRolActivo(rol)
                                setIsDropdownOpen(false)
                              }}
                              className={`w-full flex items-center justify-between text-xs font-semibold rounded-lg px-2.5 py-2 text-left transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-[#eff6ff] dark:bg-slate-800/80 text-[#002855] dark:text-blue-400 font-bold"
                                  : "text-gray-600 dark:text-gray-300 hover:bg-umss-side-hover hover:text-[#001B47] dark:hover:text-white"
                              }`}
                            >
                              <span className="uppercase tracking-tight truncate">{rol}</span>
                              {isSelected && (
                                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-1" />
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <div className="px-2 py-1.5">
                    <NavigationLink
                      href="/"
                      onClick={() => setIsDropdownOpen(false)}
                      className="w-full flex items-center gap-3 text-sm font-bold text-[#001B47] dark:text-gray-300 rounded-lg px-3 py-2.5 transition-all hover:bg-umss-side-hover hover:text-[#003770] dark:hover:text-white"
                    >
                      <User className="w-4 h-4 text-[#003770] dark:text-blue-400" />
                      <span>Mi Panel</span>
                    </NavigationLink>

                    <NavigationLink
                      href="/"
                      onClick={() => setIsDropdownOpen(false)}
                      className="w-full flex items-center gap-3 text-sm font-bold text-[#001B47] dark:text-gray-300 rounded-lg px-3 py-2.5 transition-all hover:bg-umss-side-hover hover:text-[#003770] dark:hover:text-white"
                    >
                      <Settings className="w-4 h-4 text-[#003770] dark:text-blue-400" />
                      <span>Ajustes</span>
                    </NavigationLink>
                  </div>

                  <div className="px-2 pt-1.5">
                    <button
                      onClick={() => {
                        setIsDropdownOpen(false)
                        cerrarSesion()
                      }}
                      className="w-full flex items-center gap-3 text-sm font-bold text-[#BC000C] hover:text-[#870009] hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg px-3 py-2.5 transition-all cursor-pointer active:scale-98"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
