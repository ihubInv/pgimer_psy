/**
 * reportHtmlSections.js
 *
 * CommonJS port of the frontend print utilities
 * (adlIntakePrint.js, patientDetailsPrint.js, clinicalProformaPrint.js, prescriptionPrint.js).
 *
 * Each exported function returns ONLY section divs — no document wrapper,
 * no per-card header/footer — ready to embed inside the unified combined report.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const {
  resolveHistoryPresentIllness,
  resolvePastHistoryPsychiatric,
  resolveGeneralHomeSituation,
  resolveDevelopmentHistory,
  resolveEducationHistory,
  resolveOccupationHistory,
  resolveReligionHistory,
  resolveLivingSituationHistory,
  resolvePremorbidPersonalityHistory,
  resolveSexualMarriageDetails,
  resolveDiagnosticFormulationHistory,
} = require('./reportAdlResolvers');

/* ── Logo (read once, cache as base64 data URI) ─────────── */

let _logoDataUri = null;
function getLogoDataUri() {
  if (_logoDataUri !== null) return _logoDataUri;
  try {
    const p    = path.resolve(__dirname, '../../Frontend/src/assets/PGI_Logo.png');
    const data = fs.readFileSync(p);
    _logoDataUri = `data:image/png;base64,${data.toString('base64')}`;
  } catch {
    _logoDataUri = '';
  }
  return _logoDataUri;
}

/* ── Common helpers ─────────────────────────────────────── */

function esc(val) {
  if (val == null || val === '') return '';
  return String(val)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
      day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
    });
  } catch { return String(d); }
}

function fmtDateTime(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata',
    });
  } catch { return String(d); }
}

function has(val) {
  if (val === undefined || val === null) return false;
  if (typeof val === 'boolean') return true;
  if (Array.isArray(val)) return val.length > 0;
  return String(val).trim() !== '';
}

function parseArr(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return []; }
}

function normalizeArr(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const p = JSON.parse(value);
    return Array.isArray(p) ? p : (p ? [p] : []);
  } catch {
    if (typeof value === 'string' && value.startsWith('{')) {
      const inner   = value.slice(1, -1);
      const matches = inner.match(/"([^"]+)"/g);
      if (matches) return matches.map(m => m.slice(1, -1));
    }
    return value ? [value] : [];
  }
}

/* ── Section / KV helpers ───────────────────────────────── */

