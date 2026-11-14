// Kavram kapıları: durak çıkışındaki bağımsız sorular buraya kopyalanmaz.
const q = (soru, metin, yanlis, neden) => ({ soru, secenekler: [{ metin, dogru: true, neden }, { metin: yanlis, neden }] });
export default {
  'kime-gore': [
    q('Bir cismin konumunu belirtirken neleri seçeriz?', 'Referans noktası, pozitif yön ve birim.', 'Yalnız gidilen yol.', 'Konum seçilen referansa göre yönlü uzaklıktır; yol hareket geçmişidir.'),
    q('Masanın üzerindeki kitap masaya göre dururken Dünya ile birlikte hareketli olabilir mi?', 'Evet; gözlemci değişince hareket tanımı değişebilir.', 'Hayır; duran bir cisim her gözlemciye göre durur.', 'Hareket konumun seçilen gözlemciye göre değişmesidir.'),
    q('Eksi konum işareti bir cismin konumunu belirtirken ne anlatır?', 'Seçilen sıfırın eksi yönünde olduğunu.', 'Mutlaka geri yönde gittiğini.', 'Konumun işareti yerini anlatır; hareket yönünü tek bir konumdan çıkaramayız.'),
  ],
  'yol-yer': [
    q('Aynı başlangıç ve bitiş noktalarını birleştiren iki farklı rotanın hangi büyüklüğü mutlaka aynıdır?', 'Yer değiştirmesi.', 'Alınan yolu.', 'Yer değiştirme uç noktalara bağlıdır; yol rotaya bağlıdır.'),
    q('Bir cismin aldığı yol negatif olabilir mi?', 'Hayır.', 'Eksi yönde gidiyorsa olabilir.', 'Yol uzunlukların toplamıdır; yönü işaretle taşımaz.'),
    q('Yön değiştirmeden tek doğru üzerinde ilerleyen cisimde yol ile yer değiştirme büyüklüğü nasıldır?', 'Eşittir.', 'Yer değiştirme büyüklüğü daima daha büyüktür.', 'Doğrusal ve tek yönlü gidişte rota ile başlangıç–bitiş uzaklığı aynıdır.'),
  ],
  'hiz-surat': [
    q('Beklemek ortalama süratin paydasına girer mi?', 'Evet; toplam geçen süreye girer.', 'Hayır; yalnız hareket süresi kullanılır.', 'Soruda beklemeyi dışlayan bir tanım verilmedikçe toplam yol toplam geçen süreye bölünür.'),
    q('Aynı sürede aynı yönde daha fazla yer değiştiren cismin ortalama hız büyüklüğü nasıldır?', 'Daha büyüktür.', 'Aynıdır; süreleri aynı.', 'Aynı paydada daha büyük yer değiştirme, daha büyük ortalama hız büyüklüğüdür.'),
    q('Ortalama süratin birimi hangi büyüklüğün birimiyle aynıdır?', 'Hızın büyüklüğünün birimiyle.', 'İvmenin birimiyle.', 'İkisi de uzunluğun süreye oranıdır; aynı birim aynı fiziksel tanım demek değildir.'),
  ],
  xt: [
    q('x–t grafiğinde iki farklı zaman noktasını birleştiren doğrunun eğimi neyi verir?', 'O aralıktaki ortalama hızı.', 'Toplam alınan yolu.', 'Konum değişiminin süreye oranı ortalama hızdır.'),
    q('x–t grafiği düz bir doğruysa hızı ne belirler?', 'Doğrunun eğimi.', 'Başlangıç konumunun büyüklüğü.', 'Sabit eğim sabit hızdır; başlangıç konumu yalnız doğrunun yerini değiştirir.'),
    q('x–t grafiğinde eğimin işareti değişirse ne değişir?', 'Hareket yönü.', 'Mutlaka alınan yolun işareti.', 'Hızın işareti eğimin işaretidir; yolun işareti olmaz.'),
  ],
  vt: [
    q('v–t grafiğinde eğim hangi niceliği verir?', 'İvmeyi.', 'Konumu.', 'Hız değişiminin süreye oranı ivmedir.'),
    q('v–t grafiğinin alanından konumu bulmak için hangi ek bilgi gerekir?', 'Başlangıç konumu.', 'Cismin kütlesi.', 'Alan yer değiştirmedir; son konum için başlangıç konumuna eklenir.'),
    q('v–t grafiğinde hız sıfırın altında sabitse cisim nasıl gider?', 'Eksi yönde sabit süratle.', 'Durur.', 'Negatif değer eksi yönlü hızı gösterir; yatay çizgi hızın sabit olduğunu söyler.'),
  ],
  'iki-hareketli': [
    q('Aynı yönde sabit hızlarla giden iki araç aynı süratteyse aralarındaki uzaklık değişir mi?', 'Hayır.', 'Her durumda artar.', 'Aynı yönde aynı hızla konumları eşit miktarda değişir; aradaki fark sabittir.'),
    q('Sabit hızla giden trenin tünelden tamamen çıkışında hangi nokta çıkışa ulaşmalıdır?', 'Trenin en arkası.', 'Yalnız trenin önü.', 'Tamamen çıkma koşulu son noktanın da tüneli terk etmesidir.'),
    q('Öndeki yavaş araca yetişecek hızlı araç için ilk kontrol nedir?', 'Birimler ve hareket yönleri.', 'Hızları yönlerine bakmadan toplamak.', 'Kapanma hızı yönlere göre fark ya da toplamdır; birimler önce eşitlenir.'),
  ],
  ivme: [
    q('İvme hangi değişimi tanımlar?', 'Hız vektörünün zamana göre değişimini.', 'Yalnız konumun değerini.', 'İvme, hızın büyüklüğü veya yönü değiştiğinde ortaya çıkar.'),
    q('Hız ve ivme ters yönlüyken cisim henüz durmamışsa sürati nasıl değişir?', 'Azalır.', 'Daima artar.', 'İvme hızın büyüklüğünü azaltacak yöndedir; duruş sonrasında yön ayrıca incelenir.'),
    q('Sürati sabit bir cismin ivmesi olabilir mi?', 'Evet; hareket yönü değişiyorsa.', 'Hayır; sürat sabitse ivme kesin sıfırdır.', 'Hız vektörünün yönü değişebilir; sürat yalnız büyüklüktür.'),
  ],
  'uc-grafik': [
    q('İvme sıfır olduğunda hız–zaman grafiğinin eğimi nasıldır?', 'Sıfırdır.', 'Hızın büyüklüğüne eşittir.', 'v–t eğimi ivmedir; sıfır eğim sabit hız demektir.'),
    q('Aynı a–t grafiğine sahip iki cismin ilk hızları farklıysa hız farkları zamanla nasıl olur?', 'Sabit kalır.', 'Mutlaka sıfır olur.', 'İkisine aynı hız değişimi eklenir; ilk hız farkı korunur.'),
    q('Hız artı yönde artarken x–t grafiğinin eğimi nasıl değişir?', 'Artar.', 'Sıfıra iner.', 'x–t eğimi hızdır; artan pozitif hız daha büyük pozitif eğimdir.'),
  ],
};
