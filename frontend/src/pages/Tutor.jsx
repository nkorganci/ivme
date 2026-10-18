import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAsync, usePageTitle } from '../hooks.js';
import { ErrorBox, Loading } from '../components/States.jsx';
import { DIFFICULTY, MASTERY, OUTCOME, TEMPLATE, dueNow, formatDate, groupByBranch, masteryPercent } from '../tutor/tutorLabels.js';
import './Tutor.css';

const LOOP = [
  ['Önce sen dene', 'Hazırsan yardımsız başla; yeni kalıplarda önce büyük fikri görürsün.'],
  ['Tek tek ipucu', 'Kavram → strateji → ilk adım. Hiçbiri cevabı söylemez.'],
  ['Hatanı anla', 'Yanlış şık, hangi düşünceden geldiğini söyler; onu düzeltip yeniden denersin.'],
  ['Neden?', 'Doğru cevaptan sonra kilit adımın gerekçesini seçer ya da kendi cümlenle yazarsın.'],
  ['Mantığını gör', 'Görselde önce tahmin eder, sonra adım adım izlersin.'],
  ['İkiz soru', 'Aynı derin yapı, farklı yüzey: yardımsız çözmek kalıbın yerleştiğini gösterir.'],
];

function MasteryBar({ value, level }) {
  const percent = masteryPercent(value);
  if (percent == null) return <span className="badge badge-muted">Henüz çalışılmadı</span>;
  return <span className="tutor-mastery" title={`Ustalık tahmini %${percent}`}>
    <span className="tutor-mastery-track"><span className="tutor-mastery-fill" style={{ width: `${percent}%` }} /></span>
    <span className="tutor-mastery-text">{MASTERY[level] ?? level} · %{percent}</span>
  </span>;
}

function ItemCard({ item }) {
  const last = item.lastSession;
  const action = last?.status === 'OPEN' ? 'Devam et' : last ? 'Yeniden çalış' : 'Başla';
  return <article className="card tutor-item">
    <header>
      <span className="badge badge-primary">{item.exam}</span>
      <span className="badge badge-muted">{DIFFICULTY[item.difficulty] ?? item.difficulty}</span>
      {item.visual && <span className="badge badge-ok" title="Bu soruda görsel/animasyon var">{TEMPLATE[item.visual] ?? 'Görsel'}</span>}
      {item.contentStatus !== 'APPROVED' && <span className="badge badge-warn" title="Otomatik doğrulandı; öğretmen onayı bekliyor">Pilot</span>}
    </header>
    <h3>{item.unitName}</h3>
    <p className="muted tutor-item-sub">{item.subtopic}</p>
    <p className="tutor-item-pattern"><strong>Kalıp:</strong> {item.patternName}</p>
    <MasteryBar value={item.mastery} level={item.masteryLevel} />
    {last?.outcome && <p className="tutor-item-last">Son oturum: {OUTCOME[last.outcome] ?? last.outcome}</p>}
    {item.nextReviewAt && <p className={`tutor-item-last${dueNow(item.nextReviewAt) ? ' due' : ''}`}>
      {dueNow(item.nextReviewAt) ? 'Tekrar zamanı geldi' : `Sonraki tekrar: ${formatDate(item.nextReviewAt)}`}</p>}
    <Link className="btn btn-primary btn-block" to={`/akilli-ogretmen/${encodeURIComponent(item.code)}`}>{action}</Link>
  </article>;
}

