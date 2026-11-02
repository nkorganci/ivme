export const EXPRS=[
 ["p'∧(q∧r)",(p,q,r)=>!p&&q&&r],
 ["(p'∧r)∧(p∨q)",(p,q,r)=>!p&&r&&(p||q)],
 ["(p∨q)'∧r",(p,q,r)=>!(p||q)&&r],
 ["(p∧q')∨r",(p,q,r)=>(p&&!q)||r],
 ["p∧(q∨r)'",(p,q,r)=>p&&!(q||r)],
 ["(p∧q)'∨r",(p,q,r)=>!(p&&q)||r],
];
export const TABLE_EXPRS=[
 ["p∧(q∨r)",(p,q,r)=>p&&(q||r)],
 ["(p∧q)∨(p∧r)",(p,q,r)=>(p&&q)||(p&&r)],
 ["(p∨q)∧r'",(p,q,r)=>(p||q)&&!r],
 ["(p∧q)∨r",(p,q,r)=>(p&&q)||r],
 ["(p∨q)'",(p,q)=>!(p||q)],
 ["p'∧q'",(p,q)=>!p&&!q],
 ["(p⊻q)∧p",(p,q)=>(p!==q)&&p],
 ["p∧q'",(p,q)=>p&&!q],
];
export const ROWS=[[1,1,1],[1,1,0],[1,0,1],[1,0,0],[0,1,1],[0,1,0],[0,0,1],[0,0,0]].map((r)=>r.map(Boolean));
export const explorations={
  'on-bul':{
    lessonId:'onermeler',title:'Bileşik önermenin değerinden bileşenlere',
    story:'Sorular bir bileşik önermenin doğru ya da yanlış olduğunu söyler ve hangi durumun gerçekleştiğini sorar. Sekiz olası (p, q, r) üçlüsünden hangilerinin uyduğunu görmek, kesin olan ve olası olan bilgiyi ayırır.',
    terms:[['Kesin bağlaç','$\\wedge\\equiv1$ ya da $\\vee\\equiv0$: iki tarafın değerini birden belirler.'],['Uygun üçlü','Bileşik önermeyi istenen değere götüren (p, q, r) değerleri.'],['Kesin bilgi','Bütün uygun üçlülerde ortak olan değer.']],
    experiment:'Önermeyi ve istenen değeri değiştir. Hangi durumlarda tek bir üçlü kalıyor? Birden çok üçlü kalınca hangi önermenin değeri yine de kesin?',
    example:"(p∧q')∨r ≡ 0 için hangi üçlüler uygun?",
    steps:[['Kesin bağlaç','$\\vee\\equiv0$: $r\\equiv0$ ve $p\\wedge q\'\\equiv0$.'],['Kalan seçenek','$(p,q)\\ne(1,0)$: 3 üçlü.'],['Kesin bilgi','Yalnız $r\\equiv0$ kesin.']],
    tip:'Dıştaki bağlaç kesin bilgi veriyorsa oradan başla; vermiyorsa (ör. $\\vee\\equiv1$) önce diğer parçalardan bilinenleri yerleştir.',
    trap:'$\\wedge\\equiv0$ ya da $\\vee\\equiv1$ bilgisinden iki tarafın değerini birden çıkarmaya çalışmak.',
    transfer:["(p∧q)'∨r ≡ 0 ise p, q, r?",'1, 1, 0','0, 0, 0','$\\vee\\equiv0$: $r\\equiv0$ ve $(p\\wedge q)\'\\equiv0$, yani $p\\equiv q\\equiv1$.'],
    expert:'Her bileşik önerme sekiz satırlık bir sütundur; “≡ 1” bilgisi bu sütunun 1 olduğu satırlarla sınırlar. Tek satır kalıyorsa bütün değerler kesin, birden çok satır kalıyorsa yalnız bu satırlarda sabit olan sütunlar kesindir.',
  },
  'on-tablo':{
    lessonId:'onermeler',title:'Doğruluk tablosu ve denklik',
    story:'İki bileşik önermenin denk olup olmadığını anlamanın en kesin yolu tablodur: bütün satırlarda aynı değeri alıyorlarsa denktir. Tek bir farklı satır denkliği bozar.',
    terms:[['Satır','Önermelere verilen bir değer ataması; $n$ önermede $2^n$ satır.'],['Denk','Bütün satırlarda aynı değeri alan iki önerme.'],['Doğru satır sayısı','Bileşik önermenin 1 olduğu satırların sayısı.']],
    experiment:'İki önerme seç ve satırları karşılaştır. Dağılma ve De Morgan çiftlerinde ne görüyorsun? Denk olmayan bir çiftte farkın hangi satırda çıktığını bul.',
    example:"(p∨q)' ile p'∧q' denk mi?",
    steps:[['Satırlar','$(1,1)$, $(1,0)$, $(0,1)$, $(0,0)$.'],['Değerler','İkisi de yalnız $(0,0)$ satırında 1.'],['Sonuç','Bütün satırlar aynı: denk (De Morgan).']],
    tip:'Denklik iddiasını sınamak için önce şüpheli satırları dene; tek bir farklı satır bulursan tabloyu bitirmene gerek yok.',
    trap:'Birkaç satırda eşitlik görüp denk demek; denklik bütün satırlarda eşitliktir.',
    transfer:["(p⊻q)∧p ile p∧q' denk mi?",'Evet','Hayır','İkisi de yalnız $p\\equiv1$, $q\\equiv0$ satırında 1.'],
    expert:'Doğru satır sayısı bir bileşik önermenin “ağırlığıdır”: $\\wedge$ zinciri 1, $\\vee$ zinciri $2^n-1$, $\\veebar$ zinciri $2^{n-1}$ satırda doğrudur. Denk önermelerin ağırlıkları eşittir; tersi her zaman doğru değildir.',
  },
  'on-xor':{
    lessonId:'onermeler',title:'Ya da zinciri: tek mi çift mi?',
    story:'Birden çok önerme “ya da” ile bağlandığında sonuç, doğru olanların tek tek sırasına değil yalnız sayısına bağlıdır: tek sayıda doğru varsa 1, çift sayıda varsa 0.',
    terms:[['Ya da ($\\veebar$)','İki taraf farklıysa 1, aynıysa 0.'],['Eşlik','Bir sayının tek ya da çift olması.'],['Zincir','$p_1\\veebar p_2\\veebar\\dots\\veebar p_n$; parantez yeri önemsiz.']],
    experiment:'Önerme sayısını ve doğru olanların sayısını değiştir. Sonuç hangi sayılarda 1? Tablonun kaç satırında zincir doğru çıkıyor?',
    example:'5 önermeden 3’ü doğruysa zincirin değeri?',
    steps:[['Say','3 doğru.'],['Eşlik','3 tek.'],['Sonuç','$\\equiv1$.']],
    tip:'Her 1 sonucu tersine çevirir, her 0 değiştirmez: 1’leri say, tekse 1, çiftse 0.',
    trap:'“Ya da”yı “veya” gibi okuyup bir tane bile 1 varsa sonucu 1 sanmak.',
    transfer:['6 önermeden 4’ü doğruysa zincir?','0','1','4 çift: sonuç 0.'],
    expert:'Zincir doğru olan satırlar, tek sayıda 1 içeren atamalardır: $\\binom{n}{1}+\\binom{n}{3}+\\dots=2^{n-1}$; satırların tam yarısı.',
  },
};
export const controls={
 'on-bul':[{key:'e',label:'Bileşik önerme',value:3,options:EXPRS.map((x,i)=>[i,x[0]])},{key:'v',label:'İstenen değer',value:0,options:[[1,'≡ 1'],[0,'≡ 0']]}],
 'on-tablo':[{key:'a',label:'1. önerme',value:4,options:TABLE_EXPRS.map((x,i)=>[i,x[0]])},{key:'b',label:'2. önerme',value:5,options:TABLE_EXPRS.map((x,i)=>[i,x[0]])}],
 'on-xor':[{key:'n',label:'Önerme sayısı',value:5,min:2,max:6,step:1},{key:'k',label:'Doğru olanların sayısı',value:3,min:0,max:6,step:1}],
};
const bin=(n,k)=>{let r=1;for(let i=1;i<=k;i++)r=r*(n-k+i)/i;return Math.round(r);};
export function model(id,v){
 if(id==='on-bul'){const [name,f]=EXPRS[v.e],fits=ROWS.filter(([p,q,r])=>Boolean(f(p,q,r))===Boolean(v.v)),fixed=['p','q','r'].filter((_,i)=>fits.length&&fits.every((row)=>row[i]===fits[0][i]));return{kind:id,...v,name,fits,fixed,equation:name+' ≡ '+v.v+' · '+fits.length+' uygun üçlü',observation:!fits.length?'Hiçbir üçlü uymuyor.':fits.length===1?'Tek üçlü: bütün değerler kesin.':fixed.length?'Kesin olan: '+fixed.map((k)=>k+' ≡ '+(fits[0][['p','q','r'].indexOf(k)]?1:0)).join(', ')+'.':'Hiçbir önermenin değeri kesin değil.'};}
 if(id==='on-tablo'){const [na,fa]=TABLE_EXPRS[v.a],[nb,fb]=TABLE_EXPRS[v.b],vals=ROWS.map(([p,q,r])=>[Boolean(fa(p,q,r)),Boolean(fb(p,q,r))]),diff=vals.map(([x,y])=>x!==y),equal=!diff.some(Boolean),ca=vals.filter(([x])=>x).length,cb=vals.filter(([,y])=>y).length;return{kind:id,...v,na,nb,vals,diff,equal,ca,cb,equation:equal?na+' ≡ '+nb:na+' ≢ '+nb,observation:(equal?'Bütün satırlarda aynı: denk. ':'Farklı satır sayısı '+diff.filter(Boolean).length+'. ')+'Doğru satırlar: '+ca+' ve '+cb+' (8 satırda).'};}
 if(id==='on-xor'){const k=Math.min(v.k,v.n),value=k%2,rows=2**(v.n-1);let odd=0;for(let j=1;j<=v.n;j+=2)odd+=bin(v.n,j);return{kind:id,...v,k,value,rows,odd,equation:k+' doğru → '+(k%2?'tek':'çift')+' → ≡ '+value,observation:(v.k>v.n?'Doğru sayısı önerme sayısını aşamaz; '+v.n+' alındı. ':'')+'Zincir '+2**v.n+' satırın '+odd+' tanesinde doğru.'};}
 return null;
}
