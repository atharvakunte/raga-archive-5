/**
 * Minimal GitHub Contents API client, used by the "Add recording" form to commit
 * changes to data/*.json straight from the browser. The token never leaves the device.
 */

const API = 'https://api.github.com';
const STORAGE_KEY = 'raga-sangrah-admin';

/** Guesses owner and repo when the site runs at https://<owner>.github.io/<repo>/. */
export function detectRepo() {
  const { hostname, pathname } = window.location;
  if (!hostname.endsWith('.github.io')) return { owner: '', repo: '' };
  return { owner: hostname.split('.')[0], repo: pathname.split('/')[1] || '' };
}

export function loadSettings() {
  const defaults = { ...detectRepo(), branch: 'main', token: '' };
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
  } catch {
    return defaults;
  }
}

export function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function clearToken() {
  saveSettings({ ...loadSettings(), token: '' });
}

export const editUrl = ({ owner, repo, branch }, path) =>
  `https://github.com/${owner}/${repo}/edit/${branch}/${path}`;

function explain(status, message) {
  if (status === 401) return 'GitHub rejected the token. It may be wrong or expired.';
  if (status === 403 || status === 404) {
    return 'GitHub could not access this file. Check the owner, repo and branch, and that the token has "Contents: Read and write" for this repo.';
  }
  if (status === 409 || status === 422) return 'The file changed while saving. Please try again.';
  return message || `GitHub returned an error (${status}).`;
}

async function request(url, token, options = {}) {
  const response = await fetch(url, {
    cache: 'no-store',
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...options.headers,
    },
  });
  if (!response.ok) {
    let detail = '';
    try { detail = (await response.json()).message; } catch { /* ignore */ }
    throw new Error(explain(response.status, detail));
  }
  return response.json();
}

const decode = (base64) => new TextDecoder().decode(Uint8Array.from(atob(base64.replace(/\n/g, '')), (c) => c.charCodeAt(0)));
const encode = (text) => btoa(String.fromCharCode(...new TextEncoder().encode(text)));

/**
 * Appends one item to a JSON array file in the repo and commits it.
 * Re-reads the file first so concurrent edits are not overwritten.
 */
export async function appendToJsonArray({ owner, repo, branch, token }, path, item, message) {
  const url = `${API}/repos/${owner}/${repo}/contents/${path}`;
  const file = await request(`${url}?ref=${encodeURIComponent(branch)}`, token);
  const items = JSON.parse(decode(file.content));
  if (items.some((existing) => existing.id === item.id)) {
    throw new Error(`An entry with id "${item.id}" already exists in ${path}.`);
  }
  items.push(item);
  return request(url, token, {
    method: 'PUT',
    body: JSON.stringify({
      message,
      branch,
      sha: file.sha,
      content: encode(`${JSON.stringify(items, null, 2)}\n`),
    }),
  });
}
