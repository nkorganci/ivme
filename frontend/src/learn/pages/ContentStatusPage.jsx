import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePageTitle } from '../../hooks.js';
import DataGrid from '../../components/DataGrid.jsx';
import readiness from '../content/matematik-icerik-durumu.json';
import { BASE, ExamBadges } from '../ui.jsx';

const FILTERS = [['all', 'Tümü'], ['complete', 'Bitti'], ['incomplete', 'Eksik']];
const columns = [
  { field: 'title', headerName: 'TYT matematik konusu', minWidth: 260, flex: 2, wrapText: true, autoHeight: true,
    cellRenderer: ({ data }) => <Link to={`${BASE}/konu/${data.id}`}>{data.title}</Link> },
  { field: 'examLabel', headerName: 'Sınav kapsamı', minWidth: 170, flex: 1,
    cellRenderer: ({ data }) => <span><ExamBadges exams={data.exams} />{data.exams.length > 1 && <span className="small"> Ortak</span>}</span> },
  { field: 'status', headerName: 'İçerik durumu', minWidth: 145, flex: 1,
    valueFormatter: ({ value }) => value === 'complete' ? '✓ Bitti' : 'Eksik',
    cellRenderer: ({ value }) => <span className={`lr-content-status lr-content-status-${value}`}>{value === 'complete' ? '✓ Bitti' : 'Eksik'}</span> },
  { field: 'remainingText', headerName: 'Kalan hazırlık', minWidth: 250, flex: 2, wrapText: true, autoHeight: true },
];

export default function ContentStatusPage() {
  usePageTitle('İçerik durumu · TYT matematik');
  const [filter, setFilter] = useState('all');
  const rows = useMemo(() => readiness.topics.filter((t) => filter === 'all' || t.status === filter)
    .map((t) => ({ ...t, examLabel: t.exams.join(' + '), remainingText: t.remaining.join(' · ') || 'Hazırlık tamamlandı' })), [filter]);
  const next = readiness.topics.find((t) => t.id === readiness.nextTopicId);
  return <div className="lr-page lr-content-readiness">
    <div className="page-head"><h1>Matematik · İçerik durumu</h1><span className="muted">TYT ve ortak konular</span></div>
    <p>Ders içeriklerinin hazırlanma durumunu buradan takip edebilirsin. Kendi çalışma ilerlemen <Link to={`${BASE}/harita?sinav=TYT`}>Konu haritasında</Link> gösterilir.</p>
    <section className="card lr-content-summary" aria-label="İçerik hazırlığı özeti">
      <p className="lr-content-count"><strong>{readiness.completed}/{readiness.total}</strong> konu bitti</p>
      <progress value={readiness.completed} max={readiness.total} aria-label="Hazırlığı tamamlanan konular" />
      <p>{readiness.total - readiness.completed} konuda eksik hazırlık var.</p>
      <p>TYT + AYT etiketli konuların ortak anlatımı tek derste tutulur. AYT çalışırken bu dersi yeniden baştan bitirmen gerekmez; varsa yalnız AYT’ye özgü ek bölümlere geçersin.</p>
      {next && <p>Sıradaki konu: <Link to={`${BASE}/konu/${next.id}`}>{next.title}</Link></p>}
      <p className="small muted">Bitti işareti; ayrıntılı anlatım, etkileşimli alıştırmalar, çözümlü çıkmış sorular ve kaynak incelemesi için belirlenen içerik ölçütlerinin karşılandığını gösterir. Öğretmen onayı ayrıca belirtilir.</p>
    </section>
    <div className="tabs study-tabs" role="group" aria-label="İçerik durumuna göre süz">
      {FILTERS.map(([value, label]) => <button type="button" key={value} className={filter === value ? 'active' : ''}
        aria-pressed={filter === value} onClick={() => setFilter(value)}>{label} ({value === 'all' ? readiness.total : value === 'complete' ? readiness.completed : readiness.total - readiness.completed})</button>)}
    </div>
    <DataGrid rowData={rows} columnDefs={columns} scrollable columnSorting
      className="lr-content-grid" gridOptions={{ getRowId: ({ data }) => data.id }} />
  </div>;
}
