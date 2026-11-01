import {show} from './yardim.js';
const frac=(a,b)=>{const g=(x,y)=>(y?g(y,x%y):x);const d=g(a,b)||1;return b/d===1?String(a/d):(a/d)+'/'+(b/d);};
export const explorations={
  'sk-sira':{
    lessonId:'sayi-kesir-problemleri',title:'Kuyrukta kaç kişi var? Önde kim?',
    story:'Bir gişe kuyruğunda Güler baştan $a$. sırada, Ömer sondan $b$. sırada ve aralarında $k$ kişi var. Kimin önde olduğu söylenmemiş. İkisinin yerini değiştirince kuyruğun uzunluğu değişir; bu yüzden soru “en çok” ve “en az” diye sorulur.',
    terms:[['Baştan sıra','Önünde kaç kişi olduğu + 1. Baştan 14. olanın önünde 13 kişi var.'],['Sondan sıra','Arkasında kaç kişi olduğu + 1.'],['Aradaki kişi','İki kişinin arasında duranlar; iki kişinin kendisi sayılmaz.']],
    experiment:'$a$, $b$ ve $k$ değerlerini değiştir. Üst satırda Güler önde, alt satırda Ömer önde. Toplam kişi sayısı iki satırda neden farklı?',
    example:'Güler baştan 14., Ömer sondan 17. ve aralarında 5 kişi var. Kuyrukta en çok ve en az kaç kişi olabilir?',
    steps:[['Güler önde','Güler’in önünde 13, arada 5, Ömer ve arkasında 16+1: $14+5+17=36$.'],['Ömer önde','Ömer baştan $14-5-1=8$. sırada; sondan 17. olduğu için toplam $8+17-1=24$.'],['Karşılaştır','En çok 36, en az 24. İki kişi üst üste sayılmadığı için −1 ve −2 düzeltmeleri gelir.']],
    tip:'Önce iki kişiyi aynı doğruya koy: biri öndeyken ve arkadayken iki ayrı çizim yap. Sayarken kişinin kendisini bir kez say.',
    trap:'Baştan ve sondan sıraları toplayıp aradakileri eklemek yalnız “Güler önde” durumunu verir; diğer durumda iki kişi birbirini geçmiştir ve sayılar üst üste biner.',
    transfer:['Bir kuyrukta baştan 7. ve sondan 7. olan kişi aynı kişidir. Kuyrukta kaç kişi var?','13','14','Kişinin önünde 6, arkasında 6 kişi var: $6+1+6=13$. 14, kişiyi iki kez saymaktır.'],
    expert:'Genel olarak Güler önde: $n=a+b+k$. Ömer önde: Ömer’in baştan sırası $a-k-1\\ge1$ ve $n=a+b-k-2$; ayrıca $n\\ge a$ olmalı. Koşul sağlanmıyorsa “en az” durumu yoktur.',
  },
  'sk-kalan':{
    lessonId:'sayi-kesir-problemleri',title:'Kalanın kesri mi, bütünün kesri mi?',
    story:'Her gün “kalanın” dörtte birini harcayan biri parasını hiç bitiremez; her gün “bütünün” dörtte birini harcayan ise dört günde bitirir. Aynı kesir, uygulandığı miktar değişince bambaşka sonuç verir.',
    terms:[['Bütünün kesri','Her adımda başlangıç miktarına uygulanan kesir; azalma her gün aynı miktar.'],['Kalanın kesri','Her adımda o anda elde olana uygulanan kesir; kalan her gün aynı oranla çarpılır.'],['Kalan oran','$1-\\frac pq$: bir adım sonra elde kalan pay.']],
    experiment:'Kesri ($\\frac pq$) ve adım sayısını değiştir. Mavi çubuklar kalanın kesri, turuncu çubuklar bütünün kesridir. Hangisi sıfıra iner, hangisi inmez?',
    example:'Elindeki paranın her gün kalanın $\\frac14$’ünü harcayan birinin 3 gün sonra 54 TL’si kaldı. Başlangıçta kaç TL’si vardı?',
    steps:[['Kalan oranı bul','Her gün $\\frac34$’ü kalır.'],['Adımları çarp','3 gün: $\\left(\\frac34\\right)^3=\\frac{27}{64}$.'],['Geri dön','$\\frac{27}{64}x=54$, $x=128$ TL.']],
    tip:'“Kalanın” sözcüğünü görünce kalan oranları çarp; “bütünün” ya da “ilk paranın” görünce kesilen parçaları topla.',
    trap:'Kalanın $\\frac14$’ü üç gün harcanınca $\\frac34$ harcanmış olmaz; harcanan $1-\\frac{27}{64}=\\frac{37}{64}$’tür.',
    transfer:['Her gün kalanın yarısı harcanırsa 3 gün sonra paranın kaçta kaçı kalır?','1/8','0','Kalan oranlar çarpılır: $\\frac12\\cdot\\frac12\\cdot\\frac12=\\frac18$. Sıfır, bütünün yarısını iki kez harcamak olurdu.'],
    expert:'Kalanın kesrinde kalan $\\left(1-\\frac pq\\right)^n$ geometrik olarak azalır ve sıfır olmaz; bütünün kesrinde kalan $1-n\\frac pq$ doğrusal azalır ve $n=\\frac qp$ adımda biter.',
  },
  'sk-adet':{
    lessonId:'sayi-kesir-problemleri',title:'Hepsini ucuz say, fazlalığı paylaştır',
    story:'Bir sinemada öğrenci bileti 3 lira, tam bilet biraz daha pahalı. Kaç tam bilet satıldığını bulmak için iki bilinmeyenli sistem kurmak gerekmez: hepsini öğrenci bileti sayıp gerçek gelirle farkı fiyat farkına bölmek yeter.',
    terms:[['Toplam adet','İki türün sayılarının toplamı: $N$.'],['Fiyat farkı','Pahalı türün ucuz türden fazlası: $d$.'],['Fazlalık','Gerçek gelir ile “hepsi ucuz” gelirinin farkı; her pahalı ürün bu farka $d$ katkı yapar.']],
    experiment:'$N$, pahalı adet $x$ ve fiyat farkı $d$ değerlerini değiştir. Gelir $3N+dx$ biçiminde artıyor mu? Fazlalığı $d$’ye bölünce hep $x$ çıkıyor mu?',
    example:'50 biletten oluşan bir satışta öğrenci bileti 30 TL, tam bilet 45 TL; toplam 1800 TL. Kaç tam bilet satıldı?',
    steps:[['Hepsini ucuz say','$50\\cdot30=1500$ TL.'],['Fazlalığı bul','$1800-1500=300$ TL.'],['Farka böl','Her tam bilet 15 TL fazla: $300:15=20$ tam bilet.']],
    tip:'Adetlerin toplamı biliniyorsa hepsini bir tür say; gerçek toplamla fark, öbür türün sayısı × birim fark eder.',
    trap:'Fazlalığı pahalı fiyata bölmek (300 : 45) yanlıştır; her pahalı bilet yalnız fark kadar (15 TL) fazlalık getirir.',
    transfer:['20 masanın bir kısmı 2, bir kısmı 4 kişilik; toplam 58 kişi oturuyor. Kaç tane 4 kişilik masa var?','9','11','Hepsi 2 kişilik: 40 kişi. Fazla 18 kişi, her 4 kişilik masa 2 fazla: $18:2=9$.'],
    expert:'Sistem $u+p=N$, $c\\,u+e\\,p=T$’den $p=\\frac{T-cN}{e-c}$ çıkar. Kısa yol bu formülün sözlü hâlidir; $e=c$ ise yöntem çalışmaz (adet belirlenemez).',
  },
};
const range=(key,label,value,min,max)=>({key,label,value,min,max,step:1});
export const controls={
  'sk-sira':[range('a','Güler baştan kaçıncı (a)',14,3,20),range('b','Ömer sondan kaçıncı (b)',17,3,20),range('k','Aradaki kişi (k)',5,0,8)],
  'sk-kalan':[range('q','Kesrin paydası q',4,2,5),range('p','Kesrin payı p',1,1,4),range('n','Adım (gün) sayısı',3,1,4)],
  'sk-adet':[range('N','Toplam adet N',12,8,20),range('x','Pahalı adet x',5,0,20),range('d','Fiyat farkı d (ucuz = 3)',2,1,4)],
};
export function model(id,v) {
  if(id==='sk-sira') {
    const nMax=v.a+v.b+v.k,front=v.a-v.k-1,nMin=front>=1&&v.b>=v.k+2?v.a+v.b-v.k-2:null;
    return {kind:id,...v,nMax,nMin,front,equation:'Güler önde: '+v.a+' + '+v.b+' + '+v.k+' = '+nMax+(nMin===null?' · Ömer önde: mümkün değil':' · Ömer önde: '+v.a+' + '+v.b+' − '+v.k+' − 2 = '+nMin),
      observation:nMin===null?'Ömer önde olsaydı Güler’den önce yeterli yer ya da Ömer’in arkasında yeterli kişi kalmıyor; yalnız '+nMax+' kişilik dizilim mümkün.':'Güler önde iken iki kişi ayrı yerlerde sayılır: '+nMax+'. Ömer önde iken Ömer baştan '+front+'. sırada; sıralar üst üste bindiği için toplam '+nMin+'.'};
  }
  if(id==='sk-kalan') {
    const p=Math.min(v.p,v.q-1),keep=v.q-p,remKalan=frac(keep**v.n,v.q**v.n),wholeLeft=Math.max(0,v.q-v.n*p);
    const steps=Array.from({length:v.n+1},(_,i)=>({kalan:(keep/v.q)**i,butun:Math.max(0,1-i*p/v.q)}));
    return {kind:id,...v,p,keep,remKalan,remButun:frac(wholeLeft,v.q),steps,equation:'Kesir '+frac(p,v.q)+' · '+v.n+' adım: kalanın kesri → ('+frac(keep,v.q)+')^'+v.n+' = '+remKalan+' · bütünün kesri → 1 − '+v.n+'·'+frac(p,v.q)+' = '+frac(wholeLeft,v.q),
      observation:'Kalanın kesrinde her adım '+frac(keep,v.q)+' ile çarpar; hiçbir zaman sıfır olmaz. Bütünün kesrinde her adım aynı '+frac(p,v.q)+' miktarını çıkarır'+(wholeLeft===0?' ve miktar biter.':'.')+(v.p!==p?' (Pay paydadan küçük olmalı; p = '+p+' alındı.)':'')};
  }
  if(id==='sk-adet') {
    const x=Math.min(v.x,v.N),cheap=3*v.N,extra=v.d*x,total=cheap+extra;
    return {kind:id,...v,x,cheap,extra,total,equation:'Gelir = 3·'+v.N+' + '+v.d+'·'+x+' = '+total,
      observation:'Hepsi ucuz: '+cheap+'. Gerçek gelir '+total+', fazlalık '+extra+'. Her pahalı ürün '+v.d+' fazla getirir: '+extra+' : '+v.d+' = '+x+' pahalı ürün.'+(v.x>v.N?' (Pahalı adet toplamı aşamaz; x = '+x+' alındı.)':'')};
  }
  return null;
}
export const _frac=frac;
