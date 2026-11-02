import {show} from './yardim.js';
export const explorations={
  'vg-iki-daire':{
    lessonId:'veri-grafikleri',title:'Adet grafiği ve miktar grafiği',
    story:'Aynı üç marka için iki daire grafiği var: biri topların sayısını, öbürü toplam ağırlıklarını gösteriyor. Bir markanın ağırlık dilimi sayı diliminden büyükse o markanın bir topu ortalamadan ağırdır.',
    terms:[['Adet payı','Kategorinin sayıca bütündeki payı: açı ÷ 360°.'],['Miktar payı','Kategorinin toplam miktardaki (ağırlık, para) payı.'],['Birim miktar','Bir tanenin miktarı; miktar payı ÷ adet payı ile orantılı.']],
    experiment:'Açıları değiştir ve birim ağırlık oranlarını izle. Bir markanın iki dilimi eşitse oranı kaç olur? Sıralamayı ters çevirebilir misin?',
    example:'Sayı dilimleri A 90°, B 150°, C 120°; ağırlık dilimleri A 60°, B 180°, C 120°. Hangi markanın topu en ağır?',
    steps:[['Oranlar','A $\\frac{60}{90}$, B $\\frac{180}{150}$, C $\\frac{120}{120}$.'],['Sayılar','$0{,}67$, $1{,}2$, $1$.'],['Sıralama','$K_A<K_C<K_B$.']],
    tip:'Birim miktarları karşılaştırmak için yalnız $\\frac{\\text{miktar açısı}}{\\text{adet açısı}}$ oranlarını karşılaştır; bütünleri bilmen gerekmez.',
    trap:'Yalnız miktar grafiğine bakmak: ağırlık dilimi büyük olan marka çok sayıda top yüzünden de büyük olabilir.',
    transfer:['A sayıca 120°, ağırlıkça 120° ise bir A topu ortalama topa göre nasıldır?','Ortalama ağırlıkta','Daha ağır','Oran $\\frac{120}{120}=1$: bir A topu bütün topların ortalama ağırlığındadır.'],
    expert:'Birim miktar $=\\frac{M\\cdot\\alpha_m/360}{N\\cdot\\alpha_n/360}=\\frac{M}{N}\\cdot\\frac{\\alpha_m}{\\alpha_n}$; $\\frac{M}{N}$ bütün kategorilerde ortak olduğu için sıralamayı açı oranları belirler.',
  },
  'vg-iade':{
    lessonId:'veri-grafikleri',title:'Payın yüzdesi: mozaik görünüm',
    story:'Satışların kategorilere dağılımı bir daire grafiğinde, her kategorinin iade yüzdesi bir sütun grafiğinde. Her kategoriyi genişliği payı, yüksekliği iade yüzdesi olan bir dikdörtgen gibi düşünürsen alan iade sayısını verir.',
    terms:[['Pay','Kategorinin bütündeki oranı (açı ÷ 360°).'],['Kategori yüzdesi','Kategorinin kendi içindeki oran (iade yüzdesi).'],['Genel oran','Bütün iadelerin bütün satışa oranı; paylarla ağırlıklı ortalama.']],
    experiment:'Dilim açılarını ve iade yüzdelerini değiştir. Genel iade oranı hangi kategorinin yüzdesine daha yakın? Yüzdeleri toplamak neden yanlış?',
    example:'1500 satışta A 96°, B 144°, C 120°; iade %5, %10, %8. Toplam iade?',
    steps:[['Satışlar','A 400, B 600, C 500.'],['İadeler','20, 60, 40.'],['Genel oran','$120:1500=$ %8.']],
    tip:'İade sayısı = bütün × pay × yüzde. Genel oran kategori yüzdelerinin payla ağırlıklı ortalamasıdır; iki uç yüzdenin arasında kalır.',
    trap:'Kategori yüzdelerini toplamak (%5 + %10 + %8 = %23) ya da basit ortalamasını almak.',
    transfer:['Satışların %75’i A (iade %4), %25’i B (iade %12) ise genel iade oranı?','%6','%8','$0{,}75\\cdot4+0{,}25\\cdot12=6$. %8 basit ortalamadır.'],
    expert:'Genel oran $p=\\sum w_ip_i$ ($\\sum w_i=1$). En yüksek yüzdeli kategorinin payı artarsa $p$ artar; bu, karışım problemlerindeki derişimle aynı yapıdır.',
  },
  'vg-histogram':{
    lessonId:'veri-grafikleri',title:'Histogramdan ortalamanın sınırları',
    story:'Histogram her grupta kaç veri olduğunu söyler ama grubun içindeki değerleri söylemez. Bu yüzden ortalama ve açıklık tam bulunmaz, iki değer arasında sınırlanır.',
    terms:[['Grup genişliği','Bir grubun kapsadığı ardışık tam sayıların sayısı (10–19: 10).'],['Alt uç / üst uç','Grubun en küçük ve en büyük değeri.'],['Biriken frekans','Baştan bir gruba kadar olan verilerin toplam sayısı.']],
    experiment:'Frekansları değiştir. En küçük ve en büyük ortalama arasındaki fark neden hep aynı kalıyor? Medyan grubu nasıl kayıyor?',
    example:'10–19: 4, 20–29: 5, 30–39: 1. Ortalama hangi aralıkta?',
    steps:[['Alt uçlar','$\\frac{40+100+30}{10}=17$.'],['Üst uçlar','$\\frac{76+145+39}{10}=26$.'],['Sonuç','$17\\le\\bar x\\le26$.']],
    tip:'En küçük ortalama için her veriyi alt uca, en büyük için üst uca koy. İki sınır arasındaki fark hep grup genişliği eksi 1’dir.',
    trap:'Grup ortalarıyla hesaplanan değeri (21,5) kesin ortalama sanmak.',
    transfer:['Gruplar 0–4 (2 veri) ve 5–9 (3 veri) ise ortalama en çok kaçtır?','7','5','Üst uçlar: $\\frac{2\\cdot4+3\\cdot9}{5}=7$.'],
    expert:'Tam sayı verilerde her veri en çok $w-1$ kayabilir; bu yüzden $\\bar x_{\\max}-\\bar x_{\\min}=w-1$. Açıklık en çok (son dolu grubun üst ucu − ilk dolu grubun alt ucu), en az (son dolu grubun alt ucu − ilk dolu grubun üst ucu) olur; tek dolu grup varsa en az 0’dır.',
  },
};
const range=(key,label,value,min,max,step=1)=>({key,label,value,min,max,step});
export const controls={
 'vg-iki-daire':[range('a1','A sayı açısı (°)',90,30,150,10),range('b1','B sayı açısı (°)',150,30,180,10),range('a2','A ağırlık açısı (°)',60,30,150,10),range('b2','B ağırlık açısı (°)',180,30,180,10)],
 'vg-iade':[range('a','A dilimi (°)',96,24,168,24),range('b','B dilimi (°)',144,24,168,24),range('pa','A iade (%)',5,0,30),range('pb','B iade (%)',10,0,30),range('pc','C iade (%)',8,0,30)],
 'vg-histogram':[range('w','Grup genişliği',10,5,20,5),range('f1','1. grup',4,0,10),range('f2','2. grup',5,0,10),range('f3','3. grup',1,0,10),range('f4','4. grup',0,0,10)],
};
export const HIST_START=10;
export const N_SALES=1500;
export function model(id,v){
 if(id==='vg-iki-daire'){const c1=360-v.a1-v.b1,c2=360-v.a2-v.b2;if(c1<=0||c2<=0)return{kind:id,...v,c1,c2,valid:false,ratios:[],equation:'Açılar 360°’yi aşıyor',observation:'Her grafikte A ve B’nin toplamı 360°’den küçük olmalı; C’ye yer kalmadı.'};
  const ratios=[['A',v.a2/v.a1],['B',v.b2/v.b1],['C',c2/c1]],order=[...ratios].sort((x,y)=>x[1]-y[1]);
  return{kind:id,...v,c1,c2,valid:true,ratios,equation:order.map(([k])=>'K'+k).join(' ≤ '),observation:'Birim ağırlık oranları: '+ratios.map(([k,r])=>k+' '+show(Math.round(r*100)/100)).join(', ')+'. En ağır '+order[2][0]+', en hafif '+order[0][0]+'.'};}
 if(id==='vg-iade'){const c=360-v.a-v.b;if(c<=0)return{kind:id,...v,c,valid:false,cats:[],equation:'Açılar 360°’yi aşıyor',observation:'A ve B dilimlerinin toplamı 360°’den küçük olmalı.'};
  const cats=[['A',v.a,v.pa],['B',v.b,v.pb],['C',c,v.pc]].map(([k,ang,p])=>({k,ang,p,sold:N_SALES*ang/360,ret:N_SALES*ang/360*p/100})),ret=cats.reduce((s,x)=>s+x.ret,0),pct=100*ret/N_SALES;
  return{kind:id,...v,c,valid:true,cats,ret,pct,equation:'İade '+show(ret)+' / '+N_SALES+' = %'+show(Math.round(pct*100)/100),observation:'Satışlar '+cats.map((x)=>x.k+' '+show(x.sold)).join(', ')+'. Genel oran %'+show(Math.round(pct*100)/100)+'; yüzdelerin toplamı %'+(v.pa+v.pb+v.pc)+' değil.'};}
 if(id==='vg-histogram'){const f=[v.f1,v.f2,v.f3,v.f4],groups=f.map((n,i)=>({lo:HIST_START+i*v.w,hi:HIST_START+(i+1)*v.w-1,n})),total=f.reduce((s,x)=>s+x,0);
  if(!total)return{kind:id,...v,groups,total,equation:'Veri yok',observation:'En az bir grupta veri olmalı.'};
  const minMean=groups.reduce((s,g)=>s+g.n*g.lo,0)/total,maxMean=groups.reduce((s,g)=>s+g.n*g.hi,0)/total,full=groups.filter((g)=>g.n>0),first=full[0],last=full[full.length-1],maxRange=last.hi-first.lo,minRange=first===last?0:last.lo-first.hi;
  let acc=0;const medianGroups=[];for(const g of groups){const from=acc+1;acc+=g.n;for(const k of total%2?[(total+1)/2]:[total/2,total/2+1])if(g.n&&k>=from&&k<=acc)medianGroups.push(g.lo+'–'+g.hi);}
  return{kind:id,...v,groups,total,minMean,maxMean,maxRange,minRange,medianGroups:[...new Set(medianGroups)],equation:show(Math.round(minMean*100)/100)+' ≤ ortalama ≤ '+show(Math.round(maxMean*100)/100),observation:'Açıklık '+minRange+' ile '+maxRange+' arasında. Medyan '+[...new Set(medianGroups)].join(' ve ')+' grubunda.'};}
 return null;
}