function section(title, bodyHtml, headerColor = '#1E3A8A') {
  if (!bodyHtml || !String(bodyHtml).trim()) return '';
  return `<div class="sec"><div class="sec-hdr" style="background:${headerColor}">${esc(title)}</div><div class="sec-body">${bodyHtml}</div></div>`;
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

function chipsRow(label, values) {
  const arr = normalizeArr(values);
  if (!arr.length) return '';
  const chips = arr.map(val => `<span class="chip">${esc(val)}</span>`).join('');
  return `<div class="kv span4" style="border-right:none">
    <span class="kl">${esc(label)}</span>
    <div class="chips-row">${chips}</div>
  </div>`;
}

/* ════════════════════════════════════════════════════════════
   SECTION 1 — PATIENT DETAILS
   Port of patientDetailsPrint.js  _buildPatientDetailsParts()
   ════════════════════════════════════════════════════════════ */

/**
 * @param {object} patient  – registered_patient row
 * @param {string} userRole – role string (MWO hides some fields)
 * @returns {string} section divs HTML (no wrapper, no header, no footer)
 */
function buildPatientDetailsSectionsHtml(patient, userRole) {
  if (!patient) return '';
  const isMWO = userRole === 'Psychiatric Welfare Officer';
  const d     = patient;

  /* Out Patient Card */
  const cardItems = [
    kv('CR No.', d.cr_no),
    kv('Date', d.date ? fmtDate(d.date) : ''),
    kv('Patient Name', d.name, 2),
    kv('Mobile No.', d.contact_number),
    kv('Age', d.age),
    kv('Sex', d.sex),
    !isMWO ? kv('Category', d.category)   : '',
    kv("Father's Name", d.father_name, 2),
    kv('Department', d.department, 2),
    !isMWO ? kv('Unit/Consit', d.unit_consit) : '',
    !isMWO ? kv('Room No.', d.room_no)        : '',
    !isMWO ? kv('Serial No.', d.serial_no)    : '',
    kv('File No.', d.file_no),
    !isMWO ? kv('Unit Days', d.unit_days)     : '',
  ];
  const addrMain = addrBlock('Address Details', d.address_line, d.city, d.district, d.state, d.country, d.pin_code);
  const cardSec  = section('Out Patient Card', kvGrid(cardItems.filter(Boolean), 4) + addrMain);

  /* Out-Patient Record */
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

  /* Address blocks from patient object itself (formData is same on backend) */
  const permAddr = addrBlock('Permanent Address',
    d.permanent_address_line_1 || d.permanent_address_line,
    d.permanent_city_town_village || d.permanent_city,
    d.permanent_district, d.permanent_state, d.permanent_country, d.permanent_pin_code
  );
  const presAddr = addrBlock('Present Address',
    d.present_address_line_1 || d.present_address_line,
    d.present_city_town_village || d.present_city,
    d.present_district, d.present_state, d.present_country, d.present_pin_code
  );
  const localAddr = has(d.local_address)
    ? subLabel('Local Address') + kvGrid([kv('Local Address', d.local_address, 4)], 4)
    : '';
  const recordSec = section('Out-Patient Record', kvGrid(recordItems.filter(Boolean), 4) + permAddr + presAddr + localAddr);

  return [cardSec, recordSec].filter(Boolean).join('\n');
}

/* ════════════════════════════════════════════════════════════
   SECTION 2 — WALK-IN CLINICAL PROFORMA
   Port of clinicalProformaPrint.js  _buildClinicalProformaParts()
   ════════════════════════════════════════════════════════════ */

const ONSET_LABELS = {
  '<1_week':    '< 1 week',
  '1w_1m':      '1 week – 1 month',
  '>1_month':   '> 1 month',
  not_known:    'Not known',
};

/**
 * @param {object} proforma       – clinical_proforma row
 * @param {object} patient        – patient row (for demographics)
 * @param {object} clinicalOptions – { mood: ['Dep', ...], ... } (string arrays)
 * @returns {string} section divs HTML
 */
function buildClinicalProformaSectionsHtml(proforma, patient, clinicalOptions = {}) {
  if (!proforma) return '';

  const C = '#065F46'; // emerald header colour
  const secE = (title, body) => section(title, body, C);

  const visitDate  = proforma.visit_date ? fmtDate(proforma.visit_date) : '';
  const onsetLabel = proforma.onset_duration
    ? (ONSET_LABELS[proforma.onset_duration] || proforma.onset_duration) : '';

  const visitSec = secE('Visit', kvGrid([
    kv('Visit Date', visitDate),
    kv('Patient Name', patient?.name || proforma.patient_name),
    kv('Age', patient?.age),
    kv('Sex', patient?.sex),
  ], 4));

  const informantLabel = proforma.informant_present === true ? 'Present'
    : proforma.informant_present === false ? 'Absent' : '';
  const informantSec = (has(informantLabel) || has(proforma.informant_who) || has(proforma.nature_of_information))
    ? secE('Informant', kvGrid([
        kv('Informant Present', informantLabel),
        proforma.informant_present === true ? kv('Who is Present', proforma.informant_who, 2) : '',
        kv('Nature of Information', proforma.nature_of_information, 2),
      ], 4))
    : '';

  const courseSec = (has(onsetLabel) || has(proforma.course) || has(proforma.precipitating_factor)
    || has(proforma.illness_duration) || has(proforma.current_episode_since))
    ? secE('Illness Course', kvGrid([
        kv('Onset Duration', onsetLabel),
        kv('Course', proforma.course),
        kv('Total Duration of Illness', proforma.illness_duration),
        kv('Current Episode Since', proforma.current_episode_since ? fmtDate(proforma.current_episode_since) : ''),
        kv('Precipitating Factor', proforma.precipitating_factor, 4),
      ], 4))
    : '';

  const checkboxGroups = [
    ['Mood',               proforma.mood],
    ['Behaviour',          proforma.behaviour],
    ['Speech',             proforma.speech],
    ['Thought',            proforma.thought],
    ['Perception',         proforma.perception],
    ['Somatic',            proforma.somatic],
    ['Bio-functions',      proforma.bio_functions],
    ['Adjustment',         proforma.adjustment],
    ['Cognitive Function', proforma.cognitive_function],
    ['Fits',               proforma.fits],
    ['Sexual Problem',     proforma.sexual_problem],
    ['Substance Use',      proforma.substance_use],
  ];
  const hopiBodies = checkboxGroups
    .filter(([, vals]) => normalizeArr(vals).length > 0)
    .map(([label, vals]) => chipsRow(label, vals))
    .join('');
  const hopiSec = hopiBodies ? secE('Complaints / HOPI', `<div class="kv-grid">${hopiBodies}</div>`) : '';

  const additionalSec = (has(proforma.past_history) || has(proforma.family_history)
    || normalizeArr(proforma.associated_medical_surgical).length > 0)
    ? secE('Additional History', kvGrid([
        kv('Past Psychiatric History', proforma.past_history, 4),
        kv('Family History', proforma.family_history, 4),
        chipsRow('Associated Medical/Surgical', proforma.associated_medical_surgical),
      ], 4))
    : '';

  const mseBodies = [
    ['MSE — Behaviour',           proforma.mse_behaviour],
    ['MSE — Affect & Mood',       proforma.mse_affect],
    ['MSE — Thought',             proforma.mse_thought],
    ['MSE — Perception',          proforma.mse_perception],
    ['MSE — Cognitive Functions', proforma.mse_cognitive_function],
  ]
    .filter(([, vals]) => normalizeArr(vals).length > 0)
    .map(([label, vals]) => chipsRow(label, vals))
    .join('');
  const mseDelusionRow = has(proforma.mse_delusions)
    ? kv('Delusions / Ideas of Reference', proforma.mse_delusions, 4) : '';
  const mseSec = (mseBodies || mseDelusionRow)
    ? secE('Mental State Examination', `<div class="kv-grid">${mseBodies}${mseDelusionRow}</div>`)
    : '';

  const mgmtSec = (has(proforma.gpe) || has(proforma.diagnosis) || has(proforma.icd_code)
    || has(proforma.doctor_decision) || has(proforma.disposal) || has(proforma.referred_to)
    || has(proforma.treatment_prescribed) || has(proforma.workup_appointment))
    ? secE('Examination & Management', `<div class="diag-box">${kvGrid([
        kv('GPE Findings', proforma.gpe, 4),
        kv('Diagnosis', proforma.diagnosis, 2),
        kv('ICD Code', proforma.icd_code),
        kv('Doctor Decision', proforma.doctor_decision),
        kv('Disposal & Referral', proforma.disposal, 2),
        kv('Referred To', proforma.referred_to, 2),
        kv('Treatment Prescribed', proforma.treatment_prescribed, 4),
        kv('Work-up Appointment', proforma.workup_appointment ? fmtDate(proforma.workup_appointment) : ''),
        proforma.requires_adl_file ? kv('Requires Intake Record', 'Yes') : '',
        kv('Intake Record Reasoning', proforma.adl_reasoning, 2),
      ], 4)}</div>`)
    : '';

  return [visitSec, informantSec, courseSec, hopiSec, additionalSec, mseSec, mgmtSec]
    .filter(Boolean).join('\n');
}

/* ════════════════════════════════════════════════════════════
   SECTION 3 — OUT-PATIENT INTAKE RECORD (ADL)
   Port of adlIntakePrint.js  _buildAdlIntakeParts()
   ════════════════════════════════════════════════════════════ */

/**
 * @param {object} adlFile – adl_files row
 * @param {object} patient – patient row
 * @returns {string} section divs HTML
 */
function buildAdlIntakeSectionsHtml(adlFile, patient) {
  if (!adlFile) return '';

  const informants = parseArr(adlFile.informants);
  const complPt    = parseArr(adlFile.complaints_patient);
  const complInf   = parseArr(adlFile.complaints_informant);
  const siblings   = parseArr(adlFile.family_history_siblings);

  /* ── Patient Information ── */
  const ptName    = patient?.name || '';
  const ptAge     = patient?.age  != null ? String(patient.age) : '';
  const ptSex     = patient?.sex  || '';
  const ptMarital = patient?.marital_status || '';
  const ptEdu     = patient?.education || patient?.education_level || '';
  const ptOcc     = patient?.occupation || '';
  const ptCity    = (() => {
    const city = patient?.city || patient?.present_city_town_village || '';
    const dist = patient?.district || patient?.present_district || '';
    if (city && dist) return `${city}, ${dist}`;
    return city || dist || '';
  })();

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

  /* ── Informants ── */
  const infRows = informants
    .filter(i => has(i?.name) || has(i?.relationship) || has(i?.age))
    .map((inf, idx) =>
      `<tr><td>${idx + 1}</td><td>${esc(v(inf.name))}</td><td>${esc(v(inf.relationship))}</td><td>${esc(v(inf.age))}</td><td>${esc(v(inf.sex))}</td><td>${esc(v(inf.education))}</td><td>${esc(v(inf.marital_status))}</td><td>${esc(v(inf.occupation))}</td><td>${esc(v(inf.reliability))}</td></tr>`
    ).join('');
  const informantSec = infRows ? section('Informants',
    `<table><thead><tr><th>#</th><th>Name</th><th>Relationship</th><th>Age</th><th>Sex</th><th>Education</th><th>Marital</th><th>Occupation</th><th>Reliability</th></tr></thead><tbody>${infRows}</tbody></table>`
  ) : '';

  /* ── Complaints & Course ── */
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

  /* ── HPI ── */
  const hpiText = resolveHistoryPresentIllness(adlFile);
  const drugTx  = adlFile.history_treatment_drugs;
  const drugRsp = adlFile.history_treatment_response;
  let hpiBody = '';
  if (has(hpiText)) hpiBody += `<div class="narrative">${esc(hpiText)}</div>`;
  if (has(drugTx) || has(drugRsp)) {
    hpiBody += `<div style="margin-top:4px"><table><thead><tr><th>Treatment (Drugs)</th><th>Response</th></tr></thead><tbody><tr><td>${esc(v(drugTx))}</td><td>${esc(v(drugRsp))}</td></tr></tbody></table></div>`;
  }
  const hpiSec = hpiBody ? section('History of Present Illness', hpiBody) : '';

  /* ── Past History ── */
  const pastMedical    = adlFile.past_history_medical;
  const pastPsychiatric = resolvePastHistoryPsychiatric(adlFile);
  let pastBody = '';
  if (has(pastMedical) || has(pastPsychiatric)) {
    pastBody = `<div class="two-col">`;
    if (has(pastMedical))     pastBody += `<div><div class="sub-lbl">A. Medical (Injuries &amp; Operations)</div><div class="narrative">${esc(pastMedical)}</div></div>`;
    if (has(pastPsychiatric)) pastBody += `<div><div class="sub-lbl">B. Psychiatric</div><div class="narrative">${esc(pastPsychiatric)}</div></div>`;
    pastBody += `</div>`;
  }
  const pastSec = pastBody ? section('Past History', pastBody) : '';

  /* ── Family History ── */
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

  /* ── Home Situation & Early Development ── */
  const homeSit = resolveGeneralHomeSituation(adlFile);
  const devHist = resolveDevelopmentHistory(adlFile);
  const homeItems = [
    has(adlFile.personal_birth_place)            ? kv('Birth Place',            adlFile.personal_birth_place)            : '',
    has(adlFile.personal_delivery_type)           ? kv('Delivery Type',          adlFile.personal_delivery_type)           : '',
    has(adlFile.personal_complications_prenatal)  ? kv('Prenatal Complications', adlFile.personal_complications_prenatal, 2) : '',
    has(adlFile.personal_complications_natal)     ? kv('Natal Complications',    adlFile.personal_complications_natal, 2)   : '',
    has(adlFile.personal_complications_postnatal) ? kv('Postnatal Complications',adlFile.personal_complications_postnatal, 2) : '',
    has(devHist) ? kv('Developmental Milestones', devHist, 4) : '',
    has(homeSit) ? kv('Home Situation', homeSit, 4) : '',
  ];
  const homeSec = homeItems.some(Boolean)
    ? section('Home Situation & Early Development', kvGrid(homeItems.filter(Boolean), 4))
    : '';

  /* ── Personal & Social History ── */
  const pshRows = [
    ['Education',              resolveEducationHistory(adlFile)],
    ['Occupation',             resolveOccupationHistory(adlFile)],
    ['Religion',               resolveReligionHistory(adlFile)],
    ['Living Situation',       resolveLivingSituationHistory(adlFile)],
    ['Premorbid Personality',  resolvePremorbidPersonalityHistory(adlFile)],
    ['Sexual & Marital History', resolveSexualMarriageDetails(adlFile)],
    has(adlFile.sexual_menarche_age) ? ['Menarche Age', adlFile.sexual_menarche_age] : null,
  ]
    .filter(r => r && has(r[1]))
    .map(([label, text]) =>
      `<tr><td style="font-weight:600;width:22%;white-space:nowrap;background:#F8FAFC">${esc(label)}</td><td class="narrative">${esc(text)}</td></tr>`
    ).join('');
  const pshSec = pshRows ? section('Personal & Social History',
    `<table><tbody>${pshRows}</tbody></table>`
  ) : '';

  /* ── Physical Examination ── */
  const boolPhys = [
    ['Pallor',          adlFile.physical_pallor],
    ['Icterus',         adlFile.physical_icterus],
    ['Oedema',          adlFile.physical_oedema],
    ['Lymphadenopathy', adlFile.physical_lymphadenopathy],
  ].filter(([, val]) => val !== undefined && val !== null && val !== '');

  const textPhys = [
    ['General Appearance', adlFile.physical_general_appearance],
    ['Build',              adlFile.physical_build],
    ['Nutrition',          adlFile.physical_nutrition],
    ['Other Findings',     adlFile.physical_other],
  ].filter(([, val]) => has(val));

  let physRowsHtml = '';
  for (let i = 0; i < boolPhys.length; i += 2) {
    const [lbl1, val1] = boolPhys[i];
    const pair         = boolPhys[i + 1];
    physRowsHtml += `<tr>
      <td class="phys-lbl">${esc(lbl1)}</td><td>${esc(boolV(val1))}</td>
      ${pair ? `<td class="phys-lbl">${esc(pair[0])}</td><td>${esc(boolV(pair[1]))}</td>` : '<td></td><td></td>'}
    </tr>`;
  }
  textPhys.forEach(([lbl, val]) => {
    physRowsHtml += `<tr><td class="phys-lbl">${esc(lbl)}</td><td colspan="3">${esc(v(val))}</td></tr>`;
  });
  const physSec = physRowsHtml ? section('Physical Examination',
    `<table><tbody>${physRowsHtml}</tbody></table>`
  ) : '';

  /* ── Mental Status Examination ── */
  const mseItems = [
    ['General Appearance & Behaviour', adlFile.mse_appearance],
    ['Speech',           adlFile.mse_speech],
    ['Mood & Affect',    adlFile.mse_mood_affect],
    ['Thought Process',  adlFile.mse_thought_process],
    ['Thought Content',  adlFile.mse_thought_content],
    ['Perception',       adlFile.mse_perception],
    ['Cognition',        adlFile.mse_cognition],
    ['Insight',          adlFile.mse_insight],
    ['Judgment',         adlFile.mse_judgment],
  ].filter(([, val]) => has(val));
  const mseRows = mseItems
    .map(([lbl, val]) => `<tr><td class="mse-lbl">${esc(lbl)}</td><td>${esc(v(val))}</td></tr>`)
    .join('');
  const mseSec = mseRows ? section('Mental Status Examination (MSE)',
    `<table><tbody>${mseRows}</tbody></table>`
  ) : '';

  /* ── Diagnostic Formulation ── */
  const diagText = resolveDiagnosticFormulationHistory(adlFile);
  const diagSec  = has(diagText) ? section('Diagnostic Formulation',
    `<div class="diag-box"><div class="narrative">${esc(diagText)}</div></div>`
  ) : '';

  /* ── Final Assessment ── */
  const assessRows = [
    ['Provisional Diagnosis', adlFile.provisional_diagnosis],
    ['Treatment Plan',        adlFile.treatment_plan],
    ['Consultant Comments',   adlFile.consultant_comments],
  ].filter(([, val]) => has(val));

  const legacyAssessText = adlFile.final_assessment_history;
  let finalSec = '';
  if (assessRows.length > 0) {
    const tRows = assessRows
      .map(([lbl, val]) => `<tr><td class="assess-lbl">${esc(lbl)}</td><td class="narrative">${esc(v(val))}</td></tr>`)
      .join('');
    finalSec = section('Final Assessment',
      `<div class="assessment-box"><table><tbody>${tRows}</tbody></table></div>`
    );
  } else if (has(legacyAssessText)) {
    const chunks      = String(legacyAssessText).split(/\n\n+/);
    const legacyRows  = chunks
      .map(chunk => {
        const lines = chunk.trim().split('\n');
        if (lines.length >= 2) {
          const lbl = lines[0].trim();
          const val = lines.slice(1).join('\n').trim();
          return `<tr><td class="assess-lbl">${esc(lbl)}</td><td class="narrative">${esc(val)}</td></tr>`;
        }
        return chunk.trim() ? `<tr><td colspan="2" class="narrative">${esc(chunk.trim())}</td></tr>` : '';
      })
      .filter(Boolean).join('');
    if (legacyRows) {
      finalSec = section('Final Assessment',
        `<div class="assessment-box"><table><tbody>${legacyRows}</tbody></table></div>`
      );
    }
  }

  return [
    patientSec, informantSec, complaintSec,
    hpiSec,
    pastSec, familySec, homeSec,
    pshSec,
    physSec, mseSec, diagSec, finalSec,
  ].filter(Boolean).join('\n');
}

/* ════════════════════════════════════════════════════════════
   SECTION 4 — PRESCRIPTIONS
   Port of prescriptionPrint.js  buildPrescriptionPrintDocument()
   (content only — no header / patient-info / footer)
   ════════════════════════════════════════════════════════════ */

/**
 * @param {Array} prescriptionRecords – Prescription.toJSON() rows
 *   Each row: { id, visit_date, visit_type, prescription: [{medicine, dosage, ...}] }
 * @returns {string} section HTML — prescription tables only
 */
function buildPrescriptionSectionsHtml(prescriptionRecords) {
  const records = (prescriptionRecords || []).filter(r => {
    const meds = Array.isArray(r.prescription) ? r.prescription : [];
    return meds.some(m => m.medicine);
  });

  if (!records.length) return '';

  const blocks = records.map((rec, idx) => {
    const meds      = (Array.isArray(rec.prescription) ? rec.prescription : [])
      .filter(m => m.medicine);
    const dateStr   = rec.visit_date ? fmtDate(rec.visit_date) : '';
    const typeLabel = rec.visit_type === 'first_visit' ? 'First Visit'
      : rec.visit_type === 'follow_up' ? 'Follow-up' : (rec.visit_type || '');
    const title     = `Prescription ${idx + 1}${dateStr ? ` — ${dateStr}` : ''}${typeLabel ? ` · ${typeLabel}` : ''}`;

    const rows = meds.map((m, i) => `<tr>
      <td style="text-align:center">${i + 1}</td>
      <td>${esc(v(m.medicine))}</td>
      <td>${esc(v(m.dosage))}</td>
      <td>${esc(v(m.when_to_take || m.when))}</td>
      <td>${esc(v(m.frequency))}</td>
      <td>${esc(v(m.duration))}</td>
      <td style="text-align:center">${esc(v(m.quantity || m.qty))}</td>
      <td>${esc(v(m.details))}</td>
      <td>${esc(v(m.notes))}</td>
    </tr>`).join('');

    return `<h3 class="presc-title">${esc(title)}</h3>
<table class="presc-table">
  <thead><tr>
    <th style="width:4%">#</th>
    <th style="width:20%">Medicine Name</th>
    <th style="width:11%">Dosage</th>
    <th style="width:9%">When</th>
    <th style="width:11%">Frequency</th>
    <th style="width:9%">Duration</th>
    <th style="width:7%">Qty</th>
    <th style="width:14%">Details</th>
    <th style="width:15%">Notes</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>`;
  });

  return blocks.join('\n');
}

/* ── ADL record created date ────────────────────────────── */

function formatAdlRecordCreated(adlFile) {
  if (!adlFile) return '';
  if (adlFile.file_created_date) return fmtDate(adlFile.file_created_date);
  if (adlFile.created_at)        return fmtDateTime(adlFile.created_at);
  return '';
}

/* ── exports ─────────────────────────────────────────────── */

module.exports = {
  getLogoDataUri,
  buildPatientDetailsSectionsHtml,
  buildClinicalProformaSectionsHtml,
  buildAdlIntakeSectionsHtml,
  buildPrescriptionSectionsHtml,
  formatAdlRecordCreated,
  /* helpers also exported for patientReportHtml.js */
  esc,
  v,
  fmtDate,
  fmtDateTime,
  has,
};
