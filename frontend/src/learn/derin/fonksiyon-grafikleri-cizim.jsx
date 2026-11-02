import {C,L,T} from './svg.jsx';
import {show} from './yardim.js';
import {cubic} from './fonksiyon-grafikleri.js';
function Order({model:m}){const X=(x)=>60+x*360,Y=(y)=>240-y*200;const lines=[['f',(x)=>0.4+0.6*x,'primary'],['g',(x)=>x,'warn'],['h',(x)=>m.n+0.5*x,'good']];return <>
 <L x1={X(0)} y1={Y(0)} x2={X(1)} y2={Y(0)}/><L x1={X(0)} y1={Y(0)} x2={X(0)} y2={Y(1.05)}/>
 {lines.map(([k,f,tone])=><g key={k}><L x1={X(0)} y1={Y(f(0))} x2={X(1)} y2={Y(f(1))} style={{strokeWidth:3,stroke:'var(--'+({primary:'navy',warn:'warn',good:'ok'}[tone])+')'}}/><T x={X(1)+14} y={Y(f(1))+5} style={{fontSize:13}}>{k}</T></g>)}
 <L x1={X(m.t)} y1={Y(0)} x2={X(m.t)} y2={Y(1.05)} style={{strokeDasharray:'4 4'}}/>
 {lines.map(([k,f,tone])=><C key={'p'+k} x={X(m.t)} y={Y(f(m.t))} r={6} tone={tone}/>)}
 {m.cross<=1?<C x={X(m.cross)} y={Y(m.cross)} r={5} tone="line"/>:null}
 <T x={240} y={270} style={{fontSize:13}}>{m.equation}</T></>;}
function Level({model:m}){const X=(x)=>60+x*90,Y=(y)=>230-y*40;const pts=Array.from({length:81},(_,i)=>[i*0.05,cubic(i*0.05)]);return <>
 <L x1={X(0)} y1={Y(0)} x2={X(4.2)} y2={Y(0)}/><L x1={X(0)} y1={Y(-1)} x2={X(0)} y2={Y(5)}/>
 {pts.slice(1).map(([x,y],i)=><L key={i} x1={X(pts[i][0])} y1={Y(pts[i][1])} x2={X(x)} y2={Y(y)} tone="primary" style={{strokeWidth:3}}/>)}
 <L x1={X(0)} y1={Y(m.k)} x2={X(4.2)} y2={Y(m.k)} style={{strokeDasharray:'6 4',stroke:'var(--warn)',strokeWidth:2}}/>
 {m.sols.map((x,i)=><C key={i} x={X(x)} y={Y(m.k)} r={6} tone="good"/>)}
 <T x={X(4.2)} y={Y(m.k)-8} anchor="end" style={{fontSize:13}}>{'y = '+show(m.k)}</T>
 <T x={240} y={262} style={{fontSize:13}}>{m.sols.length+' kesişim'}</T></>;}
function Sign({model:m}){const X=(x)=>240+x*32;const ints=Array.from({length:13},(_,i)=>i-6);return <>
 <L x1={X(-6.5)} y1={150} x2={X(6.5)} y2={150}/>
 {ints.map((x)=><g key={x}><L x1={X(x)} y1={145} x2={X(x)} y2={155}/><T x={X(x)} y={175} style={{fontSize:11}}>{x}</T>
  {m.neg.includes(x)?<C x={X(x)} y={150} r={7} tone="good"/>:null}</g>)}
 <C x={X(m.p)} y={150} r={8} tone="primary"/><T x={X(m.p)} y={128} style={{fontSize:12}}>p</T>
 <C x={X(m.q)} y={150} r={8} tone={m.op===1?'soft':'warn'}/><T x={X(m.q)} y={112} style={{fontSize:12}}>q</T>
 <T x={240} y={60}>{m.op===0?'f · g = (x − p)(x − q)':'f / g = (x − p)/(x − q)'}</T>
 <T x={240} y={220} style={{fontSize:13}}>{'Yeşil: ifadenin negatif olduğu tam sayılar'+(m.op===1?' · q tanım dışı':'')}</T></>;}
export const diagrams={'fg-sira':Order,'fg-yatay':Level,'fg-isaret':Sign};
