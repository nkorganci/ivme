import identityCatalog from './data/curriculumIdentities.json' with { type: 'json' };

// OGM Materyal MEBİ TYT/AYT konu özetleri ve YKS konu anlatımları temel alınarak
// çalışma için küçük, işaretlenebilir parçalara ayrılmıştır. Kimlikler kalıcıdır:
// yayınlandıktan sonra başlık değişse bile id alanı değiştirilmemelidir.
const units = (groups) => groups.map(([name, topics]) => ({ name, topics: topics.split('|') }));
const subject = (id, name, area, groups) => ({ id, name, area, units: units(groups) });

export const SOURCE_CURRICULUM = {
  TYT: [
    subject('turkce', 'Türkçe', 'Türkçe', [
      ['Anlam bilgisi', 'Sözcükte anlam|Cümlede anlam|Paragrafta konu ve ana düşünce|Paragrafta yapı|Paragrafta anlatım teknikleri|Paragrafta düşünceyi geliştirme yolları|Sözel mantık'],
      ['Dil bilgisi', 'Ses bilgisi|Yazım kuralları|Noktalama işaretleri|Sözcük türleri|İsim ve sıfat tamlamaları|Fiil, ek fiil ve fiilimsi|Cümlenin ögeleri|Cümle türleri|Anlatım bozuklukları'],
    ]),
    subject('matematik', 'Matematik', 'Temel Matematik', [
      ['Temel kavramlar', 'Sayı kümeleri ve işlem önceliği|Sayı basamakları|Bölme ve bölünebilme|EBOB ve EKOK|Rasyonel sayılar|Basit eşitsizlikler|Mutlak değer|Üslü sayılar|Köklü sayılar|Çarpanlara ayırma'],
      ['Denklemler ve problemler', 'Birinci dereceden denklemler|Oran ve orantı|Sayı ve kesir problemleri|Yaş problemleri|Yüzde, kâr ve zarar problemleri|Hareket problemleri|İşçi ve havuz problemleri|Karışım problemleri|Grafik ve tablo problemleri|Rutin olmayan problemler'],
      ['Kümeler ve veri', 'Kümeler|Mantık|Fonksiyonlara giriş|Permütasyon|Kombinasyon|Olasılık|Veri ve istatistik'],
    ]),
    subject('geometri', 'Geometri', 'Temel Matematik', [
      ['Düzlem geometri', 'Doğruda ve üçgende açılar|Üçgende kenar ve açı bağıntıları|Üçgende eşlik ve benzerlik|Üçgende alan|Üçgende yardımcı elemanlar|Dörtgenler|Özel dörtgenler|Çokgenler|Çember ve daire'],
      ['Analitik ve uzay', 'Noktanın analitiği|Doğrunun analitiği|Katı cisimler'],
    ]),
    subject('tarih', 'Tarih', 'Sosyal Bilimler', [
      ['İlk ve orta çağ', 'Tarih bilimi ve zaman|İlk uygarlıklar|İlk Türk devletleri|İslam tarihi ve uygarlığı|Türklerin İslamiyet’i kabulü|Türk İslam devletleri'],
      ['Osmanlı tarihi', 'Osmanlı kuruluş ve yükselme|Osmanlı kültür ve medeniyeti|Osmanlı’da değişim ve Avrupa|19. yüzyılda Osmanlı'],
      ['Yakın dönem', '20. yüzyıl başlarında Osmanlı|Millî Mücadele|Atatürk ilke ve inkılapları|Atatürk dönemi dış politika'],
    ]),
    subject('cografya', 'Coğrafya', 'Sosyal Bilimler', [
      ['Doğal sistemler', 'Coğrafyanın konusu|Dünya’nın şekli ve hareketleri|Coğrafi konum|Harita bilgisi ve izohipsler|Atmosfer ve iklim|İç ve dış kuvvetler|Su, toprak ve bitki örtüsü'],
      ['Beşerî sistemler', 'Nüfusun özellikleri|Yerleşme ve göç|Ekonomik faaliyetler|Bölgeler|Doğal afetler|Çevre ve toplum'],
    ]),
    subject('felsefe', 'Felsefe', 'Sosyal Bilimler', [
      ['Felsefenin alanları', 'Felsefeyi tanıma|Düşünme ve akıl yürütme|Bilgi felsefesi|Varlık felsefesi|Bilim felsefesi|Ahlak felsefesi|Siyaset felsefesi|Sanat felsefesi|Din felsefesi'],
      ['Felsefe tarihi', 'İlk Çağ felsefesi|Orta Çağ felsefesi|15–17. yüzyıl felsefesi|18–19. yüzyıl felsefesi|20. yüzyıl felsefesi'],
    ]),
    subject('din', 'Din Kültürü ve Ahlak Bilgisi', 'Sosyal Bilimler', [
      ['İnanç ve ibadet', 'Bilgi ve inanç|Din ve İslam|İslam ve ibadet|Kur’an-ı Kerim ve ana konuları|Hz. Muhammed’in örnekliği|İslam düşüncesinde yorumlar'],
      ['Din ve hayat', 'Din, ahlak ve değerler|Güncel dinî meseleler|Yaşayan dinler ve ortak özellikler'],
    ]),
    subject('fizik', 'Fizik', 'Fen Bilimleri', [
      ['Madde ve hareket', 'Fizik bilimine giriş|Madde ve özellikleri|Hareket ve kuvvet|İş, güç ve enerji|Isı, sıcaklık ve genleşme|Basınç|Kaldırma kuvveti'],
      ['Elektrik ve dalgalar', 'Elektrostatik|Elektrik akımı ve devreler|Manyetizma|Dalgalar|Optik: gölge ve yansıma|Optik: kırılma ve mercekler'],
    ]),
    subject('kimya', 'Kimya', 'Fen Bilimleri', [
      ['Kimyanın temelleri', 'Kimya bilimi ve güvenlik|Atom ve yapısı|Periyodik sistem|Kimyasal türler arası etkileşimler|Maddenin hâlleri|Kimyanın temel kanunları|Mol kavramı|Kimyasal tepkimeler ve hesaplamalar'],
      ['Karışımlar ve çevre', 'Karışımlar ve ayırma yöntemleri|Asitler, bazlar ve tuzlar|Kimya her yerde|Doğa ve kimya'],
    ]),
    subject('biyoloji', 'Biyoloji', 'Fen Bilimleri', [
      ['Canlılığın temeli', 'Canlıların ortak özellikleri|Canlıların yapısındaki bileşikler|Hücre ve organeller|Hücre zarından madde geçişleri|Canlıların sınıflandırılması'],
      ['Kalıtım ve ekoloji', 'Hücre bölünmeleri|Eşeysiz ve eşeyli üreme|Kalıtımın genel ilkeleri|Ekosistem ekolojisi|Güncel çevre sorunları'],
    ]),
  ],
  AYT: [
    subject('matematik', 'Matematik', 'Matematik', [
      ['Cebir ve fonksiyonlar', 'Temel kavramlar ve eşitsizlikler|Fonksiyonlar|Polinomlar|İkinci dereceden denklemler|Parabol|Karmaşık sayılar|Eşitsizlik sistemleri|Logaritma|Diziler|Binom açılımı'],
      ['Sayma ve olasılık', 'Permütasyon|Kombinasyon|Olasılık|İstatistik'],
      ['Analiz', 'Trigonometri|Trigonometrik denklemler|Limit ve süreklilik|Türev ve uygulamaları|İntegral ve uygulamaları'],
    ]),
    subject('geometri', 'Geometri', 'Matematik', [
      ['Düzlem geometri', 'Üçgenler|Dörtgenler ve çokgenler|Çember ve daire|Analitik düzlemde doğru|Çemberin analitiği'],
      ['Dönüşüm ve uzay', 'Dönüşümler|Katı cisimler'],
    ]),
    subject('edebiyat', 'Türk Dili ve Edebiyatı', 'Edebiyat–Sosyal Bilimler 1', [
      ['Metin ve sanat', 'Edebiyatın temel kavramları|Şiir bilgisi|Söz sanatları|Metin türleri|Edebî akımlar'],
      ['Türk edebiyatı dönemleri', 'İslamiyet öncesi Türk edebiyatı|Geçiş dönemi eserleri|Halk edebiyatı|Divan edebiyatı|Tanzimat edebiyatı|Servetifünun ve Fecriati|Millî Edebiyat|Cumhuriyet dönemi Türk edebiyatı'],
      ['Türler ve eserler', 'Roman ve hikâye|Tiyatro|Öğretici metinler|Şair, yazar ve eser eşleştirmeleri'],
    ]),
    subject('tarih', 'Tarih', 'Sosyal Bilimler', [
      ['Türk ve dünya tarihi', 'Tarih ve zaman|İlk Çağ uygarlıkları|İlk Türk devletleri|İslam tarihi|Türk İslam devletleri|Selçuklu ve beylikler|Osmanlı kuruluş ve yükselme|Osmanlı kültür ve medeniyeti|Osmanlı’da değişim ve diplomasi'],
      ['Modern ve yakın dönem', '19. yüzyılda Osmanlı ve Avrupa|20. yüzyıl başlarında dünya|Millî Mücadele|Atatürk ilke ve inkılapları|İki savaş arası dönem|II. Dünya Savaşı|Soğuk Savaş|Küreselleşen dünya'],
    ]),
    subject('cografya', 'Coğrafya', 'Sosyal Bilimler', [
      ['Doğal ve beşerî sistemler', 'Ekosistem ve madde döngüleri|Biyoçeşitlilik|Nüfus politikaları|Şehirlerin fonksiyonları|Yerleşme ve göç|Doğal kaynaklar ve ekonomi'],
      ['Türkiye ve dünya', 'Türkiye’de tarım, sanayi ve hizmetler|Ulaşım, ticaret ve turizm|Bölgeler ve ülkeler|Küresel ve bölgesel örgütler|Jeopolitik konum|Çevre sorunları ve doğal afetler'],
    ]),
    subject('felsefe', 'Felsefe', 'Sosyal Bilimler 2', [
      ['Felsefe', 'Bilgi ve varlık felsefesi|Bilim felsefesi|Ahlak, siyaset, sanat ve din felsefesi|İlk Çağ ve Orta Çağ felsefesi|15–17. yüzyıl felsefesi|18–19. yüzyıl felsefesi|20. yüzyıl felsefesi'],
    ]),
    subject('psikoloji', 'Psikoloji', 'Sosyal Bilimler 2', [
      ['Psikolojinin temelleri', 'Psikoloji bilimi ve yöntemleri|Davranışın biyolojik temelleri|Yaşam boyu gelişim|Öğrenme ve bellek|Düşünme ve zekâ|Ruh sağlığı ve kişilik'],
    ]),
    subject('sosyoloji', 'Sosyoloji', 'Sosyal Bilimler 2', [
      ['Toplum ve kurumlar', 'Sosyoloji bilimi ve yöntemleri|Toplumsal yapı ve ilişkiler|Kültür ve toplumsallaşma|Toplumsal kurumlar|Toplumsal değişme ve gelişme'],
    ]),
    subject('mantik', 'Mantık', 'Sosyal Bilimler 2', [
      ['Mantığın temelleri', 'Mantığa giriş ve akıl yürütme|Kavram ve terim|Önerme ve çıkarım|Klasik mantık|Sembolik mantık'],
    ]),
    subject('din', 'Din Kültürü ve Ahlak Bilgisi', 'Sosyal Bilimler 2', [
      ['İnanç ve hayat', 'İslam ve ibadet|Kur’an’a göre Hz. Muhammed|İslam düşüncesinde yorumlar|Güncel dinî meseleler|Dinler tarihi|İslam ve bilim|İslam ve tasavvuf'],
    ]),
    subject('fizik', 'Fizik', 'Fen Bilimleri', [
      ['Mekanik', 'Vektörler|Bağıl hareket|Newton’ın hareket yasaları|Bir boyutta sabit ivmeli hareket|İki boyutta hareket|Enerji ve hareket|İtme ve momentum|Tork ve denge|Kütle merkezi|Basit makineler|Çembersel hareket|Basit harmonik hareket|Kütle çekim ve Kepler yasaları'],
      ['Elektrik ve modern fizik', 'Elektriksel kuvvet ve alan|Elektriksel potansiyel|Sığaçlar|Manyetik alan ve kuvvet|Elektromanyetik indüksiyon|Alternatif akım ve transformatörler|Dalga mekaniği|Atom modelleri|Radyoaktivite|Modern fiziğe giriş|Modern fiziğin teknolojideki uygulamaları'],
    ]),
    subject('kimya', 'Kimya', 'Fen Bilimleri', [
      ['Temel ve fiziksel kimya', 'Modern atom teorisi|Gazlar|Sıvı çözeltiler ve çözünürlük|Kimyasal tepkimelerde enerji|Tepkime hızı|Kimyasal denge|Asit-baz dengesi|Çözünürlük dengesi|Kimya ve elektrik'],
      ['Organik kimya', 'Karbon kimyasına giriş|Hidrokarbonlar|Fonksiyonel gruplar|Organik bileşikler|Enerji kaynakları ve bilimsel gelişmeler'],
    ]),
    subject('biyoloji', 'Biyoloji', 'Fen Bilimleri', [
      ['Sistemler', 'Sinir sistemi|Endokrin sistem|Duyu organları|Destek ve hareket sistemi|Sindirim sistemi|Dolaşım ve bağışıklık|Solunum sistemi|Üriner sistem|Üreme sistemi ve embriyonik gelişim'],
      ['Kalıtım ve enerji', 'Nükleik asitler|DNA eşlenmesi|Protein sentezi|Genetik mühendisliği ve biyoteknoloji|Canlılarda enerji dönüşümleri|Fotosentez|Kemosentez|Hücresel solunum|Bitki biyolojisi|Komünite ve popülasyon ekolojisi'],
    ]),
  ],
};

