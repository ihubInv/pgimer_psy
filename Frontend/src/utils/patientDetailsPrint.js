/**
 * patientDetailsPrint.js
 * Generates a professional, compact HTML document for the
 * Patient Details (Out Patient Card + Out-Patient Record) print / browser-PDF flow.
 *
 * Matches the design language of adlIntakePrint.js.
 */

import PGI_Logo from '../assets/PGI_Logo.png';

/* ── helpers ─────────────────────────────────────────────── */

function getLogoUrl() {
  const p = typeof PGI_Logo === 'string' ? PGI_Logo : '';
  if (!p) return '';
  if (p.startsWith('http') || p.startsWith('data:')) return p;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}${p.startsWith('/') ? p : `/${p}`}`;
}

function esc(v) {
  if (v == null || v === '') return '';
  return String(v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function v(raw) {
  const s = raw == null ? '' : String(raw).trim();
  return s || '—';
}

function fmtDate(d) {
  if (!d) return '—';
  try {
    const s = String(d);
    const iso = s.includes('T') ? s.split('T')[0] : s;
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return String(d); }
}

function has(val) {
  if (val === undefined || val === null) return false;
  if (typeof val === 'boolean') return true;
  return String(val).trim() !== '';
}

/* ── CSS ─────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
@page { size: A4 portrait; margin: 10mm 10mm 10mm 10mm; }
*, *::before, *::after { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { font-family: 'Inter','Roboto','Segoe UI',Arial,sans-serif; font-size: 9pt; line-height: 1.35; color: #111827; margin: 0; padding: 0; background: #fff; }
.hdr { display: flex; align-items: center; gap: 10px; padding: 5px 0; border-bottom: 3px solid #1E3A8A; margin-bottom: 4px; }
.hdr img { height: 46px; width: auto; flex-shrink: 0; }
.hdr-text { flex: 1; text-align: center; }
.hdr-text h1 { margin: 0; font-size: 12pt; font-weight: 700; color: #1E3A8A; line-height: 1.2; }
.hdr-text .dept { margin: 1px 0 0; font-size: 9pt; color: #374151; font-weight: 600; }
.hdr-text .rpt-title { margin: 2px 0 0; font-size: 9.5pt; font-weight: 700; color: #1E3A8A; text-transform: uppercase; letter-spacing: 0.4px; }
.meta-bar { display: flex; gap: 0; border: 1px solid #D1D5DB; border-radius: 4px; overflow: hidden; margin-bottom: 5px; background: #F8FAFC; }
.meta-bar .mc { flex: 1; padding: 4px 8px; border-right: 1px solid #D1D5DB; font-size: 8pt; }
.meta-bar .mc:last-child { border-right: none; }
.meta-bar .mc .ml { font-weight: 600; color: #6B7280; font-size: 7pt; text-transform: uppercase; display: block; }
.meta-bar .mc .mv { font-weight: 700; color: #111827; font-size: 8.5pt; }
.sec { margin: 8px 0; }
.sec-hdr { background: #1E3A8A; color: #fff; font-size: 8pt; font-weight: 700; padding: 3px 7px; border-radius: 3px 3px 0 0; text-transform: uppercase; letter-spacing: 0.5px; }
.sec-body { border: 1px solid #D1D5DB; border-top: none; border-radius: 0 0 3px 3px; padding: 5px 7px; background: #fff; }
.sub-lbl { font-size: 7.5pt; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.3px; margin: 4px 0 2px; }
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
table { width: 100%; border-collapse: collapse; font-size: 8.5pt; margin: 0; }
table th { background: #EFF6FF; color: #1E3A8A; font-weight: 700; padding: 3px 5px; border: 1px solid #BFDBFE; text-align: left; font-size: 7.5pt; text-transform: uppercase; }
table td { padding: 3px 5px; border: 1px solid #E5E7EB; vertical-align: top; }
table tbody tr:nth-child(even) td { background: #F8FAFC; }
.ftr { margin-top: 6px; padding-top: 4px; border-top: 1px solid #D1D5DB; text-align: center; font-size: 7pt; color: #6B7280; }
.ftr p { margin: 1px 0; }
@media print {
  table { page-break-inside: avoid; }
}
`;

