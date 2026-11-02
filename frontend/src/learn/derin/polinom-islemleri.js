import {show} from './yardim.js';
/** Kökleri verilen, baş katsayısı 1 polinomun katsayıları (yüksek dereceden düşüğe). */
export function fromRoots(roots){let c=[1];for(const r of roots){const n=Array(c.length+1).fill(0);c.forEach((a,i)=>{n[i]+=a;n[i+1]-=a*r;});c=n;}return c.map((x)=>x+0);}
export const evalP=(c,x)=>c.reduce((s,a)=>s*x+a,0);
/** Horner: katsayılar c, bölenin kökü a → [bölüm katsayıları, kalan]. */
export function horner(c,a){const out=[c[0]];for(let i=1;i<c.length;i++)out.push(out[i-1]*a+c[i]);return [out.slice(0,-1),out[out.length-1]];}
export function polyText(c){const n=c.length-1;const parts=c.map((a,i)=>[a,n-i]).filter(([a])=>a!==0);if(!parts.length)return '0';return parts.map(([a,d],i)=>{const abs=Math.abs(a),body=(abs===1&&d>0?'':abs)+(d>1?'x'+'⁰¹²³⁴⁵⁶⁷⁸⁹'[d]:d===1?'x':'');return i===0?(a<0?'−':'')+body:(a<0?' − ':' + ')+body;}).join('');}
export function binomCoeffs(p,q,n){let c=[1];for(let k=0;k<n;k++){const m=Array(c.length+1).fill(0);c.forEach((a,i)=>{m[i]+=a*p;m[i+1]+=a*q;});c=m;}return c;}
export const explorations={
  'po-kok':{
    lessonId:'polinom-islemleri',title:'Köklerden polinomu kur',
    story:'Kökleri bilinen, baş katsayısı 1 olan bir polinom çarpanlarının çarpımıdır. Kökleri değiştir; katsayılar, sabit terim ve katsayılar toplamı nasıl değişiyor?',
    terms:[['Kök','$P(a)=0$ yapan sayı.'],['Çarpan','Kök a ise $(x-a)$.'],['Sabit terim','$P(0)$: köklerin çarpımına bağlı.']],
    experiment:'Bir kökü 1 yap: katsayılar toplamı neden 0 oluyor? Bir kökü 0 yap: sabit terim ne oluyor? Kökleri simetrik seç (−2, 2): tek dereceli terimlere ne oluyor?',
    example:'Kökler 1, 2, 3: polinom?',
    steps:[['Çarpanlar','$(x-1)(x-2)(x-3)$.'],['Aç','$x^3-6x^2+11x-6$.'],['Kontrol','$P(1)=0$; sabit terim $-6$.']],
    tip:'Kökü 1 olan polinomun katsayılar toplamı 0, kökü 0 olanın sabit terimi 0’dır.',
    trap:'Çarpanı $(x+a)$ yazmak: kök a ise çarpan $(x-a)$.',
    transfer:['Kökleri −1, 2, 4 olan (baş katsayı 1) polinomun sabit terimi?','8','−8','$P(0)=(1)(-2)(-4)=8$.'],
    expert:'Vieta: üçüncü derecede $x^3-(r_1+r_2+r_3)x^2+(r_1r_2+r_1r_3+r_2r_3)x-r_1r_2r_3$. Katsayılar köklerin simetrik fonksiyonlarıdır.',
  },
  'po-bolme':{
    lessonId:'polinom-islemleri',title:'Horner tablosu ve kalan',
    story:'$P(x)=x^3+bx^2+cx+d$ polinomunu $x-a$ ile bölerken Horner tablosu bölümün katsayılarını ve kalanı adım adım verir. Kalan her zaman $P(a)$’dır.',
    terms:[['Horner','Baş katsayıyı indir; a ile çarp, sonraki katsayıya ekle.'],['Bölüm','İkinci dereceden polinom.'],['Kalan','Son satırdaki sayı: $P(a)$.']],
    experiment:'Katsayıları ve a’yı değiştir. Kalan ne zaman 0 oluyor (a bir kök)? Tablonun son sayısı her durumda P(a) mı?',
    example:'$x^3-2x+5$’i $x-2$ ile böl.',
    steps:[['Katsayılar','1, 0, −2, 5.'],['Horner','1; 2; 2; 9.'],['Sonuç','Bölüm $x^2+2x+2$, kalan 9.']],
    tip:'Eksik dereceli terimlere 0 yazmayı unutma; kalan P(a) ile kontrol edilir.',
    trap:'$x+a$ ile bölerken a’yı pozitif almak: kök $-a$’dır.',
    transfer:['$x^3+x^2-4$’ün $x-1$ ile bölümünden kalan?','−2','−4','$P(1)=1+1-4=-2$.'],
    expert:'Horner, $P(x)=(\\dots((x+b)x+c)x+d)$ iç içe yazımıdır; değer hesabı için de en az çarpmayı kullanır.',
  },
  'po-katsayi':{
    lessonId:'polinom-islemleri',title:'Açmadan katsayı toplamları',
    story:'$(px+q)^n$ açılınca birçok terim çıkar. Katsayılar toplamı, sabit terim, çift ve tek dereceli katsayıların toplamları ise yalnız x = 1, 0, −1 yazılarak bulunur.',
    terms:[['P(1)','Bütün katsayıların toplamı.'],['P(0)','Sabit terim.'],['Çift/tek','$\\frac{P(1)\\pm P(-1)}{2}$.']],
    experiment:'p, q ve n’yi değiştir; açılımdaki katsayıları topla ve P(1) ile karşılaştır. Çift dereceli toplam ne zaman P(1)’e eşit oluyor?',
    example:'$(2x-1)^3$: P(1), P(0), çift dereceliler?',
    steps:[['P(1)','$1$.'],['P(0)','$-1$.'],['Çift','$P(-1)=-27$; $\\frac{1-27}{2}=-13$.']],
    tip:'Açmadan önce sorulanı tanı: toplam ⇒ x = 1, sabit ⇒ x = 0, çift/tek ⇒ x = ±1 ortalaması.',
    trap:'Katsayılar toplamını iç ifadenin katsayılarının toplamı sanmak (kuvveti unutmak).',
    transfer:['$(x+1)^4$’ün çift dereceli katsayıları toplamı?','8','16','$\\frac{16+0}{2}=8$.'],
    expert:'$P(1)+P(-1)$’de tek kuvvetler sadeleşir; bu, f’nin çift parçasının 1’deki değerinin iki katıdır. Aynı fikir binom katsayılarının toplamlarında da kullanılır.',
  },
};
const range=(key,label,value,min,max,step=1)=>({key,label,value,min,max,step});
export const controls={
 'po-kok':[range('r1','1. kök',1,-3,3),range('r2','2. kök',2,-3,3),range('r3','3. kök',3,-3,3)],
 'po-bolme':[range('b','x² katsayısı',0,-3,3),range('c','x katsayısı',-2,-3,3),range('d','sabit',3,-3,3),range('a','Bölen x − a: a',2,-3,3)],
 'po-katsayi':[range('p','p (x katsayısı)',2,1,3),range('q','q (sabit)',-1,-3,3),range('n','Kuvvet n',3,1,4)],
};
export function model(id,v){
 if(id==='po-kok'){const c=fromRoots([v.r1,v.r2,v.r3]),p0=evalP(c,0),p1=evalP(c,1);return{kind:id,...v,c,p0,p1,equation:'P(x) = '+polyText(c),observation:'Sabit terim P(0) = '+show(p0)+', katsayılar toplamı P(1) = '+show(p1)+(p1===0?' (1 bir kök olduğu için sıfır).':'.')};}
 if(id==='po-bolme'){const c=[1,v.b,v.c,v.d],[q,r]=horner(c,v.a);return{kind:id,...v,c,q,r,equation:'Bölüm '+polyText(q)+', kalan '+show(r),observation:'Kontrol: P('+show(v.a)+') = '+show(evalP(c,v.a))+(r===0?'; kalan 0: x − '+show(v.a)+' bir çarpan.':'; kalan bölenin kökündeki değerdir.')};}
 if(id==='po-katsayi'){const c=binomCoeffs(v.p,v.q,v.n),p1=evalP(c,1),p0=evalP(c,0),pm=evalP(c,-1),even=(p1+pm)/2,odd=(p1-pm)/2;return{kind:id,...v,c,p1,p0,pm,even,odd,equation:'P(1) = '+show(p1)+', P(0) = '+show(p0)+', P(−1) = '+show(pm),observation:'Çift dereceliler toplamı '+show(even)+', tek dereceliler toplamı '+show(odd)+'. Açılım: '+polyText(c)+'.'};}
 return null;
}
