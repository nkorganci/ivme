import {C,L,R,T} from './svg.jsx';
import {show} from './yardim.js';
function Chain({model:m}){const col=[80,240,400];const step=(row,vals,labels)=><g>{vals.map((v,i)=><g key={i}><C x={col[i]} y={row} r={20} tone={i===2?'good':'primary-soft'}/><T x={col[i]} y={row+6}>{v}</T>{i<2?<><L x1={col[i]+22} y1={row} x2={col[i+1]-24} y2={row} tone="line"/><T x={(col[i]+col[i+1])/2} y={row-12} style={{fontSize:13}}>{labels[i]}</T></>:null}</g>)}</g>;return <>
 <T x={240} y={30}>f ∘ g: önce g, sonra f</T>
 {step(80,[m.x,m.gx,m.fg],['g','f'])}
 <T x={240} y={160}>g ∘ f: önce f, sonra g</T>
 {step(210,[m.x,m.fx,m.gf],['f','g'])}
 <T x={240} y={268} style={{fontSize:13}}>{m.fg===m.gf?'İki sıra bu x için eşit':'İki sıra farklı sonuç verdi'}</T></>;}
function Mirror({model:m}){const X=(x)=>240+x*16,Y=(y)=>140-y*16,R7=7,f=(x)=>m.m*x+m.n,fi=(x)=>(x-m.n)/m.m;
 // Doğruyu |x|, |y| ≤ 7 karesine kırp: y = ax + b için x aralığı.
 const seg=(a,b)=>{let lo=-R7,hi=R7;const x1=(-R7-b)/a,x2=(R7-b)/a;lo=Math.max(lo,Math.min(x1,x2));hi=Math.min(hi,Math.max(x1,x2));return lo<hi?[lo,hi]:null;};
 const sf=seg(m.m,m.n),si=seg(1/m.m,-m.n/m.m),inside=(x,y)=>Math.abs(x)<=R7&&Math.abs(y)<=R7;return <>
 <L x1={X(-R7)} y1={Y(0)} x2={X(R7)} y2={Y(0)}/><L x1={X(0)} y1={Y(-R7)} x2={X(0)} y2={Y(R7)}/>
 <L x1={X(-R7)} y1={Y(-R7)} x2={X(R7)} y2={Y(R7)} style={{strokeDasharray:'4 4'}}/>
 {sf?<L x1={X(sf[0])} y1={Y(f(sf[0]))} x2={X(sf[1])} y2={Y(f(sf[1]))} style={{stroke:'var(--navy)',strokeWidth:3}}/>:null}
 {si?<L x1={X(si[0])} y1={Y(fi(si[0]))} x2={X(si[1])} y2={Y(fi(si[1]))} style={{stroke:'var(--ok)',strokeWidth:3}}/>:null}
 {inside(m.inv,m.y)?<C x={X(m.inv)} y={Y(m.y)} r={6} tone="primary"/>:null}{inside(m.y,m.inv)?<C x={X(m.y)} y={Y(m.inv)} r={6} tone="good"/>:null}
 <T x={240} y={272} style={{fontSize:13}}>Lacivert f, yeşil f⁻¹, kesikli y = x</T></>;}
function Undo({model:m}){const box=(x,y,label,tone)=><g><R x={x} y={y} w={120} h={40} rx={8} tone={tone}/><T x={x+60} y={y+26} style={{fontSize:14}}>{label}</T></g>;return <>
 <T x={240} y={28}>{'Şifreleme: × '+m.k+', sonra + '+show(m.p)}</T>
 {box(40,50,'× '+m.k,'primary-soft')}{box(180,50,'+ '+show(m.p),'primary-soft')}<T x={360} y={76}>{'→ '+show(m.y)}</T>
 <T x={240} y={130}>Doğru çözme sırası</T>
 {box(40,145,'− '+show(m.p),'good-soft')}{box(180,145,': '+m.k,'good-soft')}<T x={360} y={171}>{'→ '+show(Math.round(m.right*100)/100)}</T>
 <T x={240} y={222} style={{fontSize:13}}>{'Yanlış sıra (: '+m.k+', − '+show(m.p)+') → '+show(Math.round(m.wrong*100)/100)}</T></>;}
export const diagrams={'bt-zincir':Chain,'bt-ters':Mirror,'bt-ters-bileske':Undo};
