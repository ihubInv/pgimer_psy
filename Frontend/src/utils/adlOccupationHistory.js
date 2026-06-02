export const ADL_OCCUPATION_HISTORY_LABELS = [
  'Job title',
  'Dates',
  'Adjustment',
  'Difficulties',
  'Promotions',
  'Reason for change',
];

export const ADL_OCCUPATION_HISTORY_LABEL_LINE =
  ADL_OCCUPATION_HISTORY_LABELS.join(', ');

const LEGACY_JOB_FIELDS = [
  ['job', ADL_OCCUPATION_HISTORY_LABELS[0]],
  ['dates', ADL_OCCUPATION_HISTORY_LABELS[1]],
  ['adjustment', ADL_OCCUPATION_HISTORY_LABELS[2]],
  ['difficulties', ADL_OCCUPATION_HISTORY_LABELS[3]],
  ['promotions', ADL_OCCUPATION_HISTORY_LABELS[4]],
  ['change_reason', ADL_OCCUPATION_HISTORY_LABELS[5]],
];

const formatJobObject = (job = {}) => {
  const parts = [];
  LEGACY_JOB_FIELDS.forEach(([key, label]) => {
    const val = job[key];
    if (val != null && String(val).trim() !== '') {
      parts.push(`${label}\n${String(val).trim()}`);
    }
  });
  return parts.join('\n\n');
};

const parseOccupationJobs = (raw) => {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

/** Resolve combined occupation history (supports pre-migration occupation_jobs JSONB). */
export const resolveOccupationHistory = (data = {}) => {
  if (data.occupation_history != null && String(data.occupation_history).trim() !== '') {
    return String(data.occupation_history);
  }
  const jobs = parseOccupationJobs(data.occupation_jobs);
  const blocks = jobs
    .map((job, index) => {
      const body = formatJobObject(job);
      if (!body) return '';
      return jobs.length > 1 ? `Job ${index + 1}\n${body}` : body;
    })
    .filter(Boolean);
  return blocks.join('\n\n---\n\n');
};
