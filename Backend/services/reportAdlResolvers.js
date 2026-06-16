/**
 * reportAdlResolvers.js
 *
 * CommonJS port of the frontend ADL resolver utilities.
 * These are pure functions: (adlFile) => string
 * They handle both current combined columns and legacy individual columns.
 */

'use strict';

/* ── generic merger ──────────────────────────────────────── */

function mergeLegacyFields(data, columnKey, legacyPairs) {
  if (data[columnKey] != null && String(data[columnKey]).trim() !== '') {
    return String(data[columnKey]);
  }
  const parts = [];
  legacyPairs.forEach(([key, label]) => {
    const val = data[key];
    if (val != null && String(val).trim() !== '') {
      parts.push(`${label}\n${String(val).trim()}`);
    }
  });
  return parts.join('\n\n');
}

/* ── History of Present Illness ─────────────────────────── */

const resolveHistoryPresentIllness = (data = {}) => {
  if (data.history_present_illness != null && String(data.history_present_illness).trim() !== '') {
    return String(data.history_present_illness);
  }
  const parts = [];
  if (data.history_narrative?.trim?.()) {
    parts.push(`A. Spontaneous narrative account\n${data.history_narrative.trim()}`);
  }
  if (data.history_specific_enquiry?.trim?.()) {
    parts.push(`B. Specific enquiry about mood, sleep, appetite, anxiety symptoms, suicidal risk, social interaction, job efficiency, personal hygiene, memory, etc.\n${data.history_specific_enquiry.trim()}`);
  }
  if (data.history_drug_intake?.trim?.()) {
    parts.push(`C. Intake of dependence producing and prescription drugs\n${data.history_drug_intake.trim()}`);
  }
  return parts.join('\n\n');
};

/* ── Past History – Psychiatric ─────────────────────────── */

const resolvePastHistoryPsychiatric = (data = {}) =>
  mergeLegacyFields(data, 'past_history_psychiatric', [
    ['past_history_psychiatric_diagnosis',  'Diagnosis or salient features'],
    ['past_history_psychiatric_treatment',  'Treatment'],
    ['past_history_psychiatric_interim',    'Interim history of previous psychiatric illness'],
    ['past_history_psychiatric_recovery',   'Specific enquiry into completeness of recovery and socialization/personal care in the interim period'],
  ]);

/* ── Home Situation ─────────────────────────────────────── */

const resolveGeneralHomeSituation = (data = {}) =>
  mergeLegacyFields(data, 'general_home_situation', [
    ['home_situation_childhood',            'Description of childhood home situation'],
    ['home_situation_parents_relationship', "Parents' relationship"],
    ['home_situation_socioeconomic',        'Socioeconomic status'],
    ['home_situation_interpersonal',        'Interpersonal relationships'],
  ]);

/* ── Development History ────────────────────────────────── */

const resolveDevelopmentHistory = (data = {}) =>
  mergeLegacyFields(data, 'development_history', [
    ['development_weaning_age',       'Weaning age'],
    ['development_first_words',       'First words'],
    ['development_three_words',       'Three words sentences'],
    ['development_walking',           'Walking age'],
    ['development_neurotic_traits',   'Neurotic traits'],
    ['development_nail_biting',       'Nail biting'],
    ['development_bedwetting',        'Bedwetting'],
    ['development_phobias',           'Phobias'],
    ['development_childhood_illness', 'Childhood illness'],
  ]);

/* ── Education History ──────────────────────────────────── */

const resolveEducationHistory = (data = {}) =>
  mergeLegacyFields(data, 'education_history', [
    ['education_start_age',          'Age at start of education'],
    ['education_highest_class',      'Highest class passed'],
    ['education_performance',        'Performance'],
    ['education_disciplinary',       'Disciplinary problems'],
    ['education_peer_relationship',  'Peer relationships'],
    ['education_hobbies',            'Hobbies and interests'],
    ['education_special_abilities',  'Special abilities'],
    ['education_discontinue_reason', 'Reason for discontinuing education'],
  ]);

/* ── Occupation History ─────────────────────────────────── */

const LEGACY_JOB_FIELDS = [
  ['job',           'Job title'],
  ['dates',         'Dates'],
  ['adjustment',    'Adjustment'],
  ['difficulties',  'Difficulties'],
  ['promotions',    'Promotions'],
  ['change_reason', 'Reason for change'],
];

