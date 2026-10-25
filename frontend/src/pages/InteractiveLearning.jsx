import { Link } from 'react-router-dom';
import { usePageTitle } from '../hooks.js';
import { PATTERNS, PLANNED_UNITS, STUDIO, TASKS, UNIT } from '../interactive/motion/content.js';
import { useUnitProgress } from '../interactive/progress.js';
import '../interactive/interactive.css';

const METHOD = [
  ['Gör', 'Olayı canlı izle: araç yolda, iz noktaları, hız ve ivme okları, üç grafik aynı anda.'],
  ['Değiştir', 'Hız grafiğini elinle sürükle; konum, ivme ve sahne anında değişsin.'],
  ['Tahmin et', 'Oynatmadan önce kararını ver; simülasyon tahminini sınasın.'],
  ['Modele dök', 'Soruyu laboratuvara aktar: her soru, aynı laboratuvarın bir ayarıdır.'],
  ['Kalıbı yakala', 'Soruda gördüğün işaret → laboratuvarda bakacağın yer → tek cümlelik kural.'],
  ['Aktar', 'İkiz soruyu simülasyonsuz, yardımsız çöz.'],
];

/** İnteraktif Öğrenme girişi: yöntem ve üniteler. */
export default function InteractiveLearning() {
  usePageTitle('İnteraktif Öğrenme');
  const [progress] = useUnitProgress(`${UNIT.subject}-${UNIT.id}`);
  const studioDone = STUDIO.filter((s) => progress.studio[s.id]?.done).length;
  const tasksDone = TASKS.filter((t) => progress.tasks[t.id]).length;
  const pastCount = STUDIO.filter((s) => s.source).length;
  return <div className="il-page">
    <div className="page-head"><h1>İnteraktif Öğrenme</h1><span className="muted">Simülasyonla konu öğren, soruyu modele dökerek çöz</span></div>
    <section className="card il-intro">
      <p className="lead">Fizik formülle değil, olayla başlar. Burada her ünite tek bir <strong>laboratuvar</strong> etrafında kurulur:
        önce olayı görür ve değiştirirsin, sonra çıkmış soruları aynı laboratuvara aktararak çözersin. Böylece soru "ezber kalıp" olmaktan çıkar,
        <strong> gördüğün bir olayın sorusu</strong> olur.</p>
      <ol className="il-method">{METHOD.map(([title, text]) => <li key={title}><strong>{title}</strong><span>{text}</span></li>)}</ol>
      <p className="muted small">Neden böyle? Hareketi ve grafiğini eşzamanlı görmek (gerçek zamanlı grafikli deneyler, PhET benzeri simülasyonlar) grafik okuma
        yanılgılarını azaltır; tahmin et → gözle → açıkla döngüsü ve ikiz soruyla aktarım kalıcılığı artırır.</p>
    </section>
    <h2 className="section-title">Üniteler</h2>
    <div className="il-units">
      <article className="card il-unit ready">
        <header><span className="badge badge-ok">Hazır</span><span className="badge badge-primary">{UNIT.subjectName}</span></header>
        <h3>{UNIT.title}</h3>
        <p className="muted small">{UNIT.exams}</p>
        <p>{UNIT.summary}</p>
        <ul className="il-stats">
          <li><strong>{STUDIO.length}</strong> stüdyo sorusu ({pastCount} çıkmış soru)</li>
          <li><strong>{TASKS.length}</strong> görev</li>
          <li><strong>{PATTERNS.length}</strong> soru kalıbı</li>
        </ul>
        {(studioDone > 0 || tasksDone > 0) && <p className="small">İlerlemen: {studioDone}/{STUDIO.length} soru · {tasksDone}/{TASKS.length} görev</p>}
        <Link className="btn btn-primary btn-block" to={`/interaktif-ogrenme/${UNIT.subject}/${UNIT.id}`}>Üniteye gir</Link>
      </article>
      {PLANNED_UNITS.map((unit) => <article key={unit.title} className="card il-unit planned" aria-disabled="true">
        <header><span className="badge badge-muted">Sırada</span><span className="badge badge-primary">{unit.subject}</span></header>
        <h3>{unit.title}</h3>
        <p>{unit.idea}</p>
      </article>)}
    </div>
  </div>;
}
