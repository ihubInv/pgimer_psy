import { toast } from 'react-toastify';
import PGI_Logo from '../assets/PGI_Logo.png';

export const PRESCRIPTION_PRINT_STYLES = `
  @page {
    size: A4;
    margin: 12mm 10mm 20mm 10mm;
    @bottom-center {
      content: "This is electronically generated, no signature required";
      font-size: 8pt;
      color: #666;
      font-style: italic;
    }
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Times New Roman', serif;
    font-size: 10pt;
    line-height: 1.45;
    color: #000;
    background: white;
  }
  .print-header {
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 2px solid #000;
    text-align: center;
  }
  .print-header img {
    max-height: 64px;
    width: auto;
    display: block;
    margin: 0 auto 8px auto;
  }
  .print-header h1 {
    margin: 0 0 4px 0;
    font-size: 14pt;
    font-weight: bold;
    text-align: center;
    line-height: 1.25;
  }
  .print-header h2 {
    margin: 10px 0 0 0;
    font-size: 12pt;
    font-weight: bold;
    text-align: center;
    letter-spacing: 0.05em;
  }
  .print-header p { margin: 2px 0; font-size: 9pt; text-align: center; }
  .print-patient-info {
    font-size: 9.5pt;
    margin-bottom: 12px;
    padding: 8px 10px;
    border: 1px solid #000;
    background: #fafafa;
  }
  .print-patient-info .info-title {
    font-size: 10pt;
    font-weight: bold;
    margin-bottom: 8px;
    text-transform: uppercase;
    border-bottom: 1px solid #ccc;
    padding-bottom: 4px;
  }
  .print-patient-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px 24px;
  }
  .print-patient-grid .field {
    display: flex;
    gap: 6px;
    align-items: baseline;
  }
  .print-patient-grid .label {
    font-weight: bold;
    min-width: 0;
    flex-shrink: 0;
  }
  .print-patient-grid .value {
    flex: 1;
  }
  .print-patient-grid .full-width {
    grid-column: 1 / -1;
  }
  .print-section-title {
    font-size: 10pt;
    font-weight: bold;
    margin: 10px 0 6px 0;
    text-transform: uppercase;
  }
  .print-table {
    width: 100%;
    border-collapse: collapse;
    margin: 6px 0;
    font-size: 9pt;
  }
  .print-table th,
  .print-table td {
    border: 1px solid #000;
    padding: 5px 6px;
    text-align: left;
    vertical-align: top;
  }
  .print-table th {
    font-weight: bold;
    background: #f0f0f0;
  }
  .print-footer {
    margin-top: 16px;
    padding-top: 8px;
    border-top: 1px solid #000;
    font-size: 8pt;
    font-style: italic;
    text-align: center;
    color: #444;
  }
`;

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getLogoAbsoluteUrl() {
  const path = typeof PGI_Logo === 'string' ? PGI_Logo : '';
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}

function fieldRow(label, value, fullWidth = false) {
  if (value == null || value === '' || value === 'N/A') return '';
  return `
    <div class="field${fullWidth ? ' full-width' : ''}">
      <span class="label">${escapeHtml(label)}:</span>
      <span class="value">${escapeHtml(value)}</span>
    </div>`;
}

function buildPatientInfoBlockHtml(patient, meta = {}) {
  const ageSex =
    patient?.age || patient?.sex
      ? [patient.age ? `${patient.age} years` : '', patient.sex].filter(Boolean).join(', ')
      : '';

  const patientFields = patient
    ? [
        fieldRow('Patient Name', patient.name),
        fieldRow('CR Number', patient.cr_no),
        fieldRow('PSY Number', patient.psy_no),
        fieldRow('CGC Number', patient.cgc_number),
        fieldRow('Age / Sex', ageSex),
        fieldRow('Mobile', patient.mobile_no),
        fieldRow('Prescription Date', meta.prescriptionDate),
        fieldRow('Visit Type', meta.visitType ? meta.visitType.replace(/_/g, ' ') : ''),
        fieldRow('Prescribing Doctor', patient.assigned_doctor_name
          ? `${patient.assigned_doctor_name}${patient.assigned_doctor_role ? ` (${patient.assigned_doctor_role})` : ''}`
          : ''),
        fieldRow('Room Number', patient.assigned_room || 'N/A'),
        fieldRow('Patient Category', patient.patient_category),
      ].filter(Boolean).join('')
    : [
        fieldRow('Prescription Date', meta.prescriptionDate),
        fieldRow('Visit Type', meta.visitType ? meta.visitType.replace(/_/g, ' ') : ''),
      ].filter(Boolean).join('');

  if (!patientFields) return '';

  return `
    <div class="print-patient-info">
      <div class="info-title">Patient Information</div>
      <div class="print-patient-grid">
        ${patientFields}
      </div>
    </div>`;
}

/**
 * Build printable HTML for a single prescription record.
 */
export function buildPrescriptionPrintHtml(patient, medications, meta = {}) {
  return `
    ${buildPrintHeaderHtml()}
    ${buildPatientInfoBlockHtml(patient, meta)}
    ${buildMedicationTableHtml(medications, 'Medications Prescribed')}
    <div class="print-footer">This is electronically generated, no signature required</div>
  `;
}

function filterMedications(medications) {
  return (medications || []).filter(
    (m) => m.medicine || m.dosage || m.frequency || m.details
  );
}

