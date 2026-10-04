import { DATA_PATHS, TIME_SLOTS } from '../constants.js';
import { buildEntries } from '../entry-builder.js';
import { appendToJsonArray, editUrl, saveSettings } from '../github.js';
import { addRagaLocally, addRecordingLocally, getRagas, getRecordings } from '../store.js';
import { escapeHtml as esc } from '../utils.js';
import { bindSettings, datalist, errorsHtml, input, select, settingsHtml, textarea, THAATS } from './form-kit.js';

const INSTRUMENTS = ['Vocal', 'Sitar', 'Sarod', 'Bansuri', 'Santoor', 'Violin', 'Shehnai', 'Sarangi', 'Veena', 'Harmonium'];
const TAALS = ['Teentaal', 'Ektaal', 'Jhaptaal', 'Rupak', 'Dadra', 'Keherwa', 'Jhoomra', 'Tilwada', 'Deepchandi'];
const LAYAS = ['Vilambit laya', 'Madhya laya', 'Drut laya'];

function ragaOptionsHtml() {
  const ragas = [...getRagas()].sort((a, b) => a.name.localeCompare(b.name));
  return `<option value="">Choose a raga</option>${ragas.map((r) => `<option value="${esc(r.id)}">${esc(r.name)}</option>`).join('')}
    <option value="__new">Add a new raga…</option>`;
}

let blockSeq = 0;

function bandishBlockHtml() {
  const n = ++blockSeq;
  const name = (key) => `b${n}_${key}`;
  return `<fieldset class="bandish-block"><legend>Bandish</legend>
    <div class="form-grid">
      ${input('Title or opening words', name('title'), { key: 'title', wide: true, hint: 'For example: Vilambit bandish' })}
      ${input('Starts at', name('start'), { key: 'start', placeholder: '12:30', hint: 'Time in the video. Optional.' })}
      ${input('Composer', name('composer'), { key: 'composer' })}
      ${input('Taal', name('taal'), { key: 'taal', list: 'taal-list' })}
      ${input('Laya', name('laya'), { key: 'laya', list: 'laya-list' })}
      ${textarea('Lyrics in Devanagari', name('lyrics'), { key: 'lyrics', lang: 'hi', hint: 'One line per line of the bandish.' })}
      ${textarea('Roman transliteration', name('lyrics_roman'), { key: 'lyrics_roman', rows: 4 })}
      ${textarea('Translation', name('lyrics_translation'), { key: 'lyrics_translation', rows: 4 })}
    </div>
    <p style="margin:12px 0 0"><button class="btn ghost-dark small" type="button" data-remove>Remove this bandish</button></p>
  </fieldset>`;
}

function formHtml() {
  return `<form id="add-form" novalidate>
    <fieldset><legend>Raga</legend><div class="form-grid">
      <div class="field wide"><label for="f-raga">Raga *</label><select id="f-raga" name="raga" required>${ragaOptionsHtml()}</select></div>
      <div id="new-raga" class="form-grid wide-block" hidden>
        ${input('Raga name', 'raga_name')}
        ${input('Thaat', 'thaat', { list: 'thaat-list' })}
        ${select('Time of day', 'slot', TIME_SLOTS, { placeholder: 'Choose' })}
        ${input('Prahar and time', 'time', { hint: 'For example: Pratham prahar of ratri, 6 to 9 pm' })}
        ${input('Rasa', 'rasa')}
        ${input('Vadi', 'vadi')}
        ${input('Samvadi', 'samvadi')}
        ${input('Aroha', 'aroha', { wide: true })}
        ${input('Avaroha', 'avaroha', { wide: true })}
        ${textarea('About the raga', 'description', { rows: 4 })}
      </div></div></fieldset>
    <fieldset><legend>Recording</legend><div class="form-grid">
      ${input('Title', 'title', { required: true, wide: true })}
      ${input('YouTube link', 'youtube', { wide: true, hint: 'Paste the video link. Leave empty to add it later.' })}
      ${input('Artist', 'artist', { list: 'artist-list' })}
      ${input('Vocal or instrument', 'instrument', { list: 'instrument-list', value: 'Vocal' })}
      ${textarea('Notes about the recording', 'notes', { rows: 3 })}
    </div></fieldset>
    <div id="bandish-list"></div>
    <p><button class="btn ghost-dark" type="button" id="add-bandish">Add another bandish</button></p>
    <p><button class="btn" type="submit" id="save-btn">Save to GitHub</button>
       <button class="btn ghost-dark" type="button" id="copy-btn">Copy JSON instead</button></p>
    <div id="status" role="status" aria-live="polite"></div>
    <pre class="preview" id="preview" hidden></pre>
  </form>`;
}

