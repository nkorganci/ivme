import {show} from './yardim.js';
export const explorations={
  'fk-sayi':{
    lessonId:'fonksiyon-kavrami',title:'Kaç fonksiyon, kaç bire bir fonksiyon?',
    story:'A’dan B’ye bir fonksiyon kurmak, A’nın her elemanı için B’den bir görüntü seçmektir. Seçimler bağımsız olduğu için sayılar çarpılır. Bire bir fonksiyonda her seçim bir öncekilerden farklı olmalıdır.',
    terms:[['Fonksiyon sayısı','$s(B)^{s(A)}$.'],['Bire bir fonksiyon sayısı','$s(B)\\cdot(s(B)-1)\\cdots$; $s(A)$ çarpan.'],['Bağıntı sayısı','$2^{s(A)\\cdot s(B)}$: $A\\times B$’nin bütün alt kümeleri.']],
    experiment:'Eleman sayılarını değiştir. Bire bir fonksiyon ne zaman hiç yazılamıyor? Fonksiyonların bağıntılara oranı nasıl değişiyor?',
    example:'$s(A)=3$, $s(B)=4$: kaç fonksiyon, kaç bire bir fonksiyon?',
    steps:[['Fonksiyon','$4^3=64$.'],['Bire bir','$4\\cdot3\\cdot2=24$.'],['Bağıntı','$2^{12}=4096$.']],
    tip:'Seçimi yapan taraf tanım kümesidir: kuvvetin üssü $s(A)$, tabanı $s(B)$.',
    trap:'$s(A)^{s(B)}$ yazmak; değer kümesinin elemanları seçim yapmaz.',
    transfer:['$s(A)=2$, $s(B)=5$: bire bir fonksiyon sayısı?','20','25','$5\\cdot4=20$; 25 bütün fonksiyonlardır.'],
    expert:'Bire bir fonksiyon sayısı $P(n, m)=\\frac{n!}{(n-m)!}$ permütasyonudur; $m>n$ ise 0. $m=n$ iken bire bir fonksiyonlar aynı zamanda örtendir ve sayıları $n!$’dir.',
  },
  'fk-cesit':{
    lessonId:'fonksiyon-kavrami',title:'Katsayılar fonksiyonun çeşidini belirler',
    story:'$f(x)=ax^2+bx+c$ kuralında katsayıları değiştirince fonksiyonun çeşidi değişir: bazı değerlerde sabit, bazılarında birim, tek ya da çift olur. Grafikteki simetri bu koşulları gösterir.',
    terms:[['Sabit','Her girdiye aynı çıktı: $a=b=0$.'],['Tek','$f(-x)=-f(x)$; orijine göre simetrik.'],['Çift','$f(-x)=f(x)$; y eksenine göre simetrik.']],
    experiment:'Katsayıları değiştir. Hangi katsayı sıfır olunca grafik y eksenine simetrik oluyor? Hem tek hem çift olan bir fonksiyon bulabilir misin?',
    example:'$a=0$, $b=2$, $c=0$: çeşidi?',
    steps:[['Kural','$f(x)=2x$.'],['Simetri','$f(-x)=-2x=-f(x)$: tek.'],['Diğer','Doğrusal, bire bir; birim değil.']],
    tip:'Çift fonksiyonda tek kuvvetlerin, tek fonksiyonda çift kuvvetlerin ve sabit terimin katsayıları sıfırdır.',
    trap:'$x^2+x$ gibi karışık terimli bir fonksiyonu yalnız $x^2$ yüzünden çift sanmak.',
    transfer:['$f(x)=3$ hem tek hem çift olabilir mi?','Hayır, yalnız çift','Evet','$f(-x)=3=f(x)$ çift; $-f(x)=-3\\neq3$ tek değil. Hem tek hem çift yalnız $f(x)=0$.'],
    expert:'Her fonksiyon tek ve çift parçaların toplamı olarak yazılır: $f(x)=\\frac{f(x)+f(-x)}{2}+\\frac{f(x)-f(-x)}{2}$. $ax^2+bx+c$ için çift parça $ax^2+c$, tek parça $bx$.',
  },
  'fk-toplam':{
    lessonId:'fonksiyon-kavrami',title:'Toplam ve farktan iki değer',
    story:'Bir noktada $f+g$ ve $f-g$ değerleri biliniyorsa $f$ ile $g$ tek türlü bulunur. Çarpımları için iki kare farkı kısa bir yol verir.',
    terms:[['Toplam','$s=(f+g)(a)$.'],['Fark','$d=(f-g)(a)$.'],['Çarpım','$(f\\cdot g)(a)=\\frac{s^2-d^2}{4}$.']],
    experiment:'Toplamı ve farkı değiştir. Fark sıfır olunca çarpım neden en büyük? Çarpım ne zaman negatif?',
    example:'$s=10$, $d=4$: $f$, $g$, $f\\cdot g$?',
    steps:[['f','$\\frac{10+4}{2}=7$.'],['g','$\\frac{10-4}{2}=3$.'],['Çarpım','$\\frac{100-16}{4}=21$.']],
    tip:'Toplam ve farkı topla: iki katı f; çıkar: iki katı g. Çarpım için $\\frac{s^2-d^2}{4}$.',
    trap:'Toplam ile farkın çarpımını ($s\\cdot d=f^2-g^2$) $f\\cdot g$ sanmak.',
    transfer:['$s=8$, $d=2$ ise $f\\cdot g$?','15','16','$\\frac{64-4}{4}=15$.'],
    expert:'Toplamı sabit iki sayının çarpımı, sayılar eşitken ($d=0$) en büyüktür: $\\frac{s^2}{4}$. Bu, ikinci dereceden fonksiyonun tepe noktasının bir uygulamasıdır.',
  },
};
const range=(key,label,value,min,max,step=1)=>({key,label,value,min,max,step});
export const controls={
 'fk-sayi':[range('m','s(A)',3,1,5),range('n','s(B)',4,1,6)],
 'fk-cesit':[range('a','a (x²)',0,-3,3),range('b','b (x)',2,-3,3),range('c','c (sabit)',0,-3,3)],
 'fk-toplam':[range('s','(f + g)(a)',10,-10,10),range('d','(f − g)(a)',4,-10,10)],
};
const perm=(n,m)=>{if(m>n)return 0;let r=1;for(let i=0;i<m;i++)r*=n-i;return r;};
/** ax² + bx + c ifadesini okunur yazar: 1 ve −1 katsayıları gizlenir, eksi işareti “−”. */
export function poly(a,b,c){const terms=[[a,'x²'],[b,'x'],[c,'']].filter(([k])=>k!==0);if(!terms.length)return '0';return terms.map(([k,t],i)=>{const abs=Math.abs(k),body=(abs===1&&t?'':abs)+t,sign=k<0?'−':'+';return i===0?(k<0?'−':'')+body:' '+sign+' '+body;}).join('');}
export function kinds(a,b,c){const out=[];if(a===0&&b===0)out.push('sabit');if(a===0&&b===1&&c===0)out.push('birim');if(a===0&&c===0)out.push('tek');if(b===0)out.push('çift');if(a===0&&b!==0)out.push('bire bir (doğrusal)');return out;}
export function model(id,v){
 if(id==='fk-sayi'){const all=v.n**v.m,inj=perm(v.n,v.m),rel=2**(v.m*v.n);return{kind:id,...v,all,inj,rel,equation:v.n+'^'+v.m+' = '+all+' fonksiyon, '+inj+' bire bir',observation:(inj?'Bire bir fonksiyonların bütün fonksiyonlara oranı yüzde '+show(Math.round(1000*inj/all)/10)+'. ':'s(A) > s(B) olduğu için bire bir fonksiyon yok. ')+'Bağıntı sayısı 2^'+v.m*v.n+' = '+show(rel)+'.'};}
 if(id==='fk-cesit'){const f=(x)=>v.a*x*x+v.b*x+v.c,k=kinds(v.a,v.b,v.c),pts=Array.from({length:61},(_,i)=>{const x=-3+i*0.1;return[x,f(x)];});return{kind:id,...v,k,pts,equation:'f(x) = '+poly(v.a,v.b,v.c),observation:'Bu fonksiyon '+(k.length?k.join(', '):'ne sabit ne tek ne çift')+'. f(−1) = '+show(f(-1))+', f(1) = '+show(f(1))+'.'};}
 if(id==='fk-toplam'){const f=(v.s+v.d)/2,g=(v.s-v.d)/2,p=f*g;return{kind:id,...v,f,g,p,equation:'f = '+show(f)+', g = '+show(g)+', f · g = '+show(p),observation:'Kontrol: (s² − d²)/4 = ('+v.s*v.s+' − '+v.d*v.d+')/4 = '+show(p)+(v.d===0?'; fark 0 iken çarpım bu toplam için en büyük.':'.')};}
 return null;
}
