/** Shared formatters for patient report export (Excel + HTML). */

function formatDate(date) {
  if (!date) return 'N/A';
  try {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return String(date);
  }
}

function formatDateTime(date) {
  if (!date) return 'N/A';
  try {
    return new Date(date).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(date);
  }
}

function formatValue(value) {
  if (value === null || value === undefined || value === '') return 'N/A';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.length ? value.join(', ') : 'N/A';
  return String(value);
}

function sanitizeFilename(name) {
  return String(name || 'patient')
    .replace(/[^a-z0-9]/gi, '_')
    .toLowerCase()
    .slice(0, 80);
}

function escHtml(value) {
  if (value == null || value === '') return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isMWORole(role) {
  return role === 'Psychiatric Welfare Officer';
}

function canViewClinicalHistory(role) {
  return ['Admin', 'Faculty', 'Resident'].includes(role);
}

function clinicalProformasOnly(records) {
  return (records || []).filter((r) => r.record_type !== 'followup_visit');
}

function followupVisitsOnly(records) {
  return (records || []).filter((r) => r.record_type === 'followup_visit');
}

function flattenPrescriptionRows(prescriptionRecords) {
  const rows = [];
  (prescriptionRecords || []).forEach((record) => {
    const meds = Array.isArray(record.prescriptions) ? record.prescriptions : [];
    if (meds.length === 0) {
      rows.push({
        prescription_record_id: record.id,
        proforma_id: record.clinical_proforma_id,
        visit_date: record.visit_date,
        visit_type: record.visit_type,
        medicine: 'N/A',
        dosage: 'N/A',
        when_to_take: 'N/A',
        frequency: 'N/A',
        duration: 'N/A',
        quantity: 'N/A',
        details: 'N/A',
        notes: 'N/A',
        created_at: record.created_at,
      });
      return;
    }
    meds.forEach((med, idx) => {
      rows.push({
        prescription_record_id: record.id,
        proforma_id: record.clinical_proforma_id,
        visit_date: record.visit_date,
        visit_type: record.visit_type,
        medicine: med.medicine,
        dosage: med.dosage,
        when_to_take: med.when_to_take || med.when,
        frequency: med.frequency,
        duration: med.duration,
        quantity: med.quantity || med.qty,
        details: med.details,
        notes: med.notes,
        created_at: record.created_at,
        prescription_index: idx + 1,
      });
    });
  });
  return rows;
}

module.exports = {
  formatDate,
  formatDateTime,
  formatValue,
  sanitizeFilename,
  escHtml,
  isMWORole,
  canViewClinicalHistory,
  clinicalProformasOnly,
  followupVisitsOnly,
  flattenPrescriptionRows,
};
