// Formatage à la française.

const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const eurRound = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const eurSigned = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', signDisplay: 'exceptZero' });
const pct = (d) =>
  new Intl.NumberFormat('fr-FR', { style: 'percent', minimumFractionDigits: d, maximumFractionDigits: d });
const pctSigned = new Intl.NumberFormat('fr-FR', {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: 'exceptZero',
});

const ok = (n) => typeof n === 'number' && isFinite(n);

export const fmtEur = (n) => (ok(n) ? eur.format(n) : '—');
export const fmtEurRound = (n) => (ok(n) ? eurRound.format(n) : '—');
export const fmtSigned = (n) => (ok(n) ? eurSigned.format(n) : '—');
export const fmtPct = (n, d = 2) => (ok(n) ? pct(d).format(n) : '—');
export const fmtPctSigned = (n) => (ok(n) ? pctSigned.format(n) : '—');

export const fmtDate = (iso) => (iso ? new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR') : '—');
export const fmtMonth = (ym) =>
  new Date(ym + '-01T12:00:00').toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
export const fmtDateTime = (iso) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

const COUNTRIES_FR = {
  Kazakhstan: 'Kazakhstan',
  Mexico: 'Mexique',
  'South Africa': 'Afrique du Sud',
  Argentina: 'Argentine',
  Colombia: 'Colombie',
  Peru: 'Pérou',
  Brazil: 'Brésil',
  Chile: 'Chili',
  Poland: 'Pologne',
  Estonia: 'Estonie',
  Latvia: 'Lettonie',
  Lithuania: 'Lituanie',
  Georgia: 'Géorgie',
  Bulgaria: 'Bulgarie',
  Romania: 'Roumanie',
  'Czech Republic': 'Tchéquie',
  Spain: 'Espagne',
  Italy: 'Italie',
  Germany: 'Allemagne',
  Finland: 'Finlande',
  Denmark: 'Danemark',
  Sweden: 'Suède',
  Ukraine: 'Ukraine',
  Moldova: 'Moldavie',
  Albania: 'Albanie',
  'North Macedonia': 'Macédoine du Nord',
  Kenya: 'Kenya',
  Ghana: 'Ghana',
  Nigeria: 'Nigeria',
  Philippines: 'Philippines',
  Indonesia: 'Indonésie',
  Vietnam: 'Viêt Nam',
  India: 'Inde',
};
export const countryFr = (c) => (c ? COUNTRIES_FR[c] || c : 'Inconnu');

export const KIND_LABELS = {
  deposit: 'Dépôt',
  withdrawal: 'Retrait',
  investment: 'Investissement',
  principal: 'Capital remboursé',
  interest: 'Intérêts',
  bonus: 'Bonus',
  fee: 'Frais',
  other: 'Autre',
};

export const STATUS_LABELS = {
  active: 'En cours',
  finished: 'Terminé',
  late: 'En retard',
  default: 'Défaut',
  other: 'Autre',
};
