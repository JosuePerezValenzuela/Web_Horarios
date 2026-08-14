"use client"

/**
 * Docentes filters component
 * Faculty, Career, Subject dropdowns with SearchableSelect from library
 */

import { useEffect, useRef, useState } from "react"
import { useDocentesStore } from "../application/docentesStore"
import { Input, SearchableSelect } from "@umss/estilos-base/components"

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

  // Mapeamos los catálogos a las opciones esperadas por SearchableSelect
  const facultadOptions = facultades.map((f) => ({
    value: f.id,
    label: f.nombre,
  }))

  const carreraOptions = carreras.map((c) => ({
    value: c.id,
    label: c.nombre,
  }))

  const asignaturaOptions = asignaturas.map((a) => ({
    value: a.id,
    label: a.nombre,
  }))

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12 items-end">
      {/* Search Input - de la librería */}
      <div className="min-w-0 sm:col-span-2 lg:col-span-6">
        <label
          htmlFor="search-input"
          className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 block"
        >
          Buscar Docente
        </label>
        <Input
          id="search-input"
          type="text"
          placeholder="Buscar por CI, código o nombre..."
          value={localSearch}
          onChange={(e) => handleLocalSearchChange(e.target.value)}
          className="h-10 rounded-xl"
        />
      </div>

      {/* Faculty Select con SearchableSelect de estilos-base */}
      <div className="min-w-0 sm:col-span-1 lg:col-span-2">
        <SearchableSelect
          id="facultad-select"
          label="Facultad"
          placeholder="Seleccione Facultad"
          searchPlaceholder="Buscar facultad..."
          options={facultadOptions}
          value={filters.facultadId || ""}
          onValueChange={handleFacultadChange}
          disabled={loadingFacultades}
          allOption={true}
          allLabel="Todas las facultades"
          className="w-full"
        />
      </div>

      {/* Career Select con SearchableSelect de estilos-base */}
      <div className="min-w-0 sm:col-span-1 lg:col-span-2">
        <SearchableSelect
          id="carrera-select"
          label="Carrera"
          placeholder="Seleccione Carrera"
          searchPlaceholder="Buscar carrera..."
          options={carreraOptions}
          value={filters.carreraId || ""}
          onValueChange={handleCarreraChange}
          disabled={loadingCarreras || !filters.facultadId}
          allOption={true}
          allLabel="Todas las carreras"
          className="w-full"
        />
      </div>

      {/* Subject Select con SearchableSelect de estilos-base */}
      <div className="min-w-0 sm:col-span-2 lg:col-span-2">
        <SearchableSelect
          id="asignatura-select"
          label="Asignatura"
          placeholder="Seleccione Asignatura"
          searchPlaceholder="Buscar asignatura..."
          options={asignaturaOptions}
          value={filters.asignaturaId || ""}
          onValueChange={handleAsignaturaChange}
          disabled={!filters.carreraId}
          allOption={true}
          allLabel="Todas las asignaturas"
          className="w-full"
        />
      </div>
    </div>
  )
}
