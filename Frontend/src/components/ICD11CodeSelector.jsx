import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { FiSearch, FiX } from 'react-icons/fi';
import Select from './Select';
import icd11Codes from '../assets/ICD11_Codes.json';

function isNullish(v) {
  return v == null;
}

/** Same as Flutter: Code > block > Title */
function icdItemLabel(item) {
  const code = item['Code'];
  const title = item['Title'] ?? '';
  const block = item['block'];
  if (code != null && code !== '') return `${code} - ${title}`;
  if (block != null && block !== '') return `${block} - ${title}`;
  return title;
}

/** Stable value for <Select> (avoids JSON key-order mismatches) */
function icdRowKey(item) {
  return [
    item['ChapterNo'],
    item['level1'],
    item['level2'],
    item['level3'],
    item['level4'],
    item['level5'],
    item['Code'],
    item['Foundation URI']
  ]
    .map((x) => (x == null ? '' : String(x)))
    .join('|');
}

/**
 * @param {number} step 0 = chapters
 * @param {Record<string, unknown>[]} path
 * @param {Record<string, unknown>[]} codes
 */
function getIcdOptions(step, path, codes) {
  if (step === 0) {
    return codes.filter((e) => isNullish(e['level1']));
  }
  const chapter = path[0]?.['ChapterNo'];
  if (chapter === undefined || chapter === null) return [];

  if (step === 1) {
    return codes.filter(
      (e) =>
        e['ChapterNo'] === chapter &&
        !isNullish(e['level1']) &&
        isNullish(e['level2'])
    );
  }
  if (step === 2) {
    const l1 = path[1]?.['level1'];
    return codes.filter(
      (e) =>
        e['ChapterNo'] === chapter &&
        String(e['level1']) === String(l1) &&
        !isNullish(e['level2']) &&
        isNullish(e['level3'])
    );
  }
  if (step === 3) {
    const l1 = path[1]?.['level1'];
    const l2 = path[2]?.['level2'];
    return codes.filter(
      (e) =>
        e['ChapterNo'] === chapter &&
        String(e['level1']) === String(l1) &&
        String(e['level2']) === String(l2) &&
        !isNullish(e['level3']) &&
        isNullish(e['level4'])
    );
  }
  if (step === 4) {
    const l1 = path[1]?.['level1'];
    const l2 = path[2]?.['level2'];
    const l3 = path[3]?.['level3'];
    return codes.filter(
      (e) =>
        e['ChapterNo'] === chapter &&
        String(e['level1']) === String(l1) &&
        String(e['level2']) === String(l2) &&
        String(e['level3']) === String(l3) &&
        !isNullish(e['level4']) &&
        isNullish(e['level5'])
    );
  }
  if (step === 5) {
    const l1 = path[1]?.['level1'];
    const l2 = path[2]?.['level2'];
    const l3 = path[3]?.['level3'];
    const l4 = path[4]?.['level4'];
    return codes.filter(
      (e) =>
        e['ChapterNo'] === chapter &&
        String(e['level1']) === String(l1) &&
        String(e['level2']) === String(l2) &&
        String(e['level3']) === String(l3) &&
        String(e['level4']) === String(l4) &&
        !isNullish(e['level5'])
    );
  }
  return [];
}

function deepestCodeFromPath(path) {
  for (let i = path.length - 1; i >= 0; i--) {
    const c = path[i]?.['Code'];
    if (c != null && c !== '') return String(c);
  }
  return '';
}

/**
 * Rebuild path from a leaf row (by stored ICD code).
 * @param {Record<string, unknown>} leaf
 * @param {Record<string, unknown>[]} codes
 */
