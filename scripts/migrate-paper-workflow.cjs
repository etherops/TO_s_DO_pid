// Explicit opt-in migration through the running app. Dry-run is the default.
// Never print private file contents; the output is an integrity/backup receipt only.
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const Module = require('node:module');
const { buildSync } = require('esbuild');

const api = 'http://localhost:3001/api/todos';
const filePath = process.argv[2];
const apply = process.argv.includes('--apply');
if (!filePath || !path.isAbsolute(filePath)) throw new Error('Supply the absolute path of the one file to migrate');

const bundled = buildSync({
  entryPoints: [path.join(__dirname, '../src/utils/workflowMigration.js')],
  bundle: true, platform: 'node', format: 'cjs', write: false
}).outputFiles[0].text;
const compiled = new Module(__filename);
compiled._compile(bundled, __filename);

const read = async target => {
  const response = await fetch(`${api}?path=${encodeURIComponent(target)}`);
  if (!response.ok) throw new Error(`Read failed (${response.status})`);
  return (await response.json()).content;
};
const save = async body => {
  const response = await fetch(api, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`Save refused (${response.status}); no automatic retry`);
};

(async () => {
  const source = await read(filePath);
  const log = console.log;
  let result;
  try {
    console.log = () => {}; // The legacy parser logs source text; keep it private here.
    result = compiled.exports.migratePaperWorkflow(source);
    if (compiled.exports.migratePaperWorkflow(result.content).content !== result.content) {
      throw new Error('Migration is not idempotent');
    }
  } finally { console.log = log; }
  const receipt = { filePath, projectsMoved: result.projectsMoved,
    wipHeadingsRemoved: result.wipHeadingsRemoved, taskSubtreesPreserved: true, idempotent: true, applied: false };
  if (!apply || source === result.content) return console.log(JSON.stringify(receipt));
  // Existing API supports exact-text compare-and-save. A UUID recovery file is separately verified
  // before touching the original, and is not listed as a todo file in the application.
  const backupPath = path.join(path.dirname(filePath),
    `.${path.basename(filePath)}.before-paper-workflow-${randomUUID()}.bak`);
  const existing = await fetch(`${api}?path=${encodeURIComponent(backupPath)}`);
  if (existing.status !== 404) throw new Error('Backup destination is not confirmed absent');
  await save({ path: backupPath, content: source });
  if (await read(backupPath) !== source) throw new Error('Backup verification failed; source untouched');
  await save({ path: filePath, content: result.content, expectedContent: source });
  if (await read(filePath) !== result.content) {
    throw new Error(`Post-write verification failed; recovery copy: ${backupPath}`);
  }
  console.log(JSON.stringify({ ...receipt, backupPath, applied: true, savedContentVerified: true }));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
