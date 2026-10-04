/**
 * Checks data/*.json for mistakes that would break the site.
 * Run with `npm run validate`. CI runs this on every push.
 */
import { readFile } from 'node:fs/promises';
import { DATA_PATHS, TIME_SLOTS } from '../assets/js/constants.js';
import { parseTimestamp, parseYouTubeId } from '../assets/js/utils.js';

const errors = [];
const fail = (message) => errors.push(message);

async function readJson(path) {
  try {
    const data = JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), 'utf8'));
    if (!Array.isArray(data)) fail(`${path}: must be a JSON array`);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    fail(`${path}: ${error.message}`);
    return [];
  }
}

function checkUniqueIds(items, label) {
  const seen = new Set();
  for (const item of items) {
    if (!item.id) fail(`${label}: entry without an "id" (${item.name || item.title || 'unknown'})`);
    else if (seen.has(item.id)) fail(`${label}: duplicate id "${item.id}"`);
    seen.add(item.id);
  }
}

const ragas = await readJson(DATA_PATHS.ragas);
const recordings = await readJson(DATA_PATHS.recordings);
checkUniqueIds(ragas, 'ragas');
checkUniqueIds(recordings, 'recordings');

const ragaIds = new Set(ragas.map((r) => r.id));
for (const raga of ragas) {
  if (!raga.name) fail(`ragas: "${raga.id}" is missing "name"`);
  if (raga.slot && !TIME_SLOTS.includes(raga.slot)) {
    fail(`ragas: "${raga.id}" has slot "${raga.slot}". Use one of: ${TIME_SLOTS.join(', ')}`);
  }
}
for (const rec of recordings) {
  if (!rec.title) fail(`recordings: "${rec.id}" is missing "title"`);
  if (!ragaIds.has(rec.raga)) fail(`recordings: "${rec.id}" refers to unknown raga "${rec.raga}"`);
  if (rec.bandishes !== undefined && !Array.isArray(rec.bandishes)) fail(`recordings: "${rec.id}" has "bandishes" that is not a list`);
  (Array.isArray(rec.bandishes) ? rec.bandishes : []).forEach((b, i) => {
    if (b.start && Number.isNaN(parseTimestamp(b.start))) fail(`recordings: "${rec.id}" bandish ${i + 1} has an invalid "start" time (use 12:30)`);
  });
  if (rec.youtube && !parseYouTubeId(rec.youtube)) fail(`recordings: "${rec.id}" has an invalid YouTube link`);
}

if (errors.length) {
  console.error(`Data check failed:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`Data OK: ${ragas.length} ragas, ${recordings.length} recordings.`);
