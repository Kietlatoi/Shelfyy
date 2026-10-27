export const sourceColors = ['#8b5cf6', '#06b6d4', '#f59e0b', '#64748b'];

export function sourcePie(sources) {
  const total = sources.reduce((sum, row) => sum + row.sessions, 0);
  let position = 0;
  const slices = sources.map((row, index) => {
    const start = position;
    const share = total ? row.sessions / total * 100 : 0;
    position += share;
    return { ...row, share, color: sourceColors[index % sourceColors.length], start, end: position };
  });
  return { total, slices, background: total ? `conic-gradient(${slices.filter((row) => row.share > 0).map((row) => `${row.color} ${row.start}% ${row.end}%`).join(', ')})` : '#e2e8f0' };
}
