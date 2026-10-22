import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, qs } from '../api.js';
import { useAsync, usePageTitle } from '../hooks.js';
import { curriculumFromCategories, topicId as legacyTopicId } from '../curriculum.js';
import { videoLessons, withVideoRows } from '../curriculumVideos.js';
import LessonVideos from '../components/LessonVideos.jsx';
import DataGrid from '../components/DataGrid.jsx';
import { ErrorBox, Loading } from '../components/States.jsx';

const countTopics = (subject) => subject.units.reduce((total, unit) => total + unit.topics.length, 0);
const percent = (done, total) => total ? Math.round(100 * done / total) : 0;
const progressOf = (subjects, exam, progress) => {
  const topics = subjects.flatMap(s=>s.units.flatMap(u=>u.topics.map(title=>({id:s.topicIds[title]}))));
  return { total: topics.length, done: topics.filter((topic) => progress[topic.id]).length };
};

function ProgressBar({ done, total }) {
  const value = percent(done, total);
  return <div className="curriculum-meter" role="progressbar" aria-label="Tamamlanan konular"
    aria-valuenow={done} aria-valuemin="0" aria-valuemax={total}>
    <span style={{ width: `${value}%` }} />
  </div>;
}

export default function Curriculum() {
  usePageTitle('Dersler ve Konuları');
  const [params, setParams] = useSearchParams();
  const exam = params.get('sinav') === 'AYT' ? 'AYT' : 'TYT';
  const metadata=useAsync(()=>api.get('/api/learning-resources/metadata'),[]);
  const subjects = curriculumFromCategories(metadata.data?.categories||[])[exam];
  const selected = subjects.find((entry) => entry.id === params.get('ders')) ?? subjects[0] ?? {id:'',units:[]};
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saveError, setSaveError] = useState('');
  const [pending, setPending] = useState({});
  const [expandedVideos, setExpandedVideos] = useState({});
  const [videoTeacher, setVideoTeacher] = useState('all');
  const [classification,setClassification]=useState('CURRENT');
  const questionProgress=useAsync(()=>api.get('/api/learning-resources/progress'+qs({classification})),[classification]);
  const progressById=new Map((questionProgress.data?.categories || []).map(c=>[c.categoryId,c]));
  const coverage=useAsync(()=>api.get('/api/learning-resources/coverage'+qs({exam,subject:selected.id})),[exam,selected.id]);
  const coverageById=new Map((coverage.data?.categories || []).map(c=>[c.categoryId,c]));
  const topicId=(exam,subjectId,title)=>metadata.data?.categories.find(c=>c.canonicalUnit&&c.exam===exam&&c.subjectId===subjectId&&c.topic===title)?.id||legacyTopicId(exam,subjectId,title);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const rows = await api.get('/api/curriculum/progress');
      setProgress(Object.fromEntries(rows.map((row) => [row.topicId, row.completedAt])));
    } catch (error) { setLoadError(error); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const setExam = (next) => {
    setParams({ sinav: next });
  };
  const setSubject = (id) => {
    setParams({ sinav: exam, ders: id });
  };
  const toggle = async (id) => {
    const completed = !progress[id];
    setPending((current) => ({ ...current, [id]: true }));
    setSaveError('');
    try {
      const saved = await api.put(`/api/curriculum/progress/${encodeURIComponent(id)}`, { completed });
      setProgress((current) => {
        const next = { ...current };
        if (saved.completedAt) next[id] = saved.completedAt;
        else delete next[id];
        return next;
      });
    } catch (error) { setSaveError(`${error.message} Konu durumu değiştirilmedi.`); }
    finally { setPending((current) => { const next = { ...current }; delete next[id]; return next; }); }
  };

  const subjectProgress = selected ? progressOf([selected], exam, progress) : null;
  const subjectTopics = selected?.units.flatMap((unit) => unit.topics)||[];
  const categoryFor=row=>row.categoryId || (row.videoChild?'subtopic:'+row.parentId+':'+topicId(exam,selected.id,row.title):row.id);
  const curriculumRows=subjectTopics.map((title,index)=>({id:topicId(exam,selected.id,title),number:index+1,title,done:Boolean(progress[topicId(exam,selected.id,title)])}));
  const curriculumIds=new Set(curriculumRows.map(row=>row.id));
  const videoIds=new Set(curriculumRows.flatMap(row=>videoLessons(row.id).map(lesson=>'subtopic:'+row.id+':'+topicId(exam,selected.id,lesson.title))));
  const sourceRows=(metadata.data?.categories || []).filter(c=>c.selectable !== false && c.exam===exam && c.subjectId===selected.id && !curriculumIds.has(c.id)
    && !videoIds.has(c.id) && coverageById.has(c.id)).map(c=>({id:c.id,title:[c.topic,c.subtopic,c.detail].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join(' → '),source:true,number:'—',done:false}))
    .sort((a,b)=>a.title.localeCompare(b.title,'tr'));
  const rows=withVideoRows([...curriculumRows,...sourceRows],expandedVideos,{categories:metadata.data?.categories,exam,subjectId:selected.id});
  const toggleVideos=id=>setExpandedVideos(current=>({...current,[id]:!current[id]}));
  const allVideosExpanded=curriculumRows.every(row=>!videoLessons(row.id).length || expandedVideos[row.id]);
  const subjectQuestionCount=coverage.data?.summary.bankCounts?.CIKMIS || 0;
  const questionLink=(row,bank)=>{
    const id=categoryFor(row),count=coverageById.get(id)?.bankCounts?.[bank] || 0;
    return count?<Link to={(bank==='OGM'?'/soru-bankasi':'/cikmis-sorular')+qs({examType:exam,categoryId:[id]})}>{count.toLocaleString('tr-TR')} soru</Link>
      :<span className="muted small">{coverage.loading?'Sayılıyor…':'—'}</span>;
  };
  const nextTopic = rows.find(row => !row.videoChild && !row.source && !row.done)?.displayTitle;

  const columns = [
    {colId:'questionProgress',headerName:'İlk deneme / tekrar',minWidth:190,flex:1,wrapText:true,autoHeight:true,cellRenderer:({data:row})=>{
      const p=progressById.get(row && categoryFor(row));return p?<span>{p.total} tekil soru · {p.correct} doğru · {p.wrong} yanlış · {p.blank} boş<br/>{p.repeatAttempts} tekrar · {p.firstActiveSeconds} ilk deneme aktif saniyesi</span>:<span className="muted small">{questionProgress.loading?'Sayılıyor…':'Kayıt yok'}</span>;
    }},
    {colId:'sharedCoverage',headerName:'Tekil kaynak / doğrulanmış kapsam',minWidth:220,flex:1,wrapText:true,autoHeight:true,cellRenderer:({data:row})=>{
      const c=coverageById.get(row && categoryFor(row));if(!c)return <span className="muted small">{coverage.loading?'Sayılıyor…':coverage.error?'Alınamadı':'Ortak kaynak kaydı yok'}</span>;
      return <span>{c.QUESTION} soru · {c.PDF} PDF · {c.VIDEO} video · {c.NOTE} not<br/>{c.verifiedPdfPages} doğrulanmış sayfa · {c.verifiedVideoSeconds} saniye</span>;
    }},
    { colId:'sharedResources',headerName:'Ortak kaynaklar',minWidth:180,flex:1,autoHeight:true,cellRenderer:({data:row})=>{
      if(!row)return null;
      const categoryId=[categoryFor(row)];
      return <div className="curriculum-cell-links"><Link to={'/konular-ve-kaynaklar'+qs({exam,subject:selected.id,categoryId})}>PDF / video / not</Link>
        {<Link to={'/calisma/yeni'+qs({examType:exam,categoryId})}>Bu konudan pratik</Link>}</div>;
    }},
    { field: 'number', headerName: 'No', cellDataType: false, width: 48, minWidth: 48, maxWidth: 48, flex: 0, resizable: false,
      valueFormatter: ({ value }) => typeof value === 'number' ? `${value}.` : value },
    { field: 'displayTitle', headerName: 'Konu', minWidth: 130, flex: 1.6, autoHeight: true, wrapText: true,
      cellRenderer: ({ data: row }) => row && <div className="curriculum-topic-title">
        {row.videoChild && <small className="curriculum-source-mark">{row.parentTitle}</small>}
        <span>{row.displayTitle}</span>{row.source &&
          <small className="curriculum-source-mark">{row.unclassified ? 'Konu inceleme bekliyor' : 'Kaynak konu etiketi'}</small>}
        {row.lessons.length > 0 && <button type="button" className="curriculum-video-toggle"
          aria-expanded={Boolean(expandedVideos[row.id])} aria-label={`${row.displayTitle}: video alt konularını ${expandedVideos[row.id] ? 'gizle' : 'göster'}`}
          onClick={() => toggleVideos(row.id)}>{expandedVideos[row.id] ? '▾ Alt konuları gizle' : `▸ ${row.lessons.length} video alt konusu`}</button>}
      </div> },
    {colId:'pdfs',headerName:'Ders anlatımı PDF',minWidth:100,flex:.8,autoHeight:true,cellRenderer:({data:row})=>row &&
      (coverageById.get(categoryFor(row))?.PDF>0?<Link to={'/konular-ve-kaynaklar'+qs({exam,subject:selected.id,kind:'PDF',categoryId:[categoryFor(row)]})}>{coverageById.get(categoryFor(row)).PDF} PDF · sayfa aralıkları</Link>:<span className="muted small">{coverage.loading?'Sayılıyor…':'—'}</span>)},
    {colId:'questions',headerName:'Soru bankası',minWidth:100,flex:.9,cellRenderer:({data:row})=>row && questionLink(row,'OGM')},
    {colId:'cikmis',headerName:exam+' Çıkmış Sorular',minWidth:110,flex:1.2,cellRenderer:({data:row})=>row && questionLink(row,'CIKMIS')},
    { colId: 'videos', headerName: 'Ders videosu · QR ve link', minWidth: 160, maxWidth: 250, flex: 1.8, autoHeight: true,
      cellRenderer: ({ data: row }) => row?.videoChild ? <LessonVideos videos={row.videos} teacher={videoTeacher} lessonKey={`${row.parentId}:${topicId(exam,selected.id,row.title)}`}/>
        : row && <div className="curriculum-cell-links">
          {row.lessons.length > 0 ? <button type="button" className="curriculum-video-toggle"
            aria-expanded={Boolean(expandedVideos[row.id])}
            aria-label={`${row.displayTitle}: ders videolarını ${expandedVideos[row.id] ? 'gizle' : 'göster'}`}
            onClick={() => toggleVideos(row.id)}>
            {row.lessons.length} alt konu · {row.lessons.reduce((total, lesson) => total + lesson.videos.length, 0)} video
            <span>{expandedVideos[row.id] ? 'Videoları gizle ▴' : 'Videoları aç ▾'}</span>
          </button> : <span className="muted small">{row.source ? 'Konu eşleşmesi doğrulanınca eklenecek' : 'Henüz video eklenmedi'}</span>}
        </div> },
    { colId: 'done', headerName: 'Durum', width: 100, minWidth: 100, maxWidth: 100, flex: 0, resizable: false,
      autoHeight: true, wrapText: true,
      cellRenderer: ({ data: row }) => row?.videoChild ? <span className="muted small">Üst konuyla birlikte{row.done ? ' ✓' : ''}</span>
        : row?.source ? <span className="muted small">—</span> : row && <button type="button"
        className={`curriculum-done${row.done ? ' done' : ''}`} aria-pressed={row.done}
        aria-label={`${row.title}: ${row.done ? 'bitti, geri al' : 'bitti olarak işaretle'}`}
        disabled={Boolean(pending[row.id])} onClick={() => toggle(row.id)}>
        {pending[row.id] ? 'Kaydediliyor…' : row.done ? 'Bitti ✓' : 'Bitti'}
      </button> },
  ];

  if(metadata.loading)return <Loading text="Ortak üniteler yükleniyor…"/>;
  if(metadata.error)return <ErrorBox error={metadata.error} onRetry={metadata.retry}/>;
  return <div className="curriculum-page">
    <div className="page-head"><h1>Dersler ve Konuları</h1></div>
    <p className="muted lead">Sınavını ve dersini seç. Konuyu çalışıp soru pratiği yaptıktan sonra “Bitti” ile işaretle; gerekirse geri al. İlerlemen hesabına kaydedilir.</p>
    <label>İlerleme sınıflaması <select value={classification} onChange={e=>setClassification(e.target.value)}><option value="CURRENT">Güncel konu kapsamı</option><option value="HISTORICAL">İlk deneme anındaki etiketler</option></select></label>
    {questionProgress.data && <p className="muted small">Tüm derslerde {questionProgress.data.summary.total} tekil ilk deneme · {questionProgress.data.unclassified} sınıflaması bilinmeyen kayıt. Konu alt toplamları örtüşebilir; genel toplam soruyu bir kez sayar. Eski boş etiketler bugünün etiketleriyle doldurulmaz.</p>}
    {questionProgress.error && <ErrorBox error={questionProgress.error} onRetry={questionProgress.retry}/>}
    {coverage.data && <p className="muted small">{coverage.data.summary.resources} tekil kaynak · {coverage.data.summary.physicalAssets} fiziksel kaynak · {coverage.data.summary.references} konu referansı.
      Çok konulu kaynaklar konu alt toplamlarında tekrar görünebilir; genel toplamda bir kez sayılır. “Bitti” seçimi bağlı PDF/video parçalarını tamamlamaz. Sayfa okuma/izleme ilerlemesi kaydı yoktur.</p>}
    <div className="curriculum-exams" role="group" aria-label="Sınav seçimi">
      {['TYT', 'AYT'].map((value) => <button key={value} type="button"
        className={`curriculum-exam${exam === value ? ' selected' : ''}`}
        aria-pressed={exam === value} onClick={() => setExam(value)}>
        <strong>{value}</strong>
      </button>)}
    </div>

    {loading && <Loading text="Konu ilerlemen yükleniyor…" />}
    {loadError && <ErrorBox error={loadError} onRetry={load} />}
    {!loading && !loadError && <>
      {coverage.error && <ErrorBox error={coverage.error} onRetry={coverage.retry}/>}
      {metadata.error && <ErrorBox error={metadata.error} onRetry={metadata.retry}/>}

      <div className="curriculum-layout">
        <aside className="card curriculum-subjects" aria-label={`${exam} dersleri`}>
          <h2>{exam} dersleri</h2>
          <p className="muted small">Bir ders seçerek konularını aç.</p>
          {subjects.map((entry) => {
            const topics = Object.values(entry.topicIds).map(id=>({id}));
            const done = topics.filter((topic) => progress[topic.id]).length;
            return <button key={entry.id} type="button"
              className={`curriculum-subject${selected?.id === entry.id ? ' selected' : ''}`}
              aria-current={selected?.id === entry.id ? 'true' : undefined}
              onClick={() => setSubject(entry.id)}>
              <span><strong>{entry.name}</strong><small>{entry.area}</small></span>
              <span className="curriculum-subject-count">{countTopics(entry)} konu · {done} bitti</span>
              <ProgressBar done={done} total={countTopics(entry)} />
            </button>;
          })}
        </aside>

        <div className="curriculum-detail">
          <>
            {saveError && <p className="alert alert-error" role="alert">{saveError}</p>}
            {selected.id === 'fizik' && <div className="curriculum-video-tools">
              <label>Video hocası <select value={videoTeacher} onChange={(event) => setVideoTeacher(event.target.value)}>
                <option value="all">İki hoca</option><option value="ozcan">Özcan Aykın</option><option value="altug">Altuğ Güneş</option>
              </select></label>
              <button type="button" className="curriculum-video-toggle" onClick={() => setExpandedVideos((current) => ({
                ...current, ...Object.fromEntries(curriculumRows.map((row) => [row.id, !allVideosExpanded])),
              }))}>{allVideosExpanded ? 'Video alt konularını kapat' : 'Tüm video alt konularını aç'}</button>
              <p className="muted small">Konuyu aç; hocanı seçip bağlantıya tıkla veya QR kodunu okut. Alt konuların ilerlemesi üst konuyla birlikte kaydedilir.</p>
            </div>}
            <div className="card table-card tracking-scroll worksheet-frame curriculum-sheet">
              <DataGrid mode="worksheet" scrollable rowData={rows} columnDefs={columns}
                gridOptions={{ getRowId: ({ data }) => data.id,
                  rowClassRules: { 'curriculum-row-done': ({ data }) => Boolean(data?.done),
                    'curriculum-video-child': ({ data }) => Boolean(data?.videoChild) } }} />
            </div>
            <section className="card curriculum-detail-head">
              <div className="page-head"><h2>{exam} · {selected.name}</h2><strong>%{percent(subjectProgress.done, subjectProgress.total)}</strong></div>
              <ProgressBar {...subjectProgress} />
              <p className="muted small">{subjectProgress.done} / {subjectProgress.total} konu bitti</p>
              <p className="muted small">{coverage.loading?'Çıkmış sorular sayılıyor…':coverage.error?'Çıkmış soru sayısı alınamadı.':subjectQuestionCount.toLocaleString('tr-TR')+' tekil çıkmış soru · '+sourceRows.length+' ortak kaynak konusu ayrıca listelendi'}</p>
              {nextTopic && <p className="curriculum-next">Sıradaki konu: <strong>{nextTopic}</strong></p>}
              {!nextTopic && <p className="curriculum-next">Bu dersteki bütün konuları tamamladın.</p>}
            </section>
            <p className="muted small curriculum-link-note">{exam} Çıkmış Sorular sütunu yalnız seçili sınavın çıkmış sorularını açar. Müfredatla güvenilir biçimde eşleşmeyen kaynak konu etiketleri ayrı satırlardadır; “Konu sınıflandırılmamış” soruların konusu henüz doğrulanmamıştır. Konuları tablonun içinde aşağı kaydır; dar ekranda diğer sütunlar için sağa kaydır.</p>
          </>
        </div>
      </div>
      <p className="curriculum-sources muted small">Konu listesi çalışma amaçlı düzenlendi. Kaynaklar: <a href="https://ogmmateryal.eba.gov.tr/mebi-konu-ozetleri" target="_blank" rel="noreferrer">MEB OGM Materyal konu özetleri</a> · <a href="https://ogmmateryal.eba.gov.tr/yks-konu-anlatim" target="_blank" rel="noreferrer">YKS konu anlatımları</a> · <a href="https://www.osym.gov.tr/SinavGrubu/Menu/317" target="_blank" rel="noreferrer">ÖSYM YKS kılavuzları</a>.</p>
    </>}
  </div>;
}
