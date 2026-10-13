// Parseur de l'export "transactions" de Peerberry (.xlsx ou .csv).
//
// Colonnes attendues : ID, Date, Type, Amount, Currency, Loan Id, Country, Loan Status
//
// Contrat commun à tous les parseurs (voir README) :
//   parse(rows) -> { transactions: [...], warnings: [...] }
// Chaque transaction normalisée a la forme :
//   { id, date, kind, rawType, amount, currency, loanId, country, loanStatus, loanStatusRaw }
// où `amount` est signé du point de vue du compte (dépôt > 0, investissement < 0)
// et `kind` ∈ deposit | withdrawal | investment | principal | interest | bonus | fee | other.

import { toISODate, toNumber, cents } from './common.js';

const REQUIRED = ['ID', 'Date', 'Type', 'Amount'];

function classify(type) {
  if (type === 'DEPOSIT') return 'deposit';
  if (type === 'WITHDRAWAL') return 'withdrawal';
  if (type === 'INVESTMENT') return 'investment';
  if (type.includes('PRINCIPAL')) return 'principal'; // PRINCIPAL, BUYBACK_PRINCIPAL…
  if (type.includes('INTEREST')) return 'interest'; // INTEREST, BUYBACK_INTEREST…
  if (/BONUS|CASHBACK|REFERRAL|REWARD|PROMO/.test(type)) return 'bonus';
  if (/FEE|COMMISSION/.test(type)) return 'fee';
  return 'other';
}

function loanStatus(raw) {
  const t = String(raw || '').trim().toUpperCase();
  if (!t) return null;
  if (t === 'CURRENT') return 'active';
  if (t === 'FINISHED') return 'finished';
  if (t === 'LATE') return 'late';
  if (/DEFAULT|RECOVER|BAD|WRITTEN/.test(t)) return 'default';
  return 'other';
}

export const peerberry = {
  id: 'peerberry',
  name: 'Peerberry',
  fileHint: 'Export « Transactions » de Peerberry (.xlsx ou .csv)',

  parse(rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error('Le fichier ne contient aucune ligne de données.');
    }
    const columns = Object.keys(rows[0]);
    const missing = REQUIRED.filter((c) => !columns.includes(c));
    if (missing.length) {
      throw new Error(
        `Ce fichier ne ressemble pas à un export Peerberry : colonnes manquantes (${missing.join(', ')}). ` +
          `Colonnes trouvées : ${columns.join(', ') || 'aucune'}.`
      );
    }

    const warnings = [];
    const seen = new Set();
    const transactions = [];
    let rejected = 0;
    let duplicates = 0;
    const unknownTypes = new Set();

    for (const r of rows) {
      const date = toISODate(r['Date']);
      let amount = toNumber(r['Amount']);
      const rawType = String(r['Type'] ?? '').trim().toUpperCase();
      if (!date || amount == null || !rawType) {
        rejected++;
        continue;
      }
      const id = String(r['ID'] ?? '').trim();
      if (id) {
        if (seen.has(id)) {
          duplicates++;
          continue;
        }
        seen.add(id);
      }

      const kind = classify(rawType);
      // On force le signe du point de vue du compte, quelle que soit la convention du fichier
      if (kind === 'deposit') amount = Math.abs(amount);
      else if (kind === 'withdrawal' || kind === 'investment') amount = -Math.abs(amount);
      if (kind === 'other') unknownTypes.add(rawType);

      const loanId = r['Loan Id'] != null && r['Loan Id'] !== '' ? String(r['Loan Id']).replace(/\.0$/, '') : null;
      const statusRaw = r['Loan Status'] ? String(r['Loan Status']).trim().toUpperCase() : null;

      transactions.push({
        id,
        date,
        kind,
        rawType,
        amount: cents(amount),
        currency: String(r['Currency'] || 'EUR').trim().toUpperCase(),
        loanId,
        country: r['Country'] ? String(r['Country']).trim() : null,
        loanStatus: loanStatus(statusRaw),
        loanStatusRaw: statusRaw,
      });
    }

    if (transactions.length === 0) {
      throw new Error('Aucune transaction valide trouvée (dates ou montants illisibles).');
    }
    if (rejected) warnings.push(`${rejected} ligne(s) ignorée(s) car la date, le type ou le montant est illisible.`);
    if (duplicates) warnings.push(`${duplicates} doublon(s) d'identifiant ignoré(s).`);
    if (unknownTypes.size) {
      warnings.push(
        `Types de transaction non reconnus : ${[...unknownTypes].join(', ')}. ` +
          `Ils sont comptés dans le cash disponible mais pas dans les intérêts.`
      );
    }

    transactions.sort((a, b) => (a.date === b.date ? Number(a.id) - Number(b.id) : a.date < b.date ? -1 : 1));
    return { transactions, warnings };
  },
};
