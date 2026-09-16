export const Permission = {
  organizationSettingsRead: 'organization:settings:read',
  organizationSettingsUpdate: 'organization:settings:update',
  organizationMembershipsManage: 'organization:memberships:manage',
  billingManage: 'billing:manage',
  organizationOwnershipManage: 'organization:ownership:manage',
  organizationDelete: 'organization:delete',
} as const;

export type PermissionId = (typeof Permission)[keyof typeof Permission];
export type OrganizationRole = 'admin' | 'member' | 'owner';
type OrganizationPolicyState = 'active' | 'pending-deletion' | 'read-only';

const rolePermissions = {
  owner: Object.values(Permission),
  admin: [
    Permission.organizationSettingsRead,
    Permission.organizationSettingsUpdate,
    Permission.organizationMembershipsManage,
  ],
  member: [Permission.organizationSettingsRead],
} as const satisfies Record<OrganizationRole, readonly PermissionId[]>;

export function permissionsForRole(role: string | undefined): PermissionId[] {
  const resolvedRole = resolveOrganizationRole(role);
  return resolvedRole ? [...rolePermissions[resolvedRole]] : [];
}

export function resolveOrganizationRole(
  role: string | undefined,
): OrganizationRole | undefined {
  const normalized = role?.replace(/^org:/, '');
  return normalized === 'owner' ||
    normalized === 'admin' ||
    normalized === 'member'
    ? normalized
    : undefined;
}

export function roleHasPermission(
  role: OrganizationRole,
  permission: PermissionId,
) {
  return (rolePermissions[role] as readonly PermissionId[]).includes(
    permission,
  );
}

export function organizationStateAllows(
  state: OrganizationPolicyState,
  permission: PermissionId,
) {
  if (state === 'active') return true;
  if (state === 'pending-deletion') return false;

  return (
    permission === Permission.organizationSettingsRead ||
    permission === Permission.organizationMembershipsManage ||
    permission === Permission.billingManage ||
    permission === Permission.organizationOwnershipManage
  );
}
