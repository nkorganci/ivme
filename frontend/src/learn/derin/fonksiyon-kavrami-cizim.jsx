import {C,L,R,T} from './svg.jsx';
import {show} from './yardim.js';
function Count({model:m}){const w=Math.min(70,400/m.m),x0=240-m.m*w/2;return <>
 <T x={240} y={28}>{'A’nın her elemanı için B’den bir seçim'}</T>
 {Array.from({length:m.m},(_,i)=><g key={i}><R x={x0+i*w+4} y={60} w={w-8} h={50} rx={8} tone="primary-soft"/><T x={x0+i*w+w/2} y={90}>{m.n}</T><T x={x0+i*w+w/2} y={128} style={{fontSize:12}}>{'a'+(i+1)}</T></g>)}
 <T x={240} y={160}>{'Fonksiyon: '+Array(m.m).fill(m.n).join(' · ')+' = '+m.all}</T>
 {Array.from({length:m.m},(_,i)=><g key={'b'+i}><R x={x0+i*w+4} y={180} w={w-8} h={36} rx={8} tone={m.n-i>0?'good-soft':'warn-soft'}/><T x={x0+i*w+w/2} y={204}>{Math.max(0,m.n-i)}</T></g>)}
 <T x={240} y={244}>{'Bire bir: '+m.inj}</T></>;}
function Kind({model:m}){const X=(x)=>240+x*60,ys=m.pts.map(([,y])=>y),lim=Math.max(5,...ys.map(Math.abs)),Y=(y)=>140-y*110/lim;return <>
 <L x1={X(-3.5)} y1={140} x2={X(3.5)} y2={140}/><L x1={240} y1={25} x2={240} y2={255}/>
 {m.pts.slice(1).map(([x,y],i)=><L key={i} x1={X(m.pts[i][0])} y1={Y(m.pts[i][1])} x2={X(x)} y2={Y(y)} tone="primary" style={{strokeWidth:3}}/>)}
 <C x={X(-1)} y={Y(m.a-m.b+m.c)} r={6} tone="warn"/><C x={X(1)} y={Y(m.a+m.b+m.c)} r={6} tone="good"/>
 <T x={240} y={272} style={{fontSize:13}}>{m.k.length?m.k.join(' · '):'ne tek ne çift'}</T></>;}
function Sum({model:m}){const X=(v)=>240+v*18;return <>
 <L x1={40} y1={140} x2={440} y2={140}/>
 {[-10,-5,0,5,10].map((v)=><g key={v}><L x1={X(v)} y1={134} x2={X(v)} y2={146}/><T x={X(v)} y={164} style={{fontSize:12}}>{v}</T></g>)}
 <C x={X(m.g)} y={140} r={9} tone="warn"/><C x={X(m.f)} y={140} r={9} tone="primary"/>
 <T x={X(m.f)} y={118} style={{fontSize:13}}>{'f = '+show(m.f)}</T><T x={X(m.g)} y={196} style={{fontSize:13}}>{'g = '+show(m.g)}</T>
 <T x={240} y={50}>{'f + g = '+m.s+',  f − g = '+m.d}</T>
 <T x={240} y={240}>{'f · g = '+show(m.p)}</T></>;}
export const diagrams={'fk-sayi':Count,'fk-cesit':Kind,'fk-toplam':Sum};
