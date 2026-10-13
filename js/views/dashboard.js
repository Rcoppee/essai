// Composants partagés par la page d'une plateforme et le récapitulatif P2P.

import { fmtEur, fmtEurRound, fmtSigned, fmtPct, fmtPctSigned, fmtDate, fmtMonth, countryFr, esc } from '../format.js';
import { timeline, mergeTimelines, monthlyIncome, monthRange, byCountry } from '../metrics.js';
import { mountChart, palette, css } from '../charts.js';

/** Barre segmentée + légende. segments = [{ label, value, cls }] */
export function segBar(segments) {
  const pos = segments.filter((s) => s.value > 0.005);
  const total = pos.reduce((s, x) => s + x.value, 0);
  if (!total) return '<p class="muted">Aucun capital à répartir.</p>';
  const aria = pos.map((s) => `${s.label} ${fmtEur(s.value)}`).join(', ');
  return `
    <div class="seg" role="img" aria-label="Répartition : ${esc(aria)}">
      ${pos.map((s) => `<span class="seg-part ${s.cls}" style="flex:${s.value}"></span>`).join('')}
    </div>
    <ul class="seg-legend">
      ${pos
        .map(
          (s) => `<li>
            <span class="dot ${s.cls}"></span>
            <span class="seg-name">${esc(s.label)}</span>
            <span class="seg-amt">${fmtEur(s.value)}</span>
            <span class="seg-pct">${fmtPct(s.value / total, 0)}</span>
          </li>`
        )
        .join('')}
    </ul>`;
}

export function heroHTML(m) {
  const cls = m.gain >= 0 ? 'pos' : 'neg';
  return `
  <section class="hero" aria-label="Valeur estimée">
    <div class="hero-top">
      <div>
        <p class="hero-label">Valeur estimée${m.lastDate ? ` au ${fmtDate(m.lastDate)}` : ''}</p>
        <p class="hero-value">${fmtEur(m.value)}</p>
      </div>
      <p class="hero-gain ${cls}">
        <span class="hero-gain-amt">${fmtSigned(m.gain)}</span>
        <span class="hero-gain-sub">${m.gainPct != null ? `${fmtPctSigned(m.gainPct)} sur le capital versé` : ''}</span>
      </p>
    </div>
    ${segBar([
      { label: 'Cash disponible', value: m.cash, cls: 'seg-cash' },
      { label: 'Capital en cours', value: m.healthyOutstanding, cls: 'seg-ok' },
      { label: 'Capital en retard ou en défaut', value: m.lateOutstanding, cls: 'seg-late' },
    ])}
    <p class="footnote">La valeur estimée additionne le cash disponible et le capital restant dû. Les intérêts courus mais pas encore versés ne sont pas comptés.</p>
  </section>`;
}

export function figuresHTML(m) {
  const lateCount = m.counts.late + m.counts.default;
  const items = [
    ['Capital versé net', fmtEur(m.netDeposited), `${fmtEur(m.deposits)} déposés, ${fmtEur(m.withdrawals)} retirés`],
    ['Intérêts perçus', fmtEur(m.interest), ''],
    [
      'Rendement annualisé',
      m.xirr == null ? '—' : fmtPct(m.xirr),
      m.xirr == null ? 'Calculé à partir de 60 jours d’historique' : 'Taux interne de rendement (XIRR), indicatif',
    ],
    ['Capital en cours', fmtEur(m.outstanding), `${fmtEur(m.invested)} investis au total`],
    ['Cash disponible', fmtEur(m.cash), ''],
    [
      'Prêts',
      String(m.loans.length),
      `${m.counts.active} en cours, ${m.counts.finished} terminés, ${lateCount} en retard` +
        (m.counts.other ? `, ${m.counts.other} autres` : ''),
    ],
  ];
  const extra = m.bonus + m.fees + m.other;
  if (Math.abs(extra) > 0.005) items.splice(2, 0, ['Bonus, frais et autres', fmtSigned(extra), '']);

  return `
  <dl class="figures">
    ${items
      .map(
        ([label, value, hint]) => `<div class="figure">
          <dt>${esc(label)}</dt>
          <dd>${esc(value)}</dd>
          ${hint ? `<p class="figure-hint">${esc(hint)}</p>` : ''}
        </div>`
      )
      .join('')}
  </dl>`;
}

export function warningsHTML(list) {
  if (!list.length) return '';
  return `<div class="notice warn" role="status"><ul>${list.map((w) => `<li>${esc(w)}</li>`).join('')}</ul></div>`;
}

