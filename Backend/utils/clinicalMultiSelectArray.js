/**
 * Backend mirror of Frontend clinicalMultiSelectArray.js (normalize + label resolution).
 */

function tryParsePostgresTextArrayLiteral(str) {
  if (typeof str !== 'string') return null;
  const s = str.trim();
  if (s.length < 2 || s[0] !== '{' || s[s.length - 1] !== '}') return null;
  const inner = s.slice(1, -1).trim();
  if (inner === '') return [];
  if (inner.toUpperCase() === 'NULL') return [];

  const out = [];
  let i = 0;
  while (i < inner.length) {
    while (i < inner.length && /[\s,]/.test(inner[i])) i++;
    if (i >= inner.length) break;

    if (inner[i] === '"') {
      i++;
      let chunk = '';
      while (i < inner.length) {
        if (inner[i] === '\\' && i + 1 < inner.length) {
          chunk += inner[i + 1];
          i += 2;
          continue;
        }
        if (inner[i] === '"') {
          i++;
          break;
        }
        chunk += inner[i];
        i++;
      }
      out.push(chunk);
      continue;
    }

    const start = i;
    while (i < inner.length && inner[i] !== ',') i++;
    const token = inner.slice(start, i).trim();
    if (token) out.push(token);
    if (i < inner.length && inner[i] === ',') i++;
  }
  return out;
}

function isGarbageArrayToken(item) {
  if (item === null || item === undefined) return true;
  if (typeof item === 'object') {
    if (Array.isArray(item)) return item.length === 0;
    return Object.keys(item).length === 0;
  }
  const s = String(item).trim();
  if (!s) return true;
  if (s === '{}' || s === '[]' || s === '{"{}"}' || s === '{""}') return true;
  return false;
}

function filterClinicalArrayTokens(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.filter((item) => !isGarbageArrayToken(item));
}

function normalizeArrayField(value) {
  if (value === null || value === undefined || value === '') return [];
  if (Array.isArray(value)) return filterClinicalArrayTokens(value);

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || trimmed === '{}' || trimmed === '[]') return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return filterClinicalArrayTokens(parsed);
      if (parsed !== null && typeof parsed === 'object') return [];
      if (parsed !== null && parsed !== undefined && parsed !== '') {
        return filterClinicalArrayTokens([parsed]);
      }
      return [];
    } catch {
      const pg = tryParsePostgresTextArrayLiteral(trimmed);
      if (pg !== null) return filterClinicalArrayTokens(pg);
      if (trimmed.includes(',')) {
        return filterClinicalArrayTokens(
          trimmed.split(',').map((item) => item.trim()).filter((item) => item.length > 0)
        );
      }
      return isGarbageArrayToken(trimmed) ? [] : [trimmed];
    }
  }

  if (typeof value === 'object') return [];
  return isGarbageArrayToken(value) ? [] : [value];
}

function labelsFromClinicalOptions(selectedValues, options = []) {
  const vals = normalizeArrayField(selectedValues);
  if (!vals.length) return '';

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

module.exports = {
  normalizeArrayField,
  labelsFromClinicalOptions,
};