export default function Tutor() {
  usePageTitle('Akıllı Öğretmen');
  const catalog = useAsync(() => api.get('/api/tutor/catalog'), []);
  const skills = useAsync(() => api.get('/api/tutor/skills'), []);
  const [branch, setBranch] = useState('all');
  const groups = useMemo(() => groupByBranch(catalog.data?.items), [catalog.data]);
  if (catalog.loading) return <Loading text="Öğretim içerikleri yükleniyor…" />;
  if (catalog.error) return <ErrorBox error={catalog.error} onRetry={catalog.retry} />;
  const due = (catalog.data.items ?? []).filter((item) => dueNow(item.nextReviewAt));
  const shown = branch === 'all' ? groups : groups.filter((group) => group.subjectId === branch);
  return <div className="tutor-page">
    <div className="page-head"><h1>Akıllı Öğretmen</h1>
      <span className="muted">{catalog.data.items.length} soru · {groups.length} branş</span></div>
    <section className="card tutor-intro">
      <p className="lead">Cevabı ezberlemek yerine <strong>hangi durumda nasıl düşüneceğini</strong> öğren. Her soru kısa bir öğretim döngüsüdür; yardım sen ilerledikçe azalır.</p>
      <ol className="tutor-loop">{LOOP.map(([title, text]) => <li key={title}><strong>{title}</strong><span>{text}</span></li>)}</ol>
      {catalog.data.visibility === 'PILOT' && <p className="muted tutor-note">Pilot: içerikler bağımsız doğrulayıcıdan (cevap anahtarı, hesap denetimi, sızıntı taraması) geçti.
        “Pilot” işaretli olanlar ayrıca öğretmen onayı bekliyor; hata görürsen geri bildirim gönder.</p>}
    </section>
    {due.length > 0 && <section className="card tutor-due">
      <h2>Tekrar zamanı gelenler</h2>
      <p className="muted">Aralıklı tekrar kalıcılığı artırır. Farklı kalıpları karışık çalışmak, “hangi yöntem ne zaman” becerisini güçlendirir.</p>
      <div className="tutor-due-list">{due.map((item) => <Link key={item.code} className="btn btn-secondary" to={`/akilli-ogretmen/${encodeURIComponent(item.code)}`}>
        {item.patternName}</Link>)}</div>
    </section>}
    <nav className="tabs study-tabs tutor-branches" aria-label="Branş seç">
      <a href="#tum" className={branch === 'all' ? 'active' : ''} onClick={(e) => { e.preventDefault(); setBranch('all'); }}>Bütün branşlar</a>
      {groups.map((group) => <a key={group.subjectId} href={`#${group.subjectId}`} className={branch === group.subjectId ? 'active' : ''}
        onClick={(e) => { e.preventDefault(); setBranch(group.subjectId); }}>{group.name}&nbsp;<span className="muted">({group.items.length})</span></a>)}
    </nav>
    {shown.map((group) => <section key={group.subjectId} className="tutor-branch" aria-labelledby={`b-${group.subjectId}`}>
      <h2 id={`b-${group.subjectId}`}>{group.name}</h2>
      <div className="tutor-grid">{group.items.map((item) => <ItemCard key={item.code} item={item} />)}</div>
    </section>)}
    <section className="card tutor-skills">
      <h2>Beceri kaydım</h2>
      <p className="muted">Ustalık, yardımsız doğrular, ipucu kullanımı, gerekçe seçimleri ve ikiz soru sonuçlarından tahmin edilir; tek bir doğru, konuyu bildiğin anlamına gelmez.</p>
      {skills.loading ? <Loading text="Beceri kaydı yükleniyor…" /> : skills.error ? <ErrorBox error={skills.error} /> :
        skills.data.length === 0 ? <p>Henüz kayıt yok. İlk oturumunu tamamladığında burada görünür.</p> :
          <ul className="tutor-skill-list">{skills.data.map((skill) => <li key={skill.skillKey}>
            <strong>{skill.name}</strong>
            <MasteryBar value={skill.mastery} level={skill.level} />
            <span className="muted">Yardımsız {skill.independentCorrect} · yardımla {skill.assistedCorrect} · ikiz {skill.transferCorrect} · ipucu {skill.hintsUsed}</span>
            {skill.nextReviewAt && <span className={dueNow(skill.nextReviewAt) ? 'tutor-due-text' : 'muted'}>
              {dueNow(skill.nextReviewAt) ? 'Tekrar zamanı geldi' : `Sonraki tekrar: ${formatDate(skill.nextReviewAt)}`}</span>}
          </li>)}</ul>}
    </section>
  </div>;
}
