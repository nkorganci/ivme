import {show} from './yardim.js';
const fact=(n)=>n<=1?1:n*fact(n-1);
/** Kümedeki rakamlar (0'lı ya da 0'sız), basamak sayısı, birler koşulu ve tekrar seçimiyle yazılabilen sayılar (tam tarama). */
export function digitNumbers({n,z,b,p,f}){
 const digits=Array.from({length:n},(_,i)=>z?i:i+1),out=[];
 const walk=(prefix)=>{if(prefix.length===b){const last=prefix[b-1];if(p===1&&last%2===0)return;if(p===2&&last%2===1)return;out.push(prefix);return;}
  for(const d of digits){if(prefix.length===0&&d===0)continue;if(f&&prefix.includes(d))continue;walk([...prefix,d]);}};
 walk([]);return{digits,numbers:out};
}
/** Kutu yöntemi: birler önce, sonra en baştaki basamak, sonra aradakiler. Birler 0 ve birler ≠ 0 durumları ayrı satırdır. */
export function digitBoxes({n,z,b,p,f}){
 const digits=Array.from({length:n},(_,i)=>z?i:i+1),okLast=(d)=>p===0||(p===1?d%2===1:d%2===0);
 const groups=[digits.filter((d)=>d===0&&okLast(d)),digits.filter((d)=>d!==0&&okLast(d))].filter((g)=>g.length);
 const split=f&&z&&groups.length===2;
 const cases=split?groups:[groups.flat()];
 return cases.map((g)=>{const d=g[0],first=digits.filter((x)=>x!==0&&(!f||x!==d)).length,mid=[];
  for(let i=0;i<b-2;i++)mid.push(f?n-2-i:n);
  const boxes=b===1?[g.length]:[first,...mid,g.length];return{label:split?(d===0?'Birler 0':'Birler 0 değil'):'Tüm sayılar',boxes,count:boxes.reduce((a,x)=>a*x,1)};});
}
/** Harflerin bütün sıralanışları; ilk k harfin alfabe sırasında kaldığı sıralanışlar. */
export function orderedPerms(n,k){
 const letters='ABCDEF'.slice(0,n).split(''),all=[];
 const walk=(rest,acc)=>{if(!rest.length){all.push(acc);return;}rest.forEach((x,i)=>walk([...rest.slice(0,i),...rest.slice(i+1)],acc+x));};
 walk(letters,'');
 const good=all.filter((s)=>{const pos=letters.slice(0,k).map((l)=>s.indexOf(l));return pos.every((x,i)=>i===0||pos[i-1]<x);});
 return{letters,all,good};
}
/** Izgarada yalnız sağ (S) ve yukarı (Y) adımlarla yollar; her düğüme gelen yol sayısı solundan ve altından gelenlerin toplamı. */
export function gridPaths(m,n,blocked=null){
 const w=Array.from({length:n+1},()=>Array(m+1).fill(0));
 for(let y=0;y<=n;y++)for(let x=0;x<=m;x++){if(blocked&&blocked[0]===x&&blocked[1]===y){w[y][x]=0;continue;}w[y][x]=x===0&&y===0?1:(x>0?w[y][x-1]:0)+(y>0?w[y-1][x]:0);}
 return w;
}
export const comb=(n,r)=>r<0||r>n?0:fact(n)/(fact(r)*fact(n-r));
export const explorations={
  'sp-kutu':{
    lessonId:'sayma-permutasyon',title:'Rakam kutuları: hangi kutu önce?',
    story:'Rakamlardan sayı yazarken her basamak bir kutudur. Bir kutuya yazılabilecek rakam sayısı, başka kutularda neyin kullanıldığına bağlıysa kutuları doğru sırayla doldurmak gerekir. Kümeyi, basamak sayısını ve koşulu değiştir; kutulardaki sayılar ve bütün sayıları tek tek tarayan sayım nasıl değişiyor?',
    terms:[['Kutu','Bir basamak; içine yazılabilecek rakamların sayısı yazılır.'],['En kısıtlı kutu','Seçeneği koşulla daralan kutu: birler (tek–çift) ya da en baştaki basamak (0 olamaz).'],['Durumlara ayırma','Bir kutunun seçimi başka kutuyu farklı biçimde etkiliyorsa durumları ayrı sayıp toplamak.']],
    experiment:'Önce 0 olmayan kümede tek sayıları say; sonra kümeye 0 ekle. Çift sayılarda ve rakamlar farklıyken kutular neden iki satıra ayrılıyor? Tekrara izin verince ayrım neden kalkıyor?',
    example:'{0, 1, 2, 3, 4} ile rakamları farklı üç basamaklı kaç çift sayı?',
    steps:[['Birler 0','Yüzler 4, onlar 3: 12 sayı.'],['Birler 2 ya da 4','Yüzler 3 (0 ve birlerdeki rakam olamaz), onlar 3: $2\\cdot3\\cdot3=18$.'],['Topla','Durumlar ayrık: $12+18=30$.']],
    tip:'Birler ile en baştaki basamak aynı rakamı (0) etkiliyorsa durumlara ayır; etkilemiyorsa tek satır yeter.',
    trap:'Önce yüzleri doldurup sonra birlere “kalan çiftler” demek: kalan çift sayısı yüzlere ne yazıldığına göre değişir.',
    transfer:['{0, 1, 2, 3, 4, 5} ile rakamları farklı üç basamaklı kaç çift sayı yazılır?','52','60','Birler 0: $5\\cdot4=20$; birler 2 ya da 4: $2\\cdot4\\cdot4=32$; toplam 52.'],
    expert:'Durum sayısı çoğalırsa tümleyen kullan: bütün sayılardan istenmeyenleri çıkar. Çift sayıların sayısı = tüm sayılar − tek sayılar; tek sayılarda birler 0 olamayacağı için durum ayrımı gerekmez.',
  },
  'sp-once':{
    lessonId:'sayma-permutasyon',title:'Önce–sonra koşulu: kaçta biri uygun?',
    story:'Bazı nesnelerin birbirine göre sırası sabitse (A, B’den önce gibi) bütün sıralamalar eşit büyüklükte gruplara ayrılır. Harf sayısını ve sırası sabit harf sayısını değiştir; uygun sıralamalar bütünün kaçta biri?',
    terms:[['Göreli sıra','Yalnız “kim kimden önce” bilgisi; yan yana olmak gerekmez.'],['$k!$','Sırası sabit $k$ harfin kendi aralarındaki bütün sıralanışları.'],['Simetri','Her sıralamada bu $k$ harfin yerleri aynı kalıp yalnız aralarındaki sıra değişirse $k!$ farklı sıralama elde edilir.']],
    experiment:'n = 5, k = 2 al: neden tam yarısı? k = 3 yap: neden altıda biri? k = n olunca kaç sıralama kalıyor?',
    example:'A, B, C, D, E sıralanacak; A, B’den önce ve B, C’den önce. Kaç sıralama?',
    steps:[['Tümü','$5!=120$.'],['Grupla','A, B, C’nin yerleri sabitken bu üç harf $3!=6$ farklı biçimde dizilir; yalnız 1’i A–B–C sırası.'],['Sonuç','$120:6=20$.']],
    tip:'Ayrı nesne gruplarına ait önce–sonra koşulları bağımsızdır; kesirler çarpılır: $n!\\cdot\\frac1{k_1!}\\cdot\\frac1{k_2!}$.',
    trap:'“A, B’den önce” koşulunu “A, B’nin hemen önünde” sanıp blok yapmak: blok yalnız yan yana koşulunda kurulur.',
    transfer:['6 kişi sıraya giriyor; Ali, Can’dan önce ve Ece, Deniz’den önce olacak. Kaç sıralama?','180','360','$720\\cdot\\frac12\\cdot\\frac12=180$.'],
    expert:'Bu sayım, uygun sıralamaların olasılığının $\\frac1{k!}$ olduğunu da söyler: rastgele sıralamada A’nın B’den önce olma olasılığı $\\frac12$’dir.',
  },
  'sp-izgara':{
    lessonId:'sayma-permutasyon',title:'Izgarada yollar: her köşeye kaç yoldan gelinir?',
    story:'Yalnız sağa ve yukarı giden bir yolcu, bir köşeye ya solundaki ya da altındaki köşeden gelir. Bu yüzden her köşedeki yol sayısı, bu iki komşunun sayılarının toplamıdır. Izgaranın boyunu ve C noktasını değiştir; köşelerdeki sayılar ve formül aynı sonucu veriyor mu?',
    terms:[['S ve Y','Sağ ve yukarı birer birimlik adımlar.'],['Tekrarlı permütasyon','$m$ tane S ve $n$ tane Y harfinin dizilişi: $\\frac{(m+n)!}{m!\\,n!}$.'],['Ara nokta','C’den geçen yollar: A’dan C’ye yollar × C’den B’ye yollar.']],
    experiment:'Önce koşulsuz say ve sağ üst köşedeki sayıyı formülle karşılaştır. Sonra “C’den geç” ve “C’den geçme” seçeneklerini dene: iki sayının toplamı neden hep koşulsuz sayıya eşit?',
    example:'4 sağ, 2 yukarı adım; C(2, 1) noktasından geçen yollar?',
    steps:[['A → C','2 S ve 1 Y: $\\frac{3!}{2!\\,1!}=3$.'],['C → B','2 S ve 1 Y: 3.'],['Çarp','$3\\cdot3=9$.']],
    tip:'“Geçmesin” sorularında tümleyen: tüm yollar − C’den geçenler. Köşelere toplayarak yazma yöntemi, eksik çizgili ızgaralarda da çalışır.',
    trap:'Ara noktadan geçen yolları toplamak: iki parça art arda yürünür, sayılar çarpılır.',
    transfer:['3 sağ ve 3 yukarı adımlı ızgarada C(2, 2) noktasından geçmeyen kaç en kısa yol var?','8','12','Tümü $\\frac{6!}{3!\\,3!}=20$; C’den geçen $\\frac{4!}{2!\\,2!}\\cdot2=12$; geçmeyen $20-12=8$.'],
    expert:'Köşelerdeki sayılar Pascal üçgeninin sayılarıdır: $(x, y)$ köşesine $C(x+y, y)$ yol gelir. Pascal eşitliği $C(n, r)=C(n-1, r-1)+C(n-1, r)$, “soldan ya da alttan gel” kuralının kendisidir.',
  },
};
const range=(key,label,value,min,max,step=1)=>({key,label,value,min,max,step});
export const controls={
 'sp-kutu':[range('n','Kümedeki rakam sayısı',5,3,7),{key:'z',label:'0 kümede mi?',value:1,options:[[1,'Evet: {0, 1, …}'],[0,'Hayır: {1, 2, …}']]},range('b','Basamak sayısı',3,2,4),{key:'p',label:'Birler koşulu',value:2,options:[[0,'Koşul yok'],[1,'Tek sayı'],[2,'Çift sayı']]},{key:'f',label:'Rakamlar',value:1,options:[[1,'Farklı olsun'],[0,'Tekrar edebilir']]}],
 'sp-once':[range('n','Harf sayısı n',5,3,6),range('k','Sırası sabit harf sayısı k',2,2,6)],
 'sp-izgara':[range('m','Sağ adım sayısı',4,1,6),range('h','Yukarı adım sayısı',2,1,4),{key:'op',label:'C noktası',value:1,options:[[0,'Koşul yok'],[1,'C’den geçsin'],[2,'C’den geçmesin']]},range('cx','C: sağa',2,0,6),range('cy','C: yukarı',1,0,4)],
};
export function model(id,v){
 if(id==='sp-kutu'){const {digits,numbers}=digitNumbers(v),cases=digitBoxes(v),boxTotal=cases.reduce((s,c)=>s+c.count,0),set='{'+digits.join(', ')+'}';
  const kind=['',' tek',' çift'][v.p],sample=numbers.slice(0,4).map((x)=>x.join('')).join(', ');
  return{kind:id,...v,digits,cases,count:numbers.length,boxTotal,equation:set+' ile '+v.b+' basamaklı'+kind+' sayı: '+show(numbers.length),
   observation:(cases.length>1?'Birler 0 iken en baştaki basamakta '+cases[0].boxes[0]+', birler 0 değilken '+cases[1].boxes[0]+' seçenek kalıyor; bu yüzden iki durum ayrı sayılıp toplandı: '+cases.map((c)=>c.count).join(' + ')+' = '+boxTotal+'.':'Kutular tek satırda çarpılıyor: '+cases[0].boxes.join(' · ')+' = '+boxTotal+'.')+' Tek tek tarama da '+numbers.length+' sayı buldu'+(sample?' (ilkleri: '+sample+').':'.')};}
 if(id==='sp-once'){const k=Math.min(v.k,v.n),{letters,all,good}=orderedPerms(v.n,k);
  return{kind:id,n:v.n,k,letters,total:all.length,count:good.length,sample:good.slice(0,6),equation:show(all.length)+' sıralamanın '+show(good.length)+' tanesinde '+letters.slice(0,k).join(' → ')+' sırası korunuyor',
   observation:k+' harfin kendi arasında '+fact(k)+' sırası var ve her biri eşit sayıda sıralamada görülür; yalnız 1’i uygun. Bu yüzden '+all.length+' : '+fact(k)+' = '+good.length+'.'};}
 if(id==='sp-izgara'){const m=v.m,h=v.h,cx=Math.min(v.cx,m),cy=Math.min(v.cy,h),w=gridPaths(m,h),total=w[h][m],through=comb(cx+cy,cy)*comb(m-cx+h-cy,h-cy),avoid=gridPaths(m,h,[cx,cy])[h][m],count=[total,through,avoid][v.op];
  const label=['Bütün yollar','C’den geçen yollar','C’den geçmeyen yollar'][v.op];
  return{kind:id,m,h,cx,cy,op:v.op,w,blockedW:gridPaths(m,h,[cx,cy]),total,through,avoid,count,equation:label+': '+show(count),
   observation:'Köşelere toplayarak: B’ye '+total+' yol; formül '+(m+h)+'! / ('+m+'! · '+h+'!) = '+comb(m+h,h)+'. C’den geçen '+comb(cx+cy,cy)+' · '+comb(m-cx+h-cy,h-cy)+' = '+through+', geçmeyen '+total+' − '+through+' = '+avoid+'.'};}
 return null;
}
