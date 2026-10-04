import { TIME_SLOTS } from './constants.js';
import { parseTimestamp, parseYouTubeId } from './utils.js';

/** Pure logic that turns form values into data entries. DOM-free so it can be tested in Node. */

const RAGA_FIELDS = ['thaat', 'slot', 'time', 'rasa', 'aroha', 'avaroha', 'vadi', 'samvadi', 'description'];
const RECORDING_FIELDS = ['artist', 'instrument', 'youtube', 'notes'];
const BANDISH_FIELDS = ['title', 'start', 'taal', 'laya', 'composer', 'lyrics', 'lyrics_roman', 'lyrics_translation', 'notes'];

/** Lowercase, hyphen-separated id. Falls back to a short random id for non-Latin text. */
export function slugify(text, fallbackPrefix = 'item') {
  const slug = String(text ?? '').toLowerCase().normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug || `${fallbackPrefix}-${Math.random().toString(36).slice(2, 7)}`;
}

function uniqueId(base, existing) {
  const taken = new Set(existing.map((item) => item.id));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

/** Trims strings and drops empty fields so the JSON stays tidy. */
function clean(object) {
  return Object.fromEntries(
    Object.entries(object)
      .map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])
      .filter(([, value]) => value),
  );
}

const pick = (values, keys) => Object.fromEntries(keys.map((key) => [key, values[key]]));

/**
 * Builds a new raga entry from form values (uses `raga_name` for the name).
 * @returns {{raga: object|null, errors: string[]}}
 */
export function buildRaga(values, { ragas }) {
  const name = (values.raga_name || '').trim();
  if (!name) return { raga: null, errors: ['Enter a name for the new raga.'] };
  if (ragas.some((r) => r.name.toLowerCase() === name.toLowerCase())) {
    return { raga: null, errors: [`Raga ${name} already exists. Choose it from the list instead.`] };
  }
  const raga = clean({ id: uniqueId(slugify(name, 'raga'), ragas), name, ...pick(values, RAGA_FIELDS) });
  if (raga.slot && !TIME_SLOTS.includes(raga.slot)) return { raga: null, errors: ['Choose a valid time of day.'] };
  return { raga, errors: [] };
}

/**
 * @param {Record<string,string>} values Raw form values.
 * @param {{ragas: object[], recordings: object[]}} data Current site data.
 * @returns {{newRaga: object|null, recording: object|null, errors: string[]}}
 */
export function buildEntries(values, { ragas, recordings }) {
  const errors = [];
  let ragaId = values.raga;
  let newRaga = null;

  if (ragaId === '__new') {
    const result = buildRaga(values, { ragas });
    errors.push(...result.errors);
    newRaga = result.raga;
    if (newRaga) ragaId = newRaga.id;
  } else if (!ragas.some((r) => r.id === ragaId)) {
    errors.push('Choose a raga.');
  }

  const title = (values.title || '').trim();
  if (!title) errors.push('Enter a title for the recording.');

  const link = (values.youtube || '').trim();
  const videoId = parseYouTubeId(link);
  if (link && !videoId) errors.push('That does not look like a YouTube link.');
  const duplicate = videoId && recordings.find((r) => parseYouTubeId(r.youtube) === videoId);
  if (duplicate) errors.push(`This video is already in your collection as "${duplicate.title}".`);

  const bandishes = (values.bandishes || []).map((b) => clean(pick(b, BANDISH_FIELDS))).filter((b) => Object.keys(b).length);
  bandishes.forEach((b, i) => {
    if (b.start && Number.isNaN(parseTimestamp(b.start))) errors.push(`Bandish ${i + 1}: write the start time like 12:30.`);
  });

  if (errors.length) return { newRaga: null, recording: null, errors };

  const id = uniqueId(slugify(`${ragaId}-${title}`, 'rec'), recordings);
  const recording = clean({ id, raga: ragaId, title, ...pick(values, RECORDING_FIELDS) });
  if (bandishes.length) recording.bandishes = bandishes;
  return { newRaga, recording, errors };
}
