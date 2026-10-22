import { useMemo, useState } from 'react';
import labels from '../../../backend/src/main/resources/review-vocabulary.json' with { type: 'json' };
import { categoryLabel } from '../reviewSelection.js';
import { normaliseTopic } from '../curriculumLinks.js';
import { categoryTopic } from '../categorySelection.js';

const SHORT_FORMAT = { KONU_ANLATIMI: 'Anlatım', KONU_OZETI: 'Özet', SORU: 'Soru', COZUMLU_ORNEK: 'Çözümlü örnek', TEST: 'Test', DENEME: 'Deneme', KARMA: 'Karma', UYGULANMAZ: 'Uygulanmaz' };
const SHORT_SKILL = { BILGI: 'Bilgi', KAVRAMA: 'Kavrama', UYGULAMA: 'Uygulama', ANALIZ: 'Analiz', YORUMLAMA: 'Yorum', AKIL_YURUTME: 'Akıl yürütme', HESAPLAMA: 'Hesap', DENEY: 'Deney', PROBLEM_COZME: 'Problem çözme' };
const SHORT_RELATION = { PRIMARY: 'Doğrudan', SECONDARY: 'İkincil', PREREQUISITE: 'Ön bilgi' };

export function LabelChoices({ title, options, selected, onSelect, short = {} }) {
  return <fieldset className="review-choice-group"><legend>{title}</legend><div className="review-choices">
    {Object.entries(options).map(([id, name]) => <button key={id} type="button" className={`review-choice${selected.includes(id) ? ' selected' : ''}`}
      aria-pressed={selected.includes(id)} aria-label={`${title}: ${name}`} title={name} onClick={() => onSelect(id)}>
      {selected.includes(id) && <span aria-hidden="true">✓ </span>}{short[id] || name}
    </button>)}
  </div></fieldset>;
}

