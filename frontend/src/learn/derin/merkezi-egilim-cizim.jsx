import {C,L,R,T} from './svg.jsx';
import {show} from './yardim.js';
function Remove({model:m}){const X=(v)=>40+Math.max(0,Math.min(150,v))*400/150;return <>
 <T x={240} y={28}>{m.n+' veri, ortalama '+m.m+' · toplam '+m.T}</T>
 <L x1={40} y1={160} x2={440} y2={160}/>
 {[0,50,100,150].map((v)=><g key={v}><L x1={X(v)} y1={154} x2={X(v)} y2={166}/><T x={X(v)} y={184} style={{fontSize:12}}>{v}</T></g>)}
 <C x={X(m.m)} y={160} r={8} tone="primary"/><T x={X(m.m)} y={136} style={{fontSize:13}}>{'eski '+m.m}</T>
 <C x={X(m.x)} y={160} r={8} tone="warn"/><T x={X(m.x)} y={210} style={{fontSize:13}}>{'çıkan '+m.x}</T>
 <C x={X(m.nm)} y={100} r={8} tone="good"/><L x1={X(m.m)} y1={150} x2={X(m.nm)} y2={108} tone="good"/>
 <T x={X(m.nm)} y={80} style={{fontSize:13}}>{'yeni '+show(Math.round(m.nm*100)/100)}</T>
 <T x={240} y={260} style={{fontSize:13}}>{m.d===0?'Ortalama yerinde kaldı':m.d>0?'Ortalama çıkan verinin tersine, yukarı kaydı':'Ortalama çıkan verinin tersine, aşağı kaydı'}</T></>;}
function Row({vals,y,mark,cross}){const w=44;const x0=240-vals.length*w/2;return vals.map((v,i)=><g key={i}><R x={x0+i*w+2} y={y} w={w-4} h={36} rx={6} tone={cross===i?'warn-soft':mark.includes(i)?'good-soft':'soft'}/><T x={x0+i*w+w/2} y={y+24}>{v}</T>{cross===i?<L x1={x0+i*w+6} y1={y+4} x2={x0+i*w+w-6} y2={y+32} tone="line"/>:null}</g>);}
function Median({model:m}){const n=m.rest.length;return <>
 <T x={240} y={30}>{'Önce: ortanca '+show(m.before)}</T>
 <Row vals={m.list} y={46} mark={[4]} cross={m.k-1}/>
 <T x={240} y={130}>{'Sonra: ortanca '+show(m.after)}</T>
 <Row vals={m.rest} y={146} mark={[n/2-1,n/2]}/>
 <T x={240} y={232} style={{fontSize:13}}>{'Korunan silmeler: '+(m.list.filter((_,i)=>m.keep[i]).join(', ')||'yok')}</T></>;}
function Extremes({model:m}){if(m.lo===null)return <T x={240} y={140}>{m.equation}</T>;return <>
 <T x={240} y={30}>{'Toplam '+5*m.m+', ortanca '+m.c}</T>
 <T x={240} y={66} style={{fontSize:13}}>En büyük en çok</T>
 <Row vals={m.maxSet} y={76} mark={[4]}/>
 <T x={240} y={152} style={{fontSize:13}}>En büyük en az</T>
 <Row vals={m.minSet} y={162} mark={[4]}/>
 <T x={240} y={250} style={{fontSize:13}}>{m.equation}</T></>;}
export const diagrams={'me-cikar':Remove,'me-ortanca':Median,'me-en-buyuk':Extremes};