export const legacyTopicKey = (exam, subjectId, title) => `${exam.toLowerCase()}.${subjectId}.${title
  .toLocaleLowerCase('tr-TR').replaceAll('ı', 'i').replaceAll('ğ', 'g').replaceAll('ü', 'u')
  .replaceAll('ş', 's').replaceAll('ö', 'o').replaceAll('ç', 'c')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;

export const resolveTopicId = (exam, subjectId, title, catalog = identityCatalog) => {
  const key = legacyTopicKey(exam, subjectId, title);
  return catalog.identities[key] || key;
};
export const topicId = (exam, subjectId, title) => resolveTopicId(exam, subjectId, title);

// Unit/group placement stays local; preferred topic names and saved identities
// come from the generated projection of the single controlled registry.
for (const [exam, subjects] of Object.entries(SOURCE_CURRICULUM)) for (const entry of subjects)
  for (const unit of entry.units) unit.topics = unit.topics.map(title => entry.id === 'fizik' ? title :
    identityCatalog.titles[topicId(exam, entry.id, title)] || title);

export function curriculumFromCategories(categories) {
  return Object.fromEntries(['TYT','AYT'].map(exam=>[exam,
    [...new Set(categories.filter(c=>c.canonicalUnit&&c.exam===exam).map(c=>c.subjectId))].map(id=>{
      const topics=categories.filter(c=>c.canonicalUnit&&c.exam===exam&&c.subjectId===id).sort((a,b)=>a.order-b.order);
      const old=SOURCE_CURRICULUM[exam].find(s=>s.id===id);
      return {id,name:topics[0].subject,area:old?.area||'Sosyal Bilimler',
        topicIds:Object.fromEntries(topics.map(c=>[c.topic,c.id])),units:[{name:'Üniteler',topics:topics.map(c=>c.topic)}]};
    })]));
}
export const CURRICULUM = identityCatalog.canonicalUnits?.length?curriculumFromCategories(identityCatalog.canonicalUnits):SOURCE_CURRICULUM;

export const allTopics = Object.entries(CURRICULUM).flatMap(([exam, subjects]) => subjects.flatMap((entry) =>
  entry.units.flatMap((unit) => unit.topics.map((title) => ({ id: topicId(exam, entry.id, title), exam, subject: entry.id, title })))));
