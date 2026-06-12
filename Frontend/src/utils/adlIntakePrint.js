/**
 * adlIntakePrint.js
 * Generates a professional, compact HTML document for the
 * Out-Patient Intake Record (ADL file) print / browser-PDF flow.
 *
 * Works entirely from raw data — no DOM / innerHTML dump — so
 * Tailwind classes in the live UI do not bleed into the print.
 */

import PGI_Logo from '../assets/PGI_Logo.png';
import { resolveHistoryPresentIllness } from './adlHistoryPresentIllness';
import { resolvePastHistoryPsychiatric } from './adlPastHistoryPsychiatric';
import { resolveGeneralHomeSituation } from './adlGeneralHomeSituation';
import { resolveDevelopmentHistory } from './adlDevelopmentHistory';
import { resolveEducationHistory } from './adlEducationHistory';
import { resolveOccupationHistory } from './adlOccupationHistory';
import { resolveSexualMarriageDetails } from './adlSexualMarriageDetails';
import { resolveReligionHistory } from './adlReligionHistory';
import { resolveLivingSituationHistory } from './adlLivingSituationHistory';
import { resolvePremorbidPersonalityHistory } from './adlPremorbidPersonalityHistory';
import {
  resolveDiagnosticFormulationHistory,
} from './adlClosingSections';
import { formatAdlRecordCreated } from './formatters';

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
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function v(raw) {
  const s = raw == null ? '' : String(raw).trim();
  return s || '—';
}

function boolV(raw) {
  if (raw === true  || raw === 'true')  return 'Yes';
  if (raw === false || raw === 'false') return 'No';
  return v(raw);
}

function fmtDate(d) {
  if (!d) return '—';
  try {
    const s   = String(d);
    const iso = s.includes('T') ? s.split('T')[0] : s;
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return String(d); }
}

function parseArr(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return []; }
}

function has(val) {
  if (val === undefined || val === null) return false;
  if (typeof val === 'boolean') return true;
  if (Array.isArray(val)) return val.length > 0;
  return String(val).trim() !== '';
}

