// Özgün görselleri okunan bağımsız aktarım soruları. Derste çözümü gösterilmez.
// Pratik ekranı çözümü yalnız sunucu cevabı açtıktan sonra sunar.
export const DIVISION_TRANSFER_EXAMS = {
  'TYT-0592': {
    teachingRole: 'independent',
    conceptId: 'bolme-bolunebilme', archetype: 'bolme-algoritmasi', answer: 'A',
    title: '2020 TYT · rakam koşullarıyla en büyük ve en küçük sayı',
    cue: 'Sorunun kendi tanımını kullan: onlar basamağı diğer iki rakamın böleni. Sayının tamamının bölünebilmesi istenmiyor.',
    steps: [
      { text: 'Sayıyı $100a+10b+c$ yaz. Üç rakam da 1–9 arasında ve farklı; $a$ ile $c$, $b$ rakamının katı.', why: 'Sıfır yasak. Yüzler, onlar ve birler basamaklarının görevlerini ayrı tutuyoruz.' },
      { text: 'En büyük sayı için $a=9$. 9’u bölen ve 9’dan farklı olabilen $b$ değerleri 1 ve 3; büyük olan 3’ü seç. 3’ün 9 ve 3 dışındaki en büyük rakam katı 6. En büyük sayı 936.', why: 'Önce yüzler, sonra onlar, sonra birler basamağı büyütülür. 9 ile başlayan geçerli sayı bulunduğundan daha küçük yüzler basamağına gerek yok.' },
      { text: 'En küçük sayıda $a=1$ olamaz: onu bölen pozitif rakam yalnız 1 ve rakamlar farklı olmalı. $a=2$ için $b=1$; kalan en küçük farklı rakam $c=3$. En küçük sayı 213.', why: '1 her rakamı böler. Birler basamağında 0, 1 ve 2’yi kullanamayız.' },
      { text: '$936-213=723$.', why: 'İstenen iki sayının farkıdır; rakamlarının farkı veya toplamı değildir.' },
    ],
    result: 'A · 723',
    tip: 'Basamaklı sayıyı en büyük/en küçük yaparken soldan sağa ilerle, her seçimden sonra kalan basamaklara geçerli değer kalıp kalmadığını denetle. Yalnız en büyük rakamları yazmak yeterli değildir.',
    check: '936: 3, hem 9’u hem 6’yı böler. 213: 1, hem 2’yi hem 3’ü böler. Her iki sayının rakamları farklı ve sıfırdan farklıdır. 213+723=936.',
    mistake: '“Ortak katlı” adını bildiğin bir kuralla değiştirme. Burada tanım rakamlar arasındadır; 936’nın 3’e bölünmesi tek başına yeterli kontrol değildir.',
  },
  'TYT-0597': {
    teachingRole: 'independent',
    conceptId: 'bolme-bolunebilme', archetype: 'kural', answer: 'B',
    title: '2024 TYT · kat zinciri ve rakam toplamını birlikte kullan',
    cue: 'A, B’nin; B, C’nin katı. Rakamların farklı olması zinciri daraltır; 3 kuralı kalan adayları ayırır.',
    steps: [
      { text: '$A$ sıfır olamaz. $B=0$ olursa onun katı $A$ da sıfır olur; $C=0$ olursa $B$ de sıfır olur. Dolayısıyla üçü de pozitiftir.', why: 'Üç basamaklı sayı ve kat koşulları, metinde ayrıca söylenmese de sıfırları dışlar.' },
      { text: 'Farklı pozitif rakamlar için $A\\geq2B$ ve $B\\geq2C$. Böylece $A\\geq4C$. $A\\leq9$ olduğundan $C$ yalnız 1 veya 2 olabilir.', why: 'Pozitif bir sayının kendisinden farklı pozitif tam katı en az iki katıdır.' },
      { text: '$C=2$ ise $B=4$ ve $A=8$ tek adaydır; toplam 14, 3’ün katı değil.', why: '$B\\leq4$ gerekir; yoksa $A\\geq2B$ rakam sınırını aşar.' },
      { text: '$C=1$ ise $(A,B)$ adayları $(4,2),(6,2),(8,2),(6,3),(9,3),(8,4)$. Rakam toplamları sırasıyla 7, 9, 11, 10, 13, 13; yalnız 621 uygundur.', why: '$B$ ancak 2, 3 veya 4 olabilir. Her birinin 9’u aşmayan, kendisinden farklı katlarını eksiksiz taradık.' },
      { text: '$A\\cdot B\\cdot C=6\\cdot2\\cdot1=12$.', why: 'Bulduğumuz sayı 621, fakat soru rakamların çarpımını istiyor.' },
    ],
    result: 'B · 12',
    tip: 'Pozitif ve farklı tam sayı katlarında en az iki kat olma sınırını kullan. Pozitiflik veya farklılık koşulu yoksa bu kısayol geçmez; örneğin eşit rakamlarda katsayı 1 olabilir.',
    check: '6=3×2; 2=2×1. 6, 2, 1 farklı rakamlar; 621=3×207. Rakam çarpımı 12.',
    mistake: 'A+B+C toplamını cevap sanma: toplam 9 yalnız bölünebilme kontrolüdür. İstenen çarpım 12’dir.',
  },
};
