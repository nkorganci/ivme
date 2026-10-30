import {C,L,R,T,times} from './svg.jsx';
import {show} from './yardim.js';
function Square({model:m}) {const step=180/m.s; return <><T x={240} y={24}>{'Alan '+m.n+' = '+m.s+'² × '+m.r}</T>
  {times(m.s*m.s,(i)=><R key={i} x={150+(i%m.s)*step} y={45+Math.floor(i/m.s)*step} w={step-1} h={step-1} tone="primary-soft" rx={0}/>)}
  <T x={85} y={128}>{m.s+' sıra'}</T><T x={240} y={249}>{'Bir kenar: '+m.s+' × √'+m.r}</T><T x={240} y={278} style={{fontSize:14}}>{'Her küçük karenin alanı '+m.r}</T></>;}
function Conjugate({model:m}) {const scale=32;return <><T x={240} y={24}>{'İki alan da '+m.area}</T>
  <R x={25} y={70} w={m.long*scale} h={m.short*scale} tone="primary-soft" rx={0}/><T x={25+m.long*scale/2} y={55}>{'√'+m.a+' + √'+m.b}</T>
  <T x={130} y={190} style={{fontSize:13}}>{'Kısa kenar √'+m.a+' − √'+m.b}</T>
  <R x={300} y={70} w={m.u*scale} h={m.u*scale} tone="good-soft" rx={0}/><R x={300} y={70} w={m.w*scale} h={m.w*scale} tone="warn-soft" rx={0}/>
  <T x={365} y={215}>{m.a+' − '+m.b+' = '+m.area}</T><T x={240} y={270}>Küçük kare çıkarılır; çapraz terimler silinir</T></>;}
function RootEquation({model:m}) {const px=(x)=>35+(x+6)*25,py=(y)=>230-(y+4)*16;
  const points=times(81,(i)=>{const x=-m.c+i*(10+m.c)/80;return [px(x),py(Math.sqrt(Math.max(0,x+m.c)))];});
  return <><T x={240} y={24}>{m.equation}</T><L x1={35} y1={py(0)} x2={435} y2={py(0)}/><L x1={px(0)} y1={38} x2={px(0)} y2={235}/>
    <path d={points.map(([x,y],i)=>(i?'L':'M')+x+' '+y).join(' ')} fill="none" className="lm-accent-line" strokeWidth={3}/>
    <L x1={px(m.d-4)} y1={py(-4)} x2={px(10)} y2={py(10-m.d)}/>
    {m.candidates.map((x,i)=><g key={i}><C x={px(x)} y={py(x-m.d)} tone={x>=m.d?'good':'warn-soft'} r={7}/><T x={px(x)} y={i?110:260} style={{fontSize:13}}>{(x>=m.d?'Geçerli ':'Elendi ')+show(x)}</T></g>)}
    <T x={240} y={284} style={{fontSize:13}}>Karekök grafiği negatif çıktı üretmez</T></>;}
export const diagrams={'kok-carpan':Square,'kok-eslenik':Conjugate,'kok-denklem':RootEquation};
