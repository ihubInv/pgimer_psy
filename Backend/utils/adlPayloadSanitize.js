/**
 * ADL API payload cleanup: invalid keys, DD/MM/YYYY dates, empty strings.
 * Used by ADLFile.create / ADLFile.update and adlController (defence in depth).
 */

const ADL_DATE_FIELD_KEYS = new Set([
  'file_created_date',
  'last_accessed_date',
  'history_treatment_dates',
  'past_history_psychiatric_dates',
  'family_history_father_death_date',
  'family_history_mother_death_date',
  'sexual_marriage_date',
  'personal_birth_date',
]);

/**
 * Convert DD/MM/YYYY (or D/M/YYYY) to YYYY-MM-DD for PostgreSQL DATE columns.
 * Returns original string if pattern does not match.
 */
function tryDdMmYyyyToYyyyMmDd(s) {
  if (typeof s !== 'string') return s;
  const t = s.trim();
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return s;
  const dd = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const yyyy = parseInt(m[3], 10);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || Number.isNaN(yyyy)) return s;
  return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

/**
 * Remove empty-string property names at every object level (e.g. {"":"9823"}).
 */
function stripEmptyStringKeysDeep(value) {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map((item) => stripEmptyStringKeysDeep(item));
  }
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (k === '' || String(k).trim() === '') continue;
      out[k] = stripEmptyStringKeysDeep(v);
    }
    return out;
  }
  return value;
}

function emptyStringsToNullShallow(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return;
  Object.keys(obj).forEach((key) => {
    if (obj[key] === '') obj[key] = null;
  });
}

function coerceKnownDateFields(obj) {
  if (!obj || typeof obj !== 'object') return;
  for (const key of ADL_DATE_FIELD_KEYS) {
    if (!(key in obj) || obj[key] === null || obj[key] === undefined) continue;
    if (typeof obj[key] === 'string') {
      obj[key] = tryDdMmYyyyToYyyyMmDd(obj[key]);
    }
  }
}

/**
 * Deep-clone-safe sanitize for any ADL write payload.
 */
function sanitizeAdlRequestBody(body) {
  if (body === null || body === undefined) return body;
  if (typeof body !== 'object') return body;
  let data;
  try {
    data = JSON.parse(JSON.stringify(body));
  } catch {
    data = { ...body };
  }
  data = stripEmptyStringKeysDeep(data);
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    delete data[''];
    Object.keys(data).forEach((k) => {
      if (String(k).trim() === '') delete data[k];
    });
  }
  coerceKnownDateFields(data);
  emptyStringsToNullShallow(data);
  return data;
}

module.exports = {
  ADL_DATE_FIELD_KEYS,
  tryDdMmYyyyToYyyyMmDd,
  stripEmptyStringKeysDeep,
  emptyStringsToNullShallow,
  coerceKnownDateFields,
  sanitizeAdlRequestBody,
};
