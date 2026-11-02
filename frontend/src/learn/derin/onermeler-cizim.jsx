import {C,R,T} from './svg.jsx';
import {ROWS} from './onermeler.js';
const b=(x)=>(x?1:0);
function Head({cols,y}){return cols.map(([label,x])=><T key={label} x={x} y={y} style={{fontSize:13}}>{label}</T>);}
function Find({model:m}){const h=26,top=44,match=(row)=>m.fits.includes(row);return <>
 <Head y={top-10} cols={[['p',150],['q',200],['r',250],[m.name,350]]}/>
 {ROWS.map((row,i)=><g key={i}><R x={120} y={top+i*h} w={300} h={h-4} rx={4} tone={match(row)?'good-soft':'soft'}/>
  {row.map((v,j)=><T key={j} x={150+50*j} y={top+i*h+16} style={{fontSize:13}}>{b(v)}</T>)}
  <T x={350} y={top+i*h+16} style={{fontSize:13}}>{b(match(row)?m.v:!m.v)}</T></g>)}
 <T x={240} y={top+8*h+18} style={{fontSize:13}}>{m.fits.length+' uygun satır (yeşil)'}</T></>;}
function Table({model:m}){const h=26,top=44;return <>
 <Head y={top-10} cols={[['p',110],['q',150],['r',190],[m.na,280],[m.nb,390]]}/>
 {ROWS.map((row,i)=><g key={i}><R x={90} y={top+i*h} w={360} h={h-4} rx={4} tone={m.diff[i]?'warn-soft':'soft'}/>
  {row.map((v,j)=><T key={j} x={110+40*j} y={top+i*h+16} style={{fontSize:13}}>{b(v)}</T>)}
  <T x={280} y={top+i*h+16} style={{fontSize:13}}>{b(m.vals[i][0])}</T><T x={390} y={top+i*h+16} style={{fontSize:13}}>{b(m.vals[i][1])}</T></g>)}
 <T x={240} y={top+8*h+18} style={{fontSize:13}}>{m.equal?'Bütün satırlar aynı: denk':'Turuncu satırlarda farklı'}</T></>;}
function Chain({model:m}){const gap=Math.min(70,400/m.n),x0=240-(m.n-1)*gap/2;let acc=0;return <>
 <T x={240} y={30}>Her doğru önerme sonucu tersine çevirir</T>
 {Array.from({length:m.n},(_,i)=>{const on=i<m.k;acc^=on?1:0;return <g key={i}><C x={x0+i*gap} y={100} r={20} tone={on?'good':'soft'}/><T x={x0+i*gap} y={106} style={{fontSize:14}} className={on?'lm-inverse':undefined}>{on?1:0}</T><T x={x0+i*gap} y={150} style={{fontSize:12}}>{'→ '+acc}</T></g>;})}
 <T x={240} y={200}>{'Sonuç ≡ '+m.value+(m.k%2?' (tek sayıda 1)':' (çift sayıda 1)')}</T>
 <T x={240} y={240} style={{fontSize:13}}>{'Tabloda '+m.odd+' / '+2**m.n+' satır doğru'}</T></>;}
export const diagrams={'on-bul':Find,'on-tablo':Table,'on-xor':Chain};