function _formatJobObject(job = {}) {
  const parts = [];
  LEGACY_JOB_FIELDS.forEach(([key, label]) => {
    const val = job[key];
    if (val != null && String(val).trim() !== '') {
      parts.push(`${label}\n${String(val).trim()}`);
    }
  });
  return parts.join('\n\n');
}

function _parseOccupationJobs(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; }
    catch { return []; }
  }
  return [];
}

const resolveOccupationHistory = (data = {}) => {
  if (data.occupation_history != null && String(data.occupation_history).trim() !== '') {
    return String(data.occupation_history);
  }
  const jobs   = _parseOccupationJobs(data.occupation_jobs);
  const blocks = jobs
    .map((job, i) => {
      const body = _formatJobObject(job);
      if (!body) return '';
      return jobs.length > 1 ? `Job ${i + 1}\n${body}` : body;
    })
    .filter(Boolean);
  return blocks.join('\n\n---\n\n');
};

/* ── Religion History ───────────────────────────────────── */

const resolveReligionHistory = (data = {}) =>
  mergeLegacyFields(data, 'religion_history', [
    ['religion_type',          'Type of religion'],
    ['religion_participation', 'Participation in religious activities'],
    ['religion_changes',       'Changes in religious beliefs'],
  ]);

/* ── Living Situation ───────────────────────────────────── */

const resolveLivingSituationHistory = (data = {}) =>
  mergeLegacyFields(data, 'living_situation_history', [
    ['living_income_sharing',    'Income sharing arrangements'],
    ['living_expenses',          'Expenses'],
    ['living_kitchen',           'Kitchen arrangements'],
    ['living_domestic_conflicts','Domestic conflicts'],
    ['living_social_class',      'Social class'],
  ]);

/* ── Premorbid Personality ──────────────────────────────── */

function _formatTraitsValue(raw) {
  if (raw == null) return '';
  if (Array.isArray(raw)) {
    return raw.map(t => (typeof t === 'string' ? t : JSON.stringify(t)).trim()).filter(Boolean).join(', ');
  }
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw);
      if (Array.isArray(p)) return _formatTraitsValue(p);
    } catch { return raw.trim(); }
    return raw.trim();
  }
  return String(raw).trim();
}

const resolvePremorbidPersonalityHistory = (data = {}) => {
  if (data.premorbid_personality_history != null && String(data.premorbid_personality_history).trim() !== '') {
    return String(data.premorbid_personality_history);
  }
  const legacy = [
    ['premorbid_personality_passive_active',        'Passive vs Active'],
    ['premorbid_personality_assertive',             'Assertiveness'],
    ['premorbid_personality_introvert_extrovert',   'Introvert vs Extrovert'],
    ['premorbid_personality_traits',                'Personality traits'],
    ['premorbid_personality_hobbies',               'Hobbies and interests'],
    ['premorbid_personality_habits',                'Habits'],
    ['premorbid_personality_alcohol_drugs',         'Alcohol and drug use'],
  ];
  const parts = [];
  legacy.forEach(([key, label]) => {
    const val = key === 'premorbid_personality_traits'
      ? _formatTraitsValue(data[key])
      : data[key];
    if (val != null && String(val).trim() !== '') {
      parts.push(`${label}\n${String(val).trim()}`);
    }
  });
  return parts.join('\n\n');
};

/* ── Sexual & Marriage Details ──────────────────────────── */

const resolveSexualMarriageDetails = (data = {}) =>
  mergeLegacyFields(data, 'sexual_marriage_details', [
    ['sexual_spouse_age',          'Spouse age'],
    ['sexual_spouse_occupation',   'Spouse occupation'],
    ['sexual_adjustment_general',  'General adjustment'],
    ['sexual_adjustment_sexual',   'Sexual adjustment'],
    ['sexual_problems',            'Sexual problems'],
  ]);

/* ── Diagnostic Formulation ─────────────────────────────── */

const resolveDiagnosticFormulationHistory = (data = {}) =>
  mergeLegacyFields(data, 'diagnostic_formulation_history', [
    ['diagnostic_formulation_summary',       'Brief clinical summary'],
    ['diagnostic_formulation_features',      'Salient features supporting diagnosis'],
    ['diagnostic_formulation_psychodynamic', 'Psychodynamic formulation'],
  ]);

/* ── exports ─────────────────────────────────────────────── */

module.exports = {
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
};
