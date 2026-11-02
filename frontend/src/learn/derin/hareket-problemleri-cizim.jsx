import {C,L,R,T} from './svg.jsx';
import {show} from './yardim.js';
function Meet({model:m}){const u=400/m.d,cx=40+m.ac*u;const w=(h)=>Math.max(4,h*380/Math.max(m.t,m.ta,m.tb));return <>
 <T x={240} y={25}>Karşılaşma C’de</T>
 <R x={40} y={52} w={m.ac*u} h={16} tone="primary-soft"/><R x={cx} y={52} w={m.cb*u} h={16} tone="warn-soft"/>
 <L x1={40} y1={80} x2={440} y2={80}/>
 <C x={40} y={80} r={7}/><C x={440} y={80} r={7} tone="warn"/><C x={cx} y={80} r={8} tone="good"/>
 <T x={40} y={104}>A</T><T x={440} y={104}>B</T><T x={cx} y={104}>C</T>
 <T x={40+m.ac*u/2} y={46} style={{fontSize:13}}>{show(m.ac)+' km'}</T><T x={cx+m.cb*u/2} y={46} style={{fontSize:13}}>{show(m.cb)+' km'}</T>
 <T x={40} y={140} anchor="start" style={{fontSize:13}}>{'Karşılaşmaya kadar t = '+show(m.t)}</T><R x={40} y={148} w={w(m.t)} h={14} tone="good-soft"/>
 <T x={40} y={186} anchor="start" style={{fontSize:13}}>{'A kalan (CB) t_A = '+show(m.ta)}</T><R x={40} y={194} w={w(m.ta)} h={14} tone="primary-soft"/>
 <T x={40} y={232} anchor="start" style={{fontSize:13}}>{'B kalan (AC) t_B = '+show(m.tb)}</T><R x={40} y={240} w={w(m.tb)} h={14} tone="warn-soft"/>
 <T x={240} y={280}>{show(m.t)+'² = '+show(m.ta)+' · '+show(m.tb)}</T></>;}
function Gap({model:m}){const X=(t)=>60+t*370/m.last,Y=(g)=>230-g*180/m.total;const [p0,p1,p2]=m.points;return <>
 <T x={240} y={25}>Aradaki uzaklık (m) – zaman (dk)</T>
 <L x1={60} y1={230} x2={440} y2={230}/><L x1={60} y1={230} x2={60} y2={40}/>
 <L x1={X(p0[0])} y1={Y(p0[1])} x2={X(p1[0])} y2={Y(p1[1])} tone="primary" style={{strokeWidth:3}}/>
 <L x1={X(p1[0])} y1={Y(p1[1])} x2={X(p2[0])} y2={Y(p2[1])} tone="good" style={{strokeWidth:3}}/>
 {m.after?<><C x={X(p1[0])} y={Y(p1[1])} r={6} tone="warn"/>
 <L x1={X(p1[0])} y1={Y(p1[1])} x2={X(p1[0])} y2={230} style={{strokeDasharray:'4 4'}}/>
 <T x={X(p1[0])} y={250} style={{fontSize:13}}>{show(p1[0])}</T>
 <T x={X(p1[0])-8} y={Y(p1[1])-12} anchor="end" style={{fontSize:13}}>{show(p1[1])+' m'}</T></>:null}
 <C x={X(p2[0])} y={Y(p2[1])} r={6} tone="good"/><L x1={X(p2[0])} y1={Y(p2[1])} x2={X(p2[0])} y2={230} style={{strokeDasharray:'4 4'}}/>
 <T x={X(p2[0])} y={250} style={{fontSize:13}}>{show(p2[0])}</T><T x={X(p2[0])} y={Y(p2[1])-12} anchor="end" style={{fontSize:13}}>{show(p2[1])+' m'}</T>
 <T x={240} y={278} style={{fontSize:13}}>{'Önce '+(m.v1+m.v2)+' m/dk'+(m.after?', kırılmadan sonra '+m.after+' m/dk':'')}</T></>;}
function Track({model:m}){const cx=240,cy=140,r=92;const at=(s,rr=r)=>{const a=-Math.PI/2+2*Math.PI*s/m.c;return[cx+rr*Math.cos(a),cy+rr*Math.sin(a)];};const [x1,y1]=at(0),[x2,y2]=at(m.op===2?m.c/2:0);return <>
 <T x={240} y={22}>{['Aynı noktadan, zıt yön','Aynı noktadan, aynı yön','Çapın uçlarından, zıt yön'][m.op]}</T>
 <C x={cx} y={cy} r={r} tone="soft" style={{strokeWidth:6}}/>
 <C x={x1} y={y1} r={8}/><C x={x2} y={y2+(m.op===2?0:14)} r={8} tone="warn"/>
 {m.spots.map((s,i)=>{const [x,y]=at(s),[tx,ty]=at(s,r+22);return <g key={i}><C x={x} y={y} r={i===m.n-1?9:6} tone="good"/><T x={tx} y={ty+5} style={{fontSize:13}}>{i+1}</T></g>;})}
 <T x={cx} y={cy-6} style={{fontSize:13}}>{'Kapanma '+m.closing+' m/dk'}</T>
 <T x={cx} y={cy+16} style={{fontSize:13}}>{m.t===null?'karşılaşma yok':m.n+'. karşılaşma: '+show(m.t)+'. dk'}</T>
 <T x={240} y={272} style={{fontSize:13}}>{m.t===null?'Hızlar eşit':'Anlar: '+m.times.map((t)=>show(Math.round(t*100)/100)).join(' · ')}</T></>;}
export const diagrams={'hp-karsilasma':Meet,'hp-aralik':Gap,'hp-pist':Track};
