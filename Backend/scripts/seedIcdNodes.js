/**
 * Import WHO ICD-11 nodes from Frontend JSON into icd_nodes.
 * Usage: node scripts/seedIcdNodes.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');
const db = require('../config/database');

const JSON_PATH = path.join(__dirname, '../../Frontend/src/assets/ICD11_Codes.json');

function inferNodeType(item) {
  if (!item.Parent && (item.level1 == null || item.level1 === '')) return 'chapter';
  if (item.Code) return 'code';
  const depth = ['level1', 'level2', 'level3', 'level4', 'level5'].filter(
    (k) => item[k] != null && item[k] !== ''
  ).length;
  return depth <= 1 ? 'category' : 'subcategory';
}

async function seedIcdNodes({ force = false } = {}) {
  if (!fs.existsSync(JSON_PATH)) {
    throw new Error(`ICD JSON not found at ${JSON_PATH}`);
  }

  const items = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
  const uriToId = new Map();
  const indexToId = [];
  let inserted = 0;

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const existing = await client.query('SELECT COUNT(*)::int AS c FROM icd_nodes WHERE is_system = true');
    if (existing.rows[0].c > 0 && !force) {
      console.log(`System ICD nodes already present (${existing.rows[0].c}). Skipping import.`);
      await client.query('COMMIT');
      return { inserted: 0, skipped: items.length, alreadySeeded: true };
    }

    if (force && existing.rows[0].c > 0) {
      await client.query('DELETE FROM icd_nodes WHERE is_system = true');
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const foundationUri = item['Foundation URI'] || null;

      const nodeType = inferNodeType(item);
      const result = await client.query(
        `INSERT INTO icd_nodes (
          parent_id, node_type, title, code, block, chapter_no, foundation_uri,
          is_system, is_active, sort_order, created_at, updated_at
        ) VALUES (NULL, $1, $2, $3, $4, $5, $6, true, true, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id`,
        [
          nodeType,
          item.Title,
          item.Code || null,
          item.block || null,
          item.ChapterNo != null ? String(item.ChapterNo) : null,
          foundationUri,
        ]
      );
      const id = result.rows[0].id;
      indexToId[i] = id;
      if (foundationUri) uriToId.set(foundationUri, id);
      inserted += 1;
    }

    for (let i = 0; i < items.length; i++) {
      const parentUri = items[i].Parent;
      if (!parentUri) continue;
      const childId = indexToId[i];
      const parentId = uriToId.get(parentUri);
      if (!childId || !parentId) continue;
      await client.query('UPDATE icd_nodes SET parent_id = $1 WHERE id = $2', [parentId, childId]);
    }

    await client.query('COMMIT');
    console.log(`ICD seed complete: ${inserted} inserted`);
    return { inserted, skipped: 0, alreadySeeded: false };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  const force = process.argv.includes('--force');
  seedIcdNodes({ force })
    .then(() => db.pool.end())
    .catch((err) => {
      console.error(err);
      db.pool.end();
      process.exit(1);
    });
}

module.exports = seedIcdNodes;
