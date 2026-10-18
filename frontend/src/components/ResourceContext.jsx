import {useContext,useEffect,useState} from 'react';
import {Link,useLocation} from 'react-router-dom';
import {api,qs} from '../api.js';
import {RESOURCE_HOME,ResourceNavigationContext} from './ResourcesNavigation.jsx';

/** Reads the public presentation projection; never copies analysis or answer data. */
export default function ResourceContext({itemKey,onLoaded,compact=false}) {
  const [item,setItem]=useState(null);
  const {pathname,search}=useLocation();
  const navigation=useContext(ResourceNavigationContext);
  useEffect(()=>{let active=true;setItem(null);onLoaded?.(null);api.get('/api/learning-resources/item'+qs({key:itemKey}))
    .then(v=>{if(active){setItem(v);onLoaded?.(v);}}).catch(()=>{});return()=>{active=false;};},[itemKey,onLoaded]);
  useEffect(()=>{
    if(!item || !navigation || !/^\/(?:kaynakli-ders-notlari\/[^/]+|konu-anlatimlari\/\d+)$/.test(pathname))return;
    const ids=[...new Set(item.labels.assignments.filter(a=>a.relation!=='PREREQUISITE').map(a=>a.categoryId))];
    navigation.set({route:pathname+search,categoryId:ids.length<=20?ids:[]});
  },[item,pathname,search,navigation?.set]);
  if(!item)return null;
  const selected=new URLSearchParams(search).getAll('categoryId');
  const all=[...new Set(item.labels.assignments.filter(a=>a.relation!=='PREREQUISITE').map(a=>a.categoryId))];
  const categoryId=selected.length?selected:all.length<=20?all:[];
  const params=new URLSearchParams(search);
  const context={categoryId,includeCandidates:params.get('includeCandidates')!=='false',match:params.get('match')||params.get('categoryMatch')||'ANY'};
  const links=<div>{[['PDF','PDF'],['VIDEO','Video'],['NOTE','Ders notu']].map(([kind,label])=>
      <Link className="btn btn-secondary btn-sm" key={kind} to={RESOURCE_HOME+qs({...context,kind})}>{label}</Link>)}
      <Link className="btn btn-secondary btn-sm" to={'/calisma/yeni'+qs({...context,categoryMatch:context.match})}>Bu konudan pratik</Link></div>;
  if(compact)return <section className="resource-context resource-context-compact">
    <p className="muted small" title={item.displayTitle || item.originalTitle}>{item.displayTitle || item.originalTitle}</p>
    <details><summary>Kaynaklar</summary><div className="resource-context-menu">
      {item.manualReview && <p className="muted small">{item.manualReview.label}</p>}{links}
    </div></details>
  </section>;
  return <section className="resource-context">
    <p className="muted small">{item.displayTitle || item.originalTitle}</p>
    {item.manualReview && <p className="muted small">{item.manualReview.label}</p>}
    {links}
  </section>;
}