function buildMedicationTableHtml(medications, sectionTitle = 'Medications Prescribed') {
  const meds = filterMedications(medications);
  const rows = meds
    .map(
      (row, idx) => `
      <tr>
        <td style="text-align:center">${idx + 1}</td>
        <td>${escapeHtml(row.medicine || '-')}</td>
        <td>${escapeHtml(row.dosage || '-')}</td>
        <td>${escapeHtml(row.when_to_take || row.when || '-')}</td>
        <td>${escapeHtml(row.frequency || '-')}</td>
        <td>${escapeHtml(row.duration || '-')}</td>
        <td style="text-align:center">${escapeHtml(row.quantity || row.qty || '-')}</td>
        <td>${escapeHtml(row.details || '-')}</td>
        <td>${escapeHtml(row.notes || '-')}</td>
      </tr>`
    )
    .join('');

  return `
    <h3 class="print-section-title">${escapeHtml(sectionTitle)}</h3>
    <table class="print-table">
      <thead>
        <tr>
          <th style="width:4%">#</th>
          <th style="width:20%">Medicine Name</th>
          <th style="width:11%">Dosage</th>
          <th style="width:9%">When</th>
          <th style="width:11%">Frequency</th>
          <th style="width:9%">Duration</th>
          <th style="width:7%">Qty</th>
          <th style="width:14%">Details</th>
          <th style="width:15%">Notes</th>
        </tr>
      </thead>
      <tbody>${rows || '<tr><td colspan="9">No medications recorded</td></tr>'}</tbody>
    </table>`;
}

function buildPrintHeaderHtml() {
  const logoUrl = getLogoAbsoluteUrl();
  return `
    <div class="print-header">
      ${logoUrl ? `<img src="${logoUrl}" alt="PGIMER Logo" />` : ''}
      <h1>POSTGRADUATE INSTITUTE OF<br />MEDICAL EDUCATION & RESEARCH</h1>
      <p>Department of Psychiatry</p>
      <p>Chandigarh, India</p>
      <h2>PRESCRIPTION</h2>
    </div>`;
}

/**
 * Build print HTML for one or more saved prescription records (view-details Print button).
 * @param {object} patient — normalized print patient from map*ForPrint / API
 * @param {Array<{ prescription?: Array, visit_date?: string, created_at?: string, visit_type?: string }>} prescriptionRecords
 * @param {{ flatMedications?: Array, formatDate?: (d: string) => string }} [options]
 */
export function buildPrescriptionPrintDocument(patient, prescriptionRecords = [], options = {}) {
  const formatDateLabel =
    options.formatDate ||
    ((d) => {
      if (!d) return '';
      try {
        return new Date(d).toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      } catch {
        return String(d);
      }
    });

  const groups = [];

  (prescriptionRecords || []).forEach((rec) => {
    const meds = filterMedications(rec.prescription);
    if (meds.length === 0) return;
    groups.push({
      meds,
      dateLabel: formatDateLabel(rec.visit_date || rec.created_at),
      visitType: rec.visit_type,
    });
  });

  if (groups.length === 0 && options.flatMedications?.length) {
    groups.push({
      meds: filterMedications(options.flatMedications),
      dateLabel: options.prescriptionDate || formatDateLabel(new Date().toISOString()),
      visitType: options.visitType,
    });
  }

  if (groups.length === 0) return null;

  if (groups.length === 1) {
    return buildPrescriptionPrintHtml(patient, groups[0].meds, {
      prescriptionDate: groups[0].dateLabel,
      visitType: groups[0].visitType,
    });
  }

  const tablesHtml = groups
    .map((g, i) => {
      const subtitle = [
        g.dateLabel,
        g.visitType ? g.visitType.replace(/_/g, ' ') : '',
      ]
        .filter(Boolean)
        .join(' · ');
      return buildMedicationTableHtml(
        g.meds,
        `Prescription ${i + 1}${subtitle ? ` — ${subtitle}` : ''}`
      );
    })
    .join('');

  const metaDate =
    groups.length > 1
      ? `${groups.length} prescription visits on file`
      : groups[0].dateLabel;

  return `
    ${buildPrintHeaderHtml()}
    ${buildPatientInfoBlockHtml(patient, { prescriptionDate: metaDate })}
    ${tablesHtml}
    <div class="print-footer">This is electronically generated, no signature required</div>
  `;
}

/** Print prescriptions with PGI letterhead and patient registration details. */
export function printPatientPrescriptions(patient, prescriptionRecords = [], options = {}) {
  if (!patient?.name?.trim()) {
    toast.error('Patient details are not available for printing');
    return false;
  }

  const html = buildPrescriptionPrintDocument(patient, prescriptionRecords, options);
  if (!html) {
    toast.error('No medications to print');
    return false;
  }

  openPrescriptionPrintWindow(html, `Prescription - ${patient.name}`);
  return true;
}

/** Open browser print dialog for prescription HTML. */
export function openPrescriptionPrintWindow(bodyHtml, title = 'Prescription') {
  if (!bodyHtml?.trim()) {
    toast.error('Nothing to print');
    return;
  }
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    toast.error('Please allow pop-ups to print');
    return;
  }

  const safeTitle = escapeHtml(title);

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${safeTitle}</title>
        <meta charset="UTF-8" />
        <style>${PRESCRIPTION_PRINT_STYLES}</style>
      </head>
      <body>${bodyHtml}</body>
    </html>
  `);
  printWindow.document.close();

  const triggerPrint = () => {
    try {
      printWindow.focus();
      printWindow.print();
    } catch {
      toast.error('Could not open print dialog');
    }
  };

  const img = printWindow.document.querySelector('.print-header img');
  if (img && !img.complete) {
    img.onload = () => setTimeout(triggerPrint, 150);
    img.onerror = () => setTimeout(triggerPrint, 150);
    setTimeout(triggerPrint, 800);
  } else {
    setTimeout(triggerPrint, 350);
  }
}
