# Authorization Architecture (RBAC)

## Concepts
* **User**: Can have multiple Roles.
* **Role**: A named collection of Permissions (e.g., ADMIN, USER).
* **Permission**: A specific granular action (e.g., profile:read, dmin:access).

## Guards
* AuthGuard: Ensures the user has a valid active session.
* RolesGuard: Reads @Roles() and @Permissions() decorators and verifies the user has the required access.

## Example
`	s
@Get('admin/stats')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
@Permissions('admin:access')
getAdminStats() {
  // protected route
}
`
