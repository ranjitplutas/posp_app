import { pool } from "./pool.js";

export type CategoryCount = { label: string; count: number };

/** POSPs grouped by the state extracted from their Aadhaar verification data (address.splitAddress.state). */
export async function stateDistribution(): Promise<CategoryCount[]> {
  const { rows } = await pool.query<{ label: string; count: string }>(
    `
    SELECT COALESCE(NULLIF(trim(safe_to_jsonb(v.data) -> 'address' -> 'splitAddress' ->> 'state'), ''), 'Unknown') AS label,
           COUNT(DISTINCT v.posp_id)::text AS count
    FROM digi_user_verification v
    WHERE v.document_type = 'aadhar' AND v.is_active = true AND v.data IS NOT NULL
    GROUP BY 1
    ORDER BY 2 DESC
    `,
  );
  return rows.map((r) => ({ label: r.label, count: Number(r.count) }));
}

/** POSPs grouped by resolved qualification name (digi_educations.education). */
export async function educationDistribution(): Promise<CategoryCount[]> {
  const { rows } = await pool.query<{ label: string; count: string }>(
    `
    SELECT e.education AS label, COUNT(DISTINCT v.posp_id)::text AS count
    FROM digi_user_verification v
    JOIN digi_educations e ON e.id::text = v.value
    WHERE v.document_type = 'education' AND v.is_active = true AND v.value IS NOT NULL
    GROUP BY e.education
    ORDER BY count DESC
    `,
  );
  return rows.map((r) => ({ label: r.label, count: Number(r.count) }));
}

export type FunnelStageCounts = {
  signedUp: number;
  profileCompleted: number;
  panVerified: number;
  aadharVerified: number;
  bankVerified: number;
  educationVerified: number;
};

/**
 * Cumulative onboarding funnel — each stage's count is users who completed that
 * stage AND every stage before it (not an independent per-stage count), so the
 * numbers are guaranteed to monotonically decrease and "where are users stuck"
 * reads directly off the biggest stage-to-stage drop. pan/bank verification each
 * have two possible document_type rows for the same underlying check (OCR +
 * verification) — either one being is_verified=true counts as that stage done.
 * Excludes status=3 (Completed) — those users already finished onboarding, so
 * including them would mask where the *still-onboarding* population is stuck.
 */
export async function onboardingFunnel(): Promise<FunnelStageCounts> {
  const { rows } = await pool.query<{ [K in keyof FunnelStageCounts]: string }>(
    `
    WITH user_stage_flags AS (
      SELECT
        u.id,
        (u.profile_pic IS NOT NULL) AS profile_done,
        COALESCE(BOOL_OR(v.document_type IN ('pan_ocr', 'pan_verification') AND v.is_verified AND v.is_active), false) AS pan_done,
        COALESCE(BOOL_OR(v.document_type = 'aadhar' AND v.is_verified AND v.is_active), false) AS aadhar_done,
        COALESCE(BOOL_OR(v.document_type IN ('bank', 'bank_verification') AND v.is_verified AND v.is_active), false) AS bank_done,
        COALESCE(BOOL_OR(v.document_type = 'education' AND v.is_verified AND v.is_active), false) AS education_done
      FROM digi_user u
      LEFT JOIN digi_user_verification v ON v.posp_id = u.id
      WHERE u.status <> 3
      GROUP BY u.id, u.profile_pic
    )
    SELECT
      COUNT(*)::text AS "signedUp",
      COUNT(*) FILTER (WHERE profile_done)::text AS "profileCompleted",
      COUNT(*) FILTER (WHERE profile_done AND pan_done)::text AS "panVerified",
      COUNT(*) FILTER (WHERE profile_done AND pan_done AND aadhar_done)::text AS "aadharVerified",
      COUNT(*) FILTER (WHERE profile_done AND pan_done AND aadhar_done AND bank_done)::text AS "bankVerified",
      COUNT(*) FILTER (WHERE profile_done AND pan_done AND aadhar_done AND bank_done AND education_done)::text AS "educationVerified"
    FROM user_stage_flags
    `,
  );

  const r = rows[0]!;
  return {
    signedUp: Number(r.signedUp),
    profileCompleted: Number(r.profileCompleted),
    panVerified: Number(r.panVerified),
    aadharVerified: Number(r.aadharVerified),
    bankVerified: Number(r.bankVerified),
    educationVerified: Number(r.educationVerified),
  };
}
