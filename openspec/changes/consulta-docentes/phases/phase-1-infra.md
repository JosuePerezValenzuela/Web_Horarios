# Phase 1 Artifacts - Infrastructure for Consulta de Docentes

**Created**: 2026-04-23
**Change**: consulta-docentes
**Status**: ✅ Complete

## Files Created

### 1. features/auth/domain/types.ts

```typescript
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  expiresIn: number;
  user: User;
}

export interface User {
  id: string;
  username: string;
  permissions: string[];
}
```

### 2. features/scheduling/docentes/domain/types.ts

```typescript
export interface Docente {
  codigo: string;
  ci: string;
  nombre: string;
}

export interface DocentesFilters {
  facultadId?: string;
  carreraId?: string;
  asignaturaId?: string;
  search?: string;
}

export interface Pagination {
  currentPage: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  nextPage: number | null;
  previousPage: number | null;
}

export interface PaginationState {
  currentPage: number;
  pageSize: number;
}

export interface ApiResponse<T> {
  data: T;
  pagination?: Pagination;
}
```

### 3. shared/services/api/client.ts

```typescript
import type { LoginRequest, LoginResponse } from "@/features/auth/domain/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

interface ApiClientOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
}

interface ApiError extends Error {
  status: number;
  body?: unknown;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private getAuthToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("auth_token");
  }

  private handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error: ApiError = new Error(`HTTP ${response.status}: ${response.statusText}`) as ApiError;
      error.status = response.status;
      return response.json().then((body) => {
        error.body = body;
        throw error;
      }).catch(() => {
        throw error;
      });
    }
    return response.json() as Promise<T>;
  }

  async request<T>(endpoint: string, options: ApiClientOptions = {}): Promise<T> {
    const token = this.getAuthToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (response.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("auth_token");
        window.location.href = "/login";
      }
      const error: ApiError = new Error("Unauthorized") as ApiError;
      error.status = 401;
      throw error;
    }

    return this.handleResponse<T>(response);
  }

  async get<T>(endpoint: string, options: ApiClientOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  async post<T>(endpoint: string, body: unknown, options: ApiClientOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "POST", body });
  }
}

export const apiClient = new ApiClient();

export const authApi = {
  login: (credentials: LoginRequest): Promise<LoginResponse> => {
    return apiClient.post<LoginResponse>("/api/auth/login", credentials);
  },
};
```

## Verification

- ✅ TypeScript compiles without errors (`tsc --noEmit`)
- ✅ Uses @ alias for imports
- ✅ Strict typing enabled
- ✅ Files follow Atomic Design + Hexagonal Modular structure