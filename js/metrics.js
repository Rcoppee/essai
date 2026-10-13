// Calculs sur les transactions normalisées (voir le contrat des parseurs).
// Seules les transactions en EUR entrent dans les totaux.

const r2 = (n) => Math.round(n * 100) / 100;
const sum = (arr, f) => arr.reduce((s, x) => s + f(x), 0);

function sortTxs(txs) {
  return [...txs].sort((a, b) =>
    a.date === b.date ? String(a.id).localeCompare(String(b.id), 'en', { numeric: true }) : a.date < b.date ? -1 : 1
  );
}

/** Regroupe les transactions par prêt (clé = plateforme + identifiant du prêt). */
export function loansOf(txs) {
  const map = new Map();
  for (const t of sortTxs(txs)) {
    if (!t.loanId) continue;
    const key = `${t.platform || ''}:${t.loanId}`;
    let l = map.get(key);
    if (!l) {
      l = {
        key,
        platform: t.platform || '',
        loanId: t.loanId,
        country: t.country || null,
        status: null,
        statusRaw: null,
        invested: 0,
        principal: 0,
        interest: 0,
        firstDate: t.date,
        lastDate: t.date,
      };
      map.set(key, l);
    }
    if (!l.country && t.country) l.country = t.country;
    if (t.loanStatus) {
      l.status = t.loanStatus;
      l.statusRaw = t.loanStatusRaw;
    }
    if (t.kind === 'investment') l.invested += -t.amount;
    else if (t.kind === 'principal') l.principal += t.amount;
    else if (t.kind === 'interest') l.interest += t.amount;
    l.lastDate = t.date;
  }
  return [...map.values()].map((l) => ({
    ...l,
    invested: r2(l.invested),
    principal: r2(l.principal),
    interest: r2(l.interest),
    outstanding: r2(l.invested - l.principal),
  }));
}

/** Taux interne de rendement annualisé (méthode de la bissection). */
export function xirr(flows) {
  if (flows.length < 2) return null;
  const f = [...flows].sort((a, b) => (a.date < b.date ? -1 : 1));
  const t0 = Date.parse(f[0].date);
  const years = (d) => (Date.parse(d) - t0) / (365 * 86400000);
  const npv = (r) => f.reduce((s, x) => s + x.amount / Math.pow(1 + r, years(x.date)), 0);
  let lo = -0.99;
  let hi = 10;
  let flo = npv(lo);
  const fhi = npv(hi);
  if (!isFinite(flo) || !isFinite(fhi) || flo * fhi > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fm = npv(mid);
    if (Math.abs(fm) < 1e-9) return mid;
    if (flo * fm < 0) hi = mid;
    else {
      lo = mid;
      flo = fm;
    }
  }
  return (lo + hi) / 2;
}

const MIN_DAYS_FOR_XIRR = 60;

