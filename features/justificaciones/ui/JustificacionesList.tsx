"use client"

import { useState, useEffect } from "react"
import { Button } from "@umss/estilos-base/components"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"

import type { JustificacionListItem, TipoJustificacion, EstadoJustificacion } from "../domain/types"
import {
  listarJustificaciones,
  cambiarEstadoJustificacion,
  fetchTiposJustificacion,
} from "../application/api"
import { JustificacionCard } from "./JustificacionCard"
import { ConfirmarCambioEstadoModal } from "./ConfirmarCambioEstadoModal"

export function JustificacionesList() {
  const [items, setItems] = useState<JustificacionListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)

  // Filtros
  const [filterEstado, setFilterEstado] = useState<string>("all")
  const [filterTipoId, setFilterTipoId] = useState<string>("all")
  const [filterUuidDoc, setFilterUuidDoc] = useState<string>("all")

  // Catálogo de tipos
  const [tipos, setTipos] = useState<TipoJustificacion[]>([])

  // Modal para aprobar / rechazar
  const [selectedJustificacion, setSelectedJustificacion] = useState<JustificacionListItem | null>(
    null
  )
  const [targetEstado, setTargetEstado] = useState<"aprobada" | "rechazada" | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Cargar catálogo de tipos
  useEffect(() => {
    async function loadTipos() {
      try {
        const data = await fetchTiposJustificacion()
        setTipos(data)
      } catch {
        // Handled by api interceptor
      }
    }
    loadTipos()
  }, [])

  // Cargar justificaciones
  useEffect(() => {
    let isMounted = true

    async function fetchData() {
      try {
        const res = await listarJustificaciones({
          estado: filterEstado !== "all" ? (filterEstado as EstadoJustificacion) : undefined,
          tipo_justificacion_id: filterTipoId !== "all" ? Number(filterTipoId) : undefined,
          uuid_doc_presente:
            filterUuidDoc === "true" ? "true" : filterUuidDoc === "false" ? "false" : undefined,
          page,
          pageSize,
        })

        if (isMounted) {
          setItems(res.items || [])
          setPage(res.pagination.currentPage)
          setPageSize(res.pagination.pageSize)
          setTotal(res.pagination.totalRecords)
          setTotalPages(res.pagination.totalPages)
          setLoading(false)
        }
      } catch {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      isMounted = false
    }
  }, [filterEstado, filterTipoId, filterUuidDoc, page, pageSize, refreshKey])

  // Handlers para modal de aprobación/rechazo
  const handleAprobarClick = (justificacion: JustificacionListItem) => {
    setSelectedJustificacion(justificacion)
    setTargetEstado("aprobada")
    setIsModalOpen(true)
  }

  const handleRechazarClick = (justificacion: JustificacionListItem) => {
    setSelectedJustificacion(justificacion)
    setTargetEstado("rechazada")
    setIsModalOpen(true)
  }

  const handleConfirmCambioEstado = async (motivo?: string) => {
    if (!selectedJustificacion || !targetEstado) return

    try {
      setIsSubmitting(true)
      await cambiarEstadoJustificacion(selectedJustificacion.id, targetEstado, motivo)

      // Actualizar estado localmente
      setItems((prev) =>
        prev.map((item) =>
          item.id === selectedJustificacion.id
            ? {
                ...item,
                estado: targetEstado,
                motivo_rechazo: motivo?.trim() || null,
              }
            : item
        )
      )

      setIsModalOpen(false)
      setSelectedJustificacion(null)
      setTargetEstado(null)
    } catch {
      // Handled by client interceptor
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Barra de Filtros y Búsqueda */}
      <div className="p-4 rounded-2xl bg-card border border-border shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          {/* Pestañas de Estado Rápidas */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/50 border border-border/60 text-xs">
            {[
              { id: "all", label: "Todas" },
              { id: "pendiente", label: "Pendientes" },
              { id: "aprobada", label: "Aprobadas" },
              { id: "rechazada", label: "Rechazadas" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setFilterEstado(tab.id)
                  setPage(1)
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer",
                  filterEstado === tab.id
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Botón de Recargar */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setLoading(true)
              setRefreshKey((k) => k + 1)
            }}
            disabled={loading}
            className="h-8 px-3 text-xs gap-1.5 rounded-xl"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            Actualizar
          </Button>
        </div>

        {/* Filtros Secundarios */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {/* Filtro por Tipo */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Tipo de Justificación
            </label>
            <Select
              value={filterTipoId}
              onValueChange={(val) => {
                setFilterTipoId(val)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-full h-9 text-xs rounded-xl">
                <SelectValue placeholder="Todos los tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  Todos los tipos
                </SelectItem>
                {tipos.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)} className="text-xs">
                    {t.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro por Documento SGD */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Documento SGD
            </label>
            <Select
              value={filterUuidDoc}
              onValueChange={(val) => {
                setFilterUuidDoc(val)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-full h-9 text-xs rounded-xl">
                <SelectValue placeholder="Cualquiera" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  Todos (con y sin documento)
                </SelectItem>
                <SelectItem value="true" className="text-xs">
                  Solo con documento SGD adjunto
                </SelectItem>
                <SelectItem value="false" className="text-xs">
                  Sin documento SGD
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Registros por Página */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Por Página
            </label>
            <Select
              value={String(pageSize)}
              onValueChange={(val) => {
                setPageSize(Number(val))
                setPage(1)
              }}
            >
              <SelectTrigger className="w-full h-9 text-xs rounded-xl">
                <SelectValue placeholder="10 por página" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5" className="text-xs">
                  5 por página
                </SelectItem>
                <SelectItem value="10" className="text-xs">
                  10 por página
                </SelectItem>
                <SelectItem value="25" className="text-xs">
                  25 por página
                </SelectItem>
                <SelectItem value="50" className="text-xs">
                  50 por página
                </SelectItem>
                <SelectItem value="100" className="text-xs">
                  100 por página
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Estado de Carga */}
      {loading && items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 bg-card border border-border rounded-2xl">
          <Loader2 className="w-7 h-7 animate-spin text-primary mb-2" />
          <p className="text-xs font-medium text-muted-foreground">
            Cargando lista de justificaciones...
          </p>
        </div>
      )}

      {/* Estado Vacío */}
      {!loading && items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 bg-card border border-border rounded-2xl text-center p-6 space-y-2">
          <AlertCircle className="w-8 h-8 text-muted-foreground/60" />
          <h3 className="text-sm font-bold text-foreground">No se encontraron justificaciones</h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            No existen registros que coincidan con los filtros seleccionados o aún no se han
            registrado justificaciones en el sistema.
          </p>
        </div>
      )}

      {/* Listado de Tarjetas de Justificación */}
      {!loading && items.length > 0 && (
        <div className="space-y-3">
          {items.map((item) => (
            <JustificacionCard
              key={item.id}
              justificacion={item}
              tipo={tipos.find((t) => t.id === item.tipo_justificacion_id)}
              onAprobar={handleAprobarClick}
              onRechazar={handleRechazarClick}
            />
          ))}
        </div>
      )}

      {/* Paginación y Resumen de Registros */}
      {total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-card border border-border text-xs">
          <span className="text-muted-foreground">
            Mostrando <strong>{total === 0 ? 0 : (page - 1) * pageSize + 1}</strong> -{" "}
            <strong>{Math.min(page * pageSize, total)}</strong> de <strong>{total}</strong>{" "}
            justificaciones (Página <strong>{page}</strong> de <strong>{totalPages}</strong>)
          </span>

          {totalPages > 1 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage(1)}
                disabled={page <= 1 || loading}
                className="h-8 w-8 p-0 rounded-xl"
                title="Primera página"
              >
                <ChevronsLeft className="w-4 h-4" />
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="h-8 px-2.5 rounded-xl gap-1 text-xs"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Anterior</span>
              </Button>

              {/* Botones de Páginas */}
              <div className="hidden sm:flex items-center gap-1">
                {getPageNumbers(page, totalPages).map((p, idx) =>
                  p === "ellipsis" ? (
                    <span key={`ell-${idx}`} className="px-1 text-muted-foreground select-none">
                      …
                    </span>
                  ) : (
                    <Button
                      key={p}
                      type="button"
                      variant={p === page ? "primary" : "outline"}
                      size="sm"
                      onClick={() => setPage(p)}
                      disabled={loading}
                      className={cn(
                        "h-8 min-w-[32px] px-2 rounded-xl text-xs font-semibold",
                        p === page && "pointer-events-none"
                      )}
                    >
                      {p}
                    </Button>
                  )
                )}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="h-8 px-2.5 rounded-xl gap-1 text-xs"
              >
                <span className="hidden sm:inline">Siguiente</span>
                <ChevronRight className="w-4 h-4" />
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage(totalPages)}
                disabled={page >= totalPages || loading}
                className="h-8 w-8 p-0 rounded-xl"
                title="Última página"
              >
                <ChevronsRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Modal de Confirmación de Aprobación / Rechazo */}
      <ConfirmarCambioEstadoModal
        key={
          selectedJustificacion && targetEstado
            ? `${selectedJustificacion.id}-${targetEstado}`
            : "closed"
        }
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedJustificacion(null)
          setTargetEstado(null)
        }}
        onConfirm={handleConfirmCambioEstado}
        justificacion={selectedJustificacion}
        nuevoEstado={targetEstado}
        loading={isSubmitting}
      />
    </div>
  )
}

function getPageNumbers(currentPage: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }
  const pages: (number | "ellipsis")[] = [1]
  const start = Math.max(2, currentPage - 1)
  const end = Math.min(totalPages - 1, currentPage + 1)

  if (start > 2) {
    pages.push("ellipsis")
  }

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }

  if (end < totalPages - 1) {
    pages.push("ellipsis")
  }

  pages.push(totalPages)
  return pages
}
