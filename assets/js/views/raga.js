import { getRagaById, getRecordingsByRaga } from '../store.js';
import { escapeHtml as esc, parseYouTubeId, recordingTaals } from '../utils.js';

function recordingRowHtml(rec) {
  const videoId = parseYouTubeId(rec.youtube);
  const thumbStyle = videoId ? ` style="background-image:url(https://i.ytimg.com/vi/${videoId}/mqdefault.jpg)"` : '';
  const meta = [rec.artist, rec.instrument, recordingTaals(rec).join(' and ')].filter(Boolean).join(', ');
  return `<li><a href="#/rec/${esc(rec.id)}">
    <div class="thumb${videoId ? '' : ' empty'}"${thumbStyle}></div>
    <div><b>${esc(rec.title)}</b><br><span class="muted">${esc(meta)}</span></div></a></li>`;
}

/** @returns {boolean} false if the raga does not exist. */
export function renderRaga(root, id) {
  const raga = getRagaById(id);
  if (!raga) return false;
  const recordings = getRecordingsByRaga(id);
  const summary = [raga.thaat && `Thaat ${raga.thaat}`, raga.time, raga.rasa].filter(Boolean).join(', ');
  root.innerHTML = `<div class="crumb"><a href="#/">All ragas</a></div>
    <div class="page-head">
      <h1>Raga ${esc(raga.name)}</h1>
      <p class="muted">${esc(summary)}</p>
    </div>
    <h2 style="margin-top:28px">Recordings</h2>
    <ul class="rec-list">${
      recordings.map(recordingRowHtml).join('') ||
      '<li class="muted" style="padding:14px 0">No recordings added for this raga yet.</li>'
    }</ul>`;
  return true;
}
