function titleCasePart(part) {
  if (!part) return part;
  return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
}

function titleCaseToken(token) {
  return token
    .split('/')
    .map((slashPart) => slashPart.split('-').map(titleCasePart).join('-'))
    .join('/');
}

/**
 * Format a clinical checkbox option label for display and storage.
 * Capitalizes each word; preserves / - & ? ( ); adds spacing around ? & ( ).
 */
export function formatClinicalOptionLabel(input) {
  if (input == null) return '';
  let s = String(input).trim().replace(/\s+/g, ' ');
  if (!s) return '';

  s = s
    .replace(/\s*\?\s*/g, ' ? ')
    .replace(/\s*&\s*/g, ' & ')
    .replace(/\s*\(\s*/g, ' ( ')
    .replace(/\s*\)\s*/g, ' ) ')
    .replace(/\s+/g, ' ')
    .trim();

  return s.split(' ').map(titleCaseToken).join(' ');
}

export function normalizeOptionLabelForCompare(label) {
  return formatClinicalOptionLabel(label).toLowerCase();
}

export function sortClinicalOptionLabels(labels) {
  if (!Array.isArray(labels)) return [];
  return [...labels].sort((a, b) =>
    String(a).localeCompare(String(b), undefined, { sensitivity: 'base' })
  );
}

export function optionLabelExists(labels, candidate) {
  const normalized = normalizeOptionLabelForCompare(candidate);
  return labels.some((label) => normalizeOptionLabelForCompare(label) === normalized);
}
