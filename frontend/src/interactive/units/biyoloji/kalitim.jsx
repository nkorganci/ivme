import { Choice, LabGrid, Note, Panel, Readouts, Steps, TextField } from '../../kit/controls.jsx';
import { fractionText } from '../../kit/mathExpr.js';
import { cross, GENOTYPES, phenotypeOf, probability } from './genetics.js';

const LETTERS = ['A', 'B', 'D'];
const TYPES = [{ value: 'tam', label: 'Tam baskın' }, { value: 'eksik', label: 'Eksik baskın' }, { value: 'es', label: 'Eş baskın' }, { value: 'kan', label: 'Kan grubu (ABO)' }, { value: 'X', label: 'X\'e bağlı' }];
const TONES = ['var(--pen-blue)', 'var(--pen-red)', 'var(--pen-green)', 'var(--warn)', 'var(--navy)', 'var(--pen-black)', 'var(--ok)', 'var(--bad)'];

const optionsFor = (gene, parentIndex) => {
  if (gene.type === 'X') return parentIndex === 0 ? GENOTYPES.Xf : GENOTYPES.Xm;
  if (gene.type === 'kan') return GENOTYPES.kan;
  return GENOTYPES.tam.map((g) => g.replace(/A/g, gene.letter).replace(/a/g, gene.letter.toLowerCase()));
};
const pretty = (genotype) => genotype.replace(/IA/g, 'Iᴬ').replace(/IB/g, 'Iᴮ').replace(/XA/g, 'Xᴬ').replace(/Xa/g, 'Xᵃ');

export const PRESETS = [
  { id: 'mono', title: 'Monohibrit: Aa × Aa', genes: [{ letter: 'A', type: 'tam', label: 'Tohum rengi', names: ['sarı', 'yeşil'] }], p1: ['Aa'], p2: ['Aa'] },
  { id: 'di', title: 'Dihibrit: AaBb × AaBb', genes: [{ letter: 'A', type: 'tam', label: 'Renk', names: ['sarı', 'yeşil'] }, { letter: 'B', type: 'tam', label: 'Şekil', names: ['düz', 'buruşuk'] }], p1: ['Aa', 'Bb'], p2: ['Aa', 'Bb'] },
  { id: 'test', title: 'Test çaprazlama: AaBbDd × aabbdd', genes: LETTERS.map((letter) => ({ letter, type: 'tam' })), p1: ['Aa', 'Bb', 'Dd'], p2: ['aa', 'bb', 'dd'] },
  { id: 'kan', title: 'Kan grubu: Iᴬi × Iᴮi', genes: [{ letter: 'A', type: 'kan', label: 'Kan grubu' }], p1: ['IAi'], p2: ['IBi'] },
  { id: 'renk', title: 'Renk körlüğü: XᴬXᵃ × XᴬY', genes: [{ letter: 'A', type: 'X', label: 'Renk görme', names: ['normal', 'renk körü'] }], p1: ['XAXa'], p2: ['XAY'] },
  { id: 'eksik', title: 'Eksik baskınlık: Aa × Aa (pembe × pembe)', genes: [{ letter: 'A', type: 'eksik', label: 'Çiçek rengi', names: ['kırmızı', 'beyaz'] }], p1: ['Aa'], p2: ['Aa'] },
];

