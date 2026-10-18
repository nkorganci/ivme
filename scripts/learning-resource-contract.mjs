import path from 'node:path';
import { createHash } from 'node:crypto';
import { taxonomyVersion, aliasTerm } from './content-taxonomy.mjs';
import { displayResourceTitle } from '../frontend/src/resourceMetadata.js';
const hash = value => createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
const same = (a,b) => aliasTerm(a) === aliasTerm(b);

export function enrichResource(item, categories, source = {}) {
  const labels = item.automaticLabels;
  item.contractVersion = 2;
  item.originalTitle = source.title || item.title;
  item.originalFilename = source.relativePath ? path.basename(source.relativePath) : null;
  item.sourceLabel = source.source || source.bank || item.bank || '';
  item.sourceVersion = labels.inputFingerprint;
  item.taxonomyVersion = taxonomyVersion;
  if (source.pageCount) item.pageCount = source.pageCount;
  labels.assignments = labels.assignments.map(a=>{
    const category = categories.get(a.categoryId);
    const direct = (labels.evidence || []).filter(e=> e.categoryId === a.categoryId || e.categoryIds?.includes(a.categoryId) ||
      ['SOURCE_TOPIC','SOURCE_SUBTOPIC','SOURCE_HEADING'].includes(e.type) && same(e.text,category.subtopic || category.topic));
    const relationKey = 'relation:' + hash(`${item.key}|${a.categoryId}`).slice(0,24);
    const confidence = item.kind === 'TOPIC' ? 'HIGH' : direct.length && !labels.reviewReasons?.some(r=>
      ['SOURCE_SUBJECT_CONFLICT','INCOMPLETE_QUESTION_CROP','NEIGHBOR_QUESTION_IN_CROP','AI_PROPOSAL_REQUIRES_TEACHER_REVIEW','PREVIOUS_MODEL_LABEL','VISUAL_QUESTION'].includes(r)) ? 'MEDIUM' : 'LOW';
    const locators = [];
    if (item.questionCode) locators.push({type:'QUESTION',questionCode:item.questionCode});
    if (item.kind === 'NOTE' || item.key.startsWith('note-question:')) {
      const parts = item.key.split(':');
      const sectionId = parts[0]==='note-question' ? parts[3]==='practice'?'kendini-dene':'soru-kaliplari' : parts[2];
      locators.push({type:'NOTE',sectionId,sourceKey:`note:${parts[1]}:${parts[2]}`,
        ...(parts[0]==='note-question' && parts[3]!=='practice'?{patternId:parts[3]}:{})});
    }
    const evidence = direct.length ? direct.map(e=>({...e,association:'RELATION',reference:e.reference || item.key,sourceVersion:item.sourceVersion,method:e.method || e.type,readability:'NOT_MEASURED'}))
      : [{association:'ITEM_ONLY',reference:item.key,sourceVersion:item.sourceVersion,method:'PRESERVED_ITEM_EVIDENCE',
          readability:'NOT_MEASURED',reason:'Eski kaynak kanıtı konu ilişkisi düzeyinde doğrulanmadı.'}];
    const locatorStatus = item.kind === 'TOPIC' ? 'NOT_APPLICABLE' : locators.length ? 'VERIFIED' : 'MISSING';
    return {...a,relationKey,sourceVersion:item.sourceVersion,categoryFingerprint:hash(category),scopeStatus:item.kind==='TOPIC'?'CONFIRMED':'CANDIDATE',
      confidence,confidenceReason:confidence==='HIGH'?'Konu ağacının sabit kategori kaydı.':confidence==='MEDIUM'?
        'Kaynak başlığı kayıtlı konuya doğrudan eşleşiyor; içerik/öğretmen doğrulaması ayrı.':
        labels.reviewReasons?.includes('AI_PROPOSAL_REQUIRES_TEACHER_REVIEW')?'Kaynak okumasından öneri; bağımsız öğretmen doğrulaması bekliyor.':
        labels.reviewReasons?.includes('PREVIOUS_MODEL_LABEL')?'Önceki model etiketi; bağımsız içerik doğrulaması gerekli.':'Eski kaynak eşlemesi; konuya özgü içerik doğrulaması gerekli.',
      evidence,locatorStatus,locatorReason:locatorStatus==='MISSING'?'Konuya özel kaynak aralığı henüz çıkarılmadı.':
        locatorStatus==='NOT_APPLICABLE'?'Medya içermeyen konu kaydı.':'Sabit soru kodu veya not bölümü; destek PDF konumu ayrı.',locators,
      review:{status:'PENDING',reviewer:null,reviewedAt:null,sourceVersion:item.sourceVersion,categoryFingerprint:hash(category)}};
  });
  item.displayTitle = displayResourceTitle(item,categories);
  const manualReasons=(labels.reviewReasons || []).filter(r=>['NEW_SOURCE_REQUIRES_REVIEW','PREVIOUS_MODEL_LABEL','VISUAL_QUESTION','SOURCE_SUBJECT_CONFLICT','AI_PROPOSAL_REQUIRES_TEACHER_REVIEW','INCOMPLETE_QUESTION_CROP','NEIGHBOR_QUESTION_IN_CROP'].includes(r));
  if(item.kind==='QUESTION' && manualReasons.length) item.manualReview={status:'NEEDS_MANUAL_REVIEW',code:item.availability==='needs_repair'?'SOURCE_REPAIR':'LABEL_REVIEW',
    label:item.availability==='needs_repair'?'Soru kırpımı — manuel inceleme':'Etiket — manuel inceleme',
    reason:'Kaynak ve mevcut aday etiketler korunur; içerik/öğretmen kontrolü gerekli.',reasons:manualReasons,pages:[]};
  return item;
}

