import { describe, it, expect, vi, beforeEach } from "vitest"
import { apiClient } from "./client"
import {
  cambiarEstadoJustificacion,
  fetchTiposJustificacion,
  listarJustificaciones,
  crearJustificacion,
  justificacionesService,
} from "./client"

describe("Justificaciones API Service", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe("cambiarEstadoJustificacion", () => {
    it("debe enviar estrictamente solo estado al aprobar (omitiendo motivo_rechazo)", async () => {
      const patchSpy = vi.spyOn(apiClient, "patch").mockResolvedValue({
        id: 17,
        estado: "aprobada",
      })

      const res = await cambiarEstadoJustificacion(17, "aprobada", "Ignorado en aprobacion")

      expect(patchSpy).toHaveBeenCalledWith(
        "/justificaciones/17/estado",
        { estado: "aprobada" },
        expect.objectContaining({
          loadingMessage: "Aprobando justificación...",
          successMessage: "Justificación aprobada exitosamente",
        })
      )
      expect(res).toEqual({ id: 17, estado: "aprobada" })
    })

    it("debe recortar espacios (trim) y enviar motivo_rechazo para estado rechazada", async () => {
      const patchSpy = vi.spyOn(apiClient, "patch").mockResolvedValue({
        id: 17,
        estado: "rechazada",
        motivo_rechazo: "Missing supporting document",
      })

      await cambiarEstadoJustificacion(17, "rechazada", "  Missing supporting document  ")

      expect(patchSpy).toHaveBeenCalledWith(
        "/justificaciones/17/estado",
        {
          estado: "rechazada",
          motivo_rechazo: "Missing supporting document",
        },
        expect.objectContaining({
          loadingMessage: "Rechazando justificación...",
          successMessage: "Justificación rechazada exitosamente",
        })
      )
    })

    it("debe omitir motivo_rechazo al rechazar si no es proporcionado o es espacio en blanco", async () => {
      const patchSpy = vi.spyOn(apiClient, "patch").mockResolvedValue({
        id: 17,
        estado: "rechazada",
      })

      await cambiarEstadoJustificacion(17, "rechazada")
      expect(patchSpy).toHaveBeenCalledWith(
        "/justificaciones/17/estado",
        { estado: "rechazada" },
        expect.any(Object)
      )

      await cambiarEstadoJustificacion(17, "rechazada", "     ")
      expect(patchSpy).toHaveBeenCalledWith(
        "/justificaciones/17/estado",
        { estado: "rechazada" },
        expect.any(Object)
      )
    })

    it("debe aceptar exactamente 64 caracteres tras el recorte al rechazar", async () => {
      const patchSpy = vi.spyOn(apiClient, "patch").mockResolvedValue({
        id: 17,
        estado: "rechazada",
      })

      const exactly64 = "a".repeat(64)
      await cambiarEstadoJustificacion(17, "rechazada", `   ${exactly64}   `)

      expect(patchSpy).toHaveBeenCalledWith(
        "/justificaciones/17/estado",
        {
          estado: "rechazada",
          motivo_rechazo: exactly64,
        },
        expect.any(Object)
      )
    })

    it("debe lanzar error si el motivo recortado supera los 64 caracteres al rechazar", async () => {
      const patchSpy = vi.spyOn(apiClient, "patch")
      const exceeding64 = "b".repeat(65)

      await expect(cambiarEstadoJustificacion(17, "rechazada", exceeding64)).rejects.toThrow(
        "El motivo de rechazo no puede exceder 64 caracteres."
      )

      expect(patchSpy).not.toHaveBeenCalled()
    })
  })

  describe("crearJustificacion", () => {
    it("debe enviar JSON con horario_ids, fechas, descripcion, con_goce_haberes y tipo_justificacion_id", async () => {
      const postSpy = vi.spyOn(apiClient, "post").mockResolvedValue({
        id: 321,
        persona_id: 123,
        horario_ids: [123, 456],
        fecha_desde: "2026-03-01",
        fecha_hasta: "2026-03-10",
        descripcion: "Medical leave",
        uuid_doc: null,
        con_goce_haberes: true,
        tipo_justificacion_id: 7,
        estado: "pendiente",
        motivo_rechazo: null,
        created_at: "2026-03-01T10:00:00.000Z",
        updated_at: "2026-03-01T10:00:00.000Z",
      })

      const res = await crearJustificacion({
        horario_ids: [123, 456],
        fecha_desde: "2026-03-01",
        fecha_hasta: "2026-03-10",
        descripcion: "Medical leave",
        con_goce_haberes: true,
        tipo_justificacion_id: 7,
      })

      expect(postSpy).toHaveBeenCalledWith(
        "/justificaciones",
        {
          horario_ids: [123, 456],
          fecha_desde: "2026-03-01",
          fecha_hasta: "2026-03-10",
          descripcion: "Medical leave",
          con_goce_haberes: true,
          tipo_justificacion_id: 7,
        },
        expect.objectContaining({
          loadingMessage: "Registrando justificación...",
          successMessage: "Justificación registrada exitosamente",
        })
      )
      expect(res.id).toBe(321)
    })

    it("debe incluir uuid_doc cuando es provisto", async () => {
      const postSpy = vi.spyOn(apiClient, "post").mockResolvedValue({
        id: 321,
        persona_id: 123,
        horario_ids: [123],
        fecha_desde: "2026-03-01",
        fecha_hasta: "2026-03-10",
        descripcion: "Medical leave",
        uuid_doc: "9d70da40-35ab-45ed-92cf-20404ceab98f",
        con_goce_haberes: false,
        tipo_justificacion_id: 7,
        estado: "pendiente",
        motivo_rechazo: null,
        created_at: "2026-03-01T10:00:00.000Z",
        updated_at: "2026-03-01T10:00:00.000Z",
      })

      await crearJustificacion({
        horario_ids: [123],
        fecha_desde: "2026-03-01",
        fecha_hasta: "2026-03-10",
        descripcion: "Medical leave",
        con_goce_haberes: false,
        tipo_justificacion_id: 7,
        uuid_doc: "9d70da40-35ab-45ed-92cf-20404ceab98f",
      })

      expect(postSpy).toHaveBeenCalledWith(
        "/justificaciones",
        expect.objectContaining({
          uuid_doc: "9d70da40-35ab-45ed-92cf-20404ceab98f",
        }),
        expect.any(Object)
      )
    })
  })

  describe("justificacionesService and helper functions", () => {
    it("fetchTiposJustificacion debe llamar a /justificaciones/tipos", async () => {
      const getSpy = vi
        .spyOn(apiClient, "get")
        .mockResolvedValue([{ id: 1, nombre: "Licencia", codigo: "licencia" }])

      const res = await fetchTiposJustificacion()
      expect(getSpy).toHaveBeenCalledWith("/justificaciones/tipos")
      expect(res).toEqual([{ id: 1, nombre: "Licencia", codigo: "licencia" }])
    })

    it("listarJustificaciones debe armar los query params correctamente con pageSize", async () => {
      const getSpy = vi.spyOn(apiClient, "get").mockResolvedValue({
        items: [],
        pagination: {
          currentPage: 1,
          pageSize: 20,
          totalRecords: 0,
          totalPages: 0,
          nextPage: null,
          previousPage: null,
        },
      })

      await listarJustificaciones({
        persona_id: 45,
        estado: "pendiente",
        tipo_justificacion_id: 2,
        uuid_doc_presente: "true",
        page: 2,
        pageSize: 20,
      })

      expect(getSpy).toHaveBeenCalledWith(
        "/justificaciones?persona_id=45&tipo_justificacion_id=2&estado=pendiente&uuid_doc_presente=true&page=2&pageSize=20"
      )
    })

    it("justificacionesService debe enlazar los mismos métodos", () => {
      expect(justificacionesService.cambiarEstado).toBe(cambiarEstadoJustificacion)
      expect(justificacionesService.fetchTiposJustificacion).toBe(fetchTiposJustificacion)
      expect(justificacionesService.listarJustificaciones).toBe(listarJustificaciones)
      expect(justificacionesService.crearJustificacion).toBe(crearJustificacion)
    })
  })
})
