// Aides pour Chart.js (chargé depuis un CDN dans index.html).

let charts = [];

export function destroyCharts() {
  charts.forEach((c) => c.destroy());
  charts = [];
}

export const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export const palette = () => [1, 2, 3, 4, 5, 6, 7, 8].map((i) => css(`--c${i}`));

export function mountChart(canvas, config) {
  if (!canvas) return null;
  if (!window.Chart) {
    canvas.parentElement.innerHTML =
      '<p class="chart-fallback">Les graphiques ne sont pas disponibles : la bibliothèque Chart.js n’a pas pu se charger (connexion requise).</p>';
    return null;
  }
  Chart.defaults.font.family = css('--font');
  Chart.defaults.font.size = 12;
  Chart.defaults.color = css('--muted');
  Chart.defaults.borderColor = css('--line');
  const chart = new Chart(canvas, config);
  charts.push(chart);
  return chart;
}
