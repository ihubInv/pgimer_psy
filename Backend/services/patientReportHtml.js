/**
 * patientReportHtml.js
 *
 * Generates the full "Print All Cards" combined patient report HTML,
 * matching the frontend's handlePrintAllCards output exactly.
 *
 * Called by PatientReportController.getPatientReport (format=html|pdf).
 */

'use strict';

const {
  getLogoDataUri,
  buildPatientDetailsSectionsHtml,
  buildClinicalProformaSectionsHtml,
  buildAdlIntakeSectionsHtml,
  buildPrescriptionSectionsHtml,
  esc,
  v,
  fmtDate,
} = require('./reportHtmlSections');

/* ── Unified CSS (matches frontend handlePrintAllCards CSS) ─ */

const COMBINED_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
@page { size: A4 portrait; margin: 10mm 10mm 10mm 10mm; }
*, *::before, *::after { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { font-family: 'Inter','Roboto','Segoe UI',Arial,sans-serif; font-size: 9pt; line-height: 1.35; color: #111827; margin: 0; padding: 0; background: #fff; }

/* ── SINGLE DOCUMENT HEADER ── */
.doc-hdr { display: flex; align-items: center; gap: 10px; padding: 5px 0; border-bottom: 3px solid #1E3A8A; margin-bottom: 5px; }
.doc-hdr img { max-width: 60px; max-height: 60px; width: auto; height: auto; flex-shrink: 0; }
.doc-hdr-text { flex: 1; text-align: center; }
.doc-hdr-text h1 { margin: 0; font-size: 12pt; font-weight: 700; color: #1E3A8A; line-height: 1.2; }
.doc-hdr-text .dept { font-size: 9pt; color: #374151; font-weight: 600; margin: 1px 0 0; }
.doc-hdr-text .rpt-title { font-size: 9.5pt; font-weight: 700; color: #1E3A8A; text-transform: uppercase; letter-spacing: 0.4px; margin: 2px 0 0; }

/* ── PATIENT SUMMARY BAR ── */
.pt-summary { border: 1px solid #D1D5DB; border-radius: 4px; overflow: hidden; margin-bottom: 6px; background: #F8FAFC; }
.pt-summary-row { display: grid; gap: 0; }
.pt-summary-row.row1 { grid-template-columns: repeat(4,1fr); }
.pt-summary-row.row2 { grid-template-columns: repeat(3,1fr); border-top: 1px solid #E5E7EB; }
.ps-cell { padding: 4px 8px; border-right: 1px solid #E5E7EB; font-size: 8pt; }
.ps-cell:last-child { border-right: none; }
.ps-cell .psl { font-weight: 600; color: #6B7280; font-size: 7pt; text-transform: uppercase; display: block; }
.ps-cell .psv { font-weight: 700; color: #111827; font-size: 8.5pt; }

/* ── CARD GROUPS ── */
.card-group { margin: 6px 0; }
.card-group-title { font-size: 8pt; font-weight: 700; color: #1E3A8A; text-transform: uppercase; letter-spacing: 0.5px; padding: 3px 0; border-bottom: 2px solid #BFDBFE; margin-bottom: 4px; }
.card-group-body { padding: 0; }
.card-empty { font-size: 8pt; color: #9CA3AF; font-style: italic; padding: 4px 0; }

/* ── SECTIONS ── */
.sec { margin: 8px 0; }
.sec-hdr { color: #fff; font-size: 8pt; font-weight: 700; padding: 3px 7px; border-radius: 3px 3px 0 0; text-transform: uppercase; letter-spacing: 0.5px; }
.sec-body { border: 1px solid #D1D5DB; border-top: none; border-radius: 0 0 3px 3px; padding: 5px 7px; background: #fff; }

/* ── KV GRID ── */
.kv-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0; }
.kv-grid.cols-2 { grid-template-columns: repeat(2,1fr); }
.kv-grid.cols-3 { grid-template-columns: repeat(3,1fr); }
.kv-grid.cols-4 { grid-template-columns: repeat(4,1fr); }
.kv { padding: 3px 5px; border-bottom: 1px solid #F3F4F6; border-right: 1px solid #F3F4F6; }
.kv.span2 { grid-column: span 2; }
.kv.span3 { grid-column: span 3; }
.kv.span4 { grid-column: span 4; border-right: none; }
.kv .kl { font-size: 7pt; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.2px; display: block; margin-bottom: 1px; }
.kv .kv-val { font-size: 8.5pt; color: #111827; font-weight: 500; }

/* ── TABLES ── */
table { width: 100%; border-collapse: collapse; font-size: 8.5pt; margin: 0; }
table th { background: #EFF6FF; color: #1E3A8A; font-weight: 700; padding: 3px 5px; border: 1px solid #BFDBFE; text-align: left; font-size: 7.5pt; text-transform: uppercase; }
table td { padding: 3px 5px; border: 1px solid #E5E7EB; vertical-align: top; }
table tbody tr:nth-child(even) td { background: #F9FAFB; }

/* ── NARRATIVE ── */
.narrative { font-size: 9pt; line-height: 1.4; color: #111827; white-space: pre-wrap; text-align: justify; padding: 2px 0; }

/* ── PHYSICAL EXAM ── */
.phys-lbl { font-weight: 600; background: #F8FAFC !important; color: #374151; font-size: 8pt; width: 22%; white-space: nowrap; }

/* ── MSE / ASSESS label columns ── */
.assess-lbl { font-weight: 600; background: #F8FAFC !important; width: 30%; color: #1E3A8A; font-size: 8pt; white-space: nowrap; }
.mse-lbl { font-weight: 600; background: #FAFAFA !important; width: 32%; color: #374151; font-size: 8pt; white-space: nowrap; }

/* ── HIGHLIGHTED BOXES ── */
.diag-box { background: #EFF6FF; border: 1px solid #BFDBFE; border-left: 4px solid #1E3A8A; border-radius: 3px; padding: 5px 7px; }
.assessment-box { background: #F0FDF4; border: 1px solid #BBF7D0; border-left: 4px solid #16A34A; border-radius: 3px; padding: 0; overflow: hidden; }
.assessment-box table th { background: #DCFCE7; color: #15803D; border-color: #A7F3D0; }
.assessment-box table td { border-color: #BBF7D0; }

/* ── TWO-COL ── */
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.sub-lbl { font-size: 7.5pt; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.3px; margin: 4px 0 2px; }

/* ── CHIPS (for clinical proforma checkboxes) ── */
.chips-row { display: flex; flex-wrap: wrap; gap: 2px; padding: 2px 4px; }
.chip { background: #ECFDF5; border: 1px solid #A7F3D0; color: #065F46; font-size: 7.5pt; font-weight: 600; padding: 1px 5px; border-radius: 10px; }

/* ── PRESCRIPTION TABLES ── */
.presc-title { font-size: 8.5pt; font-weight: 700; color: #1E3A8A; text-transform: uppercase; margin: 6px 0 3px; }
.presc-table th { background: #F3F4F6; color: #111827; border-color: #D1D5DB; }
.presc-table td { padding: 2px 5px; border: 1px solid #D1D5DB; }

/* ── DOCUMENT FOOTER ── */
.doc-ftr { margin-top: 8px; padding-top: 5px; border-top: 1px solid #D1D5DB; text-align: center; font-size: 7pt; color: #6B7280; }
.doc-ftr p { margin: 1px 0; }

/* ── PRINT RULES ── */
@media print {
  table           { page-break-inside: avoid; }
  .diag-box       { page-break-inside: avoid; }
  .assessment-box { page-break-inside: avoid; }
  .narrative      { page-break-inside: auto;  }
  .two-col        { page-break-inside: auto;  }
  .card-group     { page-break-inside: auto;  }
  .sec            { page-break-inside: auto;  }
}
`;

/* ── Card group wrapper ─────────────────────────────────── */

function cardGroup(title, sectionsHtml) {
  if (!sectionsHtml || !String(sectionsHtml).trim()) {
    return `<div class="card-group">
  <div class="card-group-title">${esc(title)}</div>
  <div class="card-group-body card-empty">No records available.</div>
</div>`;
  }
  return `<div class="card-group">
  <div class="card-group-title">${esc(title)}</div>
  <div class="card-group-body">${sectionsHtml}</div>
</div>`;
}

/* ── Per-section metadata ───────────────────────────────── */

const SECTION_META = {
  'patient-details': {
    reportTitle: 'Patient Details',
    cardTitle: 'Patient Details',
    build: (report) =>
      buildPatientDetailsSectionsHtml(
        report.patient,
        report.isMWO ? 'Psychiatric Welfare Officer' : null
      ),
  },
  'clinical-proforma': {
    reportTitle: 'Walk-in Clinical Proforma',
    cardTitle: 'Walk-in Clinical Proforma',
    build: (report) =>
      report.firstVisitProforma
        ? buildClinicalProformaSectionsHtml(
            report.firstVisitProforma,
            report.patient,
            report.clinicalOptions
          )
        : '',
  },
  adl: {
    reportTitle: 'Out-Patient Intake Record',
    cardTitle: 'Out-Patient Intake Record',
    build: (report) => {
      const adlFile =
        (report.adlFiles || []).find((f) => f.is_active !== false) ||
        report.adlFiles?.[0] ||
        null;
      return buildAdlIntakeSectionsHtml(adlFile, report.patient);
    },
  },
  prescription: {
    reportTitle: 'Prescription',
    cardTitle: 'Prescription',
    build: (report) => buildPrescriptionSectionsHtml(report.prescriptionRecords),
  },
};

const VALID_SECTIONS = Object.keys(SECTION_META);

function buildPatientSummaryHtml(patient) {
  const ptName = patient.name || '—';
  const ptCrNo = patient.cr_no || '—';
  const ptPsyNo = patient.psy_no || '—';
  const ptAge = patient.age || '—';
  const ptSex = patient.sex || '—';
  const ptMobile = patient.contact_number || '—';
  const ptDept = patient.department || '—';
  const ptFileNo = patient.file_no || '—';
  const ptDate = patient.date ? fmtDate(patient.date) : '—';

  return `<div class="pt-summary">
  <div class="pt-summary-row row1">
    <div class="ps-cell"><span class="psl">CR No.</span><span class="psv">${esc(ptCrNo)}</span></div>
    <div class="ps-cell"><span class="psl">Patient Name</span><span class="psv">${esc(ptName)}</span></div>
    <div class="ps-cell"><span class="psl">Age / Sex</span><span class="psv">${esc(ptAge)} / ${esc(ptSex)}</span></div>
    <div class="ps-cell"><span class="psl">Reg. Date</span><span class="psv">${esc(ptDate)}</span></div>
  </div>
  <div class="pt-summary-row row2">
    <div class="ps-cell"><span class="psl">Mobile</span><span class="psv">${esc(ptMobile)}</span></div>
    <div class="ps-cell"><span class="psl">Department</span><span class="psv">${esc(ptDept)}</span></div>
    <div class="ps-cell"><span class="psl">File No. / Psy. No.</span><span class="psv">${esc(ptFileNo)} / ${esc(ptPsyNo)}</span></div>
  </div>
</div>`;
}

function wrapReportDocument({ patient, reportTitle, bodyHtml }) {
  const logoDataUri = getLogoDataUri();
  const generatedOn = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(reportTitle)} — ${esc(v(patient.name || patient.cr_no))}</title>
  <style>${COMBINED_CSS}</style>
</head>
<body>

  <div class="doc-hdr">
    ${logoDataUri ? `<img src="${logoDataUri}" alt="PGIMER Logo" />` : ''}
    <div class="doc-hdr-text">
      <h1>POSTGRADUATE INSTITUTE OF MEDICAL EDUCATION &amp; RESEARCH</h1>
      <div class="dept">Department of Psychiatry, Chandigarh</div>
      <div class="rpt-title">${esc(reportTitle)}</div>
    </div>
  </div>

  ${bodyHtml}

  <div class="doc-ftr">
    <p><strong>Generated:</strong> ${esc(generatedOn)}</p>
    <p>PGIMER — Department of Psychiatry | Electronic Medical Record System</p>
    <p>Computer-generated document — no signature required.</p>
  </div>

  <script>
    window.onload = function () {
      setTimeout(function () { window.focus(); window.print(); }, 350);
    };
  </script>

</body>
</html>`;
}

/** Single-card print report for one section (patient-details, clinical-proforma, adl, prescription). */
function buildPatientSectionReportHtml(report, section) {
  const meta = SECTION_META[section];
  if (!meta) {
    const err = new Error(`Invalid report section: ${section}`);
    err.statusCode = 400;
    throw err;
  }

  const sectionsHtml = meta.build(report);
  const cardHtml = cardGroup(meta.cardTitle, sectionsHtml);
  const patientSummary = buildPatientSummaryHtml(report.patient);

  return wrapReportDocument({
    patient: report.patient,
    reportTitle: meta.reportTitle,
    bodyHtml: `${patientSummary}\n${cardHtml}`,
  });
}

/* ── Main builder ───────────────────────────────────────── */

function buildPatientReportHtml(report) {
  const {
    patient,
    firstVisitProforma,
    adlFiles,
    prescriptionRecords,
    clinicalOptions,
    includeHistory,
    isMWO,
  } = report;

  const patientSummary = buildPatientSummaryHtml(patient);

  /* ── 2. Card sections ── */
  const cards = [];

  // Patient Details card (always shown)
  const pdHtml = buildPatientDetailsSectionsHtml(patient, isMWO ? 'Psychiatric Welfare Officer' : null);
  cards.push(cardGroup('Patient Details', pdHtml));

  if (includeHistory) {
    // Walk-in Clinical Proforma card
    const cpHtml = firstVisitProforma
      ? buildClinicalProformaSectionsHtml(firstVisitProforma, patient, clinicalOptions)
      : '';
    cards.push(cardGroup('Walk-in Clinical Proforma', cpHtml));

    // Out-Patient Intake Record (ADL) card
    const adlFile = (adlFiles || []).find(f => f.is_active !== false) || adlFiles?.[0] || null;
    const adlHtml = buildAdlIntakeSectionsHtml(adlFile, patient);
    cards.push(cardGroup('Out-Patient Intake Record', adlHtml));

    // Prescription card
    const prescHtml = buildPrescriptionSectionsHtml(prescriptionRecords);
    cards.push(cardGroup('Prescription', prescHtml));
  }

  return wrapReportDocument({
    patient,
    reportTitle: 'Combined Patient Report',
    bodyHtml: `${patientSummary}\n${cards.join('\n')}`,
  });
}

module.exports = {
  buildPatientReportHtml,
  buildPatientSectionReportHtml,
  VALID_SECTIONS,
};
