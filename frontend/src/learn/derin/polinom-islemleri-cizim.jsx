import {C,L,R,T} from './svg.jsx';
import {show} from './yardim.js';
import {evalP} from './polinom-islemleri.js';
function Roots({model:m}){const X=(x)=>240+x*48,vals=Array.from({length:81},(_,i)=>{const x=-4+i*0.1;return[x,evalP(m.c,x)];}),lim=Math.max(10,...vals.map(([,y])=>Math.abs(y)).filter((y)=>y<200)),Y=(y)=>140-Math.max(-120,Math.min(120,y*110/lim));return <>
 <L x1={X(-4)} y1={140} x2={X(4)} y2={140}/><L x1={240} y1={20} x2={240} y2={260}/>
 {vals.slice(1).map(([x,y],i)=><L key={i} x1={X(vals[i][0])} y1={Y(vals[i][1])} x2={X(x)} y2={Y(y)} style={{stroke:'var(--navy)',strokeWidth:3}}/>)}
 {[m.r1,m.r2,m.r3].map((r,i)=><C key={i} x={X(r)} y={140} r={6} tone="good"/>)}
 <C x={240} y={Y(m.p0)} r={6} tone="warn"/>
 <T x={240} y={276} style={{fontSize:13}}>Yeşil: kökler · turuncu: sabit terim P(0)</T></>;}
function Horner({model:m}){const cols=[100,180,260,340],top=70;return <>
 <T x={240} y={30}>{'x − '+show(m.a)+' ile bölme (Horner)'}</T>
 <T x={50} y={top+24} style={{fontSize:14}}>{show(m.a)}</T><L x1={70} y1={top} x2={70} y2={top+110}/><L x1={70} y1={top+70} x2={380} y2={top+70}/>
 {m.c.map((a,i)=><T key={'c'+i} x={cols[i]} y={top+24} style={{fontSize:15}}>{show(a)}</T>)}
 {m.c.map((_,i)=>{const row=[...m.q,m.r];return i>0?<T key={'m'+i} x={cols[i]} y={top+56} style={{fontSize:13}}>{show(row[i-1]*m.a)}</T>:null;})}
 {[...m.q,m.r].map((a,i)=><g key={'r'+i}>{i===3?<R x={cols[i]-24} y={top+78} w={48} h={30} rx={6} tone="good-soft"/>:null}<T x={cols[i]} y={top+100} style={{fontSize:15}}>{show(a)}</T></g>)}
 <T x={240} y={250} style={{fontSize:13}}>{'Son kutu kalan: '+show(m.r)}</T></>;}
function Sums({model:m}){const n=m.c.length,w=Math.min(70,400/n),x0=240-n*w/2;return <>
 <T x={240} y={28}>{'(' +m.p+'x '+(m.q<0?'− '+Math.abs(m.q):'+ '+m.q)+')^'+m.n+' katsayıları'}</T>
 {m.c.map((a,i)=>{const deg=n-1-i;return <g key={i}><R x={x0+i*w+3} y={60} w={w-6} h={44} rx={6} tone={deg%2===0?'primary-soft':'warn-soft'}/><T x={x0+i*w+w/2} y={88} style={{fontSize:13}}>{show(a)}</T><T x={x0+i*w+w/2} y={122} style={{fontSize:11}}>{'x^'+deg}</T></g>;})}
 <T x={240} y={170}>{'Toplam P(1) = '+show(m.p1)+'  ·  sabit P(0) = '+show(m.p0)}</T>
 <T x={240} y={205} style={{fontSize:13}}>{'Mavi (çift) '+show(m.even)+'  ·  turuncu (tek) '+show(m.odd)}</T></>;}
export const diagrams={'po-kok':Roots,'po-bolme':Horner,'po-katsayi':Sums};
