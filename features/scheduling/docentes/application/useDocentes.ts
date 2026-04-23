/**
 * Docentes convenience hook
 */

import { useDocentesStore } from "./docentesStore"

/**
 * Convenience hook wrapping docentesStore
 * Provides all state and actions for docentes feature
 */
export function useDocentes() {
  return useDocentesStore()
}
