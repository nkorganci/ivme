import {C,L,R,T} from './svg.jsx';
import {show} from './yardim.js';
const PLACE={2:['Onlar','Birler'],3:['Yüzler','Onlar','Birler'],4:['Binler','Yüzler','Onlar','Birler']};
function Boxes({model:m}){const names=PLACE[m.b],w=64,x0=150,rowH=78,y0=m.cases.length>1?62:96;return <>
 <T x={240} y={24}>{'Küme {'+m.digits.join(', ')+'}'}</T>
 {names.map((n,i)=><T key={n} x={x0+i*(w+10)+w/2} y={y0-10} style={{fontSize:12}}>{n}</T>)}
 {m.cases.map((c,r)=><g key={c.label}>
  <T x={16} y={y0+r*rowH+30} anchor="start" style={{fontSize:13}}>{c.label}</T>
  {c.boxes.map((b,i)=><g key={i}><R x={x0+i*(w+10)} y={y0+r*rowH} w={w} h={46} tone={i===c.boxes.length-1&&m.p?'warn-soft':i===0&&m.z?'primary-soft':'soft'}/><T x={x0+i*(w+10)+w/2} y={y0+r*rowH+29} style={{fontSize:17}}>{show(b)}</T></g>)}
  <T x={x0+c.boxes.length*(w+10)+8} y={y0+r*rowH+29} anchor="start" style={{fontSize:14}}>{'= '+show(c.count)}</T></g>)}
 <T x={240} y={262} style={{fontSize:13}}>{m.cases.length>1?'İki durum toplanır: '+m.cases.map((c)=>show(c.count)).join(' + ')+' = '+show(m.boxTotal):'Kutular çarpılır: '+show(m.boxTotal)}</T>
 <T x={240} y={282} style={{fontSize:12}}>Turuncu: birler koşulu · mavi: 0 yazılamayan baş basamak</T></>;}
function Order({model:m}){const key=m.letters.slice(0,m.k),perms=[];const walk=(rest,acc)=>{if(!rest.length){perms.push(acc);return;}rest.forEach((x,i)=>walk([...rest.slice(0,i),...rest.slice(i+1)],acc+x));};walk(key,'');const shown=perms.slice(0,12),cw=Math.min(70,440/shown.length);return <>
 <T x={240} y={24}>{'Sırası sabit harfler: '+key.join(', ')}</T>
 {shown.map((p,i)=><g key={p}><R x={20+i*cw} y={44} w={cw-6} h={34} rx={6} tone={p===key.join('')?'good-soft':'soft'}/><T x={20+i*cw+(cw-6)/2} y={66} style={{fontSize:Math.min(14,cw/4.2)}}>{p}</T></g>)}
 {perms.length>shown.length?<T x={240} y={96} style={{fontSize:12}}>{'… toplam '+perms.length+' iç sıra; yalnız yeşil olan uygun'}</T>:<T x={240} y={96} style={{fontSize:12}}>{'Toplam '+perms.length+' iç sıra; yalnız yeşil olan uygun'}</T>}
 <T x={240} y={134}>{show(m.total)+' : '+perms.length+' = '+show(m.count)}</T>
 <T x={240} y={170} style={{fontSize:13}}>Uygun sıralamalardan örnekler</T>
 {m.sample.map((s,i)=><T key={s} x={60+(i%3)*180} y={198+Math.floor(i/3)*30} style={{fontSize:15}}>{s.split('').map((ch,j)=><tspan key={j} className={key.includes(ch)?'lm-good':undefined} style={key.includes(ch)?{strokeWidth:0,fontWeight:700}:undefined}>{ch}</tspan>)}</T>)}</>;}
function Grid({model:m}){const cs=Math.min(64,380/m.m,190/m.h),x0=240-m.m*cs/2,y0=240,X=(x)=>x0+x*cs,Y=(y)=>y0-y*cs,w=m.op===2?m.blockedW:m.w;return <>
 {Array.from({length:m.h+1},(_,y)=><L key={'h'+y} x1={X(0)} y1={Y(y)} x2={X(m.m)} y2={Y(y)}/>)}
 {Array.from({length:m.m+1},(_,x)=><L key={'v'+x} x1={X(x)} y1={Y(0)} x2={X(x)} y2={Y(m.h)}/>)}
 {w.flatMap((row,y)=>row.map((n,x)=><g key={x+'-'+y}><C x={X(x)} y={Y(y)} r={12} tone={x===m.cx&&y===m.cy&&m.op?'warn':'soft'}/><T x={X(x)} y={Y(y)+4} style={{fontSize:Math.min(11,cs/4.5)}}>{show(n)}</T></g>))}
 <T x={X(0)-16} y={Y(0)+18} style={{fontSize:13}}>A</T><T x={X(m.m)+16} y={Y(m.h)-10} style={{fontSize:13}}>B</T>
 {m.op?<T x={X(m.cx)+18} y={Y(m.cy)-14} style={{fontSize:13}}>C</T>:null}
 <T x={240} y={24} style={{fontSize:13}}>{m.op===2?'C kapalı: oraya 0 yazıldı, toplamaya devam edildi':'Her köşe = solundaki + altındaki'}</T>
 <T x={240} y={276} style={{fontSize:13}}>{m.equation}</T></>;}
export const diagrams={'sp-kutu':Boxes,'sp-once':Order,'sp-izgara':Grid};
