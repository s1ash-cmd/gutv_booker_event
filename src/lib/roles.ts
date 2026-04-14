export function isAdminRole(role?: string | null) {
  return role === "Admin";
}

export function isOrganizationRole(role?: string | null) {
  return role === "Organization";
}

export function hasRoninAccess(role?: string | null) {
  return role === "Ronin" || role === "Admin";
}

export function canBookEquipment(role?: string | null) {
  return (
    role === "User" ||
    role === "Osnova" ||
    role === "Ronin" ||
    role === "Admin"
  );
}

export function canCreateEvent(role?: string | null) {
  return role === "Organization" || role === "Admin";
}

export function getRoleLabel(role?: string | null) {
  switch (role) {
    case "Admin":
      return "Администратор";
    case "Ronin":
      return "Ronin";
    case "Osnova":
      return "Основа";
    case "Organization":
      return "Представитель организации";
    case "User":
    default:
      return "Член GUtv";
  }
}
