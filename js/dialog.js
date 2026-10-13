// Boîte de dialogue modale. Retourne une promesse résolue à true si l'utilisateur confirme.
import { esc } from './format.js';

export function openDialog({ title, bodyHTML, confirmLabel = 'Confirmer', cancelLabel = 'Annuler', confirmable = true }) {
  const dlg = document.getElementById('dialog');
  dlg.innerHTML = `
    <form method="dialog">
      <h2>${esc(title)}</h2>
      <div class="dlg-body">${bodyHTML}</div>
      <div class="dlg-actions">
        <button class="btn" value="cancel" type="submit">${esc(confirmable ? cancelLabel : 'Fermer')}</button>
        ${confirmable ? `<button class="btn primary" value="ok" type="submit" autofocus>${esc(confirmLabel)}</button>` : ''}
      </div>
    </form>`;
  dlg.returnValue = '';
  return new Promise((resolve) => {
    dlg.addEventListener('close', () => resolve(dlg.returnValue === 'ok'), { once: true });
    dlg.showModal();
  });
}
