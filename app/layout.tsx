import type { Metadata } from "next"
import { Geist, Geist_Mono, Inter } from "next/font/google"
import { Sonner } from "@umss/estilos-base/components"

import "./theme.css"
import { cn } from "@/lib/utils"
import { ThemeProvider } from "@/core/providers/ThemeProvider"
import { AuthInitializer } from "@/features/auth/ui/AuthInitializer"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Sistema Integrado de Horarios - UMSS",
  description: "Plataforma oficial de la UMSS para la gestión de horarios, docentes y ambientes.",
  icons: {
    icon: "/umss1.png",
    shortcut: "/umss1.png",
    apple: "/umss1.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
        inter.variable
      )}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthInitializer>{children}</AuthInitializer>
          <Sonner richColors position="top-right" closeButton />
        </ThemeProvider>
      </body>
    </html>
  )
}
