import { createContext, useContext, useState } from 'react';

const SoruBaglami = createContext(null);
export function SoruDeposu({ degerler, yaz, children }) {
  return <SoruBaglami.Provider value={{ degerler, yaz, alan: 'v2' }}>{children}</SoruBaglami.Provider>;
}
export function SoruAlani({ id, children }) {
  const parent = useContext(SoruBaglami);
  return <SoruBaglami.Provider value={parent ? { ...parent, alan: `${parent.alan}:${id}` } : null}>{children}</SoruBaglami.Provider>;
}
// V1'de yerel state, v2'de kullanıcı/sürüm/soru/tur bazında kalıcı state.
export function useSoruDurumu(id, baslangic) {
  const ctx = useContext(SoruBaglami);
  const [local, setLocal] = useState(baslangic);
  const initial = () => typeof baslangic === 'function' ? baslangic() : baslangic;
  const key = `${ctx?.alan}:${id}`;
  const value = ctx ? (ctx.degerler[key] ?? initial()) : local;
  const set = update => {
    if (!ctx) { setLocal(update); return; }
    ctx.yaz(key, previous => typeof update === 'function' ? update(previous ?? initial()) : update);
  };
  return [value, set];
}
