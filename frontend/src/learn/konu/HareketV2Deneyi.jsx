import { useState } from 'react';
import MotionLab from '../../interactive/motion/MotionLab.jsx';
import { useLab } from '../../interactive/motion/useLab.js';
import { deneySenaryosu, deneyVarsayilanlari, esitYolDurumu } from './v2DeneyModeli.js';
import '../../interactive/interactive.css';

export function EsitYolDeneyi() {
  const [p,setP] = useState({yol:60,v1:20,v2:60});
  const [t,setT] = useState(0);
  const d = esitYolDurumu(p,t);
  return <section><div className="kp-v2-kontroller">{[['yol','Her parçanın yolu (km)',10,120],['v1','İlk sürat (km/h)',10,100],['v2','İkinci sürat (km/h)',10,100]].map(([key,ad,min,max]) => <label key={key}>{ad}: {p[key]}<input type="range" min={min} max={max} value={p[key]} onChange={e => {setP({...p,[key]:Number(e.target.value)});setT(0);}} /></label>)}</div>
    <label>Geçen zaman (h): {Math.min(t,d.toplam).toFixed(2)}<input type="range" min="0" max={d.toplam} step="0.01" value={Math.min(t,d.toplam)} onChange={e=>setT(Number(e.target.value))} /></label>
    <figure className="kp-v2-gorsel"><svg viewBox="0 0 510 100" role="img" aria-label={`Eşit iki yol; cismin konumu ${d.konum.toFixed(1)} km`}><path d="M30 50H480" stroke="var(--ink)" /><path d="M255 40V60" stroke="var(--ink)"/><circle cx={30+450*d.konum/(2*p.yol)} cy="50" r="8" fill="var(--pen-blue)"/><text x="20" y="85">0</text><text x="245" y="85">{p.yol} km</text><text x="430" y="85">{2*p.yol} km</text></svg></figure>
    <p role="status">İlk parçanın sayacı: {d.ilkSure.toFixed(2)} h / {d.t1.toFixed(2)} h · İkinci parçanın sayacı: {d.ikinciSure.toFixed(2)} h / {d.t2.toFixed(2)} h</p><p>Her parça {p.yol} km; süratler değişince sürelerin nasıl değiştiğini karşılaştır.</p>
    {t >= d.toplam-.01 && <p>Toplam {2*p.yol} km / {d.toplam.toFixed(2)} h = {d.ortalama.toFixed(2)} km/h.</p>}
  </section>;
}
export default function HareketV2Deneyi({ tur = 'uc-grafik' }) {
  const [p, setP] = useState(() => deneyVarsayilanlari(tur));
  const lab = useLab(deneySenaryosu(tur,p));
  const update = next => {setP(next);lab.load(deneySenaryosu(tur,next),{keepLayers:true});};
  const fields = tur === 'karsilasma' ? [['v','K hızı (m/s)',-8,8],['vb','L hızı (m/s)',-8,8],['x','İlk aralık (m)',0,40]] : tur === 'esit-surat' ? [['v','Ortak sürat (m/s)',1,15]] : [['v','İlk hız (m/s)',tur==='sabit-buyuk'?-120:-10,tur==='sabit-buyuk'?120:10],['a','İvme (m/s²)',-4,4]];
  return <div>{tur==='sabit-buyuk' && <div className="kp-v2-kontroller"><button className="btn btn-secondary" onClick={()=>update({...p,v:100,a:0})}>Büyük sabit hız</button><button className="btn btn-secondary" onClick={()=>update({...p,v:2,a:1})}>Küçük ve değişen hız</button></div>}
    <div className="kp-v2-kontroller">{fields.map(([key,ad,min,max])=><label key={key}>{ad}: <output>{p[key]}</output><input type="range" min={min} max={max} value={p[key]} onChange={e=>update({...p,[key]:Number(e.target.value)})}/></label>)}</div>
    {tur==='karsilasma' && <p role="status">Aradaki uzaklık: {Math.abs(p.x+(p.vb-p.v)*lab.t).toFixed(1)} m</p>}
    {tur==='esit-surat' && <p role="status">K hızı: +{p.v} m/s · L hızı: −{p.v} m/s · İkisinin sürati: {p.v} m/s.</p>}
    <MotionLab lab={lab}/>
  </div>;
}
