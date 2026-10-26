import { Choice, LabGrid, Note, Panel, Readouts, Steps } from '../../kit/controls.jsx';
import { aruzMatch, durakOptions, formSuggestions, lineSyllables, rhymePair, rhymeScheme, rhymeWithRedif } from './poetryEngine.js';

export const POEMS = [
  { id: 'yunus', title: 'Yunus Emre (dörtlük)', text: 'Gelin tanış olalım\nİşi kolay kılalım\nSevelim sevilelim\nDünya kimseye kalmaz' },
  { id: 'mani', title: 'Mani (örnek)', text: 'Bahçede güller açtı\nBülbüller dala kaçtı\nSevdiğim uzaklarda\nGönlüme hasret saçtı' },
  { id: 'kosma', title: 'Koşma dörtlüğü (örnek)', text: 'Yayla yollarından haber gelmedi\nGözümün yaşını kimse silmedi\nGurbet ellerinde geçti baharım\nDerdime bir derman kimse bilmedi' },
  { id: 'fuzuli', title: 'Fuzûlî (aruz)', text: 'Beni candan usandırdı cefâdan yâr usanmaz mı\nFelekler yandı âhımdan murâdım şem\'i yanmaz mı' },
];

function Lab({ value: s, onChange }) {
  const set = (patch) => onChange({ ...s, ...patch });
  const lines = s.text.split('\n').map((l) => l.trim()).filter(Boolean);
  const syl = lines.map(lineSyllables);
  const counts = syl.map((x) => x.length);
  const scheme = rhymeScheme(lines);
  const pairs = [];
  lines.forEach((line, i) => { const j = lines.findIndex((other, k) => k > i && scheme[k] === scheme[i]); if (j > i && lines[i].toLocaleLowerCase('tr') !== lines[j].toLocaleLowerCase('tr')) pairs.push([i, j]); });
  const pairInfo = (i, j) => {
    const key = `${i}-${j}`;
    const auto = rhymePair(lines[i], lines[j]);
    if (auto.redif.includes('+') || auto.type.startsWith('sözcük')) return { ...auto, key, fixed: true };
    const autoLen = auto.redif ? auto.redif.split(' / ')[0].length : 0;
    return { ...rhymeWithRedif(lines[i], lines[j], s.redif[key] ?? autoLen), key };
  };
  const markOf = (li, k, syllable) => (s.marks[`${li}:${k}`] ?? (syllable.open ? '.' : '–'));
  const toggleMark = (li, k, syllable) => set({ marks: { ...s.marks, [`${li}:${k}`]: markOf(li, k, syllable) === '.' ? '–' : '.' } });
  return <LabGrid top={<div className="kit-row">
    <Choice options={[{ value: 'hece', label: 'Hece ve durak' }, { value: 'uyak', label: 'Redif ve kafiye' }, { value: 'aruz', label: 'Aruz' }]} value={s.mode} onChange={(mode) => set({ mode })} />
    <label className="field"><span className="field-label">Hazır şiir</span>
      <select value="" onChange={(e) => { const p = POEMS.find((x) => x.id === e.target.value); if (p) set({ text: p.text, marks: {}, redif: {}, mode: p.id === 'fuzuli' ? 'aruz' : s.mode }); }}>
        <option value="">Seç…</option>{POEMS.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
  </div>} visual={<>
    <label className="kit-text wide"><span>Dizeler (her satıra bir dize)</span><textarea className="tx-area" rows={Math.max(4, lines.length + 1)} value={s.text} onChange={(e) => set({ text: e.target.value, marks: {}, redif: {} })} /></label>
    <section className="kit-panel">
      <h4>{s.mode === 'hece' ? 'Heceler, sayı ve durak' : s.mode === 'uyak' ? 'Uyak düzeni, redif ve kafiye' : 'Açık (.) ve kapalı (–) heceler — tıklayıp değiştir (imale, ulama, zihaf)'}</h4>
      <ol className="po-lines">{lines.map((line, li) => {
        const duraks = durakOptions(syl[li]);
        const firstDurak = duraks[0]?.split(' + ').map(Number) ?? [];
        const cut = new Set(firstDurak.slice(0, -1).reduce((acc, len) => [...acc, (acc.at(-1) ?? 0) + len], []));
        return <li key={li}>
          <span className="po-letter">{scheme[li]}</span>
          <span className="po-syl">{syl[li].map((x, k) => <span key={k} className="po-syl-wrap">
            {s.mode === 'aruz' ? <button type="button" className={`po-chip mark${markOf(li, k, x) === '.' ? ' open' : ' closed'}`} onClick={() => toggleMark(li, k, x)}><small>{markOf(li, k, x)}</small>{x.text}</button>
              : <span className={`po-chip${x.last ? ' word-end' : ''}`}>{x.text}</span>}
            {s.mode === 'hece' && cut.has(k + 1) && <span className="po-durak" aria-label="durak">/</span>}
          </span>)}</span>
          <span className="po-count">{counts[li]} hece{s.mode === 'hece' && duraks.length ? ` · ${duraks.join(' ya da ')}` : ''}</span>
        </li>;
      })}</ol>
    </section>
    {s.mode === 'uyak' && <section className="kit-panel">
      <h4>Uyaklı dize çiftleri</h4>
      {pairs.length === 0 ? <p className="muted">Uyaklı dize çifti bulunamadı.</p> : pairs.map(([i, j]) => {
        const p = pairInfo(i, j);
        const show = (word) => {
          if (p.fixed) return <span className="po-word">{word}</span>;
          const r = word.slice(word.length - p.redifLen); const base = word.slice(0, word.length - p.redifLen); const kaf = base.slice(base.length - p.kafiye.length);
          return <span className="po-word">{base.slice(0, base.length - kaf.length)}<mark className="po-kafiye">{kaf}</mark><mark className="po-redif">{r}</mark></span>;
        };
        const currentLen = p.redifLen ?? 0;
        return <div key={p.key} className="po-pair">
          <span>{i + 1}. ve {j + 1}. dize: {show(p.words[0])} — {show(p.words[1])}</span>
          <span><strong>Redif:</strong> {p.redif || 'yok'} · <strong>Kafiye:</strong> {p.kafiye || 'yok'} → <strong>{p.type}</strong></span>
          {!p.fixed && <span className="kit-chips"><button type="button" className="btn btn-secondary btn-sm" onClick={() => set({ redif: { ...s.redif, [p.key]: Math.max(0, currentLen - 1) } })}>Redifi kısalt</button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => set({ redif: { ...s.redif, [p.key]: currentLen + 1 } })}>Redifi uzat</button>
            {s.redif[p.key] !== undefined && <button type="button" className="btn btn-secondary btn-sm" onClick={() => { const next = { ...s.redif }; delete next[p.key]; set({ redif: next }); }}>Öneriye dön</button>}</span>}
        </div>;
      })}
      <p className="muted small"><mark className="po-kafiye">kafiye</mark> <mark className="po-redif">redif</mark> — öneri ek listesine dayanır; ekin görevi farklıysa (dağ-lar / ağla-r) redifi kısaltarak düzelt.</p>
    </section>}
    {s.mode === 'aruz' && lines.map((line, li) => {
      const marks = syl[li].map((x, k) => markOf(li, k, x)).join('');
      const best = aruzMatch(marks)[0];
      return <Readouts key={li} title={`${li + 1}. dize: ${marks}`} items={[
        ['En yakın kalıp', best.score > 0 ? `${best.name} (%${Math.round(best.score * 100)} uyum)` : 'Hece sayısı bilinen kalıplarla uyuşmuyor'],
        best.score > 0 && best.mismatches.length > 0 && ['Uymayan heceler', best.mismatches.map((k) => `${k + 1}. hece "${syl[li][k].text}" (${marks[k] === '.' ? 'açık; kapalı olmalı → imale gerekebilir' : 'kapalı; açık olmalı → zihaf/ulama gerekebilir'})`).join(' · ')],
      ]} />;
    })}
  </>} side={<>
    <Readouts title="Özet" items={[
      ['Dize sayısı', lines.length],
      ['Hece sayıları', counts.join(', ')],
      ['Uyak düzeni', scheme],
      ['Nazım biçimi önerisi', formSuggestions(lines, counts, scheme).join(' · ')],
    ]} />
    <Steps title="Kurallar" lines={s.mode === 'aruz' ? ['Ünlüyle biten hece açık (.), ünsüzle ya da uzun ünlüyle (â, î, û) biten kapalı (–).', 'Açık heceyi uzun okumak imale, kapalıyı kısa okumak zihaftır.', 'Ulama: sözcük sonundaki ünsüz sonraki sözcüğün ünlüsüyle birleşir; hece açılır.', 'Dizenin son hecesi her zaman serbesttir.'] : ['Hece ölçüsü: her dizedeki hece sayısı eşittir; duraklar sözcük sınırına düşer.', 'Redif: dize sonlarında aynı görevdeki ek ya da sözcüklerin tekrarı.', 'Kafiye: rediften önceki ses benzerliği. 1 ses yarım, 2 ses tam, 3+ ses zengin; anlamı farklı aynı sözcük cinaslı.', 'Önce redifi ayır, sonra kalan ortak seslere bak.']} />
    {s.mode === 'uyak' && <Note>Kafiye–redif ayrımı eklerin görevine bağlıdır; araç öneri verir, karar senin.</Note>}
  </>} />;
}

