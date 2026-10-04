/** Small, DOM-free helpers shared across views. */

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/**
 * Escapes text for safe insertion into HTML.
 * @param {unknown} value
 * @returns {string}
 */
export const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);

/**
 * Extracts an 11-character YouTube video id from a bare id or a common URL form.
 * @param {string} [value]
 * @returns {string} The id, or an empty string if none is found.
 */
export function parseYouTubeId(value) {
  if (!value) return '';
  const fromUrl = String(value).match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/);
  if (fromUrl) return fromUrl[1];
  return /^[\w-]{11}$/.test(value) ? value : '';
}

/**
 * Whether a recording is vocal. Recordings with no instrument are treated as vocal.
 * @param {{instrument?: string}} recording
 */
export const isVocal = (recording) => !recording.instrument || /vocal/i.test(recording.instrument);

/**
 * Builds a <dl> of label/value pairs, skipping empty values.
 * @param {Array<[string, string|undefined]>} pairs
 * @param {string} [style]
 * @returns {string} HTML, or an empty string if there is nothing to show.
 */
export function definitionList(pairs, style = '') {
  const items = pairs
    .filter(([, value]) => value)
    .map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`)
    .join('');
  return items ? `<dl class="facts" style="${style}">${items}</dl>` : '';
}

const BANDISH_FIELDS = ['title', 'start', 'taal', 'laya', 'composer', 'lyrics', 'lyrics_roman', 'lyrics_translation', 'notes'];

/**
 * Returns a recording's bandishes as an array. New entries store them in `bandishes`;
 * older entries with flat lyrics/taal/laya/composer fields become a single bandish.
 * Recording-level taal, laya and composer act as defaults for each bandish.
 * @param {object} recording
 * @returns {object[]}
 */
export function normalizeBandishes(recording) {
  const defaults = { taal: recording.taal, laya: recording.laya, composer: recording.composer };
  const list = Array.isArray(recording.bandishes)
    ? recording.bandishes
    : [{ lyrics: recording.lyrics, lyrics_roman: recording.lyrics_roman, lyrics_translation: recording.lyrics_translation }];
  return list.map((b) => ({ ...defaults, ...b })).filter((b) => BANDISH_FIELDS.some((key) => b[key]));
}

/** Distinct taals used in a recording, in order. */
export const recordingTaals = (recording) => [...new Set(normalizeBandishes(recording).map((b) => b.taal).filter(Boolean))];

/**
 * Converts "90", "12:30" or "1:05:30" to seconds.
 * @returns {number|null} Seconds, null if empty, NaN if the text is not a valid time.
 */
export function parseTimestamp(value) {
  if (value == null || String(value).trim() === '') return null;
  const parts = String(value).trim().split(':').map(Number);
  if (parts.length > 3 || parts.some((n) => !Number.isFinite(n) || n < 0)) return NaN;
  return parts.reduce((total, n) => total * 60 + n, 0);
}