function ancestorsForLeaf(leaf, codes) {
  if (!leaf) return [];
  const cn = leaf['ChapterNo'];
  const ch = codes.find((e) => e['ChapterNo'] === cn && isNullish(e['level1']));
  const out = ch ? [ch] : [];

  if (!isNullish(leaf['level1']) && isNullish(leaf['level2'])) {
    if (!ch || leaf !== ch) out.push(leaf);
    return out;
  }

  const t1 = codes.find(
    (e) =>
      e['ChapterNo'] === cn &&
      !isNullish(e['level1']) &&
      isNullish(e['level2']) &&
      String(e['level1']) === String(leaf['level1'])
  );
  if (t1) out.push(t1);
  if (!isNullish(leaf['level2']) && isNullish(leaf['level3'])) {
    out.push(leaf);
    return out;
  }

  const t2 = codes.find(
    (e) =>
      e['ChapterNo'] === cn &&
      String(e['level1']) === String(leaf['level1']) &&
      !isNullish(e['level2']) &&
      isNullish(e['level3']) &&
      String(e['level2']) === String(leaf['level2'])
  );
  if (t2) out.push(t2);
  if (!isNullish(leaf['level3']) && isNullish(leaf['level4'])) {
    out.push(leaf);
    return out;
  }

  const t3 = codes.find(
    (e) =>
      e['ChapterNo'] === cn &&
      String(e['level1']) === String(leaf['level1']) &&
      String(e['level2']) === String(leaf['level2']) &&
      !isNullish(e['level3']) &&
      isNullish(e['level4']) &&
      String(e['level3']) === String(leaf['level3'])
  );
  if (t3) out.push(t3);
  if (!isNullish(leaf['level4']) && isNullish(leaf['level5'])) {
    out.push(leaf);
    return out;
  }

  const t4 = codes.find(
    (e) =>
      e['ChapterNo'] === cn &&
      String(e['level1']) === String(leaf['level1']) &&
      String(e['level2']) === String(leaf['level2']) &&
      String(e['level3']) === String(leaf['level3']) &&
      !isNullish(e['level4']) &&
      isNullish(e['level5']) &&
      String(e['level4']) === String(leaf['level4'])
  );
  if (t4) out.push(t4);
  out.push(leaf);
  return out;
}

const STEP_LABELS = ['Chapter', 'Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5'];

const MAX_GLOBAL_RESULTS = 30;

/**
 * Rank + filter for global quick-jump search.
 * Matches against Code, block and Title (case-insensitive contains).
 * Code prefix > code contains > title starts > title contains.
 */