export function renderAdd(root) {
  const artists = [...new Set(getRecordings().map((r) => r.artist).filter(Boolean))];
  root.innerHTML = `<div class="crumb"><a href="#/">All ragas</a></div>
    <h1>Add a recording</h1>
    <p class="muted">Saved entries are committed to your GitHub repository. The live site updates a minute or two later.</p>
    ${settingsHtml()}
    ${formHtml()}
    ${datalist('artist-list', artists)}${datalist('instrument-list', INSTRUMENTS)}${datalist('taal-list', TAALS)}${datalist('laya-list', LAYAS)}${datalist('thaat-list', THAATS)}`;

  const $ = (selector) => root.querySelector(selector);
  const form = $('#add-form');
  const status = $('#status');
  const preview = $('#preview');

  const showStatus = (html, kind) => { status.className = `status ${kind}`; status.innerHTML = html; };
  const toggleNewRaga = () => { $('#new-raga').hidden = $('#f-raga').value !== '__new'; };
  const { readSettings } = bindSettings(root, showStatus);
  const list = $('#bandish-list');

  const refreshBlocks = () => {
    const blocks = list.querySelectorAll('.bandish-block');
    blocks.forEach((block, i) => {
      block.querySelector('legend').textContent = blocks.length > 1 ? `Bandish ${i + 1}` : 'Bandish';
      block.querySelector('[data-remove]').hidden = blocks.length === 1;
    });
  };
  const addBlock = () => { list.insertAdjacentHTML('beforeend', bandishBlockHtml()); refreshBlocks(); };
  const resetBlocks = () => { list.innerHTML = ''; addBlock(); };
  const collectBandishes = () => [...list.querySelectorAll('.bandish-block')].map((block) =>
    Object.fromEntries([...block.querySelectorAll('[data-key]')].map((el) => [el.dataset.key, el.value])));
  const build = () => buildEntries(
    { ...Object.fromEntries(new FormData(form)), bandishes: collectBandishes() },
    { ragas: getRagas(), recordings: getRecordings() },
  );

  addBlock();
  $('#add-bandish').addEventListener('click', () => { addBlock(); list.lastElementChild.querySelector('input').focus(); });
  list.addEventListener('click', (event) => {
    const remove = event.target.closest('[data-remove]');
    if (remove) { remove.closest('.bandish-block').remove(); refreshBlocks(); }
  });
  const showErrors = (errors) => showStatus(errorsHtml(errors), 'err');

  $('#f-raga').addEventListener('change', toggleNewRaga);

  $('#copy-btn').addEventListener('click', async () => {
    const { newRaga, recording, errors } = build();
    if (errors.length) return showErrors(errors);
    const text = [
      newRaga && `Add to ${DATA_PATHS.ragas}:\n${JSON.stringify(newRaga, null, 2)}`,
      `Add to ${DATA_PATHS.recordings}:\n${JSON.stringify(recording, null, 2)}`,
    ].filter(Boolean).join('\n\n');
    preview.textContent = text;
    preview.hidden = false;
    const s = readSettings();
    const link = s.owner && s.repo ? ` <a href="${editUrl(s, DATA_PATHS.recordings)}" target="_blank" rel="noopener">Open recordings.json on GitHub</a>.` : '';
    try {
      await navigator.clipboard.writeText(text);
      showStatus(`Copied. Paste it into the array in the file (add a comma after the previous entry).${link}`, 'ok');
    } catch {
      showStatus(`Copy it from the box below.${link}`, 'ok');
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    preview.hidden = true;
    const { newRaga, recording, errors } = build();
    if (errors.length) return showErrors(errors);

    const settings = readSettings();
    if (!settings.token || !settings.owner || !settings.repo) {
      $('#settings').open = true;
      return showErrors(['Add your GitHub username, repository and token in the settings above, or use "Copy JSON instead".']);
    }
    saveSettings(settings);

    const button = $('#save-btn');
    button.disabled = true;
    showStatus('Saving to GitHub…', 'ok');
    let ragaSaved = false;
    try {
      if (newRaga) {
        await appendToJsonArray(settings, DATA_PATHS.ragas, newRaga, `Add raga ${newRaga.name}`);
        addRagaLocally(newRaga);
        ragaSaved = true;
      }
      await appendToJsonArray(settings, DATA_PATHS.recordings, recording, `Add recording: ${recording.title}`);
      addRecordingLocally(recording);
      const keep = form.elements.raga.value === '__new' ? recording.raga : form.elements.raga.value;
      $('#f-raga').innerHTML = ragaOptionsHtml();
      form.reset();
      resetBlocks();
      $('#f-raga').value = keep;
      toggleNewRaga();
      showStatus(`Saved <b>${esc(recording.title)}</b>. <a href="#/rec/${esc(recording.id)}">Open it</a>. It appears on the live site in a minute or two.`, 'ok');
    } catch (error) {
      if (ragaSaved) {
        $('#f-raga').innerHTML = ragaOptionsHtml();
        $('#f-raga').value = newRaga.id;
        toggleNewRaga();
      }
      showStatus(`${esc(error.message)}${ragaSaved ? ' The new raga was saved, so it is now selected. Try again.' : ''}`, 'err');
    } finally {
      button.disabled = false;
    }
  });
  return true;
}
