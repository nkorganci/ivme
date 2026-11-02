// Derin bölüm keşiflerinin SVG çizimleri: model.kind → bileşen. Çizim 480×290 alanına yapılır.
import { diagrams as temelKavramlar } from './temel-kavramlar-cizim.jsx';
import { diagrams as sayiBasamaklari } from './sayi-basamaklari-cizim.jsx';
import { diagrams as ebobEkok } from './ebob-ekok-cizim.jsx';
import { diagrams as rasyonelSayilar } from './rasyonel-sayilar-cizim.jsx';
import { diagrams as denklemler } from './birinci-derece-denklemler-cizim.jsx';
import { diagrams as esitsizlikler } from './esitsizlikler-cizim.jsx';
import { diagrams as mutlakDeger } from './mutlak-deger-cizim.jsx';
import { diagrams as usluIfadeler } from './uslu-ifadeler-cizim.jsx';
import { diagrams as kokluIfadeler } from './koklu-ifadeler-cizim.jsx';
import { diagrams as oranOranti } from './oran-oranti-cizim.jsx';
import { diagrams as ikinciDerece } from './ikinci-derece-denklemler-cizim.jsx';
import { diagrams as carpanlaraAyirma } from './carpanlara-ayirma-cizim.jsx';
import { diagrams as sayiKesir } from './sayi-kesir-problemleri-cizim.jsx';

import { diagrams as yasIsci } from './yas-isci-problemleri-cizim.jsx';

import { diagrams as yuzdeKarisim } from './yuzde-karisim-cizim.jsx';
import { diagrams as karZarar } from './kar-zarar-cizim.jsx';
import { diagrams as hareket } from './hareket-problemleri-cizim.jsx';
import { diagrams as grafik } from './grafik-rutin-olmayan-cizim.jsx';
import { diagrams as veriGrafik } from './veri-grafikleri-cizim.jsx';
import { diagrams as merkezi } from './merkezi-egilim-cizim.jsx';

export const DEEP_DIAGRAMS = { ...temelKavramlar, ...sayiBasamaklari, ...ebobEkok, ...rasyonelSayilar, ...denklemler, ...esitsizlikler, ...mutlakDeger, ...usluIfadeler, ...kokluIfadeler, ...oranOranti, ...ikinciDerece, ...carpanlaraAyirma, ...sayiKesir, ...yasIsci, ...yuzdeKarisim, ...karZarar, ...hareket, ...grafik, ...veriGrafik, ...merkezi };
