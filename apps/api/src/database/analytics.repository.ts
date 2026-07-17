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
