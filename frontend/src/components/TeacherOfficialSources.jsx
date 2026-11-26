const OFFICIAL_SOURCES = [
  {
    title: 'ÖSYM · Sınav Soru ve Cevapları arşivi',
    href: 'https://www.osym.gov.tr/sinav-soru-ve-cevaplari',
    detail: 'Resmî soru ve cevap duyurularını sınav/yıla göre ara.',
  },
  {
    title: 'ÖSYM · MEB-AGS sınav grubu',
    href: 'https://osym.gov.tr/SinavGrubu/Index/15',
    detail: 'AGS ve ÖABT duyuruları, konu dağılımları ve örnek soru bağlantıları.',
  },
  {
    title: 'ÖSYM · KPSS duyuru arşivi',
    href: 'https://www.osym.gov.tr/SinavGrubu/Menu/344',
    detail: 'Eski Eğitim Bilimleri ve ÖABT duyurularını bu resmî arşivde ara.',
  },
  {
    title: 'MEB-AGS örnek soruları',
    href: 'https://www.osym.gov.tr/mill-egitim-bakanligi-akademi-giris-sinavi-mebags-ornek-sorular',
    detail: 'ÖSYM’nin yayımladığı örnek sorulara resmî sayfasından ulaş.',
  },
  {
    title: '2026 AGS ve ÖABT · kitapçık duyurusu',
    href: 'https://osym.gov.tr/2026-ags-ve-2026-oabt-temel-soru-kitapciklari-ve-cevap-anahtarlari-yayimlandi',
    detail: 'ÖSYM duyurusundaki erişim süresi ve telif koşulları geçerlidir.',
  },
  {
    title: '2025 AGS ve ÖABT · kitapçık duyurusu',
    href: 'https://www.osym.gov.tr/2025ags-ve-2025oabt-temel-soru-kitapciklari-ve-cevap-anahtarlari-yayimlandi',
    detail: 'ÖSYM duyurusundaki erişim süresi ve telif koşulları geçerlidir.',
  },
  {
    title: '2024 ÖABT · kitapçık duyurusu',
    href: 'https://www.osym.gov.tr/2024kpssoabt-temel-soru-kitapciklari-ve-cevap-anahtarlari-yayimlandi',
    detail: 'ÖSYM’nin resmî duyuru sayfası; erişim ve çoğaltma koşullarını incele.',
  },
  {
    title: '2023 ÖABT · kitapçık duyurusu',
    href: 'https://www.osym.gov.tr/2023kpssoabt-temel-soru-kitapciklari-ve-cevap-anahtarlari-yayimlandi',
    detail: 'ÖSYM duyurusundaki erişim süresi ve telif koşulları geçerlidir.',
  },
];

/** Primary-source links only: Ivme does not download, mirror, or reproduce question PDFs. */
export default function TeacherOfficialSources() {
  return <section className="card" aria-labelledby="teacher-official-sources-title">
    <h2 id="teacher-official-sources-title">ÖSYM resmî kaynaklarına git</h2>
    <p className="muted">Bağlantılar ÖSYM sayfalarını açar. Soru/cevap kitapçıkları bu uygulamaya kopyalanmaz;
      erişim süresi ve kullanım koşulları ÖSYM duyurusuna bağlıdır.</p>
    <ul className="teacher-official-source-list">
      {OFFICIAL_SOURCES.map(source => <li key={source.href}>
        <a href={source.href} target="_blank" rel="noopener noreferrer">{source.title}</a>
        <p className="muted small">{source.detail}</p>
      </li>)}
    </ul>
  </section>;
}
