// Page d'une plateforme P2P : import, chiffres clés, graphiques, prêts, transactions.

import { P2P_PLATFORMS } from '../config.js';
import { state, platformTxs, saveImport, resetToRepo, downloadDataset } from '../store.js';
import { computeMetrics } from '../metrics.js';
import { fmtDate, fmtDateTime, esc } from '../format.js';
import { openDialog } from '../dialog.js';
import { heroHTML, figuresHTML, warningsHTML, chartsHTML, mountCharts } from './dashboard.js';
import { loansHTML, mountLoans, transactionsHTML, mountTransactions } from './tables.js';

const changed = () => document.dispatchEvent(new CustomEvent('data-changed'));

async function importFile(platform, file) {
  if (!file) return;
  if (!window.XLSX) {
    await openDialog({
      title: 'Import impossible',
      bodyHTML: '<p>La bibliothèque de lecture Excel n’a pas pu se charger. Vérifiez votre connexion, puis rechargez la page.</p>',
      confirmable: false,
    });
    return;
  }

  let result;
  try {
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    if (!sheet) throw new Error('Le fichier ne contient aucune feuille.');
    result = platform.parser.parse(XLSX.utils.sheet_to_json(sheet, { defval: null }));
  } catch (err) {
    await openDialog({ title: 'Fichier non reconnu', bodyHTML: `<p>${esc(err.message)}</p>`, confirmable: false });
    return;
  }

  const txs = result.transactions;
  const dates = txs.map((t) => t.date).sort();
  const first = dates[0];
  const last = dates[dates.length - 1];
  const prev = state.p2p[platform.id];
  const warnings = [...result.warnings];

  if (prev?.transactions?.length) {
    const prevDates = prev.transactions.map((t) => t.date).sort();
    if (txs.length < prev.transactions.length) {
      warnings.push(`Ce fichier contient moins de transactions que les données actuelles (${txs.length} contre ${prev.transactions.length}).`);
    }
    if (last < prevDates[prevDates.length - 1]) {
      warnings.push(`Ce fichier s’arrête plus tôt que les données actuelles (${fmtDate(last)} contre ${fmtDate(prevDates[prevDates.length - 1])}).`);
    }
  }

  const replaces = prev?.transactions?.length
    ? `les ${prev.transactions.length} transactions actuelles de ${esc(platform.name)}`
    : `les données de ${esc(platform.name)}`;
  const ok = await openDialog({
    title: `Importer dans ${platform.name}`,
    confirmLabel: 'Remplacer les données',
    bodyHTML: `
      <p><strong>${esc(file.name)}</strong> contient <strong>${txs.length}</strong> transactions du ${fmtDate(first)} au ${fmtDate(last)}.</p>
      <p>Elles vont remplacer ${replaces}.</p>
      ${warnings.length ? `<ul class="dlg-warnings">${warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>` : ''}`,
  });
  if (!ok) return;

  try {
    saveImport(platform.id, {
      platform: platform.id,
      importedAt: new Date().toISOString(),
      fileName: file.name,
      transactions: txs,
    });
  } catch (err) {
    await openDialog({
      title: 'Enregistrement impossible',
      bodyHTML: '<p>Le navigateur a refusé d’enregistrer les données (stockage plein ou désactivé).</p>',
      confirmable: false,
    });
    return;
  }
  changed();
}

export function platformView(id) {
  const platform = P2P_PLATFORMS.find((p) => p.id === id);
  if (!platform) return null;

  const ds = state.p2p[id];
  const txs = platformTxs(id);
  const hasData = txs.length > 0;
  const m = hasData ? computeMetrics(txs) : null;

  const picker = `<input id="file-input" type="file" accept=".xlsx,.xls,.csv" hidden>`;

  let html;
  if (!hasData) {
    html = `
    <header class="page-head">
      <div><h1>${esc(platform.name)}</h1></div>
    </header>
    <section class="empty">
      <h2>Aucune transaction importée</h2>
      <p>${esc(platform.parser.fileHint)}. Glissez le fichier sur cette page ou choisissez-le ci-dessous. Chaque nouvel import remplace les données précédentes de cette plateforme.</p>
      <button class="btn primary" id="btn-import" type="button">Choisir un fichier</button>
      ${picker}
    </section>`;
  } else {
    const local = ds.source === 'local';
    html = `
    <header class="page-head">
      <div>
        <h1>${esc(platform.name)}</h1>
        <p class="page-meta">
          <span>Données au ${fmtDate(m.lastDate)}</span>
          <span>${m.count} transactions</span>
          <span class="badge ${local ? 'local' : ''}">${local ? `Import local du ${fmtDateTime(ds.importedAt)}` : 'Données du dépôt'}</span>
        </p>
      </div>
      <div class="actions">
        <button class="btn primary" id="btn-import" type="button">Importer un fichier</button>
        <button class="btn" id="btn-export" type="button">Exporter en JSON</button>
        ${local ? '<button class="btn ghost" id="btn-reset" type="button">Revenir aux données du dépôt</button>' : ''}
        ${picker}
      </div>
    </header>
    ${
      local
        ? `<div class="notice" role="status"><p>Cet import est enregistré dans ce navigateur uniquement. Pour le conserver sur GitHub, exportez-le en JSON, remplacez <code>data/p2p/${esc(id)}.json</code> dans le dépôt, puis faites un commit.</p></div>`
        : ''
    }
    ${warningsHTML(m.warnings)}
    ${heroHTML(m)}
    ${figuresHTML(m)}
    ${chartsHTML()}
    ${loansHTML(m.loans)}
    ${transactionsHTML(txs)}`;
  }

  return {
    title: platform.name,
    html,
    mount(root) {
      const input = root.querySelector('#file-input');
      root.querySelector('#btn-import')?.addEventListener('click', () => input.click());
      input?.addEventListener('change', async () => {
        const file = input.files[0];
        input.value = '';
        await importFile(platform, file);
      });
      root.querySelector('#btn-export')?.addEventListener('click', () => downloadDataset(id));
      root.querySelector('#btn-reset')?.addEventListener('click', async () => {
        const ok = await openDialog({
          title: 'Revenir aux données du dépôt',
          confirmLabel: 'Supprimer l’import local',
          bodyHTML: '<p>L’import enregistré dans ce navigateur sera supprimé. Les données du fichier <code>data/p2p/' + esc(id) + '.json</code> seront de nouveau affichées.</p>',
        });
        if (!ok) return;
        await resetToRepo(id);
        changed();
      });

      if (hasData) {
        mountCharts(root, [{ label: platform.name, txs }], m.loans);
        mountLoans(root, m.loans);
        mountTransactions(root, txs);
      }
    },
    onDrop: (file) => importFile(platform, file),
  };
}
