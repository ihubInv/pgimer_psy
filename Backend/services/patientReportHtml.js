const { formatDate, formatDateTime, formatValue, escHtml } = require('./patientReportFormatters');

const PRINT_CSS = `
@page { size: A4 portrait; margin: 12mm; }
body { font-family: 'Times New Roman', serif; font-size: 10pt; line-height: 1.4; color: #111; margin: 0; padding: 0; }
.hdr { text-align: center; border-bottom: 2px solid #1E3A8A; padding-bottom: 8px; margin-bottom: 12px; }
.hdr h1 { margin: 0; font-size: 13pt; color: #1E3A8A; }
.hdr h2 { margin: 4px 0 0; font-size: 11pt; font-weight: normal; }
.hdr .title { margin-top: 6px; font-size: 11pt; font-weight: bold; text-transform: uppercase; }
.sec { margin: 14px 0; page-break-inside: avoid; }
.sec h3 { background: #1E3A8A; color: #fff; margin: 0; padding: 4px 8px; font-size: 10pt; }
.sec .body { border: 1px solid #ccc; border-top: none; padding: 8px; }
table { width: 100%; border-collapse: collapse; font-size: 9pt; }
th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; vertical-align: top; }
th { background: #EFF6FF; }
.kv { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px 12px; }
.kv div { margin-bottom: 4px; }
.kv .lbl { font-weight: bold; color: #444; font-size: 8pt; text-transform: uppercase; }
.ftr { margin-top: 16px; text-align: center; font-size: 8pt; color: #666; border-top: 1px solid #ccc; padding-top: 6px; }
`;

function kvGrid(pairs) {
  const items = pairs
    .filter(([, v]) => v != null && v !== '' && v !== 'N/A')
    .map(([label, value]) => `<div><div class="lbl">${escHtml(label)}</div><div>${escHtml(formatValue(value))}</div></div>`)
    .join('');
  return items ? `<div class="kv">${items}</div>` : '<p><em>No data recorded.</em></p>';
}

function section(title, bodyHtml) {
  if (!bodyHtml || !String(bodyHtml).trim()) return '';
  return `<div class="sec"><h3>${escHtml(title)}</h3><div class="body">${bodyHtml}</div></div>`;
}

function buildPatientDetailsSection(patient) {
  return kvGrid([
    ['Name', patient.name],
    ['CR No', patient.cr_no],
    ['PSY No', patient.psy_no],
    ['Age', patient.age],
    ['Sex', patient.sex],
    ['Contact', patient.contact_number],
    ['Age Group', patient.age_group],
    ['Marital Status', patient.marital_status],
    ['Occupation', patient.occupation],
    ['Education', patient.education],
    ['Religion', patient.religion],
    ['Assigned Room', patient.assigned_room],
    ['Assigned Doctor', patient.assigned_doctor_name],
    ['Seen in Walk-in', patient.seen_in_walk_in_on ? formatDate(patient.seen_in_walk_in_on) : null],
    ['Address', patient.present_address_line_1 || patient.address_line],
    ['City', patient.present_city_town_village || patient.city],
    ['State', patient.present_state || patient.state],
    ['Pin Code', patient.present_pin_code || patient.pin_code],
  ]);
}

