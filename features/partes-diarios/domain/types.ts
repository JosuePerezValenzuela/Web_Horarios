export interface ConfiguracionAsistencia {
  id: number
  ingresoAnticipadoMinutos: number
  toleranciaIngresoMinutos: number
  limiteFaltaIngresoMinutos: number
  toleranciaSalidaPosteriorMinutos: number
  toleranciaSalidaAnticipadaMinutos: number
}
