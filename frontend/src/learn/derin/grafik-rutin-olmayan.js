import {show} from './yardim.js';
export const BANDS=[[1,32],[33,65],[66,100]];
export const DAYS=['pazartesi','salı','çarşamba','perşembe','cuma','cumartesi','pazar'];
export const explorations={
  'gr-aralik':{
    lessonId:'grafik-rutin-olmayan',title:'İki aralık bilgisinden ortak kısım',
    story:'Ses simgesi sesi değil, sesin hangi aralıkta olduğunu söyler: 1–32 tek dalga, 33–65 iki dalga, 66–100 üç dalga. Ses biraz artınca ya da azalınca görünen simge, başlangıç seviyesine iki ayrı sınır koyar.',
    terms:[['Aralık','Bir sayının alabileceği en küçük ve en büyük değerler arasındaki bütün değerler.'],['Ortak kısım','İki aralıkta birden bulunan değerler; iki bilginin aynı anda doğru olduğu yer.'],['Uç değer','Aralığın sınırı; “en az” ve “en fazla” sınırı içine alır.']],
    experiment:'Artışı, azalışı ve görünen simgeleri değiştir. Ortak kısım ne zaman tek bir sayıya iniyor? Ne zaman hiç değer kalmıyor?',
    example:'Ses 10 artınca üç dalga, 20 azalınca iki dalga görünüyor. Başlangıç seviyesi hangi aralıkta?',
    steps:[['Üç dalga','$66\\le L+10\\le100$: $56\\le L\\le90$.'],['İki dalga','$33\\le L-20\\le65$: $53\\le L\\le85$.'],['Ortak kısım','$56\\le L\\le85$: 30 tam sayı.']],
    tip:'Her bilgiyi başlangıç değeri için bir aralığa çevir; cevap bütün aralıkların ortak kısmıdır.',
    trap:'Yalnız bir bilgiyi kullanmak; ya da “en az 33” sınırındaki 33’ü dışarıda bırakmak.',
    transfer:['Ses 5 artınca iki dalga, 30 azalınca tek dalga görünüyor. Başlangıç en çok kaçtır?','60','62','$L+5\\le65$ ve $L-30\\le32$: $L\\le60$ ve $L\\le62$; ikisi birden: en çok 60.'],
    expert:'Her bilgi $L$ için bir kapalı aralık verir; kapalı aralıkların kesişimi yine bir aralıktır (ya da boştur). Tam sayı değerlerin toplamı, aritmetik dizi toplamıyla bulunur: $\\frac{(\\text{ilk}+\\text{son})\\cdot\\text{adet}}{2}$.',
  },
  'gr-pul':{
    lessonId:'grafik-rutin-olmayan',title:'Bütün tam sayı çözümleri listele',
    story:'İki farklı boydaki torba, kutu ya da pulla tam bir toplam elde etmek $ax+by=T$ denklemidir. Genellikle birkaç çözüm vardır; soru en az ya da en çok adedi isteyebilir.',
    terms:[['Doğal sayı çözümü','$x$ ve $y$’nin 0, 1, 2, … değerleri aldığı çözüm.'],['Ardışık çözüm','Bir çözümden $x$’i $b$ azaltıp $y$’yi $a$ artırarak bulunan yeni çözüm (sadeleşmiş $a$, $b$ için).'],['Toplam adet','$x+y$; büyük birim arttıkça azalır.']],
    experiment:'Birimleri ve toplamı değiştir. Kaç çözüm çıkıyor? En az adet hangi çözümde? Hiç çözüm olmayan bir toplam bulabilir misin?',
    example:'3 ve 5 kiloluk torbalarla 47 kg: bütün çözümler ve en az torba?',
    steps:[['İlk çözüm','$y=1$: $3x=42$, $x=14$.'],['Ardışıklar','$(9,4)$ ve $(4,7)$.'],['Adetler','15, 13, 11: en az 11 torba.']],
    tip:'Bir değişkeni küçükten büyüğe dene; kalanı tutan ilk değeri bulunca diğerleri düzenli aralıklarla gelir.',
    trap:'İlk bulunan çözümü tek çözüm sanmak; en az adet sorulduğunda büyük birimi en çoğa götürmeyi unutmak.',
    transfer:['4 ve 7 kişilik masalarla 50 kişi tam oturtulacak. En az kaç masa gerekir?','8','11','$4x+7y=50$: $(9,2)$ ve $(2,6)$; masalar 11 ve 8, en az 8.'],
    expert:'$\\text{EBOB}(a,b)=d$ ise çözüm ancak $d\\mid T$ iken vardır. Bir çözüm $(x_0,y_0)$ ise bütün çözümler $\\left(x_0-\\frac{b}{d}k,\\ y_0+\\frac{a}{d}k\\right)$ biçimindedir; negatif olmayanlar sayılır.',
  },
  'gr-kumbara':{
    lessonId:'grafik-rutin-olmayan',title:'Kumbara hangi gün hedefe ulaşır?',
    story:'Hafta içi ve hafta sonu farklı miktarlar atılan bir kumbarada her tam hafta aynı tutarı ekler. Hedefe ulaşılan gün, tam haftalardan sonra kalan birkaç güne ve başlangıç gününe bağlıdır.',
    terms:[['Haftalık toplam','5 hafta içi ve 2 hafta sonu gününün toplamı.'],['Tam hafta','7 gün; haftanın gününü değiştirmez.'],['İlk ulaşılan gün','Toplamın hedefe ilk kez eriştiği gün; bir önceki gün hedefin altındadır.']],
    experiment:'Başlangıç gününü değiştir: hedefe ulaşılan gün nasıl kayıyor? Hedefi 50 TL artırınca ulaşma günü kaç gün ileri gidiyor?',
    example:'Hafta içi 20, hafta sonu 30 TL; pazartesi başlayan biri ilk kez hangi gün 300 TL’ye ulaşır?',
    steps:[['Hafta','$5\\cdot20+2\\cdot30=160$ TL.'],['İkinci hafta','Pazartesi 180, salı 200, çarşamba 220, perşembe 240, cuma 260.'],['Hedef','Cumartesi 290, pazar 320: ilk kez pazar.']],
    tip:'Önce haftalık toplamla tam haftaları geç, kalan günleri başlangıç gününden itibaren say.',
    trap:'Hedefi haftalık toplama bölüp kalanı gün sayısı sanmak; hafta sonu günlerinin farklı miktarını unutmak.',
    transfer:['Hafta içi 10, hafta sonu 20 TL; cumartesi başlayan biri 100 TL’ye ilk kez hangi gün ulaşır?','Cumartesi','Cuma','Cumartesi 20, pazar 40, sonra hafta içi 10’ar: cuma 90, ertesi cumartesi 110.'],
    expert:'Gün $n$’deki toplam, $\\lfloor n/7\\rfloor$ tam hafta artı kalan günlerin miktarıdır. Hedefe ulaşılan gün aranırken toplam monoton arttığı için ilk aşan gün tektir.',
  },
};
const range=(key,label,value,min,max,step=1)=>({key,label,value,min,max,step});
const band=[[0,'1–32 (tek dalga)'],[1,'33–65 (iki dalga)'],[2,'66–100 (üç dalga)']];
export const controls={
 'gr-aralik':[range('p','Artış (birim)',10,1,30),{key:'b1',label:'Artınca görünen',value:2,options:band},range('q','Azalış (birim)',20,1,30),{key:'b2',label:'Azalınca görünen',value:1,options:band}],
 'gr-pul':[range('a','Küçük birim',3,2,9),range('b','Büyük birim',5,3,12),range('t','Toplam',47,10,100)],
 'gr-kumbara':[range('w','Hafta içi (TL)',20,10,40,5),range('e','Hafta sonu (TL)',30,10,50,5),range('t','Hedef (TL)',300,100,800,50),{key:'s',label:'Başlangıç günü',value:0,options:DAYS.map((d,i)=>[i,d])}],
};
/** Ses seviyesi L için iki aralık bilgisinin ortak kısmı (1–100). */
export function feasible(v){const out=[];for(let L=1;L<=100;L++){const up=L+v.p,down=L-v.q;if(up>100||down<1)continue;const [a1,c1]=BANDS[v.b1],[a2,c2]=BANDS[v.b2];if(up>=a1&&up<=c1&&down>=a2&&down<=c2)out.push(L);}return out;}
/** ax + by = t denkleminin doğal sayı çözümleri, x büyükten küçüğe. */
export function solutions(a,b,t){const out=[];for(let y=0;y*b<=t;y++)if((t-y*b)%a===0)out.push([(t-y*b)/a,y]);return out;}
/** Kumbara: başlangıç günü s (0 = pazartesi); hedefe ilk ulaşılan gün. */
export function fill(v){const days=[];let total=0;for(let n=0;total<v.t;n++){const wd=(v.s+n)%7;total+=wd>=5?v.e:v.w;days.push({wd,total});}return days;}
export function model(id,v){
 if(id==='gr-aralik'){const list=feasible(v),lo1=BANDS[v.b1][0]-v.p,hi1=Math.min(BANDS[v.b1][1],100)-v.p,lo2=BANDS[v.b2][0]+v.q,hi2=BANDS[v.b2][1]+v.q;return{kind:id,...v,list,lo1,hi1,lo2,hi2,equation:list.length?show(list[0])+' ≤ L ≤ '+show(list[list.length-1]):'Ortak kısım boş',observation:list.length?list.length+' tam sayı değer'+(list.length<=4?': '+list.join(', ')+'; toplam '+list.reduce((s,x)=>s+x,0)+'.':'.'):'İki bilgi aynı anda sağlanamıyor: aralıklar kesişmiyor.'};}
 if(id==='gr-pul'){const list=solutions(v.a,v.b,v.t),counts=list.map(([x,y])=>x+y);return{kind:id,...v,list,equation:v.a+'x + '+v.b+'y = '+v.t+(list.length?' · '+list.length+' çözüm':' · çözüm yok'),observation:list.length?'Çözümler '+list.map(([x,y])=>'('+x+', '+y+')').join(', ')+'. En az '+Math.min(...counts)+', en çok '+Math.max(...counts)+' adet.':'Hiçbir doğal sayı ikilisi bu toplamı vermiyor.'};}
 if(id==='gr-kumbara'){const days=fill(v),last=days[days.length-1],week=5*v.w+2*v.e;return{kind:id,...v,days,week,equation:'Haftalık '+week+' TL · '+days.length+'. gün '+DAYS[last.wd],observation:'İlk kez '+DAYS[last.wd]+' günü '+last.total+' TL'+(days.length>1?'; bir önceki gün '+days[days.length-2].total+' TL.':'.')};}
 return null;
}
