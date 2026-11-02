import {show} from './yardim.js';
const gcd=(x,y)=>(y?gcd(y,x%y):x);
const frac=(a,b)=>{const g=gcd(Math.abs(a),Math.abs(b))||1;return b/g===1?String(a/g):(a/g)+'/'+(b/g);};
export const explorations={
  'yi-zaman':{
    lessonId:'yas-isci-problemleri',title:'Zaman kayınca fark sabit, toplam ve oran değişir',
    story:'Bir annenin ve çocuğunun yaşlarını yıllar boyunca izle. Her yıl ikisi de bir yaş büyür: aralarındaki fark hiç değişmez, toplam her yıl 2 artar, oran ise sürekli 1’e yaklaşır. Yaş sorularının neredeyse hepsi bu üç gerçeğe dayanır.',
    terms:[['Yaş farkı','Büyük ile küçüğün yaşları farkı; doğum yılları farkına eşittir ve sabittir.'],['Yaş toplamı','$n$ kişinin yaşları toplamı her yıl $n$ artar.'],['Kat ilişkisi','“2 katı” gibi oranlar zamanla değişir; aynı oran yalnız bir yılda geçerlidir.']],
    experiment:'Büyüğün bugünkü yaşını, yaş farkını ve kaç yıl ileri/geri gidileceğini değiştir. Fark satırı hiç değişiyor mu? Hangi yılda büyük, küçüğün 2 katı oluyor?',
    example:'Bugün anne 40, çocuğu 12 yaşında. Kaç yıl sonra annenin yaşı çocuğun yaşının 2 katı olur?',
    steps:[['Farkı yaz','Fark $40-12=28$; hiç değişmez.'],['İlişkiyi farkla kur','Anne çocuğun 2 katıysa fark çocuğun yaşına eşittir: çocuk 28 yaşında.'],['Süreyi bul','$28-12=16$ yıl sonra; anne 56, çocuk 28.']],
    tip:'“Kaç katı” sorularında farkı kullan: büyük, küçüğün $k$ katıysa fark küçüğün $k-1$ katıdır.',
    trap:'Oranı sabit sanmak: bugün anne çocuğun $\\frac{40}{12}$ katı; 16 yıl sonra yalnız 2 katı. Oran zamana göre değişir.',
    transfer:['Baba 45, oğlu 15 yaşında. Kaç yıl sonra baba oğlunun 2 katı yaşında olur?','15','30','Fark 30; baba 2 katıyken oğul 30 yaşında olmalı: $30-15=15$ yıl sonra.'],
    expert:'$t$ yıl sonra büyük $a+t$, küçük $a-d+t$: fark $d$ sabit, toplam $2a-d+2t$ doğrusal, oran $\\frac{a+t}{a-d+t}$ ise $t$ büyüdükçe 1’e yaklaşır. Geçmişe giderken küçüğün yaşı 0’ın altına inemez.',
  },
  'yi-grup':{
    lessonId:'yas-isci-problemleri',title:'Grubun yaş toplamı: kişi sayısı kadar artar',
    story:'Bir takımda $n$ oyuncu var. Bir yıl geçince takımın yaş toplamı $n$ artar, çünkü her oyuncu bir yaş büyür. Takıma yeni doğmuş bir bebek katılırsa toplam değişmez ama kişi sayısı ve ortalama değişir.',
    terms:[['Yaş toplamı','Gruptaki herkesin yaşlarının toplamı: ortalama × kişi sayısı.'],['Ortalama','Toplam ÷ kişi sayısı; herkes 1 yaş büyüyünce ortalama da 1 artar.'],['Yeni üye','Gruba katılanın yaşı toplama eklenir; yeni doğanın yaşı 0’dır.']],
    experiment:'Kişi sayısını, bugünkü ortalamayı ve geçen yılı değiştir. Toplam her yıl kaç artıyor? Ortalama kaç artıyor?',
    example:'5 kişilik bir ailenin yaş ortalaması 24. 3 yıl sonra ailenin yaş toplamı kaç olur?',
    steps:[['Toplamı bul','$5\\cdot24=120$.'],['Herkes 3 yaş büyür','Toplam $5\\cdot3=15$ artar.'],['Sonuç','$120+15=135$; ortalama $27$.']],
    tip:'Grup sorularında önce toplamı yaz (ortalama × kişi). Zaman geçince toplama “kişi sayısı × yıl” ekle; kişi değişince yeni kişilerin yaşlarını ekle ya da çıkar.',
    trap:'Toplama yalnız geçen yılı eklemek (120 + 3): her kişi ayrı ayrı büyür.',
    transfer:['8 kişilik bir grubun yaş toplamı 200. 4 yıl önce toplam kaçtı?','168','196','Her kişi 4 yaş küçüktü: $200-8\\cdot4=168$. 196 yalnız 4 çıkarmaktır.'],
    expert:'$t$ yıl sonra toplam $S+nt$, ortalama $\\bar x+t$. Bu yüzden ortalama yaş sorularında kişi sayısı sabitse ortalama doğrudan yıl kadar artar; kişi sayısı değişiyorsa toplam üzerinden gitmek gerekir.',
  },
  'yi-is':{
    lessonId:'yas-isci-problemleri',title:'Birlikte çalışmak: hızlar toplanır, süreler değil',
    story:'Bir işi Ayşe $a$ günde, Mert $b$ günde bitiriyor. Birlikte çalışınca işin bir günde ne kadarı biter? Süreleri toplamak yanlıştır; her gün yapılan iş parçaları toplanır: $\\frac1a+\\frac1b$.',
    terms:[['İş hızı','Bir günde yapılan iş: $a$ günde biten iş için $\\frac1a$.'],['Birlikte hız','Hızların toplamı.'],['Kalan iş','$t$ gün birlikte çalışınca kalan: $1-t\\left(\\frac1a+\\frac1b\\right)$.']],
    experiment:'$a$, $b$ ve birlikte çalışılan gün sayısını değiştir. Çubuktaki iki renk her gün ne kadar iş ekliyor? Kalan iş tek başına Ayşe’nin kaç gününe denk?',
    example:'Bir işi Ayşe 10, Mert 15 günde bitiriyor. 3 gün birlikte çalıştıktan sonra Mert ayrılıyor. Ayşe kalan işi kaç günde bitirir?',
    steps:[['Birlikte hız','$\\frac1{10}+\\frac1{15}=\\frac16$ iş/gün.'],['3 günde yapılan','$3\\cdot\\frac16=\\frac12$; kalan $\\frac12$.'],['Kalanı Ayşe yapar','$\\frac12:\\frac1{10}=5$ gün; Ayşe toplam 8 gün çalışır.']],
    tip:'İşçi sorularında işi 1 (ya da sürelerin EKOK’u kadar parça) al; her kişinin günlük payını yaz ve çalıştığı günlerle çarpıp topla.',
    trap:'Birlikte süreyi $10+15$ ya da $\\frac{10+15}{2}$ sanmak; birlikte süre her iki süreden de kısadır.',
    transfer:['Bir işi biri 6, diğeri 12 saatte bitiriyor. Birlikte kaç saatte biter?','4','9','Hızlar $\\frac16+\\frac1{12}=\\frac14$; birlikte 4 saat. 9, iki sürenin ortalamasıdır.'],
    expert:'Birlikte süre $\\frac{ab}{a+b}$ (harmonik ortalamanın yarısı). İşi EKOK$(a,b)$ parça alırsan hızlar tam sayı olur: 10 ve 15 gün için 30 parça, hızlar 3 ve 2 parça/gün.',
  },
};
const range=(key,label,value,min,max)=>({key,label,value,min,max,step:1});
export const controls={
  'yi-zaman':[range('a','Büyüğün bugünkü yaşı',40,20,60),range('d','Yaş farkı',28,5,35),range('t','Geçen yıl (− geçmiş, + gelecek)',16,-15,20)],
  'yi-grup':[range('n','Kişi sayısı',5,2,8),range('m','Bugünkü ortalama yaş',24,10,40),range('t','Geçen yıl',3,0,10)],
  'yi-is':[range('a','Ayşe kaç günde bitirir',10,4,20),range('b','Mert kaç günde bitirir',15,4,20),range('t','Birlikte çalışılan gün',3,0,6)],
};
export function model(id,v) {
  if(id==='yi-zaman') {
    const d=Math.min(v.d,v.a-1),t=Math.max(v.t,-(v.a-d)),big=v.a+t,small=v.a-d+t;
    return {kind:id,...v,d,t,big,small,diff:big-small,sum:big+small,equation:'Büyük '+big+' · küçük '+small+' · fark '+(big-small)+' · toplam '+(big+small),
      observation:'Fark her yıl '+d+'. Toplam bugünkünden '+show(2*t)+' farklı (yıl başına 2). Oran '+(small?frac(big,small):'tanımsız')+(small===0?'; küçük bu yıl doğuyor.':'.')+(t!==v.t||d!==v.d?' (Küçüğün yaşı 0’ın altına inemez; değerler sınırlandı.)':'')};
  }
  if(id==='yi-grup') {
    const S=v.n*v.m,total=S+v.n*v.t;
    return {kind:id,...v,S,total,avg:v.m+v.t,equation:v.n+' kişi: bugün '+S+', '+v.t+' yıl sonra '+S+' + '+v.n+'·'+v.t+' = '+total,
      observation:'Herkes '+v.t+' yaş büyüdü: toplam '+(v.n*v.t)+' arttı, ortalama '+v.m+' → '+(v.m+v.t)+'. Yeni doğan bir bebek eklenseydi toplam aynı kalır, ortalama '+frac(total,v.n+1)+' olurdu.'};
  }
  if(id==='yi-is') {
    const L=v.a*v.b/gcd(v.a,v.b),ra=L/v.a,rb=L/v.b,done=Math.min(L,v.t*(ra+rb)),left=L-done;
    return {kind:id,...v,L,ra,rb,done,left,together:frac(v.a*v.b,v.a+v.b),aloneDays:frac(left,ra),equation:'İş = '+L+' parça · Ayşe '+ra+', Mert '+rb+' parça/gün · birlikte '+frac(v.a*v.b,v.a+v.b)+' günde biter',
      observation:v.t+' günde '+done+' parça yapıldı, '+left+' parça kaldı. Kalanı Ayşe tek başına '+frac(left,ra)+' günde bitirir.'+(left===0?' İş zaten bitti.':'')};
  }
  return null;
}
