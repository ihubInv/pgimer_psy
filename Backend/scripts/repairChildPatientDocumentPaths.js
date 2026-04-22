#!/usr/bin/env node
/**
 * One-time repair: rewrite stored URLs from .../Child_Patient_Registration/child_<ts>/...
 * to .../Child_Patient_Registration/<numeric_id>/... when the upload folder was renamed
 * but the database was not updated (pre-fix deployments).
 *
 * Usage (from Backend directory):
 *   node scripts/repairChildPatientDocumentPaths.js           # dry-run, print only
 *   node scripts/repairChildPatientDocumentPaths.js --apply # write updates
 *
 * Before --apply, confirm on disk that files live under fileupload/.../Child_Patient_Registration/<id>/
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const db = require('../config/database');
const ChildPatientRegistration = require('../models/ChildPatientRegistration');
const uploadConfig = require('../config/uploadConfig');

function rewriteChildFolderInUrl(url, numericId) {
  if (!url || typeof url !== 'string') return url;
  return url.replace(
    /\/Child_Patient_Registration\/child_[0-9]+\//g,
    `/Child_Patient_Registration/${numericId}/`
  );
}

function numericFolderHasAnyFile(absBaseDir, roleFolder, numericId) {
  const dir = path.join(absBaseDir, roleFolder, 'Child_Patient_Registration', String(numericId));
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return false;
  const names = fs.readdirSync(dir);
  return names.some((n) => {
    const p = path.join(dir, n);
    return fs.statSync(p).isFile();
  });
}

async function main() {
  const apply = process.argv.includes('--apply');
  const absBase = uploadConfig.getAbsolutePath(uploadConfig.PATIENT_FILES_PATH);

  const { rows } = await db.query(
    `SELECT id, documents, photo_path
     FROM child_patient_registrations
     WHERE (photo_path IS NOT NULL AND photo_path LIKE '%Child_Patient_Registration/child_%')
        OR (documents IS NOT NULL AND documents::text LIKE '%Child_Patient_Registration/child_%')`
  );

  console.log(`Found ${rows.length} row(s) with legacy child_* path in documents/photo_path.`);

  for (const row of rows) {
    const id = row.id;
    let docs = row.documents;
    if (typeof docs === 'string') {
      try {
        docs = JSON.parse(docs);
      } catch {
        docs = [];
      }
    }
    if (!Array.isArray(docs)) docs = [];

    const newDocs = docs.map((u) => rewriteChildFolderInUrl(u, id));
    const newPhoto = row.photo_path ? rewriteChildFolderInUrl(row.photo_path, id) : null;

    const changed =
      JSON.stringify(docs) !== JSON.stringify(newDocs) ||
      (row.photo_path || null) !== (newPhoto || null);

    if (!changed) continue;

    const samplePath = newPhoto || newDocs[0] || '';
    const m = samplePath.match(/\/fileupload\/([^/]+)\//);
    const roleFolder = m ? m[1] : 'psychiatric_welfare_officer';
    const diskOk = numericFolderHasAnyFile(absBaseDir, roleFolder, id);

    console.log(`\n[id=${id}] disk numeric folder has files: ${diskOk}`);
    console.log('  photo_path:', row.photo_path, '->', newPhoto);
    console.log('  documents count:', docs.length, '-> rewritten');

    if (apply && diskOk) {
      await ChildPatientRegistration.updateDocumentsAndPhoto(id, newDocs, newPhoto);
      console.log('  APPLIED update.');
    } else if (apply && !diskOk) {
      console.log('  SKIP apply (numeric folder missing or empty — check role path or rename).');
    }
  }

  if (!apply) {
    console.log('\nDry-run only. Re-run with --apply after verifying disk layout.');
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
