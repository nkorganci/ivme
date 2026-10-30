import {C,L,R,T} from './svg.jsx';
import {show} from './yardim.js';
function Sign({model:m}) {return <><T x={240} y={30}>Parantez çarpanın işaretini belirler</T>
  {m.factors.map((v,i)=><g key={i}><R x={20+i*74} y={66} w={66} h={52} tone="primary-soft"/><T x={53+i*74} y={99}>{v}</T></g>)}
  <T x={240} y={155}>{'Parantez içinde: '+m.inside}</T><T x={240} y={195}>{'Önce 2’nin kuvveti, sonra eksi: '+m.outside}</T>
  <T x={240} y={250}>{m.n%2?'Tek sayıda negatif çarpan':'Çift sayıda negatif çarpan'}</T></>;}
function Factor({model:m}) {return <><T x={240} y={30}>{'Her kutunun büyüklüğü '+m.common}</T>
  <R x={28} y={58} w={424} h={70} tone="primary-soft"/><T x={240} y={100}>{'İlk terim: 1 kutu = '+m.common}</T>
  <R x={28} y={150} w={424} h={70} tone="good-soft"/>
  {Array.from({length:m.multiplier},(_,i)=><L key={i} x1={28+i*424/m.multiplier} y1={150} x2={28+i*424/m.multiplier} y2={220}/>)}
  <T x={240} y={190}>{'İkinci: '+m.multiplier+' kutu = '+m.second}</T><T x={240} y={269}>{(1+m.multiplier)+' × '+m.common+' = '+m.total}</T></>;}
function Growth({model:m}) {
  const max=Math.max(m.exp,m.linear,3),px=(n)=>45+n*62,py=(y)=>235-y/max*185;
  const path=(key)=>m.points.map((p,i)=>(i?'L':'M')+px(p.n)+' '+py(p[key])).join(' ');
  return <><T x={240} y={22}>Aynı eksende ekleme ve çarpma</T><L x1={45} y1={235} x2={440} y2={235}/><L x1={45} y1={40} x2={45} y2={235}/>
    <path d={path('linear')} className="lm-line" fill="none" strokeWidth={3}/><path d={path('exp')} className="lm-accent-line" fill="none" strokeWidth={3}/>
    {m.points.map((p)=><g key={p.n}><C x={px(p.n)} y={py(p.linear)} r={4} tone="good"/><C x={px(p.n)} y={py(p.exp)} r={4}/><T x={px(p.n)} y={255} style={{fontSize:12}}>{p.n}</T></g>)}
    <T x={23} y={55} style={{fontSize:12}}>{show(max)}</T><T x={240} y={282} style={{fontSize:14}}>{'1+2n: '+m.linear+' · '+m.a+'ⁿ: '+m.exp}</T></>;
}
export const diagrams={'uslu-parantez':Sign,'uslu-ortak':Factor,'uslu-buyume':Growth};
