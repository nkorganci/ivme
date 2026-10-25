// Akıllı Öğretmen içeriklerindeki görselleri ön yüzün kullandığı şablon doğrulayıcısıyla denetler.
// Kullanım: node scripts/ogretim-gorsel-denetle.mjs <içerik.json> ...  → {"<yol>": ["hata", ...], ...}
// ogretim-icerigi.py bunu çağırır; tarayıcıda "çizilemedi" olacak görsel aktarımdan önce yakalanır.
import { readFileSync } from 'node:fs';
import { validateVisual } from '../frontend/src/tutor/visualSpec.js';

const result = {};
for (const path of process.argv.slice(2)) {
  try {
    const content = JSON.parse(readFileSync(path, 'utf8'));
    result[path] = validateVisual(content.visual);
  } catch (error) {
    result[path] = [`Görsel denetlenemedi: ${error.message}`];
  }
}
process.stdout.write(JSON.stringify(result));
