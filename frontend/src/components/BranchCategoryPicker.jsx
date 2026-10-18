import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { categoriesInBranches, categoryBranchId, categoryBranches, categoryGroups, categoryTopic,
  selectedCategoryBranches } from '../categorySelection.js';
import { Field } from './Field.jsx';

export default function BranchCategoryPicker({ categories, knownCategories = categories, value, branchIds, subject, counts, loading, disabled, onChange, leading, difficultyControl }) {
  const [search, setSearch] = useState('');
  const topicPicker = useRef(null);
  const topicDropdown = useRef(null);
  const topicLabelId = useId();
  const topicSelectionId = useId();
  const ids = value.categoryId || [];
  const selectedBranch = selectedCategoryBranches(knownCategories, ids, branchIds, subject)[0] || '';
  const branches = useMemo(() => categoryBranches([...categories,
    ...knownCategories.filter(category => categoryBranchId(category) === selectedBranch)]), [categories, knownCategories, selectedBranch]);
  const selectedBranches = selectedBranch ? [selectedBranch] : [];
  const options = useMemo(() => categoriesInBranches(categories, selectedBranches, search),
    [categories, selectedBranches.join('|'), search]);
  const groups = useMemo(() => categoryGroups(options), [options]);
  const topicDisabled = disabled || loading || !selectedBranch;
  useEffect(() => {
    let pointerInside = false;
    const close = event => {
      const inside = topicPicker.current?.contains(event.target);
      if (event.type === 'pointerdown') pointerInside = !!inside;
      if (event.type === 'keydown' ? event.key === 'Escape' && topicPicker.current?.contains(event.target)
        : !inside && (event.type !== 'focusin' || !pointerInside)) {
        if (topicDropdown.current) topicDropdown.current.open = false;
      }
    };
    const releasePointer = () => { pointerInside = false; };
    document.addEventListener('pointerdown', close, true);
    document.addEventListener('focusin', close);
    document.addEventListener('keydown', close);
    document.addEventListener('pointerup', releasePointer);
    document.addEventListener('pointercancel', releasePointer);
    return () => {
      document.removeEventListener('pointerdown', close, true);
      document.removeEventListener('focusin', close);
      document.removeEventListener('keydown', close);
      document.removeEventListener('pointerup', releasePointer);
      document.removeEventListener('pointercancel', releasePointer);
    };
  }, []);
  useEffect(() => {
    if (topicDropdown.current) topicDropdown.current.open = false;
    setSearch('');
  }, [selectedBranch, topicDisabled]);
  const chooseBranch = id => {
    setSearch('');
    const next = id ? [id] : [];
    const keep = new Set(categories.filter(category => next.includes(categoryBranchId(category))).map(category => category.id));
    onChange({ branchId: next, categoryId: ids.filter(categoryId => keep.has(categoryId)) });
  };
  useEffect(() => {
    if (loading || !categories.length) return;
    const keep = new Set(categories.filter(category => categoryBranchId(category) === selectedBranch).map(category => category.id));
    if (branchIds.length > 1 || ids.some(id => !keep.has(id))) {
      onChange({ branchId: selectedBranches, categoryId: ids.filter(id => keep.has(id)) });
    }
  }, [categories, loading, selectedBranch, branchIds.join('|'), ids.join('|')]);
  const toggleCategory = (id, checked) => {
    if (checked && ids.length >= 20) return;
    onChange({ categoryId: checked ? [...ids, id] : ids.filter(item => item !== id) });
  };

  return <div className="branch-category-picker">
    <div className="practice-source-difficulty">
      {leading}
      {difficultyControl}
    </div>
    <div className="practice-lesson-topic">
    <fieldset className="branch-picker" aria-label="Ders seçimi" disabled={disabled || loading}>
      <Field as="select" label="Ders" value={selectedBranch} onChange={event => chooseBranch(event.target.value)}>
        <option value="">Bütün dersler</option>
        {branches.map(branch => <option key={branch.id} value={branch.id}>{branch.label}</option>)}
      </Field>
      {loading ? <p role="status" className="field-hint">Dersler yükleniyor…</p>
        : !branches.length && !disabled && <p role="status" className="field-hint">Bu kaynak ve filtrelerde soru içeren ders yok.</p>}
    </fieldset>
    <fieldset className="branch-topics" aria-label="Konu seçimi" disabled={topicDisabled}>
      <div className="field" ref={topicPicker} onMouseLeave={() => {
        if (ids.length && topicDropdown.current) topicDropdown.current.open = false;
      }}>
      <span className="field-label" id={topicLabelId}>Konu</span>
      <details className="branch-topic-select" ref={topicDropdown} onToggle={event => {
        if (!event.currentTarget.open) setSearch('');
      }}>
      <summary aria-labelledby={`${topicLabelId} ${topicSelectionId}`} aria-disabled={topicDisabled}
        tabIndex={topicDisabled ? -1 : 0} onClick={event => { if (topicDisabled) event.preventDefault(); }}>
        <span id={topicSelectionId}>{ids.length ? `${ids.length} konu seçili` : selectedBranch ? 'Konu seç' : 'Önce ders seç'}</span>
      </summary>
      <div className="branch-topic-dropdown">
      <div className="field branch-topic-search">
        <input aria-label="Konu ara" type="search" value={search} placeholder="Konu veya alt konu"
          onChange={event => setSearch(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') event.preventDefault(); }} />
      </div>
      <div className="branch-topic-list" aria-label="Seçili dersin konuları" tabIndex={0}>
        {groups.map(group => <section className="branch-topic-group" key={group.key}>
          <h3>{group.label}</h3>
          {group.options.map(category => <label className={`branch-topic-option${ids.includes(category.id) ? ' selected' : ''}`} key={category.id}>
            <input type="checkbox" value={category.id} checked={ids.includes(category.id)}
              disabled={!ids.includes(category.id) && ids.length >= 20}
              onChange={event => toggleCategory(category.id, event.target.checked)} />
            <span>{categoryTopic(category)}{counts && <small>{(counts[category.id] || 0).toLocaleString('tr-TR')} soru</small>}</span>
          </label>)}
        </section>)}
        {!groups.length && !loading && <p role="status" className="field-hint">Seçili derste aramana uyan konu bulunamadı.</p>}
      </div>
      <p className="field-hint" role="status">{ids.length ? `${ids.length} konu seçili · En fazla 20 konu seçebilirsin.` : 'Dersin tamamından çalışabilir veya birden fazla konu/alt konu seçebilirsin.'}</p>
      </div>
      </details>
      </div>
      {!selectedBranch && <p className="field-hint">Konuları görmek için bir ders seç.</p>}
    </fieldset>
    </div>
  </div>;
}
