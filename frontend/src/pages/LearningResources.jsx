import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { usePageTitle } from '../hooks.js';
import DataGrid from '../components/DataGrid.jsx';
import { Loading, ErrorBox, Empty } from '../components/States.jsx';
import './LearningResources.css';
import { locatorLabel, locatedResourceUrl } from '../resourceMetadata.js';

const API='/api/learning-resources';
const kinds={QUESTION:'Soru',PDF:'PDF',NOTE:'Ders notu',VIDEO:'Video'};
const availability={missing_file:'Dosya bulunamadı',video_only:'Yalnız video kaydı',source_only:'Kaynak arşivinde',needs_repair:'Soru görseli eksik; kontrol gerekli',unverified:'Erişim doğrulanamadı',remote_unavailable:'Kaynak sağlayıcıda açılamıyor'};
const stateLabel={APPROVE:'Öğretmen doğruladı',PENDING:'Otomatik eşleme',FIX:'Kontrol gerekli',UNSURE:'Kontrol gerekli',WRONG_BRANCH:'Branş kontrolü gerekli'};
const title=c=>[c.topic,c.subtopic,c.detail && c.detail!==c.subtopic?c.detail:''].filter(Boolean).join(' → ');
const resourceUrl=(resource,selected,params)=>{
  if(!resource.url)return resource.url;
  const assignments=resource.labels?.assignments || [];
  const related=selected.length?assignments.filter(a=>selected.includes(a.categoryId)):assignments;
  const locatorType={PDF:'PDF',VIDEO:'VIDEO',NOTE:'NOTE'}[resource.kind];
  const media=related.flatMap(a=>a.locators || []).find(l=>l.type===locatorType);
  let url=locatedResourceUrl(resource.url,media);
  if (resource.kind === 'PDF') {
    const id = /^pdf:(\d+)$/.exec(resource.key)?.[1];
    if (id) url = `/konu-anlatimlari/${id}${new URL(url, location.origin).hash}`;
  }
  if(url.startsWith('/') && !url.startsWith('/api/')) {
    const target=new URL(url,location.origin);selected.forEach(id=>target.searchParams.append('categoryId',id));
    target.searchParams.set('categoryMatch',params.get('match') || params.get('categoryMatch') || 'ANY');
    if(params.get('includeCandidates')==='false')target.searchParams.set('includeCandidates','false');
    url=target.pathname+target.search+target.hash;
  }
  return url;
};
export default function LearningResources(){
  usePageTitle('Kaynak Kütüphanesi');
  const [params,setParams]=useSearchParams();
  const [meta,setMeta]=useState(null),[data,setData]=useState(null),[error,setError]=useState(null);
  const [metadataError,setMetadataError]=useState(null),[metadataAttempt,setMetadataAttempt]=useState(0),[listAttempt,setListAttempt]=useState(0);
  const [categorySearch,setCategorySearch]=useState('');
  const [search,setSearch]=useState(params.get('q') || '');
  const searchTimer=useRef(null);
  const urlSearch=params.get('q') || '';
  useEffect(()=>{clearTimeout(searchTimer.current);setSearch(urlSearch);return()=>clearTimeout(searchTimer.current);},[urlSearch]);
  const requestParams=new URLSearchParams(params);
  if(!requestParams.has('match') && requestParams.has('categoryMatch'))requestParams.set('match',requestParams.get('categoryMatch'));
  const query=requestParams.toString();
  useEffect(()=>{let active=true;setMetadataError(null);
    api.get(`${API}/metadata`).then(v=>{if(active)setMeta(v);}).catch(e=>{if(active)setMetadataError(e);});
    return()=>{active=false;};},[metadataAttempt]);
  useEffect(()=>{let active=true;setData(null);setError(null);
    api.get(`${API}?${query}`).then(v=>{if(active)setData(v);}).catch(e=>{if(active)setError(e);});
    return()=>{active=false;};},[query,listAttempt]);
  const change=(name,value)=>setParams(old=>{const next=new URLSearchParams(old);if(value)next.set(name,value);else next.delete(name);if(name!=='page')next.delete('page');return next;});
  const latestChange=useRef(change);latestChange.current=change;
  const searchChanged=value=>{clearTimeout(searchTimer.current);setSearch(value);searchTimer.current=setTimeout(()=>latestChange.current('q',value),300);};
  const selected=params.getAll('categoryId');
  const categoryMap=useMemo(()=>new Map((meta?.categories || []).map(c=>[c.id,c])),[meta]);
  const options=useMemo(()=>{
    const term=categorySearch.toLocaleLowerCase('tr-TR');
    return (meta?.categories || []).filter(c=>(!params.get('exam') || params.get('exam')==='TYT-AYT' || c.exam===params.get('exam'))
      && (!params.get('subject') || c.subjectId===params.get('subject')) && !selected.includes(c.id)
      && c.selectable !== false && (!term || title(c).toLocaleLowerCase('tr-TR').includes(term)))
      .sort((a,b)=>(a.order||999)-(b.order||999) || title(a).localeCompare(title(b),'tr'));
  },[meta,params,categorySearch]);
  const selectCategory=id=>{if(!id || selected.length>=20)return;setParams(old=>{const next=new URLSearchParams(old);next.append('categoryId',id);next.delete('page');return next;});};
  const removeCategory=id=>setParams(old=>{const next=new URLSearchParams(old);next.delete('categoryId');selected.filter(v=>v!==id).forEach(v=>next.append('categoryId',v));next.delete('page');return next;});
  const columns=useMemo(()=>[
    {headerName:'Kaynak',field:'title',minWidth:240,flex:2,wrapText:true,autoHeight:true,cellRenderer:({data:r})=>{
      const name=r.displayTitle || r.title;const url=resourceUrl(r,selected,params);
      const canOpen=r.availability==='available' || r.kind==='VIDEO' && r.availability==='unverified';
      return <span>{r.url && canOpen
        ? (url.startsWith('https://') ? <a href={url} target="_blank" rel="noreferrer">{name} ↗</a>:<Link to={url}>{name}</Link>)
        : <span>{name}<small className="muted"> · {availability[r.availability] || 'Bağlantı yok'}</small></span>}
        {r.originalTitle && r.originalTitle!==name && <small className="muted"> · {r.originalTitle}</small>}</span>;
    }},
    {headerName:'Tür',field:'kind',width:125,valueGetter:({data:r})=>r.mediaType==='PLAYLIST'?'Video listesi':kinds[r.kind] || r.kind},
    {headerName:'Ders',field:'subject',minWidth:125},
    {headerName:'Ünite',minWidth:290,flex:2,wrapText:true,autoHeight:true,valueGetter:({data:r})=>
      [...new Set((r.labels.assignments || []).map(a=>{
        const c=categoryMap.get(a.categoryId);if(!c)return '';
        const locators=(a.locators || []).filter(l=>['PDF','VIDEO'].includes(l.type)).map(locatorLabel).join('; ');
        return [title(c),a.scopeStatus==='CANDIDATE'?'Tahmini etiket':'',locators || (a.locatorStatus==='MISSING'?'Konum bekleniyor':'')].filter(Boolean).join(' · ');
      }).filter(Boolean)),r.manualReview?.label].filter(Boolean).join(' · ')},
    {headerName:'Manuel inceleme',minWidth:240,flex:1,wrapText:true,autoHeight:true,cellRenderer:({data:r})=>r.manualReview?
      <span>{r.manualReview.label}{(r.manualReview.pages || []).map(p=>r.kind==='PDF'
        ? <Link key={p.page} to={`${resourceUrl(r,selected,params).split('#')[0]}#page=${p.page}`} title={p.reason}> · s. {p.page}</Link>
        : <a key={p.page} href={`${r.url.split('#')[0]}#page=${p.page}`} target="_blank" rel="noreferrer" title={p.reason}> · s. {p.page}</a>)}</span>:''},
    {headerName:'Eşleme durumu',field:'reviewStatus',minWidth:150,valueFormatter:({value})=>stateLabel[value] || 'Kontrol gerekli'},
    {headerName:'Sınıf',minWidth:160,wrapText:true,autoHeight:true,valueGetter:({data:r})=>(r.labels.grades||[]).join(' / ')+(r.labels.gradeStatus==='ESTIMATED'?' (tahmini)':'')},
    {headerName:'Erişim kontrolü',minWidth:155,valueGetter:({data:r})=>r.kind!=='VIDEO'?'':r.remoteAvailability==='OK'?'Sağlayıcı erişilebilir':r.mediaType==='PLAYLIST'?'Video listesi':'Erişim doğrulanamadı'},
  ],[categoryMap,params]);
  if(!meta)return metadataError?<ErrorBox error={metadataError} onRetry={()=>setMetadataAttempt(n=>n+1)}/>:<Loading text="Kaynak sözlüğü yükleniyor…"/>;
  return <div className="learning-resources"><div className="page-head"><div><h1>Kaynak Kütüphanesi</h1>
    <p className="muted">Soruları, konu anlatımlarını, ders notlarını ve videoları aynı konular üzerinden bul.</p></div></div>
    <form className="learning-filters card" onSubmit={e=>e.preventDefault()}>
      <label>Sınav<select value={params.get('exam') || ''} onChange={e=>change('exam',e.target.value)}><option value="">TYT ve AYT</option><option>TYT</option><option>AYT</option><option value="TYT-AYT">Ortak TYT / AYT kaynağı</option></select></label>
      {params.get('kind')==='PDF' && <label>PDF kaynak türü<select value={params.get('pdfKind') || ''} onChange={e=>change('pdfKind',e.target.value)}><option value="">Bütün PDF türleri</option>{(meta.pdfKinds || []).map(k=><option key={k} value={k}>{{mebi_summary:'MEBİ konu özeti',video_notes:'Konu anlatımı',topic_summary:'Konu özeti',presentation:'Ders anlatım sunusu'}[k] || k}</option>)}</select></label>}
      <label>Ders<select value={params.get('subject') || ''} onChange={e=>change('subject',e.target.value)}><option value="">Bütün dersler</option>{meta.branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
      <label>Kaynak türü<select value={params.get('kind') || ''} onChange={e=>change('kind',e.target.value)}><option value="">Bütün kaynaklar</option>{Object.entries(kinds).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
      <label>Etiket durumu<select value={params.get('labelStatus')||''} onChange={e=>change('labelStatus',e.target.value)}><option value="">Bütün etiketler</option><option value="ESTIMATED">Tahmini etiketler</option><option value="APPROVED">Öğretmen onaylı</option><option value="UNRESOLVED">Ünite için geniş kapsam tahmini</option></select></label>
      <label>Kaynak veya konu ara<input value={search} onChange={e=>searchChanged(e.target.value)} maxLength={100} placeholder="Konu, alt konu veya soru kodu"/></label>
      <label>Konu seçeneklerinde ara<input value={categorySearch} onChange={e=>setCategorySearch(e.target.value)} placeholder="Örneğin sürtünme"/></label>
      <label>Konu / alt konu ekle<select value="" onChange={e=>selectCategory(e.target.value)}><option value="">Konu seç…</option>{options.map(c=><option key={c.id} value={c.id}>{c.exam} · {c.subject} · {title(c)}</option>)}</select></label>
      <label>Etiket eşleşmesi<select value={params.get('match') || params.get('categoryMatch') || 'ANY'} onChange={e=>change('match',e.target.value)}><option value="ANY">Seçilenlerden herhangi biri</option><option value="ALL">Seçilenlerin hepsi</option></select></label>
      <label>İçerik türü<select value={params.get('contentFormat') || ''} onChange={e=>change('contentFormat',e.target.value)}><option value="">Bütün içerikler</option>{Object.entries(meta.labels.contentFormat).filter(([id])=>id!=='UYGULANMAZ').map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
      <label>Beceri<select value={params.get('skill') || ''} onChange={e=>change('skill',e.target.value)}><option value="">Bütün beceriler</option>{Object.entries(meta.labels.skills).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
      <label>Sınıf<select value={params.get('grade') || ''} onChange={e=>change('grade',e.target.value)}><option value="">Bütün sınıflar</option>{[9,10,11,12].map(n=><option key={n} value={n}>{n}. sınıf</option>)}</select></label>
      {params.get('kind')==='QUESTION' && <>
        <label>Onaylı soru tipi<select value={params.get('questionTypeId') || ''} onChange={e=>change('questionTypeId',e.target.value)}>
          <option value="">Bütün soru tipleri</option>{(meta.questionTypes || []).map(t=><option key={t.id} value={t.id}>{t.name} · {t.questions} onaylı soru</option>)}</select></label>
        <label>Öğretmen zorluk etiketi<select value={params.get('teacherDifficulty') || ''} onChange={e=>change('teacherDifficulty',e.target.value)}>
          <option value="">Bütün zorluklar</option>{['KOLAY','ORTA','ZOR'].map(id=><option key={id} value={id}>{meta.labels.difficulty[id]}</option>)}</select></label>
      </>}
      <label className="learning-check"><input type="checkbox" checked={params.get('approvedOnly')==='true'} onChange={e=>change('approvedOnly',e.target.checked?'true':'')}/>Yalnız öğretmenin doğruladıkları</label>
      <label className="learning-check"><input type="checkbox" checked={params.get('availableOnly')==='true'} onChange={e=>change('availableOnly',e.target.checked?'true':'')}/>Yalnız açılabilen kaynaklar</label>
      <label className="learning-check"><input type="checkbox" checked={params.get('manualReviewOnly')==='true'} onChange={e=>change('manualReviewOnly',e.target.checked?'true':'')}/>Yalnız manuel inceleme gerekenler</label>
      <label>İnceleme nedeni<select value={params.get('manualReviewType') || ''} onChange={e=>change('manualReviewType',e.target.value)}>
        <option value="">Bütün nedenler</option><option value="EMPTY_OR_UNREADABLE">Boş/okunamayan sayfalar</option><option value="LOCATION_REVIEW">Konu sayfası</option>
        <option value="LABEL_REVIEW">Soru etiketi</option><option value="TIME_REVIEW">Video zaman aralığı</option><option value="SOURCE_REPAIR">Soru kırpımı</option></select></label>
      <label className="learning-check"><input type="checkbox" checked={params.get('includeCandidates')!=='false'} onChange={e=>change('includeCandidates',e.target.checked?'':'false')}/>Geçici konu eşlemelerini dahil et</label>
      {params.get('kind')==='QUESTION' && <label className="learning-check"><input type="checkbox" checked={params.get('bankOnly')==='true'} onChange={e=>change('bankOnly',e.target.checked?'true':'')}/>Yalnız soru bankası kayıtları</label>}
      <div className="learning-selected">{selected.map(id=><button className="btn btn-secondary btn-sm" type="button" key={id} onClick={()=>removeCategory(id)}>{categoryMap.has(id)?title(categoryMap.get(id)):id} ×</button>)}
        <button className="btn btn-secondary btn-sm" type="button" onClick={()=>{clearTimeout(searchTimer.current);setSearch('');setCategorySearch('');setParams({});}}>Filtreleri temizle</button></div>
    </form>
    {error?<ErrorBox error={error} onRetry={()=>setListAttempt(n=>n+1)}/>:!data?<Loading text="Kaynaklar filtreleniyor…"/>:<>
      <p role="status">{data.totalElements.toLocaleString('tr-TR')} kaynak</p>
      {data.content.length?<DataGrid rowData={data.content} columnDefs={columns} mode="compact" scrollable/>:<Empty title="Bu filtrelerle kaynak bulunamadı"/>}
      {data.totalPages>1 && <nav className="learning-pages" aria-label="Kaynak sayfaları"><button className="btn btn-secondary" disabled={!data.page} onClick={()=>change('page',String(data.page-1))}>Önceki</button><span>{data.page+1} / {data.totalPages}</span><button className="btn btn-secondary" disabled={data.page+1>=data.totalPages} onClick={()=>change('page',String(data.page+1))}>Sonraki</button></nav>}
    </>}
  </div>;
}
