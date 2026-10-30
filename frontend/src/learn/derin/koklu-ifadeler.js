import {show} from './yardim.js';
export const explorations={
  'kok-carpan':{
    lessonId:'koklu-ifadeler',title:'Tam kareyi alanın içinde bul',
    story:'Bir karenin alanı 72 birimkare. Kenarı tam sayı değil; 72’yi 36 tane 2 birimkarelik parça olarak düşünmek kenarı nasıl anlatır? Alanın karesel çarpanı kenarda karekökü kadar bir çarpana dönüşür.',
    terms:[['Karekök','Alanı n olan karenin negatif olmayan kenarı.'],['Tam kare çarpan','n’yi tam bölen 1,4,9,16… biçimindeki sayı.'],['Kök dışı','Karesi alınmış çarpanın kökten çıkan pozitif büyüklüğü.']],
    experiment:'Alan n’yi değiştir. Karelerin içinde kök dışına çıkacak en büyük kare çarpanını bul. Büyük karenin bir kenarında kaç küçük kare var? n tam kare olunca içerideki çarpan ne olur?',
    example:'$\\sqrt{72}$ ifadesini sadeleştir.',
    steps:[['Tam kare çarpanı ayır','$72=36\\cdot2$.'],['Kenar çarpanını bul','$\\sqrt{36\\cdot2}=6\\sqrt2$; 6×6 küçük kareden büyük kare oluşur.'],['Karesiyle kontrol et','$(6\\sqrt2)^2=36\\cdot2=72$; sonuç negatif değil.']],
    tip:'En büyük tam kare çarpanı ayır; kökten o çarpanın pozitif karekökü çıkar. Toplamı ayrı köklere ayırma.',
    trap:'$\\sqrt{a+b}=\\sqrt a+\\sqrt b$ genel kural değildir; 9+16 için 5 ile 7 farklıdır.',
    transfer:['$\\sqrt{48}$ nasıl sadeleşir?','$4\\sqrt3$','$16\\sqrt3$','48=16×3; kare çarpanın kendisi değil karekökü 4 çıkar. (4√3)²=48.'],
    expert:'n pozitif tam sayıysa n=s²r ve r kare çarpan içermiyorsa sade biçim s√r’dir. n=0 ayrıca √0=0 verir; negatif n’nin gerçek karekökü yoktur. Çift ve tek dereceli köklerin tanım koşulları farklıdır.',
  },
  'kok-eslenik':{
    lessonId:'koklu-ifadeler',title:'Eşlenikte çapraz alanlar birbirini götürür',
    story:'Bir dikdörtgenin kenarları √a+√b ve √a−√b. Büyük karenin alanından küçük karenin alanını çıkarınca aynı toplam alanı başka bir biçimde görürsün. Eşlenik çarpımı niçin köksüz kalır?',
    terms:[['Eşlenik','İki terim arasındaki + işaretini − yapan ifade.'],['İki kare farkı','(u+v)(u−v)=u²−v²; çapraz çarpımlar zıt işaretlidir.'],['Genişletme','Kesrin payını ve paydasını aynı sıfır olmayan sayıyla çarpmak.']],
    experiment:'a,b çiftini seç. Dikdörtgenin uzun ve kısa kenarı ile büyük kareden çıkarılan küçük kareyi karşılaştır. İki alan a−b olarak aynı kalıyor mu?',
    example:'$1/(\\sqrt7-\\sqrt3)$ ifadesini paydası rasyonel olacak biçimde yaz.',
    steps:[['Eşleniği seç','Pay ve paydayı $\\sqrt7+\\sqrt3$ ile çarp.'],['Paydayı hesapla','$(\\sqrt7-\\sqrt3)(\\sqrt7+\\sqrt3)=7-3=4$.'],['Yeni kesri yaz','$(\\sqrt7+\\sqrt3)/4$; payı çarpmayı unutmadık.']],
    tip:'Toplam veya fark şeklindeki köklü paydada eşlenikle genişlet. Paydanın sıfır olmadığını önce kontrol et.',
    trap:'Yalnız paydayı eşlenikle çarpmak kesrin değerini değiştirir. Tek köklü paydada yalnız o kökle genişletmek yeterli olabilir.',
    transfer:['$(\\sqrt{11}+\\sqrt5)(\\sqrt{11}-\\sqrt5)$ kaçtır?','6','16','İki kare farkı 11−5=6; toplam değil fark alınır.'],
    expert:'a>b≥0 iken dikdörtgenin kısa kenarı √a−√b pozitiftir. a=b durumunda bu kenar 0 olur; çarpım hâlâ 0 ama payda olarak bu farkla bölme tanımsızdır.',
  },
  'kok-denklem':{
    lessonId:'koklu-ifadeler',title:'Kare almak işaret bilgisini kaybettirir',
    story:'Alanından kenarını bulduğun karede kenar negatif olamaz. Bir köklü denklemi kareye çevirirken bu işaret bilgisini korumazsan, negatif “kenar” da denklem adayı olur. Grafikte gerçek kesişimle cebirsel adayı karşılaştır.',
    terms:[['Tanım koşulu','Karekökün içi negatif olamaz.'],['İşaret koşulu','Karekök bir ifadeye eşitse o ifade de negatif olmamalı.'],['Sahte kök','Karesi alınmış denklemi sağlayıp ilk denklemi sağlamayan aday.']],
    experiment:'c ve d’yi değiştir. √(x+c)=x−d için iki aday görünür. Hangisi karekökün negatif olmayan çıktısıyla kesişiyor? Adayları ilk eşitlikte dene.',
    example:'$\\sqrt{x+6}=x$ denklemini çöz.',
    steps:[['Koşulları yaz','$x+6\\geq0$ ve $x\\geq0$; birlikte x≥0.'],['Kare al ve çöz','$x+6=x^2$; $(x-3)(x+2)=0$, adaylar 3 ve −2.'],['İlk denklemde dene','3 için √9=3; −2 için √4=2≠−2. Yalnız 3 geçerli.']],
    tip:'Önce kökün içini ve karşı tarafın işaretini kontrol et; kare aldıktan sonra bütün adayları başlangıç denkleminde dene.',
    trap:'Kare alma her zaman eşdeğer dönüşüm değildir: 2²=(−2)² ama 2≠−2.',
    transfer:['$\\sqrt{x+12}=x$ denkleminin geçerli kökü nedir?','4','−3','x²−x−12=0 için 4 ve −3 aday; karşı taraf negatif olamayacağından 4 kalır. √16=4.'],
    expert:'A≥0 ve B≥0 koşulları altında √A=B ile A=B² eşdeğerdir. B’nin işaretini eklemeden yalnız A=B² yazmak çözüm kümesini genişletebilir. Bu nedenle işlemin tersinin hangi koşulda geçerli olduğunu düşünürüz.',
  },
};
const range=(key,label,value,min,max)=>({key,label,value,min,max,step:1});
export const ROOT_PAIRS=[[5,1],[7,3],[10,6],[8,2]];
export const controls={
  'kok-carpan':[range('n','Karenin alanı n',72,1,80)],
  'kok-eslenik':[{key:'pair',label:'Alanlar a ve b',value:1,options:ROOT_PAIRS.map(([a,b],i)=>[i,a+' ve '+b])}],
  'kok-denklem':[range('c','Kök içindeki sabit c',6,1,6),range('d','Sağdaki çıkarılan d',0,0,3)],
};
export function model(id,v) {
  if(id==='kok-carpan') {
    let s=1; for(let k=1;k*k<=v.n;k++) if(v.n%(k*k)===0) s=k;
    const r=v.n/(s*s);
    return {kind:id,...v,s,r,value:Math.sqrt(v.n),equation:'√'+v.n+' = '+s+'√'+r,observation:'Alan '+v.n+' = '+s+'² × '+r+'. Bir kenarda '+s+' küçük kare; her küçük karenin kenarı √'+r+'. Büyük karenin kenarı yaklaşık '+show(Math.sqrt(v.n))+'.'};
  }
  if(id==='kok-eslenik') {
    const [a,b]=ROOT_PAIRS[v.pair],u=Math.sqrt(a),w=Math.sqrt(b),long=u+w,short=u-w;
    return {kind:id,...v,a,b,u,w,long,short,area:a-b,equation:'(√'+a+' + √'+b+')(√'+a+' − √'+b+') = '+(a-b),observation:'Uzun kenar '+show(long)+', kısa kenar '+show(short)+'. Dikdörtgenin alanı '+(a-b)+'; büyük karenin '+a+' alanından küçük '+b+' çıkarılınca da aynı sonuç.'};
  }
  if(id==='kok-denklem') {
    const disc=Math.sqrt(1+4*(v.c+v.d)),candidates=[v.d+(1-disc)/2,v.d+(1+disc)/2];
    const accepted=candidates.filter((x)=>x+v.c>=0 && x-v.d>=0 && Math.abs(Math.sqrt(x+v.c)-(x-v.d))<1e-8);
    return {kind:id,...v,candidates,accepted,equation:'√(x + '+v.c+') = x − '+v.d,observation:'Kare sonrası adaylar '+candidates.map(show).join('; ')+'. İlk denklemde geçerli '+accepted.map(show).join('; ')+'. Karşı taraf x−'+v.d+' negatif olamaz.'};
  }
  return null;
}
