import { show } from './yardim.js';

export const explorations = {
  'mutlak-parcali': {
    lessonId: 'mutlak-deger', title: 'Kritik noktada anlatım değişir, uzaklık değişmez',
    story: 'Bir yolun −2 ve 4. kilometrelerinde iki durak var. Konumunu değiştirirken iki durağa uzaklığının toplamını izle. Durakların arasında yürüdüğünde birine yaklaştığın kadar diğerinden uzaklaşırsın; toplam neden sabit kalır?',
    terms: [['Kritik nokta', 'Mutlak değerin içini sıfır yapan konum.'], ['Parçalı anlatım', 'Her bölgede içlerin işaretini belirleyip ayrı bir kural yazmak.'], ['Uzaklık toplamı', '$|x+2|+|x-4|$: iki durağa mesafelerin toplamı.']],
    experiment: 'x konumunu soldan sağa taşı. −2 ve 4 sınırlarını geçerken her terimin açılışı nasıl değişiyor? Grafiğin yatay parçası ile yol üzerindeki durakları karşılaştır.',
    example: '$|x+2|+|x-4|=8$ denklemini çöz.',
    steps: [['Önce alt sınır', 'Duraklar arası 6 birimdir; aradaki her noktada toplam 6. 8 için dışarı çıkmalıyız.'], ['Fazlalığı paylaştır', 'Toplamdaki 2 birim fazlalık iki mesafeye birden eklenir; dışarı 1 birim gitmek yeter.'], ['İki yönü dene', '$x=-3$ veya $x=5$. İkisinde de toplam $1+7=8$.']],
    tip: '$a\\leq b$ iken uzaklık toplamının tabanı $b-a$ olur. Hedef bundan büyükse fazlalığın yarısı kadar iki yana çık; eşitse bütün [a,b] çözüm, küçükse çözüm yok.',
    trap: 'Toplam 6 olduğunda yalnız iki ucu yazmak aradaki sonsuz sayıda çözümü unutturur.',
    transfer: ['$|x+2|+|x-4|=12$ için soldaki kök nedir?', '$-5$', '$-8$', 'Taban 6, fazlalık 6; dışarı 3: $-2-3=-5$. Sağ kök 7; ikisi de 12 verir.'],
    expert: 'Solda iki uzaklık da azalır: eğim −2. Arada biri artar, diğeri azalır: eğim 0. Sağda ikisi artar: eğim 2. Parçalı formül ile grafiğin eğimi aynı ilişkiyi anlatır.',
  },
  'mutlak-denklem': {
    lessonId: 'mutlak-deger', title: 'İki dal üret, başlangıç denkleminde ele',
    story: 'Bir noktaya uzaklığın, konumuna göre değişen bir bilet bedeline eşit olsun. Bedel negatif çıkarsa cebirsel bir işlem kök üretse bile o konum kabul edilemez. Mutlak değerin dışındaki değişken, her adayın ayrıca kontrol edilmesini gerektirir.',
    terms: [['Aday kök', 'Dallardan gelen, henüz başlangıç denkleminde denenmemiş değer.'], ['Sağ taraf koşulu', '$|x-4|=2x+b$ için $2x+b\\geq0$ gerekir.'], ['Dal', 'İçin pozitif veya negatif olduğu ayrı olasılık.']],
    experiment: 'b değerini değiştir. $y=|x-4|$ ile $y=2x+b$ nerede kesişiyor? Cebirden gelen iki adayın neden yalnız biri işaretleniyor?',
    example: '$|x-4|=2x+1$ denklemini çöz.',
    steps: [['Koşulu yaz', '$2x+1\\geq0$ olmalı: $x\\geq-1/2$.'], ['İki adayı üret', '$x-4=2x+1$ için $x=-5$; $4-x=2x+1$ için $x=1$.'], ['Başlangıçta dene', '−5 için sol 9, sağ −9: elenir. 1 için iki taraf 3: tek çözüm 1.']],
    tip: 'İki dalı çözdükten sonra adayı ilk denklemde dene. Kare alma da fazladan kök üretebilir; aynı sağlama gerekir.',
    trap: 'İki dalın bulunması mutlaka iki kök olduğu anlamına gelmez; dalların işaret ve bölge koşulları vardır.',
    transfer: ['$|x-4|=2x-2$ denkleminin geçerli kökü nedir?', '$2$', '$6$', '$x-4=2x-2$ dalından −2 gelir ve sağ taraf −6 olur. Diğer dal $4-x=2x-2$ için x=2; iki taraf 2.'],
    expert: 'Bu modelin eğimi 2 olan doğrusu V grafiğini her b için bir kez keser. Geçerli kök b≤−8 iken −4−b, b≥−8 iken (4−b)/3; b=−8’de iki cebirsel aday aynı x=4 değeridir, iki farklı kök değildir.',
  },
  'mutlak-bant': {
    lessonId: 'mutlak-deger', title: 'Aynı merkezde iç bölge ve dış bölge',
    story: 'Bir işaret noktasından belirli uzaklıktaki park alanlarını seçiyorsun. “En çok” dersen merkezin çevresindeki tek bant, “en az” dersen iki dış bölge oluşur. Sınırda park etmeye izin verilip verilmemesi yalnız uç noktaları değiştirir.',
    terms: [['Merkez', '$|x-m|$ içindeki m, uzaklığın ölçüldüğü nokta.'], ['Yarıçap', 'İzin verilen uzaklık r; r negatif olamaz.'], ['Açık uç', 'Sınırdaki sayı çözüme dahil değildir; boş daireyle gösterilir.']],
    experiment: 'Merkezi, yarıçapı ve işareti değiştir. Tam sayı sayısı yalnız görüntülenen −10…10 penceresi içindir. r=0 iken dört işaretin sonuçlarını özellikle karşılaştır.',
    example: '$|x-2|<3$ eşitsizliğini sağlayan tam sayıları bul.',
    steps: [['Uzaklığı aralığa çevir', '$-3<x-2<3$; her parçaya 2 ekle: $-1<x<5$.'], ['Uçları ayır', '−1 ve 5 dahil değildir; 0,1,2,3,4 kalır.'], ['Kontrol et', '0 için uzaklık 2<3; −1 için 3<3 yanlış. Toplam 5 tam sayı.']],
    tip: 'Önce aralığı çiz, sonra tam sayıları say. İç bölge “ve”, dış bölge “veya” ile bağlanır. Dış bölgenin tüm gerçellerde sınırsız olduğunu unutma.',
    trap: '≥ ile > arasındaki farkı atlamak iki sınır noktasını yanlış saydırır; yarıçap 0 ise fark daha büyüktür.',
    transfer: ['$|x+1|\\leq2$ eşitsizliğini sağlayan kaç tam sayı vardır?', '5', '3', '$-3\\leq x\\leq1$: −3,−2,−1,0,1. Kapalı iki uç da sayılır.'],
    expert: 'İç aralığın tümleyeni dış bölgedir: $|x-m|\\leq r$ önermesinin değili $|x-m|>r$. ≤ işaretinin değili ≥ değildir; eşitliğin hangi tarafta kaldığı önemlidir.',
  },
  'mutlak-ortanca': {
    lessonId: 'mutlak-deger', title: 'Ortalama mı, ortanca mı? Uzaklık toplamını ölç',
    story: 'Düz bir yol üzerindeki üç ev için ortak buluşma noktası seç. Ortalamada buluşmanın toplam yürüyüşü her zaman azaltacağını tahmin ediyor musun? Son evi uzaklaştır; ortalama yer değiştirirken en iyi noktanın niçin aynı kaldığını keşfet.',
    terms: [['Ortanca', 'Küçükten büyüğe sıralanan üç konumun ortasındaki.'], ['Toplam yol', 'Her eve uzaklığın toplamı: $|x-a|+|x-b|+|x-c|$.'], ['En küçük değer', 'Ulaşılabilen en düşük toplam; yalnız bir alt sınır değildir.']],
    experiment: 'Evler −3, 1 ve c konumunda. x’i ve son ev c’yi değiştir. Grafiğin en alt noktası ile evlerin ortancasını karşılaştır; x=1’de ilk ve son uzaklığın toplamı ne oluyor?',
    example: '$|x+3|+|x-1|+|x-7|$ en az kaçtır?',
    steps: [['Uçları eşleştir', '$|x+3|+|x-7|\\geq10$; arada eşitlik vardır.'], ['Ortadakini sıfırla', '$x=1$ seçilirse ortadaki terim 0 olur, uçların toplamı yine 10’dur.'], ['Sağla', '$4+0+6=10$. Hem alt sınırı bulduk hem bu değere ulaştık.']],
    tip: 'Eşit ağırlıklı uzaklık toplamında konumları sırala: tek sayıda ortanca, çift sayıda ortadaki iki noktanın arası en iyidir.',
    trap: 'Uzaklıkların kareleri toplamında ortalama işe yarar; mutlak uzaklıklar toplamına aynı kuralı taşımak yanlıştır. Ağırlıklar farklıysa sade ortanca da yetmez.',
    transfer: ['Evler −3,1,9 konumunda; en küçük toplam kaçtır?', '12', '13', 'Ortanca 1’de $4+0+8=12$. Uçların arası $9-(-3)=12$; alt sınıra ulaştık.'],
    expert: 'Ortancanın solunda sağdaki ev sayısı daha fazladır; sağa bir adım atmak toplam yolu azaltır. Ortancanın sağında bu denge tersine döner. Ağırlıklı uzaklıklarda ev sayısı yerine toplam ağırlık karşılaştırılır.',
  },
};

