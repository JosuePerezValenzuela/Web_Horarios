/**
 * Authentication domain types
 */

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  access_token: string
}

export interface User {
  id: string
  username: string
  permissions: string[]
}