export function validateResource(item, categories) {
  const errors=[];
  const fail=message=>errors.push(`${item.key}: ${message}`);
  if(item.contractVersion!==2 || !['PDF','VIDEO','QUESTION','NOTE','TOPIC'].includes(item.kind) ||
    ![item.key,item.sourceVersion,item.taxonomyVersion,item.originalTitle,item.displayTitle].every(v=>typeof v==='string' && v.length) ||
    !(item.originalFilename===null || typeof item.originalFilename==='string')) fail('Incomplete resource metadata');
  const assignments=item.automaticLabels?.assignments || [];
  if(item.manualReview && (item.manualReview.status!=='NEEDS_MANUAL_REVIEW' || !['EMPTY_OR_UNREADABLE','LOCATION_REVIEW','LABEL_REVIEW','TIME_REVIEW','SOURCE_REPAIR'].includes(item.manualReview.code) || !item.manualReview.label ||
    !Array.isArray(item.manualReview.pages) || item.manualReview.pages.some(p=>!Number.isInteger(p.page) || p.page<1 || item.pageCount && p.page>item.pageCount))) fail('Invalid manual review pages');
  if(!assignments.length || !assignments.some(a=>a.relation==='PRIMARY')) fail('Primary controlled label required');
  const seen=new Set();
  for(const a of assignments) {
    const c=categories.get(a.categoryId);
    if(!c || seen.has(a.categoryId)) fail('Unknown or duplicate category');
    seen.add(a.categoryId);
    if(!['PRIMARY','SECONDARY','PREREQUISITE'].includes(a.relation)) fail('Unknown relation');
    if(!['CANDIDATE','CONFIRMED'].includes(a.scopeStatus)) fail('Unknown scope');
    if(!['LOW','MEDIUM','HIGH'].includes(a.confidence) || !a.confidenceReason) fail('Confidence/reason required');
    if(!a.relationKey || !a.sourceVersion || !a.categoryFingerprint) fail('Relation identity/version required');
    if(!a.evidence?.length || a.evidence.some(e=>!e.reference || !e.sourceVersion || !e.method || !['RELATION','ITEM_ONLY'].includes(e.association) ||
      !['NOT_MEASURED','GOOD','POOR','FAILED'].includes(e.readability))) fail('Versioned evidence required');
    if(!['MISSING','NOT_APPLICABLE','ESTIMATED','VERIFIED'].includes(a.locatorStatus) || !a.locatorReason) fail('Locator status/reason required');
    if(!Array.isArray(a.locators)) { fail('Locators required'); continue; }
    if(['MISSING','NOT_APPLICABLE'].includes(a.locatorStatus) && a.locators.length) fail('Absent locator status has ranges');
    if(['ESTIMATED','VERIFIED'].includes(a.locatorStatus) && !a.locators.length) fail('Present locator status has no ranges');
    for(const l of a.locators) {
      if(l.type==='PDF') {
        if(!Number.isInteger(l.pdfPageStart) || !Number.isInteger(l.pdfPageEnd) || l.pdfPageStart<1 || l.pdfPageEnd<l.pdfPageStart || !Number.isInteger(l.pageCount) || l.pdfPageEnd>l.pageCount || !l.sourceKey) fail('Invalid PDF range');
      } else if(l.type==='VIDEO') {
        if(![l.startSeconds,l.endSeconds,l.durationSeconds].every(Number.isFinite) || l.startSeconds<0 || l.endSeconds<=l.startSeconds || l.endSeconds>l.durationSeconds) fail('Invalid video range');
      } else if(l.type==='QUESTION') {
        if(!l.questionCode || (item.questionCode && item.questionCode!==l.questionCode)) fail('Wrong question identity');
        if(l.questionNumbers!==undefined && (!Array.isArray(l.questionNumbers) || l.questionNumbers.some(n=>!Number.isInteger(n) || n<1))) fail('Invalid question numbers');
      } else if(l.type==='NOTE') {
        if(!l.sectionId || !l.sourceKey) fail('Note section/source required');
      } else fail('Unknown locator type');
    }
    if(!a.review || !['PENDING','APPROVE','FIX','WRONG_BRANCH','REMOVE','UNSURE','STALE'].includes(a.review.status)) fail('Review state required');
    if(a.review && (!a.review.sourceVersion || !a.review.categoryFingerprint ||
      !(a.review.reviewer===null || typeof a.review.reviewer==='string') ||
      !(a.review.reviewedAt===null || typeof a.review.reviewedAt==='string' && /^\d{4}-\d\d-\d\dT/.test(a.review.reviewedAt) && Number.isFinite(Date.parse(a.review.reviewedAt))))) fail('Invalid review attribution');
    if(a.review?.status==='APPROVE' && (!a.review.reviewer || !a.review.reviewedAt || a.review.sourceVersion!==item.sourceVersion || a.review.categoryFingerprint!==hash(c))) fail('Stale or unattributed approval');
  }
  return errors;
}

