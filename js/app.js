// Point d'entrée : routage par hash (compatible GitHub Pages), rendu des vues.

import { CATEGORIES } from './config.js';
import { loadAll } from './store.js';
import { destroyCharts } from './charts.js';
import { sidebarHTML } from './views/sidebar.js';
import { overviewView, placeholderView, notFoundView } from './views/overview.js';
import { p2pView } from './views/p2p.js';
import { platformView } from './views/platform.js';

const main = document.getElementById('main');
const sidebar = document.getElementById('sidebar');
let dropHandler = null;

function currentView(parts) {
  const [a, b] = parts;
  if (!a) return overviewView();
  if (a === 'p2p') return b ? platformView(b) || notFoundView() : p2pView();
  if (CATEGORIES.some((c) => c.id === a)) return placeholderView(a);
  return notFoundView();
}

function render({ keepScroll = false } = {}) {
  destroyCharts();
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const path = '/' + parts.join('/');

  const view = currentView(parts);
  main.innerHTML = view.html;
  sidebar.innerHTML = sidebarHTML(path);
  dropHandler = view.onDrop || null;
  view.mount?.(main);

  document.title = `${view.title} – Suivi des investissements`;
  document.body.classList.remove('nav-open');
  if (!keepScroll) {
    window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
  }
}

window.addEventListener('hashchange', () => render());
document.addEventListener('data-changed', () => render({ keepScroll: true }));

// Évite que le navigateur ouvre un fichier lâché à côté de la zone prévue.
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => {
  e.preventDefault();
  const file = e.dataTransfer?.files?.[0];
  if (file && dropHandler) dropHandler(file);
});

document.getElementById('menu-toggle').addEventListener('click', () => document.body.classList.toggle('nav-open'));
document.getElementById('scrim').addEventListener('click', () => document.body.classList.remove('nav-open'));

loadAll().finally(() => render());
