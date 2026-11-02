import {show} from './yardim.js';
export const explorations={
  'hp-karsilasma':{
    lessonId:'hareket-problemleri',title:'Karşılaştıktan sonra kalan süreler',
    story:'İki araç birbirine doğru çıkıp C’de karşılaşıyor. Birinin karşılaşmadan sonra gideceği parçayı öbürü karşılaşmadan önce zaten gitmiştir. Bu yüzden kalan iki süre, karşılaşma süresini ve hız oranını birlikte belirler.',
    terms:[['Karşılaşma süresi','Çıkıştan karşılaşmaya kadar geçen süre: $t=\\frac{d}{V_A+V_B}$.'],['Kalan süre','Bir aracın karşılaşmadan sonra öbürünün çıktığı yere varması için gereken süre.'],['Geometrik ortalama','İki sayının çarpımının karekökü: $\\sqrt{t_At_B}$.']],
    experiment:'Hızları değiştir ve üç süreyi izle. Karşılaşma süresinin karesi neden hep kalan iki sürenin çarpımına eşit? Hızlar eşitken ne oluyor?',
    example:'360 km arayla birbirine doğru 60 ve 30 km/sa hızla çıkan araçlar ne zaman karşılaşır, sonra kaçar saatte varırlar?',
    steps:[['Karşılaşma','$360:(60+30)=4$ saat; AC $=240$, CB $=120$ km.'],['Kalan süreler','A, CB’yi $120:60=2$ saatte; B, AC’yi $240:30=8$ saatte gider.'],['Bağıntı','$t^2=16=2\\cdot8$.']],
    tip:'Karşılaştıktan sonra $t_A$ ve $t_B$ sürelerinde varan araçlar $t=\\sqrt{t_At_B}$ anında karşılaşmıştır; hız oranı $\\frac{V_A}{V_B}=\\frac{t}{t_A}$.',
    trap:'Kalan sürelerin aritmetik ortalaması karşılaşma süresi değildir: 2 ve 8 için 5 değil 4.',
    transfer:['Karşılaştıktan sonra biri 4, diğeri 25 dakikada varan iki koşucu kaç dakikada karşılaşmıştır?','10','14,5','$\\sqrt{4\\cdot25}=10$. 14,5 aritmetik ortalamadır.'],
    expert:'$V_At_A=V_Bt$ ve $V_Bt_B=V_At$ eşitliklerini çarpınca $t^2=t_At_B$, bölünce $\\left(\\frac{V_A}{V_B}\\right)^2=\\frac{t_B}{t_A}$ çıkar. Yol $d$ hiç gerekmez; yalnız oranlar konuşur.',
  },
  'hp-aralik':{
    lessonId:'hareket-problemleri',title:'Aradaki uzaklık grafiği nerede kırılır?',
    story:'Aynı evden zıt yönlere, okullarına doğru yürüyen iki kardeşin arasındaki uzaklık önce iki hızın toplamıyla artar. İlk varan durunca grafik kırılır ve eğim yalnız yürümeye devam edenin hızı olur.',
    terms:[['Aradaki uzaklık','İki kişinin birbirine olan uzaklığı; konumla karıştırılmamalı.'],['Eğim','Grafiğin bir dakikada ne kadar yükseldiği: uzaklığın değişme hızı.'],['Kırılma noktası','Birinin durduğu ya da vardığı an; eğim burada değişir.']],
    experiment:'Hızları ve okul uzaklıklarını değiştir. Kırılma ne zaman oluyor? Kırılmadan sonraki eğim hangi kardeşin hızı? İki varış aynı anda olursa ne görürsün?',
    example:'Kardeşler dakikada 120 ve 80 m yürüyor; okulları 600 ve 1200 m uzakta. Grafik nerede kırılır?',
    steps:[['İlk parça','Uzaklık $120+80=200$ m/dk artar.'],['Kırılma','Birinci kardeş $600:120=5$. dakikada varır; uzaklık $5\\cdot200=1000$ m.'],['Son parça','Sonra yalnız 80 m/dk: 15. dakikada $1800$ m.']],
    tip:'Kırılmadan önceki eğim hızların toplamı, sonraki eğim hâlâ yürüyenin hızıdır. Farkları önce varanın hızını verir.',
    trap:'Kırılmadan sonraki eğimi önce varan kişiye vermek: o kişi artık durmuştur.',
    transfer:['Uzaklık ilk 4 dakikada 1200 m’ye çıkıyor, sonra dakikada 100 m artıyor. Önce varan kaç metre yürüdü?','800','400','Toplam hız 300, kalan 100: önce varan $200\\cdot4=800$ m yürüdü.'],
    expert:'Uzaklık fonksiyonu $g(t)=V_1\\min(t,T_1)+V_2\\min(t,T_2)$’dir; parçalı doğrusal ve azalmayan bir fonksiyondur. Aynı yönde yürüyenlerde ise $|V_1-V_2|$ eğimli V biçimli parçalar çıkar.',
  },
  'hp-pist':{
    lessonId:'hareket-problemleri',title:'Pistte kaçıncı karşılaşma, kaçıncı dakika?',
    story:'Dairesel pistte iki koşucunun ilk karşılaşmasına kadar kapanan yol, başlangıçtaki aradır. Sonraki her karşılaşmada tam bir tur kapanır. Başlangıç noktası ve yön değişince yalnız ilk karşılaşma değişir.',
    terms:[['Çevre','Pistin bir tur uzunluğu.'],['Kapanma hızı','Zıt yönde $V_1+V_2$, aynı yönde $V_1-V_2$.'],['Başlangıç arası','İlk karşılaşmaya kadar kapanması gereken yol: aynı noktadan bir tur, çapın uçlarından yarım tur.']],
    experiment:'Başlangıç biçimini ve karşılaşma sayısını değiştir. Karşılaşmalar arası süre hangi durumda değişmiyor? Karşılaşma noktaları pistin neresine düşüyor?',
    example:'600 m pistte çapın iki ucundan zıt yönlere 60 ve 40 m/dk koşanlar 3. kez ne zaman karşılaşır?',
    steps:[['İlk karşılaşma','Yarım tur: $300:100=3$ dakika.'],['Sonrakiler','Her biri tam tur: $600:100=6$ dakika arayla.'],['3. karşılaşma','$3+2\\cdot6=15$. dakika.']],
    tip:'$n$. karşılaşma $=\\frac{\\text{başlangıç arası}+(n-1)\\cdot\\text{çevre}}{\\text{kapanma hızı}}$.',
    trap:'Çapın uçlarından başlayanlarda karşılaşmalar arasını ilk karşılaşma süresi kadar sanmak; ilk karşılaşma yarım tur, sonrakiler tam tur.',
    transfer:['Aynı noktadan zıt yönlere çıkan iki koşucu 4. dakikada ilk kez karşılaşıyor. 5. karşılaşma kaçıncı dakikada?','20','16','Aynı noktadan çıkınca her karşılaşma bir tur: $5\\cdot4=20$.'],
    expert:'Karşılaşma anları aritmetik dizidir: ilk terim başlangıç arası ÷ kapanma hızı, ortak fark çevre ÷ kapanma hızı. Hızlar oranı $p:q$ (sade) ise aynı noktadan zıt yönde koşanlar pisti $p+q$ eşit yaya bölen noktalarda karşılaşır.',
  },
};
const range=(key,label,value,min,max,step=1)=>({key,label,value,min,max,step});
export const controls={
 'hp-karsilasma':[range('d','Aradaki yol (km)',360,120,600,60),range('va','A’nın hızı (km/sa)',60,20,120,10),range('vb','B’nin hızı (km/sa)',30,20,120,10)],
 'hp-aralik':[range('v1','1. kardeşin hızı (m/dk)',120,50,200,10),range('d1','1. okulun uzaklığı (m)',600,200,1600,100),range('v2','2. kardeşin hızı (m/dk)',80,50,200,10),range('d2','2. okulun uzaklığı (m)',1200,200,1600,100)],
 'hp-pist':[range('c','Pist çevresi (m)',600,200,1000,100),range('v1','1. koşucu (m/dk)',60,20,100,10),range('v2','2. koşucu (m/dk)',40,10,90,10),{key:'op',label:'Başlangıç',value:2,options:[[0,'Aynı noktadan, zıt yön'],[1,'Aynı noktadan, aynı yön'],[2,'Çapın uçlarından, zıt yön']]},range('n','Kaçıncı karşılaşma',3,1,6)],
};
/** Aradaki uzaklık: iki kişi aynı noktadan zıt yönlere, d1 ve d2 uzaklıktaki hedeflerine yürür. */
export function gap(v,t){return v.v1*Math.min(t,v.d1/v.v1)+v.v2*Math.min(t,v.d2/v.v2);}
/** Pistte n. karşılaşma anı; aynı hızla aynı yönde koşanlar hiç karşılaşmaz (null). */
export function meetAt(v,n){const closing=v.op===1?Math.abs(v.v1-v.v2):v.v1+v.v2;if(!closing)return null;return((v.op===2?v.c/2:v.c)+(n-1)*v.c)/closing;}
export function model(id,v){
 if(id==='hp-karsilasma'){const t=v.d/(v.va+v.vb),ac=v.va*t,cb=v.vb*t,ta=cb/v.va,tb=ac/v.vb;return{kind:id,...v,t,ac,cb,ta,tb,equation:'t² = '+show(t*t)+' = '+show(ta)+' · '+show(tb),observation:'Karşılaşma '+show(t)+' saatte. A kalan '+show(cb)+' km’yi '+show(ta)+' saatte, B kalan '+show(ac)+' km’yi '+show(tb)+' saatte gider'+(v.va===v.vb?'; hızlar eşit, üç süre aynı.':'.')};}
 if(id==='hp-aralik'){const T1=v.d1/v.v1,T2=v.d2/v.v2,first=Math.min(T1,T2),last=Math.max(T1,T2),total=v.d1+v.d2,mid=gap(v,first),after=T1===T2?0:T1<T2?v.v2:v.v1;return{kind:id,...v,T1,T2,first,last,total,mid,after,points:[[0,0],[first,mid],[last,total]],equation:'Eğimler: '+(v.v1+v.v2)+(T1===T2?'':' → '+after)+' m/dk',observation:T1===T2?'İkisi aynı anda ('+show(first)+'. dakika) varıyor; grafik kırılmadan biter.':(T1<T2?'1.':'2.')+' kardeş '+show(first)+'. dakikada varıp duruyor; uzaklık '+show(mid)+' m. Sonra yalnız '+after+' m/dk artıyor.'};}
 if(id==='hp-pist'){const closing=v.op===1?Math.abs(v.v1-v.v2):v.v1+v.v2,times=Array.from({length:v.n},(_,i)=>meetAt(v,i+1)),t=times[v.n-1],spots=t===null?[]:times.map((s)=>((v.v1*s)%v.c+v.c)%v.c);return{kind:id,...v,closing,times,t,spots,equation:t===null?'Hızlar eşit: aradaki yol hiç kapanmaz':v.n+'. karşılaşma: '+show(t)+'. dakika',observation:t===null?'Aynı yönde eşit hızla koşanlar arasındaki uzaklık hep aynı kalır.':'İlk karşılaşma '+show(times[0])+'. dakikada'+(v.n>1?', sonrakiler '+show(v.c/closing)+' dakika arayla (bir tur).':'.')};}
 return null;
}
