/**
 * Parse PostgreSQL text[] literal form, e.g. {"Depressive","Delusion of persecution"}.
 * This is not valid JSON (JSON arrays use [...]), so it must be handled explicitly.
 * Returns null if the string does not look like a PG array literal.
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

/**
 * Normalize clinical multi-select / checkbox-group values from the API:
 * JS array, JSON array string, PostgreSQL text[] literal, comma-separated text, or single value.
 */
export function normalizeArrayField(value) {
  if (value === null || value === undefined || value === '') return [];
  if (Array.isArray(value)) return [...value];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
      return parsed !== null && parsed !== undefined && parsed !== '' ? [parsed] : [];
    } catch {
      const pg = tryParsePostgresTextArrayLiteral(value);
      if (pg !== null) return pg;
      if (value.includes(',')) {
        return value.split(',').map((item) => item.trim()).filter((item) => item.length > 0);
      }
      return value.trim() ? [value.trim()] : [];
    }
  }
  return value ? [value] : [];
}
