import {L,R,T,times} from './svg.jsx';
function Timeline({model:m}) {const s=4;
  return <><T x={240} y={24}>{'Fark sabit: '+m.diff+' yıl'}</T>
  <R x={40} y={60} w={Math.max(2,m.big*s)} h={34} tone="primary-soft" rx={4}/><T x={40+Math.max(2,m.big*s)/2} y={83}>{'Büyük '+m.big}</T>
  <R x={40} y={120} w={Math.max(2,m.small*s)} h={34} tone="good-soft" rx={4}/><T x={40+Math.max(14,m.small*s/2)} y={143}>{'Küçük '+m.small}</T>
  <R x={40+m.small*s} y={120} w={Math.max(2,m.diff*s)} h={34} tone="warn-soft" rx={4}/><T x={40+m.small*s+m.diff*s/2} y={143} style={{fontSize:13}}>{'fark '+m.diff}</T>
  <T x={240} y={200}>{'Toplam '+m.sum+' · '+(m.t>=0?m.t+' yıl sonra':(-m.t)+' yıl önce')}</T>
  <T x={240} y={262} style={{fontSize:13}}>Turuncu parça her yıl aynı boyda kalır</T></>;}
function Group({model:m}) {const w=Math.min(48,400/m.n);
  return <><T x={240} y={24}>{m.n+' kişi: ortalama yüksekliği '+m.m+' → '+m.avg}</T>
  {times(m.n,(i)=><g key={i}><R x={40+i*(w+6)} y={220-m.m*3} w={w} h={m.m*3} tone="primary-soft" rx={3}/><R x={40+i*(w+6)} y={220-(m.m+m.t)*3} w={w} h={m.t*3} tone="good-soft" rx={3}/></g>)}
  <L x1={30} y1={220} x2={450} y2={220} tone="line"/>
  <T x={240} y={250}>{'Toplam '+m.S+' → '+m.total+' (+'+(m.n*m.t)+')'}</T><T x={240} y={276} style={{fontSize:13}}>Mavi: ortalama · yeşil: kişi başına geçen yıl</T></>;}
function Work({model:m}) {const W=400,u=W/m.L,days=Math.max(m.t,0);
  return <><T x={240} y={24}>{'İş '+m.L+' parça: Ayşe '+m.ra+', Mert '+m.rb+' parça/gün'}</T>
  <R x={40} y={70} w={W} h={46} tone="soft" rx={4}/>
  {times(days,(i)=><g key={i}><R x={40+Math.min(W,i*(m.ra+m.rb)*u)} y={70} w={Math.max(0,Math.min(m.ra*u,W-i*(m.ra+m.rb)*u))} h={46} tone="primary-soft" rx={0}/>
    <R x={40+Math.min(W,(i*(m.ra+m.rb)+m.ra)*u)} y={70} w={Math.max(0,Math.min(m.rb*u,W-(i*(m.ra+m.rb)+m.ra)*u))} h={46} tone="good-soft" rx={0}/></g>)}
  <T x={240} y={150}>{'Yapılan '+m.done+' · kalan '+m.left+' parça'}</T>
  <T x={240} y={185}>{'Birlikte bütün iş '+m.together+' gün'}</T>
  <T x={240} y={220}>{'Kalanı Ayşe yalnız: '+m.aloneDays+' gün'}</T>
  <T x={240} y={270} style={{fontSize:13}}>Mavi Ayşe’nin, yeşil Mert’in her gün eklediği iş</T></>;}
export const diagrams={'yi-zaman':Timeline,'yi-grup':Group,'yi-is':Work};
