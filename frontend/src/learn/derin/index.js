// Derinleştirilmiş derslerin bölüm keşifleri: öğretim verisi, kontroller ve deterministik modeller.
// JSX içermez; Node testleri de bu dosyayı içe aktarır. Çizimler derin/cizimler.jsx içindedir.
// Her ders modülü { explorations, controls, model(id, değerler) } dışa aktarır; keşif kimlikleri ders önekiyle başlar.
import * as temelKavramlar from './temel-kavramlar.js';
import * as sayiBasamaklari from './sayi-basamaklari.js';
import * as ebobEkok from './ebob-ekok.js';
import * as rasyonelSayilar from './rasyonel-sayilar.js';
import * as denklemler from './birinci-derece-denklemler.js';
import * as esitsizlikler from './esitsizlikler.js';
import * as mutlakDeger from './mutlak-deger.js';
import * as usluIfadeler from './uslu-ifadeler.js';
import * as kokluIfadeler from './koklu-ifadeler.js';
import * as oranOranti from './oran-oranti.js';
import * as ikinciDerece from './ikinci-derece-denklemler.js';
import * as carpanlaraAyirma from './carpanlara-ayirma.js';
import * as sayiKesir from './sayi-kesir-problemleri.js';
import * as yasIsci from './yas-isci-problemleri.js';

import * as yuzdeKarisim from './yuzde-karisim.js';
import * as karZarar from './kar-zarar.js';
import * as hareket from './hareket-problemleri.js';
import * as grafik from './grafik-rutin-olmayan.js';
import * as veriGrafik from './veri-grafikleri.js';
import * as merkezi from './merkezi-egilim.js';
import * as onermeler from './onermeler.js';
import * as kosullu from './kosullu-onerme.js';
import * as kumeler from './kumeler-temel.js';
import * as kumeIslem from './kume-islemleri.js';
import * as fonksiyon from './fonksiyon-kavrami.js';
import * as fonksiyonGrafik from './fonksiyon-grafikleri.js';
import * as bileske from './bileske-ters.js';
import * as polinom from './polinom-islemleri.js';

const MODULES = [temelKavramlar, sayiBasamaklari, ebobEkok, rasyonelSayilar, denklemler, esitsizlikler, mutlakDeger, usluIfadeler, kokluIfadeler, oranOranti, ikinciDerece, carpanlaraAyirma, sayiKesir, yasIsci, yuzdeKarisim, karZarar, hareket, grafik, veriGrafik, merkezi, onermeler, kosullu, kumeler, kumeIslem, fonksiyon, fonksiyonGrafik, bileske, polinom];

export const DEEP_EXPLORATIONS = Object.assign({}, ...MODULES.map((m) => m.explorations));
export const DEEP_CONTROLS = Object.assign({}, ...MODULES.map((m) => m.controls));
const OWNER = Object.fromEntries(MODULES.flatMap((m) => Object.keys(m.controls).map((id) => [id, m])));
export const deepModel = (id, values) => OWNER[id]?.model(id, values) ?? null;
