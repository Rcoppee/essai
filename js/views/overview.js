// Vue d'ensemble et pages des catégories pas encore développées.

import { CATEGORIES } from '../config.js';
import { categorySummary } from '../summary.js';
import { fmtEur, fmtSigned, fmtPctSigned, fmtDate, esc } from '../format.js';
import { segBar } from './dashboard.js';

const SEG_CLASSES = ['seg-ok', 'seg-cash', 'seg-late', 'seg-c4', 'seg-c5', 'seg-c6'];

export function overviewView() {
  const rows = CATEGORIES.map((c) => ({ ...c, s: categorySummary(c.id) }));
  const filled = rows.filter((r) => r.s);
  const total = filled.reduce((s, r) => s + r.s.value, 0);
  const gain = filled.reduce((s, r) => s + r.s.gain, 0);
  const net = filled.reduce((s, r) => s + r.s.netDeposited, 0);

  const hero = filled.length
    ? `
    <section class="hero" aria-label="Valeur totale">
      <div class="hero-top">
        <div>
          <p class="hero-label">Valeur estimée de l’ensemble des placements renseignés</p>
          <p class="hero-value">${fmtEur(total)}</p>
        </div>
        <p class="hero-gain ${gain >= 0 ? 'pos' : 'neg'}">
          <span class="hero-gain-amt">${fmtSigned(gain)}</span>
          <span class="hero-gain-sub">${net > 0 ? `${fmtPctSigned(gain / net)} sur le capital versé` : ''}</span>
        </p>
      </div>
      ${segBar(filled.map((r, i) => ({ label: r.label, value: r.s.value, cls: SEG_CLASSES[i % SEG_CLASSES.length] })))}
      <p class="footnote">${filled.length} catégorie(s) sur ${rows.length} renseignée(s). Les autres s’ajouteront ici dès qu’elles seront importées.</p>
    </section>`
    : `
    <section class="empty">
      <h2>Aucun placement renseigné</h2>
      <p>Commencez par le P2P : ouvrez une plateforme dans la barre latérale et importez son fichier de transactions.</p>
    </section>`;

  const list = `
  <section class="panel table-panel" aria-labelledby="cat-title">
    <div class="table-head"><h2 id="cat-title">Par catégorie</h2></div>
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th scope="col">Catégorie</th><th scope="col" class="num">Valeur estimée</th>
            <th scope="col" class="num">Gain net</th><th scope="col">Données au</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map((r) =>
              r.s
                ? `<tr>
                    <th scope="row"><a href="#/${r.id}">${esc(r.label)}</a></th>
                    <td class="num strong">${fmtEur(r.s.value)}</td>
                    <td class="num ${r.s.gain < 0 ? 'neg-text' : ''}">${fmtSigned(r.s.gain)}</td>
                    <td>${fmtDate(r.s.lastDate)}</td>
                  </tr>`
                : `<tr>
                    <th scope="row"><a href="#/${r.id}">${esc(r.label)}</a></th>
                    <td colspan="3" class="muted">Pas encore renseigné</td>
                  </tr>`
            )
            .join('')}
        </tbody>
      </table>
    </div>
  </section>`;

  return {
    title: 'Vue d’ensemble',
    html: `<header class="page-head"><div><h1>Vue d’ensemble</h1></div></header>${hero}${list}`,
  };
}

export function placeholderView(id) {
  const cat = CATEGORIES.find((c) => c.id === id);
  return {
    title: cat.label,
    html: `
    <header class="page-head"><div><h1>${esc(cat.label)}</h1></div></header>
    <section class="empty">
      <h2>Cette section n’est pas encore développée</h2>
      <p>Le suivi du P2P est en place. ${esc(cat.label)} suivra le même principe : import du fichier source, page dédiée et intégration à la vue d’ensemble.</p>
    </section>`,
  };
}

export function notFoundView() {
  return {
    title: 'Page introuvable',
    html: `
    <header class="page-head"><div><h1>Page introuvable</h1></div></header>
    <section class="empty">
      <h2>Cette page n’existe pas</h2>
      <p><a href="#/">Retour à la vue d’ensemble</a></p>
    </section>`,
  };
}
