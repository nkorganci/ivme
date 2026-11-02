import {show} from './yardim.js';
export const LISTS=[[3,5,5,6,8,8,9,11,12],[2,4,4,7,9,9,9,12,15],[1,2,3,4,5,6,7,8,9]];
export const explorations={
  'me-cikar':{
    lessonId:'merkezi-egilim',title:'Bir veri çıkınca ortalama nereye gider?',
    story:'Bir gruptan bir veri ayrılınca toplam o veri kadar azalır, veri sayısı bir azalır. Yeni ortalama, çıkan verinin eski ortalamadan büyük ya da küçük olmasına göre aşağı ya da yukarı kayar.',
    terms:[['Toplam','Ortalama × veri sayısı.'],['Kalan ortalama','$\\frac{T-x}{n-1}$.'],['Uç değer','Diğerlerinden çok uzak bir veri; ortalamayı güçlü biçimde etkiler.']],
    experiment:'Çıkan veriyi ortalamanın altına, üstüne ve tam üzerine getir. Ortalama ne zaman artıyor, ne zaman azalıyor? Veri sayısını artırınca etki nasıl değişiyor?',
    example:'Ortalaması 40 olan 10 sayıdan 60 çıkarılırsa yeni ortalama?',
    steps:[['Toplam','$10\\cdot40=400$.'],['Yeni toplam','$400-60=340$, 9 veri.'],['Ortalama','$340:9\\approx37{,}8$; düştü.']],
    tip:'Yeni ortalama − eski ortalama $=\\frac{\\bar x-x}{n-1}$: çıkan veri ortalamadan ne kadar uzaksa ve grup ne kadar küçükse etki o kadar büyük.',
    trap:'Ortalamadan büyük veri çıkınca ortalamanın artacağını sanmak.',
    transfer:['Ortalaması 50 olan 6 sayıdan 20 çıkarılırsa kalanların ortalaması?','56','45','$\\frac{300-20}{5}=56$; küçük veri çıktığı için arttı.'],
    expert:'$\\bar x_{\\text{yeni}}=\\bar x+\\frac{\\bar x-x}{n-1}$. İki ayrı çıkarma verilirse $(n-1)(\\bar x_1-\\bar x_2)=x_2-x_1$; TYT-0799 bu bağıntıyla tek satırda çözülür.',
  },
  'me-ortanca':{
    lessonId:'merkezi-egilim',title:'Hangi veri silinirse ortanca değişmez?',
    story:'Sıralı 9 veriden biri silinince 8 veri kalır ve ortanca ortadaki iki verinin ortalaması olur. Ortanca değeri listede tekrar ediyorsa bazı silmeler ortancayı korur.',
    terms:[['Ortanca konumu','$n$ tekse $\\frac{n+1}{2}$. veri; çiftse $\\frac{n}{2}$. ve $\\frac{n}{2}+1$. verinin ortalaması.'],['Kayma','Silinen verinin karşı tarafına doğru ortanca yarım konum kayar.'],['Kopya','Ortanca değeriyle aynı olan diğer veriler.']],
    experiment:'Listeyi ve silinecek konumu değiştir. Hangi konumlar ortancayı koruyor? Tekrarsız listede (1–9) herhangi bir silme ortancayı korur mu?',
    example:'3, 5, 5, 6, 8, 8, 9, 11, 12 listesinden 5 silinirse ortanca?',
    steps:[['Kalan','3, 5, 6, 8, 8, 9, 11, 12.'],['Orta iki','4. ve 5. veri: 8 ve 8.'],['Ortanca','8; değişmedi.']],
    tip:'Ortanca değeri iki kez geçiyorsa silinen veri, ikinci kopyanın karşı tarafından seçilmelidir.',
    trap:'Listede kopyası kalan ortanca değerini silmenin ortancayı her zaman koruduğunu sanmak.',
    transfer:['1’den 9’a kadar sayılardan hangisi silinirse ortanca değişmez?','5','Hiçbiri','5 silinince ortadaki iki sayı 4 ve 6: ortanca yine 5. Küçük bir sayı silinirse 5,5; büyük bir sayı silinirse 4,5 olur.'],
    expert:'Tek $n$’de ortanca $x_m$; bir veri silinince yeni ortanca $\\frac{x_{m-1}+x_m}{2}$ (sağdan silme) ya da $\\frac{x_m+x_{m+1}}{2}$ (soldan silme) olur; ortanca silinirse $\\frac{x_{m-1}+x_{m+1}}{2}$. Korunma için ilgili komşunun $x_m$’ye eşit olması (ya da simetri) gerekir.',
  },
  'me-en-buyuk':{
    lessonId:'merkezi-egilim',title:'Ortalama ve ortanca belli: en büyük veri nerede?',
    story:'Beş farklı pozitif tam sayının ortalaması ve ortancası biliniyor. En büyük sayı tek bir değer değildir; diğer sayıları uç değerlere iterek en çok ve en az değerini buluruz.',
    terms:[['Sıralı yazım','$a<b<c<d<e$; ortanca $c$.'],['Toplam','5 × ortalama.'],['Uç seçim','Bir sayıyı büyütmek için diğerlerini olabildiğince küçük seçmek.']],
    experiment:'Ortalamayı ve ortancayı değiştir. En büyük sayının en çok değeri neden ortalamayla hızla büyüyor? Hangi durumda hiç çözüm kalmıyor?',
    example:'Ortalama 20, ortanca 18: en büyük sayı en çok ve en az kaç?',
    steps:[['En çok','$a=1$, $b=2$, $d=19$: $e=100-40=60$.'],['En az','$a=16$, $b=17$, $d=e-1$: $51+2e-1=100$, $e=25$.'],['Aralık','$25\\le e\\le60$.']],
    tip:'En büyük sayıyı en çok yapmak için diğerlerini en küçüğe, en az yapmak için en büyüğe götür; farklılık ve sıralama koşulunu her adımda kontrol et.',
    trap:'Farklı olma koşulunu unutup $d=c$ ya da $a=b$ almak.',
    transfer:['Ortalama 12, ortanca 10 ise en büyük sayı en çok kaçtır?','36','38','$60-1-2-10-11=36$; 38 için $a=0$ gerekir.'],
    expert:'En çok: $e=5\\bar x-(2c+4)$ (geçerliyse). En az: $3c-3+2e-1\\ge5\\bar x$ olacak en küçük $e\\ge c+2$; tam sayı uymazsa $a$ ya da $b$ bir azaltılarak toplam tutturulur.',
  },
};
const range=(key,label,value,min,max,step=1)=>({key,label,value,min,max,step});
export const controls={
 'me-cikar':[range('n','Veri sayısı',10,3,30),range('m','Ortalama',40,10,80,5),range('x','Çıkan veri',60,0,150,5)],
 'me-ortanca':[{key:'l',label:'Liste',value:0,options:LISTS.map((l,i)=>[i,l.join(', ')])},range('k','Silinen konum',2,1,9)],
 'me-en-buyuk':[range('m','Ortalama',20,4,40),range('c','Ortanca',18,3,40)],
};
export const median=(a)=>{const s=[...a].sort((x,y)=>x-y),n=s.length;return n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2;};
/** Farklı pozitif tam sayılar a<b<c<d<e; toplam 5m, ortanca c. En büyük sayının en küçük ve en büyük değeri (yoksa null). */
export function extremes(m,c){const S=5*m;let lo=null,hi=null;if(c<3)return{lo,hi};for(let e=c+2;e<=S;e++){const minSum=1+2+c+(c+1)+e,maxSum=(c-2)+(c-1)+c+(e-1)+e;if(minSum<=S&&S<=maxSum){if(lo===null)lo=e;hi=e;}}return{lo,hi};}
/** En büyük sayının en az olduğu örnek beşli: a, b, d küçültülerek toplam tutturulur. */
export function minSet(m,c,lo){const set=[c-2,c-1,c,lo-1,lo];let extra=set.reduce((s,x)=>s+x,0)-5*m;const cut=(i,floor)=>{const k=Math.min(extra,set[i]-floor);set[i]-=k;extra-=k;};cut(0,1);cut(1,set[0]+1);cut(3,c+1);return set;}
export function model(id,v){
 if(id==='me-cikar'){const T=v.n*v.m,nm=(T-v.x)/(v.n-1),d=nm-v.m;return{kind:id,...v,T,nm,d,equation:'('+T+' − '+v.x+') : '+(v.n-1)+' = '+show(Math.round(nm*100)/100),observation:d===0?'Çıkan veri ortalamaya eşit: ortalama değişmedi.':(d>0?'Çıkan veri ortalamadan küçük: ortalama ':'Çıkan veri ortalamadan büyük: ortalama ')+show(Math.round(Math.abs(d)*100)/100)+(d>0?' arttı.':' azaldı.')};}
 if(id==='me-ortanca'){const list=LISTS[v.l],rest=list.filter((_,i)=>i!==v.k-1),before=median(list),after=median(rest),keep=list.map((_,i)=>median(list.filter((_,j)=>j!==i))===before);return{kind:id,...v,list,rest,before,after,keep,equation:'Ortanca '+show(before)+' → '+show(after),observation:(after===before?'Ortanca korundu. ':'Ortanca değişti. ')+'Korunan silmeler: '+(list.filter((_,i)=>keep[i]).join(', ')||'yok')+'.'};}
 if(id==='me-en-buyuk'){const {lo,hi}=extremes(v.m,v.c);return{kind:id,...v,lo,hi,maxSet:lo===null?null:[1,2,v.c,v.c+1,hi],minSet:lo===null?null:minSet(v.m,v.c,lo),equation:lo===null?'Çözüm yok':show(lo)+' ≤ en büyük ≤ '+show(hi),observation:lo===null?'Bu ortalama ve ortancayla beş farklı pozitif tam sayı yazılamaz.':'En çok '+hi+': 1, 2, '+v.c+', '+(v.c+1)+', '+hi+'. En az '+lo+'.'};}
 return null;
}
