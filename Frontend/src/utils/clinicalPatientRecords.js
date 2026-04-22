/**
 * GET /clinical-proformas/patient/:id returns a merged list: rows from
 * `clinical_proforma` plus rows shaped like proformas from `followup_visits`
 * (`record_type: 'followup_visit'`). Prescription and proforma-by-id APIs
 * expect `clinical_proforma` primary keys only.
 */

export function clinicalProformaRecordsOnly(proformas) {
  if (!Array.isArray(proformas)) return [];
  return proformas.filter((p) => p && p.record_type !== 'followup_visit');
}

export function followupVisitRecordsFromPatientApi(proformas) {
  if (!Array.isArray(proformas)) return [];
  return proformas.filter((p) => p && p.record_type === 'followup_visit');
}
