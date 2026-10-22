import { useEffect,useId,useState } from 'react';
import {loadSharedCatalog} from './SharedCategorySelect.jsx';
import SharedResourceSelect from './SharedResourceSelect.jsx';
import {Link} from 'react-router-dom';
import { CURRICULUM } from '../curriculum.js';
import { assignmentSummary, blankLearning, ERROR_TYPES, MASTERY, scoreSummary } from '../mathLearning.js';
import { categoryTopic } from '../categorySelection.js';

function Field({ label, value, onChange, type = 'text', ...props }) {
  return <label className="math-learning-field"><span>{label}</span>
    <input type={type} value={value ?? ''} onChange={(event) => onChange(event.target.value)} {...props} /></label>;
}

function ScoreFields({ title, value, onChange }) {
  const summary = scoreSummary(value);
  return <fieldset><legend>{title}</legend><div className="math-score-fields">
    {[['correct', 'Doğru'], ['wrong', 'Yanlış'], ['blank', 'Boş']].map(([key, label]) =>
      <Field key={key} label={`${title} · ${label}`} type="number" min="0" max="10000" step="1" value={value?.[key]}
        onChange={(next) => onChange({ ...value, [key]: next })} />)}
    </div><p className="muted small">{summary ? `${summary.total} soru · Başarı %${summary.success}` : 'Değerlendirme yok. Sonuç girerken sıfırları da yazın.'}</p>
  </fieldset>;
}

