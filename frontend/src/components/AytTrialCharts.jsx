import TytTrialCharts from './TytTrialCharts.jsx';

const COLORS = ['var(--navy)', 'var(--ok)', 'var(--warn)', 'var(--bad)'];

export default function AytTrialCharts({ rows, tests }) {
  const branches = tests.map((test, index) => ({ key: test.key, title: test.label, color: COLORS[index % COLORS.length] }));
  const points = rows.filter((row) => row.date).map((row) => ({
    id: row.id,
    date: row.date,
    ...Object.fromEntries(tests.map(({ key }) => [key, row.testNets?.[key] === undefined || row.testNets[key] === '' ? null : row.nets[key]])),
  }));
  return <TytTrialCharts rows={rows} branches={branches} points={points}
    title="AYT branş netlerini karşılaştır" maxNet={Math.max(...tests.map(({ questions }) => questions))} />;
}