function Lab({ value: s, onChange }) {
  const set = (patch) => onChange({ ...s, ...patch });
  const hasX = s.genes.some((g) => g.type === 'X');
  const result = cross(s.p1, s.p2, s.genes);
  const phenotypes = [...result.phenotypeDist.entries()].sort((p, q) => q[1] - p[1]);
  const toneOf = new Map(phenotypes.map(([name], i) => [name, TONES[i % TONES.length]]));
  const genotypes = [...result.genotypeDist.entries()].sort((p, q) => q[1] - p[1]);
  const den = result.g1.length * result.g2.length;
  // Sorgu: her gen için hedef fenotip (ya da herhangi).
  const perGene = s.genes.map((gene, i) => [...new Set(result.cells.map((c) => phenotypeOf(c.pairs[i], gene)))]);
  const predicate = (cell) => s.genes.every((gene, i) => !s.query[i] || s.query[i] === 'any' || phenotypeOf(cell.pairs[i], gene) === s.query[i]);
  const prob = probability(result, predicate, s.sex);
  const updateGene = (i, patch) => {
    const genes = s.genes.map((g, k) => (k === i ? { ...g, ...patch } : g));
    const reset = patch.type !== undefined;
    set({ genes, p1: reset ? s.p1.map((v, k) => (k === i ? optionsFor(genes[i], 0)[1] ?? optionsFor(genes[i], 0)[0] : v)) : s.p1,
      p2: reset ? s.p2.map((v, k) => (k === i ? optionsFor(genes[i], 1)[1] ?? optionsFor(genes[i], 1)[0] : v)) : s.p2, query: s.genes.map(() => 'any') });
  };
  const addGene = () => { if (s.genes.length >= 3) return; const gene = { letter: LETTERS[s.genes.length], type: 'tam' }; set({ genes: [...s.genes, gene], p1: [...s.p1, optionsFor(gene, 0)[1]], p2: [...s.p2, optionsFor(gene, 1)[1]], query: [...s.genes.map(() => 'any'), 'any'] }); };
  const removeGene = () => { if (s.genes.length <= 1) return; set({ genes: s.genes.slice(0, -1), p1: s.p1.slice(0, -1), p2: s.p2.slice(0, -1), query: s.genes.slice(0, -1).map(() => 'any') }); };
  const cols = result.g2.length;
  return <LabGrid top={<div className="kit-row">
    <label className="field"><span className="field-label">Hazır çaprazlama</span>
      <select value="" onChange={(e) => { const p = PRESETS.find((x) => x.id === e.target.value); if (p) set({ genes: p.genes, p1: p.p1, p2: p.p2, query: p.genes.map(() => 'any'), sex: 'all' }); }}>
        <option value="">Seç…</option>{PRESETS.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
  </div>} visual={<>
    <div className="gen-parents">
      {[0, 1].map((k) => <div key={k} className="gen-parent">
        <strong>{hasX ? (k === 0 ? 'Anne (♀)' : 'Baba (♂)') : `${k + 1}. ebeveyn`}: {pretty((k === 0 ? s.p1 : s.p2).join(' '))}</strong>
        <div className="kit-chips">{(k === 0 ? result.g1 : result.g2).map((g) => <span key={g.alleles.join('')} className="ml-event-chip">{pretty(g.alleles.join(''))} · {fractionText(g.p)}</span>)}</div>
      </div>)}
    </div>
    <div className="gen-grid-wrap">
      <div className="gen-grid" style={{ gridTemplateColumns: `minmax(56px, auto) repeat(${cols}, minmax(${cols > 4 ? 52 : 74}px, 1fr))` }} role="img" aria-label="Punnett karesi">
        <span className="gen-corner">♀ \ ♂</span>
        {result.g2.map((g) => <span key={`h${g.alleles.join('')}`} className="gen-head">{pretty(g.alleles.join(''))}</span>)}
        {result.g1.map((row) => [<span key={`r${row.alleles.join('')}`} className="gen-head">{pretty(row.alleles.join(''))}</span>,
          ...result.g2.map((col) => { const cell = result.cells.find((c) => c.row === row && c.col === col); const match = predicate(cell) && (s.sex === 'all' || (s.sex === 'male') === cell.male);
            return <span key={`${row.alleles.join('')}-${col.alleles.join('')}`} className={`gen-cell${match ? ' match' : ''}`} style={{ '--tone': toneOf.get(cell.phenotype) }} title={cell.phenotype}>{pretty(cell.genotype)}</span>; })])}
      </div>
    </div>
    <div className="kit-legend">{phenotypes.map(([name, p]) => <span key={name}><i style={{ background: toneOf.get(name) }} />{name}: {fractionText(p)}</span>)}</div>
    <Readouts title="Oranlar (canlı)" items={[
      ['Gamet çeşidi', `${result.g1.length} × ${result.g2.length} → ${den} kombinasyon`],
      ['Farklı genotip', `${genotypes.length}: ${genotypes.map(([g, p]) => `${pretty(g)} ${fractionText(p)}`).join(' · ')}`],
      ['Farklı fenotip', `${phenotypes.length}: ${phenotypes.map(([f, p]) => `${f} ${fractionText(p)}`).join(' · ')}`],
      ['Seçilen olasılık', `${fractionText(prob)}${s.sex === 'male' ? ' (erkekler içinde)' : s.sex === 'female' ? ' (kızlar içinde)' : ''}`, 'ok'],
    ]} />
  </>} side={<>
    <Panel title={`Genler (${s.genes.length})`}>
      {s.genes.map((gene, i) => <div key={i} className="gen-gene">
        <Choice label={`${gene.letter} geni`} options={TYPES.filter((t) => t.value !== 'X' || !hasX || gene.type === 'X')} value={gene.type} onChange={(type) => updateGene(i, { type })} />
        {gene.type !== 'kan' && <div className="kit-row">
          <TextField label="Özellik" value={gene.label ?? ''} placeholder={gene.letter} onChange={(label) => updateGene(i, { label })} />
          <TextField label="Baskın / çekinik" value={(gene.names ?? ['baskın', 'çekinik']).join(' / ')} onChange={(text) => updateGene(i, { names: text.split('/').map((x) => x.trim()) })} />
        </div>}
      </div>)}
      <div className="kit-chips"><button type="button" className="btn btn-secondary btn-sm" disabled={s.genes.length >= 3} onClick={addGene}>+ Gen ekle</button>
        <button type="button" className="btn btn-secondary btn-sm" disabled={s.genes.length <= 1} onClick={removeGene}>− Son geni çıkar</button></div>
    </Panel>
    <Panel title="Ebeveyn genotipleri">
      {[0, 1].map((k) => <div key={k} className="kit-row">{s.genes.map((gene, i) => <label key={i} className="field">
        <span className="field-label">{hasX ? (k === 0 ? 'Anne' : 'Baba') : `${k + 1}. ebeveyn`} · {gene.letter}</span>
        <select value={(k === 0 ? s.p1 : s.p2)[i]} onChange={(e) => set(k === 0 ? { p1: s.p1.map((v, j) => (j === i ? e.target.value : v)) } : { p2: s.p2.map((v, j) => (j === i ? e.target.value : v)) })}>
          {optionsFor(gene, k).map((g) => <option key={g} value={g}>{pretty(g)}</option>)}</select></label>)}</div>)}
    </Panel>
    <Panel title="Olasılık sorusu kur">
      {s.genes.map((gene, i) => <label key={i} className="field"><span className="field-label">{gene.label || gene.letter}</span>
        <select value={s.query[i] ?? 'any'} onChange={(e) => set({ query: s.genes.map((_, j) => (j === i ? e.target.value : s.query[j] ?? 'any')) })}>
          <option value="any">herhangi</option>{perGene[i].map((ph) => <option key={ph} value={ph}>{ph}</option>)}</select></label>)}
      {hasX && <Choice label="Kimler içinde?" options={[{ value: 'all', label: 'Tüm çocuklar' }, { value: 'male', label: 'Erkekler' }, { value: 'female', label: 'Kızlar' }]} value={s.sex} onChange={(sex) => set({ sex })} />}
      <p className="muted small">Uyan kareler Punnett karesinde vurgulanır.</p>
    </Panel>
    <Steps title="Kurallar" lines={['Her gen için gametlere alellerden biri geçer (1/2); farklı genler bağımsız dağılır.', 'Olasılıklar çarpılır: P(A_bb) = P(A_) · P(bb) = 3/4 · 1/4.', 'n heterozigot gen → 2ⁿ gamet çeşidi.', 'X\'e bağlı: erkek tek X taşır; çekinik alel erkekte hemen görünür.']} />
    {hasX && <Note>X'e bağlı gende 1. ebeveyn anne, 2. ebeveyn babadır.</Note>}
  </>} />;
}

const initial = { genes: PRESETS[1].genes, p1: ['Aa', 'Bb'], p2: ['Aa', 'Bb'], query: ['any', 'any'], sex: 'all' };

export default {
  Lab,
  initial,
  intro: 'Gen sayısını ve baskınlık türünü seç, ebeveynlerin genotiplerini gir: gametler, Punnett karesi, genotip ve fenotip oranları anında hesaplanır. "Olasılık sorusu kur" ile sınavdaki soruyu birebir sorabilirsin.',
  questions: [
    { id: 'dihibrit', title: 'Dihibrit: A_bb olasılığı', exam: 'TYT', topic: 'Kalıtım',
      stem: 'AaBb genotipli iki birey çaprazlanıyor (A ve B tam baskın, genler bağımsız). Oluşacak bireyin A_bb fenotipinde (A baskın, B çekinik) olma olasılığı kaçtır?',
      choices: { A: '1/16', B: '3/16', C: '1/4', D: '9/16', E: '3/8' }, answer: 'B',
      setup: { genes: [{ letter: 'A', type: 'tam' }, { letter: 'B', type: 'tam' }], p1: ['Aa', 'Bb'], p2: ['Aa', 'Bb'], query: ['A: baskın', 'B: çekinik'], sex: 'all' },
      build: 'İki tam baskın gen; iki ebeveyn de AaBb. Olasılık sorusunda A: baskın, B: çekinik seç.',
      look: 'Vurgulanan 3 kare / 16 kare. Ayrıca P(A_) = 3/4 ve P(bb) = 1/4 çarpımını düşün.',
      explanation: 'Genler bağımsız: P(A_) = 3/4, P(bb) = 1/4 → 3/4 · 1/4 = 3/16.',
      rule: 'Çok genli soruları genlere ayır, olasılıkları çarp. 16\'lık kareyi çizmek zorunda değilsin.' },
    { id: 'kan', title: 'Kan grubu 0 olasılığı', exam: 'TYT', topic: 'Kalıtım',
      stem: 'Kan grubu A (Iᴬi) olan bir anne ile kan grubu B (Iᴮi) olan bir babanın çocuğunun kan grubunun 0 olma olasılığı kaçtır?',
      choices: { A: '0', B: '1/8', C: '1/4', D: '1/2', E: '3/4' }, answer: 'C',
      setup: { genes: [{ letter: 'A', type: 'kan', label: 'Kan grubu' }], p1: ['IAi'], p2: ['IBi'], query: ['0 grubu'], sex: 'all' },
      build: 'Gen türü: Kan grubu (ABO). Ebeveynler Iᴬi ve Iᴮi. Sorgu: 0 grubu.',
      look: 'Dört kare: AB, A, B, 0 — her biri 1/4. İki A ve B ebeveynden dört grubun hepsi çıkabiliyor.',
      explanation: 'Gametler: Iᴬ, i ve Iᴮ, i. Çocuk: IᴬIᴮ (AB), Iᴬi (A), Iᴮi (B), ii (0) → her biri 1/4.',
      rule: 'Iᴬ ve Iᴮ eş baskın, i çekinik. 0 grubu için iki ebeveynden de i gelmeli.' },
    { id: 'renk', title: 'Renk körlüğü: erkek çocuklar içinde', exam: 'TYT', topic: 'Kalıtım',
      stem: 'Renk görme bakımından taşıyıcı (XᴬXᵃ) bir anne ile normal (XᴬY) bir babanın doğacak bir erkek çocuğunun renk körü olma olasılığı kaçtır?',
      choices: { A: '0', B: '1/4', C: '1/3', D: '1/2', E: '1' }, answer: 'D',
      setup: { genes: [{ letter: 'A', type: 'X', label: 'Renk görme', names: ['normal', 'renk körü'] }], p1: ['XAXa'], p2: ['XAY'], query: ['erkek renk körü'], sex: 'male' },
      build: 'Gen türü: X\'e bağlı. Anne XᴬXᵃ, baba XᴬY. Sorgu: erkek renk körü; "Kimler içinde?" → Erkekler.',
      look: '"Tüm çocuklar" seçince olasılık 1/4, "Erkekler" seçince 1/2. Kızların hiçbiri renk körü değil.',
      explanation: 'Erkek çocuklar X\'i anneden alır: Xᴬ ya da Xᵃ (yarı yarıya). Erkek çocuk olduğu biliniyorsa olasılık 1/2.\n(Tüm çocuklar içinde renk körü erkek olasılığı 1/4.)',
      rule: '"Doğacak bir erkek çocuğun" koşullu olasılıktır: yalnız erkekler içinde say.' },
    { id: 'eksik', title: 'Eksik baskınlıkta F2', exam: 'TYT', topic: 'Kalıtım',
      stem: 'Kırmızı ve beyaz çiçekli saf döl bitkilerin çaprazlanmasıyla pembe çiçekli F1 bireyleri elde ediliyor. F1 bireyleri kendi aralarında çaprazlanırsa F2\'de pembe çiçekli birey olma olasılığı kaçtır?',
      choices: { A: '1/4', B: '1/3', C: '1/2', D: '2/3', E: '3/4' }, answer: 'C',
      setup: { genes: [{ letter: 'A', type: 'eksik', label: 'Çiçek rengi', names: ['kırmızı', 'beyaz'] }], p1: ['Aa'], p2: ['Aa'], query: ['Çiçek rengi: ara fenotip'], sex: 'all' },
      build: 'Gen türü: Eksik baskın. F1 × F1: Aa × Aa. Sorgu: ara fenotip (pembe).',
      look: 'Fenotip oranı 1 : 2 : 1 — eksik baskınlıkta genotip oranı fenotip oranına eşit.',
      explanation: 'Aa × Aa → AA (kırmızı) 1/4, Aa (pembe) 1/2, aa (beyaz) 1/4. Pembe olma olasılığı 1/2.',
      rule: 'Eksik baskınlıkta heterozigot ara fenotiptir; 3 : 1 değil 1 : 2 : 1 görülür.' },
    { id: 'test', title: 'Test çaprazlamada fenotip çeşidi', exam: 'TYT', topic: 'Kalıtım',
      stem: 'AaBbDd genotipli bir birey aabbdd genotipli bir bireyle çaprazlanıyor (genler bağımsız, tam baskın). Oluşacak bireylerde kaç farklı fenotip görülebilir?',
      choices: { A: '2', B: '4', C: '6', D: '8', E: '16' }, answer: 'D',
      setup: { genes: [{ letter: 'A', type: 'tam' }, { letter: 'B', type: 'tam' }, { letter: 'D', type: 'tam' }], p1: ['Aa', 'Bb', 'Dd'], p2: ['aa', 'bb', 'dd'], query: ['any', 'any', 'any'], sex: 'all' },
      build: 'Üç gen (hepsi tam baskın). 1. ebeveyn AaBbDd, 2. ebeveyn aabbdd.',
      look: '"Gamet çeşidi" (8 × 1) ve "Farklı fenotip" satırları; her gametten farklı bir fenotip doğar.',
      explanation: 'Heterozigot ebeveyn 2³ = 8 çeşit gamet verir; aabbdd tek çeşit (abd). Her gamet farklı bir fenotip oluşturur → 8 fenotip, her biri 1/8.',
      rule: 'Test çaprazlamada yavru fenotipleri heterozigot ebeveynin gamet çeşitlerini doğrudan gösterir.' },
  ],
  tips: [
    { title: 'Genleri ayır, çarp', see: 'AaBb × AaBb, "… olma olasılığı"', look: 'Olasılık sorusu kur paneli.', rule: 'Her geni ayrı çaprazla (3/4, 1/4, 1/2...), sonuçları çarp.' },
    { title: 'Gamet çeşidi', see: '"kaç çeşit gamet", "test çaprazlama"', look: 'Gamet çipleri ve çeşit sayısı.', rule: 'Heterozigot gen sayısı n ise 2ⁿ gamet çeşidi.' },
    { title: 'Baskınlık türleri', see: '"ara renk", "her iki özellik birlikte", ABO', look: 'Gen türü seçimi.', rule: 'Tam: 3 : 1. Eksik ve eş baskın: 1 : 2 : 1. ABO: Iᴬ = Iᴮ > i.' },
    { title: 'X\'e bağlı kalıtım', see: '"renk körlüğü", "hemofili", "erkek çocuğun"', look: 'X\'e bağlı gen + Kimler içinde?', rule: 'Erkek X\'i anneden alır. Taşıyıcı anne → oğulların yarısı hasta.', trap: '"Erkek çocuğun" (koşullu) ile "erkek ve hasta çocuğun" olasılığı farklıdır.' },
  ],
};
