import {show} from './yardim.js';
export const explorations={
  'yk-taban':{
    lessonId:'yuzde-karisim',title:'Aynı fark, iki farklı yüzde',
    story:'Bir kulüpte geçen ay 80, bu ay 100 kişi vardı. Artış 20 kişi. Geri dönmek için yine 20 kişi ayrılır ama iki değişimin yüzdesi aynı değildir: yüzdeyi hesaplarken hangi ayı bütün seçtiğini değiştiriyorsun.',
    terms:[['Taban','Yüzde karşılaştırmasında bütün kabul edilen miktar.'],['Yüzde değişim','$100\\cdot(son-ilk)/ilk$.'],['Ters değişim','Yeni değerden eskiye dönüş; payda bu kez yeni değerdir.']],
    experiment:'İlk kişi sayısını ve artış yüzdesini değiştir. Geri dönmek için gereken azalma yüzdesi, artış yüzdesine eşit oluyor mu? Mavi çubuk ilk miktarı, yeşil parça artışı gösterir.',
    example:'80 kişi %25 artınca 100 olur. 100’den 80’e dönmek için yüzde kaç azalma gerekir?',
    steps:[['Artışı bul','$80\\cdot0{,}25=20$.'],['Yeni tabanı seç','Geri dönüşte bütün artık 100 kişidir.'],['Azalma yüzdesi','$20/100=0{,}20$: %20.']],
    tip:'“A, B’den yüzde kaç fazla?” için payda B; “B, A’dan yüzde kaç az?” için payda A’dır.',
    trap:'%25 artıştan sonra %25 azaltmak başlangıca döndürmez: $100\\cdot0{,}75=75$.',
    transfer:['120 kişi %50 artınca 180 olur. Başlangıca dönmek için kaç kişi ayrılmalıdır?','60','90','Fark $180-120=60$. Azalma yüzdesi $60/180=1/3$; artışın %50 olmasına rağmen dönüş %33⅓.'],
    expert:'Artış oranı $r$ ise yeni değer $a(1+r)$, dönüşte azalma oranı $r/(1+r)$ olur. Oranları yüzdeye çevirmek için 100 ile çarp. Bu model başlangıç miktarını pozitif alır.',
  },
  'yk-agirlik':{
    lessonId:'yuzde-karisim',title:'Karışım oranı hangi kaba daha yakın?',
    story:'Aynı iki farklı şeker oranını karıştırırken miktarlar değişirse sonuç da değişir. İki bardağın yüzdelerini toplamak yerine, her birindeki gerçek şeker kütlesini ayrı hesaplayıp topluyoruz.',
    terms:[['Derişim','Bu modelde şeker kütlesinin toplam kütleye oranı.'],['Ağırlıklı ortalama','Her oranın miktarıyla ağırlıklandırıldığı ortalama.'],['Korunan madde','Dökülme ve tepkime yoksa karıştırmada toplam şeker kütlesi değişmez.']],
    experiment:'Kapların kütlesini ve şeker yüzdelerini değiştir. Son yüzdede hangi kabın daha etkili olduğunu tahmin et. Eşit kütle seçince aritmetik ortalama ne zaman işe yarıyor?',
    example:'100 g %40 şekerli karışıma 25 g %80 şekerli karışım ekleniyor. Son oran nedir?',
    steps:[['Şekerleri say','İlk kapta 40 g, ikincide $25\\cdot0{,}80=20$ g şeker.'],['Toplamları ayır','60 g şeker, 125 g karışım.'],['Böl','$60/125=0{,}48$: %48.']],
    tip:'İki miktar pozitif ve oranlar farklıysa sonuç kesinlikle iki oranın arasındadır; büyük miktarın oranına daha yakın olur.',
    trap:'%60 ancak iki karışım eşit kütledeyse çıkar. 100 ve 25 g eşit değildir.',
    transfer:['80 g %10’luk ve 20 g %60’lık karışım birleşirse yüzde kaç olur?','20','35','Şeker $8+12=20$ g; toplam 100 g. 35, miktarları yok sayan ortalamadır.'],
    expert:'$z=(m_1p_1+m_2p_2)/(m_1+m_2)$. $p_1<z<p_2$ için $m_1/m_2=(p_2-z)/(z-p_1)$. Bu ters uzaklık ilişkisi madde korunumu denkleminden gelir; yüzdelerin aynı madde ve aynı ölçü tabanına ait olması gerekir.',
  },
  'yk-islem':{
    lessonId:'yuzde-karisim',title:'Dökmek, yerine koymak ve buharlaştırmak farklıdır',
    story:'Homojen karışımdan bir bardak dökünce hem su hem şeker gider. Yalnız su buharlaşınca şeker kalır. Aynı miktar kayıp iki işlemde farklı sonuç verir. 100 g başlangıç karışımında bunu karşılaştır.',
    terms:[['Homojen','Alınan her parçanın oranı ana karışımla aynıdır.'],['Yerine koyma','Dökülen kütle kadar saf su veya şeker ekleyip toplamı 100 g’a tamamlama.'],['Buharlaşma','Bu modelde yalnız su gider; şeker kaybı olmaz.']],
    experiment:'Başlangıç yüzdesini, işlem türünü ve alınacak kütleyi değiştir. Şekerin korunduğu işlem hangisi? Buharlaşmada mevcut sudan fazlasını istediğinde modelin gösterdiği sınırı incele.',
    example:'100 g %40 şekerli karışımın yarısı dökülüp yerine 50 g su konursa oran ne olur?',
    steps:[['Dökülen şeker','$50\\cdot0{,}40=20$ g.'],['Kalan şeker','Başlangıçtaki 40 g’dan 20 g çıkar; 20 g kalır.'],['Suyu ekle','Toplam yeniden 100 g, şeker 20 g: %20.']],
    tip:'Dökülüp eşit miktar saf suyla tamamlanınca oran, karışımda kalan kesirle çarpılır. Yalnız su buharlaşırsa şeker sabit, payda azalır.',
    trap:'50 g su buharlaşsaydı 40 g şeker 50 g karışımda kalır ve oran %80 olurdu; dökmekle aynı değildir.',
    transfer:['100 g %30 karışımın %20’si dökülüp aynı kütlede su konuyor. Son şeker yüzdesi?','24','10','Şekerin %80’i kalır: $30\\cdot0{,}8=24$ g, toplam yeniden 100 g.'],
    expert:'Alınan pay $r$ ise suyla tamamlama $p(1-r)$, saf şekerle tamamlama $p(1-r)+100r$ yüzde verir. Buharlaşmada ise $100p/(100-q)$; q gram yalnız su kaybolur ve q mevcut suyu aşamaz. Model çözünürlüğü değil kütle korunumunu gösterir.',
  },
};
const range=(key,label,value,min,max,step=1)=>({key,label,value,min,max,step});
export const controls={
 'yk-taban':[range('a','İlk kişi sayısı',80,20,200,20),range('p','Artış (%)',25,0,100,5)],
 'yk-agirlik':[range('a','Birinci kütle (g)',100,20,200,5),range('p','Birinci şeker (%)',40,0,100,5),range('b','İkinci kütle (g)',25,5,100,5),range('q','İkinci şeker (%)',80,0,100,5)],
 'yk-islem':[range('p','Başlangıç şekeri (%)',40,10,80,10),range('q','Alınacak kütle (g)',50,0,80,5),{key:'op',label:'İşlem',value:0,options:[[0,'Dök ve suyla tamamla'],[1,'Dök ve şekerle tamamla'],[2,'Yalnız su buharlaştır']]}],
};
export function model(id,v){
 if(id==='yk-taban'){const delta=v.a*v.p/100,total=v.a+delta,back=100*delta/total;return{kind:id,...v,delta,total,back,equation:show(v.a)+' + '+show(delta)+' = '+show(total),observation:'Artış tabanı '+v.a+', dönüş tabanı '+show(total)+'. Geri dönüşte azalma %'+show(back)+'.'};}
 if(id==='yk-agirlik'){const s1=v.a*v.p/100,s2=v.b*v.q/100,total=v.a+v.b,sugar=s1+s2,pct=100*sugar/total;return{kind:id,...v,s1,s2,total,sugar,pct,equation:show(sugar)+' g şeker / '+total+' g karışım = %'+show(pct),observation:v.a===v.b?'Eşit kütleler: oranların aritmetik ortalaması geçerli.':'Kütleler farklı: büyük kabın oranı sonuca daha fazla etki eder. Sonuç %'+Math.min(v.p,v.q)+' ile %'+Math.max(v.p,v.q)+' arasında.'};}
 if(id==='yk-islem'){const actual=v.op===2?Math.min(v.q,100-v.p):v.q,sugar=v.op===2?v.p:v.p*(1-actual/100)+(v.op===1?actual:0),total=v.op===2?100-actual:100,pct=100*sugar/total;return{kind:id,...v,actual,sugar,total,pct,equation:show(sugar)+' g şeker / '+show(total)+' g karışım = %'+show(pct),observation:(v.op===2?'Yalnız su gitti; şeker '+v.p+' g kaldı.':'Dökülen homojen karışımla '+show(v.p*actual/100)+' g şeker de gitti. ')+(actual!==v.q?' İstenen '+v.q+' g yerine mevcut su kadar ('+actual+' g) buharlaştırıldı.':'')};}
 return null;
}
