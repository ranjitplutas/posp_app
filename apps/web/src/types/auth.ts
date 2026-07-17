import type { AppRole, UserStatus } from "@posp-admin/contracts";

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string;
  role: AppRole | null;
  status: UserStatus;
};

export type ExchangeResponse = {
  accessToken: string;
  expiresIn: number;
  user: CurrentUser;
};