function buildClinicalSection(proformas) {
  if (!proformas.length) return '';
  const rows = proformas
    .map((p, i) => {
      return `<tr>
        <td>${i + 1}</td>
        <td>${escHtml(formatDate(p.visit_date))}</td>
        <td>${escHtml(p.visit_type === 'first_visit' ? 'First Visit' : 'Follow-up')}</td>
        <td>${escHtml(formatValue(p.room_no))}</td>
        <td>${escHtml(formatValue(p.doctor_name))}</td>
        <td>${escHtml(formatValue(p.diagnosis))}</td>
        <td>${escHtml(formatValue(p.treatment_prescribed))}</td>
      </tr>`;
    })
    .join('');
  return `<table>
    <thead><tr><th>#</th><th>Date</th><th>Type</th><th>Room</th><th>Doctor</th><th>Diagnosis</th><th>Treatment</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function buildFollowUpSection(followUps) {
  if (!followUps.length) return '';
  return followUps
    .map((fu, i) => {
      return `<div style="margin-bottom:10px;padding:8px;border:1px solid #ddd;border-radius:4px;">
        <strong>Follow-up ${i + 1}</strong> — ${escHtml(formatDate(fu.visit_date))}
        ${fu.room_no ? ` | Room: ${escHtml(fu.room_no)}` : ''}
        ${fu.doctor_name ? ` | Dr: ${escHtml(fu.doctor_name)}` : ''}
        <div style="margin-top:6px;white-space:pre-wrap;">${escHtml(formatValue(fu.clinical_assessment))}</div>
      </div>`;
    })
    .join('');
}

function buildAdlSection(adlFiles) {
  if (!adlFiles.length) return '';
  const rows = adlFiles
    .map(
      (f, i) => `<tr>
        <td>${i + 1}</td>
        <td>${escHtml(formatValue(f.adl_no))}</td>
        <td>${escHtml(formatValue(f.file_status))}</td>
        <td>${escHtml(f.proforma_visit_date ? formatDate(f.proforma_visit_date) : 'N/A')}</td>
        <td>${escHtml(formatValue(f.physical_file_location))}</td>
      </tr>`
    )
    .join('');
  return `<table>
    <thead><tr><th>#</th><th>ADL No</th><th>Status</th><th>Visit Date</th><th>Location</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function buildPrescriptionSection(flatPrescriptions) {
  if (!flatPrescriptions.length) return '';
  const rows = flatPrescriptions
    .map(
      (p, i) => `<tr>
        <td>${i + 1}</td>
        <td>${escHtml(formatValue(p.medicine))}</td>
        <td>${escHtml(formatValue(p.dosage))}</td>
        <td>${escHtml(formatValue(p.when_to_take))}</td>
        <td>${escHtml(formatValue(p.frequency))}</td>
        <td>${escHtml(formatValue(p.duration))}</td>
        <td>${escHtml(formatValue(p.notes))}</td>
      </tr>`
    )
    .join('');
  return `<table>
    <thead><tr><th>#</th><th>Medicine</th><th>Dosage</th><th>When</th><th>Frequency</th><th>Duration</th><th>Notes</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function buildPatientReportHtml(report) {
  const { patient, includeHistory, clinicalProformas, followUpVisits, adlFiles, flatPrescriptions } =
    report;

  const sections = [
    section('Patient Details', buildPatientDetailsSection(patient)),
  ];

  if (includeHistory) {
    sections.push(section('Clinical Proformas', buildClinicalSection(clinicalProformas)));
    sections.push(section('Follow-Up Visits', buildFollowUpSection(followUpVisits)));
    sections.push(section('Intake Records (ADL)', buildAdlSection(adlFiles)));
    sections.push(section('Prescriptions', buildPrescriptionSection(flatPrescriptions)));
  }

  const body = sections.filter(Boolean).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Patient Report — ${escHtml(patient.name || patient.cr_no || 'Patient')}</title>
  <style>${PRINT_CSS}</style>
</head>
<body>
  <div class="hdr">
    <h1>POSTGRADUATE INSTITUTE OF MEDICAL EDUCATION &amp; RESEARCH</h1>
    <h2>Department of Psychiatry</h2>
    <div class="title">Patient Report</div>
    <div style="margin-top:6px;font-size:9pt;">
      ${escHtml(patient.name || '')} &nbsp;|&nbsp; CR: ${escHtml(formatValue(patient.cr_no))}
      &nbsp;|&nbsp; Generated: ${escHtml(formatDateTime(new Date()))}
    </div>
  </div>
  ${body}
  <div class="ftr">Electronically generated record — PGIMER Psychiatry EMR</div>
  <script>window.onload=function(){setTimeout(function(){window.focus();window.print();},300);};</script>
</body>
</html>`;
}

module.exports = { buildPatientReportHtml };
