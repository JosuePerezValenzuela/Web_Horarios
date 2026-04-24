"use client"

/**
 * Docentes filters component
 * Faculty, Career, Subject dropdowns with search
 */

import { useEffect, useRef, useState } from "react"
import { useDocentesStore } from "../application/docentesStore"
import { Select, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { SearchableSelectContent } from "@/components/ui/searchable-select-content"

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

  // Search filters for dropdowns
  const [facultadSearch, setFacultadSearch] = useState("")
  const [carreraSearch, setCarreraSearch] = useState("")
  const [asignaturaSearch, setAsignaturaSearch] = useState("")
  const [localSearch, setLocalSearch] = useState(search)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounce: wait 300ms before calling setSearch
  const handleLocalSearchChange = (value: string) => {
    setLocalSearch(value)
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      setSearch(value)
    }, 300)
  }

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
    setFacultadSearch("")
    const newFacultadId = facultadId === "all" ? undefined : facultadId
    setFilters({ facultadId: newFacultadId })
    if (newFacultadId) {
      fetchCarreras(newFacultadId)
    }
  }

  // Handle carrera change - cascade to reset asignatura
  const handleCarreraChange = (carreraId: string) => {
    resetAsignaturas()
    setCarreraSearch("")
    const newCarreraId = carreraId === "all" ? undefined : carreraId
    setFilters({ carreraId: newCarreraId })
    if (newCarreraId && filters.facultadId) {
      fetchAsignaturas(newCarreraId, filters.facultadId)
    }
  }

  // Handle asignatura change
  const handleAsignaturaChange = (asignaturaId: string) => {
    setAsignaturaSearch("")
    const newAsignaturaId = asignaturaId === "all" ? undefined : asignaturaId
    setFilters({ asignaturaId: newAsignaturaId })
  }

  // Handle search input (debounced via useEffect)

  // Filter helper
  const filterItems = <T extends { nombre: string }>(items: T[], searchValue: string): T[] => {
    if (!searchValue) return items
    const lower = searchValue.toLowerCase()
    return items.filter((item) => item.nombre.toLowerCase().includes(lower))
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-4">
      {/* Search Input - takes remaining space */}
      <div className="flex-1 min-w-64">
        <Input
          type="text"
          placeholder="Buscar por CI, codigo o nombre..."
          value={localSearch}
          onChange={(e) => handleLocalSearchChange(e.target.value)}
        />
      </div>

      {/* Faculty Select */}
      <div className="w-48 shrink-0">
        <Select
          value={filters.facultadId || "all"}
          onValueChange={handleFacultadChange}
          disabled={loadingFacultades}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Facultad" />
          </SelectTrigger>
          <SearchableSelectContent onFilterChange={setFacultadSearch}>
            <SelectItem value="all">Todas las facultades</SelectItem>
            {filterItems(facultades, facultadSearch).map((facultad) => (
              <SelectItem key={facultad.id} value={facultad.id}>
                {facultad.nombre}
              </SelectItem>
            ))}
          </SearchableSelectContent>
        </Select>
      </div>

      {/* Career Select */}
      <div className="w-48 shrink-0">
        <Select
          value={filters.carreraId || "all"}
          onValueChange={handleCarreraChange}
          disabled={loadingCarreras || !filters.facultadId}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Carrera" />
          </SelectTrigger>
          <SearchableSelectContent onFilterChange={setCarreraSearch}>
            <SelectItem value="all">Todas las carreras</SelectItem>
            {filterItems(carreras, carreraSearch).map((carrera) => (
              <SelectItem key={carrera.id} value={carrera.id}>
                {carrera.nombre}
              </SelectItem>
            ))}
          </SearchableSelectContent>
        </Select>
      </div>

      {/* Subject Select */}
      <div className="w-48 shrink-0">
        <Select
          value={filters.asignaturaId || "all"}
          onValueChange={handleAsignaturaChange}
          disabled={!filters.carreraId}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Asignatura" />
          </SelectTrigger>
          <SearchableSelectContent onFilterChange={setAsignaturaSearch}>
            <SelectItem value="all">Todas las asignaturas</SelectItem>
            {filterItems(asignaturas, asignaturaSearch).map((asignatura) => (
              <SelectItem key={asignatura.id} value={asignatura.id}>
                {asignatura.nombre}
              </SelectItem>
            ))}
          </SearchableSelectContent>
        </Select>
      </div>
    </div>
  )
}
