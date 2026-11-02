// Özgün öğretim görevleri. Sonlu deneyler genel bir iddianın ispatı sayılmaz.
export const VERDICTS = ['Her zaman doğru', 'Bazen doğru', 'Hiçbir zaman doğru değil'];
export const SCENARIOS = [
  {
    id: 'start', label: 'İlk iddia', change: 'Başlangıç', total: 17, coefficient: 2, integers: true,
    prompt: 'a’yı çift yapabilir misin?', context: 'a ve b tam sayılar.', verdict: 0,
    question: 'b hangi tam sayı olursa olsun, 2b için ne söyleyebilirsin?',
    reasons: ['Her zaman pozitiftir.', 'Her zaman çifttir.', 'b tekse 2b de tektir.'], answer: 1,
    feedback: ['b negatif de olabilir. Pozitiflik ile çiftlik farklı özelliklerdir.', '', 'İkiyle çarpmak, b tekken de çift sonuç verir. b = 3 ile kontrol et.'],
    proof: 'b tam sayı olduğundan 2b çifttir. a = 17 − 2b: tek sayıdan çift sayı çıkınca tek kalır. Bu gerekçe yalnız denediğin değerler için değil, bütün tam sayılar için geçerli.',
    lesson: 'Çift katsayılı terim tekliği değiştirmez.',
  },
  {
    id: 'total', label: 'Toplam değişse?', change: '17 → 18', total: 18, coefficient: 2, integers: true,
    prompt: 'Toplam bir artarsa iddia hâlâ doğru mu?', context: 'a ve b yine tam sayılar.', verdict: 2,
    question: 'a = 18 − 2b ifadesinde hangi ilişki var?',
    reasons: ['Çift − çift = çift.', 'Çift − çift = tek.', 'b’yi bilmeden karar veremeyiz.'], answer: 0,
    feedback: ['', '18’den 2, 4 veya 6 çıkar. Sonuçların ortak özelliğine bak.', 'b’nin değerine ihtiyaç yok; 2b’nin çift olduğunu biliyoruz.'],
    proof: '18 de 2b de çifttir. a = 2(9 − b) olduğundan a her zaman çifttir. Dolayısıyla “a tektir” iddiası bu koşullarda hiçbir zaman doğru değildir.',
    lesson: 'Aynı yöntemde toplamın tekliği değişince sonuç da değişir.',
  },
  {
    id: 'coefficient', label: 'Katsayı değişse?', change: '2b → 3b', total: 17, coefficient: 3, integers: true,
    prompt: 'Bir doğru, bir yanlış örnek bul.', context: 'a ve b tam sayılar.', verdict: 1,
    question: '3b’nin tekliğini ne belirler?',
    reasons: ['3b her zaman tektir.', '17’nin tek olması yeterlidir.', 'b tekse tek, çiftse çifttir.'], answer: 2,
    feedback: ['3 × 2 = 6. Tek bir katsayı çarpımı tek yapmaya yetmez.', 'Tek toplam, iki terimin de tek olduğunu söylemez. b = 1 ve b = 2’yi karşılaştır.', ''],
    proof: 'b = 0 için a = 17 tek; b = 1 için a = 14 çift. İkisi de koşulları sağlıyor. Genel olarak 3b, b ile aynı tekliğe sahiptir; a ise b’nin ters tekliğindedir.',
    lesson: 'Çarpımın tek olması için bütün çarpanlar tek olmalı.',
  },
  {
    id: 'domain', label: 'Tam sayı olmasa?', change: 'Tam sayı şartı yok', total: 17, coefficient: 2, integers: false,
    prompt: 'Yarım adımlarla iddiayı çürüt.', context: 'a ve b gerçek sayılar; tam sayı olmaları gerekmiyor.', verdict: 1,
    question: 'b = 0,5 için neden a = 16 seçebiliriz?',
    reasons: ['0,5 bir tek sayıdır.', '2b her gerçek b için çifttir.', 'Tam sayı şartı kalktı; 16 + 2 × 0,5 = 17.'], answer: 2,
    feedback: ['Teklik ve çiftlik yalnız tam sayılara aittir. 0,5 ne tek ne çifttir.', 'b = 0,5 için 2b = 1. “İki katı çifttir” kuralı b tam sayıyken geçerlidir.', ''],
    proof: 'b = 0,5, a = 16 iddiayı çürütür; b = 0, a = 17 ise doğrular. Gerçek sayılarda a tam sayı bile olmayabilir. Burada yarım adımlarla birkaç örnek deniyoruz; bütün gerçek sayıları taramıyoruz.',
    lesson: 'Bir kısa yolun koşulu, kısa yolun bir parçasıdır.',
  },
];

export const TRANSFER = [
  {
    id: 'product', text: '$a,b$ tam sayılar ve $a(b+1)$ tek. Hangisi zorunludur?',
    options: ['$a$ tek, $b$ tek', '$a$ tek, $b$ çift', '$a$ çift, $b$ tek'], answer: 1,
    hint: 'Çarpım tekse her çarpan tektir. Önce b’yi değil, b + 1’i düşün.',
    feedback: ['b tek olsaydı b + 1 çift olur, çarpım da çift çıkardı.', 'a ve b + 1 tek olmalı. Bu yüzden b çifttir.', 'a çift olsaydı çarpım da çift olurdu.'],
  },
  {
    id: 'expressions', text: 'Aynı koşulda $a+b$, $ab$, $a^2+b$ sırasıyla nasıldır?',
    options: ['Tek · Çift · Tek', 'Çift · Tek · Çift', 'Tek · Tek · Tek'], answer: 0,
    hint: 'a tek, b çift. Her ifadeyi ayrı düşün; tek sayının karesi de tektir.',
    feedback: ['Tek + çift = tek; tek × çift = çift; tek² + çift = tek.', 'Önce çarpım koşulundan a ve b’nin tekliğini tekrar çıkar.', 'ab’de bir çift çarpan var. Tek bir çift çarpan çarpımı çift yapar.'],
  },
  {
    id: 'counterexample', text: '$x,y$ tam sayılar ve $xy$ çift. “$x+y$ kesinlikle tektir” iddiasını hangi örnek çürütür?',
    options: ['$x=2$, $y=3$', '$x=1$, $y=3$', '$x=2$, $y=4$'], answer: 2,
    hint: 'Karşı örnek hem verilen xy çift koşulunu sağlamalı hem de toplamı tek yapmamalı.',
    feedback: ['Çarpım çift ama toplam tek. Bu örnek iddiayı çürütmüyor.', 'Toplam çift ama çarpım tek: sorunun koşuluna uymuyor.', 'Çarpım 8 çift ve toplam 6 çift. Koşula uyan tek bir karşı örnek “kesinlikle” iddiasını çürütür.'],
  },
];

export const numberText = (n) => String(n).replace('-', '−').replace('.', ',');
export function trial(scenario, b) {
  if (!Number.isFinite(b) || (scenario.integers && !Number.isInteger(b))) return null;
  const a = scenario.total - scenario.coefficient * b;
  const parity = !Number.isInteger(a) ? 'Tam sayı değil' : a % 2 === 0 ? 'Çift' : 'Tek';
  return { a, b, parity, holds: parity === 'Tek' };
}
