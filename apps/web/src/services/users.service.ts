import { apiClient, apiClientWithMeta } from "../lib/http/api-client";
import { DEFAULT_PAGE_SIZE } from "../config/constants";
import { invalidateCache } from "../lib/cache";
import type { AppRole, UserStatus } from "@posp-admin/contracts";
import type { AdminUser, ListUsersMeta, ListUsersParams } from "../types/users";

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const usersService = {
  list(params: ListUsersParams = {}): Promise<{ data: AdminUser[]; meta: ListUsersMeta }> {
    const query = buildQuery({
      limit: params.limit ?? DEFAULT_PAGE_SIZE,
      cursor: params.cursor,
      search: params.search,
      role: params.role,
      status: params.status,
      includeTotal: params.includeTotal,
    });
    return apiClientWithMeta<AdminUser[], ListUsersMeta>(`/users${query}`);
  },

  get(userId: string): Promise<AdminUser> {
    return apiClient<AdminUser>(`/users/${userId}`);
  },

  async assignRole(userId: string, role: AppRole): Promise<AdminUser> {
    const result = await apiClient<AdminUser>(`/users/${userId}/role`, { method: "PATCH", body: { role } });
    // The cached cluster-manager dropdown (POSP assignment, registry filter) may now be
    // missing this user (newly made CLUSTER_MANAGER) or stale for their old role.
    invalidateCache("cluster-managers");
    return result;
  },

  async setStatus(userId: string, status: UserStatus): Promise<AdminUser> {
    const result = await apiClient<AdminUser>(`/users/${userId}/status`, { method: "PATCH", body: { status } });
    // A disabled Cluster Manager should also disappear from the assignable dropdown.
    invalidateCache("cluster-managers");
    return result;
  },

  roleOptions(): Promise<{ value: AppRole; label: string }[]> {
    return apiClient<{ value: AppRole; label: string }[]>("/metadata/roles");
  },
};
