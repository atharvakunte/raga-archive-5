import { DATA_PATHS, TIME_SLOTS } from '../constants.js';
import { buildRaga } from '../entry-builder.js';
import { appendToJsonArray, editUrl, saveSettings } from '../github.js';
import { addRagaLocally, getRagas } from '../store.js';
import { escapeHtml as esc } from '../utils.js';
import { bindSettings, datalist, errorsHtml, input, select, settingsHtml, textarea, THAATS } from './form-kit.js';

function formHtml() {
  return `<form id="raga-form" novalidate>
    <fieldset><legend>Raga</legend><div class="form-grid">
      ${input('Raga name', 'raga_name', { required: true, wide: true })}
      ${input('Thaat', 'thaat', { list: 'thaat-list' })}
      ${select('Time of day', 'slot', TIME_SLOTS, { placeholder: 'Choose' })}
      ${input('Prahar and time', 'time', { wide: true, hint: 'For example: Pratham prahar of ratri, 6 to 9 pm' })}
      ${input('Rasa', 'rasa', { wide: true })}
      ${input('Vadi', 'vadi')}
      ${input('Samvadi', 'samvadi')}
      ${input('Aroha', 'aroha', { wide: true })}
      ${input('Avaroha', 'avaroha', { wide: true })}
      ${textarea('About the raga', 'description', { rows: 5 })}
    </div></fieldset>
    <p><button class="btn" type="submit" id="save-btn">Save to GitHub</button>
       <button class="btn ghost-dark" type="button" id="copy-btn">Copy JSON instead</button></p>
    <div id="status" role="status" aria-live="polite"></div>
    <pre class="preview" id="preview" hidden></pre>
  </form>`;
}

export function renderAddRaga(root) {
  root.innerHTML = `<div class="crumb"><a href="#/">All ragas</a></div>
    <h1>Add a raga</h1>
    <p class="muted">Saved entries are committed to your GitHub repository. The live site updates a minute or two later.</p>
    ${settingsHtml()}${formHtml()}${datalist('thaat-list', THAATS)}`;

  const $ = (selector) => root.querySelector(selector);
  const form = $('#raga-form');
  const status = $('#status');
  const preview = $('#preview');
  const showStatus = (html, kind) => { status.className = `status ${kind}`; status.innerHTML = html; };
  const { readSettings } = bindSettings(root, showStatus);
  const build = () => buildRaga(Object.fromEntries(new FormData(form)), { ragas: getRagas() });

  $('#copy-btn').addEventListener('click', async () => {
    const { raga, errors } = build();
    if (errors.length) return showStatus(errorsHtml(errors), 'err');
    const text = `Add to ${DATA_PATHS.ragas}:\n${JSON.stringify(raga, null, 2)}`;
    preview.textContent = text;
    preview.hidden = false;
    const s = readSettings();
    const link = s.owner && s.repo ? ` <a href="${editUrl(s, DATA_PATHS.ragas)}" target="_blank" rel="noopener">Open ragas.json on GitHub</a>.` : '';
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
    const { raga, errors } = build();
    if (errors.length) return showStatus(errorsHtml(errors), 'err');

    const settings = readSettings();
    if (!settings.token || !settings.owner || !settings.repo) {
      $('#settings').open = true;
      return showStatus(errorsHtml(['Add your GitHub username, repository and token in the settings above, or use "Copy JSON instead".']), 'err');
    }
    saveSettings(settings);

    const button = $('#save-btn');
    button.disabled = true;
    showStatus('Saving to GitHub…', 'ok');
    try {
      await appendToJsonArray(settings, DATA_PATHS.ragas, raga, `Add raga ${raga.name}`);
      addRagaLocally(raga);
      form.reset();
      showStatus(`Saved <b>${esc(raga.name)}</b>. <a href="#/raga/${esc(raga.id)}">Open it</a>. It appears on the live site in a minute or two.`, 'ok');
    } catch (error) {
      showStatus(esc(error.message), 'err');
    } finally {
      button.disabled = false;
    }
  });
  return true;
}
