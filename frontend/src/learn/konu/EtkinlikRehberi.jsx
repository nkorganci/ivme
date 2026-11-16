const ADLAR = {
  neden: 'Tahmin et ve dene', model: 'Deney yap', yanilgi: 'Tahminini deneyle karşılaştır',
  fikir: 'Ana fikri öğren', sinifla: 'Kavramları sınıflandır', ceviri: 'Gösterimleri karşılaştır',
  turet: 'İlişkiyi adım adım kur', 'kavram-kontrol': 'Kavram kontrolü', ornek: 'Çözümlü örneği incele',
  puf: 'Kısa yolu ve koşulunu öğren', cikmis: 'Gerçek soru çözümünü incele',
  'nicel-kontrol': 'İki sayısal soruyu çöz', tipler: 'Soru tiplerini tanı', tani: 'İlk hamleyi seç', sina: 'Bölüm sonu sorularını çöz',
};
const YONERGELER = {
  neden: 'Önce tahmin sorusunu yanıtla, sonra deneyi yap ve gerekçeni seç.',
  yanilgi: 'Tahmin sorusunu yanıtla, deneyle karşılaştır ve gerekçe sorusunu çöz.',
  model: 'Deneydeki kontrolleri değiştir, sonucu gözle ve “İnceledim” düğmesine bas.',
  fikir: 'Anlatımı incele, ardından “İnceledim” düğmesine bas.',
  sinifla: 'Her ifade için uygun grupları işaretle, ardından “Kontrol et” düğmesine bas.',
  ceviri: 'Verilen gösterimi incele ve doğru seçeneği bul.',
  turet: 'İlişkinin nasıl kurulduğunu incele; alttaki soruyu yanıtla veya incelemeyi tamamla.',
  'kavram-kontrol': 'Soruları çöz. Her cevaptan sonra “Sonraki soru” ile ilerle; art arda üç ilk doğruyla tamamla.',
  ornek: 'İstenen çalışma notlarını yaz ve çözüm adımlarını sırayla aç.',
  puf: 'Kuralı, geçerli olduğu koşulu ve tuzağı incele; sonra “İnceledim” düğmesine bas.',
  cikmis: '“Çözümü adım adım aç” ile başla; bütün adımları inceleyip “İnceledim” düğmesine bas.',
  'nicel-kontrol': 'İki soruyu da çöz. İlk denemede yanlış yaptıysan gerekçeleri okuyup “Yeni deneme” başlat.',
  tipler: 'Soru tipi kartlarını incele, ardından “İncelemeyi tamamla” düğmesine bas.',
  tani: 'Soruda nasıl başlayacağını seç.',
  sina: 'Bütün soruları çöz; yargı sorularında “Kontrol et” düğmesine bas. Gerekirse yeni deneme başlat.',
};
export const etkinlikAdi = b => b.baslik || ADLAR[b.tur] || 'Etkinliği incele';
export default function EtkinlikRehberi({ bloklar, step, saved, yonerge, done, onIleri, sonrakiBolum }) {
  const completed = bloklar.filter((_, i) => saved[i] !== undefined).length;
  const next = bloklar[step + 1];
  return <div className="kp-etkinlik-rehberi">
    <div className="kp-etkinlik-konum"><strong>{bloklar.length} etkinlikten {step + 1}. etkinliktesin</strong><span>{completed} etkinlik tamamlandı</span></div>
    <progress value={completed} max={bloklar.length} aria-label="Bu bölümde tamamlanan etkinlikler" />
    <h3>{step + 1}. {etkinlikAdi(bloklar[step])}</h3>
    <p id="kp-etkinlik-yonerge" role="status"><strong>{done ? 'Tamamlandı. ' : 'Şimdi: '}</strong>{done ? 'Sonraki adıma geçebilirsin.' : yonerge || YONERGELER[bloklar[step].tur] || 'İçeriği incele ve etkinliği tamamla.'}</p>
    <p className="kp-etkinlik-sonraki"><strong>Sonraki: </strong>{next ? `${step + 2}. etkinlik · ${etkinlikAdi(next)}` : 'Bu bölümün son etkinliğindesin. Tamamlayınca sonraki bölüme geçebilirsin.'}</p>
    {done && <button type="button" className="btn btn-primary" onClick={onIleri}>{next ? 'Sonraki etkinliğe geç →' : `Sonraki bölüme geç: ${sonrakiBolum}`}</button>}
    <details className="kp-etkinlik-plani"><summary>Bu bölümün {bloklar.length} etkinliğini gör</summary><ol>{bloklar.map((b, i) => <li key={i} aria-current={i === step ? 'step' : undefined}><span>{etkinlikAdi(b)}</span><small>{i === step ? '← Buradasın' : saved[i] !== undefined ? '✓ Tamamlandı' : 'Sırada'}</small></li>)}</ol></details>
  </div>;
}
