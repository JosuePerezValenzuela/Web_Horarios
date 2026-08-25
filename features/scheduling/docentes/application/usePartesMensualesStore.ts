import { create } from "zustand"
import {
  partesMensualesApi,
  type ReporteMensualResponse,
  type GenerarReporteMensualRequest,
} from "./partesMensualesApi"

interface PartesMensualesState {
  reporte: ReporteMensualResponse | null
  loading: boolean
  error: string | null
  generarReporte: (payload: GenerarReporteMensualRequest) => Promise<ReporteMensualResponse>
  clearReporte: () => void
}

export const usePartesMensualesStore = create<PartesMensualesState>()((set) => ({
  reporte: null,
  loading: false,
  error: null,

  generarReporte: async (payload) => {
    set({ loading: true, error: null })
    try {
      const response = await partesMensualesApi.generar(payload)
      set({ reporte: response, loading: false })
      return response
    } catch (err) {
      let errMsg = "Error al generar el reporte mensual"
      if (err instanceof Error) {
        errMsg = err.message
      }
      set({ error: errMsg, loading: false })
      throw err
    }
  },

  clearReporte: () => set({ reporte: null, error: null, loading: false }),
}))