export function chartsHTML() {
  return `
  <section class="charts" aria-label="Graphiques">
    <div class="panel chart-panel chart-wide">
      <h2>Valeur du compte</h2>
      <div class="chart-box"><canvas id="ch-value" role="img" aria-label="Évolution de la valeur estimée et du capital versé"></canvas></div>
    </div>
    <div class="panel chart-panel">
      <h2>Capital en cours par pays</h2>
      <div class="chart-box" id="box-country"><canvas id="ch-country" role="img" aria-label="Répartition du capital en cours par pays"></canvas></div>
    </div>
    <div class="panel chart-panel">
      <h2>Intérêts et bonus par mois</h2>
      <div class="chart-box"><canvas id="ch-income" role="img" aria-label="Intérêts et bonus perçus par mois, avec cumul"></canvas></div>
    </div>
  </section>`;
}

const axisEuro = { callback: (v) => fmtEurRound(v) };

/**
 * Dessine les trois graphiques.
 * groups = [{ label, txs }] : une entrée par plateforme (une seule sur la page d'une plateforme).
 */
export function mountCharts(root, groups, loans) {
  const colors = palette();
  const allTxs = groups.flatMap((g) => g.txs.filter((t) => t.currency === 'EUR'));
  if (!allTxs.length) return;

  // 1. Valeur du compte
  const pts = mergeTimelines(groups.map((g) => timeline(g.txs)));
  mountChart(root.querySelector('#ch-value'), {
    type: 'line',
    data: {
      labels: pts.map((p) => fmtDate(p.date)),
      datasets: [
        {
          label: 'Valeur estimée',
          data: pts.map((p) => p.value),
          borderColor: css('--accent'),
          backgroundColor: css('--accent'),
          stepped: 'before',
          pointRadius: 2,
          borderWidth: 2,
        },
        {
          label: 'Capital versé net',
          data: pts.map((p) => p.netDeposited),
          borderColor: css('--muted'),
          backgroundColor: css('--muted'),
          borderDash: [5, 4],
          stepped: 'before',
          pointRadius: 0,
          borderWidth: 1.5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: { y: { beginAtZero: true, ticks: axisEuro }, x: { grid: { display: false } } },
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12 } },
        tooltip: { callbacks: { label: (c) => `${c.dataset.label} : ${fmtEur(c.parsed.y)}` } },
      },
    },
  });

  // 2. Capital en cours par pays
  const countries = byCountry(loans);
  const box = root.querySelector('#box-country');
  if (!countries.length) {
    box.innerHTML = '<p class="chart-fallback">Aucun capital en cours.</p>';
  } else {
    const total = countries.reduce((s, c) => s + c.value, 0);
    mountChart(root.querySelector('#ch-country'), {
      type: 'doughnut',
      data: {
        labels: countries.map((c) => countryFr(c.country)),
        datasets: [
          {
            data: countries.map((c) => c.value),
            backgroundColor: countries.map((_, i) => colors[i % colors.length]),
            borderColor: css('--surface'),
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: { position: 'right', labels: { boxWidth: 12 } },
          tooltip: { callbacks: { label: (c) => `${c.label} : ${fmtEur(c.parsed)} (${fmtPct(c.parsed / total, 1)})` } },
        },
      },
    });
  }

  // 3. Intérêts et bonus par mois (empilés par plateforme) + cumul
  const dates = allTxs.map((t) => t.date).sort();
  const months = monthRange(dates[0].slice(0, 7), dates[dates.length - 1].slice(0, 7));
  const datasets = groups.map((g, i) => {
    const mm = monthlyIncome(g.txs);
    return {
      type: 'bar',
      label: g.label,
      data: months.map((k) => Math.round((mm.get(k) || 0) * 100) / 100),
      backgroundColor: colors[i % colors.length],
      stack: 'income',
      yAxisID: 'y',
      borderRadius: 2,
    };
  });
  let run = 0;
  const cumul = months.map((_, idx) => {
    run += datasets.reduce((s, d) => s + d.data[idx], 0);
    return Math.round(run * 100) / 100;
  });
  datasets.push({
    type: 'line',
    label: 'Cumul',
    data: cumul,
    yAxisID: 'y1',
    borderColor: css('--ink'),
    backgroundColor: css('--ink'),
    pointRadius: 3,
    borderWidth: 1.5,
    tension: 0,
  });
  mountChart(root.querySelector('#ch-income'), {
    type: 'bar',
    data: { labels: months.map(fmtMonth), datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: { stacked: true, grid: { display: false } },
        y: { stacked: true, beginAtZero: true, ticks: { callback: (v) => fmtEur(v) } },
        y1: { position: 'right', beginAtZero: true, grid: { drawOnChartArea: false }, ticks: { callback: (v) => fmtEur(v) } },
      },
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12 } },
        tooltip: { callbacks: { label: (c) => `${c.dataset.label} : ${fmtEur(c.parsed.y)}` } },
      },
    },
  });
}
