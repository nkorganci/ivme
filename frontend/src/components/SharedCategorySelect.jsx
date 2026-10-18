import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { api, qs } from '../api.js';
import { categoryGroups, categoryLabel, categoryOptions, categoryTopic } from '../categorySelection.js';
import { Field } from './Field.jsx';
import BranchCategoryPicker from './BranchCategoryPicker.jsx';

let metadataRequest;
export const loadSharedCatalog = () => metadataRequest ||= api.get('/api/learning-resources/metadata')
  .finally(() => { metadataRequest = undefined; });

export default function SharedCategorySelect({ value, onChange, examType, subject,
  questionFilters = false, showMatch = true, showQuestionTypes = true, showDropdown = true, questionScope, disabled = false,
  branchFirst = false, branchIds = [], leading }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [countsState, setCountsState] = useState(null);
  const listId = useId();
  const searchRoot = useRef(null);
  const pointerInsideSearch = useRef(false);
  const refresh = () => setAttempt(n => n + 1);
  const countsQuery = questionScope ? qs(questionScope) : null;

  useEffect(() => {
    if (countsQuery === null || disabled) return;
    let active = true;
    api.get('/api/questions/category-counts' + countsQuery)
      .then(counts => { if (active) setCountsState({ key: countsQuery, counts }); })
      .catch(e => { if (active) setCountsState({ key: countsQuery, error: e.message }); });
    return () => { active = false; };
  }, [countsQuery, attempt, disabled]);

  useEffect(() => {
    if (!open) return;
    const pointerDown = event => {
      pointerInsideSearch.current = !!searchRoot.current?.contains(event.target);
      if (!pointerInsideSearch.current) setOpen(false);
    };
    const focusOutside = event => {
      // Native scrollbar dragging can move focus to the page's focusable main.
      // That focus change belongs to the pointer interaction inside this list.
      if (!pointerInsideSearch.current && !searchRoot.current?.contains(event.target)) setOpen(false);
    };
    const pointerUp = () => { pointerInsideSearch.current = false; };
    document.addEventListener('pointerdown', pointerDown, true);
    document.addEventListener('focusin', focusOutside);
    document.addEventListener('pointerup', pointerUp);
    document.addEventListener('pointercancel', pointerUp);
    return () => {
      pointerInsideSearch.current = false;
      document.removeEventListener('pointerdown', pointerDown, true);
      document.removeEventListener('focusin', focusOutside);
      document.removeEventListener('pointerup', pointerUp);
      document.removeEventListener('pointercancel', pointerUp);
    };
  }, [open]);

  useEffect(() => {
    let active = true;
    loadSharedCatalog().then(catalog => {
      if (active) { setData(catalog); setError(''); }
    }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [attempt]);

  useEffect(() => {
    const reload = () => setAttempt(n => n + 1);
    const visible = () => { if (document.visibilityState === 'visible') reload(); };
    window.addEventListener('focus', reload);
    document.addEventListener('visibilitychange', visible);
    return () => {
      window.removeEventListener('focus', reload);
      document.removeEventListener('visibilitychange', visible);
    };
  }, []);

  const ids = value.categoryId || [];
  const match = value.categoryMatch || 'ANY';
  const include = value.includeCandidates !== false;
  const categories = data?.categories || [];
  const currentCounts = countsState?.key === countsQuery ? countsState.counts : null;
  const countsError = countsState?.key === countsQuery ? countsState.error : null;
  const options = useMemo(() => categoryOptions(categories, { examType, subject, selectedIds: ids, search })
    .filter(category => countsQuery === null || (currentCounts?.[category.id] || 0) > 0),
    [categories, examType, subject, ids.join('|'), search, countsQuery, currentCounts]);
  const branchCategories = useMemo(() => branchFirst ? categoryOptions(categories, { examType })
    .filter(category => countsQuery === null || (currentCounts?.[category.id] || 0) > 0 || ids.includes(category.id)) : [],
    [branchFirst, categories, examType, countsQuery, currentCounts, ids.join('|')]);
  const groups = useMemo(() => categoryGroups(options), [options]);
  const suggestions = showDropdown ? options.slice(0, 20) : options;
  const suggesting = !disabled && open && search.trim().length > 0 && !!data && ids.length < 20;
  const activeOption = suggestions[activeIndex];
  const compact = !showMatch && !(questionFilters && showQuestionTypes);
  const change = patch => onChange({ ...value, categoryId: ids, categoryMatch: match, includeCandidates: include, ...patch });
  const select = category => {
    if (!category || ids.includes(category.id) || ids.length >= 20) return;
    change({ categoryId: [...ids, category.id], examType: category.exam });
    setSearch(''); setOpen(false); setActiveIndex(0);
  };
  const keyDown = event => {
    if (event.key === 'Escape') { setOpen(false); return; }
    if (!search.trim()) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault(); setOpen(true);
      setActiveIndex(index => Math.max(0, Math.min(suggestions.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1))));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (suggesting) select(activeOption || suggestions[0]);
      else setOpen(true);
    }
  };

  const difficultyControl = questionFilters && <Field as="select" label="Öğretmen zorluk etiketi" value={value.teacherDifficulty || ''}
    onChange={event => change({ teacherDifficulty: event.target.value })}>
    <option value="">Bütün zorluklar</option>{['KOLAY', 'ORTA', 'ZOR'].map(id => <option key={id} value={id}>{data?.labels?.difficulty?.[id] || id}</option>)}
  </Field>;

  if (error && !data && !branchFirst) return <p role="alert">Konu listesi alınamadı. <button type="button" className="btn btn-secondary btn-sm" onClick={refresh}>Yeniden dene</button></p>;
  return <div className={`shared-category-select${compact ? ' shared-category-compact' : ''}${!showDropdown ? ' shared-category-search-only' : ''}${branchFirst ? ' shared-category-branch-first' : ''}`}>
    <div className="filters shared-category-filters">
      {branchFirst ? <BranchCategoryPicker categories={branchCategories} value={value} branchIds={branchIds} subject={subject}
        knownCategories={categories} leading={leading} difficultyControl={difficultyControl}
        counts={currentCounts} loading={!disabled && !error && (!data || countsQuery !== null && !currentCounts && !countsError)}
        disabled={disabled || !data} onChange={change} /> : <div className="category-search" ref={searchRoot}>
        <Field label="Konu adı ara" type="search" value={search} placeholder="Konu veya alt konu"
          disabled={disabled || !data || ids.length >= 20} autoComplete="off" role="combobox" aria-autocomplete="list"
          aria-expanded={suggesting} aria-controls={suggesting ? listId : undefined}
          aria-activedescendant={suggesting && activeOption ? `${listId}-${activeOption.id}` : undefined}
          onFocus={() => { refresh(); setOpen(true); }}
          onChange={event => { setSearch(event.target.value); setOpen(true); setActiveIndex(0); }} onKeyDown={keyDown} />
        {suggesting && <div className="category-suggestions">
          <ul id={listId} role="listbox" aria-label="Eşleşen konular">
            {suggestions.map((category, index) => <li key={category.id} role="presentation">
              <button type="button" role="option" tabIndex={-1} id={`${listId}-${category.id}`}
                aria-selected={activeIndex === index} onMouseDown={event => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)} onClick={() => select(category)}>
                {categoryLabel(category)}{currentCounts && ` · ${currentCounts[category.id].toLocaleString('tr-TR')} soru`}
              </button>
            </li>)}
          </ul>
          {!suggestions.length && <p role="status">{countsError ? 'Konu soru sayıları alınamadı.' : countsQuery !== null && !currentCounts
            ? 'Soru sayıları yükleniyor…' : countsQuery !== null ? 'Bu kaynak ve filtrelerde soru içeren eşleşen konu yok.' : 'Eşleşen konu bulunamadı.'}</p>}
          {options.length > suggestions.length && <p className="muted small">Diğer eşleşmeler yanındaki konu listesinde.</p>}
        </div>}
      </div>}
      {showDropdown && <Field as="select" label="Ortak konu / alt konu" value="" disabled={!data || ids.length >= 20}
        onFocus={refresh} onChange={event => select(categories.find(category => category.id === event.target.value))}>
        <option value="">{data ? 'Konu ekle…' : 'Konular yükleniyor…'}</option>
        {groups.map(group => <optgroup key={group.key} label={group.label}>
          {group.options.map(category => <option key={category.id} value={category.id}>{categoryTopic(category)}</option>)}
        </optgroup>)}
        {data && !options.length && <option disabled>Eşleşen konu yok</option>}
      </Field>}
      {showMatch && <Field as="select" label="Konu eşleşmesi" value={match} onChange={event => change({ categoryMatch: event.target.value })}>
        <option value="ANY">Seçilenlerden herhangi biri</option><option value="ALL">Seçilenlerin hepsi</option>
      </Field>}
      {questionFilters && showQuestionTypes && <Field as="select" label="Onaylı soru tipi" value={value.questionTypeId || ''}
        onChange={event => change({ questionTypeId: event.target.value })}>
        <option value="">Bütün soru tipleri</option>{(data?.questionTypes || []).map(type => <option key={type.id} value={type.id}>{type.name} · {type.questions} onaylı soru</option>)}
      </Field>}
      {!branchFirst && difficultyControl}
    </div>
    {error && <p role="alert">Güncel konu listesi alınamadı. <button type="button" className="btn btn-secondary btn-sm" onClick={refresh}>Yeniden dene</button></p>}
    {countsError && <p role="alert">Konu soru sayıları alınamadı. <button type="button" className="btn btn-secondary btn-sm" onClick={refresh}>Yeniden dene</button></p>}
    {(showDropdown || ids.length > 0) && <label className="checkbox"><input type="checkbox" checked={include} onChange={event => change({ includeCandidates: event.target.checked })} />Geçici konu eşlemelerini dahil et</label>}
    <div className="selected-categories" role={ids.length ? 'group' : undefined} aria-label={ids.length ? 'Seçili konular' : undefined}>{ids.map(id => {
      const category = categories.find(item => item.id === id);
      const label = category ? categoryLabel(category) : id;
      return <button className="btn btn-secondary btn-sm" key={id} type="button" aria-label={`${label} konusunu kaldır`}
        onClick={() => change({ categoryId: ids.filter(item => item !== id) })}>{label} ×</button>;
    })}</div>
  </div>;
}
