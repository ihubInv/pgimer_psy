const XLSX = require('xlsx');
const {
  formatDate,
  formatDateTime,
  formatValue,
  sanitizeFilename,
} = require('./patientReportFormatters');

function buildPatientDetailsRow(patient, isMWO) {
  const row = {
    'Patient ID': patient.id,
    'CR No': formatValue(patient.cr_no),
    'PSY No': formatValue(patient.psy_no),
    'ADL No': formatValue(patient.adl_no),
    'Name': formatValue(patient.name),
    'Age': formatValue(patient.age),
    'Sex': formatValue(patient.sex),
    'Contact Number': formatValue(patient.contact_number),
    'Age Group': formatValue(patient.age_group),
    'Marital Status': formatValue(patient.marital_status),
    'Occupation': formatValue(patient.occupation),
    'Education': formatValue(patient.education),
    'Religion': formatValue(patient.religion),
    'Family Type': formatValue(patient.family_type),
    'Locality': formatValue(patient.locality),
    'Assigned Room': formatValue(patient.assigned_room),
    'Assigned Doctor': patient.assigned_doctor_name
      ? `${patient.assigned_doctor_name}${patient.assigned_doctor_role ? ` (${patient.assigned_doctor_role})` : ''}`
      : 'Not assigned',
    'Seen in Walk-in On': patient.seen_in_walk_in_on ? formatDate(patient.seen_in_walk_in_on) : 'N/A',
    'Present Address': formatValue(patient.present_address_line_1 || patient.address_line),
    'Present City': formatValue(patient.present_city_town_village || patient.city),
    'Present State': formatValue(patient.present_state || patient.state),
    'Present Pin Code': formatValue(patient.present_pin_code || patient.pin_code),
    'Case Complexity': formatValue(patient.case_complexity),
    'Department': formatValue(patient.department),
    'File No': formatValue(patient.file_no),
    'Special Clinic No': formatValue(patient.special_clinic_no),
    'Created At': patient.created_at ? formatDateTime(patient.created_at) : 'N/A',
  };

  if (!isMWO) {
    Object.assign(row, {
      Category: formatValue(patient.category),
      'Unit/Consit': formatValue(patient.unit_consit),
      'Room No': formatValue(patient.room_no),
      'Serial No': formatValue(patient.serial_no),
      'Unit Days': formatValue(patient.unit_days),
    });
  }

  return row;
}

function buildClinicalRows(report) {
  const { patient, clinicalProformas } = report;
  return clinicalProformas.map((proforma, index) => ({
    'Patient ID': patient.id,
    'Patient Name': formatValue(patient.name),
    'CR No': formatValue(patient.cr_no),
    'Visit #': index + 1,
    'Visit Date': proforma.visit_date ? formatDate(proforma.visit_date) : 'N/A',
    'Visit Type': proforma.visit_type === 'first_visit' ? 'First Visit' : 'Follow-up',
    'Room Number': formatValue(proforma.room_no),
    'Doctor Name': formatValue(proforma.doctor_name),
    'Doctor Role': formatValue(proforma.doctor_role),
    'Diagnosis': formatValue(proforma.diagnosis),
    'ICD Code': formatValue(proforma.icd_code),
    'Disposal': formatValue(proforma.disposal),
    'Treatment Prescribed': formatValue(proforma.treatment_prescribed),
    'Doctor Decision':
      proforma.doctor_decision === 'complex_case'
        ? 'Instantly Requires Detailed Work-Up'
        : proforma.doctor_decision === 'simple_case'
          ? 'Requires Detailed Workup on Next Follow-Up'
          : 'N/A',
    'Created At': proforma.created_at ? formatDateTime(proforma.created_at) : 'N/A',
  }));
}

function buildFollowUpRows(report) {
  const { patient, followUpVisits } = report;
  return followUpVisits.map((fu, index) => ({
    'Patient ID': patient.id,
    'Patient Name': formatValue(patient.name),
    'CR No': formatValue(patient.cr_no),
    'Follow-up #': index + 1,
    'Visit Date': fu.visit_date ? formatDate(fu.visit_date) : 'N/A',
    'Room': formatValue(fu.room_no),
    'Doctor': formatValue(fu.doctor_name),
    'Clinical Assessment': formatValue(fu.clinical_assessment),
    'Created At': fu.created_at ? formatDateTime(fu.created_at) : 'N/A',
  }));
}