export function reviewIsCurrent(assignment, item, category) {
  return assignment.review?.sourceVersion===item.sourceVersion && assignment.review?.categoryFingerprint===hash(category);
}

export function attachSourceLocations(item, source, pdfs) {
  if(!['QUESTION','NOTE','TOPIC'].includes(item.kind)) return item;
  if(item.kind==='TOPIC') { item.resourceRole='CURRICULUM_REFERENCE'; return item; }
  const noteExample=item.key.startsWith('note-question:');
  item.resourceRole=item.kind==='NOTE'?'LEARNING_NOTE':noteExample?'NOTE_EXAMPLE':item.studentVisible?'ACTIVE_QUESTION':'ARCHIVE_QUESTION';
  const byPath=pdfs instanceof Map ? pdfs : new Map(pdfs.filter(p=>p.relativePath).map(p=>[p.relativePath,p]));
  const raw=source.intake?{}:source.original || {};
  if(source.image || raw.image) item.sourceImage={reference:source.image || raw.image,originalReference:raw.image || null,
    status:'PRESERVED_REFERENCE',reason:'Kayıtlı soru görseli; kırpım bütünlüğü ve okunabilirlik ayrı incelenir.'};
  for(const a of item.automaticLabels.assignments) for(const locator of a.locators.filter(l=>l.type==='QUESTION')) {
    if(raw.questionNumbers?.length) locator.questionNumbers=raw.questionNumbers;
  }
  const pdf=byPath.get(raw.file);
  item.sourceRecordRef=source.intake?`intake:${source.code}`:raw.rawRef || source.key || item.key;
  item.sourceLocationStatus='NOT_APPLICABLE';
  if(raw.file) {
    if(pdf && Number.isInteger(raw.page) && raw.page>=1 && raw.page<=pdf.pageCount) {
      const locator={type:'PDF',sourceKey:pdf.key,pdfPageStart:raw.page,pdfPageEnd:raw.page,pageCount:pdf.pageCount};
      for(const a of item.automaticLabels.assignments) {
        a.locators.push({...locator});a.locatorStatus='ESTIMATED';
        a.locatorReason='Korunan soru çıkarımındaki fiziksel sayfa; soru kırpımı/içerik incelemesi ayrı.';
      }
      item.sourceLocationStatus='ESTIMATED';
    } else {
      item.sourceLocationStatus='MISSING';item.sourceLocationReason=pdf?'Kaydedilen sayfa PDF sınırlarıyla uyuşmuyor.':'Kaynak dosyası katalog kimliğine bağlanamadı.';
    }
  } else if(!noteExample && item.kind==='QUESTION') {
    item.sourceLocationReason='Kayıtlı PDF sayfası yok; sabit banka/soru kaydı kullanılır.';
  }
  // These support the lesson, not the original exam question or every topic in it.
  item.supportingSources=(source.refs || []).map(ref=>{
    const pdf=[...byPath.values()].find(p=>p.catalogId===ref.catalogId);
    const valid=pdf && Number.isInteger(ref.page) && ref.page>=1 && ref.page<=pdf.pageCount;
    return {sourceKey:`pdf:${ref.catalogId}`,role:'SUPPORTING_LESSON_PAGE',locatorStatus:valid?'ESTIMATED':'MISSING',
      locatorReason:valid?'Korunan not destek sayfası; konuya özgü destek incelemesi ayrı.':'Destek sayfası veya kaynak kapsamı doğrulanamadı.',
      ...(valid?{locator:{type:'PDF',sourceKey:pdf.key,pdfPageStart:ref.page,pdfPageEnd:ref.page,pageCount:pdf.pageCount}}:{})};
  });
  item.exampleSources=(source.lesson?.examples || source.examples || []).map(example=>({
    sourceKey:`question:${example.code}`,role:'ORIGINAL_EXAMPLE_QUESTION',bank:example.bank,
    sourceFingerprint:example.sourceFingerprint || null,reference:example.evidenceRef || null,
    association:'ITEM_ONLY',locatorStatus:'VERIFIED',locator:{type:'QUESTION',questionCode:example.code},
    reviewStatus:'PENDING',reason:'Korunan örnek soru kimliği; notun bütün konu ilişkilerine onay sayılmaz.'}));
  return item;
}

