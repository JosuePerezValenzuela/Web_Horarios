import { create } from "zustand"
import { attendanceConfigApi, type AttendanceConfig } from "./attendanceConfigApi"

interface AttendanceConfigState {
  configs: AttendanceConfig[]
  loading: boolean
  error: string | null
  fetchConfigs: () => Promise<void>
  createConfig: (config: Omit<AttendanceConfig, "id">) => Promise<AttendanceConfig>
}

export const useAttendanceConfigStore = create<AttendanceConfigState>()((set) => ({
  configs: [],
  loading: false,
  error: null,

  fetchConfigs: async () => {
    set({ loading: true, error: null })
    try {
      const data = await attendanceConfigApi.list()
      // Order by valid_from descending so the latest/current is at the top
      const sorted = [...data].sort((a, b) => {
        return new Date(b.valid_from).getTime() - new Date(a.valid_from).getTime()
      })
      set({ configs: sorted, loading: false })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Error al obtener configuraciones",
        loading: false,
      })
    }
  },

  createConfig: async (config) => {
    set({ loading: true, error: null })
    try {
      const newConfig = await attendanceConfigApi.create(config)
      set((state) => {
        const updated = [newConfig, ...state.configs].sort((a, b) => {
          return new Date(b.valid_from).getTime() - new Date(a.valid_from).getTime()
        })
        return { configs: updated, loading: false }
      })
      return newConfig
    } catch (err) {
      // Extract specific error messages if available from API client (ApiError)
      let errMsg = "Error al crear la configuración"
      if (err && typeof err === "object" && "body" in err) {
        const apiError = err as { body?: unknown }
        const apiErrBody = apiError.body
        if (apiErrBody && typeof apiErrBody === "object" && "message" in apiErrBody) {
          errMsg = String((apiErrBody as { message: unknown }).message)
        }
      } else if (err instanceof Error) {
        errMsg = err.message
      }
      set({ error: errMsg, loading: false })
      throw new Error(errMsg)
    }
  },
}))
