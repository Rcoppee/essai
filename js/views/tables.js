// Tableaux de la page d'une plateforme.

import { fmtEur, fmtSigned, fmtDate, countryFr, esc, KIND_LABELS, STATUS_LABELS } from '../format.js';

const STATUS_ORDER = { late: 0, default: 1, other: 2, active: 3, finished: 4 };
const PILL = { active: 'ok', finished: 'muted', late: 'warn', default: 'bad', other: 'muted' };

/* ------------------------------------------------------------------ Prêts */

export function loansHTML(loans) {
  if (!loans.length) return '';
  const present = new Set(loans.map((l) => l.status || 'other'));
  const options = ['active', 'late', 'default', 'finished', 'other']
    .filter((s) => present.has(s))
    .map((s) => `<option value="${s}">${STATUS_LABELS[s]}</option>`)
    .join('');
  return `
  <section class="panel table-panel" aria-labelledby="loans-title">
    <div class="table-head">
      <h2 id="loans-title">Prêts</h2>
      <label class="field">
        <span>Statut</span>
        <select id="loans-filter"><option value="all">Tous (${loans.length})</option>${options}</select>
      </label>
    </div>
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th scope="col">Prêt</th><th scope="col">Pays</th><th scope="col">Statut</th>
            <th scope="col" class="num">Investi</th><th scope="col" class="num">Capital remboursé</th>
            <th scope="col" class="num">Intérêts</th><th scope="col" class="num">Capital en cours</th>
            <th scope="col">Dernier mouvement</th>
          </tr>
        </thead>
        <tbody id="loans-body"></tbody>
      </table>
    </div>
  </section>`;
}

export function mountLoans(root, loans) {
  const body = root.querySelector('#loans-body');
  const filter = root.querySelector('#loans-filter');
  if (!body) return;
  const sorted = [...loans].sort(
    (a, b) =>
      (STATUS_ORDER[a.status || 'other'] ?? 9) - (STATUS_ORDER[b.status || 'other'] ?? 9) ||
      b.outstanding - a.outstanding ||
      (a.lastDate < b.lastDate ? 1 : -1)
  );
  const draw = () => {
    const f = filter.value;
    const rows = sorted.filter((l) => f === 'all' || (l.status || 'other') === f);
    body.innerHTML = rows
      .map((l) => {
        const s = l.status || 'other';
        const label = s === 'other' && l.statusRaw ? l.statusRaw : STATUS_LABELS[s];
        return `<tr>
          <th scope="row" class="mono">${esc(l.loanId)}</th>
          <td>${esc(countryFr(l.country))}</td>
          <td><span class="pill ${PILL[s]}">${esc(label)}</span></td>
          <td class="num">${fmtEur(l.invested)}</td>
          <td class="num">${fmtEur(l.principal)}</td>
          <td class="num">${fmtEur(l.interest)}</td>
          <td class="num strong">${fmtEur(l.outstanding)}</td>
          <td>${fmtDate(l.lastDate)}</td>
        </tr>`;
      })
      .join('');
  };
  filter.addEventListener('change', draw);
  draw();
}

/* ----------------------------------------------------------- Transactions */

const PAGE_SIZE = 25;

export function transactionsHTML(txs) {
  const kinds = [...new Set(txs.map((t) => t.kind))];
  return `
  <section class="panel table-panel" aria-labelledby="tx-title">
    <div class="table-head">
      <h2 id="tx-title">Transactions</h2>
      <div class="table-tools">
        <label class="field">
          <span>Type</span>
          <select id="tx-kind">
            <option value="all">Tous (${txs.length})</option>
            ${kinds.map((k) => `<option value="${k}">${KIND_LABELS[k]}</option>`).join('')}
          </select>
        </label>
        <label class="field">
          <span>Recherche</span>
          <input id="tx-search" type="search" placeholder="Identifiant ou n° de prêt" autocomplete="off">
        </label>
      </div>
    </div>
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th scope="col">Date</th><th scope="col">Type</th><th scope="col">Prêt</th>
            <th scope="col">Pays</th><th scope="col" class="num">Montant</th><th scope="col">Identifiant</th>
          </tr>
        </thead>
        <tbody id="tx-body"></tbody>
      </table>
    </div>
    <div class="pager">
      <button class="btn small" id="tx-prev" type="button">Précédent</button>
      <span id="tx-page" aria-live="polite"></span>
      <button class="btn small" id="tx-next" type="button">Suivant</button>
    </div>
  </section>`;
}

export function mountTransactions(root, txs) {
  const body = root.querySelector('#tx-body');
  if (!body) return;
  const kindSel = root.querySelector('#tx-kind');
  const search = root.querySelector('#tx-search');
  const prev = root.querySelector('#tx-prev');
  const next = root.querySelector('#tx-next');
  const pageLbl = root.querySelector('#tx-page');
  const sorted = [...txs].sort((a, b) =>
    a.date === b.date ? Number(b.id) - Number(a.id) : a.date < b.date ? 1 : -1
  );
  let page = 0;

  const draw = () => {
    const k = kindSel.value;
    const q = search.value.trim().toLowerCase();
    const rows = sorted.filter(
      (t) => (k === 'all' || t.kind === k) && (!q || String(t.id).toLowerCase().includes(q) || String(t.loanId || '').includes(q))
    );
    const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    page = Math.min(page, pages - 1);
    const slice = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    body.innerHTML = slice.length
      ? slice
          .map(
            (t) => `<tr>
              <td>${fmtDate(t.date)}</td>
              <td title="${esc(t.rawType)}">${esc(t.kind === 'other' ? t.rawType : KIND_LABELS[t.kind])}</td>
              <td class="mono">${esc(t.loanId || '—')}</td>
              <td>${t.country ? esc(countryFr(t.country)) : '—'}</td>
              <td class="num ${t.amount < 0 ? 'neg-text' : ''}">${fmtSigned(t.amount)}</td>
              <td class="mono muted">${esc(t.id)}</td>
            </tr>`
          )
          .join('')
      : '<tr><td colspan="6" class="empty-row">Aucune transaction ne correspond.</td></tr>';
    pageLbl.textContent = `Page ${page + 1} sur ${pages} (${rows.length} transaction${rows.length > 1 ? 's' : ''})`;
    prev.disabled = page === 0;
    next.disabled = page >= pages - 1;
  };

  kindSel.addEventListener('change', () => ((page = 0), draw()));
  search.addEventListener('input', () => ((page = 0), draw()));
  prev.addEventListener('click', () => (page--, draw()));
  next.addEventListener('click', () => (page++, draw()));
  draw();
}
