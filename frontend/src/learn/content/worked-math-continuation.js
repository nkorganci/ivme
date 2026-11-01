// Kaynak kırpımları görsel olarak okunup çözülmüştür; bağımsız öğretmen onayı değildir.
export const MATH_CONTINUATION_EXAMS = {
  'AYT_Sayisal-0097': {
    conceptId:'ikinci-derece-denklemler', archetype:'tanim-carpan', answer:'A', title:'2018 AYT · kök olan ifadeyi yerine koy, sıfır olmayanı kullan',
    cue:'Kök m−n verilmiş. Bu farkı t diye adlandırıp yerine koymak ifadeyi sadeleştirir. m ve n farklı olduğundan t sıfır değildir.',
    steps:[
      {text:'t=m−n≠0 olsun. Verilen kök x=t yerine yazılınca $t^2+(m+1)t+n-m=0$.',why:'Bir kök denklemi sağlamak zorunda; m≠n bilgisi bölme koşulunu hazırlıyor.'},
      {text:'n−m=−t olduğu için $t^2+(m+1)t-t=t^2+mt=t(t+m)=0$.',why:'Aynı farkı tekrar kullanınca doğrusal terimler birleşir.'},
      {text:'t≠0 olduğundan t+m=0; m−n+m=0 ve n=2m.',why:'Yalnız sıfır olmadığı bilinen t ile sadeleştirdik.'},
      {text:'m≠0 verildiği için n/m=2; A seçeneği.',why:'Oranın tanımı için m’nin sıfır olmaması gerekir.'},
    ], result:'A · 2', tip:'Kök olan harfli ifadeyi önce yerine koy. Aynı fark tekrarlanıyorsa kısa ad ver; sıfır olamama koşulunu kullanmadan çarpanla bölme.',
    check:'m=1,n=2 seçilirse denklem x²+2x+1=0; verilen kök m−n=−1 gerçekten kök. Genel t(t+m)=0 hesabı bütün geçerli m için n=2m verir.',
  },
  'AYT_Sayisal-0099': {
    conceptId:'ikinci-derece-denklemler', archetype:'vieta', answer:'C', title:'2020 AYT · katsayı olan harfler aynı zamanda kök',
    cue:'Denklemin kökleri a,b; katsayılardaki a,b ile aynı harfler. Kökler toplamı ve çarpımını ayrı yaz. İki harfin pozitifliği sadeleştirmeleri ve işaret seçimini belirler.',
    steps:[
      {text:'Kök çarpımı $ab=8b/(2a)=4b/a$. a,b>0.',why:'Kök çarpımı sabit terim / baş katsayıdır; baş katsayı 2a.'},
      {text:'b≠0 olduğu için a=4/a; a²=4. a>0 olduğundan a=2.',why:'Pozitiflik hem bölmeyi hem pozitif karekök seçimini gerekçelendirir.'},
      {text:'Kök toplamı $a+b=5b/(2a)$. a=2 yaz: $2+b=5b/4$.',why:'x katsayısı −5b olduğu için toplamın işareti pozitiftir.'},
      {text:'8+4b=5b; b=8. İstenen a+b=10.',why:'Parametreleri bulduktan sonra sorulan toplamı hesapladık.'},
    ], result:'C · 10', tip:'Harfler hem katsayı hem kökse önce çarpımı dene; pozitif/sıfır olmayan harflerle sadeleşme çoğu kez tek parametreyi hemen belirler.',
    check:'a=2,b=8 için 4x²−40x+64=4(x−2)(x−8); kökler gerçekten 2 ve 8, toplam 10.',
  },
  'AYT_Sayisal-0102': {
    conceptId:'ikinci-derece-denklemler', archetype:'delta', answer:'D', title:'2021 AYT · diskriminantı kök yerine yaz',
    cue:'Δ yalnız kök sayısını belirlemek için verilmemiş; kendisi kök. Önce Δ=4−4c bul, sonra x yerine koy. c değerlerinin çarpımı yeni bir denklemden gelir.',
    steps:[
      {text:'a=1,b=−2; $\\Delta=4-4c$.',why:'Diskriminantın tanımı b²−4ac.'},
      {text:'Kök olduğu için $(4-4c)^2-2(4-4c)+c=0$.',why:'Her kök x’in yerine yazıldığında eşitliği sağlamalı.'},
      {text:'Aç: $16c^2-23c+8=0$.',why:'16−32c+16c²−8+8c+c terimlerini birleştirdik.'},
      {text:'Bu denklemin c köklerinin çarpımı $8/16=1/2$.',why:'Yalnız çarpım istendiğinden kökleri tek tek bulmaya gerek yok.'},
    ], result:'D · 1/2', tip:'Diskriminant kökse Δ’yı x yerine yaz. Parametre için oluşan yeni denklemde toplam/çarpım sorulursa kök-katsayıyı yeniden kullan.',
    check:'Yeni diskriminant 23²−4×16×8=17>0; iki gerçek c=(23±√17)/32 var. İkisi de c<1 olduğundan asıl Δ>0; çarpımları (529−17)/1024=1/2.',
  },
  'TYT-0641': {
    conceptId:'koklu-ifadeler', archetype:'kok-disi', answer:'D', title:'2023 TYT · A√B’nin bütün yazılışları',
    cue:'Kenar A√B ise alan A²B=720. A², 720’nin tam kare bölenidir; olası bütün (A,B) ikililerini yazıp toplamları seçeneklerle karşılaştır.',
    steps:[
      {text:'$(A\sqrt B)^2=A^2B=720=2^4\cdot3^2\cdot5$.',why:'Karenin alanı kenarın karesidir; kök kareyle kaybolur.'},
      {text:'Tam kare bölenler 1, 4, 9, 16, 36, 144; A=1,2,3,4,6,12.',why:'A² içindeki her asalın üssü çift olmalı ve 720’deki üssü aşmamalı.'},
      {text:'(A,B): (1,720), (2,180), (3,80), (4,45), (6,20), (12,5). Toplamlar 721, 182, 83, 49, 26, 17.',why:'B=720/A²; her yazılış aynı kenarı verir.'},
      {text:'Seçeneklerden 26, 49, 83, 182 listede var; 127 yok. D seçeneği.',why:'“Olamaz” sorusunda listede olmayan tek seçenek aranır.'},
    ], result:'D · 127', tip:'A√B biçiminde A²’yi sayının tam kare bölenlerinden seç. Yalnız en sade biçimi (12√5) değil bütün yazılışları listele.',
    check:'4√45: 16·45=720 ✓; 6√20: 36·20=720 ✓. 127 için B=127−A ve A²(127−A)=720 tam sayı çözümü yok.',
    mistake:'Yalnız en sade biçimi alıp A+B=17 bulmak ve diğer yazılışları unutmak.',
  },
  'TYT-0643': {
    conceptId:'koklu-ifadeler', archetype:'kok-disi', answer:'D', title:'2024 TYT · kök bölümü tam sayı olsun',
    cue:'a=√720 rasyonel değil, b de değil; ama a/b tam sayı olabilir. Önce √720’yi sadeleştir; b’nin aynı kök türünü taşıması gerekir.',
    steps:[
      {text:'$\sqrt{720}=\sqrt{144\cdot5}=12\sqrt5$.',why:'En büyük tam kare çarpan 144.'},
      {text:'$\sqrt5$, $\sqrt{20}=2\sqrt5$, $\sqrt{45}=3\sqrt5$, $\sqrt{80}=4\sqrt5$: bölümler 12, 6, 4, 3.',why:'Kök içleri aynı kalınca kökler sadeleşir; 12’yi bölen katsayılar tam sayı verir.'},
      {text:'$\sqrt{60}=2\sqrt{15}$: $\frac{12\sqrt5}{2\sqrt{15}}=\frac{6}{\sqrt3}=2\sqrt3$, tam sayı değil. D seçeneği.',why:'Kök içleri farklı (5 ve 15) kaldığı için bölüm irrasyonel.'},
    ], result:'D · √60', tip:'İki kökün bölümünün tam sayı olması için ikisini de sadeleştir: kök içleri aynı olmalı, katsayı oranı da tam sayı olmalı.',
    check:'720/60=12 tam kare değil; √(720/b²) için b²=60 verirse 720/60=12 ve √12 irrasyonel.',
    mistake:'“İkisi de irrasyonelse bölüm de irrasyoneldir” sanmak; notun söylediği gibi aynı kök türünde bölüm tam sayı olabilir.',
  },
  'TYT-0594': {
    conceptId:'bolme-bolunebilme', archetype:'kural', answer:'B', title:'2022 TYT · AB ile BA’nın rakam toplamı aynıdır',
    cue:'30=2·3·5 ve 2, 3, 5 asal; çarpım her birine bölünmeli. Asal bir sayı çarpımı bölüyorsa çarpanlardan birini böler. AB ile BA aynı rakamlardan oluştuğu için 3 koşulu ikisinde aynıdır.',
    steps:[
      {text:'5 çarpımı böler, o hâlde AB ya da BA 5’e bölünür: son rakamı 0 ya da 5. İkisi de iki basamaklı olduğu için A,B≠0; rakamlardan biri 5.',why:'5 asal; asal bir çarpımı bölüyorsa çarpanlardan birini böler. 0 olsaydı ters sayı iki basamaklı olmazdı.'},
      {text:'3 çarpımı böler; AB ile BA’nın rakam toplamı aynı (A+B), yani ikisi birlikte 3’e bölünür ya da hiçbiri bölünmez. A+B 3’ün katı.',why:'3 kuralı yalnız rakam toplamına bakar; rakamların yeri değişmesi toplamı değiştirmez.'},
      {text:'2 çarpımı böler: sayılardan birinin son rakamı çift, yani A ya da B çift. Diğer rakam 5 olduğundan çift rakam 2, 4, 6 ya da 8.',why:'Çarpım çiftse çarpanlardan biri çifttir.'},
      {text:'5+çift rakam 3’ün katı: 5+4=9 tek seçenek (7, 9, 11, 13 diğerleri). A+B=9; B seçeneği.',why:'Üç koşulu birlikte uyguladık. Örnek: 54·45=2430=30·81.'},
    ], result:'B · 9', tip:'AB ve BA birlikte geçiyorsa 3 ve 9 kuralı ikisinde aynı sonucu verir (rakam toplamı ortak). Asal bölenleri ayrı ayrı dağıt: her asal en az bir çarpana gitmeli.',
    check:'54·45=2430, 2430:30=81. Rakam toplamı 9 olan diğer “5’li” ikili yok.',
    mistake:'30’u AB’nin tek başına bölmesi gerektiğini sanmak; çarpımda 2, 3 ve 5 farklı çarpanlara dağılabilir.',
  },
  'TYT-0599': {
    conceptId:'bolme-bolunebilme', archetype:'kalan-islem', answer:'A', title:'2025 TYT · iki kalan eşit: önce küçük kalanın sınırı',
    cue:'Ortak kalan 5’e göre kalan olduğu için en fazla 4. 5’e göre kalan B’nin 5’e göre kalanıdır; 9’a göre kalan rakam toplamından gelir. B’yi iki gruba ayır.',
    steps:[
      {text:'Ortak kalan $r$ olsun. 5’e göre kalan olduğundan $0\le r\le4$ ve $r$, B’nin 5’e bölümünden kalandır.',why:'Kalan bölenden küçüktür; küçük bölen ortak kalanı sınırlar.'},
      {text:'9’a göre kalan, rakam toplamı $A+3+4+B=A+7+B$’nin 9’a göre kalanıdır.',why:'9 kuralı kalan için de geçerlidir.'},
      {text:'B=0–4 ise $r=B$: $A+7+B\equiv B$ (mod 9), yani $A+7$ 9’un katı; A=2.',why:'B iki taraftan sadeleşti; A tek başına kaldı.'},
      {text:'B=5–9 ise $r=B-5$: $A+7+B\equiv B-5$, yani $A+12$ 9’un katı; A=6. Toplam 2+6=8; A seçeneği.',why:'Kalan tanımı B’nin hangi aralıkta olduğuna göre değiştiği için iki durum zorunlu.'},
    ], result:'A · 8', tip:'İki kalan eşitse önce küçük bölenden kalanın üst sınırını yaz. Son rakama bağlı kuralda (2, 5, 10) son rakamı kalan aralıklarına göre gruplara ayır.',
    check:'2340: 5’e göre 0, 9’a göre 0. 6347: 5’e göre 2, 9’a göre 2 (6+3+4+7=20).',
    mistake:'B’yi yalnız 0–4 arasında düşünüp A=6 durumunu kaçırmak; B=5–9 da aynı kalanları (0–4) verir.',
  },
  'TYT-0605': {
    conceptId:'mutlak-deger', archetype:'esitsizlik', answer:'A', title:'2018 TYT · artış aralığından sıcaklık aralığına',
    cue:'6–10 derece, sıcaklığın kendisi değil artış miktarı. Önce 5 dereceye ekle; sonra yeni aralığın merkezini bul.',
    steps:[
      {text:'Başlangıç 5; artış 6 ile 10 arasında. Yeni sıcaklık $11\\leq x\\leq15$.',why:'Her iki uçtaki artışa başlangıç sıcaklığını ekledik.'},
      {text:'Aralığın merkezi $(11+15)/2=13$, yarıçapı $(15-11)/2=2$.',why:'Mutlak değer merkezden uzaklığı ölçer; tüm genişliği değil yarısını kullanırız.'},
      {text:'$|x-13|\\leq2$; A seçeneği.',why:'11 ve 15 dahil olduğu için eşitliğe izin veren işaret gerekir.'},
    ], result:'A · |x−13| ≤ 2',
    tip:'Sözel artış/azalış sorusunda önce sorulan son niceliğin aralığını kur. Yalnız sonra merkez ve yarıçapa çevir.',
    check:'x=11 ve x=15 için uzaklık 2; x=13 için 0. A açılınca [11,15] gelir.',
  },
  'TYT-0608': {
    conceptId:'mutlak-deger', archetype:'uzaklik-minimum', answer:'B', title:'2019 TYT · uzaklığın iki yönünü de düşün',
    cue:'A pozitif. 0’a uzaklığı A/2 olan iki nokta vardır: A/2 ve −A/2. Hangisinin A’ya 6 uzaklıkta olduğu verilmedi.',
    steps:[
      {text:'İşaretlenen noktalar $A/2$ ve $-A/2$.',why:'Konum iki işaretli olabilir; uzaklık her ikisinde A/2.'},
      {text:'Sağdaki nokta için $|A-A/2|=A/2=6$, dolayısıyla $A=12$.',why:'A pozitif ve A/2, 0 ile A arasındadır.'},
      {text:'Soldaki nokta için $|A-(-A/2)|=3A/2=6$; $A=4$.',why:'Noktalar sıfırın farklı taraflarında; uzaklıkları toplanır.'},
      {text:'Olası A değerlerinin toplamı $12+4=16$.',why:'Soru tek bir A değil tüm olası değerlerin toplamını istiyor.'},
    ], result:'B · 16', tip:'Bir uzaklık bilgisi yönü belirlemiyorsa iki simetrik noktayı yaz. İki noktanın konumu ile A’nın olası değerlerini ayrı tut.',
    check:'A=12 iken işaretli 6 noktası A’ya 6 uzakta. A=4 iken −2 noktası A’ya 6 uzakta. İki A da pozitif.',
  },
  'TYT-0618': {
    conceptId:'mutlak-deger', archetype:'esitsizlik', answer:'D', title:'2022 TYT · iki uygun aralığın dışında kalmak',
    cue:'“İkisi de bozulur” demek iki uygun aralığın da dışında kalmak. Sınırlar kesin eşitsizlikte uygun değildir.',
    steps:[
      {text:'$|S_A+1|<5$ koşulu $-6<S_A<4$ verir.',why:'Merkez −1, yarıçap 5; iki uç açık.'},
      {text:'$|S_B-13|<7$ koşulu $6<S_B<20$ verir.',why:'Merkez 13, yarıçap 7; yine iki uç açık.'},
      {text:'Seçeneklerden −1,0,3 ilk aralıkta; 7 ikinci aralıkta. 5 hiçbirinde değil.',why:'Birinin bozulması yetmez; her iki uygunluk koşulu da yanlış olmalı.'},
    ], result:'D · 5', tip:'İki ürünün de uygun olmaması, uygun aralıkların birleşiminin dışında olmaktır. “En az biri uygun” ile “ikisi de uygun” cümlelerini ayır.',
    check:'5 için |5+1|=6<5 yanlış, |5−13|=8<7 yanlış. İki ürün de uygun koşulu sağlamıyor.',
  },
  'TYT-0630': {
    conceptId:'uslu-ifadeler', archetype:'negatif-sifir', answer:'E', title:'2018 TYT · tekrar eden parçalama',
    cue:'Her adımda yalnız yeni parçalar değil eldeki her parça üçe ayrılıyor. Başlangıçta bir parça var; her tur çarpan 3.',
    steps:[
      {text:'Başlangıç 1; birinci adımda 3 parça.',why:'Her bir parçadan üç yeni parça oluşuyor.'},
      {text:'Dört adımın sayıları 3,9,27,81.',why:'Aynı çarpan her tur eldeki toplam sayıya uygulanır.'},
      {text:'$3^4=81$; E seçeneği.',why:'Üs adım sayısıdır; 3 ile 4’ü çarpmak bu süreci anlatmaz.'},
    ], result:'E · 81', tip:'Her öğenin her adımda k katına çıkması, n adımda başlangıç × kⁿ verir. Her adımda sabit sayıda ekleme varsa bu model kullanılmaz.',
    check:'1×3×3×3×3=81. Sorudaki ikiye ayırma örneği de 1×2×2×2=8.',
  },
  'TYT-0632': {
    conceptId:'uslu-ifadeler', archetype:'kurallar', answer:'B', title:'2019 TYT · her tur aynı oran kalıyor',
    cue:'Her tur elenen beşte bir; kalan oran 4/5. Altı tur aynı çarpanla ilerler, başlangıçtan altı kez beşte bir çıkarılmaz.',
    steps:[
      {text:'Bir tur sonunda önceki sayının $1-1/5=4/5$’i kalır.',why:'Elenen ile kalan tamamlayıcı paylardır.'},
      {text:'Altı tur sonunda $10^6(4/5)^6=(10\\cdot4/5)^6$.',why:'Aynı üsse sahip çarpanları tek kuvvette topladık.'},
      {text:'$8^6=(2^3)^6=2^{18}$.',why:'Kuvvetin kuvvetinde üsler çarpılır.'},
    ], result:'B · 2¹⁸', tip:'Tekrarlanan yüzdelerde kalan oranı çarpan yap. Başlangıcı aynı üsse getirirsen payda çoğu kez hemen sadeleşir.',
    check:'1 000 000 → 800 000 → 640 000 → 512 000 → 409 600 → 327 680 → 262 144 = 2¹⁸.',
  },
  'TYT-0634': {
    conceptId:'uslu-ifadeler', archetype:'kurallar', answer:'C', title:'2020 TYT · müdürü toplamda unutma',
    cue:'Her okulda mesaj alan 35 öğretmen ve bir müdür var. Önce okul başına kişi sayısını bul; sonra il ve okul sayısıyla çarp.',
    steps:[
      {text:'Bir okulda $1+35=36$ kişi mesaj alır.',why:'Yalnız öğretmenleri saymak müdürleri dışarıda bırakır.'},
      {text:'Toplam $81\\cdot16\\cdot36=3^4\\cdot2^4\\cdot(2\\cdot3)^2$.',why:'Her ilde 16 okul; her okulda 36 alıcı.'},
      {text:'$2^6\\cdot3^6=(2\\cdot3)^6=6^6$.',why:'Aynı tabanlı çarpımlarda üsleri topladık, sonra aynı üslü çarpanları birleştirdik.'},
    ], result:'C · 6⁶', tip:'Kuvvetleri dönüştürmeden önce gerçekten neyin sayıldığını belirle. Eksik kurulan toplamı üs kuralları düzeltemez.',
    check:'81×16×36=46 656; 6⁶=46 656. Müdürler 1 296, öğretmenler 45 360.',
  },
  'TYT-0644': {
    conceptId:'uslu-ifadeler', archetype:'kurallar', answer:'B', title:'2025 TYT · kuvvetin kuvveti ile üs kulesini ayır',
    cue:'İki parantezleme aynı mı diye her seçenekte üsteki üssü ve çarpım üssünü ayrı hesapla. Sayısal karşı örnek yeterlidir.',
    steps:[
      {text:'B’de $a=2,b=1,c=3$: $2^{(1^3)}=2^1=2$.',why:'İlk parantezlemede önce üstteki 1³ hesaplanır.'},
      {text:'$(2^1)^3=2^{1\\cdot3}=2^3=8$.',why:'Kuvvetin kuvveti kuralı üsleri çarpar.'},
      {text:'2 ile 8 farklı; B karşı örnektir. Diğer seçeneklerde sonuçlar sırasıyla 1,16,1,9 olarak eşit çıkar.',why:'Soru farklı sonuç veren örneği istiyor; eşit çıkan örnekler geneli kanıtlamaz.'},
    ], result:'B · 2 ve 8', tip:'(aᵇ)ᶜ ifadesinde üsler çarpılır; a^(bᶜ) ifadesinde önce bᶜ bulunur. Parantezin kapsadığı bölgeyi okumadan kural uygulama.',
    check:'A:1=1; B:2≠8; C:16=16; D:1=1; E:9=9. Yalnız B farklı.',
  },
  'TYT-0633': {
    conceptId:'koklu-ifadeler', archetype:'kok-disi', answer:'C', title:'2019 TYT · karekökü alan oranında yorumla',
    cue:'Görselde 16 küçük karenin 9’u boyalı. Sorulan yeni oran, 9/16’nın karekökü; boyanacak kare sayısını bundan sonra hesapla.',
    steps:[
      {text:'Başlangıç oranı $9/16$.',why:'İlk iki sütunda sekiz, son satırda bir ek kare boyalı.'},
      {text:'$\\sqrt{9/16}=3/4=12/16$.',why:'Pay ve payda negatif değil; kareköklerini ayrı aldık, aynı bütüne çevirdik.'},
      {text:'Hedef 12 boyalı kare; eklenen $12-9=3$.',why:'Sorulan hedefteki toplam değil, eklenecek sayı.'},
    ], result:'C · 3', tip:'Görsel bir oranı köke sokmadan önce say. Hedef oranı eski paydada yazmak farkı doğrudan saydırır.',
    check:'(9+3)/16=12/16=3/4 ve (3/4)²=9/16. Üç yeni kare boyamak mümkün.',
  },
  'TYT-0637': {
    conceptId:'koklu-ifadeler', archetype:'eslenik', answer:'B', title:'2021 TYT · yanlış bölüm ile doğru çarpımın farkı',
    cue:'Doğru işlem eşlenikle çarpma, yanlış işlem bölme. İkisini ayrı hesapla; en son yanlış sonuçtan doğruyu çıkar.',
    steps:[
      {text:'Doğru sonuç $(\\sqrt{10}+\\sqrt6)(\\sqrt{10}-\\sqrt6)=10-6=4$.',why:'İki kare farkında çapraz terimler yok olur.'},
      {text:'Yanlış bölümün payını ve paydasını $\\sqrt{10}+\\sqrt6$ ile çarp: $(16+2\\sqrt{60})/4=4+\\sqrt{15}$.',why:'Payda 4 olur; eşlenikle genişletme bölümü değiştirmez.'},
      {text:'Fazlalık $(4+\\sqrt{15})-4=\\sqrt{15}$.',why:'Sorulan yanlış işlemin sonucunun ne kadar fazla olduğu.'},
    ], result:'B · √15', tip:'Yanlış ve doğru işlemi önce ayrı adlandır. Eşlenikle çarpma, bölme işleminde yalnız paydayı değil payı da değiştiren bir genişletmedir.',
    check:'Yaklaşık doğru 4, yanlış 7,873; fark yaklaşık 3,873 = √15. Payda √10−√6 sıfır değil.',
  },
  'TYT-0680': {
    conceptId:'oran-oranti', archetype:'paylastirma', answer:'E', title:'2020 TYT · eşit adet ile eşit oranı ayır',
    cue:'Toplamları 3:4:6 oranında. Mavi adetler eşit olduğu için mavi oranlarının paydaları farklı; 1/2 ve 1/3 oranları hangi kutularda olabilir?',
    steps:[
      {text:'Kalemlikler $3k,4k,6k$; $13k=78$, $k=6$. Adetler 18,24,36.',why:'Oran sayıları gerçek adetler değil ortak katlarıdır.'},
      {text:'Yarı oranı için olası mavi adetler 9,12,18; üçte bir için 6,8,12.',why:'Her iki oran için kutuların adetlerini ayrı böldük.'},
      {text:'İki listenin ortak değeri 12. Yarı oranı 24’lük, üçte bir oranı 36’lık kutuda gerçekleşir.',why:'Mavi adet bütün kutularda aynı olmak zorunda.'},
      {text:'Üç kutuda toplam $3\\cdot12=36$ mavi kalem.',why:'12 bir kutunun mavi adedidir; sorulan toplamdır.'},
    ], result:'E · 36', tip:'Eşit adet bilgisi, farklı oranlarda payı sabit tutar. Önce gerçek toplamları bulup olası ortak payı eşleştir.',
    check:'12≤18; 12/24=1/2 ve 12/36=1/3. Kutular 18+24+36=78; mavi toplam 36.',
  },
  'TYT-0740': {
    conceptId:'oran-oranti', archetype:'dogru-ters', answer:'E', title:'2026 TYT · iki bağımsız orantı sabiti',
    cue:'Isınma alanla, asansör katla orantılı. İki farklı hizmet için iki farklı sabit kullan; toplam aidatı yalnız alanla orantılama.',
    steps:[
      {text:'Aidat = $a\\cdot\\text{alan}+b\\cdot\\text{kat}$; a,b pozitif birim ücretler.',why:'İki bileşenin birimleri ve orantı sabitleri farklı.'},
      {text:'$110a+b=\\frac43(70a+2b)$; $330a+3b=280a+8b$, dolayısıyla $b=10a$.',why:'Kaan’ın aidatı Levent’inkinin 4/3 katı; kesri kaldırıp ortak terimleri topladık.'},
      {text:'Kaan’ın aidatı $120a$; Mert’inki $\\frac34\\cdot120a=90a$.',why:'Aynı 4/3 oranını bu kez ters yönde uyguladık.'},
      {text:'Mert için $xa+3b=90a$; $xa+30a=90a$, $x=60$.',why:'Katı 3; b=10a yerine konur ve a pozitif olduğu için sadeleşir.'},
    ], result:'E · 60', tip:'Toplamı farklı büyüklüklerle orantılı bileşenlerden oluşan soruda her bileşene ayrı sabit yaz. Toplamın kendisi tek orantı değildir.',
    check:'a=1,b=10 seç: aidatlar 120,90,90. 120/90=4/3 ve Mert’in alanı 60 m².',
  },
};