const initial = { mode: 'hece', text: POEMS[0].text, marks: {}, redif: {} };

export default {
  Lab,
  initial,
  intro: 'Dizeleri yaz ya da hazır şiir seç: heceler, durak, uyak düzeni, redif ve kafiye ile aruzdaki açık–kapalı heceler anında çıkar. Araç önerir, sen düzeltirsin: redifi kısaltıp uzatabilir, aruzda heceleri tıklayıp değiştirebilirsin.',
  questions: [
    { id: 'hece', title: 'Hece sayısı ve durak', exam: 'AYT', topic: 'Şiir bilgisi',
      stem: 'Gelin tanış olalım\nİşi kolay kılalım\nSevelim sevilelim\nDünya kimseye kalmaz\n(Yunus Emre)',
      ask: 'Bu dörtlüğün ölçüsü için aşağıdakilerden hangisi doğrudur?',
      choices: { A: '6\'lı hece ölçüsü', B: '7\'li hece ölçüsü', C: '8\'li hece ölçüsü (4 + 4)', D: '11\'li hece ölçüsü (6 + 5)', E: 'Aruz ölçüsü' }, answer: 'B',
      setup: { mode: 'hece', text: POEMS[0].text },
      build: 'Hazır şiir: Yunus Emre (dörtlük). Mod: Hece ve durak.',
      look: 'Her dize 7 hece; durak çoğunlukla 4 + 3 (ge-lin-ta-nış / o-la-lım).',
      explanation: 'Ge-lin-ta-nış-o-la-lım = 7 hece; diğer dizeler de 7\'şer hece → 7\'li hece ölçüsü (halk şiirinde mani ve ilahilerde sık).',
      rule: 'Hece ölçüsünde dizelerin hece sayısı eşittir; ölçü, hece sayısıyla adlandırılır.' },
    { id: 'kafiye', title: 'Redif ve kafiye türü', exam: 'AYT', topic: 'Şiir bilgisi',
      stem: 'Gelin tanış olalım\nİşi kolay kılalım\nSevelim sevilelim\nDünya kimseye kalmaz',
      ask: 'Bu dörtlükteki ilk üç dizenin uyağıyla ilgili aşağıdakilerden hangisi doğrudur?',
      choices: { A: 'Tam kafiye vardır, redif yoktur.', B: 'Yarım kafiye (l) ve "-alım / -elim" redifi vardır.', C: 'Zengin kafiye vardır, redif "olalım" sözcüğüdür.', D: 'Cinaslı kafiye vardır.', E: 'Yarım kafiye vardır, redif yoktur.' }, answer: 'B',
      setup: { mode: 'uyak', text: POEMS[0].text, redif: {} },
      build: 'Hazır şiir: Yunus Emre. Mod: Redif ve kafiye.',
      look: 'ol-alım / kıl-alım / sevil-elim: sondaki ek aynı görevde (istek eki) → redif; ondan önceki ortak ses yalnız "l" → yarım kafiye.',
      explanation: '"-alım / -elim" istek kipinin 1. çoğul kişi eki; aynı görevdeki ek tekrarı rediftir. Redif çıkınca "ol-, kıl-, sevil-" köklerinde ortak ses yalnız "l" → yarım kafiye.',
      rule: 'Önce redifi (aynı görevdeki ek/sözcük) ayır; kalan ortak ses sayısı kafiye türünü verir.' },
    { id: 'mani', title: 'Uyak düzeni ve nazım biçimi', exam: 'AYT', topic: 'Şiir bilgisi',
      stem: 'Bahçede güller açtı\nBülbüller dala kaçtı\nSevdiğim uzaklarda\nGönlüme hasret saçtı',
      ask: 'Bu dörtlüğün uyak düzeni ve nazım biçimi aşağıdakilerden hangisidir?',
      choices: { A: 'abab — koşma', B: 'aaxa — mani', C: 'aabb — semai', D: 'aaab — mani', E: 'abcb — koşma' }, answer: 'B',
      setup: { mode: 'uyak', text: POEMS[1].text, redif: {} },
      build: 'Hazır şiir: Mani (örnek). Mod: Redif ve kafiye.',
      look: 'Uyak düzeni satırı "aaba"; özet: 4 dize, 7\'şer hece → mani önerisi.',
      explanation: '1, 2 ve 4. dizeler uyaklı (açtı, kaçtı, saçtı), 3. dize serbest → aaxa. Tek dörtlük ve 7\'li hece: mani.',
      rule: 'Mani: tek dörtlük, 7\'li hece, aaxa. Koşma: 11\'li hece, dörtlükler.' },
    { id: 'aruz', title: 'Aruz kalıbı', exam: 'AYT', topic: 'Şiir bilgisi',
      stem: 'Beni candan usandırdı cefâdan yâr usanmaz mı\nFelekler yandı âhımdan murâdım şem\'i yanmaz mı\n(Fuzûlî)',
      ask: 'Bu beytin aruz kalıbı aşağıdakilerden hangisidir?',
      choices: { A: 'Fâilâtün Fâilâtün Fâilâtün Fâilün', B: 'Mefâîlün Mefâîlün Mefâîlün Mefâîlün', C: 'Mef\'ûlü Mefâîlü Mefâîlü Feûlün', D: 'Feilâtün Feilâtün Feilâtün Feilün', E: 'Müstef\'ilün Müstef\'ilün Müstef\'ilün Müstef\'ilün' }, answer: 'B',
      setup: { mode: 'aruz', text: POEMS[3].text, marks: {} },
      build: 'Hazır şiir: Fuzûlî (aruz). Mod: Aruz.',
      look: '2. dize kalıba tam uyuyor (. – – – dört kez). 1. dizede 2. ve 8. heceler açık: imale ile uzatılınca kalıp tutuyor.',
      explanation: 'Fe-lek-ler-yan / dı-â-hım-dan / mu-râ-dım-şem / i-yan-maz-mı → . – – – yapısı dört kez: Mefâîlün Mefâîlün Mefâîlün Mefâîlün.',
      rule: 'Heceleri açık/kapalı işaretle, dörtlü gruplara böl; imale ve ulamayı hesaba kat; son hece serbesttir.' },
  ],
  tips: [
    { title: 'Hece ölçüsü', see: 'Dizeler, "ölçüsü", "durak"', look: 'Hece ve durak modu.', rule: 'Hece sayısını say; durak sözcük sınırına düşer (7: 4+3, 8: 4+4, 11: 6+5 / 4+4+3).' },
    { title: 'Redif ve kafiye', see: '"redif", "kafiye", "uyak türü"', look: 'Redif ve kafiye modu; redifi kısalt/uzat.', rule: 'Redif aynı görevdeki ek/sözcük; kafiye öncesindeki ses benzerliği (1 yarım, 2 tam, 3+ zengin).', trap: 'Sesçe aynı ama görevi farklı ekler (dağ-lar / ağla-r) redif değildir.' },
    { title: 'Uyak düzeni ve biçim', see: '"uyak düzeni", "nazım biçimi"', look: 'Özetteki uyak düzeni ve öneri.', rule: 'Mani aaxa (7\'li); koşma 11\'li; gazel aa ba ca; rubai/tuyuğ aaxa (aruz).' },
    { title: 'Aruz', see: 'Divan şiiri, "kalıbı"', look: 'Aruz modu, uymayan heceler.', rule: 'Açık (.) / kapalı (–) heceleri kalıpla eşleştir; uzun ünlü kapalıdır; imale ve ulamaya dikkat.' },
  ],
};
