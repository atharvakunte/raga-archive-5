import { DATA_PATHS } from './constants.js';

/** In-memory copy of the site data, filled by loadData(). */
const state = { ragas: [], recordings: [] };

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Could not load ${path} (${response.status})`);
  return response.json();
}

/** Loads ragas and recordings in parallel. Call once at startup. */
export async function loadData() {
  const [ragas, recordings] = await Promise.all([
    fetchJson(DATA_PATHS.ragas),
    fetchJson(DATA_PATHS.recordings),
  ]);
  state.ragas = ragas;
  state.recordings = recordings;
}

export const getRagas = () => state.ragas;
export const getRecordings = () => state.recordings;
export const getRagaById = (id) => state.ragas.find((r) => r.id === id);
export const getRecordingById = (id) => state.recordings.find((r) => r.id === id);
export const getRecordingsByRaga = (ragaId) => state.recordings.filter((r) => r.raga === ragaId);

/** Adds entries to the in-memory data so a just-saved item shows up before GitHub Pages redeploys. */
export const addRagaLocally = (raga) => state.ragas.push(raga);
export const addRecordingLocally = (recording) => state.recordings.push(recording);
