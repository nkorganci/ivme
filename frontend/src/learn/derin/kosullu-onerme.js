const imp=(a,b)=>!a||b;
export const IMP_EXPRS=[
 ["(p⇒q')∧r'",(p,q,r)=>imp(p,!q)&&!r],
 ["(p⇒q)⇒(r⇒q)",(p,q,r)=>imp(imp(p,q),imp(r,q))],
 ["(p∨q)⇒(r⇒p)",(p,q,r)=>imp(p||q,imp(r,p))],
 ["(p∧q)⇒(q⇒r)",(p,q,r)=>imp(p&&q,imp(q,r))],
 ["p⇒(q∧r)'",(p,q,r)=>imp(p,!(q&&r))],
 ["(p⇒q)∧(q⇒r)",(p,q,r)=>imp(p,q)&&imp(q,r)],
];
export const ROWS=[[1,1,1],[1,1,0],[1,0,1],[1,0,0],[0,1,1],[0,1,0],[0,0,1],[0,0,0]].map((r)=>r.map(Boolean));
export const FORMS=[
 ['p ⇒ q (asıl)',(p,q)=>imp(p,q)],
 ['q ⇒ p (karşıt)',(p,q)=>imp(q,p)],
 ["p' ⇒ q' (ters)",(p,q)=>imp(!p,!q)],
 ["q' ⇒ p' (karşıt ters)",(p,q)=>imp(!q,!p)],
 ["p' ∨ q",(p,q)=>!p||q],
];
export const SETS=[['{−3, …, 3} (tam sayılar)',[-3,-2,-1,0,1,2,3]],['{0, …, 6} (doğal sayılar)',[0,1,2,3,4,5,6]],['{1, …, 6} (sayma sayıları)',[1,2,3,4,5,6]]];
export const OPEN=[['x² − 1 ≥ 0',(x)=>x*x-1>=0],['x² < x',(x)=>x*x<x],['x² ≥ x',(x)=>x*x>=x],['x + 3 < 9',(x)=>x+3<9],['2x = x + 4',(x)=>2*x===x+4],['x çift',(x)=>x%2===0]];
export const explorations={
  'ko-ise':{
    lessonId:'kosullu-onerme',title:'İçinde “ise” olan önermeden değerlere',
    story:'Koşullu önerme yalnız “koşul doğru, sonuç yanlış” durumunda yanlıştır. Bu tek istisna, “… önermesi yanlış olduğuna göre” sorularında değerleri hızla kesinleştirir.',
    terms:[['Koşul','$p\\Rightarrow q$ önermesinde $p$.'],['Sonuç','$p\\Rightarrow q$ önermesinde $q$.'],['Tek yanlış satır','$p\\equiv1$, $q\\equiv0$.']],
    experiment:'Önermeyi ve istenen değeri değiştir. “Yanlış” istenince kaç üçlü kalıyor, “doğru” istenince kaç? Hangisi soruyu tek cevaba indiriyor?',
    example:'(p⇒q)⇒(r⇒q) ≡ 0 için uygun üçlü?',
    steps:[['Dış ise','Sol 1, sağ 0.'],['Sağ','$r\\Rightarrow q\\equiv0$: $r\\equiv1$, $q\\equiv0$.'],['Sol','$p\\Rightarrow0\\equiv1$: $p\\equiv0$.']],
    tip:'“İse” önermesi yanlışsa koşul 1, sonuç 0’dır; iç içe “ise”lerde bu kuralı dıştan içe tekrar uygula.',
    trap:'“İse” önermesi doğru diye koşulu da doğru sanmak; koşulu yanlış her “ise” doğrudur.',
    transfer:['(p∧q)⇒(q⇒r) ≡ 0 için (p, q, r)?','(1, 1, 0)','(1, 0, 0)','Sol $p\\wedge q\\equiv1$, sağ $q\\Rightarrow r\\equiv0$: $r\\equiv0$.'],
    expert:'“Yanlış” bilgisi bir “ise” zincirinde her adımda iki değeri sabitler; bu yüzden $\\Rightarrow$ ile kurulan sorular çoğu zaman tek satıra iner. “Doğru” bilgisi ise $2^n-1$ satır bırakabilir; o durumda sorular “hangisi olabilir” biçiminde sorulur.',
  },
  'ko-denk':{
    lessonId:'kosullu-onerme',title:'Karşıt, ters ve karşıt ters',
    story:'Bir koşullu önermenin yönü ya da olumsuzu değişince doğruluk değeri değişebilir. Dört satırda karşılaştırınca hangisinin asılla aynı kaldığı açıkça görünür.',
    terms:[['Karşıt','Koşul ile sonucun yer değiştirmesi: $q\\Rightarrow p$.'],['Ters','İkisinin de değili: $p\'\\Rightarrow q\'$.'],['Karşıt ters','Yer değiştir ve değilini al: $q\'\\Rightarrow p\'$.']],
    experiment:'$p$ ve $q$ değerlerini değiştir. Hangi satırda asıl önerme yanlış? O satırda hangi biçimler yanlış? Karşıt ile ters neden hep birlikte değişiyor?',
    example:'$p\\equiv1$, $q\\equiv0$ satırında dört biçimin değeri?',
    steps:[['Asıl','$1\\Rightarrow0\\equiv0$.'],['Karşıt, ters','$0\\Rightarrow1\\equiv1$, $0\\Rightarrow1\\equiv1$.'],['Karşıt ters','$1\\Rightarrow0\\equiv0$: asılla aynı.']],
    tip:'Asıl önerme ile karşıt tersi denktir; karşıt ile ters birbirine denktir. Bir kuralı denetlerken karşıt tersini kullanmak çoğu zaman kolaydır.',
    trap:'“Islaksa yağmur yağmıştır” gibi karşıtı asıl önermenin aynısı sanmak.',
    transfer:['“Sayı 4’e bölünürse çifttir” önermesinin karşıt tersi?','Çift değilse 4’e bölünmez','4’e bölünmezse çift değildir','Karşıt ters $q\'\\Rightarrow p\'$; diğeri terstir ve yanlıştır (6).'],
    expert:'$p\\Rightarrow q\\equiv p\'\\vee q\\equiv q\'\\Rightarrow p\'$: “veya” değişme özelliğinden karşıt ters denkliği doğrudan çıkar. Karşıt $q\\Rightarrow p\\equiv q\'\\vee p$ ise ters $p\'\\Rightarrow q\'$ ile aynı ifadedir.',
  },
  'ko-nicel':{
    lessonId:'kosullu-onerme',title:'Her ve bazı: karşı örnek ve tanık',
    story:'Açık bir önermenin doğru olduğu elemanları görmek, “her” ve “bazı” önermelerinin değerini hemen verir: “her” için bir karşı örnek, “bazı” için bir tanık yeter.',
    terms:[['Evrensel küme','$x$’in alabileceği değerlerin kümesi.'],['Karşı örnek','“Her” önermesini yanlış yapan eleman.'],['Tanık','“Bazı” önermesini doğru yapan eleman.']],
    experiment:'Kümeyi, açık önermeyi ve niceleyiciyi değiştir. Aynı açık önerme hangi kümede “her” için doğru oluyor? Tanık hiç yoksa ne olur?',
    example:'{−3, …, 3} kümesinde “her x için x² − 1 ≥ 0”?',
    steps:[['Dene','$x=0$: $-1\\ge0$ yanlış.'],['Karşı örnek','0.'],['Sonuç','Önerme yanlış.']],
    tip:'“Her” önermesinde en zor elemanı (sınırı) dene; “bazı” önermesinde kolay bir tanık ara. Küme değişince sonuç değişebilir.',
    trap:'Birkaç elemanda doğru çıkan “her” önermesini doğru sanmak.',
    transfer:['{1, …, 6} kümesinde “her x için x² ≥ x”?','Doğru','Yanlış','Sayma sayılarında $x^2-x=x(x-1)\\ge0$; karşı örnek yok.'],
    expert:'$(\\forall x,\\ p(x))\'\\equiv\\exists x,\\ p\'(x)$: bir “her” önermesini çürütmek, değilinin tanığını bulmaktır. Sonlu kümelerde $\\forall$ çok sayıda “ve”, $\\exists$ çok sayıda “veya” gibidir.',
  },
};
export const controls={
 'ko-ise':[{key:'e',label:'Bileşik önerme',value:1,options:IMP_EXPRS.map((x,i)=>[i,x[0]])},{key:'v',label:'İstenen değer',value:0,options:[[1,'≡ 1'],[0,'≡ 0']]}],
 'ko-denk':[{key:'p',label:'p',value:1,options:[[1,'1'],[0,'0']]},{key:'q',label:'q',value:0,options:[[1,'1'],[0,'0']]}],
 'ko-nicel':[{key:'s',label:'Evrensel küme',value:0,options:SETS.map((x,i)=>[i,x[0]])},{key:'o',label:'Açık önerme',value:0,options:OPEN.map((x,i)=>[i,x[0]])},{key:'k',label:'Niceleyici',value:0,options:[[0,'Her (∀)'],[1,'Bazı (∃)']]}],
};
export function model(id,v){
 if(id==='ko-ise'){const [name,f]=IMP_EXPRS[v.e],fits=ROWS.filter(([p,q,r])=>Boolean(f(p,q,r))===Boolean(v.v)),fixed=['p','q','r'].filter((_,i)=>fits.length&&fits.every((row)=>row[i]===fits[0][i]));return{kind:id,...v,name,fits,fixed,equation:name+' ≡ '+v.v+' · '+fits.length+' uygun üçlü',observation:!fits.length?'Hiçbir üçlü bu değeri vermiyor; önerme bu değeri hiç almaz.':fits.length===1?'Tek uygun üçlü (p, q, r) = ('+fits[0].map((x)=>x?1:0).join(', ')+'): bütün değerler kesin.':fixed.length?'Kesin olan: '+fixed.map((k)=>k+' ≡ '+(fits[0][['p','q','r'].indexOf(k)]?1:0)).join(', ')+'.':'Birden çok üçlü uyuyor ve hiçbir önermenin değeri kesin değil.'};}
 if(id==='ko-denk'){const p=Boolean(v.p),q=Boolean(v.q),vals=FORMS.map(([,f])=>f(p,q)),same=vals.map((x)=>x===vals[0]);return{kind:id,...v,vals,same,equation:'p ≡ '+v.p+', q ≡ '+v.q+' → asıl ≡ '+(vals[0]?1:0),observation:p&&!q?'Asılın yanlış olduğu tek satır: karşıt ters ve p′ ∨ q de yanlış; karşıt ve ters doğru.':(same.every(Boolean)?'Bu satırda beş biçimin hepsi aynı değeri alıyor; fark yalnız (1, 0) ve (0, 1) satırlarında görünür.':'Bu satırda karşıt ve ters ('+FORMS.filter((_,i)=>!same[i]).map((x)=>x[0].split(' (')[0]).join(', ')+') asıldan farklı; karşıt ters yine aynı.')};}
 if(id==='ko-nicel'){const [sname,set]=SETS[v.s],[oname,f]=OPEN[v.o],good=set.filter(f),bad=set.filter((x)=>!f(x)),value=v.k===0?bad.length===0:good.length>0,witness=v.k===0?bad[0]:good[0];return{kind:id,...v,sname,oname,set,good,bad,value,witness,equation:(v.k===0?'∀':'∃')+'x ∈ '+sname.split(' (')[0]+', '+oname+' ≡ '+(value?1:0),observation:v.k===0?(value?'Karşı örnek yok: kümenin bütün elemanları açık önermeyi sağlıyor.':'Karşı örnek x = '+witness+': tek bir eleman sağlamadığı için “her” önermesi yanlış.'):(value?'Tanık x = '+witness+': tek bir eleman sağladığı için “bazı” önermesi doğru.':'Hiçbir eleman sağlamıyor: tanık olmadığı için “bazı” önermesi yanlış.')};}
 return null;
}