/* ── builders ─────────────────────────────────────────────── */

function section(title, bodyHtml) {
  if (!bodyHtml || !bodyHtml.trim()) return '';
  return `<div class="sec"><div class="sec-hdr">${esc(title)}</div><div class="sec-body">${bodyHtml}</div></div>`;
}

function kv(label, value, span = 1) {
  if (!has(value)) return '';
  const spanClass = span === 2 ? ' span2' : span === 3 ? ' span3' : span === 4 ? ' span4' : '';
  return `<div class="kv${spanClass}"><span class="kl">${esc(label)}</span><span class="kv-val">${esc(v(value))}</span></div>`;
}

function kvGrid(items, cols = 4) {
  const inner = items.filter(Boolean).join('');
  if (!inner.trim()) return '';
  const c = cols === 2 ? ' cols-2' : cols === 3 ? ' cols-3' : cols === 4 ? ' cols-4' : '';
  return `<div class="kv-grid${c}">${inner}</div>`;
}

function subLabel(text) {
  return `<div class="sub-lbl">${esc(text)}</div>`;
}

function addrBlock(label, line, city, district, state, country, pin) {
  const parts = [line, city, district, state, country, pin].filter(has);
  if (!parts.length) return '';
  return `
    ${subLabel(label)}
    ${kvGrid([
      kv('Address', line, 4),
      kv('City/Town', city),
      kv('District', district),
      kv('State', state),
      kv('Country', country),
      kv('Pin Code', pin),
    ], 4)}`;
}

/* ── main builder ────────────────────────────────────────── */

