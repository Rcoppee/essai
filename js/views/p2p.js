// Récapitulatif de l'ensemble des plateformes P2P.

import { P2P_PLATFORMS } from '../config.js';
import { allP2PTxs, platformTxs } from '../store.js';
import { computeMetrics } from '../metrics.js';
import { fmtEur, fmtSigned, fmtPct, fmtDate, esc } from '../format.js';
import { heroHTML, figuresHTML, warningsHTML, chartsHTML, mountCharts } from './dashboard.js';

export function p2pView() {
  const txs = allP2PTxs();
  const hasData = txs.length > 0;
  const m = hasData ? computeMetrics(txs) : null;

  const rows = P2P_PLATFORMS.map((p) => {
    const t = platformTxs(p.id);
    return { platform: p, txs: t, m: t.length ? computeMetrics(t) : null };
  });

  const table = `
  <section class="panel table-panel" aria-labelledby="by-platform">
    <div class="table-head"><h2 id="by-platform">Par plateforme</h2></div>
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th scope="col">Plateforme</th><th scope="col" class="num">Valeur estimée</th>
            <th scope="col" class="num">Capital versé net</th><th scope="col" class="num">Gain net</th>
            <th scope="col" class="num">Rendement annualisé</th><th scope="col" class="num">Cash</th>
            <th scope="col" class="num">En retard</th><th scope="col">Données au</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(({ platform, m: pm }) =>
              pm
                ? `<tr>
                    <th scope="row"><a href="#/p2p/${platform.id}">${esc(platform.name)}</a></th>
                    <td class="num strong">${fmtEur(pm.value)}</td>
                    <td class="num">${fmtEur(pm.netDeposited)}</td>
                    <td class="num ${pm.gain < 0 ? 'neg-text' : ''}">${fmtSigned(pm.gain)}</td>
                    <td class="num">${pm.xirr == null ? '—' : fmtPct(pm.xirr)}</td>
                    <td class="num">${fmtEur(pm.cash)}</td>
                    <td class="num">${fmtEur(pm.lateOutstanding)}</td>
                    <td>${fmtDate(pm.lastDate)}</td>
                  </tr>`
                : `<tr>
                    <th scope="row"><a href="#/p2p/${platform.id}">${esc(platform.name)}</a></th>
                    <td colspan="7" class="muted">Aucune donnée : importez un fichier depuis la page de la plateforme.</td>
                  </tr>`
            )
            .join('')}
        </tbody>
      </table>
    </div>
  </section>`;

  const html = hasData
    ? `
    <header class="page-head">
      <div>
        <h1>P2P</h1>
        <p class="page-meta"><span>${rows.filter((r) => r.m).length} plateforme(s) avec des données</span><span>${m.count} transactions</span></p>
      </div>
    </header>
    ${warningsHTML(m.warnings)}
    ${heroHTML(m)}
    ${figuresHTML(m)}
    ${table}
    ${chartsHTML()}`
    : `
    <header class="page-head"><div><h1>P2P</h1></div></header>
    <section class="empty">
      <h2>Aucune donnée P2P</h2>
      <p>Ouvrez la page d’une plateforme dans la barre latérale pour importer son fichier de transactions.</p>
    </section>`;

  return {
    title: 'P2P',
    html,
    mount(root) {
      if (!hasData) return;
      const groups = rows.filter((r) => r.txs.length).map((r) => ({ label: r.platform.name, txs: r.txs }));
      mountCharts(root, groups, m.loans);
    },
  };
}