const range = (key, label, value, min, max) => ({ key, label, value, min, max, step: 1 });
export const controls = {
  'mutlak-parcali': [range('x', 'Yoldaki konum x', 0, -6, 8)],
  'mutlak-denklem': [range('b', 'Doğrunun sabiti b', 1, -10, 4)],
  'mutlak-bant': [range('m', 'Merkez m', 2, -4, 4), range('r', 'Yarıçap r', 3, 0, 5), {key:'op', label:'Uzaklık koşulu', value:0, options:[[0,'<'],[1,'≤'],[2,'>'],[3,'≥']]}],
  'mutlak-ortanca': [range('x', 'Buluşma noktası x', 1, -6, 10), range('c', 'Son evin konumu', 7, 2, 9)],
};

export function model(id, v) {
  if (id === 'mutlak-parcali') {
    const left = Math.abs(v.x+2), right = Math.abs(v.x-4), total = left+right;
    const part = v.x < -2 ? '−2x + 2' : v.x <= 4 ? '6' : '2x − 2';
    return {kind:id, ...v, left, right, total, part, equation:`|${show(v.x)} + 2| + |${show(v.x)} − 4| = ${show(total)}`, observation:`Soldaki durağa ${show(left)}, sağdakine ${show(right)} birim. Bu bölgede toplamın kuralı ${part}; en küçük toplam 6.`};
  }
  if (id === 'mutlak-denklem') {
    const candidates = [...new Set([-4-v.b, (4-v.b)/3])];
    const accepted = candidates.filter((x) => Math.abs(Math.abs(x-4)-(2*x+v.b))<1e-9);
    return {kind:id, ...v, candidates, accepted, equation:`|x − 4| = 2x ${v.b < 0 ? '−' : '+'} ${show(Math.abs(v.b))}`, observation:`Cebirsel adaylar: ${candidates.map(show).join('; ')}. İlk denklemde iki tarafı eşit yapan: ${accepted.map(show).join('; ')}. Negatif sağ taraf üreten aday elenir.`};
  }
  if (id === 'mutlak-bant') {
    const lo = v.m-v.r, hi = v.m+v.r, symbol = ['<','≤','>','≥'][v.op];
    const contains = (x) => [Math.abs(x-v.m)<v.r, Math.abs(x-v.m)<=v.r, Math.abs(x-v.m)>v.r, Math.abs(x-v.m)>=v.r][v.op];
    const points = Array.from({length:21},(_,i)=>i-10).filter(contains);
    return {kind:id, ...v, lo, hi, points, symbol, equation:`|x − (${show(v.m)})| ${symbol} ${v.r}`, observation:`Sınırlar ${show(lo)} ve ${show(hi)}. Görüntülenen −10…10 penceresinde ${points.length} tam sayı uygun. ${v.op>=2 ? 'Çözüm pencerenin dışında da sürer.' : 'İç bölgeyi ve uçların dahil olup olmadığını karşılaştır.'}`};
  }
  if (id === 'mutlak-ortanca') {
    const homes = [-3,1,v.c], distances = homes.map((a)=>Math.abs(v.x-a));
    const total = distances.reduce((s,n)=>s+n,0), minimum = v.c+3;
    return {kind:id, ...v, homes, distances, total, minimum, equation:`${distances.map(show).join(' + ')} = ${show(total)}`, observation:`Ortanca konum 1’de en küçük toplam ${minimum}. Seçtiğin x=${show(v.x)} konumunda toplam ${total}; en küçükten ${total-minimum} fazla.`};
  }
  return null;
}
