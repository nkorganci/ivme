import {C,L,R,T} from './svg.jsx';
import {show} from './yardim.js';
function Garden({model:m}) {const scale=180/(m.x+2);return <><T x={240} y={25}>Uzunluk enin 2 m fazlası</T>
  <R x={130} y={55} w={m.length*scale} h={m.x*scale} tone="good-soft" rx={0}/>
  <T x={220} y={45}>{m.length+' m'}</T><T x={90} y={55+m.x*scale/2}>{m.x+' m'}</T><T x={220} y={70+m.x*scale/2}>{m.area+' m²'}</T>
  <T x={240} y={250}>{'Hedef 24 m² · fark '+show(m.area-24)}</T><T x={240} y={279} style={{fontSize:13}}>İki uzunluk çarpılınca x² oluşur</T></>;}
function Graph({model:m}) {
  const ys=[0,...m.points.map((p)=>p[1])],min=Math.min(...ys)-2,max=Math.max(...ys)+2;
  const px=(x)=>35+(x-m.lo)/(m.hi-m.lo)*410,py=(y)=>230-(y-min)/(max-min)*190;
  const path=m.points.map(([x,y],i)=>(i?'L':'M')+px(x)+' '+py(y)).join(' ');
  return <><T x={240} y={23}>{'Δ='+m.delta+' · '+m.roots.length+' farklı gerçek kök'}</T>
    <L x1={35} y1={py(0)} x2={445} y2={py(0)}/><L x1={px(0)} y1={35} x2={px(0)} y2={235}/>
    <path d={path} fill="none" className="lm-accent-line" strokeWidth={3}/>
    {m.roots.map((x,i)=><g key={i}><C x={px(x)} y={py(0)} r={6} tone="good"/><T x={Math.max(60,Math.min(420,px(x)))} y={255+i*22} style={{fontSize:13}}>{'x='+show(x)}</T></g>)}
    {!m.roots.length&&<T x={240} y={264}>Grafik x eksenine ulaşmıyor</T>}
    <T x={24} y={py(0)-8} style={{fontSize:11}}>0</T>
  </>;
}
function Vieta({model:m}) {return <><T x={240} y={28}>Kökler → katsayılar → yeni ifade</T>
  <R x={30} y={55} w={180} h={55} tone="primary-soft"/><R x={270} y={55} w={180} h={55} tone="primary-soft"/>
  <T x={120} y={90}>{'r = '+m.r}</T><T x={360} y={90}>{'s = '+m.s}</T>
  <L x1={120} y1={110} x2={240} y2={145}/><L x1={360} y1={110} x2={240} y2={145}/>
  <R x={60} y={150} w={360} h={50} tone="good-soft"/><T x={240} y={181}>{'S='+m.S+' · P='+m.P}</T>
  <T x={240} y={236}>{'r²+s² = '+m.squareSum}</T><T x={240} y={270} style={{fontSize:14}}>{m.P===0?'Ters kök yok: P=0':'1/r+1/s = S/P ≈ '+show(m.reciprocal)}</T></>;}
export const diagrams={'ikinci-derece-denklemler':Garden,'ikinci-grafik':Graph,'ikinci-vieta':Vieta};
