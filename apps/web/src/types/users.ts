import type { AppRole, UserStatus } from "@posp-admin/contracts";

export type AdminUser = {
  id: string;
  email: string;
  fullName: string;
  role: AppRole | null;
  status: UserStatus;
  lastLoginAt: string | null;
  createdAt: string;
};

export type ListUsersParams = {
  limit?: number;
  cursor?: string;
  search?: string;
  role?: AppRole;
  status?: UserStatus;
  includeTotal?: boolean;
};

export type ListUsersMeta = {
  limit: number;
  hasNextPage: boolean;
  nextCursor: string | null;
  totalCount?: number;
};
