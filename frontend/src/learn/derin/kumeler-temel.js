export const WORDS=['ANKARA','MATEMATİK','KALEMLİK','DERYA','SELMA','OKAN','EMRE','DURSUN'];
/** Türkçe harfleri ayrı tutar (I ile İ farklıdır); tekrarları ilk geçtiği sırayla bir kez yazar. */
export const letters=(w)=>[...new Set([...w])];
export const explorations={
  'ku-harf':{
    lessonId:'kumeler-temel',title:'Kelimelerin harf kümeleri',
    story:'Bir kelimenin harflerinden küme kurulunca tekrar eden harfler bir kez yazılır. İki kelimenin harf kümelerinin ortak elemanları, iki kelimede de geçen harflerdir.',
    terms:[['Harf kümesi','Kelimedeki farklı harflerin kümesi.'],['Eleman sayısı','Farklı harflerin sayısı: $s(A)$.'],['Ortak eleman','İki kümede birden bulunan eleman.']],
    experiment:'İki kelime seç. Harf sayısı ile eleman sayısı ne zaman farklı? Ortak harfler hangileri? Türkçede I ile İ’nin farklı eleman olduğuna dikkat et.',
    example:'ANKARA ile OKAN kelimelerinin harf kümelerinin ortak elemanları?',
    steps:[['ANKARA','$\\{A, N, K, R\\}$: 6 harf, 4 eleman.'],['OKAN','$\\{O, K, A, N\\}$.'],['Ortak','$\\{A, N, K\\}$.']],
    tip:'Harf kümesinde önce tekrarları ayıkla; eleman sayısı farklı harflerin sayısıdır.',
    trap:'Harf sayısını eleman sayısı sanmak (ANKARA → 6).',
    transfer:['MATEMATİK kelimesinin harf kümesi kaç elemanlı?','6','9','M, A, T, E, İ, K: tekrarlar düşer.'],
    expert:'Harf kümesi, kelimenin “taşıyıcı kümesi”dir; harflerin sırası ve tekrar sayısı kaybolur. Bu yüzden farklı kelimeler aynı kümeyi verebilir: KALEM ile KELAM’ın harf kümeleri eşittir.',
  },
  'ku-ekle':{
    lessonId:'kumeler-temel',title:'Eleman eklenince alt küme sayısı',
    story:'Kümeye her yeni eleman eklendiğinde eski alt kümelerin hepsi kalır ve her birine yeni eleman eklenerek bir o kadar yeni alt küme oluşur. Alt küme sayısı her eklemede iki katına çıkar.',
    terms:[['Alt küme sayısı','$n$ elemanlı kümede $2^n$.'],['Artış','Yeni sayı − eski sayı $=2^n(2^k-1)$.'],['Kat','Yeni sayı ÷ eski sayı $=2^k$.']],
    experiment:'Eleman sayısını ve eklenen eleman sayısını değiştir. Artış eski sayının kaç katı? Hangi artışlar 3’ün, hangileri 7’nin katı?',
    example:'5 elemanlı kümeye 2 eleman eklenirse alt küme sayısı kaç artar?',
    steps:[['Önce','$2^5=32$.'],['Sonra','$2^7=128$.'],['Artış','$96=3\\cdot32$.']],
    tip:'$k$ eleman eklenince alt küme sayısı $2^k$ katına çıkar; artış eski sayının $2^k-1$ katıdır.',
    trap:'Eleman eklenince alt küme sayısının eklenen eleman kadar arttığını sanmak.',
    transfer:['Bir kümeye 1 eleman eklenince alt küme sayısı 64 artıyor. Eski eleman sayısı?','6','5','Artış eski sayıya eşit: $2^n=64$, $n=6$.'],
    expert:'Artışın $2^n(2^k-1)$ biçimi, bir sayının tek çarpanı ($2^k-1$) ile 2’nin kuvvetine ayrışmasıdır; bu yüzden artıştan hem $n$ hem $k$ tek türlü bulunur.',
  },
  'ku-toplam':{
    lessonId:'kumeler-temel',title:'Her eleman kaç alt kümede?',
    story:'Bir elemanı kenara ayır; kalan elemanlarla kurulan her alt kümeye bu elemanı eklersen onu içeren bütün alt kümeleri bir kez elde edersin. Bu yüzden her eleman alt kümelerin tam yarısında bulunur.',
    terms:[['İçeren alt küme','Belirli bir elemanı bulunduran alt küme.'],['Yarı','$2^n$ alt kümenin $2^{n-1}$ tanesi.'],['Toplamların toplamı','Bütün alt kümelerdeki elemanların toplamı: $2^{n-1}\\cdot\\sum A$.']],
    experiment:'Kümeyi büyüt ve bir eleman seç. O elemanı içeren alt kümeler neden hep yarısı? Bütün alt kümelerin toplamı nasıl büyüyor?',
    example:'$\\{1, 2, 3, 4\\}$ kümesinde 3’ü içeren kaç alt küme var, bütün alt kümelerin toplamı kaç?',
    steps:[['İçeren','$2^3=8$.'],['Toplam','$8\\cdot(1+2+3+4)=80$.'],['Kontrol','16 alt kümenin yarısı 8.']],
    tip:'Belirli bir elemanı içeren alt küme sayısı $2^{n-1}$; içermeyen de aynı sayıdadır.',
    trap:'Bütün alt kümelerin toplamını $2^n\\cdot\\sum A$ sanmak.',
    transfer:['$\\{2, 4, 6\\}$ kümesinin bütün alt kümelerindeki elemanlar toplamı?','48','96','Her eleman 4 alt kümede: $4\\cdot12=48$.'],
    expert:'Alt kümeler ile $n$ basamaklı 0–1 dizileri birebir eşleşir; bir basamağın 1 olduğu diziler tam yarısıdır. Toplam formülü bu simetrinin doğrudan sonucudur.',
  },
};
const range=(key,label,value,min,max,step=1)=>({key,label,value,min,max,step});
export const controls={
 'ku-harf':[{key:'a',label:'1. kelime',value:0,options:WORDS.map((w,i)=>[i,w])},{key:'b',label:'2. kelime',value:5,options:WORDS.map((w,i)=>[i,w])}],
 'ku-ekle':[range('n','Eleman sayısı',5,0,8),range('k','Eklenen eleman',2,1,4)],
 'ku-toplam':[range('n','Küme {1, …, n}',4,1,6),range('e','Seçilen eleman',3,1,6)],
};
export function subsets(n){const out=[];for(let m=0;m<2**n;m++)out.push(Array.from({length:n},(_,i)=>i+1).filter((_,i)=>m>>i&1));return out;}
export function model(id,v){
 if(id==='ku-harf'){const wa=WORDS[v.a],wb=WORDS[v.b],A=letters(wa),B=letters(wb),common=A.filter((x)=>B.includes(x));return{kind:id,...v,wa,wb,A,B,common,equation:'s(A) = '+A.length+', s(B) = '+B.length+', s(A ∩ B) = '+common.length,observation:wa+' '+[...wa].length+' harf ama '+A.length+' eleman; '+wb+' '+[...wb].length+' harf, '+B.length+' eleman. Ortak harfler: '+(common.join(', ')||'yok')+'.'};}
 if(id==='ku-ekle'){const before=2**v.n,after=2**(v.n+v.k),inc=after-before;return{kind:id,...v,before,after,inc,equation:before+' → '+after+' (artış '+inc+')',observation:'Alt küme sayısı '+2**v.k+' katına çıktı; artış eski sayının '+(2**v.k-1)+' katı: '+(2**v.k-1)+' · '+before+' = '+inc+'.'};}
 if(id==='ku-toplam'){const e=Math.min(v.e,v.n),all=subsets(v.n),withE=all.filter((s)=>s.includes(e)),sum=all.reduce((t,s)=>t+s.reduce((a,b)=>a+b,0),0);return{kind:id,...v,e,all,withE,sum,equation:e+' içeren: '+withE.length+' / '+all.length+' · toplam '+sum,observation:(v.e>v.n?'Seçilen eleman kümede yok; '+v.n+' alındı. ':'')+e+' sayısı '+all.length+' alt kümenin '+withE.length+' tanesinde; bütün alt kümelerin toplamı '+withE.length+' · '+(v.n*(v.n+1)/2)+' = '+sum+'.'};}
 return null;
}
