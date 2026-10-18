import {useEffect,useState} from 'react';
import {api,qs} from '../api.js';
import {Field} from './Field.jsx';
import {ErrorBox} from './States.jsx';

export default function SharedResourceSelect({value=[],categoryId=[],onChange}) {
  const [search,setSearch]=useState(''),[items,setItems]=useState([]),[names,setNames]=useState({}),[error,setError]=useState(null),[attempt,setAttempt]=useState(0);
  const keys=value || [],categoryKey=categoryId.join('|'),key=keys.join('|');
  useEffect(()=>{let active=true;setItems([]);if(!categoryId.length)return;const timer=setTimeout(()=>{
    setError(null);api.get('/api/learning-resources'+qs({categoryId,q:search})).then(result=>{if(active)setItems(result.content);}).catch(e=>{if(active)setError(e);});
  },200);return()=>{active=false;clearTimeout(timer);};},[search,categoryKey,attempt]);
  useEffect(()=>{let active=true;if(keys.length)api.get('/api/learning-resources/items'+qs({key:keys})).then(result=>{if(active)setNames(result);}).catch(()=>{});return()=>{active=false;};},[key]);
  return <div className="shared-category-select shared-resource-select">
    <Field label="Kaynak adı ara" value={search} maxLength={100} onChange={e=>setSearch(e.target.value)}/>
    <Field as="select" label="Bağlı kaynak" value="" disabled={!categoryId.length || keys.length>=20} onChange={e=>{if(e.target.value)onChange([...keys,e.target.value]);}}>
      <option value="">PDF, video, not veya soru ekle…</option>{items.filter(i=>!keys.includes(i.key)).map(i=><option key={i.key} value={i.key}>{i.displayTitle || i.title}</option>)}</Field>
    {keys.map(k=><button type="button" key={k} className="btn btn-secondary btn-sm" onClick={()=>onChange(keys.filter(v=>v!==k))}>{names[k]?.displayTitle || names[k]?.title || k} ×</button>)}
    {error && <ErrorBox error={error} onRetry={()=>setAttempt(n=>n+1)}/>}
    <p className="muted small">{!categoryId.length?'Kaynak bağlamak için önce ortak konu seçin. ':''}Kaynak seçimi okuma/izleme tamamlandı anlamına gelmez. İlerleme yalnız kaydettiğiniz çalışma ve soru olaylarına dayanır.</p>
  </div>;
}
