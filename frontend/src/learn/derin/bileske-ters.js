import {show} from './yardim.js';
export const F={1:3,2:1,3:4,4:2};
export const G={1:2,2:4,3:1,4:3};
export const explorations={
  'bt-zincir':{
    lessonId:'bileske-ters',title:'Bileşke zinciri: önce sağdaki',
    story:'f ve g, {1, 2, 3, 4} kümesinde eşlemelerle verilmiş. Bir sayıyı önce bir fonksiyona, çıkan sonucu öbürüne vermek bileşkedir. Sırayı değiştirince sonuç da değişebilir.',
    terms:[['Ara değer','İçteki fonksiyonun çıktısı; dıştakinin girdisi.'],['f ∘ g','Önce g, sonra f.'],['g ∘ f','Önce f, sonra g.']],
    experiment:'Bir sayı seç ve iki sırayı karşılaştır. Hangi sayılarda $(f\\circ g)(x)=(g\\circ f)(x)$ oluyor?',
    example:'x = 1 için $(f\\circ g)(1)$ ve $(g\\circ f)(1)$?',
    steps:[['f ∘ g','$g(1)=2$, $f(2)=1$.'],['g ∘ f','$f(1)=3$, $g(3)=1$.'],['Sonuç','İkisi de 1; bu x için eşit.']],
    tip:'Ara değeri mutlaka yaz: $x\\to g(x)\\to f(g(x))$.',
    trap:'$(f\\circ g)(x)$ için önce $f(x)$’i bulmak.',
    transfer:['x = 2 için $(f\\circ g)(2)$?','2','1','$g(2)=4$, $f(4)=2$.'],
    expert:'Sonlu kümelerde bileşke, eşleme tablolarının art arda uygulanmasıdır. Bire bir eşlemeler (permütasyonlar) için bileşke genellikle değişmeli değildir; ama bir eşleme tersiyle her zaman değişmelidir.',
  },
  'bt-ters':{
    lessonId:'bileske-ters',title:'Doğrusal fonksiyon ve tersi',
    story:'$f(x)=mx+n$ fonksiyonunun tersi $f^{-1}(x)=\\frac{x-n}{m}$’dir. Grafikleri $y=x$ doğrusuna göre birbirinin aynasıdır: $(a, b)$ f’de ise $(b, a)$ f⁻¹’dedir.',
    terms:[['Ters fonksiyon','f’nin yaptığını geri alan fonksiyon.'],['Ayna doğrusu','$y=x$; f ile f⁻¹ buna göre simetrik.'],['Sabit nokta','$f(x)=x$ çözümü; artan f için iki grafiğin kesiştiği yer.']],
    experiment:'Eğimi ve sabiti değiştir. Eğim 1 olunca ne oluyor? Eğim −1 ve sabit herhangi bir sayı olunca f ile tersi neden aynı?',
    example:'f = 2x + 5 için $f^{-1}(9)$?',
    steps:[['Denklem','$2b+5=9$.'],['Çöz','$b=2$.'],['Kural','$f^{-1}(x)=\\frac{x-5}{2}$, $f^{-1}(9)=2$.']],
    tip:'$f^{-1}(a)$ = “f hangi sayıyı a’ya götürür?” sorusunun cevabı.',
    trap:'$f^{-1}(x)$’i $\\frac{1}{f(x)}$ sanmak.',
    transfer:['f = −x + 3 için $f^{-1}(x)$?','−x + 3','x − 3','$y=-x+3\\Rightarrow x=3-y$: tersi kendisi.'],
    expert:'$m=-1$ iken $f^{-1}=f$’dir (kendi kendinin tersi): grafik $y=x$’e dik bir doğrudur ve aynalanınca kendisine düşer.',
  },
  'bt-ters-bileske':{
    lessonId:'bileske-ters',title:'Çorap–ayakkabı: bileşkenin tersi',
    story:'Önce g (k ile çarp), sonra f (p ekle) uygulanırsa sonuç $kx+p$ olur. Geri almak için önce son işlem (p çıkar), sonra ilk işlem (k’ye böl) geri alınır. Sırayı karıştırınca yanlış sayı çıkar.',
    terms:[['Bileşkenin tersi','$(f\\circ g)^{-1}=g^{-1}\\circ f^{-1}$.'],['Doğru sıra','Önce $f^{-1}$, sonra $g^{-1}$.'],['Yanlış sıra','$f^{-1}\\circ g^{-1}$: önce böl, sonra çıkar.']],
    experiment:'p, k ve hedef sayıyı değiştir. Doğru ve yanlış sıra ne zaman aynı sonucu veriyor?',
    example:'k = 3, p = 5, y = 23: asıl sayı?',
    steps:[['f⁻¹','$23-5=18$.'],['g⁻¹','$18:3=6$.'],['Yanlış sıra','$23:3-5\\approx2{,}67$.']],
    tip:'Son uygulanan fonksiyonun tersini ilk uygula.',
    trap:'$(f\\circ g)^{-1}=f^{-1}\\circ g^{-1}$ yazmak.',
    transfer:['k = 4, p = 2, y = 20 için asıl sayı?','4,5','3','$(20-2):4=4{,}5$.'],
    expert:'İki sıra ancak $p(k-1)=0$ iken aynıdır: p = 0 ya da k = 1. Genelde bileşkenin tersi, tersler ters sırayla bileştirilerek bulunur.',
  },
};
const range=(key,label,value,min,max,step=1)=>({key,label,value,min,max,step});
export const controls={
 'bt-zincir':[range('x','x',1,1,4)],
 'bt-ters':[{key:'m',label:'Eğim m',value:2,options:[[-3,'−3'],[-2,'−2'],[-1,'−1'],[1,'1'],[2,'2'],[3,'3']]},range('n','Sabit n',5,-4,6),range('y','Hedef değer',9,-6,12)],
 'bt-ters-bileske':[range('k','g: k ile çarp',3,1,4),range('p','f: p ekle',5,-5,5),range('y','Şifreli sonuç',23,-10,30)],
};
export function model(id,v){
 if(id==='bt-zincir'){const fg=F[G[v.x]],gf=G[F[v.x]];return{kind:id,...v,gx:G[v.x],fx:F[v.x],fg,gf,equation:'(f ∘ g)('+v.x+') = '+fg+', (g ∘ f)('+v.x+') = '+gf,observation:'Önce g: '+v.x+' → '+G[v.x]+' → '+fg+'. Önce f: '+v.x+' → '+F[v.x]+' → '+gf+(fg===gf?'. Bu x için iki sıra aynı sonucu veriyor.':'. Sıra değişince sonuç değişti.')};}
 if(id==='bt-ters'){const inv=(v.y-v.n)/v.m,fixed=v.m===1?null:v.n/(1-v.m);return{kind:id,...v,inv,fixed,equation:'f⁻¹('+show(v.y)+') = ('+show(v.y)+' − '+show(v.n)+') / '+show(v.m)+' = '+show(Math.round(inv*100)/100),observation:'Kontrol: f('+show(Math.round(inv*100)/100)+') = '+show(v.y)+'. '+(v.m===-1?'Eğim −1: f ile tersi aynı fonksiyon.':v.m===1?(v.n===0?'f(x) = x: birim fonksiyon, tersi kendisi.':'Eğim 1: f ve f⁻¹ paralel, kesişmezler.'):'f ile f⁻¹, y = x üzerinde x = '+show(Math.round(fixed*100)/100)+' noktasında buluşur.')};}
 if(id==='bt-ters-bileske'){const right=(v.y-v.p)/v.k,wrong=v.y/v.k-v.p;return{kind:id,...v,right,wrong,equation:'(f ∘ g)⁻¹('+show(v.y)+') = '+show(Math.round(right*100)/100),observation:'Doğru sıra (önce '+show(v.p)+' çıkar, sonra '+v.k+'’e böl): '+show(Math.round(right*100)/100)+'. Yanlış sıra: '+show(Math.round(wrong*100)/100)+(Math.abs(right-wrong)<1e-9?'; bu değerlerde ikisi aynı (p = 0 ya da k = 1).':'; farklı.')};}
 return null;
}
