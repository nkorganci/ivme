import {Link,useLocation} from 'react-router-dom';
import {createContext,useContext} from 'react';

export const ResourceNavigationContext=createContext(null);

export const RESOURCE_HOME='/konular-ve-kaynaklar';
export const isResourcePath=path=>[RESOURCE_HOME,'/kaynak-kutuphanesi','/dersler-ve-konular','/konu-anlatimlari','/kaynakli-ders-notlari']
  .some(prefix=>path===prefix || path.startsWith(prefix+'/'));

export default function ResourcesNavigation() {
  const {pathname,search,hash}=useLocation();
  const navigation=useContext(ResourceNavigationContext);
  const params=new URLSearchParams(search);
  if(!params.getAll('categoryId').length && navigation?.value?.route===pathname+search)
    navigation.value.categoryId.forEach(id=>params.append('categoryId',id));
  if(!params.has('exam') && params.has('examType'))params.set('exam',params.get('examType'));
  if(!params.has('match') && params.has('categoryMatch'))params.set('match',params.get('categoryMatch'));
  if(!params.has('exam') && params.has('sinav'))params.set('exam',params.get('sinav'));
  if(!params.has('subject') && params.has('ders'))params.set('subject',params.get('ders'));
  params.delete('page');
  const current=pathname.startsWith('/dersler-ve-konular')?'TREE':pathname.startsWith('/kaynakli-ders-notlari')?'NOTE':
    pathname.startsWith('/konu-anlatimlari')?'PDF':params.get('kind') || '';
  const target=kind=>{
    const next=new URLSearchParams(params);
    if(kind==='TREE') {
      if(next.has('exam'))next.set('sinav',next.get('exam'));
      if(next.has('subject'))next.set('ders',next.get('subject'));
      return '/dersler-ve-konular'+(next.size?'?'+next:'')+hash;
    }
    if(kind)next.set('kind',kind);else next.delete('kind');
    if(kind!=='PDF')next.delete('pdfKind');
    if(kind==='QUESTION')next.set('bankOnly','true');else next.delete('bankOnly');
    return RESOURCE_HOME+(next.size?'?'+next:'')+hash;
  };
  return <nav className="tabs study-tabs" aria-label="Konular ve kaynaklar">
    {[['','Bütün kaynaklar'],['TREE','Konu ağacı'],['PDF','PDF'],['VIDEO','Video'],['NOTE','Ders notu'],['QUESTION','Sorular']].map(([kind,label])=>
      <Link key={kind} to={target(kind)} className={current===kind?'active':''} aria-current={current===kind?'page':undefined}>{label}</Link>)}
  </nav>;
}
