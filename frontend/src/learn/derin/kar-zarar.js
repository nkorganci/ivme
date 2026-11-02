import {show} from './yardim.js';
export const explorations={
  'kz-fark':{
    lessonId:'kar-zarar',title:'İki satış fiyatı, aynı maliyet',
    story:'Bir satıcı ürünü kârla da satabilir, zararla da. İki fiyat arasındaki fark, iki yüzdenin arasındaki mesafenin maliyetteki karşılığıdır. Maliyeti, kâr ve zarar oranlarını değiştirip farkı izle.',
    terms:[['Maliyet','Ürünün alış fiyatı; kâr ve zarar yüzdesinin tabanı.'],['Kâr çarpanı','%p kârda satış = maliyet × (1 + p/100).'],['Yüzde puan farkı','Kâr yüzdesinden zarar yüzdesinin eksilisini çıkarmak: p − (−q).']],
    experiment:'Kâr ve zarar yüzdelerini sabit tut, maliyeti değiştir: fark hangi oranda büyüyor? Sonra maliyeti sabit tutup yüzdeleri değiştir.',
    example:'Maliyet 120 lira; %20 kârlı ve %5 zararlı satış arasındaki fark kaç lira?',
    steps:[['İki satış','$120\\cdot1{,}2=144$ ve $120\\cdot0{,}95=114$.'],['Fark','$144-114=30$.'],['Yüzde ile','$120\\cdot\\tfrac{20+5}{100}=30$.']],
    tip:'Fark = maliyet × (kâr % + zarar %) / 100. Fark ve yüzdeler verilince maliyet = fark ÷ yüzde farkı.',
    trap:'%20 kâr ile %5 zarar arası %15 değil %25’tir; zarar eksi yöndedir.',
    transfer:['Bir ürün %30 kârla satılıyor; 36 lira ucuza satılsaydı %15 kâr edilecekti. Maliyet?','240','120','Fark maliyetin $30-15=15$ yüzdesi: $36:0{,}15=240$. 120, farkı %30’a bölmektir.'],
    expert:'Satışlar $M(1+p)$ ve $M(1-q)$ ise farkları $M(p+q)$’dur; $M$ ile doğru orantılıdır. İki ayrı satış iki ayrı maliyete aitse (iki farklı ürün) bu kısa yol kullanılmaz.',
  },
  'kz-kampanya':{
    lessonId:'kar-zarar',title:'Kampanyanın gerçek indirimi',
    story:'“İkincisi %50”, “hepsine %30”, “3 al 2 öde” kampanyaları aynı görünmez. Gerçek indirim, ödenen toplamın etiket toplamına oranıyla bulunur ve alınan adede bağlıdır.',
    terms:[['Etiket toplamı','Adet × etiket fiyatı.'],['Gerçek indirim','1 − ödenen ÷ etiket toplamı.'],['Eşik','Kampanyanın başladığı adet veya tutar.']],
    experiment:'Kampanyayı ve adedi değiştir. Hangi adette “ikincisi %50” en avantajlı? Tek ürün alınca ne oluyor?',
    example:'Etiketi 60 lira olan üründen 3 tane alan, “ikincisi %50” kampanyasında kaç lira öder?',
    steps:[['Çiftleri say','İki ürün bir çift: $60+30=90$.'],['Teki ekle','Üçüncü ürün eşsiz: 60 lira.'],['Toplam','$150$; gerçek indirim $\\tfrac{30}{180}=\\%16{,}7$.']],
    tip:'Kampanyaları aynı adet için toplam ödeme olarak karşılaştır; adet değişince sıralama değişebilir.',
    trap:'“İkincisi %50” bütün alışverişte %50 indirim değildir; iki üründe %25’tir.',
    transfer:['“3 al 2 öde” ile “hepsine %30” kampanyalarından 3 ürün alan için hangisi daha ucuz?','3 al 2 öde','hepsine %30','3 al 2 öde %33,3 indirim; %30’dan fazla.'],
    expert:'İkincisi %r kampanyasında $n$ ürün için ödeme $f\\,(n-\\lfloor n/2\\rfloor r/100)$; gerçek oran $n$ çiftken $r/2$, tekken daha küçüktür. 3 al 2 öde $n$ üçün katıyken %33,3’tür.',
  },
  'kz-karma':{
    lessonId:'kar-zarar',title:'Parça parça satış, toplam kâr',
    story:'Bir malın bir kısmı kârla, kalanı zararla satılabilir. Toplam kâr, parçaların maliyet paylarıyla ağırlıklandırılmış ortalamadır. TL verilmeyince maliyete 100 demek işi kolaylaştırır.',
    terms:[['Maliyet payı','Parçanın toplam maliyetteki yüzdesi.'],['Ağırlıklı ortalama','Her yüzdenin payıyla çarpılıp toplanması.'],['Başabaş','Toplam kârın sıfır olduğu durum.']],
    experiment:'İlk parçanın payını ve iki parçanın kâr yüzdelerini değiştir. Toplam kâr hangi yüzdeye daha yakın? Başabaş için ne gerekiyor?',
    example:'Malın yarısı %30 kârla, yarısı %10 zararla satılırsa toplam kâr?',
    steps:[['100 de','50 + 50 maliyet.'],['Gelir','$50\\cdot1{,}3+50\\cdot0{,}9=110$.'],['Kâr','$10$: %10.']],
    tip:'Payları eşitse yüzdelerin ortalaması; değilse payla ağırlıklı ortalama. Sonuç iki yüzdenin arasında kalır.',
    trap:'Yüzdeleri doğrudan toplamak ya da çıkarmak ($30-10=20$) pay bilgisini yok sayar.',
    transfer:['Malın %25’i %40 kârla, kalanı %20 kârla satılırsa toplam kâr yüzde kaç?','25','30','$0{,}25\\cdot40+0{,}75\\cdot20=25$. 30 basit ortalamadır.'],
    expert:'Toplam kâr $=\\sum w_ip_i$ (w maliyet payı). Satış fiyatları eşit verilirse maliyet payları eşit değildir; önce her parçanın maliyetini satıştan geri hesapla.',
  },
};
const range=(key,label,value,min,max,step=1)=>({key,label,value,min,max,step});
export const controls={
 'kz-fark':[range('m','Maliyet (TL)',120,40,400,20),range('p','Kâr (%)',20,0,60,5),range('q','Zarar (%)',5,0,40,5)],
 'kz-kampanya':[range('f','Etiket fiyatı (TL)',60,20,200,10),range('n','Adet',2,1,6),{key:'op',label:'Kampanya',value:0,options:[[0,'İkincisi %50'],[1,'Hepsine %30'],[2,'3 al 2 öde']]}],
 'kz-karma':[range('a','İlk parçanın payı (%)',50,10,90,10),range('p','İlk parça kâr (%)',30,-40,60,5),range('q','Kalan kâr (%)',-10,-40,60,5)],
};
export function pay(op,f,n){return op===0?f*(n-Math.floor(n/2)*0.5):op===1?f*n*0.7:f*(n-Math.floor(n/3));}
export function model(id,v){
 if(id==='kz-fark'){const hi=v.m*(1+v.p/100),lo=v.m*(1-v.q/100),gap=hi-lo;return{kind:id,...v,hi,lo,gap,equation:show(hi)+' − '+show(lo)+' = '+show(gap)+' TL',observation:'Fark maliyetin %'+(v.p+v.q)+'’i: '+v.m+' × '+(v.p+v.q)+'/100 = '+show(gap)+'.'};}
 if(id==='kz-kampanya'){const total=v.f*v.n,paid=pay(v.op,v.f,v.n),pct=100*(total-paid)/total;return{kind:id,...v,total,paid,pct,equation:show(paid)+' / '+show(total)+' TL ödendi',observation:'Gerçek indirim %'+show(pct)+(v.op===0&&v.n%2?' — tek adette son ürün tam fiyat.':v.op===2&&v.n<3?' — 3 ürün olmadan kampanya işlemez.':'.')};}
 if(id==='kz-karma'){const total=(v.a*v.p+(100-v.a)*v.q)/100,revenue=100+total;return{kind:id,...v,total,revenue,equation:'100 liralık maldan '+show(revenue)+' lira gelir',observation:'Toplam kâr %'+show(total)+(total<0?' (zarar).':'.')+' Sonuç %'+Math.min(v.p,v.q)+' ile %'+Math.max(v.p,v.q)+' arasında; büyük paya yakın.'};}
 return null;
}
