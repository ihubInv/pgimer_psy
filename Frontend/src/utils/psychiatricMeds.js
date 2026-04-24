import medsData from '../assets/psychiatric_meds_india.json';

/**
 * Flattens `psychiatric_meds_india.json` into a list of medicine records
 * usable by the prescription autocomplete.
 *
 * Output shape:
 * {
 *   name: string,                 // Generic / INN
 *   brands: string[],             // Indian brand names
 *   strengths: string[],          // Available strengths
 *   category: string,             // Sub-category key (e.g. "ssri", "benzodiazepines")
 *   group: string                 // Top-level group (e.g. "antidepressants")
 * }
 */
export const PSYCHIATRIC_MEDS = (() => {
  const out = [];
  const root = medsData?.psychiatric_medications || {};
  Object.entries(root).forEach(([group, node]) => {
    if (Array.isArray(node)) {
      node.forEach((m) =>
        out.push({
          name: m.name,
          brands: Array.isArray(m.brands) ? m.brands : [],
          strengths: Array.isArray(m.strengths) ? m.strengths : [],
          category: group,
          group
        })
      );
    } else if (node && typeof node === 'object') {
      Object.entries(node).forEach(([subKey, list]) => {
        if (!Array.isArray(list)) return;
        list.forEach((m) =>
          out.push({
            name: m.name,
            brands: Array.isArray(m.brands) ? m.brands : [],
            strengths: Array.isArray(m.strengths) ? m.strengths : [],
            category: subKey,
            group
          })
        );
      });
    }
  });
  out.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  return out;
})();

/** Human-friendly category / group label. */
export function prettyMedCategory(med) {
  if (!med) return '';
  const cat = (med.category || '').replace(/_/g, ' ');
  const grp = (med.group || '').replace(/_/g, ' ');
  if (!cat || cat === grp) return grp;
  return `${grp} / ${cat}`;
}

/**
 * Case-insensitive search over name, brand names, and category.
 * Returns up to `limit` suggestions (preserves alphabetical order of source).
 */
export function searchPsychiatricMeds(query, limit = 20) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return PSYCHIATRIC_MEDS.slice(0, limit);
  const results = [];
  for (const m of PSYCHIATRIC_MEDS) {
    const name = m.name.toLowerCase();
    const cat = String(m.category || '').toLowerCase();
    const grp = String(m.group || '').toLowerCase();
    const brands = (m.brands || []).map((b) => String(b).toLowerCase());
    if (
      name.includes(q) ||
      cat.includes(q) ||
      grp.includes(q) ||
      brands.some((b) => b.includes(q))
    ) {
      results.push(m);
      if (results.length >= limit) break;
    }
  }
  return results;
}
