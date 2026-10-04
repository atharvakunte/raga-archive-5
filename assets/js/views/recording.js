import { getRagaById, getRecordingById } from '../store.js';
import { definitionList, escapeHtml as esc, isVocal, normalizeBandishes, parseTimestamp, parseYouTubeId } from '../utils.js';

const LYRIC_VIEWS = [
  ['Devanagari', 'lyrics'],
  ['Roman', 'lyrics_roman'],
  ['Translation', 'lyrics_translation'],
];

const embedUrl = (videoId, start = 0) =>
  `https://www.youtube-nocookie.com/embed/${videoId}${start ? `?start=${start}&autoplay=1` : ''}`;

const lyricViews = (bandish) => LYRIC_VIEWS.map(([label, key]) => [label, bandish[key]]).filter(([, text]) => text);

function playerHtml(rec, videoId) {
  if (!videoId) {
    return '<div class="noplayer">No video yet. Add a YouTube link in data/recordings.json for this recording.</div>';
  }
  return `<iframe src="${embedUrl(videoId)}" title="${esc(rec.title)}"
    allow="accelerometer; encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe>`;
}

function bandishCardHtml(bandish, index, { multiple, videoId, vocal }) {
  const views = lyricViews(bandish);
  if (!multiple && !views.length && !vocal) return '';

  const heading = multiple ? bandish.title || `Bandish ${index + 1}` : 'Bandish lyrics';
  const facts = multiple ? definitionList([['Taal', bandish.taal], ['Laya', bandish.laya], ['Composer', bandish.composer]]) : '';
  const seconds = parseTimestamp(bandish.start);
  const canSeek = multiple && videoId && seconds !== null && !Number.isNaN(seconds);
  const tabs = views.length > 1
    ? `<div class="tabs" role="group" aria-label="Lyrics view">${views
        .map(([label], i) => `<button type="button" aria-pressed="${i === 0}" data-view="${i}">${label}</button>`)
        .join('')}</div>`
    : '';
  const first = views[0];
  const body = first
    ? `<div class="lyrics${first[0] === 'Devanagari' ? '' : ' latin'}">${esc(first[1])}</div>`
    : '<p class="muted" style="margin:0">Lyrics not added yet.</p>';

  return `<section class="card bandish">
    <div class="bandish-head"><h2>${esc(heading)}</h2>
      ${canSeek ? `<button class="btn small" type="button" data-start="${seconds}">Play from ${esc(bandish.start)}</button>` : ''}</div>
    ${facts}${tabs}${body}
    ${bandish.notes ? `<p class="notes muted" style="margin-bottom:0">${esc(bandish.notes)}</p>` : ''}</section>`;
}

/** Wires up the Devanagari/Roman/Translation tabs inside each bandish card. */
function bindLyricTabs(root, viewsPerCard) {
  root.querySelectorAll('.bandish').forEach((card, index) => {
    const views = viewsPerCard[index];
    const lyricsEl = card.querySelector('.lyrics');
    const buttons = card.querySelectorAll('.tabs button');
    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        const [label, text] = views[Number(button.dataset.view)];
        lyricsEl.textContent = text;
        lyricsEl.classList.toggle('latin', label !== 'Devanagari');
        buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
      });
    });
  });
}

/** "Play from" buttons restart the embedded video at the bandish's start time. */
function bindSeekButtons(root, videoId) {
  const iframe = root.querySelector('.player iframe');
  root.querySelectorAll('[data-start]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!iframe) return;
      iframe.src = embedUrl(videoId, Number(button.dataset.start));
      iframe.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });
}

/** @returns {boolean} false if the recording does not exist. */
export function renderRecording(root, id) {
  const rec = getRecordingById(id);
  if (!rec) return false;
  const raga = getRagaById(rec.raga) ?? { name: rec.raga };
  const videoId = parseYouTubeId(rec.youtube);
  const bandishes = normalizeBandishes(rec);
  const multiple = bandishes.length > 1;
  const only = multiple ? {} : bandishes[0] ?? {};

  const facts = definitionList([
    ['Raga', raga.name], ['Artist', rec.artist], ['Vocal or instrument', rec.instrument],
    ['Taal', only.taal], ['Laya', only.laya], ['Composer', only.composer],
  ]);
  const ragaFacts = definitionList([
    ['Thaat', raga.thaat], ['Prahar and time', raga.time], ['Rasa', raga.rasa],
    ['Aroha', raga.aroha], ['Avaroha', raga.avaroha], ['Vadi', raga.vadi], ['Samvadi', raga.samvadi],
  ], 'margin-bottom:14px');

  const context = { multiple, videoId, vocal: isVocal(rec) };
  const cards = (bandishes.length ? bandishes : [{}]).map((b, i) => bandishCardHtml(b, i, context));
  const viewsPerCard = bandishes.map(lyricViews);

  root.innerHTML = `<div class="crumb"><a href="#/">All ragas</a> / <a href="#/raga/${esc(rec.raga)}">${esc(raga.name)}</a></div>
    <div class="watch">
      <div class="player">${playerHtml(rec, videoId)}</div>
      <div>
        <h1 style="font-size:1.9rem">${esc(rec.title)}</h1>
        ${facts}
        ${multiple ? `<p class="muted" style="margin:8px 0 0">${bandishes.length} bandishes in this recording</p>` : ''}
        ${videoId ? `<p style="margin:10px 0 0"><a class="btn" href="https://www.youtube.com/watch?v=${videoId}" target="_blank" rel="noopener">Watch on YouTube</a>
          <span class="muted" style="font-size:.9rem"> Use this if the video above does not play.</span></p>` : ''}
      </div>
      ${cards.join('')}
      ${rec.notes ? `<section class="card"><h2>Notes</h2><p class="notes" style="margin:0">${esc(rec.notes)}</p></section>` : ''}
      <section class="card"><h2>About Raga ${esc(raga.name)}</h2>
        ${ragaFacts}
        <p style="margin:0">${esc(raga.description || 'No description added yet.')}</p>
      </section>
    </div>`;

  bindLyricTabs(root, viewsPerCard);
  bindSeekButtons(root, videoId);
  return true;
}
