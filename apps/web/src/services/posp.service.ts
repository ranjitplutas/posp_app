import { apiClient, apiClientWithMeta } from "../lib/http/api-client";
import { DEFAULT_PAGE_SIZE } from "../config/constants";
import { cached, invalidateCache } from "../lib/cache";
import type { EducationOption, ListPospMeta, ListPospParams, PospListItem, PospVerification } from "../types/posp";

const POSP_LIST_TTL_MS = 30_000;
const CLUSTER_MANAGERS_TTL_MS = 5 * 60_000; // reference-ish data, changes rarely (role/status admin actions only)

function buildQuery(params: Record<string, string | number | boolean | number[] | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    search.set(key, Array.isArray(value) ? value.join(",") : String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const pospService = {
  /** Cached per unique filter/page combination — revisiting the registry with the same
   * filters within the TTL window reuses the last response instead of re-fetching. */
  list(params: ListPospParams = {}): Promise<{ data: PospListItem[]; meta: ListPospMeta }> {
    const query = buildQuery({
      limit: params.limit ?? DEFAULT_PAGE_SIZE,
      page: params.page ?? 1,
      search: params.search,
      status: params.status,
      clusterManagerId: params.clusterManagerId,
    });
    return cached(`posp-list:${query}`, POSP_LIST_TTL_MS, () => apiClientWithMeta<PospListItem[], ListPospMeta>(`/posps${query}`));
  },

  get(pospId: number): Promise<PospListItem> {
    return apiClient<PospListItem>(`/posps/${pospId}`);
  },

  /** Read-only per spec — no create/delete. `clusterManagerId: null` unassigns. */
  async assignClusterManager(pospId: number, clusterManagerId: string | null): Promise<PospListItem> {
    const result = await apiClient<PospListItem>(`/posps/${pospId}/cluster-manager`, {
      method: "PATCH",
      body: { clusterManagerId },
    });
    // The registry's cached pages may now show a stale "Unassigned"/manager name for this POSP.
    invalidateCache("posp-list:");
    return result;
  },

  /** Always scoped to a single POSP's own verification record — no cross-user listing. */
  getVerification(pospId: number): Promise<PospVerification[]> {
    return apiClient<PospVerification[]>(`/posps/${pospId}/verification`);
  },

  /** Updates one specific field on a specific verification row (e.g. is_verified, remarks) — never a full-record replace. */
  updateVerificationField(
    pospId: number,
    verificationId: number,
    field: string,
    value: unknown,
  ): Promise<PospVerification> {
    return apiClient<PospVerification>(`/posps/${pospId}/verification/${verificationId}`, {
      method: "PATCH",
      body: { field, value },
    });
  },

  /** Read-only reference data — no create/update/delete. */
  listEducations(): Promise<EducationOption[]> {
    return apiClient<EducationOption[]>("/educations");
  },

  listClusterManagers(): Promise<{ id: string; name: string; email: string }[]> {
    return cached("cluster-managers", CLUSTER_MANAGERS_TTL_MS, () =>
      apiClient<{ id: string; name: string; email: string }[]>("/cluster-managers"),
    );
  },
};
