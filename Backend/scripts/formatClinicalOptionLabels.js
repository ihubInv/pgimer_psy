/**
 * One-time migration: format all clinical_options labels and remap stored proforma values.
 *
 * Usage: node scripts/formatClinicalOptionLabels.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');
const db = require('../config/database');
const {
  formatClinicalOptionLabel,
} = require('../utils/formatClinicalOptionLabel');
const { normalizeArrayField } = require('../utils/clinicalMultiSelectArray');

const CLINICAL_MULTISELECT_FIELDS = [
  'nature_of_information',
  'mood',
  'behaviour',
  'speech',
  'thought',
  'perception',
  'somatic',
  'bio_functions',
  'adjustment',
  'cognitive_function',
  'fits',
  'sexual_problem',
  'substance_use',
  'associated_medical_surgical',
  'mse_behaviour',
  'mse_affect',
  'mse_thought',
  'mse_perception',
  'mse_cognitive_function',
];

function serializeArrayField(original, items) {
  if (!items.length) {
    return original == null || original === '' ? original : '';
  }

  if (typeof original === 'string') {
    const trimmed = original.trim();
    if (!trimmed) return original;

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return JSON.stringify(items);
    } catch {
      // fall through
    }

    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const escaped = items.map((item) => `"${String(item).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`);
      return `{${escaped.join(',')}}`;
    }

    if (trimmed.includes(',')) return items.join(', ');
    return items.length === 1 ? items[0] : items.join(', ');
  }

  if (Array.isArray(original)) return items;
  return items.length === 1 ? items[0] : items.join(', ');
}

function remapStoredValue(stored, labelMap) {
  if (stored == null || stored === '') return stored;

  const items = normalizeArrayField(stored);
  if (!items.length) return stored;

  let changed = false;
  const remapped = items.map((item) => {
    const next = labelMap.get(item) ?? item;
    if (next !== item) changed = true;
    return next;
  });

  if (!changed) return stored;
  return serializeArrayField(stored, remapped);
}

function updateSeedJson(labelMap) {
  const seedPath = path.join(__dirname, '../database/clinical_options.json');
  if (!fs.existsSync(seedPath)) return { updated: 0 };

  const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  let updated = 0;

  for (const [group, labels] of Object.entries(seed)) {
    if (!Array.isArray(labels)) continue;
    seed[group] = labels.map((label) => {
      const next = labelMap.get(label) ?? formatClinicalOptionLabel(label);
      if (next !== label) updated += 1;
      return next;
    });
  }

  fs.writeFileSync(seedPath, `${JSON.stringify(seed, null, 2)}\n`, 'utf8');
  return { updated };
}

async function formatClinicalOptionsTable(client, labelMap) {
  const result = await client.query(
    'SELECT id, option_group, option_label FROM clinical_options ORDER BY id'
  );

  let updated = 0;
  let unchanged = 0;

  for (const row of result.rows) {
    const formatted = formatClinicalOptionLabel(row.option_label);
    if (formatted === row.option_label) {
      unchanged += 1;
      continue;
    }

    const conflict = await client.query(
      `SELECT id FROM clinical_options
       WHERE option_group = $1 AND LOWER(option_label) = LOWER($2) AND id <> $3
       LIMIT 1`,
      [row.option_group, formatted, row.id]
    );

    if (conflict.rows.length > 0) {
      console.warn(
        `  Skipping option #${row.id} (${row.option_group}): "${row.option_label}" -> "${formatted}" (target exists)`
      );
      labelMap.set(row.option_label, formatted);
      continue;
    }

    await client.query(
      `UPDATE clinical_options
       SET option_label = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [formatted, row.id]
    );
    labelMap.set(row.option_label, formatted);
    updated += 1;
    console.log(`  [${row.option_group}] "${row.option_label}" -> "${formatted}"`);
  }

  return { updated, unchanged, total: result.rows.length };
}

async function remapClinicalProformas(client, labelMap) {
  if (labelMap.size === 0) {
    return { rowsScanned: 0, rowsUpdated: 0, fieldsUpdated: 0 };
  }

  const result = await client.query('SELECT * FROM clinical_proforma');
  let rowsUpdated = 0;
  let fieldsUpdated = 0;

  for (const row of result.rows) {
    const updates = {};

    for (const field of CLINICAL_MULTISELECT_FIELDS) {
      const original = row[field];
      const remapped = remapStoredValue(original, labelMap);
      if (remapped !== original) {
        updates[field] = remapped;
        fieldsUpdated += 1;
      }
    }

    if (Object.keys(updates).length === 0) continue;

    const setClauses = Object.keys(updates).map((field, idx) => `${field} = $${idx + 2}`);
    const values = [row.id, ...Object.values(updates)];

    await client.query(
      `UPDATE clinical_proforma
       SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      values
    );

    rowsUpdated += 1;
    console.log(`  Proforma #${row.id}: updated ${Object.keys(updates).join(', ')}`);
  }

  return { rowsScanned: result.rows.length, rowsUpdated, fieldsUpdated };
}

async function main() {
  console.log('Formatting clinical option labels...\n');

  const connected = await db.testConnection();
  if (!connected) {
    console.error('Cannot connect to database.');
    process.exit(1);
  }

  const labelMap = new Map();
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    console.log('1) Updating clinical_options table');
    const optionsResult = await formatClinicalOptionsTable(client, labelMap);
    console.log(
      `   Done: ${optionsResult.updated} updated, ${optionsResult.unchanged} unchanged (${optionsResult.total} total)\n`
    );

    console.log('2) Remapping clinical_proforma stored checkbox values');
    const proformaResult = await remapClinicalProformas(client, labelMap);
    console.log(
      `   Done: ${proformaResult.rowsUpdated}/${proformaResult.rowsScanned} proformas, ${proformaResult.fieldsUpdated} fields\n`
    );

    await client.query('COMMIT');

    console.log('3) Updating clinical_options.json seed file');
    const seedResult = updateSeedJson(labelMap);
    console.log(`   Done: ${seedResult.updated} seed labels updated\n`);

    console.log('Migration completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await db.pool.end();
  }
}

main();
