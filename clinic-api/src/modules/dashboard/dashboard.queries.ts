// Values, including date_trunc's unit, are bound parameters. Filtering never wraps indexed dates.
const paidInvoices = `
  SELECT i.*, COALESCE(e.doctor_id, a.doctor_id) AS reporting_doctor_id
  FROM invoices i
  LEFT JOIN examinations e ON e.id = i.examination_id
  JOIN appointments a ON a.id = i.appointment_id
  WHERE i.status = 'PAID' AND i.paid_at >= $1::date
    AND i.paid_at < $2::date + INTERVAL '1 day'
    AND ($4::uuid IS NULL OR COALESCE(e.doctor_id, a.doctor_id) = $4::uuid)`;

const buckets = `SELECT generate_series(date_trunc($3::text, $1::date::timestamp),
  date_trunc($3::text, $2::date::timestamp), ('1 ' || $3::text)::interval) AS bucket`;

export const dashboardQueries = {
  revenue: `WITH paid AS (${paidInvoices}), buckets AS (${buckets}), totals AS (
    SELECT date_trunc($3::text, paid_at) AS bucket, COUNT(*) AS invoices,
      SUM(consultation_fee) AS consultation, SUM(service_fee) AS services, SUM(medicine_fee) AS medicine,
      SUM(insurance_covered) AS insurance, SUM(discount_amount) AS discount,
      SUM(total_amount) AS net, SUM(prepaid_amount) AS prepaid
    FROM paid GROUP BY 1
  ) SELECT b.bucket::date::text AS label, COALESCE(t.invoices, 0)::text AS invoices,
    COALESCE(t.consultation, 0)::text AS consultation, COALESCE(t.services, 0)::text AS services,
    COALESCE(t.medicine, 0)::text AS medicine, COALESCE(t.insurance, 0)::text AS insurance,
    COALESCE(t.discount, 0)::text AS discount, COALESCE(t.net, 0)::text AS net,
    COALESCE(t.prepaid, 0)::text AS prepaid
    FROM buckets b LEFT JOIN totals t USING (bucket) ORDER BY b.bucket`,

  visits: `WITH buckets AS (${buckets}), visits AS (
    SELECT a.appointment_date, CASE
      WHEN a.status = 'CANCELLED' OR e.status = 'CANCELLED' THEN 'cancelled'
      WHEN a.status = 'NO_SHOW' THEN 'noShow'
      WHEN e.status = 'COMPLETED' OR a.status = 'COMPLETED' THEN 'completed'
      WHEN e.status = 'IN_PROGRESS' OR a.status = 'IN_PROGRESS' THEN 'inProgress'
      ELSE 'waiting' END AS state
    FROM appointments a LEFT JOIN examinations e ON e.appointment_id = a.id
    WHERE a.appointment_date >= $1::date AND a.appointment_date <= $2::date
      AND ($4::uuid IS NULL OR COALESCE(e.doctor_id, a.doctor_id) = $4::uuid)
  ), totals AS (
    SELECT date_trunc($3::text, appointment_date::timestamp) AS bucket,
      COUNT(*) FILTER (WHERE state = 'completed') AS completed,
      COUNT(*) FILTER (WHERE state = 'cancelled') AS cancelled,
      COUNT(*) FILTER (WHERE state = 'waiting') AS waiting,
      COUNT(*) FILTER (WHERE state = 'inProgress') AS "inProgress",
      COUNT(*) FILTER (WHERE state = 'noShow') AS "noShow"
    FROM visits GROUP BY 1
  ) SELECT b.bucket::date::text AS label, COALESCE(t.completed, 0)::text AS completed,
    COALESCE(t.cancelled, 0)::text AS cancelled, COALESCE(t.waiting, 0)::text AS waiting,
    COALESCE(t."inProgress", 0)::text AS "inProgress", COALESCE(t."noShow", 0)::text AS "noShow"
    FROM buckets b LEFT JOIN totals t USING (bucket) ORDER BY b.bucket`,

  doctors: `WITH paid AS (${paidInvoices}), revenue AS (
    SELECT reporting_doctor_id AS doctor_id, SUM(total_amount) AS net,
      SUM(consultation_fee) AS consultation, SUM(service_fee) AS services, SUM(medicine_fee) AS medicine,
      COUNT(*) AS paid_invoices
    FROM paid GROUP BY reporting_doctor_id
  ), completed AS (
    SELECT e.doctor_id, COUNT(*) AS visits, COUNT(DISTINCT COALESCE(e.patient_id, a.patient_id)) AS patients
    FROM examinations e JOIN appointments a ON a.id = e.appointment_id
    WHERE e.status = 'COMPLETED' AND e.completed_at >= $1::date
      AND e.completed_at < $2::date + INTERVAL '1 day'
      AND ($4::uuid IS NULL OR e.doctor_id = $4::uuid)
    GROUP BY e.doctor_id
  ), ranked AS (
    SELECT d.id, u.full_name AS "fullName", d.specialty,
      COALESCE(c.visits, 0)::int AS "completedVisits", COALESCE(c.patients, 0)::int AS "uniquePatients",
      COALESCE(r.paid_invoices, 0)::int AS "paidInvoices", COALESCE(r.net, 0) AS "netRevenue",
      COALESCE(r.consultation, 0) AS consultation, COALESCE(r.services, 0) AS services, COALESCE(r.medicine, 0) AS medicine
    FROM doctors d JOIN users u ON u.id = d.user_id
    LEFT JOIN completed c ON c.doctor_id = d.id LEFT JOIN revenue r ON r.doctor_id = d.id
    WHERE ($4::uuid IS NULL OR d.id = $4::uuid)
  ), page AS (SELECT * FROM ranked ORDER BY "netRevenue" DESC, "completedVisits" DESC, id LIMIT $5 OFFSET $6)
  SELECT (SELECT COUNT(*)::int FROM ranked) AS total,
    COALESCE((SELECT json_agg(page ORDER BY "netRevenue" DESC, "completedVisits" DESC, id) FROM page), '[]'::json) AS items,
    $3::text AS period`,

  diagnoses: `WITH classified AS (
    SELECT CASE WHEN NULLIF(trim(icd10_code), '') IS NOT NULL THEN 'ICD10:' || upper(trim(icd10_code))
      ELSE 'TEXT:' || lower(regexp_replace(trim(diagnosis), '\\s+', ' ', 'g')) END AS key,
      NULLIF(upper(trim(icd10_code)), '') AS code,
      COALESCE(NULLIF(trim(icd10_description), ''), NULLIF(trim(diagnosis), ''), trim(icd10_code)) AS label
    FROM examinations
    WHERE status = 'COMPLETED' AND completed_at >= $1::date
      AND completed_at < $2::date + INTERVAL '1 day'
      AND ($4::uuid IS NULL OR doctor_id = $4::uuid)
      AND (NULLIF(trim(icd10_code), '') IS NOT NULL OR NULLIF(trim(diagnosis), '') IS NOT NULL)
  ) SELECT key, MAX(code) AS code, MIN(label) AS label, COUNT(*)::int AS count,
    SUM(COUNT(*)) OVER ()::int AS "totalDiagnosed", $3::text AS period
    FROM classified GROUP BY key ORDER BY count DESC, key LIMIT 5`,

  medicines: `WITH issued AS (
    SELECT pd.*, COALESCE('ID:' || pd.medicine_id::text,
      'CODE:' || NULLIF(upper(trim(pd.medicine_code)), ''),
      'NAME:' || lower(trim(pd.medicine_name)) || ':' || COALESCE(lower(trim(pd.dosage)), '')) AS medicine_key
    FROM prescriptions p JOIN prescription_details pd ON pd.prescription_id = p.id
    JOIN examinations e ON e.id = p.examination_id
    WHERE p.dispensing_status = 'DISPENSED' AND p.payment_status = 'PAID'
      AND p.dispensed_at >= $1::date AND p.dispensed_at < $2::date + INTERVAL '1 day'
      AND ($4::uuid IS NULL OR e.doctor_id = $4::uuid)
  ) SELECT medicine_key AS key, MAX(medicine_id::text) AS "medicineId", MIN(medicine_code) AS code,
    MIN(medicine_name) AS label, unit::text AS unit, SUM(quantity)::bigint::text AS quantity,
    COUNT(DISTINCT prescription_id)::int AS prescriptions, SUM(total_price)::text AS "grossAmount",
    $3::text AS period
    FROM issued GROUP BY medicine_key, unit ORDER BY SUM(quantity) DESC, medicine_key, unit LIMIT $5`,
} as const;