/** Indicateurs globaux d'un ensemble de transactions. */
export function computeMetrics(allTxs) {
  const txs = allTxs.filter((t) => t.currency === 'EUR');
  const skipped = allTxs.length - txs.length;
  const of = (k) => txs.filter((t) => t.kind === k);

  const deposits = r2(sum(of('deposit'), (t) => t.amount));
  const withdrawals = r2(-sum(of('withdrawal'), (t) => t.amount)) + 0; // + 0 évite « -0 »
  const invested = r2(-sum(of('investment'), (t) => t.amount));
  const principal = r2(sum(of('principal'), (t) => t.amount));
  const interest = r2(sum(of('interest'), (t) => t.amount));
  const bonus = r2(sum(of('bonus'), (t) => t.amount));
  const fees = r2(sum(of('fee'), (t) => t.amount)); // signé : négatif = coût
  const other = r2(sum(of('other'), (t) => t.amount));

  const cash = r2(sum(txs, (t) => t.amount));
  const outstanding = r2(invested - principal);
  const value = r2(cash + outstanding);
  const netDeposited = r2(deposits - withdrawals);
  const gain = r2(value - netDeposited);

  const loans = loansOf(txs);
  const counts = { active: 0, finished: 0, late: 0, default: 0, other: 0 };
  for (const l of loans) counts[l.status || 'other']++;
  const lateOutstanding = r2(
    sum(
      loans.filter((l) => l.status === 'late' || l.status === 'default'),
      (l) => l.outstanding
    )
  );
  const healthyOutstanding = r2(outstanding - lateOutstanding);

  const dates = txs.map((t) => t.date).sort();
  const firstDate = dates[0] || null;
  const lastDate = dates[dates.length - 1] || null;

  let rate = null;
  const flows = txs
    .filter((t) => t.kind === 'deposit' || t.kind === 'withdrawal')
    .map((t) => ({ date: t.date, amount: -t.amount }));
  if (flows.length && lastDate) {
    const first = flows.map((f) => f.date).sort()[0];
    const days = (Date.parse(lastDate) - Date.parse(first)) / 86400000;
    if (days >= MIN_DAYS_FOR_XIRR && value > 0) rate = xirr([...flows, { date: lastDate, amount: value }]);
  }

  const warnings = [];
  if (skipped) warnings.push(`${skipped} transaction(s) dans une devise autre que l'euro ne sont pas comptées dans les totaux.`);
  if (outstanding < -0.01 || cash < -0.01) {
    warnings.push(
      "Le fichier semble ne pas couvrir tout l'historique (cash ou capital en cours négatif) : réimportez un export complet depuis le premier dépôt."
    );
  }

  return {
    count: txs.length,
    deposits, withdrawals, netDeposited, invested, principal, interest, bonus, fees, other,
    cash, outstanding, value, gain,
    gainPct: netDeposited > 0 ? gain / netDeposited : null,
    loans, counts, lateOutstanding, healthyOutstanding,
    firstDate, lastDate, xirr: rate, warnings,
  };
}

/** Série cumulée (capital versé net et valeur estimée) à chaque date de mouvement. */
export function timeline(txs) {
  let net = 0;
  let cash = 0;
  let out = 0;
  const pts = [];
  for (const t of sortTxs(txs.filter((x) => x.currency === 'EUR'))) {
    cash += t.amount;
    if (t.kind === 'deposit' || t.kind === 'withdrawal') net += t.amount;
    if (t.kind === 'investment') out += -t.amount;
    if (t.kind === 'principal') out -= t.amount;
    const pt = { date: t.date, netDeposited: r2(net), value: r2(cash + out) };
    if (pts.length && pts[pts.length - 1].date === t.date) pts[pts.length - 1] = pt;
    else pts.push(pt);
  }
  return pts;
}

/** Fusionne plusieurs séries (une par plateforme) en reportant la dernière valeur connue. */
export function mergeTimelines(lists) {
  const dates = [...new Set(lists.flatMap((l) => l.map((p) => p.date)))].sort();
  const idx = lists.map(() => -1);
  return dates.map((d) => {
    let net = 0;
    let val = 0;
    lists.forEach((l, i) => {
      while (idx[i] + 1 < l.length && l[idx[i] + 1].date <= d) idx[i]++;
      if (idx[i] >= 0) {
        net += l[idx[i]].netDeposited;
        val += l[idx[i]].value;
      }
    });
    return { date: d, netDeposited: r2(net), value: r2(val) };
  });
}

/** Revenus (intérêts + bonus) par mois : Map "AAAA-MM" -> montant. */
export function monthlyIncome(txs) {
  const m = new Map();
  for (const t of txs) {
    if (t.currency !== 'EUR' || (t.kind !== 'interest' && t.kind !== 'bonus')) continue;
    const k = t.date.slice(0, 7);
    m.set(k, (m.get(k) || 0) + t.amount);
  }
  return m;
}

/** Liste continue de mois entre deux "AAAA-MM". */
export function monthRange(first, last) {
  const out = [];
  let [y, m] = first.split('-').map(Number);
  const [ly, lm] = last.split('-').map(Number);
  while (y < ly || (y === ly && m <= lm)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
}

/** Capital en cours par pays, trié par montant décroissant. */
export function byCountry(loans) {
  const m = new Map();
  for (const l of loans) {
    if (l.outstanding <= 0.005) continue;
    const k = l.country || null;
    m.set(k, (m.get(k) || 0) + l.outstanding);
  }
  return [...m.entries()].map(([country, value]) => ({ country, value: r2(value) })).sort((a, b) => b.value - a.value);
}
