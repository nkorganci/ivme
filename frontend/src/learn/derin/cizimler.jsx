// Derin bölüm keşiflerinin SVG çizimleri: model.kind → bileşen. Çizim 480×290 alanına yapılır.
import { diagrams as temelKavramlar } from './temel-kavramlar-cizim.jsx';
import { diagrams as sayiBasamaklari } from './sayi-basamaklari-cizim.jsx';
import { diagrams as ebobEkok } from './ebob-ekok-cizim.jsx';
import { diagrams as rasyonelSayilar } from './rasyonel-sayilar-cizim.jsx';

export const DEEP_DIAGRAMS = { ...temelKavramlar, ...sayiBasamaklari, ...ebobEkok, ...rasyonelSayilar };
