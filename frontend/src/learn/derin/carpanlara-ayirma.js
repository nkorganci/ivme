import {show} from './yardim.js';
const term=(c,x)=>(c<0?' − ':' + ')+(Math.abs(c)===1&&x?'':show(Math.abs(c)))+x;
const lin=(a,b)=>(a===1?'':show(a))+'x'+(b?term(b,''):'');
export const explorations={
  'carpan-ortak':{
    lessonId:'carpanlara-ayirma',title:'Ortak kenar dışarı çıkar',
    story:'Aynı yükseklikte iki halıyı yan yana serersen tek bir büyük halı elde edersin. İki alanı ayrı ayrı hesaplayıp toplamak ile ortak yüksekliği bir kez alıp genişlikleri toplamak aynı sonucu verir. Ortak çarpan parantezi tam olarak budur.',
    terms:[['Çarpan','Bir çarpımı oluşturan sayı ya da ifade: $a\\cdot b$ içinde $a$ ve $b$.'],['Ortak çarpan','Her terimde bulunan çarpan; dikdörtgenlerin ortak kenarı.'],['Dağılma özelliği','$a(b+c)=ab+ac$. Ortak çarpana almak bu eşitliği sağdan sola okumaktır.']],
    experiment:'Ortak yüksekliği $a$, iki genişliği $b$ ve $c$ olarak değiştir. İki alanın toplamı her durumda $a\\cdot(b+c)$ ile aynı mı?',
    example:'$7\\cdot38+7\\cdot62$ işlemini kolay yoldan hesapla.',
    steps:[['Ortak çarpanı gör','İki terimde de 7 var: ortak kenar 7.'],['Genişlikleri topla','$38+62=100$: iki halı yan yana tek bir 100 genişlik.'],['Tek çarpım yap','$7\\cdot100=700$; ayrı ayrı $266+434=700$ ile aynı.']],
    tip:'Önce “her terimde ne var?” diye sor. Ortak olanı bir kez yaz, kalanları parantez içinde topla.',
    trap:'$ab+c$ ifadesinde $c$’de $a$ yoksa $a$ ortak çarpan değildir; $a(b+c)$ yazmak $ac$ terimini uydurur.',
    transfer:['$12\\cdot47+12\\cdot53$ kaçtır?','1200','1188','Ortak çarpan 12: $12(47+53)=12\\cdot100=1200$. 1188, 53 yerine 52 kullanmak gibi bir hesap kaymasıdır.'],
    expert:'Gruplandırma bu fikrin iki katmanlı hâlidir: $ax+ay+bx+by=a(x+y)+b(x+y)$; ikinci adımda $(x+y)$ yeni ortak kenar olur ve $(a+b)(x+y)$ bir dikdörtgenin iki kenarı gibi okunur.',
  },
  'carpan-alan':{
    lessonId:'carpanlara-ayirma',title:'Kare içinde kare: dört bölge',
    story:'Kenarı $a$ olan kare bir bahçenin köşesine kenarı $b$ olan kare bir havuz yapılıyor. Kalan alan iki eş dikdörtgen ve bir kareye ayrılır. Tam kare ve iki kare farkı özdeşlikleri bu dört parçanın alanlarından okunur.',
    terms:[['Tam kare','$(a-b)^2=a^2-2ab+b^2$; kenarı $a-b$ olan karenin alanı.'],['İki kare farkı','$a^2-b^2=(a-b)(a+b)$; büyük kareden küçük kare çıkınca kalan alan.'],['Bölge','I: $b^2$, II ve III: $b(a-b)$, IV: $(a-b)^2$.']],
    experiment:'$b$ ve $a-b$ uzunluklarını değiştir. IV bölgesinin alanı $a^2-2ab+b^2$ ile; II+III+IV toplamı $a^2-b^2$ ile her zaman aynı mı?',
    example:'$a=7$, $b=3$ için $a^2-2ab+2b^2$ hangi iki bölgenin toplamıdır?',
    steps:[['Bölgeleri hesapla','I $=9$, II $=$ III $=12$, IV $=16$.'],['İfadeyi hesapla','$49-42+18=25$.'],['Eşleştir','$25=9+16$: I ve IV. Genel olarak $a^2-2ab+2b^2=(a-b)^2+b^2$.']],
    tip:'Bir ifadeyi bölgelere eşlerken onu önce tanıdık parçalara ayır: $a^2-2ab+2b^2=(a^2-2ab+b^2)+b^2$.',
    trap:'$(a-b)^2=a^2-b^2$ sanmak: büyük kareden yalnız küçük kare değil, iki dikdörtgen de çıkar.',
    transfer:['$a=6$, $b=2$ için $(a-b)(a+b)$ hangi alanı verir?','32','16','$36-4=32$: büyük kareden I. bölge çıkınca kalan II+III+IV $=8+8+16=32$. 16 yalnız IV’tür.'],
    expert:'Alan modeli $a>b>0$ için bir gösterimdir; özdeşlikler bütün gerçek sayılarda geçerlidir çünkü cebirsel açılımla kanıtlanır. Model, hangi terimin hangi parçaya karşılık geldiğini görmeyi sağlar.',
  },
  'carpan-capraz':{
    lessonId:'carpanlara-ayirma',title:'Çapraz çarpım: orta terim nereden geliyor?',
    story:'$(mx+n)(rx+s)$ çarpımında baş terim $mr$, sabit terim $ns$ çarpımından gelir. Orta terim ise iki çapraz çarpımın toplamıdır: $ms+nr$. Sabitleri yanlış satıra yazmak baş ve sabit terimi bozmaz ama orta terimi değiştirir.',
    terms:[['Baş katsayı','$x^2$’nin katsayısı: $m\\cdot r$.'],['Sabit terim','$x$ içermeyen terim: $n\\cdot s$.'],['Çapraz çarpım','Satırları çaprazlama çarpıp toplamak: $m\\cdot s+n\\cdot r$ orta katsayıdır.']],
    experiment:'$m$, $r$, $n$, $s$ değerlerini değiştir. Doğru yerleşimle ve $n$ ile $s$ yer değiştirmiş yerleşimle orta katsayıyı karşılaştır. Baş ve sabit terim değişiyor mu?',
    example:'$2x^2+x-21$ ifadesini çarpanlarına ayır.',
    steps:[['Uçları ayır','$2x^2=2x\\cdot x$, $-21=7\\cdot(-3)$ ya da $(-7)\\cdot3$ …'],['Çaprazı dene','$2x\\cdot(-3)+x\\cdot7=x$ ✓.'],['Yaz ve kontrol et','$(2x+7)(x-3)=2x^2-6x+7x-21$ ✓.']],
    tip:'Uç terimlerin çarpanlarını yaz, çaprazları topla; orta terim tutana kadar sabitlerin yerini ve işaretini değiştir.',
    trap:'Sabitlerin yerini değiştirmek baş ve sabit terimi aynı bırakır; bu yüzden yalnız orta terimle kontrol edilir. Kontrolsüz yazılan çarpanlama farklı bir polinoma aittir.',
    transfer:['$(2x+7)(x-3)$ yerine $(2x-3)(x+7)$ yazılırsa orta katsayı kaç olur?','11','1','$2\\cdot7+(-3)\\cdot1=11$. Sabitlerin yeri değişince yalnız orta katsayı değişti: $2x^2+11x-21$.'],
    expert:'$ax^2+bx+c$ için $m r=a$, $ns=c$, $ms+nr=b$ sistemi çözülür. Tam sayı çözüm yoksa ifade tam sayı katsayılarla çarpanlara ayrılmaz; ikinci derece denklemde diskriminant bu durumu ölçer.',
  },
};
const range=(key,label,value,min,max)=>({key,label,value,min,max,step:1});
export const controls={
  'carpan-ortak':[range('a','Ortak yükseklik a',3,1,6),range('b','Birinci genişlik b',4,1,6),range('c','İkinci genişlik c',2,1,6)],
  'carpan-alan':[range('b','İç kare kenarı b',3,1,4),range('d','Kalan uzunluk a − b',4,1,5)],
  'carpan-capraz':[range('m','m',2,1,3),range('r','r',1,1,3),range('n','n',7,-7,7),range('s','s',-3,-7,7)],
};
export function model(id,v) {
  if(id==='carpan-ortak') {
    const left=v.a*v.b,right=v.a*v.c,total=v.a*(v.b+v.c);
    return {kind:id,...v,left,right,total,equation:v.a+'·'+v.b+' + '+v.a+'·'+v.c+' = '+v.a+'·('+v.b+' + '+v.c+') = '+total,observation:'İki alan '+left+' ve '+right+'; toplam '+(left+right)+'. Ortak yükseklik '+v.a+' bir kez alınınca genişlikler toplanır: '+v.a+'·'+(v.b+v.c)+' = '+total+'.'};
  }
  if(id==='carpan-alan') {
    const a=v.b+v.d,I=v.b*v.b,II=v.b*v.d,IV=v.d*v.d;
    return {kind:id,...v,a,I,II,III:II,IV,total:a*a,equation:'a = '+a+', b = '+v.b+': '+a+'² = '+I+' + '+II+' + '+II+' + '+IV,observation:'IV = (a − b)² = '+IV+' = '+(a*a)+' − 2·'+a+'·'+v.b+' + '+I+'. I + IV = a² − 2ab + 2b² = '+(I+IV)+'. II + III + IV = a² − b² = '+(a*a-I)+'.'};
  }
  if(id==='carpan-capraz') {
    const lead=v.m*v.r,middle=v.m*v.s+v.n*v.r,constant=v.n*v.s,swapped=v.m*v.n+v.s*v.r;
    const poly=(b)=>(lead===1?'':show(lead))+'x²'+(b?term(b,'x'):'')+(constant?term(constant,''):'');
    return {kind:id,...v,lead,middle,constant,swapped,equation:'('+lin(v.m,v.n)+')('+lin(v.r,v.s)+') = '+poly(middle),observation:'Baş katsayı '+v.m+'·'+v.r+' = '+lead+', sabit '+show(v.n)+'·'+show(v.s)+' = '+show(constant)+'. Orta: '+v.m+'·'+show(v.s)+' + '+show(v.n)+'·'+v.r+' = '+show(middle)+'. n ile s yer değiştirirse orta '+show(swapped)+' olur: '+poly(swapped)+'.'};
  }
  return null;
}