export function attachPdfLocations(item, source, index) {
  if(item.kind!=='PDF') return item;
  item.canonicalAssetId=source.sourceSha256?`sha256:${source.sourceSha256}`:item.key;
  const record=index?.items?.[item.key];
  if(!record) { item.pageScanStatus='MISSING'; return item; }
  if(record.sourceSha256!==source.sourceSha256) throw new Error(`Stale PDF page cache: ${item.key}`);
  item.pageScanStatus=record.coverageStatus;
  item.pagesScanned=record.pagesScanned;
  item.pagesNeedingOcr=record.pagesNeedingOcr;
  item.ocrPagesProcessed=record.ocrPagesProcessed || [];
  item.ocrUnreadableOrBlankPages=record.ocrUnreadableOrBlankPages || [];
  if(record.manualReviewPages?.length) item.manualReview={status:'NEEDS_MANUAL_REVIEW',code:'EMPTY_OR_UNREADABLE',label:'Boş/okunamayan — manuel inceleme',
    reason:'İşlenen sayfalarda boş, görsel ağırlıklı veya okunamayan içerik var.',pages:record.manualReviewPages};
  if(item.pagesNeedingOcr.length) item.automaticLabels.reviewReasons.push('PDF_OCR_PENDING');
  if(item.ocrUnreadableOrBlankPages.length) item.automaticLabels.reviewReasons.push('PDF_OCR_UNREADABLE_OR_BLANK');
  for(const a of item.automaticLabels.assignments) {
    const location=record.assignments.find(candidate=>candidate.categoryId===a.categoryId);
    if(!location)continue;
    a.locators=location.locators;a.locatorStatus=location.locatorStatus;a.locatorReason=location.locatorReason;
    a.evidence=[...a.evidence,...location.evidence];
    a.confidence='MEDIUM';a.confidenceReason='Konu başlığı PDF metin katmanı veya OCR çıktısında bulundu; anlatımın tam kapsamı ayrıca incelenmeli.';
  }
  if(!item.manualReview && item.automaticLabels.assignments.some(a=>a.locatorStatus==='MISSING')) item.manualReview={status:'NEEDS_MANUAL_REVIEW',code:'LOCATION_REVIEW',
    label:'Konu sayfası — manuel inceleme',reason:'Kaynak tarandı; konuya özel sayfa sınırı için yeterli kanıt bulunamadı.',pages:[]};
  return item;
}

