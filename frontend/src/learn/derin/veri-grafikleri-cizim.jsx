import {L,R,T} from './svg.jsx';
import {show} from './yardim.js';
const TONES=['primary-soft','warn-soft','good-soft'];
function Pie({cx,cy,r,angles,title}){let a0=-90;return <g>
 <T x={cx} y={cy-r-14} style={{fontSize:13}}>{title}</T>
 {angles.map((ang,i)=>{const a1=a0+ang,rad=(d)=>d*Math.PI/180,p=(d)=>[cx+r*Math.cos(rad(d)),cy+r*Math.sin(rad(d))],[x0,y0]=p(a0),[x1,y1]=p(a1),mid=p(a0+ang/2),lx=cx+(mid[0]-cx)*0.62,ly=cy+(mid[1]-cy)*0.62;const d=`M${cx},${cy} L${x0},${y0} A${r},${r} 0 ${ang>180?1:0} 1 ${x1},${y1} Z`;a0=a1;return <g key={i}><path d={d} className={'lm-'+TONES[i]}/><T x={lx} y={ly+5} style={{fontSize:12}}>{'ABC'[i]+' '+ang+'°'}</T></g>;})}</g>;}
function TwoPies({model:m}){return m.valid?<>
 <Pie cx={125} cy={130} r={78} angles={[m.a1,m.b1,m.c1]} title="Sayı"/>
 <Pie cx={355} cy={130} r={78} angles={[m.a2,m.b2,m.c2]} title="Ağırlık"/>
 <T x={240} y={250} style={{fontSize:13}}>{m.ratios.map(([k,r])=>k+': '+show(Math.round(r*100)/100)).join('   ')}</T>
 <T x={240} y={274}>{m.equation}</T></>:<T x={240} y={140}>{m.equation}</T>;}
function Mosaic({model:m}){if(!m.valid)return <T x={240} y={140}>{m.equation}</T>;let x=40;const H=180,top=50,scale=H/30;return <>
 <T x={240} y={24}>Genişlik = pay, koyu kısım = iade yüzdesi</T>
 {m.cats.map((c,i)=>{const w=400*c.ang/360,x0=x;x+=w;return <g key={c.k}><R x={x0} y={top} w={w-3} h={H} rx={2} tone={TONES[i]}/><R x={x0} y={top+H-c.p*scale} w={w-3} h={c.p*scale} rx={2} tone={['primary','warn','good'][i]}/><T x={x0+w/2} y={top-8} style={{fontSize:12}}>{c.k+' · '+show(c.sold)}</T><T x={x0+w/2} y={top+H+18} style={{fontSize:12}}>{'%'+c.p+' → '+show(c.ret)}</T></g>;})}
 <L x1={40} y1={top+H-m.pct*scale} x2={440} y2={top+H-m.pct*scale} style={{strokeDasharray:'5 4'}}/>
 <T x={440} y={top+H-m.pct*scale-6} anchor="end" style={{fontSize:12}}>{'genel %'+show(Math.round(m.pct*100)/100)}</T></>;}
function Hist({model:m}){const maxN=Math.max(1,...m.groups.map((g)=>g.n)),bw=90,base=220,u=150/maxN,X=(v)=>50+(v-m.groups[0].lo)*bw/m.w;return <>
 <T x={240} y={22}>Histogram ve ortalamanın sınırları</T>
 <L x1={40} y1={base} x2={440} y2={base}/>
 {m.groups.map((g,i)=><g key={i}><R x={50+i*bw} y={base-g.n*u} w={bw} h={g.n*u} rx={0} tone={TONES[i%3]}/><T x={50+i*bw+bw/2} y={base-g.n*u-6} style={{fontSize:12}}>{g.n}</T><T x={50+i*bw+bw/2} y={base+16} style={{fontSize:11}}>{g.lo+'–'+g.hi}</T></g>)}
 {m.total?<><L x1={X(m.minMean)} y1={base+24} x2={X(m.maxMean)} y2={base+24} tone="primary" style={{strokeWidth:5}}/>
 <T x={240} y={272} style={{fontSize:13}}>{'Ortalama '+show(Math.round(m.minMean*100)/100)+' ile '+show(Math.round(m.maxMean*100)/100)+' arasında'}</T></>:null}</>;}
export const diagrams={'vg-iki-daire':TwoPies,'vg-iade':Mosaic,'vg-histogram':Hist};
