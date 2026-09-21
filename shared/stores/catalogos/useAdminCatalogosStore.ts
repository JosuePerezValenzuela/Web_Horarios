import { create } from "zustand"
import { horariosApi } from "@/shared/services/api/client"
import type {
  HorarioCatalogoItem,
  TipoAsignacionAdministrativo,
  TipoCargo,
} from "@/features/scheduling/docentes/domain/types"

interface AdminCatalogosState {
  catalogList: HorarioCatalogoItem[]
  tipoList: TipoAsignacionAdministrativo[]
  cargoList: TipoCargo[]
  loadingCatalog: boolean
  loadingTipos: boolean
  loadingCargos: boolean
  error: string | null

  fetchCatalog: () => Promise<void>
  fetchTipos: () => Promise<void>
  fetchCargos: () => Promise<void>
  fetchAll: () => Promise<void>
}

export const useAdminCatalogosStore = create<AdminCatalogosState>()((set, get) => ({
  catalogList: [],
  tipoList: [],
  cargoList: [],
  loadingCatalog: false,
  loadingTipos: false,
  loadingCargos: false,
  error: null,

  fetchCatalog: async () => {
    if (get().catalogList.length > 0 || get().loadingCatalog) return
    set({ loadingCatalog: true, error: null })
    try {
      const res = await horariosApi.getHorarioCatalogo(1, 100)
      if (res && res.data) {
        set({ catalogList: res.data, loadingCatalog: false })
      } else {
        set({ loadingCatalog: false })
      }
    } catch (err) {
      set({
        loadingCatalog: false,
        error: err instanceof Error ? err.message : "Error al cargar catálogo de horarios",
      })
    }
  },

  fetchTipos: async () => {
    if (get().tipoList.length > 0 || get().loadingTipos) return
    set({ loadingTipos: true, error: null })
    try {
      const res = await horariosApi.getTipoAsignacionHorarioAdministrativo(1, 100)
      if (res && res.data) {
        set({ tipoList: res.data, loadingTipos: false })
      } else {
        set({ loadingTipos: false })
      }
    } catch (err) {
      set({
        loadingTipos: false,
        error: err instanceof Error ? err.message : "Error al cargar tipos de asignación",
      })
    }
  },

  fetchCargos: async () => {
    if (get().cargoList.length > 0 || get().loadingCargos) return
    set({ loadingCargos: true, error: null })
    try {
      const res = await horariosApi.getTipoCargos(1, 100)
      if (res && res.data) {
        set({
          cargoList: res.data.filter((c) => c.activo !== false),
          loadingCargos: false,
        })
      } else {
        set({ loadingCargos: false })
      }
    } catch (err) {
      set({
        loadingCargos: false,
        error: err instanceof Error ? err.message : "Error al cargar cargos de autoridad",
      })
    }
  },

  fetchAll: async () => {
    await Promise.all([get().fetchCatalog(), get().fetchTipos(), get().fetchCargos()])
  },
}))
