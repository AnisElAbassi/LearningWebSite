export const darkScales = {
  x: { grid: { color: '#1e1e3a' }, ticks: { color: '#94a3b8', font: { size: 10 } } },
  y: { grid: { color: '#1e1e3a' }, ticks: { color: '#94a3b8' } },
};

export const darkLegend = {
  labels: { color: '#94a3b8', font: { size: 11 } },
};

export const chartPalette = {
  purple: '#a855f7',
  yellow: '#fbbf24',
  green: '#22c55e',
  red: '#ef4444',
  blue: '#3b82f6',
  indigo: '#6366f1',
  gray: '#94a3b8',
  orange: '#f59e0b',
  purpleAlpha: 'rgba(168, 85, 247, 0.15)',
  yellowAlpha: 'rgba(251, 191, 36, 0.15)',
  greenAlpha: 'rgba(34, 197, 94, 0.15)',
  redAlpha: 'rgba(239, 68, 68, 0.15)',
};

export const darkLineOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: darkScales,
  plugins: { legend: darkLegend },
};

export const darkBarOptions = {
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y',
  scales: {
    x: darkScales.x,
    y: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 11 } } },
  },
  plugins: { legend: { display: false } },
};

export const darkDoughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '60%',
  plugins: {
    legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 10 }, padding: 8 } },
  },
};
