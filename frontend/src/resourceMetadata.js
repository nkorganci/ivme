// Pure presentation rules shared by generated catalog metadata and browser views.
export const timeLabel = value => {
  const seconds = Math.floor(value);
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map(v => String(v).padStart(2,'0')).join(':');
};

export function locatorLabel(locator) {
  if (locator.type === 'PDF') return `PDF s. ${locator.pdfPageStart}${locator.pdfPageEnd === locator.pdfPageStart ? '' : `–${locator.pdfPageEnd}`}`;
  if (locator.type === 'VIDEO') return `${timeLabel(locator.startSeconds)}–${timeLabel(locator.endSeconds)}`;
  if (locator.type === 'QUESTION') return locator.questionCode + (locator.questionNumbers?.length?` · Soru ${locator.questionNumbers.join(', ')}`:'');
  if (locator.type === 'NOTE') return locator.sectionId;
  return '';
}

export function displayResourceTitle(item, categories) {
  const byId = categories instanceof Map ? categories : new Map(categories.map(c=>[c.id,c]));
  const assignments = item.automaticLabels?.assignments || item.labels?.assignments || [];
  const selected = assignments.filter(a=>a.relation !== 'PREREQUISITE').map(a=>byId.get(a.categoryId)).filter(Boolean);
  const distinct = values => [...new Set(values.filter(Boolean))].sort((a,b)=>a.localeCompare(b,'tr'));
  const topics = distinct(selected.map(c=>c.topic));
  const branches = distinct(selected.map(c=>c.subject));
  const scope = topics.length > 3 || branches.length > 1 ? 'Karma konular' : topics.join('; ');
  const subtopics = topics.length > 3 || branches.length > 1 ? '' : distinct(selected.map(c=>c.subtopic)).join('; ');
  const provisional = assignments.some(a=>a.confidence === 'LOW' || a.scopeStatus === 'CANDIDATE');
  const kind = {VIDEO:'Video',QUESTION:'Soru',NOTE:'Ders notu',PDF:'PDF',TOPIC:'Konu'}[item.kind] || item.kind;
  return [distinct(selected.map(c=>c.exam).filter(e=>e !== 'UNKNOWN')).join('/'),branches.join('; '),
    distinct(selected.filter(c=>c.canonicalTopic).map(c=>c.grade && `${c.grade}. sınıf`)).join('/'),
    scope && `${scope}${provisional ? ' (tahmini)' : ''}`,subtopics,item.sourceLabel,kind].filter(Boolean).join(' | ');
}

export function locatedResourceUrl(url, locator) {
  if (!locator) return url;
  if (locator.type === 'PDF') return `${url.split('#')[0]}#page=${locator.pdfPageStart}`;
  if (locator.type === 'NOTE') {
    const parsed=new URL(url,'https://ivme.local');
    if(locator.patternId) parsed.searchParams.set('kalip',locator.patternId);
    parsed.hash=encodeURIComponent(locator.sectionId);
    return url.startsWith('/')?`${parsed.pathname}${parsed.search}${parsed.hash}`:parsed.toString();
  }
  if (locator.type === 'VIDEO') {
    const parsed = new URL(url);
    if (['youtube.com','www.youtube.com','m.youtube.com','youtu.be'].includes(parsed.hostname)) {
      parsed.searchParams.set('t',String(Math.floor(locator.startSeconds)));
      return parsed.toString();
    }
    parsed.hash=`t=${locator.startSeconds},${locator.endSeconds}`;
    return parsed.toString();
  }
  return url;
}
