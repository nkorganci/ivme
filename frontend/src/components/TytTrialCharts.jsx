import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { buildTytChartData } from '../tytTrials.js';

const BRANCHES = [
  { key: 'math', title: 'Matematik', color: 'var(--navy)' },
  { key: 'turkish', title: 'Türkçe', color: 'var(--ok)' },
  { key: 'science', title: 'Fen Bilimleri', color: 'var(--warn)' },
  { key: 'social', title: 'Sosyal Bilgiler', color: 'var(--bad)' },
];

const number = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });

export default function TytTrialCharts({ rows, branches = BRANCHES, points: suppliedPoints, title = 'Branş netlerini karşılaştır', maxNet = 40 }) {
  const points = suppliedPoints ?? buildTytChartData(rows);
  const trials = points.filter((point) => branches.some(({ key }) => Number.isFinite(point[key])));
  const data = branches.map(({ key, title, color }) => ({
    branch: title,
    color,
    ...Object.fromEntries(trials.map((trial, index) => [`trial${index}`, trial[key]])),
  }));
  const lowest = Math.min(0, ...trials.flatMap((point) => branches.map(({ key }) => point[key]).filter(Number.isFinite)));
  const minimum = lowest < 0 ? Math.floor(lowest - 1) : 0;
  const summary = branches.map(({ key, title }) => `${title}: ${trials
    .map((trial, index) => Number.isFinite(trial[key]) ? `${index + 1}. deneme ${number.format(trial[key])} net` : null)
    .filter(Boolean).join(', ')}`).join('; ');

  return <section className="tyt-charts" aria-labelledby="tyt-charts-title">
    <h2 id="tyt-charts-title">{title}</h2>
    <div className="card tyt-chart-card">
      {trials.length === 0
        ? <p className="muted small">Grafik için tarih ve en az bir branş neti girin.</p>
        : <>
          <p className="muted small">X ekseninde branşlar, Y ekseninde netler var. Her branştaki çubuklar soldan sağa 1. denemeden başlayarak tarih sırasındadır. Net için çubuğa dokunun.</p>
          <div className="tyt-chart-legend" aria-hidden="true">
            {branches.map(({ key, title, color }) => <span key={key} className="tyt-chart-legend-item">
              <span className="tyt-chart-swatch" style={{ backgroundColor: color }} />{title}
            </span>)}
          </div>
          {trials.length < points.length && <p className="muted small">Net girilmemiş denemeler grafikte gösterilmez.</p>}
          <div className="tyt-chart-scroll" role="region" aria-label="Branş netleri grafiği; gerekirse yatay kaydırın" tabIndex={0}>
            <div className="tyt-chart" style={{ width: Math.max(640, trials.length * 168, branches.length * 105) }} role="img" aria-label={summary}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 16, right: 12, bottom: 4, left: 0 }} accessibilityLayer barGap={3}>
                  <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="branch" interval={0} tick={{ fill: 'var(--ink)', fontSize: 12 }} />
                  <YAxis domain={[minimum, maxNet]} tick={{ fill: 'var(--ink)', fontSize: 12 }}
                    tickFormatter={(value) => number.format(value)} width={40} allowDecimals={false} />
                  <Tooltip formatter={(value, name) => [`${number.format(value)} net`, name]}
                    contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--line)', color: 'var(--ink)' }} />
                  {trials.map((trial, index) => <Bar key={trial.id} dataKey={`trial${index}`}
                    name={`${index + 1}. deneme`} fill="var(--navy)" maxBarSize={30} isAnimationActive={false}>
                    {branches.map(({ key, color }) => <Cell key={key} fill={color} />)}
                  </Bar>)}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>}
    </div>
  </section>;
}
