import { clearToken, loadSettings, saveSettings } from '../github.js';
import { escapeHtml as esc } from '../utils.js';

/** Form building blocks and GitHub settings panel shared by the admin forms. */

export function input(label, name, { type = 'text', required = false, list = '', hint = '', wide = false, value = '', key = '', placeholder = '' } = {}) {
  return `<div class="field${wide ? ' wide' : ''}"><label for="f-${name}">${label}${required ? ' *' : ''}</label>
    <input id="f-${name}" name="${name}"${key ? ` data-key="${key}"` : ''}${placeholder ? ` placeholder="${esc(placeholder)}"` : ''} type="${type}" value="${esc(value)}"${required ? ' required' : ''}${list ? ` list="${list}"` : ''} autocomplete="off">
    ${hint ? `<span class="hint">${hint}</span>` : ''}</div>`;
}

export function textarea(label, name, { hint = '', lang = '', rows = 6, key = '' } = {}) {
  return `<div class="field wide"><label for="f-${name}">${label}</label>
    <textarea id="f-${name}" name="${name}"${key ? ` data-key="${key}"` : ''} rows="${rows}"${lang ? ` lang="${lang}"` : ''}></textarea>
    ${hint ? `<span class="hint">${hint}</span>` : ''}</div>`;
}

export function select(label, name, options, { placeholder = '', required = false, wide = false } = {}) {
  const opts = options.map((o) => `<option>${esc(o)}</option>`).join('');
  return `<div class="field${wide ? ' wide' : ''}"><label for="f-${name}">${label}${required ? ' *' : ''}</label>
    <select id="f-${name}" name="${name}"${required ? ' required' : ''}>${placeholder ? `<option value="">${placeholder}</option>` : ''}${opts}</select></div>`;
}

export const datalist = (id, values) => `<datalist id="${id}">${values.map((v) => `<option value="${esc(v)}">`).join('')}</datalist>`;

export const errorsHtml = (errors) => `<b>Please fix:</b><ul>${errors.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>`;

export const THAATS = ['Bilawal', 'Khamaj', 'Kafi', 'Asavari', 'Bhairavi', 'Bhairav', 'Kalyan', 'Marwa', 'Poorvi', 'Todi'];

export function settingsHtml() {
  const s = loadSettings();
  return `<details class="settings card" id="settings"${s.token ? '' : ' open'}>
    <summary><b>GitHub settings</b> <span class="muted">${s.token ? 'Token saved on this device' : 'Needed once to save from this page'}</span></summary>
    <p class="hint">Create a fine-grained token at GitHub > Settings > Developer settings > Personal access tokens. Limit it to this repository with <b>Contents: Read and write</b>. It is kept only in this browser. Use this page only on your own devices.</p>
    <div class="form-grid">
      ${input('GitHub username', 's-owner', { value: s.owner })}
      ${input('Repository name', 's-repo', { value: s.repo })}
      ${input('Branch', 's-branch', { value: s.branch })}
      ${input('Personal access token', 's-token', { type: 'password', value: s.token })}
    </div>
    <p><button class="btn" type="button" id="save-settings">Save settings</button>
       <button class="btn ghost-dark" type="button" id="forget-token">Forget token</button></p>
  </details>`;
}

/** Wires the settings panel. Returns a function that reads the current values. */
export function bindSettings(root, showStatus) {
  const $ = (selector) => root.querySelector(selector);
  const readSettings = () => ({
    owner: $('#f-s-owner').value.trim(), repo: $('#f-s-repo').value.trim(),
    branch: $('#f-s-branch').value.trim() || 'main', token: $('#f-s-token').value.trim(),
  });
  $('#save-settings').addEventListener('click', () => {
    saveSettings(readSettings());
    showStatus('Settings saved on this device.', 'ok');
  });
  $('#forget-token').addEventListener('click', () => {
    clearToken();
    $('#f-s-token').value = '';
    showStatus('Token removed from this device.', 'ok');
  });
  return { readSettings };
}
