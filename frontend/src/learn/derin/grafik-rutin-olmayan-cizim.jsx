import {L,R,T} from './svg.jsx';
import {show} from './yardim.js';
import {DAYS} from './grafik-rutin-olmayan.js';
const X=(v)=>40+Math.max(0,Math.min(100,v))*4;
function Bar({lo,hi,y,tone,label}){return lo>hi?<T x={240} y={y+16} style={{fontSize:13}}>{label+': boş'}</T>:<><R x={X(lo)} y={y} w={Math.max(4,X(hi)-X(lo))} h={22} tone={tone}/><T x={X(lo)-6} y={y+16} anchor="end" style={{fontSize:13}}>{show(lo)}</T><T x={X(hi)+6} y={y+16} anchor="start" style={{fontSize:13}}>{show(hi)}</T><T x={(X(lo)+X(hi))/2} y={y-6} style={{fontSize:12}}>{label}</T></>;}
function Band({model:m}){const lo=m.list[0],hi=m.list[m.list.length-1];return <>
 <T x={240} y={22}>Başlangıç seviyesi L için iki bilgi</T>
 <L x1={40} y1={240} x2={440} y2={240}/>
 {[0,25,50,75,100].map((v)=><g key={v}><L x1={X(v)} y1={235} x2={X(v)} y2={245}/><T x={X(v)} y={262} style={{fontSize:12}}>{v}</T></g>)}
 <Bar lo={Math.max(1,m.lo1)} hi={Math.min(100,m.hi1)} y={66} tone="primary-soft" label={'Artınca: L + '+m.p}/>
 <Bar lo={Math.max(1,m.lo2)} hi={Math.min(100,m.hi2)} y={122} tone="warn-soft" label={'Azalınca: L − '+m.q}/>
 {m.list.length?<Bar lo={lo} hi={hi} y={178} tone="good-soft" label="Ortak kısım"/>:<T x={240} y={194}>Ortak kısım boş</T>}</>;}
function Coins({model:m}){const u=380/m.t,rows=m.list.slice(0,6),h=Math.min(34,200/Math.max(rows.length,1));return <>
 <T x={240} y={22}>{m.a+'x + '+m.b+'y = '+m.t}</T>
 {rows.length?rows.map(([x,y],i)=><g key={i}>
  {Array.from({length:x},(_,k)=><R key={'a'+k} x={40+k*m.a*u} y={44+i*h} w={Math.max(1,m.a*u-1)} h={h-8} rx={2} tone="primary-soft"/>)}
  {Array.from({length:y},(_,k)=><R key={'b'+k} x={40+x*m.a*u+k*m.b*u} y={44+i*h} w={Math.max(1,m.b*u-1)} h={h-8} rx={2} tone="warn-soft"/>)}
  <T x={430} y={44+i*h+h/2} anchor="end" style={{fontSize:12}}>{'('+x+', '+y+') · '+(x+y)}</T></g>)
 :<T x={240} y={140}>Doğal sayı çözümü yok</T>}
 <T x={240} y={272} style={{fontSize:13}}>{m.list.length>6?'İlk 6 çözüm gösteriliyor':'Mavi '+m.a+', turuncu '+m.b+' birim'}</T></>;}
function Calendar({model:m}){const n=m.days.length,rows=Math.ceil((m.s+n)/7),h=Math.min(26,190/rows),w=56;return <>
 <T x={240} y={20}>{'Haftalık '+m.week+' TL · hedef '+m.t+' TL'}</T>
 {['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'].map((d,i)=><T key={d} x={44+i*w+w/2} y={44} style={{fontSize:12}}>{d}</T>)}
 {m.days.map((d,k)=>{const p=m.s+k,last=k===n-1;return <R key={k} x={44+(p%7)*w+2} y={52+Math.floor(p/7)*h} w={w-4} h={h-3} rx={3} tone={last?'good':d.wd>=5?'warn-soft':'primary-soft'}/>;})}
 <T x={240} y={262} style={{fontSize:13}}>{n+'. gün '+DAYS[m.days[n-1].wd]+': '+m.days[n-1].total+' TL'}</T></>;}
export const diagrams={'gr-aralik':Band,'gr-pul':Coins,'gr-kumbara':Calendar};
