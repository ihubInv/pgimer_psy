/**
 * Parse ADL JSON/array fields for household residents or in-laws and normalize
 * each row to { name, relationship, age } (strings). Handles legacy rows stored
 * as JSON strings inside the array or as plain objects from the API.
 */
export function parseAdlJsonArrayField(field) {
  if (field == null || field === '') return [];
  try {
    const parsed = typeof field === 'string' ? JSON.parse(field) : field;
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === 'object') return [parsed];
    return [];
  } catch {
    return [];
  }
}

export function normalizeLivingPersonEntry(entry) {
  if (entry == null) return { name: '', relationship: '', age: '' };
  if (typeof entry === 'string') {
    const t = entry.trim();
    if (!t) return { name: '', relationship: '', age: '' };
    if (t.startsWith('{') && t.endsWith('}')) {
      try {
        const o = JSON.parse(t);
        if (o && typeof o === 'object' && !Array.isArray(o)) {
          return {
            name: o.name != null ? String(o.name) : '',
            relationship: o.relationship != null ? String(o.relationship) : '',
            age: o.age != null ? String(o.age) : '',
          };
        }
      } catch {
        // fall through
      }
    }
    return { name: t, relationship: '', age: '' };
  }
  if (typeof entry === 'object' && !Array.isArray(entry)) {
    return {
      name: entry.name != null ? String(entry.name) : '',
      relationship: entry.relationship != null ? String(entry.relationship) : '',
      age: entry.age != null ? String(entry.age) : '',
    };
  }
  return { name: String(entry), relationship: '', age: '' };
}

export function parseLivingPersonRows(field) {
  return parseAdlJsonArrayField(field).map(normalizeLivingPersonEntry);
}
