"use client"

/**
 * Docentes filters component
 * Faculty, Career, Subject dropdowns + search input
 */

import { useEffect } from "react"
import { useDocentesStore } from "../application/docentesStore"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"

export function DocentesFilters() {
  const {
    facultades,
    carreras,
    asignaturas,
    filters,
    search,
    loadingFacultades,
    loadingCarreras,
    setFilters,
    setSearch,
    fetchFacultades,
    fetchCarreras,
    fetchAsignaturas,
    resetCarreras,
    resetAsignaturas,
  } = useDocentesStore()

  // Load facultades on mount
  useEffect(() => {
    if (facultades.length === 0) {
      fetchFacultades()
    }
  }, [facultades.length, fetchFacultades])

  // Handle facultad change - cascade to reset carrera and asignatura
  const handleFacultadChange = (facultadId: string) => {
    resetCarreras()
    resetAsignaturas()
    const newFacultadId = facultadId === "all" ? undefined : facultadId
    setFilters({ facultadId: newFacultadId })
    if (newFacultadId) {
      fetchCarreras(newFacultadId)
    }
  }

  // Handle carrera change - cascade to reset asignatura
  const handleCarreraChange = (carreraId: string) => {
    resetAsignaturas()
    const newCarreraId = carreraId === "all" ? undefined : carreraId
    setFilters({ carreraId: newCarreraId })
    if (newCarreraId && filters.facultadId) {
      fetchAsignaturas(newCarreraId, filters.facultadId)
    }
  }

  // Handle asignatura change
  const handleAsignaturaChange = (asignaturaId: string) => {
    const newAsignaturaId = asignaturaId === "all" ? undefined : asignaturaId
    setFilters({ asignaturaId: newAsignaturaId })
  }

  // Handle search key press (Enter)
  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setSearch(search)
    }
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-4">
      {/* Search Input - takes remaining space */}
      <div className="flex-1 min-w-64">
        <Input
          type="text"
          placeholder="Buscar por CI, código o nombre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleSearch}
        />
      </div>

      {/* Faculty Select */}
      <div className="w-full sm:w-auto">
        <Select
          value={filters.facultadId || "all"}
          onValueChange={handleFacultadChange}
          disabled={loadingFacultades}
        >
          <SelectTrigger>
            <SelectValue placeholder="Facultad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las facultades</SelectItem>
            {facultades.map((facultad) => (
              <SelectItem key={facultad.id} value={facultad.id}>
                {facultad.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Career Select - only enabled when facultad is selected */}
      <div className="w-full sm:w-auto">
        <Select
          value={filters.carreraId || "all"}
          onValueChange={handleCarreraChange}
          disabled={loadingCarreras || !filters.facultadId}
        >
          <SelectTrigger>
            <SelectValue placeholder="Carrera" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las carreras</SelectItem>
            {carreras.map((carrera) => (
              <SelectItem key={carrera.id} value={carrera.id}>
                {carrera.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Subject Select */}
      <div className="w-full sm:w-auto">
        <Select
          value={filters.asignaturaId || "all"}
          onValueChange={handleAsignaturaChange}
          disabled={!filters.carreraId}
        >
          <SelectTrigger>
            <SelectValue placeholder="Asignatura" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las asignaturas</SelectItem>
            {asignaturas.map((asignatura) => (
              <SelectItem key={asignatura.id} value={asignatura.id}>
                {asignatura.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
