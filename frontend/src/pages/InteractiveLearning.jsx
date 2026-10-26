import { Link, useSearchParams } from 'react-router-dom';
import { usePageTitle } from '../hooks.js';
import { SUBJECTS, pastQuestionsOf, subjectOf, unitsOf } from '../interactive/registry.js';
import '../interactive/interactive.css';

const METHOD = [
  ['Gör', 'Olayı canlı izle: hareket, grafik, tanecik, harita ya da metin yapısı.'],
  ['Değiştir', 'Kendi değerlerini gir ya da sürükle; denklem, grafik ve sonuç anında değişsin.'],
  ['Tahmin et', 'Soruyu çözmeden önce kararını ver.'],
  ['Laboratuvarda kur', 'Sınav sorusunu laboratuvara aktar: her soru aynı ortamın bir ayarıdır.'],
  ['Kalıbı yakala', 'Soruda gördüğün işaret → bakacağın yer → tek cümlelik kural.'],
  ['Aktar', 'Benzer soruyu yardımsız çöz; çıkmış sorularla dene.'],
];

/** İnteraktif Öğrenme girişi: yöntem ve ders seçimi; seçilen dersin interaktifleri aşağıda listelenir. */
export default function InteractiveLearning() {
  usePageTitle('İnteraktif Öğrenme');
  const [params, setParams] = useSearchParams();
  const subject = subjectOf(params.get('ders')) ?? SUBJECTS[0];
  const units = unitsOf(subject.id);
  return <div className="il-page">
    <div className="page-head"><h1>İnteraktif Öğrenme</h1><span className="muted">Konuyu simülasyonla öğren, soruyu laboratuvarda çöz</span></div>
    <section className="card il-intro">
      <p className="lead">Her ünite tek bir <strong>laboratuvar</strong> etrafında kurulur: değerleri sen verirsin, grafik, denklem ve sonuç kendiliğinden değişir.
        TYT–AYT soruları aynı laboratuvara aktarılarak çözülür; böylece soru ezber kalıp olmaktan çıkar, <strong>gördüğün bir olayın sorusu</strong> olur.</p>
      <ol className="il-method">{METHOD.map(([title, text]) => <li key={title}><strong>{title}</strong><span>{text}</span></li>)}</ol>
    </section>

    <section className="il-subjects" aria-labelledby="il-dersler">
      <h2 id="il-dersler" className="section-title">Dersler</h2>
      <nav className="tabs study-tabs il-subject-tabs" aria-label="Ders seç">
        {SUBJECTS.map((s) => <a key={s.id} href={`?ders=${s.id}`} className={s.id === subject.id ? 'active' : ''} aria-current={s.id === subject.id ? 'page' : undefined}
          onClick={(e) => { e.preventDefault(); setParams({ ders: s.id }, { replace: true }); }}>{s.name}&nbsp;<span className="il-count">{unitsOf(s.id).length}</span></a>)}
      </nav>
      <p className="muted il-subject-blurb">{subject.blurb}</p>
      <div className="il-units">
        {units.map((unit) => {
          const past = pastQuestionsOf(unit);
          return <article key={unit.id} className="card il-unit ready">
            <header><span className="badge badge-primary">{unit.exam}</span>{past.length > 0 && <span className="badge badge-muted">{past.length} çıkmış soru</span>}</header>
            <h3>{unit.title}</h3>
            {unit.topics && <p className="muted small">{unit.topics}</p>}
            <p>{unit.summary}</p>
            <Link className="btn btn-primary btn-block" to={`/interaktif-ogrenme/${unit.subject}/${unit.id}`}>Aç</Link>
          </article>;
        })}
        {units.length === 0 && <p className="muted">Bu dersin interaktifleri hazırlanıyor.</p>}
      </div>
    </section>
  </div>;
}