function runGlobalSearch(query, codes) {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const scored = [];
  for (const item of codes) {
    const code = String(item['Code'] ?? '').toLowerCase();
    const block = String(item['block'] ?? '').toLowerCase();
    const title = String(item['Title'] ?? '').toLowerCase();
    let score = 0;
    if (code && code.startsWith(q)) score = 100;
    else if (code && code.includes(q)) score = 80;
    else if (block && block.startsWith(q)) score = 70;
    else if (block && block.includes(q)) score = 60;
    else if (title.startsWith(q)) score = 50;
    else if (title.includes(q)) score = 30;
    if (score > 0) {
      // Prefer rows that have a selectable Code
      if (item['Code']) score += 5;
      scored.push({ item, score });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, MAX_GLOBAL_RESULTS).map((s) => s.item);
}

export const ICD11CodeSelector = ({ value, onChange, error }) => {
  const [selectedPath, setSelectedPath] = useState([]);
  const [selectedCode, setSelectedCode] = useState(value || '');
  const [globalQuery, setGlobalQuery] = useState('');
  const [globalOpen, setGlobalOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const globalBoxRef = useRef(null);

  const syncFromValue = useCallback((v) => {
    if (!v) {
      setSelectedPath([]);
      setSelectedCode('');
      return;
    }
    const leaf = icd11Codes.find((e) => e['Code'] === v);
    if (leaf) {
      setSelectedPath(ancestorsForLeaf(leaf, icd11Codes));
      setSelectedCode(v);
    } else {
      setSelectedCode(v);
      setSelectedPath([]);
    }
  }, []);

  useEffect(() => {
    syncFromValue(value || '');
  }, [value, syncFromValue]);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (globalBoxRef.current && !globalBoxRef.current.contains(e.target)) {
        setGlobalOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const globalResults = useMemo(
    () => runGlobalSearch(globalQuery, icd11Codes),
    [globalQuery]
  );

  useEffect(() => {
    setHighlight(0);
  }, [globalQuery]);

  const pickLeaf = useCallback(
    (leaf) => {
      if (!leaf) return;
      const path = ancestorsForLeaf(leaf, icd11Codes);
      setSelectedPath(path);
      const deepest = deepestCodeFromPath(path);
      setSelectedCode(deepest);
      onChange({ target: { name: 'icd_code', value: deepest } });
      setGlobalQuery('');
      setGlobalOpen(false);
    },
    [onChange]
  );

  const handleLevelChange = (levelIndex, selectedItem) => {
    const newPath = selectedPath.slice(0, levelIndex);
    if (selectedItem) {
      newPath[levelIndex] = selectedItem;
    }
    setSelectedPath(newPath);
    const deepest = deepestCodeFromPath(newPath);
    setSelectedCode(deepest);
    onChange({ target: { name: 'icd_code', value: deepest } });
  };

  const renderDropdown = (levelIndex) => {
    const children = getIcdOptions(levelIndex, selectedPath, icd11Codes)
      .slice()
      .sort((a, b) =>
        icdItemLabel(a).localeCompare(icdItemLabel(b), undefined, { sensitivity: 'base' })
      );
    if (levelIndex > 0 && children.length === 0) return null;
    if (levelIndex > 0 && !selectedPath[levelIndex - 1]) return null;

    const selectedItem = selectedPath[levelIndex];
    const labelText = STEP_LABELS[levelIndex] ?? `Level ${levelIndex}`;

    return (
      <div key={levelIndex} className="flex-shrink-0 min-w-[220px]">
        <label className="block text-sm font-medium text-gray-700 mb-1">{labelText}</label>
        <Select
          searchable
          value={selectedItem ? icdRowKey(selectedItem) : ''}
          placeholder={`Select ${labelText}`}
          onChange={(e) => {
            const key = e.target.value;
            const item = key ? children.find((c) => icdRowKey(c) === key) ?? null : null;
            handleLevelChange(levelIndex, item);
          }}
          options={[
            ...children.map((item) => ({
              value: icdRowKey(item),
              label: icdItemLabel(item)
            }))
          ]}
          error={levelIndex === 0 && error}
        />
      </div>
    );
  };

  const maxStep = 5;
  const stepsToRender = [];
  for (let d = 0; d <= maxStep; d++) {
    if (d === 0) {
      stepsToRender.push(d);
      continue;
    }
    if (!selectedPath[d - 1]) break;
    const opts = getIcdOptions(d, selectedPath, icd11Codes);
    if (opts.length === 0) break;
    stepsToRender.push(d);
  }

  const handleGlobalKeyDown = (e) => {
    if (!globalOpen || globalResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, globalResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      pickLeaf(globalResults[highlight]);
    } else if (e.key === 'Escape') {
      setGlobalOpen(false);
    }
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">ICD Code</label>

      {/* Global quick-jump search */}
      <div className="relative" ref={globalBoxRef}>
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={globalQuery}
          onChange={(e) => {
            setGlobalQuery(e.target.value);
            setGlobalOpen(true);
          }}
          onFocus={() => {
            if (globalQuery.trim().length >= 2) setGlobalOpen(true);
          }}
          onKeyDown={handleGlobalKeyDown}
          placeholder="Quick search by ICD code or diagnosis name (e.g. 6A02, autism)"
          className="w-full pl-9 pr-9 py-2 text-sm border border-gray-300 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
        />
        {globalQuery && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setGlobalQuery('');
              setGlobalOpen(false);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
          >
            <FiX className="h-4 w-4" />
          </button>
        )}

        {globalOpen && globalQuery.trim().length >= 2 && (
          <div
            className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden"
            style={{ maxHeight: 320 }}
          >
            <div className="overflow-y-auto" style={{ maxHeight: 320 }}>
              {globalResults.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-500">No matches</div>
              ) : (
                globalResults.map((item, idx) => {
                  const code = item['Code'];
                  const block = item['block'];
                  const title = item['Title'];
                  const tag = code || block || '';
                  const active = idx === highlight;
                  return (
                    <button
                      key={`${icdRowKey(item)}-${idx}`}
                      type="button"
                      onMouseEnter={() => setHighlight(idx)}
                      onClick={() => pickLeaf(item)}
                      className={`w-full text-left px-4 py-2 text-sm flex items-start gap-3 border-b border-gray-100 last:border-b-0 ${
                        active ? 'bg-primary-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      {tag ? (
                        <span
                          className={`font-mono text-xs px-2 py-0.5 rounded ${
                            code
                              ? 'bg-primary-100 text-primary-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {tag}
                        </span>
                      ) : (
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                          Ch {item['ChapterNo']}
                        </span>
                      )}
                      <span className="flex-1 text-gray-800">{title}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Cascading dropdowns (each searchable) */}
      <div className="flex flex-wrap items-end gap-4">
        {stepsToRender.map((d) => renderDropdown(d))}
      </div>

      {selectedCode ? (
        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            <strong>Selected ICD-11 Code:</strong>{' '}
            <span className="font-mono font-semibold">{selectedCode}</span>
            {selectedPath[selectedPath.length - 1] && (
              <span className="ml-2 text-blue-600">
                — {selectedPath[selectedPath.length - 1]['Title']}
              </span>
            )}
          </p>
        </div>
      ) : null}
    </div>
  );
};
