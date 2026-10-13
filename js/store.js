// Stockage des données.
//
// Pour chaque plateforme, un "jeu de données" a la forme :
//   { platform, importedAt, fileName, transactions: [...] }
//
// Ordre de lecture :
//   1. localStorage (import fait dans ce navigateur, prioritaire)
//   2. data/p2p/<plateforme>.json dans le dépôt
// Un nouvel import écrase toujours le jeu de données précédent de la plateforme.

import { P2P_PLATFORMS } from './config.js';

export const state = { p2p: {} };

const KEY = (id) => `invest.p2p.${id}`;

async function loadPlatform(id) {
  try {
    const raw = localStorage.getItem(KEY(id));
    if (raw) return { ...JSON.parse(raw), source: 'local' };
  } catch (e) {
    /* localStorage indisponible ou corrompu : on passe au dépôt */
  }
  try {
    const res = await fetch(`data/p2p/${id}.json`, { cache: 'no-cache' });
    if (res.ok) return { ...(await res.json()), source: 'repo' };
  } catch (e) {
    /* pas de fichier dans le dépôt (ou page ouverte en file://) */
  }
  return null;
}

export async function loadAll() {
  await Promise.all(
    P2P_PLATFORMS.map(async (p) => {
      state.p2p[p.id] = await loadPlatform(p.id);
    })
  );
}

/** Remplace les données d'une plateforme par un nouvel import (stocké dans le navigateur). */
export function saveImport(id, dataset) {
  localStorage.setItem(KEY(id), JSON.stringify(dataset)); // peut lever une exception (quota)
  state.p2p[id] = { ...dataset, source: 'local' };
}

/** Supprime l'import local et recharge les données du dépôt. */
export async function resetToRepo(id) {
  try {
    localStorage.removeItem(KEY(id));
  } catch (e) {
    /* ignoré */
  }
  state.p2p[id] = await loadPlatform(id);
}

export function platformTxs(id) {
  return (state.p2p[id]?.transactions || []).map((t) => ({ ...t, platform: id }));
}

export function allP2PTxs() {
  return P2P_PLATFORMS.flatMap((p) => platformTxs(p.id));
}

/** Télécharge le jeu de données au format JSON, à placer dans data/p2p/ du dépôt. */
export function downloadDataset(id) {
  const ds = state.p2p[id];
  if (!ds) return;
  const { source, ...clean } = ds;
  const blob = new Blob([JSON.stringify(clean, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${id}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
