export type PospListItem = {
  id: number;
  pospId: string;
  mobileNumber: string;
  fullName: string | null;
  emailAddress: string | null;
  profilePic: string | null;
  onboardStatus: string;
  isActive: string;
  status: number;
  readyToProcess: boolean;
  isSynced: boolean;
  createdAt: string;
  updatedAt: string;
  clusterManagerId: string | null;
  clusterManager: { id: string; name: string | null; email: string | null } | null;
};

export type ListPospParams = {
  limit?: number;
  page?: number;
  search?: string;
  /** A single status, several (e.g. [2, 3] for Approved+Completed), or a raw comma-separated string passed straight through. */
  status?: number | number[] | string;
  clusterManagerId?: string;
};

export type ListPospMeta = {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
};

export type PospVerification = {
  id: number;
  pospId: number;
  documentType: string;
  data: string | null;
  value: string | null;
  /** Only set for document_type "education" — the human-readable qualification name resolved from digi_educations. */
  valueLabel?: string;
  filePath: string | null;
  pdfPath: string | null;
  isVerified: boolean;
  remarks: string | null;
  status: number | null;
  dateUpdated: string | null;
};

export type EducationOption = {
  id: number;
  education: string;
};
