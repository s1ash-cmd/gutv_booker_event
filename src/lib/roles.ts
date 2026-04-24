export function isAdminRole(role?: string | null) {
  return role === "Admin";
}

export function isOrganizationRole(role?: string | null) {
  return role === "Organization";
}

export function canCreateEvent(role?: string | null) {
  return role === "Organization" || role === "Admin";
}

export function getRoleLabel(role?: string | null) {
  switch (role) {
    case "Admin":
      return "Администратор";
    case "Organization":
      return "Представитель организации";
    default:
      return "Представитель организации";
  }
}