export default function MathLearningPanel({ item, actions }) {
  const [catalog,setCatalog]=useState(null);
  useEffect(()=>{let active=true;loadSharedCatalog().then(v=>{if(active)setCatalog(v);}).catch(()=>{});return()=>{active=false;};},[]);
  const topicList = useId();
  const learning = { ...blankLearning(), ...item.learning };
  const set = (field, value) => actions.current.setLearningField(item, field, value);
  const assignment = learning.assignment ?? {};
  const setAssignment = (field, value) => set('assignment', { ...assignment, [field]: value });
  const homework = assignmentSummary(assignment);
  const homeworkScore = scoreSummary(assignment);
  const topics = CURRICULUM[learning.examType].find((subject) => subject.id === (learning.branch === 'GEOMETRY' ? 'geometri' : 'matematik'));
  const before = scoreSummary(learning.beforeTest);
  const after = scoreSummary(learning.afterTest);
  return <section className="math-learning-panel" aria-label={`${item.isNew ? 'Yeni ders' : `Ders ${item.number}`} öğrenme takibi`}>
    <div className="page-head"><h3>{item.isNew ? 'Yeni ders' : `${item.number}. ders`} · Öğrenme takibi</h3>
      <button type="button" className="btn btn-secondary" onClick={() => actions.current.toggleDetails(item)}>Ayrıntıları kapat</button></div>
    <fieldset className="math-learning-editor" disabled={item.busy}>
      <div className="math-learning-sections">
        <fieldset><legend>Konu ve hedef</legend>
          <label className="math-learning-field"><span>Kaynaklara bağlı konu</span><select value={learning.categoryId || ''} onChange={e=>set('categoryId',e.target.value || null)}>
            <option value="">{catalog?'Konu seç…':'Konular yükleniyor…'}</option>{(catalog?.categories || []).filter(c=>c.exam===learning.examType
              && c.subjectId===(learning.branch==='GEOMETRY'?'geometri':'matematik') && (c.origin==='CURRICULUM' || c.parentId))
              .map(c=><option key={c.id} value={c.id}>{categoryTopic(c)}</option>)}</select></label>
          {!learning.categoryId && item.topic && <p className="muted small">Ders başlığınız korundu; kaynak ve konu takibi için ortak konu seçimi bekliyor.</p>}
          <SharedResourceSelect value={learning.resourceKeys || []} categoryId={learning.categoryId?[learning.categoryId]:[]} onChange={value=>set('resourceKeys',value)}/>
          {learning.categoryId && <Link to={'/konular-ve-kaynaklar?categoryId='+encodeURIComponent(learning.categoryId)}>Konuya bağlı kaynakları aç</Link>}
          <div className="math-learning-pair">
            <label className="math-learning-field"><span>Sınav türü</span><select value={learning.examType} onChange={(event) => set('examType', event.target.value)}>
              <option value="TYT">TYT</option><option value="AYT">AYT</option></select></label>
            <label className="math-learning-field"><span>Branş</span><select value={learning.branch} onChange={(event) => set('branch', event.target.value)}>
              <option value="MATHEMATICS">Matematik</option><option value="GEOMETRY">Geometri</option></select></label>
          </div>
          <Field label="Konu" value={item.topic} maxLength={1000} list={topicList} onChange={(value) => actions.current.setField(item, 'topic', value)} />
          <datalist id={topicList}>{topics.units.flatMap((unit) => unit.topics).map((topic) => <option key={topic} value={topic} />)}</datalist>
          <Field label="Alt konu" value={learning.subtopic} maxLength={1000} placeholder="Örn. bileşke fonksiyon" onChange={(value) => set('subtopic', value)} />
          <Field label="Ders hedefi" value={learning.goal} maxLength={2000} onChange={(value) => set('goal', value)} />
          <label className="math-learning-field"><span>Konu seviyesi</span><select value={learning.mastery} onChange={(event) => set('mastery', event.target.value)}>
            {MASTERY.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <p className="muted small">Listeden seçebilir veya kendi konunuzu yazabilirsiniz. Seviyeyi test ve tekrar sonuçlarına göre belirleyin.</p>
        </fieldset>
        <div className="math-learning-tests">
          <ScoreFields title="Ön test" value={learning.beforeTest} onChange={(value) => set('beforeTest', value)} />
          <ScoreFields title="Son test" value={learning.afterTest} onChange={(value) => set('afterTest', value)} />
          {before && after && <p className="math-learning-change">Başarı değişimi: {after.success - before.success > 0 ? '+' : ''}{after.success - before.success} yüzde puan</p>}
        </div>
        <fieldset><legend>Ödev takibi</legend>
          <Field label="Verilen soru" type="number" min="0" max="10000" step="1" value={assignment.given} onChange={(value) => setAssignment('given', value)} />
          <div className="math-score-fields">{[['correct', 'Ödev · Doğru'], ['wrong', 'Ödev · Yanlış'], ['blank', 'Ödev · Boş']].map(([key, label]) =>
            <Field key={key} label={label} type="number" min="0" max="10000" step="1" value={assignment[key]} onChange={(value) => setAssignment(key, value)} />)}</div>
          <p className="muted small">{homework ? `${homework.solved} / ${homework.given} soru çözüldü · Tamamlama %${homework.completion}` : 'Verilen soru sayısını girin.'}
            {homeworkScore && ` · Başarı %${homeworkScore.success}`} Çözülen = doğru + yanlış.</p>
          <div className="math-learning-pair">
            <Field label="Ödev verilme tarihi" type="date" value={assignment.assignedDate} onChange={(value) => setAssignment('assignedDate', value)} />
            <Field label="Ödev teslim tarihi" type="date" value={assignment.dueDate} min={assignment.assignedDate || undefined} onChange={(value) => setAssignment('dueDate', value)} />
          </div>
          <Field label="Kaynak / test / soru numaraları" value={assignment.source} maxLength={1000} onChange={(value) => setAssignment('source', value)} />
        </fieldset>
        <fieldset><legend>Yanlış analizi</legend><div className="math-error-types">
          {ERROR_TYPES.map(([key, label]) => <label key={key}><input type="checkbox" checked={learning.errorTypes.includes(key)}
            onChange={(event) => set('errorTypes', event.target.checked ? [...learning.errorTypes, key] : learning.errorTypes.filter((value) => value !== key))} />{label}</label>)}
          </div><p className="muted small">Birden fazla hata türü seçebilirsiniz.</p>
        </fieldset>
        <fieldset><legend>Tekrar ve sonraki adım</legend>
          <Field label="Tekrar tarihi" type="date" value={learning.reviewDate} onChange={(value) => set('reviewDate', value)} />
          <ScoreFields title="Tekrar testi" value={learning.reviewTest} onChange={(value) => set('reviewTest', value)} />
          <label className="math-review-done"><input type="checkbox" checked={learning.reviewDone} onChange={(event) => set('reviewDone', event.target.checked)} />Tekrar tamamlandı</label>
          <Field label="Sonraki adım" value={learning.nextStep} maxLength={2000} placeholder="Tekrar, yeni konu veya zor soru" onChange={(value) => set('nextStep', value)} />
        </fieldset>
      </div>
      <div className="math-learning-footer"><button type="button" className="btn btn-primary"
        onClick={() => item.isNew ? actions.current.create() : actions.current.save()}>Tüm değişiklikleri kaydet</button>
        <span className="muted small">Diğer derslerdeki değişiklikler de birlikte kaydedilir.</span></div>
    </fieldset>
  </section>;
}
