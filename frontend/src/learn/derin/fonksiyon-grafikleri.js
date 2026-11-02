import {show} from './yardim.js';
export const cubic=(x)=>x*x*x-6*x*x+9*x;
/** Monoton parçada (artan ya da azalan) f(x) = k kökünü ikiye bölmeyle bulur. */
function root(lo,hi,k){let a=lo,b=hi;const up=cubic(b)>cubic(a);if((cubic(a)-k)*(cubic(b)-k)>0)return null;for(let i=0;i<60;i++){const m=(a+b)/2;if((cubic(m)<k)===up)a=m;else b=m;}return (a+b)/2;}
export function solveCubic(k){const out=[];for(const [lo,hi] of [[0,1],[1,3],[3,4]]){const r=root(lo,hi,k);if(r!==null&&!out.some((x)=>Math.abs(x-r)<1e-6))out.push(r);}return out;}
export const explorations={
  'fg-sira':{
    lessonId:'fonksiyon-grafikleri',title:'Dikey doğruyla sıralama',
    story:'Üç doğrusal fonksiyon aynı eksende. Bir x noktasında dikey doğru çizince noktaların yüksekliği değerlerin sırasını verir. Doğrular kesiştiğinde sıralama değişir.',
    terms:[['Dikey doğru','Aynı x için bütün fonksiyon değerlerini gösterir.'],['Kesişim','İki fonksiyonun eşit olduğu nokta.'],['Eğim','Doğrunun dikliği; kesişimden sonra eğimi büyük olan üstte kalır.']],
    experiment:'x’i soldan sağa kaydır. Sıralama hangi noktada değişiyor? h’nin başlangıç değerini değiştirince g ile h’nin kesişimi nereye kayıyor?',
    example:'f = 0,4 + 0,6x, g = x, h = 0,25 + 0,5x: x = 0,2 ve x = 0,8’de sıralama?',
    steps:[['x = 0,2','g = 0,2 < h = 0,35 < f = 0,52.'],['Kesişim','g = h: x = 0,5.'],['x = 0,8','h = 0,65 < g = 0,8 < f = 0,88.']],
    tip:'Kesişim noktalarını bul; aralarındaki her aralıkta sıralama sabittir.',
    trap:'Tek bir noktadaki sıralamayı bütün aralığa genellemek.',
    transfer:['f = 2x + 1 ile g = x + 4 hangi x’ten sonra f büyük olur?','x > 3','x > 1','$2x+1>x+4$, $x>3$.'],
    expert:'İki doğrunun farkı $(m_1-m_2)x+(n_1-n_2)$ de doğrusaldır; tek kökü kesişimdir ve işaretini yalnız orada değiştirir. Bu yüzden iki doğrunun sıralaması en çok bir kez değişir.',
  },
  'fg-yatay':{
    lessonId:'fonksiyon-grafikleri',title:'f(x) = k: yatay doğruyu kaydır',
    story:'$f(x)=x^3-6x^2+9x$ fonksiyonu $[0,4]$ aralığında önce artar, $x=1$’de tepe yapar, $x=3$’te dibe iner, sonra yeniden artar. Yatay doğruyu yukarı aşağı kaydırınca kesişim sayısı değişir.',
    terms:[['Tepe','Yerel en büyük değer: $f(1)=4$.'],['Dip','Yerel en küçük değer: $f(3)=0$.'],['Çözüm sayısı','$y=k$ doğrusunun grafiği kestiği nokta sayısı.']],
    experiment:'k’yi 0’dan 4’e kaydır. Üç çözüm hangi aralıkta? Tepeye ve dibe tam değince ne oluyor? k = 2 için çözümler neden 2’ye göre simetrik?',
    example:'k = 2 için çözümler?',
    steps:[['Çarpanlara ayır','$(x-2)(x^2-4x+1)=0$.'],['Kökler','$2-\\sqrt3$, 2, $2+\\sqrt3$.'],['Sayı','3 çözüm.']],
    tip:'Tepe ile dip arasındaki her k üç çözüm verir; tam tepede ya da dipte çözüm sayısı azalır (değme).',
    trap:'Aralığın uçlarını unutmak: $f(4)=4$ olduğu için $k=4$’te $x=4$ de çözümdür.',
    transfer:['k = 0 için kaç çözüm vardır?','2','3','$x=0$ ve $x=3$ (dipte değme).'],
    expert:'$f(x)-k$ üçüncü dereceden bir polinomdur; üç gerçek kökün olması için k, yerel en küçük ile yerel en büyük arasında olmalıdır. Uçlarda çift kat kök oluşur.',
  },
  'fg-isaret':{
    lessonId:'fonksiyon-grafikleri',title:'İki doğrunun çarpım ve bölüm işareti',
    story:'$f(x)=x-p$ ve $g(x)=x-q$ doğruları kökleriyle sayı doğrusunu aralıklara böler. Her aralıkta iki işaret çarpılınca çarpımın ya da bölümün işareti çıkar.',
    terms:[['Kök','Doğrunun x eksenini kestiği nokta.'],['İşaret tablosu','Aralıklara göre işaretlerin listesi.'],['Tanım dışı','Bölümde paydayı sıfırlayan nokta.']],
    experiment:'Kökleri değiştir. Çarpım hangi aralıkta negatif? Kökler eşit olunca ne oluyor? Bölümde payda kökü neden boş daire?',
    example:'p = 3, q = −1: $(x-3)(x+1)<0$ olan tam sayılar?',
    steps:[['Kökler','−1 ve 3.'],['Ara','Arada işaretler farklı: negatif.'],['Tam sayılar','0, 1, 2.']],
    tip:'İki doğrusal çarpanda çarpım kökler arasında negatif, dışında pozitiftir (katsayılar pozitifken).',
    trap:'Bölümde paydanın kökünü çözüme katmak.',
    transfer:['$\\frac{x+2}{x-4}\\le0$ kaç tam sayı?','6','7','$-2\\le x<4$: $-2,\\dots,3$; 4 hariç.'],
    expert:'$(x-p)(x-q)$ bir paraboldür; kökler arasında x ekseninin altında kalır. Bölüm $\\frac{x-p}{x-q}$ aynı işareti taşır ama $x=q$’da tanımsızdır.',
  },
};
const range=(key,label,value,min,max,step=1)=>({key,label,value,min,max,step});
export const controls={
 'fg-sira':[range('t','x',0.2,0,1,0.05),range('n','h(0)',0.25,0,0.5,0.05)],
 'fg-yatay':[range('k','k',2,-1,5,0.5)],
 'fg-isaret':[range('p','f’nin kökü p',3,-4,4),range('q','g’nin kökü q',-1,-4,4),{key:'op',label:'İşlem',value:0,options:[[0,'f · g'],[1,'f / g']]}],
};
const r2=(x)=>Math.round(x*100)/100;
export function model(id,v){
 if(id==='fg-sira'){const t=r2(v.t),fs=[['f',(x)=>0.4+0.6*x],['g',(x)=>x],['h',(x)=>v.n+0.5*x]],vals=fs.map(([k,f])=>[k,r2(f(t))]),order=[...vals].sort((a,b)=>a[1]-b[1]),cross=r2(2*v.n);return{kind:id,...v,vals,order,cross,equation:order.map(([k,y],i)=>(i?(y===order[i-1][1]?' = ':' < '):'')+k+'('+show(t)+') = '+show(y)).join(''),observation:'g ile h, x = '+show(cross)+(cross<=1?' noktasında kesişiyor; bu noktanın iki yanında g ile h’nin sırası değişir.':' noktasında kesişirdi; [0, 1] içinde kesişmiyorlar.')};}
 if(id==='fg-yatay'){const sols=solveCubic(v.k);return{kind:id,...v,sols,equation:'f(x) = '+show(v.k)+' → '+sols.length+' çözüm',observation:sols.length?'Çözümler: '+sols.map((x)=>show(r2(x))).join(', ')+'. '+(v.k>0&&v.k<4?'k tepe (4) ile dip (0) arasında: üç çözüm.':v.k===0||v.k===4?'Tepeye ya da dibe değiyor: iki çözüm.':'Tepe ile dip arasının dışında: tek çözüm.'):'Bu k için [0, 4] aralığında çözüm yok; grafik bu yüksekliğe ulaşmıyor.'};}
 if(id==='fg-isaret'){const sign=(x)=>v.op===0?(x-v.p)*(x-v.q):(x===v.q?NaN:(x-v.p)/(x-v.q));const ints=Array.from({length:13},(_,i)=>i-6),neg=ints.filter((x)=>sign(x)<0),zero=ints.filter((x)=>sign(x)===0);return{kind:id,...v,neg,zero,equation:(v.op===0?'(x − p)(x − q)':'(x − p)/(x − q)')+' < 0: '+neg.length+' tam sayı',observation:(neg.length?'Negatif olduğu tam sayılar (−6…6): '+neg.join(', ')+'.':'Hiçbir tam sayıda negatif değil; kökler eşitse ifade işaret değiştirmez.')+(v.op===1?' x = '+v.q+' tanım dışı.':'')};}
 return null;
}
