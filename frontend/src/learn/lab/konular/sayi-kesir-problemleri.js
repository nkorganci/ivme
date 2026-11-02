// Sayı ve Kesir Problemleri laboratuvarı: sözel durumu denkleme çevirme (sıra/kuyruk), kalanın kesri ile bütünün kesri,
// “hepsini ucuz say” (adet–tutar), sondan başa ters işlem. `real` görselleri okunup CSV cevaplarıyla karşılaştırıldı.
import { fmt } from '../sayi.js';

export const QUEUE = { front: 7, back: 12 };
export const CHAIN = [['+', 3], ['×', 2], ['−', 5]];
export const runChain = (x) => CHAIN.reduce((v, [op, n]) => (op === '+' ? v + n : op === '×' ? v * n : v - n), x);
export const TICKET = { total: 20, cheap: 15, full: 25, paid: 380 };

export default {
  conceptId: 'sayi-kesir-problemleri',
  title: 'Sayı ve Kesir Problemleri',
  exam: 'TYT + AYT',
  hero: { title: 'Cümleyi denkleme çevir', text: 'Kuyrukta kendini iki kez sayma, kalanın kesrini bütünle karıştırma, hepsini ucuz say, sondan başa çöz.', art: ['7.', '+', '12.'] },
  goals: [
    {
      id: 'denklem-kurma', label: 'Sıra ve sayım', short: 'İki kez sayılanı çıkar',
      objective: 'Sözel sıralama/sayma durumunu bilinmeyenle denkleme çevirir; iki sayımda ortak olanı (kendisi, kesişim) bir kez sayar.',
      misconception: 'Baştan ve sondan sıraları doğrudan toplamak (kişiyi iki kez saymak); aralıktaki kişi sayısını sıra farkı sanmak.',
      story: 'Bir bilet kuyruğunda Ali baştan 7., sondan 12. sırada. Kuyrukta kaç kişi var? Ali’yi kaç kez saydın?',
      predict: {
        question: 'Ali baştan 7., sondan 12. ise kuyrukta kaç kişi vardır?',
        options: ['$18$', '$19$', '$17$'],
        insight: [
          'Doğru: önünde 6, arkasında 11 kişi, kendisi 1: $6+11+1$.',
          '$7+12$ Ali’yi iki kez sayar.',
          '$17$ için Ali’yi hiç saymamak gerekir.',
        ],
      },
      experiment: {
        prompt: 'Kuyruktaki kişi sayısını seç; Ali baştan 7. ve sondan 12. olsun.',
        view: 'queue', visualLabel: 'Kuyruk: Ali turuncu',
        controls: [{ key: 'n', label: 'Kuyruktaki kişi', min: 10, max: 25, step: 1 }],
        initial: { n: 19 },
        compute: ({ n }) => ({ n, fromBack: n - QUEUE.front + 1 }),
        readout: (_, r) => [['Baştan', `${QUEUE.front}.`], ['Sondan', `${r.fromBack}.`]],
        target: { text: 'Hedef: Ali sondan 12. olsun.', test: (_, r) => r.fromBack === QUEUE.back, example: { n: 18 }, hint: 'Ali’nin arkasında kaç kişi olmalı? Önündekiler, kendisi ve arkasındakiler.' },
        diagnose: (_, r) => `${r.n} kişide Ali sondan ${r.fromBack}.; arkasında ${r.n - QUEUE.front} kişi var, 11 olmalı.`,
        success: '$6+1+11=18$: Ali bir kez sayıldı.',
      },
      reasons: [
        {
          question: 'Neden $7+12-1$?',
          options: ['Ali iki sayımda da yer alıyor; bir kez çıkarılmalı.', 'Kuyruğun başı sayılmadığı için.', 'Sıralar her zaman 1 eksik toplanır.'],
          answer: 0,
          feedback: ['', 'Baştaki kişi de bir kişidir; çıkarılan ortak sayılan Ali.', 'Kural ezber değil: ortak sayılan bir kişi olduğu için 1 çıkar.'],
        },
        {
          question: 'Ali 4., Veli 9. sırada. Aralarında kaç kişi var?',
          options: ['$4$', '$5$', '$6$'],
          answer: 0,
          feedback: ['', '$9-4=5$ ikisinden birini de sayar.', 'İkisi de dahil edildi.'],
        },
      ],
      proof: 'Baştan $a$. olan kişinin önünde $a-1$, sondan $b$. olanın arkasında $b-1$ kişi vardır. Toplam $(a-1)+1+(b-1)=a+b-1$. Aradaki kişi: $|a-b|-1$.',
      rule: 'Kişi sayısı $=$ baştan sıra $+$ sondan sıra $-1$; arada kalan $=$ sıra farkı $-1$.',
      condition: 'Tek sıra halinde ve herkes bir kez sayılmalı. İki kümede ortak elemanlar varsa genel ilke: toplam − ortak.',
      trap: 'Ortak sayılanı çıkarmamak; arada kalanları sıra farkıyla karıştırmak.',
      transfer: [
        {
          id: 'dk-yakin', level: 'Yakın alıştırma', text: '20 kişilik bir sırada Ece baştan 8. ise sondan kaçıncıdır?',
          options: ['$13$', '$12$', '$14$'], answer: 0,
          hints: ['Arkasında $20-8$ kişi.', '12 kişi arkada.', 'Kendisi 13.'],
          feedback: ['$20-8+1$.', '12 arkasındakiler; kendisi bir sonraki.', '$20-8+2$: Ece’yi iki kez saydın, bir fazla.'],
        },
        {
          id: 'dk-sira', level: 'Denklem kur', text: 'Bir salonda her sıraya 4 kişi oturunca 3 kişi ayakta kalıyor; 5 kişi oturunca 2 sıra boş kalıyor. Kaç kişi var?',
          options: ['$55$', '$52$', '$65$'], answer: 0,
          hints: ['Sıra sayısı $s$.', '$4s+3=5(s-2)$.', '$s=13$.'],
          feedback: ['$4\\cdot13+3=55=5\\cdot11$.', '52 sandalye sayısı ($4s$).', '$5s=65$: boş sıraları düşmedin.'],
        },
        {
          id: 'dk-kat', level: 'İki bilinmeyen', text: 'İki sayının toplamı 40, büyüğü küçüğün 3 katıdır. Küçük sayı kaçtır?',
          options: ['$10$', '$30$', '$13{,}3$'], answer: 0,
          hints: ['Küçük $x$, büyük $3x$.', '$4x=40$.', '$x=10$.'],
          feedback: ['$10+30=40$.', '30 büyük sayı; soru küçüğü soruyor.', '$40/3$: büyüğün 3 katı olmasını yanlış kurdun.'],
        },
      ],
      real: [
        { code: 'TYT-0737', answer: 'A', from: 'grafik-rutin-olmayan', why: 'Sıra–sütun: $(r-2)(c-1)=(r-1)(c-3)$ ve $rc=120$.' },
        { code: 'TYT-0676', answer: 'C', from: 'yas-isci-problemleri', why: 'Her fotoğrafta 2 ya da 3 kardeş: kardeş-fotoğraf sayımı $2x+3y=3\\cdot83$.' },
        { code: 'TYT-0694', answer: 'C', from: 'grafik-rutin-olmayan', why: 'Budamadan önceki hafta sayısı $k$: $40+2k-25+3(11-k)=40$.' },
        { code: 'TYT-0682', answer: 'D', from: 'grafik-rutin-olmayan', why: 'Klasör–alt klasör–test–soru zincirini çarpımla kur, silineni çıkar.' },
      ],
    },
    {
      id: 'kalanin-kesri', label: 'Kalanın kesri', short: 'Bütünün kesri ≠ kalanın kesri',
      objective: 'Ardışık kesirli işlemlerde her kesrin neyin kesri olduğunu ayırır; bütüne göre kalan oranı çarparak bulur ve bütünü geri hesaplar.',
      misconception: '“Kalanın 1/4’ü”nü bütünün 1/4’ü gibi alıp kesirleri toplamak.',
      story: 'Maaşının üçte birini kiraya, kalanın dörtte birini faturalara ayırdın; geriye 900 TL kaldı. Maaşın kaçtı?',
      predict: {
        question: 'Maaşın $\\tfrac13$’ü kira, kalanın $\\tfrac14$’ü fatura; geriye 900 TL kaldı. Maaş kaç TL?',
        options: ['$1800$', '$2160$', '$1200$'],
        insight: [
          'Doğru: kalan $\\tfrac23\\cdot\\tfrac34=\\tfrac12$.',
          '2160, $\\tfrac13+\\tfrac14$’ü bütünden çıkarmakla bulunur; fatura kalandan.',
          '1200’ün yarısı 600; 900 kalmaz.',
        ],
      },
      experiment: {
        prompt: 'Maaşı seç; iki ödemeden sonra tam 900 TL kalsın.',
        view: 'remain', visualLabel: 'Şerit: kira, fatura, kalan',
        controls: [{ key: 'm', label: 'Maaş (TL)', min: 600, max: 3000, step: 60 }],
        initial: { m: 2160 },
        compute: ({ m }) => { const rent = m / 3, bill = (m - rent) / 4; return { m, rent, bill, left: m - rent - bill }; },
        readout: (_, r) => [['Kira', fmt(r.rent)], ['Fatura', fmt(r.bill)], ['Kalan', fmt(r.left)]],
        target: { text: 'Hedef: kalan 900 TL.', test: (_, r) => r.left === 900, example: { m: 1800 }, hint: 'Kalan maaşın kaçta kaçı? $\\tfrac23\\cdot\\tfrac34$.' },
        diagnose: (_, r) => `Kalan ${fmt(r.left)} TL = maaşın yarısı. 900 için maaş ${r.left < 900 ? 'artmalı' : 'azalmalı'}.`,
        success: 'Kalan maaşın yarısı: $2\\cdot900=1800$.',
      },
      reasons: [
        {
          question: 'Fatura bütünün kaçta kaçıdır?',
          options: ['$\\tfrac23\\cdot\\tfrac14=\\tfrac16$', '$\\tfrac14$', '$\\tfrac1{12}$'],
          answer: 0,
          feedback: ['', '$\\tfrac14$ kalanın kesri; bütüne göre değil.', '$\\tfrac13\\cdot\\tfrac14$: kiranın değil kalanın kesri.'],
        },
        {
          question: 'Geriye kalan bütünün kaçta kaçıdır?',
          options: ['$\\tfrac23\\cdot\\tfrac34=\\tfrac12$', '$1-\\tfrac13-\\tfrac14=\\tfrac5{12}$', '$\\tfrac34$'],
          answer: 0,
          feedback: ['', 'Faturayı bütünden aldın; kalanın kesri.', 'Kiradan sonraki kalanı unuttun.'],
        },
      ],
      proof: 'Kiradan sonra $\\tfrac23m$ kalır; faturadan sonra bunun $\\tfrac34$’ü: $\\tfrac12m=900\\Rightarrow m=1800$. Bütünün kesri toplanır, kalanın kesri çarpılır.',
      rule: '“Kalanın $\\tfrac pq$’si” → kalanı $1-\\tfrac pq$ ile çarp; ardışık kalanları çarp, en sonda bütüne eşitle.',
      condition: 'Her kesrin neyin kesri olduğunu yaz. Sondan başa da çözülebilir: $900\\div\\tfrac34\\div\\tfrac23$.',
      trap: 'Kesirleri bütüne göre toplamak.',
      transfer: [
        {
          id: 'kk-kitap', level: 'Yakın alıştırma', text: 'Bir kitabın $\\tfrac25$’i ilk gün, kalanın $\\tfrac13$’ü ikinci gün okundu; 80 sayfa kaldı. Kitap kaç sayfa?',
          options: ['$200$', '$300$', '$150$'], answer: 0,
          hints: ['Kalan $\\tfrac35\\cdot\\tfrac23$.', '$\\tfrac25$ kaldı.', '$80\\div\\tfrac25$.'],
          feedback: ['$\\tfrac25\\cdot200=80$.', '$\\tfrac25+\\tfrac13$ bütünden çıkarılmış.', '$150\\cdot\\tfrac25=60$.'],
        },
        {
          id: 'kk-top', level: 'Tekrarlı kesir', text: 'Bir top düştüğü yüksekliğin $\\tfrac23$’ü kadar zıplıyor. 3. zıplamada 16 cm yükseliyor. Kaç cm’den bırakıldı?',
          options: ['$54$', '$36$', '$24$'], answer: 0,
          hints: ['Her zıplama $\\tfrac23$ ile çarpılır.', '$h\\left(\\tfrac23\\right)^3=16$.', '$16\\cdot\\tfrac{27}8$.'],
          feedback: ['$54\\to36\\to24\\to16$.', '36, 1. zıplamanın yüksekliği; bırakılma değil.', '24, 2. zıplamanın yüksekliği; iki adım daha geri git.'],
        },
        {
          id: 'kk-depo', level: 'Kesir farkı', text: 'Bir depo $\\tfrac14$’ü dolu. 30 L eklenince $\\tfrac23$’ü dolu oluyor. Depo kaç litre?',
          options: ['$72$', '$45$', '$120$'], answer: 0,
          hints: ['30 L, $\\tfrac23-\\tfrac14$’e karşılık gelir.', '$\\tfrac5{12}$.', '$30\\cdot\\tfrac{12}5$.'],
          feedback: ['$\\tfrac5{12}\\cdot72=30$.', '$30\\div\\tfrac23$: farkı almadın.', '$30\\div\\tfrac14$: farkı değil başlangıç kesrini kullandın.'],
        },
      ],
      real: [
        { code: 'TYT-0712', answer: 'D', from: 'grafik-rutin-olmayan', why: 'Her sergide satılmayan $\\tfrac25$ kalır ve aynı kadar yeni tablo eklenir: sergi $\\tfrac45$ katına iner.' },
        { code: 'TYT-0677', answer: 'C', from: 'hareket-problemleri', why: 'Koşulan mesafe $x$: $x+240=\\tfrac7{12}L$ ve $x+\\tfrac x3=\\tfrac35L$.' },
      ],
    },
    {
      id: 'adet-tutar', label: 'Hepsini ucuz say', short: 'Fark ÷ birim fark',
      objective: 'İki türlü nesnenin toplam adet ve tutarından türlerin sayısını “hepsini bir tür say, farkı dağıt” stratejisiyle ve denklemle bulur.',
      misconception: 'Toplam tutarı ortalama fiyata bölüp kesirli adet bulmak; farkı birim farka değil fiyata bölmek.',
      story: 'Bir tiyatroya 20 bilet satıldı: öğrenci 15 TL, tam 25 TL. Kasada 380 TL var. Kaç tam bilet satıldı?',
      predict: {
        question: '20 bilet, öğrenci 15 TL, tam 25 TL; toplam 380 TL. Kaç tam bilet?',
        options: ['$8$', '$12$', '$15{,}2$'],
        insight: [
          'Doğru: hepsi öğrenci 300 TL; fark 80, her tam bilet 10 TL fazla.',
          '12 öğrenci bileti sayısı.',
          '$380\\div25$ kesirli çıkar; bilet tam sayıdır.',
        ],
      },
      experiment: {
        prompt: 'Tam bilet sayısını seç; toplam 380 TL olsun.',
        view: 'tickets', visualLabel: 'Biletler: koyu tam, açık öğrenci',
        controls: [{ key: 't', label: 'Tam bilet', min: 0, max: 20, step: 1 }],
        initial: { t: 12 },
        compute: ({ t }) => ({ t, s: TICKET.total - t, sum: t * TICKET.full + (TICKET.total - t) * TICKET.cheap }),
        readout: (_, r) => [['Öğrenci', r.s], ['Tutar', `${r.sum} TL`], ['Hepsi öğrenci olsaydı', '300 TL']],
        target: { text: 'Hedef: 380 TL.', test: (_, r) => r.sum === TICKET.paid, example: { t: 8 }, hint: 'Hepsi öğrenci: 300 TL. Her tam bilet kaç TL ekler?' },
        diagnose: (_, r) => `${r.sum} TL; ${r.sum > 380 ? 'fazla' : 'eksik'} ${Math.abs(r.sum - 380)} TL. Her tam bilet 10 TL değiştirir.`,
        success: '$300+8\\cdot10=380$.',
      },
      reasons: [
        {
          question: 'Neden 8?',
          options: ['Hepsi öğrenci 300 TL; fazla 80 TL, her tam bilet 10 TL fazla getirir.', '$380\\div25\\approx15$.', '$20-12$ olduğu için.'],
          answer: 0,
          feedback: ['', 'Hepsi tam olsaydı 500 olurdu; ortalama fiyatla bölmek kesirli sonuç verir.', '12’yi nereden bulduğun önemli; önce gerekçeyi kur.'],
        },
        {
          question: 'Hepsini tam sayarsak ne olur?',
          options: ['500 TL; 120 TL eksik, her öğrenci bileti 10 TL eksiltir: 12 öğrenci.', 'Aynı sonuç çıkmaz.', '500 TL’ye eşit olur.'],
          answer: 0,
          feedback: ['', 'İki yön de aynı sonucu verir: 12 öğrenci, 8 tam.', 'Kasada 380 TL var; fark var.'],
        },
      ],
      proof: 'Tam $t$, öğrenci $20-t$: $25t+15(20-t)=380\\Rightarrow10t=80$. “Hepsini ucuz say” bu denklemin sözel hâlidir: $300+10t=380$.',
      rule: 'Hepsini bir tür say; fark ÷ birim fark = öteki türün sayısı.',
      condition: 'Yalnız iki tür ve toplam adet biliniyorsa. Sonuç tam sayı ve aralıkta olmalı.',
      trap: 'Fiyatla bölmek; birim farkı yanlış almak.',
      transfer: [
        {
          id: 'at-tavuk', level: 'Yakın alıştırma', text: 'Bir çiftlikte tavuk ve tavşanların toplam 30 başı, 84 ayağı var. Kaç tavşan var?',
          options: ['$12$', '$18$', '$21$'], answer: 0,
          hints: ['Hepsi tavuk: 60 ayak.', 'Fark 24; her tavşan 2 ayak fazla.', '$24/2$.'],
          feedback: ['18 tavuk, 12 tavşan.', '18 tavuk sayısı; soru tavşanı soruyor.', '$84/4$: hepsi tavşan sanıldı.'],
        },
        {
          id: 'at-sinav', level: 'Negatif birim', text: 'Bir sınavda doğru +4, yanlış −1 puan. 25 sorunun hepsini cevaplayan biri 70 puan aldı. Kaç doğrusu var?',
          options: ['$19$', '$17{,}5$', '$14$'], answer: 0,
          hints: ['Hepsi doğru: 100.', 'Her yanlış 5 puan kaybettirir.', '$30/5=6$ yanlış.'],
          feedback: ['$76-6=70$.', '$70/4$: yanlışların cezasını unuttun.', '$14\\cdot4-11=45\\neq70$; doğru sayısı fazla olmalı.'],
        },
        {
          id: 'at-para', level: 'Farklı bağlam', text: '5 TL ve 10 TL’lik toplam 18 banknot 120 TL ediyor. Kaç tane 10 TL’lik var?',
          options: ['$6$', '$12$', '$8$'], answer: 0,
          hints: ['Hepsi 5 TL: 90.', 'Fark 30, her 10’luk 5 fazla.', '6.'],
          feedback: ['$6\\cdot10+12\\cdot5=120$.', '12, beşliklerin sayısı; soru onluğu soruyor.', '$8\\cdot10+10\\cdot5=130$.'],
        },
      ],
      real: [
        { code: 'TYT-0674', answer: 'C', from: 'yuzde-karisim', why: '10 kişi değişti; et→sebze 20 TL azaltır, sebze→et 20 TL artırır: net +80 TL.' },
      ],
    },
    {
      id: 'ters-islem', label: 'Sondan başa', short: 'Son işlemi ilk geri al',
      objective: 'Ardışık işlemlerle verilen problemi sondan başlayıp her işlemin tersini ters sırayla uygulayarak çözer.',
      misconception: 'Ters işlemleri baştan başlayarak uygulamak; çarpmanın tersini çıkarma almak.',
      story: 'Bir sihirbaz: “Aklından bir sayı tut, 3 ekle, 2 ile çarp, 5 çıkar. 21 mi buldun?” Tuttuğun sayıyı nasıl bulur?',
      predict: {
        question: '$x\\to+3\\to\\times2\\to-5$ sonucu 21 ise $x$ kaçtır?',
        options: ['$10$', '$13$', '$29$'],
        insight: [
          'Doğru: $21+5=26$, $26\\div2=13$, $13-3=10$.',
          '13 bir ara adım; son tersi (−3) yapılmadı.',
          'İşlemleri ileri yönde uyguladın.',
        ],
      },
      experiment: {
        prompt: 'Başlangıç sayısını seç; zincirin sonucu 21 olsun.',
        view: 'chain', visualLabel: 'İşlem zinciri ve ters zincir',
        controls: [{ key: 'x', label: 'Başlangıç $x$', min: -5, max: 20, step: 1 }],
        initial: { x: 13 },
        compute: ({ x }) => { const steps = []; let v = x; for (const [op, n] of CHAIN) { v = op === '+' ? v + n : op === '×' ? v * n : v - n; steps.push(v); } return { x, steps, out: v }; },
        readout: (_, r) => [['Zincir', [r.x, ...r.steps].join(' → ')], ['Sonuç', r.out]],
        target: { text: 'Hedef: sonuç 21.', test: (_, r) => r.out === 21, example: { x: 10 }, hint: 'Sondan başla: 21’e 5 ekle, 2’ye böl, 3 çıkar.' },
        diagnose: (_, r) => `Sonuç ${r.out}; ${r.out > 21 ? 'büyük' : 'küçük'}. Her $x$ artışı sonucu 2 artırır.`,
        success: 'Ters zincir: $21\\xrightarrow{+5}26\\xrightarrow{\\div2}13\\xrightarrow{-3}10$.',
      },
      reasons: [
        {
          question: 'Sondan başa nasıl çözülür?',
          options: ['Son işlemden başla, her işlemin tersini uygula: $+5$, $\\div2$, $-3$.', 'İlk işlemden başla, tersini uygula: $-3$, $\\div2$, $+5$.', 'Bütün işlemleri ters sırayla aynen uygula.'],
          answer: 0,
          feedback: ['', '$21-3=18$, $\\div2=9$, $+5=14$: 14 ile başlarsan sonuç 29 olur.', 'İşlemin kendisini değil tersini uygulamalısın.'],
        },
        {
          question: 'Sıra neden tersine çevrilir?',
          options: ['En son yapılan işlem en dışta; önce onu geri almak gerekir.', 'Tersine çevirmek her zaman daha kısadır.', 'Toplama ve çarpmanın sırası önemsiz olduğu için.'],
          answer: 0,
          feedback: ['', 'Kısalık değil; işlemler iç içe olduğu için.', 'Sıra önemli: $(x+3)\\cdot2\\neq x\\cdot2+3$.'],
        },
      ],
      proof: 'Sonuç $2(x+3)-5=21$. Denklemi çözmek, işlemleri dıştan içe geri almaktır: $2(x+3)=26$, $x+3=13$, $x=10$.',
      rule: 'Sondan başa: son işlemin tersinden başla; toplama↔çıkarma, çarpma↔bölme.',
      condition: 'Her işlem geri alınabilir olmalı (0 ile çarpma geri alınamaz; “yarısını verdi” gibi oranlar bölme/çarpmaya dönüşür).',
      trap: 'Ters işlemleri baştan başlayarak sıralamak.',
      transfer: [
        {
          id: 'ti-yakin', level: 'Yakın alıştırma', text: 'Bir sayının yarısının 4 fazlası 10’dur. Sayı kaçtır?',
          options: ['$12$', '$7$', '$28$'], answer: 0,
          hints: ['Son işlem +4.', '$10-4=6$.', '$6\\cdot2$.'],
          feedback: ['$12/2+4=10$.', '$(10+4)/2$: tersleri yanlış.', '$(10+4)\\cdot2$: hem sıra hem işlem tersine çevrilmedi.'],
        },
        {
          id: 'ti-para', level: 'Çok adımlı', text: 'Ali parasının yarısını harcadı, sonra 10 TL kazandı, sonra elindekinin yarısını kardeşine verdi; 25 TL kaldı. Başta kaç TL’si vardı?',
          options: ['$80$', '$60$', '$70$'], answer: 0,
          hints: ['Son adım: yarısını verdi → önce 50.', 'Kazanmadan önce 40.', 'Harcamadan önce 80.'],
          feedback: ['$80\\to40\\to50\\to25$.', '$60\\to30\\to40\\to20$; 25 değil, başlangıç büyük olmalı.', '$70\\to35\\to45\\to22{,}5$.'],
        },
        {
          id: 'ti-hucre', level: 'Tekrarlı işlem', text: 'Bir hücre her saat ikiye bölünüyor. 5 saat sonra 96 hücre var. Başta kaç hücre vardı?',
          options: ['$3$', '$19{,}2$', '$6$'], answer: 0,
          hints: ['Her saat ×2; tersi ÷2.', '5 kez 2’ye böl.', '$96/32$.'],
          feedback: ['$3\\cdot2^5=96$.', '$96/5$: bölünme sayıyı ikiye katlar.', '$96/16$: 4 kez böldün.'],
        },
      ],
      realNote: 'Problem kategorisinin görseli okunan 50’yi aşkın sorusunda yalnız sondan başa çözüm gerektiren soru bulunmadı; aktarım özgün alıştırmalarla yapılır.',
    },
  ],
};
