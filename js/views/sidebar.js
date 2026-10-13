// Barre latérale : une entrée par catégorie, les plateformes P2P en sous-entrées.

import { CATEGORIES, P2P_PLATFORMS } from '../config.js';
import { categorySummary } from '../summary.js';
import { fmtEurRound, esc } from '../format.js';

export function sidebarHTML(path) {
  const link = (href, label, extra = '') => {
    const active = path === href;
    return `<a class="nav-link${active ? ' active' : ''}" href="#${href}"${active ? ' aria-current="page"' : ''}>
      <span>${esc(label)}</span>${extra}
    </a>`;
  };

  const items = CATEGORIES.map((c) => {
    const s = categorySummary(c.id);
    const val = s ? `<span class="nav-val">${fmtEurRound(s.value)}</span>` : '';
    const sub =
      c.id === 'p2p'
        ? `<ul class="nav-sub">${P2P_PLATFORMS.map(
            (p) => `<li>${link(`/p2p/${p.id}`, p.name)}</li>`
          ).join('')}</ul>`
        : '';
    return `<li>${link(`/${c.id}`, c.label, val)}${sub}</li>`;
  }).join('');

  return `
    <div class="brand">Mes placements</div>
    <nav aria-label="Navigation principale">
      ${link('/', 'Vue d’ensemble')}
      <ul class="nav-list">${items}</ul>
    </nav>
    <p class="side-note">Les données importées restent dans ce navigateur et dans le dossier <code>data/</code> du dépôt.</p>`;
}
