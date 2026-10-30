import { show, power } from './yardim.js';
export const explorations = {
  'uslu-parantez': {
    lessonId:'uslu-ifadeler', title:'Eksi işareti kuvvetin içinde mi dışında mı?',
    story:'Bir hesapta her tur borç iki katına çıkıyor; başka bir hesapta her tur işaret tersine dönüp büyüklük iki katına çıkıyor. İkisi ilk tur aynı görünse de ikinci tur aynı sonucu verir mi? Eksi işaretinin hangi işlemin içinde kaldığını incele.',
    terms:[['Taban','Tekrarlanan çarpan; parantez içindeki eksi de tabana ait olabilir.'],['Üs','Çarpanın kaç kez tekrarlandığını gösterir.'],['İşlem sırası','Üs, önündeki parantezsiz eksi işaretinden önce hesaplanır.']],
    experiment:'n değerini değiştir. (−2)ⁿ ile −2ⁿ sonuçlarının tek ve çift üslerde ne zaman eşit olduğunu tahmin et; çarpanları tek tek gör.',
    example:'$(-3)^4$ ile $-3^4$ aynı mıdır?',
    steps:[['Parantezli tabanı aç','$(-3)(-3)(-3)(-3)=81$; dört negatif çarpan ikişer eşleşir.'],['Parantezsiz ifadeyi sırayla hesapla','$-3^4=-(3\\cdot3\\cdot3\\cdot3)=-81$.'],['Karşılaştır','Sonuçlar farklı; eksi işaretini tabana katıp katmamak işlemi değiştirdi.']],
    tip:'Negatif tabanı paranteze al. Parantez yoksa önce kuvvet, sonra dışarıdaki eksi uygulanır. Negatif üs ise farklı bir işlemdir: tersini almak.',
    trap:'Negatif taban ile negatif üssü karıştırma; $2^{-3}=1/8$ pozitiftir.',
    transfer:['$(-2)^6-(-2^6)$ kaçtır?','128','0','İlk terim 64, ikinci terim −64; fark 128. Çift üste eksi tabanın içinde kalınca kaybolur.'],
    expert:'Pozitif tam n için (−a)ⁿ=(−1)ⁿaⁿ. Tek n’de (−1)ⁿ=−1, çift n’de +1. Negatif üslerde a≠0 gerekir; aynı işaret kuralı karşılığın payında sürer.',
  },
  'uslu-ortak': {
    lessonId:'uslu-ifadeler', title:'Toplamdaki ortak kuvveti dışarı çıkar',
    story:'Bir rafta 2ⁿ kitaplık bir kutu ve onun iki katı kitap alan başka bir kutu var. Toplamı üsleri toplayarak mı, üç aynı kutu büyüklüğü olarak düşünerek mi bulmalıyız? Kutuların ortak büyüklüğünü ayır.',
    terms:[['Ortak çarpan','Her terimin içinde bulunan aynı çarpan.'],['Dağılma','ab+ac=a(b+c); toplamda üs kuralı yerine kullanılır.'],['En küçük üs','Aynı tabanlı pozitif tam kuvvetlerde ortak çarpan seçimini kolaylaştırır.']],
    experiment:'n ve üs farkı d’yi değiştir. İki terimi önce ayrı say, sonra ortak 2ⁿ’lik gruplara ayır; parantezin içi neden 1+2ᵈ?',
    example:'$3^5+3^6$ ifadesini çarpanlarına ayır.',
    steps:[['Ortak kuvveti bul','$3^6=3^5\\cdot3$.'],['Dağılmayı ters kullan','$3^5+3^5\\cdot3=3^5(1+3)$.'],['Kontrol et','$4\\cdot243=972$; ayrı toplam $243+729=972$.']],
    tip:'Toplama ve çıkarmada üsleri toplama; ortak kuvveti dışarı al. Tabanlar farklıysa önce gerçekten ortak bir çarpan olup olmadığını incele.',
    trap:'$a^m+a^n=a^{m+n}$ doğru değildir; örneğin 2²+2³=12, 2⁵=32.',
    transfer:['$2^4+2^6$ kaçtır?','80','1024','Ortak 2⁴: $16(1+4)=80$. Toplamda üsleri toplayarak 2¹⁰ yazılmaz.'],
    expert:'a≠0 için tüm tam m,n’de $a^m+a^n=a^m(1+a^{n-m})$. Küçük üssü seçmek kesirli çarpanları önler; yöntem sıfır ve negatif üslerde de tanım koşuluyla çalışır.',
  },
  'uslu-buyume': {
    lessonId:'uslu-ifadeler', title:'Sabit ekleme ile sabit çarpan farklı büyür',
    story:'İki oyunda ilk gün birer puanın var. Birinci oyunda her gün 2 puan ekleniyor, ikincide puan her gün iki katına çıkıyor. Başta benzer görünen puanları tur tur karşılaştır; modelin seçimini “artıyor” sözü tek başına belirler mi?',
    terms:[['Çarpan','Her adımda önceki miktarın kaç katının alındığı.'],['Başlangıç','Henüz adım yapılmamış n=0 durumu.'],['Üstel değişim','Aynı çarpanın her adımda yeniden uygulanması.']],
    experiment:'n turunu ve katlama çarpanı a’yı değiştir. Solda 1+2n, sağda aⁿ var. Noktaların arasındaki fark sabit mi, oran mı sabit?',
    example:'Bir miktarın her tur dörtte biri kalıyor. Başlangıç 256 ise üçüncü turda kaç kalır?',
    steps:[['Kalan oranı yaz','Her tur çarpan $1/4$; üçüncü tur $256(1/4)^3$.'],['Kuvvetleri eşitle','$256=4^4$ ve $(1/4)^3=4^{-3}$.'],['Hesapla ve dene','$4^{4-3}=4$. Sıra 256,64,16,4; üç adım sayıldı.']],
    tip:'Sabit oranda değişimde başlangıç × çarpanⁿ kullan. Azalışta çarpan 0 ile 1 arasındadır; kalan ile eksilen oranı ayır.',
    trap:'Başlangıcı birinci tur diye saymak üssü bir kaydırır. n=0’da model başlangıç miktarını vermeli.',
    transfer:['Başlangıç 3, her tur iki kat; 5 tur sonra kaç?','96','48','Başlangıç 3; $3\\cdot2^5=96$. 48 dört turun sonucudur.'],
    expert:'a>1 için üstel dizi artar; 0<a<1 için azalır. Tabanı 1’den küçük bir kuvveti karşılaştırırken üs büyüdükçe sayı küçülür. Taban 1 olduğunda bütün değerler aynıdır; üsleri eşitleme yöntemi bilgi vermez.',
  },
};
const range=(key,label,value,min,max)=>({key,label,value,min,max,step:1});
export const controls={
  'uslu-parantez':[range('n','Pozitif tam üs n',4,1,6)],
  'uslu-ortak':[range('n','Ortak kuvvetin üssü n',3,0,5),range('d','Üslerin farkı d',2,0,3)],
  'uslu-buyume':[range('n','Tamamlanan tur n',3,0,6),range('a','Her tur çarpan a',2,2,3)],
};
export function model(id,v) {
  if(id==='uslu-parantez') {
    const inside=(-2)**v.n, outside=-(2**v.n);
    return {kind:id,...v,inside,outside, factors:Array(v.n).fill(-2),equation:power(-2,v.n)+' = '+show(inside)+'; −'+power(2,v.n)+' = '+show(outside),observation:(v.n%2?'Tek üs: sonuçlar eşit.':'Çift üs: parantezli sonuç pozitif, dıştaki eksi negatif kalır.')+' Üs, parantezsiz eksi işaretinden önce hesaplanır.'};
  }
  if(id==='uslu-ortak') {
    const common=2**v.n, multiplier=2**v.d, second=2**(v.n+v.d), total=common+second;
    return {kind:id,...v,common,multiplier,second,total,equation:power(2,v.n)+' + '+power(2,v.n+v.d)+' = '+common+' × (1 + '+multiplier+') = '+total,observation:'İlk terim 1, ikinci terim '+multiplier+' adet '+common+' büyüklüğünde grup içerir. Toplam '+(1+multiplier)+' grup. Üsler toplama işleminde toplanmadı.'};
  }
  if(id==='uslu-buyume') {
    const points=Array.from({length:v.n+1},(_,i)=>({n:i,linear:1+2*i,exp:v.a**i})),last=points.at(-1);
    return {kind:id,...v,points,linear:last.linear,exp:last.exp,equation:'1 + 2 × '+v.n+' = '+last.linear+'; '+power(v.a,v.n)+' = '+last.exp,observation:v.n+' tur sonunda sabit ekleme '+last.linear+', sabit çarpan '+last.exp+'. İki süreç de n=0’da 1’den başlar. Çizimde düşey ölçek ortaktır.'};
  }
  return null;
}
