/**
 * clinicalProformaPrint.js
 * Generates a professional, compact HTML document for the
 * Walk-in Clinical Proforma print / browser-PDF flow.
 *
 * Matches the design language of adlIntakePrint.js.
 */

import PGI_Logo from '../assets/PGI_Logo.png';
import { normalizeArrayField } from './clinicalMultiSelectArray';

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
  if (Array.isArray(val)) return val.length > 0;
  return String(val).trim() !== '';
}

function normalizeArr(value) {
  return normalizeArrayField(value);
}

function labelsFromOptions(vals, options) {
  if (!options?.length) {
    return vals.map((v) => String(v)).join(', ');
  }
  return vals
    .map((val) => {
      const strVal = String(val).trim();
      if (!strVal) return '';
      const opt = options.find((o) => {
        if (typeof o === 'string') return o === strVal;
        return o?.value === strVal || o?.label === strVal;
      });
      if (!opt) return strVal;
      return typeof opt === 'string' ? opt : opt.label || opt.value || strVal;
    })
    .filter(Boolean)
    .join(', ');
}

/* ── CSS (shared with adlIntakePrint design language) ─────── */
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
.sec-hdr { background: #065F46; color: #fff; font-size: 8pt; font-weight: 700; padding: 3px 7px; border-radius: 3px 3px 0 0; text-transform: uppercase; letter-spacing: 0.5px; }
.sec-body { border: 1px solid #D1D5DB; border-top: none; border-radius: 0 0 3px 3px; padding: 5px 7px; background: #fff; }
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
.chips-row { display: flex; flex-wrap: wrap; gap: 2px; padding: 2px 4px; }
.chip { background: #ECFDF5; border: 1px solid #A7F3D0; color: #065F46; font-size: 7.5pt; font-weight: 600; padding: 1px 5px; border-radius: 10px; }
.diag-box { background: #F0FDF4; border: 1px solid #BBF7D0; border-left: 4px solid #16A34A; border-radius: 3px; padding: 5px 7px; }
.narrative { font-size: 9pt; line-height: 1.4; color: #111827; white-space: pre-wrap; padding: 2px 0; }
table { width: 100%; border-collapse: collapse; font-size: 8.5pt; margin: 0; }
table th { background: #ECFDF5; color: #065F46; font-weight: 700; padding: 3px 5px; border: 1px solid #A7F3D0; text-align: left; font-size: 7.5pt; text-transform: uppercase; }
table td { padding: 3px 5px; border: 1px solid #E5E7EB; vertical-align: top; }
table tbody tr:nth-child(even) td { background: #F8FAFC; }
.ftr { margin-top: 6px; padding-top: 4px; border-top: 1px solid #D1D5DB; text-align: center; font-size: 7pt; color: #6B7280; }
.ftr p { margin: 1px 0; }
@media print {
  table   { page-break-inside: avoid; }
  .diag-box { page-break-inside: avoid; }
}
`;

/* ── section/kv builders ──────────────────────────────────── */

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

function chipsRow(label, values, options) {
  const arr = normalizeArr(values);
  if (!arr.length) return '';
  const text = labelsFromOptions(arr, options);
  const chips = arr.map(val => {
    const opt = options?.find(o => o.value === val);
    return `<span class="chip">${esc(opt ? opt.label : val)}</span>`;
  }).join('');
  return `<div class="kv span4" style="border-right:none">
    <span class="kl">${esc(label)}</span>
    <div class="chips-row">${chips}</div>
  </div>`;
}

const ONSET_LABELS = {
  '<1_week': '< 1 week',
  '1w_1m': '1 week – 1 month',
  '>1_month': '> 1 month',
  not_known: 'Not known',
};

/* ── main builder ────────────────────────────────────────── */

function _buildClinicalProformaParts(proforma, patient, clinicalOptions = {}) {
  const opts     = clinicalOptions || {};
  const logoUrl  = getLogoUrl();

  const visitDate = proforma.visit_date
    ? fmtDate(String(proforma.visit_date).includes('T') ? proforma.visit_date.split('T')[0] : proforma.visit_date)
    : '';
  const onsetLabel = proforma.onset_duration
    ? (ONSET_LABELS[proforma.onset_duration] || proforma.onset_duration)
    : '';

  /* ── header ── */
  const header = `<div class="hdr">
  ${logoUrl ? `<img src="${logoUrl}" alt="PGIMER Logo" />` : ''}
  <div class="hdr-text">
    <h1>POSTGRADUATE INSTITUTE OF MEDICAL EDUCATION &amp; RESEARCH</h1>
    <div class="dept">Department of Psychiatry, Chandigarh</div>
    <div class="rpt-title">Walk-in Clinical Proforma</div>
  </div>
</div>`;

  /* ── meta bar ── */
  const metaBar = `<div class="meta-bar">
  ${has(patient?.cr_no)  ? `<div class="mc"><span class="ml">CR No.</span><span class="mv">${esc(patient.cr_no)}</span></div>`  : ''}
  ${has(patient?.psy_no) ? `<div class="mc"><span class="ml">Psy. No.</span><span class="mv">${esc(patient.psy_no)}</span></div>` : ''}
  <div class="mc"><span class="ml">Patient</span><span class="mv">${esc(v(patient?.name || proforma.patient_name))}</span></div>
  <div class="mc"><span class="ml">Age / Sex</span><span class="mv">${esc(v(patient?.age))} / ${esc(v(patient?.sex))}</span></div>
  ${visitDate ? `<div class="mc"><span class="ml">Visit Date</span><span class="mv">${esc(visitDate)}</span></div>` : ''}
</div>`;

  /* ── Visit ── */
  const visitSec = section('Visit', kvGrid([
    kv('Visit Date', visitDate),
    kv('Patient Name', patient?.name || proforma.patient_name),
    kv('Age', patient?.age),
    kv('Sex', patient?.sex),
  ], 4));

  /* ── Informant ── */
  const informantLabel = proforma.informant_present === true ? 'Present'
    : proforma.informant_present === false ? 'Absent' : '';
  const informantSec = (has(informantLabel) || has(proforma.informant_who) || has(proforma.nature_of_information))
    ? section('Informant', kvGrid([
        kv('Informant Present', informantLabel),
        proforma.informant_present === true ? kv('Who is Present', proforma.informant_who, 2) : '',
        kv('Nature of Information', proforma.nature_of_information, 2),
      ], 4))
    : '';

  /* ── Illness Course ── */
  const courseSec = (has(onsetLabel) || has(proforma.course) || has(proforma.precipitating_factor)
    || has(proforma.illness_duration) || has(proforma.current_episode_since))
    ? section('Illness Course', kvGrid([
        kv('Onset Duration', onsetLabel),
        kv('Course', proforma.course),
        kv('Total Duration of Illness', proforma.illness_duration),
        kv('Current Episode Since', proforma.current_episode_since ? fmtDate(proforma.current_episode_since) : ''),
        kv('Precipitating Factor', proforma.precipitating_factor, 4),
      ], 4))
    : '';

  /* ── Complaints / HOPI ── */
  const checkboxGroups = [
    ['Mood',               proforma.mood,               opts.mood],
    ['Behaviour',          proforma.behaviour,           opts.behaviour],
    ['Speech',             proforma.speech,              opts.speech],
    ['Thought',            proforma.thought,             opts.thought],
    ['Perception',         proforma.perception,          opts.perception],
    ['Somatic',            proforma.somatic,             opts.somatic],
    ['Bio-functions',      proforma.bio_functions,       opts.bio_functions],
    ['Adjustment',         proforma.adjustment,          opts.adjustment],
    ['Cognitive Function', proforma.cognitive_function,  opts.cognitive_function],
    ['Fits',               proforma.fits,                opts.fits],
    ['Sexual Problem',     proforma.sexual_problem,      opts.sexual_problem],
    ['Substance Use',      proforma.substance_use,       opts.substance_use],
  ];
  const hopiBodies = checkboxGroups
    .filter(([, vals]) => normalizeArr(vals).length > 0)
    .map(([label, vals, options]) => chipsRow(label, vals, options))
    .join('');
  const hopiSec = hopiBodies ? section('Complaints / HOPI', `<div class="kv-grid">${hopiBodies}</div>`) : '';

  /* ── Additional History ── */
  const additionalSec = (has(proforma.past_history) || has(proforma.family_history)
    || normalizeArr(proforma.associated_medical_surgical).length > 0)
    ? section('Additional History', kvGrid([
        kv('Past Psychiatric History', proforma.past_history, 4),
        kv('Family History', proforma.family_history, 4),
        chipsRow('Associated Medical/Surgical', proforma.associated_medical_surgical, opts.associated_medical_surgical),
      ], 4))
    : '';

  /* ── MSE ── */
  const mseBodies = [
    ['MSE — Behaviour',           proforma.mse_behaviour,         opts.mse_behaviour],
    ['MSE — Affect & Mood',       proforma.mse_affect,            opts.mse_affect],
    ['MSE — Thought',             proforma.mse_thought,           opts.mse_thought],
    ['MSE — Perception',          proforma.mse_perception,        opts.mse_perception],
    ['MSE — Cognitive Functions', proforma.mse_cognitive_function, opts.mse_cognitive_function],
  ]
    .filter(([, vals]) => normalizeArr(vals).length > 0)
    .map(([label, vals, options]) => chipsRow(label, vals, options))
    .join('');
  const mseDelusionRow = has(proforma.mse_delusions)
    ? kv('Delusions / Ideas of Reference', proforma.mse_delusions, 4) : '';
  const mseSec = (mseBodies || mseDelusionRow)
    ? section('Mental State Examination', `<div class="kv-grid">${mseBodies}${mseDelusionRow}</div>`)
    : '';

  /* ── Examination & Management ── */
  const mgmtSec = (has(proforma.gpe) || has(proforma.diagnosis) || has(proforma.icd_code)
    || has(proforma.doctor_decision) || has(proforma.disposal) || has(proforma.referred_to)
    || has(proforma.treatment_prescribed) || has(proforma.workup_appointment))
    ? section('Examination & Management', `<div class="diag-box">${kvGrid([
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

  /* ── footer ── */
  const footer = `<div class="ftr">
  <p><strong>Generated:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
  <p>PGIMER — Department of Psychiatry | Electronic Medical Record System</p>
  <p>Computer-generated document — no signature required.</p>
</div>`;

  const sectionsHtml = [visitSec, informantSec, courseSec, hopiSec, additionalSec, mseSec, mgmtSec].join('\n');
  const bodyContent  = [header, metaBar, sectionsHtml, footer].join('\n');
  return { bodyContent, sectionsHtml, name: patient?.name || proforma.patient_name };
}

/* ── public exports ─────────────────────────────────────── */

/** @param {object} proforma - clinical proforma record
 *  @param {object} patient  - patient record for demographics
 *  @param {object} clinicalOptions - API options for checkbox label resolution */
export function generateClinicalProformaPrintHtml(proforma, patient, clinicalOptions = {}) {
  if (!proforma) return '';
  const { bodyContent, name } = _buildClinicalProformaParts(proforma, patient, clinicalOptions);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Walk-in Clinical Proforma — ${esc(v(name))}</title>
  <style>${CSS}</style>
</head>
<body>${bodyContent}</body>
</html>`;
}

/** Full body content (header + sections + footer) for legacy combined embedding. */
export function clinicalProformaSectionHtml(proforma, patient, clinicalOptions) {
  if (!proforma) return '';
  const { bodyContent } = _buildClinicalProformaParts(proforma, patient, clinicalOptions);
  return bodyContent;
}

/** ONLY the section divs — no header, no meta-bar, no footer.
 *  Use this inside the unified combined report. */
export function clinicalProformaContentOnlyHtml(proforma, patient, clinicalOptions) {
  if (!proforma) return '';
  const { sectionsHtml } = _buildClinicalProformaParts(proforma, patient, clinicalOptions);
  return sectionsHtml;
}
