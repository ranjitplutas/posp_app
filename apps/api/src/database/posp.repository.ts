import { pool } from "./pool.js";

export type PospRow = {
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
  isAgent: boolean;
  isUserActive: boolean;
  examAttemptCount: number;
  dateCreated: string;
  dateUpdated: string;
  clusterManagerId: string | null;
  clusterManagerName: string | null;
  clusterManagerEmail: string | null;
};

const POSP_COLUMNS = `
  u.id, u.posp_id AS "pospId", u.mobile_number AS "mobileNumber", u.user_fullname AS "fullName",
  u.email_address AS "emailAddress", u.profile_pic AS "profilePic", u.onboard_status::text AS "onboardStatus",
  u.is_active AS "isActive", u.status, u.ready_to_process AS "readyToProcess", u.is_synced AS "isSynced",
  u.is_agent AS "isAgent", u.is_user_active AS "isUserActive", u.exam_attempt_count AS "examAttemptCount",
  u.date_created AS "dateCreated", u.date_updated AS "dateUpdated",
  u.cluser_manager_id AS "clusterManagerId", cm.full_name AS "clusterManagerName", cm.email AS "clusterManagerEmail"
`;

const POSP_FROM = `
  FROM digi_user u
  LEFT JOIN digi_posp_app_users cm ON cm.id = u.cluser_manager_id
`;

export type ListPospFilter = {
  limit: number;
  page: number;
  search?: string;
  /** One or more statuses (OR'd together) — e.g. [2, 3] for "Approved or Completed", matching the dashboard's "Onboarded" card. */
  status?: number[];
  /** Scopes results to a single Cluster Manager's assigned POSPs — used for the CLUSTER_MANAGER role. */
  clusterManagerId?: string;
};

export async function listPosps(filter: ListPospFilter): Promise<{ items: PospRow[]; totalCount: number }> {
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (filter.search) {
    values.push(`%${filter.search.trim().toLowerCase()}%`);
    const i = values.length;
    conditions.push(
      `(LOWER(u.posp_id) LIKE $${i} OR LOWER(u.email_address) LIKE $${i} OR LOWER(u.user_fullname) LIKE $${i} OR LOWER(u.mobile_number) LIKE $${i})`,
    );
  }
  if (filter.status && filter.status.length > 0) {
    values.push(filter.status);
    conditions.push(`u.status = ANY($${values.length}::int[])`);
  }
  if (filter.clusterManagerId) {
    values.push(filter.clusterManagerId);
    conditions.push(`u.cluser_manager_id = $${values.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const countResult = await pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count ${POSP_FROM} ${whereClause}`, values);
  const totalCount = Number(countResult.rows[0]?.count ?? "0");

  const offset = (filter.page - 1) * filter.limit;
  values.push(filter.limit, offset);

  const { rows } = await pool.query<PospRow>(
    `SELECT ${POSP_COLUMNS} ${POSP_FROM} ${whereClause} ORDER BY u.date_created DESC LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values,
  );

  return { items: rows, totalCount };
}

export async function getPospById(id: number, clusterManagerId?: string): Promise<PospRow | null> {
  const conditions = ["u.id = $1"];
  const values: unknown[] = [id];
  if (clusterManagerId) {
    values.push(clusterManagerId);
    conditions.push(`u.cluser_manager_id = $${values.length}`);
  }

  const { rows } = await pool.query<PospRow>(`SELECT ${POSP_COLUMNS} ${POSP_FROM} WHERE ${conditions.join(" AND ")}`, values);
  return rows[0] ?? null;
}

/** Only ever touches cluser_manager_id — no other digi_user field is writable from this app. */
export async function assignClusterManager(pospId: number, clusterManagerId: string | null): Promise<PospRow | null> {
  const { rows } = await pool.query(`UPDATE digi_user SET cluser_manager_id = $2, date_updated = now() WHERE id = $1 RETURNING id`, [
    pospId,
    clusterManagerId,
  ]);
  if (!rows[0]) return null;
  return getPospById(pospId);
}

export type VerificationRow = {
  id: number;
  pospId: number;
  documentType: string;
  data: string | null;
  value: string | null;
  filePath: string | null;
  pdfPath: string | null;
  isVerified: boolean;
  remarks: string | null;
  status: number | null;
  dateUpdated: string | null;
};

const VERIFICATION_COLUMNS = `
  id, posp_id AS "pospId", document_type AS "documentType", data, value,
  file_path AS "filePath", pdf_path AS "pdfPath", is_verified AS "isVerified", remarks, status,
  date_updated AS "dateUpdated"
`;

export async function getVerificationsForPosp(pospId: number): Promise<VerificationRow[]> {
  const { rows } = await pool.query<VerificationRow>(
    `SELECT ${VERIFICATION_COLUMNS} FROM digi_user_verification WHERE posp_id = $1 AND is_active = true ORDER BY document_type`,
    [pospId],
  );
  return rows;
}

/** Whitelisted single-field updates only — never a full-record replace. Column name is validated by the caller against ALLOWED_VERIFICATION_FIELDS before this is called. */
export async function updateVerificationField(
  verificationId: number,
  pospId: number,
  column: string,
  value: unknown,
): Promise<VerificationRow | null> {
  const { rows } = await pool.query<VerificationRow>(
    `UPDATE digi_user_verification SET ${column} = $3, date_updated = now() WHERE id = $1 AND posp_id = $2 RETURNING ${VERIFICATION_COLUMNS}`,
    [verificationId, pospId, value],
  );
  return rows[0] ?? null;
}

export type EducationRow = { id: number; education: string };

export async function listEducations(): Promise<EducationRow[]> {
  const { rows } = await pool.query<EducationRow>(`SELECT id, education FROM digi_educations ORDER BY orders NULLS LAST, id`);
  return rows;
}
