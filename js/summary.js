// Résumé (valeur, gain) de chaque catégorie. Retourne null tant qu'aucune donnée n'est importée.
// Pour brancher une nouvelle catégorie (PEA, crypto…), ajouter un cas ici.
import { allP2PTxs } from './store.js';
import { computeMetrics } from './metrics.js';

export function categorySummary(id) {
  if (id === 'p2p') {
    const txs = allP2PTxs();
    if (!txs.length) return null;
    const m = computeMetrics(txs);
    return { value: m.value, gain: m.gain, netDeposited: m.netDeposited, lastDate: m.lastDate };
  }
  return null;
}
