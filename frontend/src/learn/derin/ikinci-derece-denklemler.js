import {show} from './yardim.js';
const graph=(a,b,c)=>{
  const delta=b*b-4*a*c;
  const roots=delta<0?[]:delta===0?[-b/(2*a)]:[(-b-Math.sqrt(delta))/(2*a),(-b+Math.sqrt(delta))/(2*a)].sort((x,y)=>x-y);
  const vertex=-b/(2*a),lo=Math.min(-4,vertex-3,...roots.map((x)=>x-1)),hi=Math.max(4,vertex+3,...roots.map((x)=>x+1));
  const points=Array.from({length:121},(_,i)=>{const x=lo+(hi-lo)*i/120;return [x,a*x*x+b*x+c];});
  return {a,b,c,delta,roots,vertex,lo,hi,points};
};
export const explorations={
  'ikinci-derece-denklemler':{
    lessonId:'ikinci-derece-denklemler',title:'Alan bilgisinden ikinci dereceye',
    story:'Bir bahçenin uzunluğu eninden 2 metre fazla; alanı 24 m². Eni tahmin edip alanı değiştir. Doğrusal denklemde yalnız x vardı; burada iki uzunluk çarpıldığı için x² oluşuyor. Cebir iki kök verse de bahçe için ikisi de mümkün mü?',
    terms:[['İkinci derece','Denklem düzenlenince en büyük kuvvet 2; x² katsayısı sıfır değil.'],['Katsayı','ax²+bx+c=0 içindeki a,b,c; a≠0.'],['Kök','Denklemde yerine yazılınca eşitliği sağlayan x değeri.']],
    experiment:'Eni x’i değiştir. Uzunluk x+2 ve alan x(x+2) birlikte güncellenir. Alanın 24 olduğu eni bul; sonra negatif cebirsel kökün neden bahçe ölçüsü olamayacağını açıkla.',
    example:'$x(x+2)=24$ denkleminden bahçenin enini bul.',
    steps:[['Standart biçime getir','$x^2+2x-24=0$.'],['Çarpanlara ayır','$(x+6)(x-4)=0$; x=−6 veya x=4.'],['Bağlamla kontrol et','En pozitif olmalı; x=4, uzunluk 6 ve alan 24. −6, cebirsel kök ama bahçe eni değil.']],
    tip:'Önce tüm terimleri bir tarafa topla. Çarpanlara ayrılıyorsa sıfır çarpımını kullan; ayrılmıyorsa tam kare veya kök formülü seç.',
    trap:'x² terimini x’e bölerek yok etmek x=0 kökünü kaybettirebilir; sıfır olabilecek ifadeyle bölme.',
    transfer:['Eni x, uzunluğu x+3 ve alanı 28 olan dikdörtgenin pozitif eni nedir?','4','7','x²+3x−28=(x+7)(x−4). Pozitif kök 4; uzunluk 7, alan 28.'],
    expert:'İkinci dereceden bir denklem en çok iki farklı köke sahiptir. Çift katlı kökte çözüm kümesinde bir sayı bulunur. Gerçek kök bulunmaması denklemin yanlış olduğu değil, seçilen sayı kümesinde çözüm olmadığı anlamına gelir.',
  },
  'ikinci-carpan':{
    lessonId:'ikinci-derece-denklemler',title:'Sıfır çarpımı ile grafiğin eksen kesişimleri',
    story:'İki çarpanın değerlerini çarpıyorsun. Çarpımın sıfır olması için ikisinin birden sıfır olması mı gerekir? Kökleri birbirine yaklaştırıp eksenle iki kesişimin tek noktada nasıl birleştiğini gör.',
    terms:[['Sıfır çarpımı','Gerçek sayılarda AB=0 ise A=0 veya B=0.'],['Çarpan biçimi','(x−r)(x−s); r ve s köklerdir.'],['Çift katlı kök','r=s olduğunda aynı kök iki çarpanda tekrarlanır.']],
    experiment:'r ve s’yi değiştir. Eğri (x−r)(x−s); x eksenini hangi noktalarda kesiyor? r=s olunca eğri eksenin öbür tarafına geçiyor mu?',
    example:'$2x^2-5x-3=0$ denklemini çöz.',
    steps:[['Çarpanları seç','$(2x+1)(x-3)$ açılınca 2x²−6x+x−3 gelir.'],['Sıfır çarpımını uygula','2x+1=0 veya x−3=0.'],['Sağla','x=−1/2 veya 3; ilk denklemde iki sonuç da 0.']],
    tip:'Çarpanlara ayırınca her çarpanı sıfıra eşitle. Bu kural toplamın sıfır olmasına uygulanmaz.',
    trap:'AB=0, A=B=0 demek değildir. x ile bölmek yerine x’i çarpan olarak ayırmak sıfır kökünü korur.',
    transfer:['$x^2-7x=0$ denkleminin kökleri nedir?','0 ve 7','Yalnız 7','x(x−7)=0. x=0 da geçerli; x’e bölmek bu kökü kaybettirir.'],
    expert:'(x−r)(x−s)=x²−(r+s)x+rs açılımı köklerle katsayıları bağlar. Bu ilişki yalnız kökleri bulmak için değil, kökleri verilmiş yeni denklemi kurmak için de kullanılabilir.',
  },
  'ikinci-delta':{
    lessonId:'ikinci-derece-denklemler',title:'Diskriminant kaç gerçek kök olduğunu söyler',
    story:'Bir eğriyi yukarı aşağı taşı. Bazen ekseni iki kez keser, bazen yalnız dokunur, bazen hiç ulaşmaz. Kök formülünde karekökün içindeki sayı bu üç durumu tek bir hesapla ayırır.',
    terms:[['Diskriminant','Δ=b²−4ac; kök formülündeki karekökün içi.'],['İki farklı kök','Δ>0; formüldeki ± iki farklı sayı verir.'],['Gerçek kök yok','Δ<0; negatif sayının gerçek karekökü yoktur.']],
    experiment:'a,b,c katsayılarını değiştir. a sıfır seçilemez. Δ işaretiyle grafiğin x ekseni kesişim sayısını karşılaştır. a negatif olduğunda kök sayısı kuralı değişiyor mu?',
    example:'$x^2-4x+5=0$ neden gerçek köke sahip değil?',
    steps:[['Katsayıları oku','a=1,b=−4,c=5.'],['Diskriminantı bul','Δ=16−20=−4<0.'],['Tam kareyle kontrol et','x²−4x+5=(x−2)²+1≥1; sıfıra inemez.']],
    tip:'Yalnız kök sayısı soruluyorsa formülün tamamını hesaplama; Δ’nın işareti yeter. Önce a≠0 koşulunu kontrol et.',
    trap:'Δ=0 için “kök yok” denmez; iki katlı bir kök, çözüm kümesinde bir farklı sayı vardır.',
    transfer:['$x^2+6x+9=0$ kaç farklı gerçek kök taşır?','1','2','Δ=36−36=0; (x+3)²=0 ve tek farklı kök −3.'],
    expert:'Tam kare biçimi a(x+b/(2a))²−Δ/(4a) olur. Kök ararken karesel terimin karşısındaki miktarın işareti Δ ile belirlenir; bu nedenle a’nın işareti kök sayısı kuralını değiştirmez.',
  },
  'ikinci-vieta':{
    lessonId:'ikinci-derece-denklemler',title:'Kökleri tek tek bulmadan toplam ve çarpım',
    story:'İki sayının toplamı ve çarpımı verildiğinde kareleri toplamını bulabilir misin? Sayıları ayrı ayrı aramadan ortak ilişkileri kullan. Kök-katsayı bağlantısı uzun köklü işlemleri çoğu kez gereksiz kılar.',
    terms:[['Kökler toplamı','S=−b/a; x katsayısının ters işaretlisi, baş katsayıya bölünür.'],['Kökler çarpımı','P=c/a; sabit terim baş katsayıya bölünür.'],['Simetrik ifade','Köklerin yer değiştirmesiyle değeri değişmeyen ifade; r²+s² gibi.']],
    experiment:'r ve s köklerini değiştir. S ve P’den kurulan denklemle r²+s²=S²−2P hesabını karşılaştır. Köklerden biri sıfır olursa terslerinin toplamı neden hesaplanamıyor?',
    example:'$2x^2-6x+1=0$ köklerinin kareleri toplamı nedir?',
    steps:[['S ve P’yi bul','S=3, P=1/2.'],['Özdeşliği kur','r²+s²=(r+s)²−2rs=S²−2P.'],['Hesapla','9−1=8; kökleri tek tek bulmadık.']],
    tip:'Sorulan ifade kökleri yer değiştirince aynı kalıyorsa S ve P ile yazmayı dene. Terslerde P≠0 koşulunu ekle.',
    trap:'Toplamda −b/a, çarpımda c/a; baş katsayı 1 değilse bölmeyi unutma.',
    transfer:['$3x^2-12x+6=0$ köklerinin kareleri toplamı kaçtır?','12','10','S=4,P=2; S²−2P=16−4=12.'],
    expert:'Kökleri r,s olan baş katsayısı 1 denklem x²−Sx+P=0. Kökler αr+β, αs+β yapılırsa yeni toplam αS+2β, yeni çarpım α²P+αβS+β² olur; α=0 iken iki kök çakışır.',
  },
};
const range=(key,label,value,min,max)=>({key,label,value,min,max,step:1});
const rootsControls=[range('r','Birinci kök r',-2,-4,4),range('s','İkinci kök s',3,-4,4)];
export const controls={
  'ikinci-derece-denklemler':[range('x','Bahçenin eni x (m)',3,1,8)],
  'ikinci-carpan':rootsControls,
  'ikinci-delta':[{key:'a',label:'x² katsayısı a (sıfır olamaz)',value:1,options:[[-2,'−2'],[-1,'−1'],[1,'1'],[2,'2']]},range('b','x katsayısı b',-4,-6,6),range('c','Sabit terim c',3,-3,6)],
  'ikinci-vieta':rootsControls,
};
export function model(id,v) {
  if(id==='ikinci-derece-denklemler') {
    const length=v.x+2,area=v.x*length;
    return {kind:id,...v,length,area,equation:v.x+' × '+length+' = '+area+' m²',observation:'En '+v.x+' m, uzunluk '+length+' m; alan '+area+' m². Hedef 24 m². '+(area===24?'Hedefe ulaştın: x=4.':area<24?'Alan hedefin altında.':'Alan hedefin üstünde.')};
  }
  if(id==='ikinci-carpan') {
    const b=-(v.r+v.s),c=v.r*v.s;
    return {kind:'ikinci-grafik',...v,...graph(1,b,c),equation:'(x − ('+v.r+'))(x − ('+v.s+')) = 0',observation:'Kökler '+[...new Set([v.r,v.s])].map(show).join('; ')+'. x katsayısı '+b+', sabit '+c+'. '+(v.r===v.s?'Kökler çakıştı; bir farklı kesişim.':'İki farklı kesişim var.')};
  }
  if(id==='ikinci-delta') {
    const g=graph(v.a,v.b,v.c);
    return {kind:'ikinci-grafik',...v,...g,equation:'Δ = ('+v.b+')² − 4 × ('+v.a+') × ('+v.c+') = '+g.delta,observation:g.delta<0?'Δ negatif: gerçek kök yok; grafik ekseni kesmez.':'Δ '+(g.delta===0?'sıfır; bir farklı kök: ':'pozitif; iki farklı kök: ')+g.roots.map(show).join('; ')+'. Yaklaşık değerleri ilk denklemde kontrol et.'};
  }
  if(id==='ikinci-vieta') {
    const S=v.r+v.s,P=v.r*v.s,squareSum=v.r*v.r+v.s*v.s;
    return {kind:id,...v,S,P,squareSum,reciprocal:P===0?null:S/P,equation:'S² − 2P = ('+S+')² − 2 × ('+P+') = '+squareSum,observation:'S='+S+', P='+P+'. Köklerin kareleri toplamı '+squareSum+'. '+(P===0?'Köklerden biri sıfır; terslerinin toplamı tanımsız.':'Terslerin toplamı tam olarak S/P; yaklaşık '+show(S/P)+'.')};
  }
  return null;
}
