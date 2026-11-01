import {L,R,T} from './svg.jsx';
import {show} from './yardim.js';
function Common({model:m}) {const u=Math.min(32,380/(m.b+m.c)),h=m.a*26,x0=240-(m.b+m.c)*u/2;
  return <><T x={240} y={24}>{'Ortak kenar '+m.a+' bir kez yazılır'}</T>
    <R x={x0} y={60} w={m.b*u-2} h={h} tone="primary-soft" rx={2}/><R x={x0+m.b*u} y={60} w={m.c*u-2} h={h} tone="good-soft" rx={2}/>
    <T x={x0+m.b*u/2} y={60+h/2+5}>{show(m.left)}</T><T x={x0+m.b*u+m.c*u/2} y={60+h/2+5}>{show(m.right)}</T>
    <T x={x0-16} y={60+h/2+5}>{'a='+m.a}</T><T x={x0+m.b*u/2} y={50} style={{fontSize:13}}>{'b='+m.b}</T><T x={x0+m.b*u+m.c*u/2} y={50} style={{fontSize:13}}>{'c='+m.c}</T>
    <L x1={x0} y1={60+h+14} x2={x0+(m.b+m.c)*u} y2={60+h+14} tone="accent-line" strokeWidth={3}/><T x={240} y={60+h+34}>{'b + c = '+(m.b+m.c)}</T>
    <T x={240} y={280} style={{fontSize:14}}>{m.left+' + '+m.right+' = '+m.a+' × '+(m.b+m.c)+' = '+m.total}</T></>;}
function Squares({model:m}) {const u=200/m.a,x0=140,y0=40,b=m.b*u,d=m.d*u;
  return <><T x={240} y={24}>{'Kenar a = '+m.a+' kare, köşede b = '+m.b+' kare'}</T>
    <R x={x0} y={y0} w={b} h={b} tone="warn-soft" rx={0}/><R x={x0+b} y={y0} w={d} h={b} tone="primary-soft" rx={0}/>
    <R x={x0} y={y0+b} w={b} h={d} tone="primary-soft" rx={0}/><R x={x0+b} y={y0+b} w={d} h={d} tone="good-soft" rx={0}/>
    <T x={x0+b/2} y={y0+b/2+5} style={{fontSize:13}}>{'I '+m.I}</T><T x={x0+b+d/2} y={y0+b/2+5} style={{fontSize:13}}>{'II '+m.II}</T>
    <T x={x0+b/2} y={y0+b+d/2+5} style={{fontSize:13}}>{'III '+m.III}</T><T x={x0+b+d/2} y={y0+b+d/2+5} style={{fontSize:13}}>{'IV '+m.IV}</T>
    <T x={240} y={262}>{'(a − b)² = IV = '+m.IV+' · a² − b² = '+(m.total-m.I)}</T><T x={240} y={284} style={{fontSize:13}}>Yeşil kare tam kareyi, mavi + yeşil iki kare farkını gösterir</T></>;}
function Cross({model:m}) {const box=(x,y,label,tone)=><g><R x={x} y={y} w={110} h={44} tone={tone}/><T x={x+55} y={y+28}>{label}</T></g>;
  return <><T x={240} y={24}>{'Orta katsayı = çapraz çarpımların toplamı'}</T>
    {box(90,50,show(m.m)+'x','primary-soft')}{box(280,50,show(m.n),'warn-soft')}{box(90,140,show(m.r)+'x','primary-soft')}{box(280,140,show(m.s),'warn-soft')}
    <L x1={200} y1={72} x2={280} y2={162} tone="accent-line" strokeWidth={3}/><L x1={200} y1={162} x2={280} y2={72} tone="accent-line" strokeWidth={3}/>
    <T x={240} y={212}>{'Doğru: '+m.m+'·'+show(m.s)+' + '+show(m.n)+'·'+m.r+' = '+show(m.middle)}</T>
    <T x={240} y={240} style={{fontSize:14}}>{'n ve s yer değişirse: '+m.m+'·'+show(m.n)+' + '+show(m.s)+'·'+m.r+' = '+show(m.swapped)}</T>
    <T x={240} y={272} style={{fontSize:13}}>{'Baş katsayı '+m.lead+' ve sabit '+show(m.constant)+' iki yerleşimde de aynı'}</T></>;}
export const diagrams={'carpan-ortak':Common,'carpan-alan':Squares,'carpan-capraz':Cross};
