import { AppError, ERROR_CODES } from "@posp-admin/contracts";
import {
  assignClusterManager as repoAssignClusterManager,
  getPospById as repoGetPospById,
  getVerificationsForPosp,
  listEducations as repoListEducations,
  listPosps as repoListPosps,
  updateVerificationField as repoUpdateVerificationField,
  type PospRow,
  type VerificationRow,
} from "../../database/posp.repository.js";
import { memoizeAsync } from "../../shared/memoize.js";
import { findUserById } from "../../database/users.repository.js";

function toPublicPosp(row: PospRow) {
  return {
    id: row.id,
    pospId: row.pospId,
    mobileNumber: row.mobileNumber,
    fullName: row.fullName,
    emailAddress: row.emailAddress,
    profilePic: row.profilePic,
    onboardStatus: row.onboardStatus,
    isActive: row.isActive,
    status: row.status,
    readyToProcess: row.readyToProcess,
    isSynced: row.isSynced,
    createdAt: row.dateCreated,
    updatedAt: row.dateUpdated,
    clusterManagerId: row.clusterManagerId,
    clusterManager: row.clusterManagerId ? { id: row.clusterManagerId, name: row.clusterManagerName, email: row.clusterManagerEmail } : null,
  };
}

export type CallerScope = { role: "ADMIN" | "CLUSTER_MANAGER" | "EXECUTIVE_MANAGER"; userId: string };

export async function listPospsPage(
  params: { limit: number; page: number; search?: string; status?: number[]; clusterManagerId?: string },
  scope: CallerScope,
) {
  // A Cluster Manager can only ever see their own assigned POSPs — their scope always wins over
  // any clusterManagerId they might pass. Admin/Executive Manager may filter by any manager.
  const clusterManagerId = scope.role === "CLUSTER_MANAGER" ? scope.userId : params.clusterManagerId;

  const { items, totalCount } = await repoListPosps({
    limit: params.limit,
    page: params.page,
    search: params.search,
    status: params.status,
    clusterManagerId,
  });

  return {
    data: items.map(toPublicPosp),
    meta: { page: params.page, limit: params.limit, totalCount, totalPages: Math.max(1, Math.ceil(totalCount / params.limit)) },
  };
}

export async function getPosp(pospId: number, scope: CallerScope) {
  const row = await repoGetPospById(pospId, scope.role === "CLUSTER_MANAGER" ? scope.userId : undefined);
  if (!row) throw new AppError(ERROR_CODES.USER_NOT_FOUND, "POSP not found.");
  return toPublicPosp(row);
}

export async function assignClusterManager(pospId: number, clusterManagerId: string | null) {
  if (clusterManagerId) {
    const manager = await findUserById(clusterManagerId);
    if (!manager || manager.role !== "CLUSTER_MANAGER" || manager.status !== "ACTIVE") {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, "Not a valid active Cluster Manager.", {
        clusterManagerId: "Must be an active user with the Cluster Manager role.",
      });
    }
  }

  const existing = await repoGetPospById(pospId);
  if (!existing) throw new AppError(ERROR_CODES.USER_NOT_FOUND, "POSP not found.");

  const updated = await repoAssignClusterManager(pospId, clusterManagerId);
  if (!updated) throw new AppError(ERROR_CODES.USER_NOT_FOUND, "POSP not found.");
  return toPublicPosp(updated);
}

function toPublicVerification(row: VerificationRow) {
  return {
    id: row.id,
    pospId: row.pospId,
    documentType: row.documentType,
    data: row.data,
    value: row.value,
    filePath: row.filePath,
    pdfPath: row.pdfPath,
    isVerified: row.isVerified,
    remarks: row.remarks,
    status: row.status,
    dateUpdated: row.dateUpdated,
  };
}

const getEducationLevelsMap = memoizeAsync(async () => {
  const rows = await repoListEducations();
  return new Map(rows.map((r) => [String(r.id), r.education]));
}, 120_000);

/**
 * The education verification's `value` is a raw digi_educations.id — resolve
 * it to the human-readable qualification name instead of showing a bare
 * number. Used on both the GET (list) and PATCH (update) paths so the
 * resolved label never regresses back to a raw id after a write.
 */
async function withEducationLabel(row: VerificationRow): Promise<ReturnType<typeof toPublicVerification> & { valueLabel?: string }> {
  const publicRow = toPublicVerification(row);
  if (row.documentType !== "education" || !row.value) return publicRow;

  const educationLevels = await getEducationLevelsMap();
  const label = educationLevels.get(row.value);
  return label ? { ...publicRow, valueLabel: label } : publicRow;
}

export async function getVerification(pospId: number, scope: CallerScope) {
  const posp = await repoGetPospById(pospId, scope.role === "CLUSTER_MANAGER" ? scope.userId : undefined);
  if (!posp) throw new AppError(ERROR_CODES.USER_NOT_FOUND, "POSP not found.");
  const rows = await getVerificationsForPosp(pospId);
  return Promise.all(rows.map(withEducationLabel));
}

// Whitelist of writable columns — maps the API's `field` name to the real DB
// column, so a caller can never target an arbitrary column (e.g. posp_id, id).
const VERIFICATION_FIELD_COLUMNS: Record<string, string> = {
  isVerified: "is_verified",
  remarks: "remarks",
  value: "value",
  status: "status",
};

export async function updateVerificationField(pospId: number, verificationId: number, field: string, value: unknown, scope: CallerScope) {
  const posp = await repoGetPospById(pospId, scope.role === "CLUSTER_MANAGER" ? scope.userId : undefined);
  if (!posp) throw new AppError(ERROR_CODES.USER_NOT_FOUND, "POSP not found.");

  const column = VERIFICATION_FIELD_COLUMNS[field];
  if (!column) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, "Invalid field.", {
      field: `Must be one of: ${Object.keys(VERIFICATION_FIELD_COLUMNS).join(", ")}.`,
    });
  }

  const updated = await repoUpdateVerificationField(verificationId, pospId, column, value);
  if (!updated) throw new AppError(ERROR_CODES.USER_NOT_FOUND, "Verification record not found for this POSP.");
  return withEducationLabel(updated);
}

export async function listEducations() {
  const rows = await repoListEducations();
  return rows;
}
