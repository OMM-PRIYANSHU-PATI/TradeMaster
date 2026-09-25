# ADR 002: Authentication Architecture

## Status
Accepted

## Context
We need a secure authentication foundation for TradeMaster. It must support sessions, secure password storage, and RBAC without introducing overly complex dependencies (e.g., full OAuth or third-party Identity Providers at this phase).

## Decision
1. **Password Hashing**: We will use Argon2id for hashing passwords. It is memory-hard and secure against GPU-based attacks. We migrate the \password\ field to \passwordHash\.
2. **Session Management**: We will use custom HTTP-only cookies storing a cryptographically secure random session ID (32 bytes hex). This maps to a \Session\ record in PostgreSQL.
3. **Cookie Security**: Cookies will be marked \HttpOnly\, \Secure\ in production, and \SameSite=strict\ to prevent XSS and CSRF attacks. No tokens will be exposed to JavaScript (e.g., \localStorage\).
4. **RBAC**: Implemented via custom \@Roles()\ and \@Permissions()\ decorators and corresponding Guards. The data model uses a standard many-to-many relationship between \User\, \Role\, and \Permission\.
5. **API Security**: Integrated \helmet\ for HTTP headers, \express-rate-limit\ specifically on auth endpoints to prevent brute forcing, and Zod for strict payload validation.

## Consequences
* High security against XSS.
* Tightly coupled to our own domain model, avoiding third-party lock-in.
* Requires manual handling of session expiration and revocation in PostgreSQL. Redis can be layered on later for performance if session lookups become a bottleneck.
* In Phase 1, the infrastructure for PostgreSQL is blocked locally by the Docker daemon failure, meaning this architecture is code-complete but pending runtime integration tests against a live database.
