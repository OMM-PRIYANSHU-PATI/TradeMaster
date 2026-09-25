# Authentication Architecture

## Flow
1. User submits credentials to /api/v1/auth/login.
2. API verifies the hash using Argon2.
3. A cryptographically random session token is generated.
4. The token is hashed and stored in PostgreSQL Session table, linked to the user.
5. The raw token is returned to the client as an HttpOnly, Secure, SameSite=strict cookie.
6. Subsequent requests include the cookie. AuthGuard validates the session against PostgreSQL.

## Endpoints
* POST /api/v1/auth/register - Create account
* POST /api/v1/auth/login - Authenticate
* POST /api/v1/auth/logout - Invalidate session
* GET /api/v1/auth/me - Get current authenticated user

## Security Controls
* **Rate Limiting**: Applied to login and register to prevent brute forcing.
* **Audit Logging**: Every sensitive action (login success/failure, logout, registration) writes an event to the AuditLog table.
* **No Secret Leakage**: Passwords, hashes, and session tokens are never returned in API JSON bodies.
