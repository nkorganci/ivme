import {C,L,R,T,times} from './svg.jsx';
function Row({n,y,first,second,label}) {const step=Math.min(18,420/Math.max(n,1));const x0=240-step*n/2;
  return <g><T x={240} y={y-14} style={{fontSize:14}}>{label}</T>{times(n,(i)=><C key={i} x={x0+step*(i+.5)} y={y} r={Math.max(3,step/2-1.5)} tone={i+1===first?'good':i+1===second?'warn':'soft'}/>)}
    <T x={x0-14} y={y+5} style={{fontSize:12}}>baş</T><T x={x0+step*n+16} y={y+5} style={{fontSize:12}}>son</T></g>;}
function Queue({model:m}) {return <><T x={240} y={22}>{'Yeşil Güler (baştan '+m.a+'.), turuncu Ömer (sondan '+m.b+'.)'}</T>
  <Row n={m.nMax} y={95} first={m.a} second={m.nMax-m.b+1} label={'Güler önde: '+m.nMax+' kişi'}/>
  {m.nMin===null?<T x={240} y={190}>Ömer önde dizilim mümkün değil</T>:<Row n={m.nMin} y={190} first={m.a} second={m.front} label={'Ömer önde: '+m.nMin+' kişi'}/>}
  <T x={240} y={272} style={{fontSize:13}}>{'Aralarında her iki satırda da '+m.k+' kişi var'}</T></>;}
function Remain({model:m}) {const rows=m.steps.length,h=Math.min(26,190/rows/2);
  return <><T x={240} y={22}>Mavi: kalanın kesri · turuncu: bütünün kesri</T>
  {m.steps.map((s,i)=><g key={i}><T x={30} y={52+i*2*h+h} style={{fontSize:12}}>{i+'.'}</T>
    <R x={50} y={40+i*2*h} w={Math.max(1,s.kalan*400)} h={h-3} tone="primary-soft" rx={3}/>
    <R x={50} y={40+i*2*h+h} w={Math.max(1,s.butun*400)} h={h-3} tone="warn-soft" rx={3}/></g>)}
  <L x1={50} y1={36} x2={50} y2={44+rows*2*h} tone="line"/>
  <T x={240} y={270} style={{fontSize:13}}>{'Son durum: '+m.remKalan+' (kalanın) · '+m.remButun+' (bütünün)'}</T></>;}
function Count({model:m}) {const w=Math.min(36,420/m.N),x0=240-w*m.N/2;
  return <><T x={240} y={24}>{m.N+' ürün: '+(m.N-m.x)+' ucuz (3), '+m.x+' pahalı (3 + '+m.d+')'}</T>
  {times(m.N,(i)=><g key={i}><R x={x0+i*w} y={80} w={w-3} h={60} tone={i<m.x?'warn-soft':'primary-soft'} rx={4}/>{i<m.x&&<R x={x0+i*w} y={80-m.d*12} w={w-3} h={m.d*12-2} tone="good-soft" rx={2}/>}</g>)}
  <T x={240} y={170}>{'Hepsi ucuz: 3 × '+m.N+' = '+m.cheap}</T><T x={240} y={200}>{'Yeşil fazlalık: '+m.d+' × '+m.x+' = '+m.extra}</T>
  <T x={240} y={240} style={{fontSize:14}}>{'Toplam gelir '+m.total+'; fazlalık : fark = '+m.x+' pahalı'}</T></>;}
export const diagrams={'sk-sira':Queue,'sk-kalan':Remain,'sk-adet':Count};
