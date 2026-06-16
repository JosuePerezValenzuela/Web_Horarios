/**
 * Authentication domain types
 */

export interface User {
  sub: string
  name: string
  email: string
  role: "Administrador" | "Gestor"
}
