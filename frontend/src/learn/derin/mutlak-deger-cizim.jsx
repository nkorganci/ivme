import { C, L, T, R, times } from './svg.jsx';
import { show } from './yardim.js';

const X = (x) => 30+(x+10)*21;
function Axis({y=180}) { return <><L x1={30} y1={y} x2={450} y2={y}/>{times(11,(i)=><g key={i}><L x1={X(i*2-10)} y1={y-4} x2={X(i*2-10)} y2={y+4}/><T x={X(i*2-10)} y={y+23} style={{fontSize:12}}>{i*2-10}</T></g>)}</>; }
function Route({model:m}) {return <>
  <T x={240} y={28}>İki durağa toplam uzaklık</T><Axis/>
  <L x1={X(m.x)} y1={85} x2={X(-2)} y2={85} tone="accent-line" strokeWidth={5}/><T x={240} y={70}>{`Birinci mesafe ${m.left}`}</T>
  <L x1={X(m.x)} y1={125} x2={X(4)} y2={125} tone="line" strokeWidth={5}/><T x={240} y={112}>{`İkinci mesafe ${m.right}`}</T>
  {[-2,4].map((x)=><g key={x}><C x={X(x)} y={180} tone="good"/><T x={X(x)} y={230}>{`Durak ${x}`}</T></g>)}
  <C x={X(m.x)} y={180}/><T x={X(m.x)} y={155}>{`x=${m.x}`}</T><T x={240} y={272}>{`Toplam ${m.total} · kural: ${m.part}`}</T>
  </>;}
function Equation({model:m}) {
  const px=(x)=>30+(x+10)*420/24, py=(y)=>235-(y+4)*200/28;
  return <><T x={240} y={22}>Kesişim başlangıç denkleminde doğrulanır</T>
    <L x1={30} y1={py(0)} x2={450} y2={py(0)}/><L x1={px(0)} y1={35} x2={px(0)} y2={235}/>
    <path d={`M${px(-10)} ${py(14)} L${px(4)} ${py(0)} L${px(14)} ${py(10)}`} className="lm-accent-line" fill="none" strokeWidth={3}/>
    <L x1={px((-4-m.b)/2)} y1={py(-4)} x2={px((24-m.b)/2)} y2={py(24)} strokeWidth={2}/>
    {m.accepted.map((x)=><g key={x}><C x={px(x)} y={py(Math.abs(x-4))} r={7} tone="good"/><T x={Math.max(70,Math.min(410,px(x)))} y={Math.max(55,py(Math.abs(x-4))-15)}>{`x=${show(x)}`}</T></g>)}
    <T x={240} y={261} style={{fontSize:14}}>{'V: |x−4| · doğru: 2x+b'}</T><T x={240} y={283} style={{fontSize:14}}>{`Geçerli kök: ${m.accepted.map(show).join('; ')}`}</T>
  </>;
}
function Band({model:m}) {return <><T x={240} y={30}>{m.equation}</T><Axis y={125}/>
  {m.points.map((x)=><C key={x} x={X(x)} y={125} r={5} tone="good"/>)}
  {[m.lo,m.hi].map((x,i)=><g key={i}><C x={X(x)} y={125} r={9} tone={m.op%2 ? 'primary':'soft'} stroke="currentColor" strokeWidth={2}/><T x={X(x)} y={i?205:180}>{`Sınır ${x}`}</T></g>)}
  <T x={240} y={240}>{`−10…10 içinde ${m.points.length} tam sayı`}</T><T x={240} y={273} style={{fontSize:14}}>{m.op>=2?'Dış bölgeler pencerenin ötesinde sürer':'Merkeze yakın noktaları seçiyoruz'}</T>
  </>;}
function Median({model:m}) {return <><T x={240} y={25}>Üç eve uzaklıkların toplamı</T><Axis y={190}/>
  {m.homes.map((x,i)=><g key={i}><L x1={X(m.x)} y1={58+i*36} x2={X(x)} y2={58+i*36} tone="accent-line" strokeWidth={4}/><T x={240} y={49+i*36} style={{fontSize:13}}>{`Ev ${x}: uzaklık ${m.distances[i]}`}</T><C x={X(x)} y={190} tone="good"/></g>)}
  <C x={X(m.x)} y={190}/><T x={X(m.x)} y={164}>{`x=${m.x}`}</T><R x={70} y={233} w={340} h={45}/><T x={240} y={262}>{`Toplam ${m.total} · en küçük ${m.minimum}`}</T>
  </>;}
export const diagrams = {'mutlak-parcali':Route,'mutlak-denklem':Equation,'mutlak-bant':Band,'mutlak-ortanca':Median};
