import { loadData } from './store.js';
import { renderHome } from './views/home.js';
import { renderAdd } from './views/add.js';
import { renderAddRaga } from './views/add-raga.js';
import { renderRaga } from './views/raga.js';
import { renderRecording } from './views/recording.js';

const root = document.getElementById('app');

/** Routes use the URL hash (#/raga/yaman) so they work on GitHub Pages without server config. */
const routes = {
  raga: renderRaga,
  rec: renderRecording,
  add: renderAdd,
  'add-raga': renderAddRaga,
};

function renderNotFound() {
  root.innerHTML = '<p>That page does not exist. <a href="#/">Back to all ragas</a></p>';
}

function route() {
  const [, kind, rawId] = (location.hash || '#/').slice(1).split('/');
  const render = routes[kind];
  window.scrollTo(0, 0);
  if (!render) return renderHome(root);
  if (!render(root, decodeURIComponent(rawId ?? ''))) renderNotFound();
}

async function start() {
  try {
    await loadData();
  } catch (error) {
    console.error(error);
    root.innerHTML = '<p>Could not load the data files. If you opened index.html directly, run <code>npm start</code> or deploy to GitHub Pages.</p>';
    return;
  }
  window.addEventListener('hashchange', route);
  route();
}

start();
