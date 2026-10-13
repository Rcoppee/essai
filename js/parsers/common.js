// Utilitaires partagés par les parseurs de plateformes.

/** Convertit une cellule (texte, nombre Excel, Date) en date ISO "AAAA-MM-JJ". */
export function toISODate(v) {
  if (v == null || v === '') return null;

  if (v instanceof Date) {
    if (isNaN(v)) return null;
    // +12 h pour absorber les décalages de fuseau de SheetJS autour de minuit
    const d = new Date(v.getTime() + 12 * 3600 * 1000);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  if (typeof v === 'number') {
    // Numéro de série Excel (jours depuis 1899-12-30)
    const d = new Date(Math.round((v - 25569) * 86400000));
    return isNaN(d) ? null : d.toISOString().slice(0, 10);
  }

  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})/); // JJ/MM/AAAA
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
}

/** Convertit une cellule en nombre (gère "1 234,56" et "1,234.56"). Retourne null si invalide. */
export function toNumber(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return isFinite(v) ? v : null;
  let s = String(v).replace(/[\s\u00a0€$]/g, '');
  if (!s) return null;
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma > -1 && lastDot > -1) {
    // Le dernier séparateur est le séparateur décimal
    s = lastComma > lastDot ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (lastComma > -1) {
    s = s.replace(',', '.');
  }
  const n = Number(s);
  return isFinite(n) ? n : null;
}

/** Arrondit au centime. */
export const cents = (n) => Math.round(n * 100) / 100;
