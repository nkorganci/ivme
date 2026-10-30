// Derinleştirilmiş derslerin bölüm keşifleri: öğretim verisi, kontroller ve deterministik modeller.
// JSX içermez; Node testleri de bu dosyayı içe aktarır. Çizimler derin/cizimler.jsx içindedir.
// Her ders modülü { explorations, controls, model(id, değerler) } dışa aktarır; keşif kimlikleri ders önekiyle başlar.
import * as temelKavramlar from './temel-kavramlar.js';

const MODULES = [temelKavramlar];

export const DEEP_EXPLORATIONS = Object.assign({}, ...MODULES.map((m) => m.explorations));
export const DEEP_CONTROLS = Object.assign({}, ...MODULES.map((m) => m.controls));
const OWNER = Object.fromEntries(MODULES.flatMap((m) => Object.keys(m.controls).map((id) => [id, m])));
export const deepModel = (id, values) => OWNER[id]?.model(id, values) ?? null;
