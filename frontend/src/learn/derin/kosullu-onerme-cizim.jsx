import {C,R,T} from './svg.jsx';
import {ROWS,FORMS} from './kosullu-onerme.js';
const b=(x)=>(x?1:0);
function Find({model:m}){const h=26,top=44,match=(row)=>m.fits.includes(row);return <>
 {[['p',150],['q',200],['r',250],[m.name,350]].map(([l,x])=><T key={l} x={x} y={top-10} style={{fontSize:13}}>{l}</T>)}
 {ROWS.map((row,i)=><g key={i}><R x={120} y={top+i*h} w={300} h={h-4} rx={4} tone={match(row)?'good-soft':'soft'}/>
  {row.map((v,j)=><T key={j} x={150+50*j} y={top+i*h+16} style={{fontSize:13}}>{b(v)}</T>)}
  <T x={350} y={top+i*h+16} style={{fontSize:13}}>{b(match(row)?m.v:!m.v)}</T></g>)}
 <T x={240} y={top+8*h+18} style={{fontSize:13}}>{m.fits.length+' uygun satır (yeşil)'}</T></>;}
function Forms({model:m}){const h=40,top=40;return <>
 <T x={240} y={24}>{'p ≡ '+m.p+',  q ≡ '+m.q}</T>
 {FORMS.map(([name],i)=><g key={name}><R x={70} y={top+i*h} w={340} h={h-8} rx={6} tone={i===0?'primary-soft':m.same[i]?'good-soft':'warn-soft'}/>
  <T x={90} y={top+i*h+21} anchor="start" style={{fontSize:14}}>{name}</T><T x={385} y={top+i*h+21} style={{fontSize:15}}>{b(m.vals[i])}</T></g>)}
 <T x={240} y={top+5*h+18} style={{fontSize:13}}>Yeşil: asılla aynı · turuncu: farklı</T></>;}
function Quant({model:m}){const gap=Math.min(60,400/m.set.length),x0=240-(m.set.length-1)*gap/2;return <>
 <T x={240} y={30}>{m.oname}</T>
 {m.set.map((x,i)=>{const ok=m.good.includes(x),key=x===m.witness;return <g key={x}><C x={x0+i*gap} y={110} r={key?22:18} tone={ok?'good':'warn'}/><T x={x0+i*gap} y={116} className="lm-inverse" style={{fontSize:14}}>{x}</T></g>;})}
 <T x={240} y={170} style={{fontSize:13}}>Yeşil: sağlıyor · turuncu: sağlamıyor</T>
 <T x={240} y={210}>{m.equation}</T>
 <T x={240} y={244} style={{fontSize:13}}>{m.observation}</T></>;}
export const diagrams={'ko-ise':Find,'ko-denk':Forms,'ko-nicel':Quant};