export function attachVideoMetadata(item, source, index, categories, contentIndex) {
  if(item.kind!=='VIDEO')return item;
  const url=new URL(source.url || item.url);
  const code=url.hostname==='youtu.be'?url.pathname.slice(1).split('/')[0]:url.searchParams.get('v');
  const identity=code?`youtube:${code}`:`youtube-playlist:${url.searchParams.get('list')}`;
  item.canonicalAssetId=identity;item.mediaType=source.mediaType || (code?'VIDEO':'PLAYLIST');
  const metadata=index?.sources?.[identity];
  item.remoteAvailability=metadata?.httpStatus===429?'RATE_LIMITED':metadata?.availability || 'NOT_CHECKED';
  item.availability=item.remoteAvailability==='OK'?'available':
    ['RATE_LIMITED','NOT_CHECKED','UNKNOWN','UNREACHABLE','HTTP_ERROR','PLAYLIST_REFERENCE'].includes(item.remoteAvailability)?'unverified':'remote_unavailable';
  if(!metadata)return item;
  item.remoteCheckedAt=metadata.checkedAt;
  item.sourceMediaVersion=metadata.metadataFingerprint || null;
  if(metadata.originalTitle)item.originalTitle=metadata.originalTitle;
  if(metadata.channel)item.sourceLabel=metadata.channel;
  if(Number.isFinite(metadata.durationSeconds))item.durationSeconds=metadata.durationSeconds;
  for(const a of item.automaticLabels.assignments) {
    const category=categories.get(a.categoryId);
    const target=aliasTerm(category.subtopic || category.topic);
    const chapters=(metadata.chapters || []).filter(c=>aliasTerm(c.title.replace(/^\s*\d+[.\s-]+/,''))===target);
    if(chapters.length && metadata.durationSeconds) {
      a.locatorStatus='ESTIMATED';a.locatorReason='Sağlayıcının açıklama bölümü; içerik ve bölüm sınırı ayrıca incelenmeli.';
      a.locators=chapters.map(c=>({type:'VIDEO',startSeconds:c.startSeconds,endSeconds:c.endSeconds,durationSeconds:metadata.durationSeconds}));
      a.evidence=[...a.evidence,...chapters.map(c=>({association:'RELATION',reference:item.url,sourceVersion:metadata.metadataFingerprint,
        method:'PROVIDER_DESCRIPTION_CHAPTER',readability:'NOT_MEASURED',text:c.title}))];
    } else {
      a.locatorReason=item.mediaType==='PLAYLIST'?'Oynatma listesinin tekil video girişleri ve zamanları henüz çözümlenmedi.':
        item.remoteAvailability==='RATE_LIMITED'?'Sağlayıcı istek sınırı; süre veya içerik erişimi doğrulanamadı.':'Eşleşen zamanlı bölüm/transkript kaydı yok; başlıktan süre türetilmez.';
    }
  }
  item.displayTitle=displayResourceTitle(item,categories);
  if(item.automaticLabels.assignments.some(a=>a.locatorStatus==='MISSING')) item.manualReview={status:'NEEDS_MANUAL_REVIEW',code:'TIME_REVIEW',
    label:'Zaman aralığı — manuel inceleme',reason:'Kaynak ve süre korundu; konuya özel zamanlı içerik kanıtı eksik.',pages:[]};
  const probe=contentIndex?.sources?.[identity];
  if(item.manualReview && probe) item.manualReview.reason=probe.reason==='PUBLIC_TIMEDTEXT_EMPTY_OR_UNUSABLE'?
    'Alternatif zamanlı altyazı biçimleri denendi; sağlayıcı kullanılabilir metin vermedi. Manuel zaman incelemesi gerekli.':
    item.mediaType==='PLAYLIST'?'Oynatma listesi sayfası ve alternatif kaynak denetlendi; liste/kapsam için manuel inceleme gerekli.':item.manualReview.reason;
  return item;
}

export function legacyNoteReference(note) {
  return {sourceKey:`pdf:${note.source.catalog_id}`,sha256:note.source.pdf_sha256,
    locator:{type:'PDF',sourceKey:`pdf:${note.source.catalog_id}`,pdfPageStart:note.pages.start,pdfPageEnd:note.pages.end},
    status:note.topic.status==='verified'?'CONFIRMED':'CANDIDATE'};
}

export function legacyHintReference(hint) {
  return {sourceKey:`pdf:${hint.note.catalog_id}`,sha256:hint.note.pdf_sha256,
    questionCode:hint.question.code,taxonomyVersion:hint.question.taxonomy_version,
    locator:{type:'PDF',sourceKey:`pdf:${hint.note.catalog_id}`,pdfPageStart:hint.note.page,pdfPageEnd:hint.note.page},
    reviewStatus:hint.review.status==='approved'?'APPROVE':'PENDING'};
}