function _buildPatientDetailsParts(patient, formData, userRole) {
  const isMWO = userRole === 'Psychiatric Welfare Officer';
  const d  = patient;
  const fd = formData || {};
  const logoUrl = getLogoUrl();

  /* ── header ── */
  const header = `<div class="hdr">
  ${logoUrl ? `<img src="${logoUrl}" alt="PGIMER Logo" />` : ''}
  <div class="hdr-text">
    <h1>POSTGRADUATE INSTITUTE OF MEDICAL EDUCATION &amp; RESEARCH</h1>
    <div class="dept">Department of Psychiatry, Chandigarh</div>
    <div class="rpt-title">Patient Medical Record</div>
  </div>
</div>`;

  /* ── meta bar ── */
  const metaBar = `<div class="meta-bar">
  ${has(d.cr_no)  ? `<div class="mc"><span class="ml">CR No.</span><span class="mv">${esc(d.cr_no)}</span></div>`  : ''}
  ${has(d.psy_no) ? `<div class="mc"><span class="ml">Psy. No.</span><span class="mv">${esc(d.psy_no)}</span></div>` : ''}
  <div class="mc"><span class="ml">Name</span><span class="mv">${esc(v(d.name))}</span></div>
  <div class="mc"><span class="ml">Age / Sex</span><span class="mv">${esc(v(d.age))} / ${esc(v(d.sex))}</span></div>
  ${has(d.date) ? `<div class="mc"><span class="ml">Reg. Date</span><span class="mv">${esc(fmtDate(d.date))}</span></div>` : ''}
</div>`;

  /* ── Out Patient Card ── */
  const cardItems = [
    kv('CR No.', d.cr_no),
    kv('Date', d.date ? fmtDate(d.date) : ''),
    kv('Patient Name', d.name, 2),
    kv('Mobile No.', d.contact_number),
    kv('Age', d.age),
    kv('Sex', d.sex),
    !isMWO ? kv('Category', d.category) : '',
    kv("Father's Name", d.father_name, 2),
    kv('Department', d.department, 2),
    !isMWO ? kv('Unit/Consit', d.unit_consit) : '',
    !isMWO ? kv('Room No.', d.room_no) : '',
    !isMWO ? kv('Serial No.', d.serial_no) : '',
    kv('File No.', d.file_no),
    !isMWO ? kv('Unit Days', d.unit_days) : '',
  ];
  const addrMain = addrBlock('Address Details',
    d.address_line, d.city, d.district, d.state, d.country, d.pin_code
  );
  const cardSec = section('Out Patient Card', kvGrid(cardItems.filter(Boolean), 4) + addrMain);

  /* ── Out-Patient Record ── */
  const recordItems = [
    kv('Seen in Walk-in on', d.seen_in_walk_in_on ? fmtDate(d.seen_in_walk_in_on) : ''),
    kv('Worked up on', d.worked_up_on ? fmtDate(d.worked_up_on) : ''),
    kv('CR No.', d.cr_no),
    kv('Psy. No.', d.psy_no),
    kv('Special Clinic No.', d.special_clinic_no),
    kv('Name', d.name),
    kv('Sex', d.sex),
    kv('Age Group', d.age_group),
    kv('Marital Status', d.marital_status),
    kv('Year of Marriage', d.year_of_marriage),
    kv('Children: M', d.no_of_children_male),
    kv('Children: F', d.no_of_children_female),
    kv('Occupation', d.occupation),
    kv('Education', d.education || d.education_level),
    kv('Family Income (₹)', d.family_income),
    kv('Patient Income (₹)', d.income || d.patient_income),
    kv('Religion', d.religion),
    kv('Family Type', d.family_type),
    kv('Locality', d.locality),
    kv('Assigned Doctor', d.assigned_doctor_name),
    kv('Assigned Room', d.assigned_room),
    kv('Family Head Name', d.head_name),
    kv('Family Head Age', d.head_age),
    kv('Relationship with Head', d.head_relationship),
    kv('Head Education', d.head_education),
    kv('Head Occupation', d.head_occupation),
    kv('Head Income (₹)', d.head_income),
    kv('Distance from Hospital', d.distance_from_hospital, 2),
    kv('Patient Mobility', d.mobility),
    kv('Referred by', d.referred_by),
  ];
  const permAddr  = addrBlock('Permanent Address',
    fd.permanent_address_line_1 || fd.permanent_address_line,
    fd.permanent_city_town_village || fd.permanent_city,
    fd.permanent_district, fd.permanent_state, fd.permanent_country, fd.permanent_pin_code
  );
  const presAddr  = addrBlock('Present Address',
    fd.present_address_line_1 || fd.present_address_line,
    fd.present_city_town_village || fd.present_city,
    fd.present_district, fd.present_state, fd.present_country, fd.present_pin_code
  );
  const localAddr = has(fd.local_address)
    ? subLabel('Local Address') + kvGrid([kv('Local Address', fd.local_address, 4)], 4)
    : '';
  const recordSec = section('Out-Patient Record',
    kvGrid(recordItems.filter(Boolean), 4) + permAddr + presAddr + localAddr
  );

  /* ── footer ── */
  const footer = `<div class="ftr">
  <p><strong>Generated:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
  <p>PGIMER — Department of Psychiatry | Electronic Medical Record System</p>
  <p>Computer-generated document — no signature required.</p>
</div>`;

  const sectionsHtml = [cardSec, recordSec].join('\n');
  const bodyContent  = [header, metaBar, sectionsHtml, footer].join('\n');
  return { bodyContent, sectionsHtml, name: d.name };
}

/* ── public exports ─────────────────────────────────────── */

/** Complete standalone HTML document. */
export function generatePatientDetailsPrintHtml(patient, formData, userRole) {
  if (!patient) return '';
  const { bodyContent, name } = _buildPatientDetailsParts(patient, formData, userRole);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Patient Record — ${esc(v(name))}</title>
  <style>${CSS}</style>
</head>
<body>${bodyContent}</body>
</html>`;
}

/** Full body content (header + sections + footer) for legacy combined embedding. */
export function patientDetailsSectionHtml(patient, formData, userRole) {
  if (!patient) return '';
  const { bodyContent } = _buildPatientDetailsParts(patient, formData, userRole);
  return bodyContent;
}

/** ONLY the section divs — no header, no meta-bar, no footer.
 *  Use this inside the unified combined report. */
export function patientDetailsContentOnlyHtml(patient, formData, userRole) {
  if (!patient) return '';
  const { sectionsHtml } = _buildPatientDetailsParts(patient, formData, userRole);
  return sectionsHtml;
}