export default function ReviewLabels({ decision, patch, catalog, item }) {
  const firstCategory = catalog.categories.find(c => c.id === decision.assignments[0]?.categoryId);
  const [branch, setBranch] = useState(firstCategory?.subjectId || item.subjectId || 'fizik');
  const [exam, setExam] = useState(firstCategory?.exam || (item.exam === 'AYT' ? 'AYT' : 'TYT'));
  const [search, setSearch] = useState('');
  const [relation, setRelation] = useState('PRIMARY');
  const [showAll, setShowAll] = useState(true);
  const byId = useMemo(() => new Map(catalog.categories.map(c => [c.id, c])), [catalog]);
  const currentTopic = normaliseTopic(item.topic);
  const options = catalog.categories.filter(c => c.selectable !== false && c.subjectId === branch && c.exam === exam
    && (showAll || search || branch !== item.subjectId || normaliseTopic(c.topic) === currentTopic)
    && categoryLabel(c).toLocaleLowerCase('tr-TR').includes(search.toLocaleLowerCase('tr-TR')))
    .sort((a,b)=>(a.order || 999)-(b.order || 999));
  const groups = new Map();
  options.forEach(c => { if (!groups.has(c.topic)) groups.set(c.topic, []); groups.get(c.topic).push(c); });
  const selectedIds = new Set(decision.assignments.map(a => a.categoryId));
  const optionIds = new Set(options.map(c => c.id));
  const groupCount = Math.min(50 - decision.assignments.length, options.filter(c => !selectedIds.has(c.id)).length);
  const toggle = id => patch({ assignments: decision.assignments.some(a => a.categoryId === id)
    ? decision.assignments.filter(a => a.categoryId !== id)
    : [...decision.assignments.filter(a => !a.categoryId.startsWith(`system.${branch}.`)), { categoryId: id, relation }].slice(0, 50) });
  const selectGroup = () => {
    const selected = new Set(decision.assignments.map(a => a.categoryId));
    patch({ assignments: [...decision.assignments.filter(a=>!a.categoryId.startsWith(`system.${branch}.`)), ...options.filter(c => !selected.has(c.id)).map(c => ({ categoryId: c.id, relation }))].slice(0, 50) });
  };
  const toggleSkill = id => patch({ skills: decision.skills.includes(id) ? decision.skills.filter(s => s !== id) : [...decision.skills, id] });
  const toggleGrade = id => { const grade = Number(id); patch({ grades: decision.grades.includes(grade) ? decision.grades.filter(g => g !== grade) : [...decision.grades, grade] }); };

  return <>
    <section className="review-panel review-topics" aria-label="Konu eşleşmeleri">
      <h3><span className="review-step">1</span>Konu / alt konu <small>{decision.assignments.length} seçili</small></h3>
      <div className="review-topic-toolbar">
        <select aria-label="Etiketin branşı" value={branch} onChange={e => { setBranch(e.target.value); setShowAll(true); }}>
          {catalog.branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <div className="review-choices" aria-label="Etiketin sınavı">{['TYT', 'AYT'].map(e => <button key={e} type="button" className={`review-choice${exam === e ? ' selected' : ''}`}
          aria-pressed={exam === e} onClick={() => setExam(e)}>{e}</button>)}</div>
      </div>
      <div className="review-topic-search"><input type="search" aria-label="Konu / alt konu ara" placeholder="Konu veya alt konu ara…" value={search} onChange={e => setSearch(e.target.value)} />
        <button type="button" className="review-text-button" aria-pressed={showAll} onClick={() => setShowAll(v => !v)}>{showAll ? 'İlgili konular' : 'Tüm konular'}</button></div>
      {options.length > 1 && <div className="review-group-actions"><button type="button" className="review-text-button review-select-group" disabled={!groupCount} onClick={selectGroup}>
        {groupCount ? `Grubu seç (+${groupCount})` : options.some(c => !selectedIds.has(c.id)) ? '50 etiket sınırı' : 'Grup seçili'}</button>
        {options.some(c => selectedIds.has(c.id)) && <button type="button" className="review-text-button" onClick={() => patch({ assignments: decision.assignments.filter(a => !optionIds.has(a.categoryId)) })}>Grubu temizle</button>}
      </div>}
      <div className="review-topic-options" aria-label="Konu seçenekleri">{[...groups].map(([topic, categories]) => <div key={topic} className="review-topic-group">
        {categories.length > 1 && <span className="review-topic-heading">{categoryTopic(categories[0])}</span>}
        <div className="review-choices">{categories.map(c => {
          const selected = decision.assignments.some(a => a.categoryId === c.id);
          return <button key={c.id} type="button" className={`review-choice review-category${selected ? ' selected' : ''}`} aria-pressed={selected}
            aria-label={categoryLabel(c)} disabled={!selected && decision.assignments.length >= 50}
            title={`${categoryLabel(c)}${c.origin === 'SOURCE' ? ' · Kaynak etiketi' : ''}`} onClick={() => toggle(c.id)}>
            {selected && <span aria-hidden="true">✓ </span>}{c.grade && <small>{c.grade}. sınıf · </small>}{categoryTopic(c)}{c.origin === 'SOURCE' && <small> · Kaynak</small>}
          </button>;
        })}</div>
      </div>)}{options.length === 0 && <p className="small muted">Eşleşme yok. Tüm konuları açın veya başka bir branş seçin.</p>}</div>
      <label className="review-relation">Yeni seçim: <select aria-label="Yeni seçimlerin ilişkisi" value={relation} onChange={e => setRelation(e.target.value)}>
        {Object.entries(SHORT_RELATION).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
      </select></label>
      <div className="review-selected-categories" aria-label="Seçili konu eşleşmeleri">{decision.assignments.map(a => <div key={a.categoryId} className="review-selected-category">
        <span title={byId.has(a.categoryId) ? categoryLabel(byId.get(a.categoryId)) : a.categoryId}>✓ {byId.has(a.categoryId) ? categoryLabel(byId.get(a.categoryId)) : 'Kaldırılmış etiket'}</span>
        <select aria-label={`${byId.get(a.categoryId)?.topic || a.categoryId} eşleşme ilişkisi`} value={a.relation}
          onChange={e => patch({ assignments: decision.assignments.map(current => current.categoryId === a.categoryId ? { ...current, relation: e.target.value } : current) })}>
          {Object.entries(SHORT_RELATION).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select><button type="button" aria-label={`${byId.get(a.categoryId)?.topic || a.categoryId} eşleşmesini kaldır`} onClick={() => toggle(a.categoryId)}>×</button>
      </div>)}</div>
    </section>
    <section className="review-panel review-common" aria-label="Ortak etiketler">
      <h3><span className="review-step">2</span>Ortak etiketler</h3>
      <LabelChoices title="Zorluk" options={labels.difficulty} selected={[decision.difficulty]} onSelect={difficulty => patch({ difficulty })} short={{ UYGULANMAZ: 'Uygulanmaz' }} />
      <LabelChoices title="İçerik türü" options={labels.contentFormat} selected={[decision.contentFormat]} onSelect={contentFormat => patch({ contentFormat })} short={SHORT_FORMAT} />
      <LabelChoices title="Beceri" options={labels.skills} selected={decision.skills} onSelect={toggleSkill} short={SHORT_SKILL} />
      <LabelChoices title="Sınıf" options={{ 9: '9', 10: '10', 11: '11', 12: '12' }} selected={decision.grades.map(String)} onSelect={toggleGrade} />
    </section>
  </>;
}