/* ── CSS ─────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

@page {
  size: A4 portrait;
  margin: 10mm 10mm 10mm 10mm;
}
*, *::before, *::after {
  box-sizing: border-box;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
body {
  font-family: 'Inter', 'Roboto', 'Segoe UI', Arial, sans-serif;
  font-size: 9pt;
  line-height: 1.35;
  color: #111827;
  margin: 0;
  padding: 0;
  background: #fff;
}

/* ── HEADER ── */
.hdr {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 5px 0;
  border-bottom: 3px solid #1E3A8A;
  margin-bottom: 4px;
}
.hdr img { height: 46px; width: auto; flex-shrink: 0; }
.hdr-text { flex: 1; text-align: center; }
.hdr-text h1 {
  margin: 0;
  font-size: 12pt;
  font-weight: 700;
  color: #1E3A8A;
  letter-spacing: 0.3px;
  line-height: 1.2;
}
.hdr-text .dept {
  margin: 1px 0 0;
  font-size: 9pt;
  color: #374151;
  font-weight: 600;
}
.hdr-text .rpt-title {
  margin: 2px 0 0;
  font-size: 9.5pt;
  font-weight: 700;
  color: #1E3A8A;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

/* ── META BAR ── */
.meta-bar {
  display: flex;
  gap: 0;
  border: 1px solid #D1D5DB;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 5px;
  background: #F8FAFC;
}
.meta-bar .mc {
  flex: 1;
  padding: 4px 8px;
  border-right: 1px solid #D1D5DB;
  font-size: 8pt;
}
.meta-bar .mc:last-child { border-right: none; }
.meta-bar .mc .ml {
  font-weight: 600;
  color: #6B7280;
  font-size: 7pt;
  text-transform: uppercase;
  display: block;
}
.meta-bar .mc .mv {
  font-weight: 700;
  color: #111827;
  font-size: 8.5pt;
}

/* ── SECTION ──
   No forced page-breaks on sections — allow natural flow to
   pack pages as full as possible (85-95% utilization target). */
.sec {
  margin: 8px 0;
}
.sec-hdr {
  background: #1E3A8A;
  color: #fff;
  font-size: 8pt;
  font-weight: 700;
  padding: 3px 7px;
  border-radius: 3px 3px 0 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.sec-body {
  border: 1px solid #D1D5DB;
  border-top: none;
  border-radius: 0 0 3px 3px;
  padding: 5px 7px;
  background: #fff;
}

/* ── KV GRID ── */
.kv-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0;
}
.kv-grid.cols-2 { grid-template-columns: repeat(2, 1fr); }
.kv-grid.cols-3 { grid-template-columns: repeat(3, 1fr); }
.kv-grid.cols-4 { grid-template-columns: repeat(4, 1fr); }
.kv {
  padding: 3px 5px;
  border-bottom: 1px solid #F3F4F6;
  border-right: 1px solid #F3F4F6;
}
.kv.span2 { grid-column: span 2; }
.kv.span3 { grid-column: span 3; }
.kv.span4 { grid-column: span 4; border-right: none; }
.kv .kl {
  font-size: 7pt;
  font-weight: 600;
  color: #6B7280;
  text-transform: uppercase;
  letter-spacing: 0.2px;
  display: block;
  margin-bottom: 1px;
}
.kv .kv-val {
  font-size: 8.5pt;
  color: #111827;
  font-weight: 500;
}

/* ── TABLES ── */
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 8.5pt;
  margin: 0;
}
table th {
  background: #EFF6FF;
  color: #1E3A8A;
  font-weight: 700;
  padding: 3px 5px;
  border: 1px solid #BFDBFE;
  text-align: left;
  font-size: 7.5pt;
  text-transform: uppercase;
}
table td {
  padding: 3px 5px;
  border: 1px solid #E5E7EB;
  vertical-align: top;
}
table tbody tr:nth-child(even) td { background: #F8FAFC; }

/* ── PHYSICAL EXAM 4-COL TABLE ── */
.phys-lbl {
  font-weight: 600;
  background: #F8FAFC !important;
  color: #374151;
  font-size: 8pt;
  width: 22%;
  white-space: nowrap;
}

/* ── NARRATIVE (full width text blocks) ── */
.narrative {
  font-size: 9pt;
  line-height: 1.4;
  color: #111827;
  text-align: justify;
  white-space: pre-wrap;
  padding: 2px 0;
}

/* ── HIGHLIGHTED BOXES ── */
.diag-box {
  background: #EFF6FF;
  border: 1px solid #BFDBFE;
  border-left: 4px solid #1E3A8A;
  border-radius: 3px;
  padding: 5px 7px;
}
.assessment-box {
  background: #F0FDF4;
  border: 1px solid #BBF7D0;
  border-left: 4px solid #16A34A;
  border-radius: 3px;
  padding: 0;
  overflow: hidden;
}
.assessment-box table th {
  background: #DCFCE7;
  color: #15803D;
  border-color: #A7F3D0;
}
.assessment-box table td {
  border-color: #BBF7D0;
}

/* ── SIDE-BY-SIDE ── */
.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

/* ── SUB LABEL ── */
.sub-lbl {
  font-size: 7.5pt;
  font-weight: 700;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  margin: 4px 0 2px;
}

/* ── ASSESS / MSE label column ── */
.assess-lbl {
  font-weight: 600;
  background: #F8FAFC !important;
  width: 30%;
  color: #1E3A8A;
  font-size: 8pt;
  white-space: nowrap;
}
.mse-lbl {
  font-weight: 600;
  background: #FAFAFA !important;
  width: 32%;
  color: #374151;
  font-size: 8pt;
  white-space: nowrap;
}

/* ── FOOTER ── */
.ftr {
  margin-top: 6px;
  padding-top: 4px;
  border-top: 1px solid #D1D5DB;
  text-align: center;
  font-size: 7pt;
  color: #6B7280;
}
.ftr p { margin: 1px 0; }

/* ── PRINT MEDIA ──
   Only avoid page-breaks inside compact boxes/tables,
   NOT whole sections — lets pages fill naturally. */
@media print {
  table              { page-break-inside: avoid; }
  .diag-box          { page-break-inside: avoid; }
  .assessment-box    { page-break-inside: avoid; }
  .narrative         { page-break-inside: auto;  }
  .two-col           { page-break-inside: auto;  }
}
`;

/* ── SECTION BUILDER ─────────────────────────────────────── */

function section(title, bodyHtml) {
  if (!bodyHtml || !bodyHtml.trim()) return '';
  return `<div class="sec"><div class="sec-hdr">${esc(title)}</div><div class="sec-body">${bodyHtml}</div></div>`;
}

function kv(label, value, span = 1) {
  const spanClass = span === 2 ? ' span2' : span === 3 ? ' span3' : span === 4 ? ' span4' : '';
  return `<div class="kv${spanClass}"><span class="kl">${esc(label)}</span><span class="kv-val">${esc(v(value))}</span></div>`;
}

function kvGrid(items, cols = 4) {
  const inner = items.filter(Boolean).join('');
  if (!inner.trim()) return '';
  const c = cols === 2 ? ' cols-2' : cols === 3 ? ' cols-3' : cols === 4 ? ' cols-4' : '';
  return `<div class="kv-grid${c}">${inner}</div>`;
}

/* ── MAIN GENERATOR ──────────────────────────────────────── */

function _buildAdlIntakeParts(adlFile, patient) {
  if (!adlFile) return { bodyContent: '', ptName: '' };

  /* — parsed arrays — */
  const informants = parseArr(adlFile.informants);
  const complPt    = parseArr(adlFile.complaints_patient);
  const complInf   = parseArr(adlFile.complaints_informant);
  const siblings   = parseArr(adlFile.family_history_siblings);

  /* — patient demographics — */
  const ptName  = patient?.name || '';
  const ptAge   = patient?.age  != null ? String(patient.age) : '';
  const ptSex   = patient?.sex  || '';
  const ptPsyNo = patient?.psy_no || '';
  const ptCrNo  = patient?.cr_no  || '';
  const ptMarital = patient?.marital_status || '';
  const ptEdu   = patient?.education || patient?.education_level || '';
  const ptOcc   = patient?.occupation || '';
  const ptCity  = (() => {
    const city = patient?.city || patient?.present_city_town_village || '';
    const dist = patient?.district || patient?.present_district || '';
    if (city && dist) return `${city}, ${dist}`;
    return city || dist || '';
  })();
  const ptDate = (() => {
    const d = patient?.date;
    if (!d) return '';
    const s = String(d);
    return fmtDate(s.includes('T') ? s.split('T')[0] : s);
  })();

  const intakeCreated = formatAdlRecordCreated(adlFile);
  const logoUrl = getLogoUrl();

  /* ── HEADER ── */
  const header = `<div class="hdr">
  ${logoUrl ? `<img src="${logoUrl}" alt="PGIMER Logo" />` : ''}
  <div class="hdr-text">
    <h1>POSTGRADUATE INSTITUTE OF MEDICAL EDUCATION &amp; RESEARCH</h1>
    <div class="dept">Department of Psychiatry, Chandigarh</div>
    <div class="rpt-title">Out-Patient Intake Record</div>
  </div>
</div>`;

  /* ── META BAR ── */
  const metaBar = `<div class="meta-bar">
  <div class="mc"><span class="ml">Record No.</span><span class="mv">${esc(v(adlFile.adl_no))}</span></div>
  <div class="mc"><span class="ml">Record Created</span><span class="mv">${esc(v(intakeCreated))}</span></div>
  <div class="mc"><span class="ml">Visit / Reg. Date</span><span class="mv">${esc(ptDate || '—')}</span></div>
  ${ptCrNo  ? `<div class="mc"><span class="ml">CR No.</span><span class="mv">${esc(ptCrNo)}</span></div>`  : ''}
  ${ptPsyNo ? `<div class="mc"><span class="ml">Psy. No.</span><span class="mv">${esc(ptPsyNo)}</span></div>` : ''}
</div>`;

  /* ── PATIENT INFORMATION ── */
  const patientSec = section('Patient Information',
    kvGrid([
      kv('Patient Name', ptName, 2),
      kv('Age', ptAge),
      kv('Sex', ptSex),
      kv('Marital Status', ptMarital),
      kv('Education', ptEdu),
      kv('Occupation', ptOcc),
      ptCity ? kv('City / District', ptCity, 2) : '',
    ], 4)
  );

  /* ── INFORMANTS ── */
  const infRows = informants
    .filter(i => has(i?.name) || has(i?.relationship) || has(i?.age))
    .map((inf, idx) =>
      `<tr><td>${idx + 1}</td><td>${esc(v(inf.name))}</td><td>${esc(v(inf.relationship))}</td><td>${esc(v(inf.age))}</td><td>${esc(v(inf.sex))}</td><td>${esc(v(inf.education))}</td><td>${esc(v(inf.marital_status))}</td><td>${esc(v(inf.occupation))}</td><td>${esc(v(inf.reliability))}</td></tr>`
    ).join('');

  const informantSec = infRows ? section('Informants',
    `<table><thead><tr><th>#</th><th>Name</th><th>Relationship</th><th>Age</th><th>Sex</th><th>Education</th><th>Marital</th><th>Occupation</th><th>Reliability</th></tr></thead><tbody>${infRows}</tbody></table>`
  ) : '';

  /* ── COMPLAINTS & COURSE ── */
  const makeComplaintRows = (list, source) =>
    list
      .filter(c => has(c?.complaint) || has(c?.duration))
      .map(c => `<tr><td>${esc(v(c.complaint))}</td><td>${esc(source)}</td><td>${esc(v(c.duration))}</td></tr>`)
      .join('');

  const cptRows = makeComplaintRows(complPt, 'Patient') + makeComplaintRows(complInf, 'Informant');
  let complBody = '';
  if (cptRows) {
    complBody += `<table><thead><tr><th>Complaint</th><th>Reported By</th><th>Duration</th></tr></thead><tbody>${cptRows}</tbody></table>`;
  }
  if (has(adlFile.onset_duration) || has(adlFile.precipitating_factor) || has(adlFile.course)) {
    complBody += kvGrid([
      has(adlFile.onset_duration)       ? kv('Onset / Duration',     adlFile.onset_duration, 2)       : '',
      has(adlFile.course)               ? kv('Course',               adlFile.course, 2)               : '',
      has(adlFile.precipitating_factor) ? kv('Precipitating Factor', adlFile.precipitating_factor, 4) : '',
    ], 4);
  }
  const complaintSec = complBody ? section('Complaints & Course', complBody) : '';

  /* ── HISTORY OF PRESENT ILLNESS ── */
  const hpiText = resolveHistoryPresentIllness(adlFile);
  const drugTx  = adlFile.history_treatment_drugs;
  const drugRsp = adlFile.history_treatment_response;

  let hpiBody = '';
  if (has(hpiText)) {
    hpiBody += `<div class="narrative">${esc(hpiText)}</div>`;
  }
  if (has(drugTx) || has(drugRsp)) {
    hpiBody += `<div style="margin-top:4px"><table><thead><tr><th>Treatment (Drugs)</th><th>Response</th></tr></thead><tbody><tr><td>${esc(v(drugTx))}</td><td>${esc(v(drugRsp))}</td></tr></tbody></table></div>`;
  }
  const hpiSec = hpiBody ? section('History of Present Illness', hpiBody) : '';

  /* ── PAST HISTORY ── */
  const pastMedical    = adlFile.past_history_medical;
  const pastPsychiatric = resolvePastHistoryPsychiatric(adlFile);
  let pastBody = '';
  if (has(pastMedical) || has(pastPsychiatric)) {
    pastBody = `<div class="two-col">`;
    if (has(pastMedical))    pastBody += `<div><div class="sub-lbl">A. Medical (Injuries &amp; Operations)</div><div class="narrative">${esc(pastMedical)}</div></div>`;
    if (has(pastPsychiatric)) pastBody += `<div><div class="sub-lbl">B. Psychiatric</div><div class="narrative">${esc(pastPsychiatric)}</div></div>`;
    pastBody += `</div>`;
  }
  const pastSec = pastBody ? section('Past History', pastBody) : '';

  /* ── FAMILY HISTORY ── */
  const familyRows = [];
  const addFamilyMember = (label, ageF, eduF, occF, decF, persF) => {
    if (!has(ageF) && !has(eduF) && !has(occF) && !has(persF)) return;
    familyRows.push(
      `<tr><td><strong>${esc(label)}</strong></td><td>${esc(v(ageF))}</td><td>${esc(v(eduF))}</td><td>${esc(v(occF))}</td><td>${boolV(decF)}</td><td>${esc(v(persF))}</td></tr>`
    );
  };
  addFamilyMember('Father',
    adlFile.family_history_father_age, adlFile.family_history_father_education,
    adlFile.family_history_father_occupation, adlFile.family_history_father_deceased,
    adlFile.family_history_father_personality
  );
  addFamilyMember('Mother',
    adlFile.family_history_mother_age, adlFile.family_history_mother_education,
    adlFile.family_history_mother_occupation, adlFile.family_history_mother_deceased,
    adlFile.family_history_mother_personality
  );
  siblings.forEach((s, i) => {
    if (!Object.values(s || {}).some(x => has(x))) return;
    addFamilyMember(`Sibling ${i + 1}`, s.age, s.education, s.occupation, undefined,
      s.marital_status ? `Marital: ${s.marital_status}` : '');
  });
  const familySec = familyRows.length ? section('Family History',
    `<table><thead><tr><th>Relation</th><th>Age</th><th>Education</th><th>Occupation</th><th>Deceased</th><th>Notes</th></tr></thead><tbody>${familyRows.join('')}</tbody></table>`
  ) : '';

  /* ── HOME SITUATION & EARLY DEVELOPMENT ── */
  const homeSit = resolveGeneralHomeSituation(adlFile);
  const devHist = resolveDevelopmentHistory(adlFile);
  const homeItems = [
    has(adlFile.personal_birth_place)            ? kv('Birth Place',            adlFile.personal_birth_place)            : '',
    has(adlFile.personal_delivery_type)           ? kv('Delivery Type',          adlFile.personal_delivery_type)           : '',
    has(adlFile.personal_complications_prenatal)  ? kv('Prenatal Complications', adlFile.personal_complications_prenatal, 2) : '',
    has(adlFile.personal_complications_natal)     ? kv('Natal Complications',    adlFile.personal_complications_natal, 2)   : '',
    has(adlFile.personal_complications_postnatal) ? kv('Postnatal Complications',adlFile.personal_complications_postnatal,2) : '',
    has(devHist)                                  ? kv('Developmental Milestones',devHist, 4)                               : '',
    has(homeSit)                                  ? kv('Home Situation',         homeSit, 4)                                : '',
  ];
  const homeSec = homeItems.some(Boolean)
    ? section('Home Situation & Early Development', kvGrid(homeItems.filter(Boolean), 4))
    : '';

  /* ── PERSONAL & SOCIAL HISTORY ── */
  const eduTxt = resolveEducationHistory(adlFile);
  const occTxt = resolveOccupationHistory(adlFile);
  const relTxt = resolveReligionHistory(adlFile);
  const livTxt = resolveLivingSituationHistory(adlFile);
  const preTxt = resolvePremorbidPersonalityHistory(adlFile);
  const sexTxt = resolveSexualMarriageDetails(adlFile);

  const pshRows = [
    ['Education',              eduTxt],
    ['Occupation',             occTxt],
    ['Religion',               relTxt],
    ['Living Situation',       livTxt],
    ['Premorbid Personality',  preTxt],
    ['Sexual & Marital History', sexTxt],
    has(adlFile.sexual_menarche_age) ? ['Menarche Age', adlFile.sexual_menarche_age] : null,
  ]
    .filter(r => r && has(r[1]))
    .map(([label, text]) =>
      `<tr><td style="font-weight:600;width:22%;white-space:nowrap;background:#F8FAFC">${esc(label)}</td><td class="narrative">${esc(text)}</td></tr>`
    ).join('');

  const pshSec = pshRows ? section('Personal & Social History',
    `<table><tbody>${pshRows}</tbody></table>`
  ) : '';

  /* ── PHYSICAL EXAMINATION — 4-column paired layout ── */
  const boolPhys = [
    ['Pallor',          adlFile.physical_pallor,         true],
    ['Icterus',         adlFile.physical_icterus,        true],
    ['Oedema',          adlFile.physical_oedema,         true],
    ['Lymphadenopathy', adlFile.physical_lymphadenopathy, true],
  ].filter(([, val]) => val !== undefined && val !== null && val !== '');

  const textPhys = [
    ['General Appearance', adlFile.physical_general_appearance],
    ['Build',              adlFile.physical_build],
    ['Nutrition',          adlFile.physical_nutrition],
    ['Other Findings',     adlFile.physical_other],
  ].filter(([, val]) => has(val));

  let physRowsHtml = '';
  // Paired boolean rows — 4 columns: label | value | label | value
  for (let i = 0; i < boolPhys.length; i += 2) {
    const [lbl1, val1] = boolPhys[i];
    const pair         = boolPhys[i + 1];
    physRowsHtml += `<tr>
      <td class="phys-lbl">${esc(lbl1)}</td><td>${esc(boolV(val1))}</td>
      ${pair
        ? `<td class="phys-lbl">${esc(pair[0])}</td><td>${esc(boolV(pair[1]))}</td>`
        : '<td></td><td></td>'}
    </tr>`;
  }
  // Full-width text rows
  textPhys.forEach(([lbl, val]) => {
    physRowsHtml += `<tr><td class="phys-lbl">${esc(lbl)}</td><td colspan="3">${esc(v(val))}</td></tr>`;
  });

  const physSec = physRowsHtml ? section('Physical Examination',
    `<table><tbody>${physRowsHtml}</tbody></table>`
  ) : '';

  /* ── MENTAL STATUS EXAMINATION ── */
  const mseItems = [
    ['General Appearance & Behaviour', adlFile.mse_appearance],
    ['Speech',              adlFile.mse_speech],
    ['Mood & Affect',       adlFile.mse_mood_affect],
    ['Thought Process',     adlFile.mse_thought_process],
    ['Thought Content',     adlFile.mse_thought_content],
    ['Perception',          adlFile.mse_perception],
    ['Cognition',           adlFile.mse_cognition],
    ['Insight',             adlFile.mse_insight],
    ['Judgment',            adlFile.mse_judgment],
  ].filter(([, val]) => has(val));

  const mseRows = mseItems
    .map(([lbl, val]) =>
      `<tr><td class="mse-lbl">${esc(lbl)}</td><td>${esc(v(val))}</td></tr>`
    ).join('');

  const mseSec = mseRows ? section('Mental Status Examination (MSE)',
    `<table><tbody>${mseRows}</tbody></table>`
  ) : '';

  /* ── DIAGNOSTIC FORMULATION ── */
  const diagText = resolveDiagnosticFormulationHistory(adlFile);
  const diagSec = has(diagText) ? section('Diagnostic Formulation',
    `<div class="diag-box"><div class="narrative">${esc(diagText)}</div></div>`
  ) : '';

  /* ── FINAL ASSESSMENT — compact key-value table ── */
  //  Prefer individual fields; fall back to merged legacy text.
  const assessRows = [
    ['Provisional Diagnosis', adlFile.provisional_diagnosis],
    ['Treatment Plan',        adlFile.treatment_plan],
    ['Consultant Comments',   adlFile.consultant_comments],
  ].filter(([, val]) => has(val));

  const legacyAssessText = adlFile.final_assessment_history;
  let finalSec = '';
  if (assessRows.length > 0) {
    const tRows = assessRows
      .map(([lbl, val]) =>
        `<tr><td class="assess-lbl">${esc(lbl)}</td><td class="narrative">${esc(v(val))}</td></tr>`
      ).join('');
    finalSec = section('Final Assessment',
      `<div class="assessment-box"><table><tbody>${tRows}</tbody></table></div>`
    );
  } else if (has(legacyAssessText)) {
    // Parse legacy merged text "Label\nValue\n\nLabel\nValue" into table rows
    const chunks = String(legacyAssessText).split(/\n\n+/);
    const legacyRows = chunks
      .map(chunk => {
        const lines = chunk.trim().split('\n');
        if (lines.length >= 2) {
          const lbl = lines[0].trim();
          const val = lines.slice(1).join('\n').trim();
          return `<tr><td class="assess-lbl">${esc(lbl)}</td><td class="narrative">${esc(val)}</td></tr>`;
        }
        return chunk.trim() ? `<tr><td colspan="2" class="narrative">${esc(chunk.trim())}</td></tr>` : '';
      })
      .filter(Boolean)
      .join('');
    finalSec = legacyRows
      ? section('Final Assessment',
          `<div class="assessment-box"><table><tbody>${legacyRows}</tbody></table></div>`
        )
      : '';
  }

  /* ── FOOTER ── */
  const footer = `<div class="ftr">
  <p><strong>Generated:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
  <p>PGIMER — Department of Psychiatry | Electronic Medical Record System</p>
  <p>Computer-generated document — no signature required.</p>
</div>`;

  /* ── ASSEMBLE ── */
  const sectionsHtml = [
    patientSec, informantSec, complaintSec,
    hpiSec,
    pastSec, familySec, homeSec,
    pshSec,
    physSec, mseSec, diagSec, finalSec,
  ].join('\n');

  const bodyContent = [header, metaBar, sectionsHtml, footer].join('\n');

  return { bodyContent, ptName, sectionsHtml };
}

/**
 * Returns just the body content (no HTML/head/body wrapper).
 * Use this when embedding the ADL section inside a combined print document.
 */
export function adlIntakeSectionHtml(adlFile, patient) {
  if (!adlFile) return '';
  const { bodyContent } = _buildAdlIntakeParts(adlFile, patient);
  return bodyContent;
}

/**
 * Returns ONLY the clinical section divs — no header, no meta-bar, no footer.
 * Use this when embedding inside a unified combined report that has its own header/footer.
 */
export function adlIntakeContentOnlyHtml(adlFile, patient) {
  if (!adlFile) return '';
  const { sectionsHtml } = _buildAdlIntakeParts(adlFile, patient);
  return sectionsHtml;
}

/**
 * Returns a complete, standalone HTML document ready for window.open() printing.
 */
export function generateAdlIntakePrintHtml(adlFile, patient) {
  if (!adlFile) return '';
  const { bodyContent, ptName } = _buildAdlIntakeParts(adlFile, patient);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Out-Patient Intake Record — ${esc(ptName || 'Patient')}</title>
  <style>${CSS}</style>
</head>
<body>${bodyContent}</body>
</html>`;
}
