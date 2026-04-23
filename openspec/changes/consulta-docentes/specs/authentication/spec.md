# Authentication Specification

## Purpose

Provide basic authentication to protect routes and identify authorized users.

## Requirements

### Requirement: Login Form Display

The login page MUST display a form with username and password fields and a submit button.

- GIVEN user navigates to `/login`
- WHEN page loads
- THEN form displays with username input, password input (masked), and "Ingresar" button

### Requirement: Login Submission

The system MUST send credentials to `/auth/login` endpoint and handle the response.

- GIVEN user enters valid username and password
- WHEN user clicks "Ingresar"
- THEN system sends POST with `{ "username": "...", "password": "..." }`
- AND on success, stores access_token in localStorage and redirects to home

### Requirement: Login Error Handling

The system MUST display error message on invalid credentials.

- GIVEN user enters invalid username or password
- WHEN user clicks "Ingresar"
- THEN system displays error message "Credenciales inválidas"
- AND form remains visible for retry

### Requirement: Auth Guard

The system MUST protect routes by checking for valid access_token.

- GIVEN user accesses `/docentes` without token
- WHEN page loads
- THEN system redirects to `/login`
- AND stores current path for post-login redirect

### Requirement: Logout

The system MUST clear token and redirect to login on logout action.

- GIVEN user clicks "Logout" button
- WHEN action triggers
- THEN system removes access_token from localStorage
- AND redirects to `/login`

### Requirement: Protected Route Access After Login

The system MUST redirect to originally requested route after successful login.

- GIVEN user was redirected to `/login` from protected route
- WHEN login succeeds
- THEN system redirects to the stored protected route

## API Contract

### POST /auth/login

**Request:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Response (401):**
```json
{
  "success": false,
  "message": "Credenciales inválidas"
}
```

## Acceptance Criteria

| Scenario | Criterion |
|----------|-----------|
| Login form display | Page shows username, password, submit button |
| Login success | Token stored, redirect to home |
| Login failure | Error shown, form available for retry |
| No token access | Redirect to `/login` |
| Logout | Token cleared, redirect to `/login` |