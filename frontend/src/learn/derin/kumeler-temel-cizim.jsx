import {C,R,T} from './svg.jsx';
function Row({items,y,common,label}){const gap=Math.min(48,380/Math.max(items.length,1)),x0=240-(items.length-1)*gap/2;return <>
 <T x={240} y={y-30} style={{fontSize:13}}>{label}</T>
 {items.map((ch,i)=><g key={ch+i}><C x={x0+i*gap} y={y} r={18} tone={common.includes(ch)?'good':'soft'}/><T x={x0+i*gap} y={y+6} className={common.includes(ch)?'lm-inverse':undefined}>{ch}</T></g>)}</>;}
function Letters({model:m}){return <>
 <Row items={m.A} y={80} common={m.common} label={m.wa+' → s(A) = '+m.A.length}/>
 <Row items={m.B} y={170} common={m.common} label={m.wb+' → s(B) = '+m.B.length}/>
 <T x={240} y={240} style={{fontSize:13}}>{'Yeşil: ortak harfler (A ∩ B = {'+m.common.join(', ')+'})'}</T></>;}
function Grow({model:m}){const W=400,bw=W*m.before/m.after;return <>
 <T x={240} y={30}>{'2^'+m.n+' = '+m.before+'  →  2^'+(m.n+m.k)+' = '+m.after}</T>
 <R x={40} y={70} w={Math.max(3,bw)} h={40} tone="primary-soft"/><T x={40} y={130} anchor="start" style={{fontSize:13}}>{'önce '+m.before}</T>
 <R x={40} y={160} w={bw} h={40} tone="primary-soft"/><R x={40+bw} y={160} w={W-bw} h={40} tone="good-soft"/>
 <T x={40} y={220} anchor="start" style={{fontSize:13}}>{'sonra '+m.after+' · yeşil kısım artış: '+m.inc}</T>
 <T x={240} y={260} style={{fontSize:13}}>{'Her yeni eleman sayıyı ikiye katlar: ×'+2**m.k}</T></>;}
function Grid({model:m}){const n=m.all.length,cols=Math.min(8,n),rows=Math.ceil(n/cols),cw=Math.min(52,400/cols),ch=Math.min(26,190/rows),x0=240-cols*cw/2;return <>
 <T x={240} y={24}>{'{1, …, '+m.n+'} kümesinin alt kümeleri; '+m.e+' içerenler yeşil'}</T>
 {m.all.map((s,i)=><g key={i}><R x={x0+(i%cols)*cw+1} y={40+Math.floor(i/cols)*ch} w={cw-2} h={ch-3} rx={3} tone={s.includes(m.e)?'good-soft':'soft'}/>
  {m.n<=4?<T x={x0+(i%cols)*cw+cw/2} y={40+Math.floor(i/cols)*ch+ch/2+4} style={{fontSize:10}}>{s.length?s.join(''):'∅'}</T>:null}</g>)}
 <T x={240} y={262} style={{fontSize:13}}>{m.withE.length+' / '+n+' alt küme · toplamların toplamı '+m.sum}</T></>;}
export const diagrams={'ku-harf':Letters,'ku-ekle':Grow,'ku-toplam':Grid};
