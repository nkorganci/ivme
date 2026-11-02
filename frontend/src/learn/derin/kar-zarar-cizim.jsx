import {C,L,R,T} from './svg.jsx';
import {show} from './yardim.js';
function Gap({model:m}){const u=330/Math.max(m.hi,1);return <>
 <T x={240} y={25}>Aynı maliyet, iki satış</T>
 <T x={60} y={72}>Maliyet</T><R x={110} y={50} w={m.m*u} h={32} tone="primary-soft"/><T x={110+m.m*u/2} y={72}>{show(m.m)}</T>
 <T x={60} y={132}>%{m.p} kâr</T><R x={110} y={110} w={m.hi*u} h={32} tone="good-soft"/><T x={110+m.hi*u/2} y={132}>{show(m.hi)}</T>
 <T x={60} y={192}>%{m.q} zarar</T><R x={110} y={170} w={m.lo*u} h={32} tone="warn-soft"/><T x={110+m.lo*u/2} y={192}>{show(m.lo)}</T>
 <T x={240} y={240}>{'Fark '+show(m.gap)+' = maliyetin %'+(m.p+m.q)+'’i'}</T>
 <T x={240} y={270} style={{fontSize:13}}>Zarar eksi yönde: yüzde farkı p + q</T></>;}
function Campaign({model:m}){const w=Math.min(64,400/m.n);return <>
 <T x={240} y={25}>{['İkincisi %50','Hepsine %30','3 al 2 öde'][m.op]+' · '+m.n+' ürün'}</T>
 {Array.from({length:m.n},(_,i)=>{const share=m.op===0?(i%2?0.5:1):m.op===1?0.7:((i+1)%3===0?0:1);return <g key={i}><R x={40+i*(w+8)} y={60} w={w} h={150} tone="primary-soft"/><R x={40+i*(w+8)} y={60+150*(1-share)} w={w} h={150*share} tone="good-soft"/><T x={40+i*(w+8)+w/2} y={232} style={{fontSize:13}}>{'%'+show(share*100)}</T></g>;})}
 <T x={240} y={268}>{'Ödenen '+show(m.paid)+' / '+show(m.total)+' · gerçek indirim %'+show(m.pct)}</T></>;}
const pct=(v)=>v<0?'%'+show(-v)+' zarar':'%'+show(v)+' kâr';
function Mix({model:m}){const s=3.2;const X=(v)=>240+v*s;return <>
 <T x={240} y={25}>Toplam kâr: payla ağırlıklı ortalama</T>
 <R x={40} y={60} w={m.a*4} h={40} tone="primary-soft"/><R x={40+m.a*4} y={60} w={(100-m.a)*4} h={40} tone="warn-soft"/>
 <T x={240} y={124} style={{fontSize:13}}>{'İlk parça: pay %'+m.a+', '+pct(m.p)}</T><T x={240} y={144} style={{fontSize:13}}>{'Kalan: pay %'+(100-m.a)+', '+pct(m.q)}</T>
 <L x1={X(-40)} x2={X(60)} y1={180} y2={180}/>
 {[m.p,m.q].map((v,i)=><C key={i} x={X(v)} y={180} r={7} tone={i?'warn':'primary'}/>)}
 <C x={X(m.total)} y={180} r={10} tone="good"/>
 <T x={X(m.total)} y={214}>{'%'+show(m.total)}</T>
 <T x={240} y={262} style={{fontSize:13}}>{show(m.revenue)+' liralık gelir, 100 liralık maliyet'}</T></>;}
export const diagrams={'kz-fark':Gap,'kz-kampanya':Campaign,'kz-karma':Mix};