function buildAdlRows(report) {
  const { patient, adlFiles } = report;
  return adlFiles.map((file, index) => ({
    'Patient ID': patient.id,
    'Patient Name': formatValue(patient.name),
    'CR No': formatValue(patient.cr_no),
    'ADL File #': index + 1,
    'ADL Number': formatValue(file.adl_no),
    'File Status': formatValue(file.file_status),
    'Assigned Doctor': file.assigned_doctor_name
      ? `${file.assigned_doctor_name}${file.assigned_doctor_role ? ` (${file.assigned_doctor_role})` : ''}`
      : 'N/A',
    'Visit Date': file.proforma_visit_date ? formatDate(file.proforma_visit_date) : 'N/A',
    'Physical File Location': formatValue(file.physical_file_location),
    'Total Visits': formatValue(file.total_visits),
    'File Created Date': file.file_created_date ? formatDate(file.file_created_date) : 'N/A',
    'Last Updated': file.updated_at ? formatDateTime(file.updated_at) : 'N/A',
  }));
}

function buildPrescriptionRows(report) {
  const { patient, flatPrescriptions } = report;
  return flatPrescriptions.map((p, index) => ({
    'Patient ID': patient.id,
    'Patient Name': formatValue(patient.name),
    'CR No': formatValue(patient.cr_no),
    'Prescription #': index + 1,
    'Visit Date': p.visit_date ? formatDate(p.visit_date) : 'N/A',
    'Visit Type': p.visit_type === 'first_visit' ? 'First Visit' : 'Follow-up',
    Medicine: formatValue(p.medicine),
    Dosage: formatValue(p.dosage),
    'When to Take': formatValue(p.when_to_take),
    Frequency: formatValue(p.frequency),
    Duration: formatValue(p.duration),
    Quantity: formatValue(p.quantity),
    Details: formatValue(p.details),
    Notes: formatValue(p.notes),
    'Prescribed At': p.created_at ? formatDateTime(p.created_at) : 'N/A',
  }));
}

function appendSheet(wb, name, rows) {
  if (!rows || rows.length === 0) return;
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
}

function buildWorkbookFromReport(report) {
  const wb = XLSX.utils.book_new();
  const { patient, isMWO, includeHistory } = report;

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet([buildPatientDetailsRow(patient, isMWO)]),
    'Patient Details'
  );

  if (includeHistory) {
    const clinical = buildClinicalRows(report);
    const followUps = buildFollowUpRows(report);
    const adl = buildAdlRows(report);
    const rx = buildPrescriptionRows(report);

    if (clinical.length) appendSheet(wb, 'Clinical Proformas', clinical);
    if (followUps.length) appendSheet(wb, 'Follow-Up Visits', followUps);
    if (adl.length) appendSheet(wb, 'ADL Files', adl);
    if (rx.length) appendSheet(wb, 'Prescriptions', rx);
  }

  return wb;
}

function buildBulkWorkbook(reports) {
  const wb = XLSX.utils.book_new();

  const patientRows = reports.map((r) => buildPatientDetailsRow(r.patient, r.isMWO));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(patientRows), 'Patient Details');

  const includeHistory = reports.some((r) => r.includeHistory);
  if (includeHistory) {
    const clinical = reports.flatMap(buildClinicalRows);
    const followUps = reports.flatMap(buildFollowUpRows);
    const adl = reports.flatMap(buildAdlRows);
    const rx = reports.flatMap(buildPrescriptionRows);

    if (clinical.length) appendSheet(wb, 'Clinical Proformas', clinical);
    if (followUps.length) appendSheet(wb, 'Follow-Up Visits', followUps);
    if (adl.length) appendSheet(wb, 'ADL Files', adl);
    if (rx.length) appendSheet(wb, 'Prescriptions', rx);
  }

  return wb;
}

function workbookToBuffer(wb) {
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

function reportFilename(report, ext = 'xlsx') {
  const name = sanitizeFilename(report.patient?.name || report.patient?.cr_no || 'patient');
  const date = new Date().toISOString().split('T')[0];
  return `patient_${name}_${date}.${ext}`;
}

function bulkFilename(dateFrom, dateTo) {
  const today = new Date().toISOString().split('T')[0];
  if (dateFrom && dateTo) {
    return `patients_export_${dateFrom}_to_${dateTo}.xlsx`;
  }
  return `patients_export_${today}.xlsx`;
}

module.exports = {
  buildWorkbookFromReport,
  buildBulkWorkbook,
  workbookToBuffer,
  reportFilename,
  bulkFilename,
};
