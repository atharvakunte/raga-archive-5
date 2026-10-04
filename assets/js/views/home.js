import { TIME_SLOTS } from '../constants.js';
import { getRagas, getRecordings, getRecordingsByRaga, getRagaById } from '../store.js';
import { escapeHtml as esc, normalizeBandishes } from '../utils.js';

function featuredCardHtml() {
  const recordings = getRecordings();
  if (!recordings.length) return '';
  const rec = recordings[Math.floor(Math.random() * recordings.length)];
  const raga = getRagaById(rec.raga);
  const firstLine = (normalizeBandishes(rec).find((b) => b.lyrics)?.lyrics || '').split('\n')[0];
  return `<div class="feature">
    <div class="sub">Listen to this today</div>
    <h1>Raga ${esc(raga ? raga.name : rec.raga)}</h1>
    <div class="sub">${esc(rec.title)}${rec.artist ? ` by ${esc(rec.artist)}` : ''}</div>
    ${firstLine ? `<p class="deva">${esc(firstLine)}</p>` : ''}
    <div class="row">
      <a class="btn" href="#/rec/${esc(rec.id)}">Open recording</a>
      <button class="btn ghost" type="button" data-action="shuffle">Show another</button>
    </div>
  </div>`;
}

const optionsHtml = (placeholder, values) =>
  `<option value="">${placeholder}</option>${values.map((v) => `<option>${esc(v)}</option>`).join('')}`;

const uniqueSorted = (key) =>
  [...new Set(getRecordings().map((r) => r[key]).filter(Boolean))].sort();

/** Returns the ragas that match the current search and filter values. */
function filterRagas({ query, slot, artist, instrument }) {
  return getRagas()
    .filter((raga) => {
      if (query && !`${raga.name} ${raga.thaat || ''}`.toLowerCase().includes(query)) return false;
      if (slot && raga.slot !== slot) return false;
      if (artist || instrument) {
        return getRecordingsByRaga(raga.id).some(
          (rec) => (!artist || rec.artist === artist) && (!instrument || rec.instrument === instrument),
        );
      }
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function ragaCardHtml(raga) {
  const count = getRecordingsByRaga(raga.id).length;
  const where = [raga.slot, raga.thaat && `${raga.thaat} thaat`].filter(Boolean).join(', ');
  return `<a class="raga" href="#/raga/${esc(raga.id)}"><b>${esc(raga.name)}</b>
    <span>${esc(where)}</span><br><span>${count} recording${count === 1 ? '' : 's'}</span></a>`;
}

export function renderHome(root) {
  root.innerHTML = `${featuredCardHtml()}
    <div class="ornament" aria-hidden="true"></div>
    <h2>All ragas</h2>
    <div class="tools">
      <input type="search" id="filter-query" placeholder="Search raga or thaat" aria-label="Search ragas">
      <select id="filter-slot" aria-label="Time of day">${optionsHtml('Any time of day', TIME_SLOTS)}</select>
      <select id="filter-artist" aria-label="Artist">${optionsHtml('Any artist', uniqueSorted('artist'))}</select>
      <select id="filter-instrument" aria-label="Vocal or instrument">${optionsHtml('Vocal or instrument', uniqueSorted('instrument'))}</select>
    </div>
    <div class="grid" id="raga-grid"></div>`;

  const field = (id) => root.querySelector(`#${id}`);
  const grid = field('raga-grid');

  const draw = () => {
    const matches = filterRagas({
      query: field('filter-query').value.trim().toLowerCase(),
      slot: field('filter-slot').value,
      artist: field('filter-artist').value,
      instrument: field('filter-instrument').value,
    });
    grid.innerHTML = matches.length
      ? matches.map(ragaCardHtml).join('')
      : '<p class="muted">No raga matches these filters.</p>';
  };

  root.querySelector('.tools').addEventListener('input', draw);
  root.querySelector('[data-action="shuffle"]')?.addEventListener('click', () => renderHome(root));
  draw();
}
