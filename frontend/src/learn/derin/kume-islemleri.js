export const CONDS=[['a < b',(a,b)=>a<b],['a + b çift',(a,b)=>(a+b)%2===0],['a = b',(a,b)=>a===b],['a · b ≥ 6',(a,b)=>a*b>=6]];
export const explorations={
  'ki-uc':{
    lessonId:'kume-islemleri',title:'Üç kümeli Venn: sekiz bölge',
    story:'Üç küme evreni sekiz bölgeye ayırır. Küme ve kesişim sayıları verildiğinde bölgeler en içten dışa doldurulur; her bölgenin sayısı negatif olamaz. Birleşim, bölgelerin toplamıdır.',
    terms:[['Üçlü kesişim','Üç kümede birden bulunan elemanlar: $A\\cap B\\cap C$.'],['Yalnız ikili','İki kümede olup üçüncüde olmayanlar: $s(A\\cap B)-s(A\\cap B\\cap C)$.'],['Yalnız A','A’da olup diğerlerinde olmayanlar.']],
    experiment:'Sayıları değiştir ve bölgeleri izle. Hangi değerlerde bir bölge negatif çıkıyor (veriler çelişiyor)? Üçlü kesişimi 1 artırınca birleşim nasıl değişiyor?',
    example:'20, 15, 10; ikililer 6, 4, 4; üçlü 2: birleşim?',
    steps:[['İç','Üçlü 2.'],['Yalnız ikililer','4, 2, 2.'],['Birleşim','$20+15+10-6-4-4+2=33$.']],
    tip:'En içten dışa doldur: önce üçlü, sonra yalnız ikililer, en son yalnız tekler. Her bölge sıfır ya da pozitif olmalı.',
    trap:'Üç kümede ikili kesişimleri çıkarıp üçlü kesişimi geri eklemeyi unutmak.',
    transfer:['$s(A)=s(B)=s(C)=10$, ikili kesişimler 4, üçlü 1 ise birleşim?','19','18','$30-12+1=19$.'],
    expert:'Dahil etme–dışlama ilkesi: $|A\\cup B\\cup C|=\\sum|A|-\\sum|A\\cap B|+|A\\cap B\\cap C|$. Her bölgedeki bir eleman formülde tam bir kez sayılır: örneğin üçlü bölge $3-3+1=1$ kez.',
  },
  'ki-sinir':{
    lessonId:'kume-islemleri',title:'Kesişim en az, en çok',
    story:'İki kümenin yalnız eleman sayıları ve evrensel küme biliniyorsa kesişim tek bir sayı değildir. Kümeler birbirine ne kadar itilirse kesişim o kadar büyür; ne kadar ayrılırsa o kadar küçülür.',
    terms:[['Alt sınır','$\\max\\{0,\\ s(A)+s(B)-s(E)\\}$: sığmayan elemanlar ortak.'],['Üst sınır','$\\min\\{s(A),\\ s(B)\\}$: küçük küme büyüğün içinde.'],['Birleşim','$s(A)+s(B)-s(A\\cap B)$.']],
    experiment:'Evrensel kümeyi küçült: alt sınır ne zaman 0’dan büyük oluyor? Kesişim en büyükken birleşim neden en küçük?',
    example:'$s(E)=15$, $s(A)=12$, $s(B)=8$: kesişim aralığı?',
    steps:[['Alt','$12+8-15=5$.'],['Üst','$\\min=8$.'],['Aralık','$5\\le s(A\\cap B)\\le8$.']],
    tip:'Yalnız toplamlar verildiyse kesişim için kesin bilgi bir aralıktır; birleşim de bu aralığın tersine hareket eder.',
    trap:'$s(A)+s(B)-s(E)$ değerini kesin kesişim sanmak.',
    transfer:['$s(E)=30$, $s(A)=22$, $s(B)=17$: kesişim en az?','9','17','$22+17-30=9$; 17 en çok değerdir.'],
    expert:'Kesişimin aralığındaki her tam sayı gerçekleştirilebilir: B’den bir elemanı A’nın dışına (evrende yer varsa) taşımak kesişimi tam 1 azaltır. Bu yüzden “olabilir” sorularında aralıktaki bütün değerler cevaptır.',
  },
  'ki-kartezyen':{
    lessonId:'kume-islemleri',title:'Kartezyen çarpım tablosu ve koşul',
    story:'$A\\times B$’yi satırları A, sütunları B olan bir tablo gibi düşün. Bir koşulu sağlayan sıralı ikilileri saymak, tabloda o koşulu sağlayan hücreleri saymaktır.',
    terms:[['Sıralı ikili','$(a, b)$; sıra önemlidir.'],['Hücre sayısı','$s(A)\\cdot s(B)$.'],['Koşullu sayım','Satır satır, koşulu sağlayan sütunları saymak.']],
    experiment:'Küme büyüklüklerini ve koşulu değiştir. “$a<b$” ile “$a>b$” sayıları ne zaman eşit? “$a+b$ çift” hücreleri neden satranç tahtası gibi diziliyor?',
    example:'$A=\\{1,2,3,4\\}$, $B=\\{1,2,3\\}$: $a<b$ olan kaç ikili?',
    steps:[['Satır 1','2 hücre.'],['Satır 2','1 hücre.'],['Toplam','$2+1+0+0=3$.']],
    tip:'Koşul bir bileşene bağlıysa o bileşenin uygun alt kümesini bul ve çarp; iki bileşeni birlikte bağlıyorsa satır satır say.',
    trap:'$A\\times B$ ile $B\\times A$’yı aynı küme sanmak; koşul $a<b$ ise ikisinde sayılar farklı olabilir.',
    transfer:['$A=\\{1,2,3\\}$, $B=\\{1,2,3\\}$: $a=b$ olan kaç ikili?','3','9','Köşegen: (1,1), (2,2), (3,3).'],
    expert:'$s(\\{(a,b):a<b\\})+s(\\{(a,b):a>b\\})+s(\\{(a,b):a=b\\})=s(A)s(B)$. A=B={1,…,n} ise $a<b$ olanlar $\\binom{n}{2}$’dir; kombinasyon dersinin ilk adımı.',
  },
};
const range=(key,label,value,min,max,step=1)=>({key,label,value,min,max,step});
export const controls={
 'ki-uc':[range('a','s(A)',20,10,30,5),range('b','s(B)',15,10,30,5),range('c','s(C)',10,10,30,5),range('ab','s(A ∩ B)',6,0,10,2),range('ac','s(A ∩ C)',4,0,10,2),range('bc','s(B ∩ C)',4,0,10,2),range('abc','s(A ∩ B ∩ C)',2,0,4)],
 'ki-sinir':[range('e','s(E)',15,10,60),range('a','s(A)',12,1,60),range('b','s(B)',8,1,60)],
 'ki-kartezyen':[range('na','A = {1, …, m}',4,1,6),range('nb','B = {1, …, n}',3,1,6),{key:'c',label:'Koşul',value:0,options:CONDS.map((x,i)=>[i,x[0]])}],
};
export function regions(v){const ab=v.ab-v.abc,ac=v.ac-v.abc,bc=v.bc-v.abc,a=v.a-v.ab-v.ac+v.abc,b=v.b-v.ab-v.bc+v.abc,c=v.c-v.ac-v.bc+v.abc;return{a,b,c,ab,ac,bc,abc:v.abc};}
export function model(id,v){
 if(id==='ki-uc'){const r=regions(v),vals=Object.values(r),valid=vals.every((x)=>x>=0),union=vals.reduce((s,x)=>s+x,0);return{kind:id,...v,r,valid,union,equation:valid?'s(A ∪ B ∪ C) = '+union:'Bir bölge negatif: veriler çelişiyor',observation:valid?'Yalnız A '+r.a+', yalnız B '+r.b+', yalnız C '+r.c+'; yalnız ikililer '+r.ab+', '+r.ac+', '+r.bc+'; üçlü '+r.abc+'.':'Negatif bölge var: '+Object.entries(r).filter(([,x])=>x<0).map(([k,x])=>k+' = '+x).join(', ')+'. Kesişimler kümelerden büyük olamaz.'};}
 if(id==='ki-sinir'){const valid=v.a<=v.e&&v.b<=v.e,lo=Math.max(0,v.a+v.b-v.e),hi=Math.min(v.a,v.b);return{kind:id,...v,valid,lo,hi,ulo:v.a+v.b-hi,uhi:v.a+v.b-lo,equation:valid?lo+' ≤ s(A ∩ B) ≤ '+hi:'Kümeler evrensel kümeden büyük olamaz',observation:valid?'Kesişim en az '+lo+(lo>0?' (iki küme evrene sığmıyor)':' (kümeler ayrık olabilir)')+', en çok '+hi+'. Birleşim '+(v.a+v.b-hi)+' ile '+(v.a+v.b-lo)+' arasında.':'s(A) ve s(B), s(E)’den küçük ya da eşit olmalı; değerleri düzelt.'};}
 if(id==='ki-kartezyen'){const [name,f]=CONDS[v.c],cells=[];for(let a=1;a<=v.na;a++)for(let b=1;b<=v.nb;b++)cells.push({a,b,ok:f(a,b)});const count=cells.filter((x)=>x.ok).length;return{kind:id,...v,name,cells,count,equation:count+' / '+v.na*v.nb+' ikili: '+name,observation:'Tabloda '+v.na+' satır ve '+v.nb+' sütun var; '+name+' koşulunu '+count+' hücre sağlıyor.'};}
 return null;
}
