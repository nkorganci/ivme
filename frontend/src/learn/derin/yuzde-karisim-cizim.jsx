import {R,T} from './svg.jsx';
import {show} from './yardim.js';
function Base({model:m}){const u=350/Math.max(m.total,m.a);return <>
 <T x={240} y={25}>Yüzdenin tabanı hangi miktar?</T>
 <T x={65} y={70}>İlk</T><R x={100} y={48} w={m.a*u} h={35} tone="primary-soft"/><T x={100+m.a*u/2} y={72}>{m.a}</T>
 <T x={65} y={130}>Son</T><R x={100} y={108} w={m.a*u} h={35} tone="primary-soft"/><R x={100+m.a*u} y={108} w={m.delta*u} h={35} tone="good-soft"/>
 <T x={240} y={180}>{'Fark '+show(m.delta)+' · yeni bütün '+show(m.total)}</T>
 <T x={240} y={220}>{'İleri %'+m.p+' artış · geri %'+show(m.back)+' azalış'}</T>
 <T x={240} y={262} style={{fontSize:13}}>Aynı farkı farklı bütünlere bölüyoruz</T>
 </>;}
function Mix({model:m}){const max=Math.max(m.a,m.b,m.total),u=140/max;const bars=[[75,m.a,m.s1,'1. kap'],[240,m.b,m.s2,'2. kap'],[405,m.total,m.sugar,'Son']];return <>
 <T x={240} y={24}>{'Şeker '+show(m.s1)+' + '+show(m.s2)+' = '+show(m.sugar)+' g'}</T>
 {bars.map(([x,total,sugar,label])=><g key={label}><R x={x-35} y={205-total*u} w={70} h={total*u} tone="primary-soft"/><R x={x-35} y={205-sugar*u} w={70} h={sugar*u} tone="warn-soft"/><T x={x} y={230}>{label}</T><T x={x} y={253} style={{fontSize:13}}>{show(total)+' g'}</T></g>)}
 <T x={240} y={280} style={{fontSize:13}}>{'Turuncu: şeker · son oran %'+show(m.pct)}</T></>;}
function Change({model:m}){return <>
 <T x={240} y={24}>{['Dökülenin yerine saf su','Dökülenin yerine saf şeker','Yalnız su buharlaşıyor'][m.op]}</T>
 {[[125,100,m.p,'Önce'],[355,m.total,m.sugar,'Sonra']].map(([x,total,sugar,label])=><g key={label}><R x={x-45} y={200-total*1.4} w={90} h={total*1.4} tone="primary-soft"/><R x={x-45} y={200-sugar*1.4} w={90} h={sugar*1.4} tone="warn-soft"/><T x={x} y={228}>{label+' '+show(total)+' g'}</T><T x={x} y={253} style={{fontSize:13}}>{'Şeker '+show(sugar)+' g'}</T></g>)}
 <T x={240} y={280} style={{fontSize:13}}>{'İşlenen '+m.actual+' g · son yüzde '+show(m.pct)}</T></>;}
export const diagrams={'yk-taban':Base,'yk-agirlik':Mix,'yk-islem':Change};
