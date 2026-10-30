import {show} from './yardim.js';
export const explorations={
  'oran-tur':{
    lessonId:'oran-oranti',title:'Bölüm mü sabit, çarpım mı?',
    story:'Kilosu aynı fiyattan satılan elmanın miktarı artınca ücret artar. Aynı yolu daha hızlı gidince süre azalır. İkisinde de iki miktar birlikte değişiyor ama korunan ilişki farklı: birinde bölüm, diğerinde çarpım.',
    terms:[['Doğru orantı','y=kx; y/x sabittir, x≠0.'],['Ters orantı','y=k/x; xy sabittir, x≠0.'],['Sabit koşul','Birim fiyatın veya toplam yolun değişmemesi gibi modelin dayanağı.']],
    experiment:'x değerini değiştir. İlk panelde y=3x, ikinci panelde y=24/x var. Birinde oranı, diğerinde çarpımı kontrol et. İki miktarın birlikte artması doğru orantı demeye tek başına yeter mi?',
    example:'Aynı işi 4 eş verimli işçi 6 günde bitiriyorsa 8 işçi kaç günde bitirir?',
    steps:[['Sabit işi bul','$4\\cdot6=24$ işçi-gün.'],['Yeni süreyi kur','$8t=24$.'],['Çöz ve sağla','t=3; 8×3 yine 24. İşçi iki katına çıkınca süre yarıya indi.']],
    tip:'Birini iki kat yapınca diğerinin ne olması gerektiğini önce tahmin et. Sonra sabit bölüm mü sabit çarpım mı olduğuna karar ver.',
    trap:'Birlikte artan her ilişki doğru orantı değildir; sabit açılış ücreti içeren y=3x+5 için y/x sabit kalmaz.',
    transfer:['Aynı yol 6 saatte 40 km/sa hızla gidiliyor; 80 km/sa ile kaç saat?','3','12','Yol 240 km sabit: süre 240/80=3 saat. Hız iki kat, süre yarı.'],
    expert:'Doğru orantının grafiği orijinden geçen doğru, ters orantınınki koordinat eksenlerine yaklaşan eğridir. Sıfırdan geçen her artan grafik de doğru orantı değildir; doğrusal olması gerekir.',
  },
  'oran-pay':{
    lessonId:'oran-oranti',title:'Aynı toplamı doğru ve ters orantıyla paylaş',
    story:'Üç kişiye 2,3,6 ağırlıklarıyla ödül paylaştırılıyor. Ağırlık çoksa pay çok mu, az mı olmalı? “Doğru” ve “ters” kelimeleri aynı toplamın kime gideceğini değiştirir; toplamı koruyarak karşılaştır.',
    terms:[['Ağırlık','Payın karşılaştırıldığı 2,3,6 sayıları; gerçek para tutarı değildir.'],['Ters ağırlık','Ters paylaşımda 1/2,1/3,1/6 kullanılır.'],['Normalleştirme','Her ağırlığı ağırlıkların toplamına bölerek bütünün payını bulmak.']],
    experiment:'Toplam ödülü değiştir. İki şeridin uzunluğu aynı toplam; iç dilimleri karşılaştır. Hangi kişi doğru paylaşımda en büyük, ters paylaşımda en küçük payı alıyor?',
    example:'66 lirayı 2,3,6 ile ters orantılı paylaştır.',
    steps:[['Ters ağırlıkları yaz','$1/2:1/3:1/6$.'],['Tam sayıya çevir','Hepsini 6 ile çarp: 3:2:1. Toplam 6 pay.'],['Gerçek tutara dön','Bir pay 11; tutarlar 33,22,11. Toplam 66; ağırlık×pay her kişide 66.']],
    tip:'Ters paylaşımda önce ağırlıkların tersini al; sonra bildiğin doğru paylaştırma yöntemini uygula.',
    trap:'Toplam parayı 2+3+6’ya bölmek ters paylaşım için yanlış ağırlıkları kullanır.',
    transfer:['132 lira 2,3,6 ile ters orantılı bölünürse en büyük pay kaç?','66','72','Oran 3:2:1; bir pay 132/6=22. En büyük pay 3×22=66.'],
    expert:'Toplam T ve pozitif ağırlıklar aᵢ için doğru paylaşım T·aᵢ/Σa, ters paylaşım T·(1/aᵢ)/Σ(1/a). İkisinde de payların toplamı T olur; ters paylaşımda aᵢ ile payının çarpımı sabittir.',
  },
  'oran-bilesik':{
    lessonId:'oran-oranti',title:'İşçi, günlük süre ve gün sayısını ayrı tut',
    story:'Bir atölyede her işçi saatte 2 parça üretiyor. İşçi sayısını, günde çalışılan saati veya gün sayısını artırabilirsin. Üretim hangisiyle doğru orantılı, aynı üretim için gerekli gün sayısı hangileriyle ters orantılı?',
    terms:[['Birim verim','Bir işçinin bir saatte yaptığı iş: 2 parça/(işçi·saat).'],['Toplam emek','İşçi × günlük saat × gün.'],['Sabit verim varsayımı','İşçilerin aynı hızda, birbirini engellemeden üretmesi; mola ve arıza ayrıca verilmedikçe modelde yok.']],
    experiment:'İşçi sayısı w, günlük saat h, gün d değerlerini değiştir. Her hücre bir işçinin bir günlük saat dilimi; hücre başına 2d parça üretilir. Toplamı hücre sayısından doğrula.',
    example:'3 işçi günde 4 saatle 2 günde 48 parça üretir. 6 işçi günde 2 saatle aynı işi kaç günde yapar?',
    steps:[['Günlük kapasiteyi karşılaştır','Eski 3×4=12, yeni 6×2=12 işçi-saat/gün.'],['Verimi sabit tut','İki durumda günlük üretim 12×2=24 parça.'],['Süreyi bul','48/24=2 gün; işçi artışı saat azalışıyla dengelendi.']],
    tip:'Üretim = birim verim × işçi × günlük saat × gün. Sorulanı yalnız bırak; her çarpanın değişiminin yönünü sonra kontrol et.',
    trap:'İşçi iki katına çıktı diye süreyi doğrudan yarılama; günlük saat veya iş miktarı da değişmiş olabilir.',
    transfer:['4 işçi günde 3 saat, 2 gün, saatte kişi başı 2 parça: toplam kaç?','48','24','4×3×2×2=48 parça. 24 toplam işçi-saattir; üretime geçmek için verimle çarpılır.'],
    expert:'Birimler hesabı modelin kontrolüdür: parça/(işçi·saat) × işçi × saat/gün × gün = parça. Verim değişirse ayrı çarpan ekle; üretimin işçi sayısıyla doğrusal olmadığı durumlarda bu model kullanılamaz.',
  },
};
const range=(key,label,value,min,max)=>({key,label,value,min,max,step:1});
export const controls={
  'oran-tur':[range('x','Miktar veya çalışan sayısı x',4,1,8)],
  'oran-pay':[range('k','Toplam ödül / 66',1,1,4)],
  'oran-bilesik':[range('w','İşçi sayısı',3,2,6),range('h','Günde çalışma saati',4,2,8),range('d','Gün sayısı',2,1,5)],
};
export function model(id,v) {
  if(id==='oran-tur') {
    const direct=3*v.x,inverse=24/v.x;
    return {kind:id,...v,direct,inverse,equation:'y = 3x → '+direct+'; y = 24/'+v.x+' ≈ '+show(inverse),observation:'Doğru orantıda y/x='+direct+'/'+v.x+'=3. Ters orantıda xy='+v.x+'×(24/'+v.x+')=24. Ekrandaki ondalık yaklaşık olabilir; kesirli ilişki tamdır. Birinde bölüm, öbüründe çarpım sabit.'};
  }
  if(id==='oran-pay') {
    const total=66*v.k,direct=[12,18,36].map((x)=>x*v.k),inverse=[33,22,11].map((x)=>x*v.k);
    return {kind:id,...v,total,direct,inverse,equation:'Toplam '+total+'; doğru '+direct.join(' + ')+'; ters '+inverse.join(' + '),observation:'Ağırlıklar 2,3,6. Doğruda pay/ağırlık='+6*v.k+'; terste pay×ağırlık='+66*v.k+'. İki paylaşım da aynı toplamı korur.'};
  }
  if(id==='oran-bilesik') {
    const cells=v.w*v.h,perCell=2*v.d,total=cells*perCell;
    return {kind:id,...v,cells,perCell,total,equation:'2 × '+v.w+' × '+v.h+' × '+v.d+' = '+total+' parça',observation:cells+' günlük işçi-saat hücresi; her hücre '+v.d+' gün tekrarlandığı için '+perCell+' parça. Toplam '+total+'. Verim kişi başına saatte 2 parça sabit.'};
  }
  return null;
}
