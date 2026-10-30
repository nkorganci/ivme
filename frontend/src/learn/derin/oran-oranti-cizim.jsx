import {C,L,R,T,times} from './svg.jsx';
import {show} from './yardim.js';
function Types({model:m}) {
  const px=(x)=>35+x*50,py=(y)=>225-y*7;
  const curve=times(81,(i)=>{const x=1+7*i/80;return (i?'L':'M')+px(x)+' '+py(24/x);}).join(' ');
  return <><T x={240} y={22}>Doğruda bölüm, terste çarpım sabit</T><L x1={px(0)} y1={py(0)} x2={445} y2={py(0)}/><L x1={px(0)} y1={40} x2={px(0)} y2={py(0)}/>
    <L x1={px(0)} y1={py(0)} x2={px(8)} y2={py(24)} tone="accent-line" strokeWidth={3}/><path d={curve} fill="none" className="lm-line" strokeWidth={3}/>
    <C x={px(m.x)} y={py(m.direct)}/><C x={px(m.x)} y={py(m.inverse)} tone="good"/>
    <T x={240} y={255}>{'x='+m.x+' · 3x='+m.direct+' · 24/x='+show(m.inverse)}</T><T x={240} y={282} style={{fontSize:14}}>Aynı eksenlerde iki farklı ilişki</T></>;
}
function Shares({model:m}) {
  return <><T x={240} y={25}>{'Aynı toplam: '+m.total+' lira'}</T>
  {[m.direct,m.inverse].map((shares,row)=>{let start=30;return <g key={row}><T x={240} y={60+row*115}>{row?'Ters ağırlık 3:2:1':'Doğru ağırlık 2:3:6'}</T>{shares.map((n,i)=>{const x=start,w=n/m.total*420;start+=w;return <g key={i}><R x={x} y={75+row*115} w={w-2} h={50} tone={['primary-soft','good-soft','warn-soft'][i]}/><T x={x+w/2} y={106+row*115}>{n}</T></g>;})}</g>;})}
  <T x={240} y={278} style={{fontSize:14}}>Küçük ağırlık, ters paylaşımda büyük pay alır</T></>;
}
function Work({model:m}) {return <><T x={240} y={24}>{m.w+' işçi × '+m.h+' saat/gün × '+m.d+' gün'}</T>
  {times(m.w*m.h,(i)=><g key={i}><R x={40+(i%m.h)*400/m.h} y={45+Math.floor(i/m.h)*180/m.w} w={400/m.h-3} h={180/m.w-3} tone="primary-soft" rx={3}/><T x={40+(i%m.h+.5)*400/m.h} y={45+(Math.floor(i/m.h)+.6)*180/m.w} style={{fontSize:13}}>{m.perCell}</T></g>)}
  <T x={240} y={250}>{m.cells+' hücre × '+m.perCell+' parça = '+m.total}</T><T x={240} y={278} style={{fontSize:13}}>Satır işçi, sütun bir günlük çalışma saati</T></>;}
export const diagrams={'oran-tur':Types,'oran-pay':Shares,'oran-bilesik':Work};
