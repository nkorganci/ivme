import {C,L,R,T} from './svg.jsx';
function Three({model:m}){const r=m.r;return <>
 <C x={190} y={115} r={78} tone="soft" style={{fillOpacity:0.5}}/><C x={290} y={115} r={78} tone="soft" style={{fillOpacity:0.5}}/><C x={240} y={195} r={78} tone="soft" style={{fillOpacity:0.5}}/>
 <T x={120} y={50} style={{fontSize:13}}>A</T><T x={360} y={50} style={{fontSize:13}}>B</T><T x={330} y={260} style={{fontSize:13}}>C</T>
 {[[150,100,r.a],[330,100,r.b],[240,240,r.c],[240,85,r.ab],[190,170,r.ac],[290,170,r.bc],[240,140,r.abc]].map(([x,y,n],i)=><T key={i} x={x} y={y} style={{fontSize:15}} className={n<0?'lm-warn':undefined}>{n}</T>)}
 <T x={240} y={278} style={{fontSize:13}}>{m.equation}</T></>;}
function Bounds({model:m}){if(!m.valid)return <T x={240} y={140}>{m.equation}</T>;const X=(n)=>40+400*n/m.e;return <>
 <T x={240} y={24}>{'Evrensel küme: '+m.e+' eleman'}</T>
 <T x={40} y={56} anchor="start" style={{fontSize:13}}>Kesişim en az</T>
 <R x={X(0)} y={64} w={X(m.a)-X(0)} h={22} tone="primary-soft"/><R x={X(m.e-m.b)} y={92} w={X(m.e)-X(m.e-m.b)} h={22} tone="warn-soft"/>
 {m.lo>0?<R x={X(m.e-m.b)} y={64} w={X(m.a)-X(m.e-m.b)} h={50} rx={2} tone="good-soft" style={{fillOpacity:0.6}}/>:null}
 <T x={440} y={130} anchor="end" style={{fontSize:13}}>{'ortak '+m.lo}</T>
 <T x={40} y={160} anchor="start" style={{fontSize:13}}>Kesişim en çok</T>
 <R x={X(0)} y={168} w={X(m.a)-X(0)} h={22} tone="primary-soft"/><R x={X(0)} y={196} w={X(m.b)-X(0)} h={22} tone="warn-soft"/>
 <R x={X(0)} y={168} w={X(m.hi)-X(0)} h={50} rx={2} tone="good-soft" style={{fillOpacity:0.6}}/>
 <T x={440} y={234} anchor="end" style={{fontSize:13}}>{'ortak '+m.hi}</T>
 <T x={240} y={266} style={{fontSize:13}}>Mavi A, turuncu B, yeşil kesişim</T></>;}
function Table({model:m}){const cw=Math.min(54,360/m.nb),chh=Math.min(36,200/m.na),x0=240-m.nb*cw/2+20,y0=56;return <>
 <T x={240} y={24}>{'A × B · koşul: '+m.name}</T>
 {Array.from({length:m.nb},(_,j)=><T key={'b'+j} x={x0+j*cw+cw/2} y={y0-8} style={{fontSize:12}}>{j+1}</T>)}
 {Array.from({length:m.na},(_,i)=><T key={'a'+i} x={x0-14} y={y0+i*chh+chh/2+4} style={{fontSize:12}}>{i+1}</T>)}
 {m.cells.map((c)=><R key={c.a+'-'+c.b} x={x0+(c.b-1)*cw+1} y={y0+(c.a-1)*chh+1} w={cw-2} h={chh-2} rx={3} tone={c.ok?'good-soft':'soft'}/>)}
 <L x1={x0-24} y1={y0-20} x2={x0-4} y2={y0-4}/>
 <T x={240} y={272} style={{fontSize:13}}>{m.equation}</T></>;}
export const diagrams={'ki-uc':Three,'ki-sinir':Bounds,'ki-kartezyen':Table};
