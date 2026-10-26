import { Choice, LabGrid, Note, NumberField, Panel, Readouts, Slider, Steps, TextField } from '../../kit/controls.jsx';
import { anticodon, classify, cleanDNA, complement, countsFromComposition, countsFromStrand, mutate, transcribe, translate } from './dna.js';

const BASE_TONE = { A: 'var(--pen-red)', T: 'var(--pen-blue)', U: 'var(--pen-blue)', G: 'var(--pen-green)', C: 'var(--warn)' };
const PRESETS = [
  { label: 'Kısa gen (3 amino asit)', strand: 'TACAAACCGATT' },
  { label: 'Ala içeren gen', strand: 'TACCGAATT' },
  { label: 'Uzun gen', strand: 'TACGGTCTTAAACGTACCATT' },
  { label: 'Başlangıçtan önce baz var', strand: 'GCTACTTTCGAGACT' },
];

function Strand({ letters, label, onPick, picked, highlight, ends }) {
  return <div className="dna-row">
    <span className="dna-label">{label}</span>
    <span className="dna-end">{ends[0]}</span>
    <div className="dna-bases">{letters.split('').map((b, i) => <button key={i} type="button" className={`dna-base${picked === i ? ' picked' : ''}${highlight?.has(i) ? ' hl' : ''}`}
      style={{ '--tone': BASE_TONE[b] }} onClick={onPick ? () => onPick(i) : undefined} disabled={!onPick} aria-label={`${i + 1}. baz ${b}`}>{b}</button>)}</div>
    <span className="dna-end">{ends[1]}</span>
  </div>;
}

function Bonds({ strand }) {
  return <div className="dna-row dna-bonds" aria-hidden="true"><span className="dna-label" /><span className="dna-end" />
    <div className="dna-bases">{strand.split('').map((b, i) => <span key={i} className="dna-bond">{b === 'G' || b === 'C' ? '┆┆┆' : '┆┆'}</span>)}</div><span className="dna-end" /></div>;
}

function Translation({ mrna, result, step, label, diff }) {
  const shown = result.codons.slice(0, step + 1);
  return <div className="dna-translate">
    <div className="dna-row"><span className="dna-label">{label}</span><span className="dna-end">5′</span>
      <div className="dna-bases">{mrna.split('').map((b, i) => {
        const inFrame = result.start >= 0 && i >= result.start && i < (result.codons.at(-1)?.index ?? -1) + 3;
        const codonIndex = inFrame ? Math.floor((i - result.start) / 3) : -1;
        return <span key={i} className={`dna-base rna${inFrame ? ` frame f${codonIndex % 2}` : ''}${codonIndex === step ? ' reading' : ''}${diff?.has(codonIndex) ? ' changed' : ''}`} style={{ '--tone': BASE_TONE[b] }}>{b}</span>;
      })}</div><span className="dna-end">3′</span></div>
    {result.start < 0 ? <p className="muted small">Bu mRNA'da başlangıç kodonu (AUG) yok: protein sentezlenmez.</p> : <div className="dna-chain">
      {shown.map((c, k) => <span key={k} className={`dna-aa${c.aa === 'DUR' ? ' stop' : ''}${diff?.has(k) ? ' changed' : ''}`} title={`${c.codon} → ${c.aa}`}>
        <small>{c.codon}</small><strong>{c.aa === 'DUR' ? 'DUR' : c.aa}</strong><small>tRNA: {c.aa === 'DUR' ? '—' : anticodon(c.codon)}</small></span>)}
    </div>}
  </div>;
}

function Lab({ value: s, onChange }) {
  const set = (patch) => onChange({ ...s, ...patch });
  const strand = cleanDNA(s.strand);
  const other = complement(strand);
  const template = s.template === 1 ? strand : other;
  const mrna = transcribe(template);
  const result = translate(mrna);
  const step = Math.min(s.step, Math.max(0, result.codons.length - 1));
  const counts = countsFromStrand(strand);
  const mutated = s.mutation.kind !== 'none' ? mutate(strand, s.mutation) : null;
  const mutTemplate = mutated ? (s.template === 1 ? mutated : complement(mutated)) : null;
  const mutMrna = mutTemplate ? transcribe(mutTemplate) : null;
  const mutResult = mutMrna ? translate(mutMrna) : null;
  const diff = mutResult ? new Set(mutResult.codons.map((c, k) => (result.codons[k]?.aa !== c.aa ? k : -1)).filter((k) => k >= 0)) : null;
  const calc = countsFromComposition(s.calcA, s.calcG);
  const L = s.calcL; const codonsL = Math.floor(L / 3);
  const aa = result.protein.length;
  return <LabGrid top={<div className="kit-row">
    <TextField wide label="DNA (1. zincir)" value={s.strand} onChange={(v) => set({ strand: v, step: 0 })} hint="Yalnız A, T, G, C. Başlangıç için kalıp zincirde TAC (mRNA'da AUG) olmalı." />
    <div className="kit-chips">{PRESETS.map((p) => <button key={p.label} type="button" className="ml-event-chip" onClick={() => set({ strand: p.strand, step: 0, mutation: { ...s.mutation, kind: 'none' } })}>{p.label}</button>)}</div>
  </div>} visual={<>
    <div className="kit-card dna-card">
      <Strand letters={strand} label={s.template === 1 ? 'Kalıp (1)' : '1. zincir'} ends={s.template === 1 ? ['3′', '5′'] : ['5′', '3′']} onPick={(i) => set({ mutation: { ...s.mutation, position: i, kind: s.mutation.kind === 'none' ? 'degisim' : s.mutation.kind } })} picked={s.mutation.kind !== 'none' ? s.mutation.position : null} />
      <Bonds strand={strand} />
      <Strand letters={other} label={s.template === 2 ? 'Kalıp (2)' : '2. zincir'} ends={s.template === 2 ? ['3′', '5′'] : ['5′', '3′']} />
      <p className="muted small">Bir baza tıkla: mutasyon o noktaya uygulanır. Çizgiler hidrojen bağlarıdır (A=T: 2, G≡C: 3).</p>
      <Translation mrna={mrna} result={result} step={step} label="mRNA" />
      {mutResult && <><Translation mrna={mutMrna} result={mutResult} step={mutResult.codons.length - 1} label="Mutant mRNA" diff={diff} />
        <Note tone={classify(result, mutResult, s.mutation.kind).startsWith('sessiz') ? 'ok' : 'warn'}>{classify(result, mutResult, s.mutation.kind)}</Note></>}
    </div>
    <Readouts title="Sayımlar (bu DNA için, canlı)" items={[
      ['Nükleotitler (çift zincir)', `A = ${counts.A} · T = ${counts.T} · G = ${counts.G} · C = ${counts.C} → toplam ${counts.total}`],
      ['Hidrojen bağı', `2·A + 3·G = 2·${counts.A} + 3·${counts.G} = ${counts.hBonds}`, 'ok'],
      ['Fosfodiester bağı', `toplam nükleotit − 2 = ${counts.phosphodiester}`],
      ['mRNA', `${mrna.length} nükleotit; okunan kodon ${result.codons.length}${result.stop ? ` (durdurucu ${result.stop} dahil)` : ''}`],
      ['Amino asit / peptit bağı', `${aa} amino asit · ${Math.max(0, aa - 1)} peptit bağı · ${Math.max(0, aa - 1)} su açığa çıkar`, 'ok'],
      ['Kullanılan tRNA', `${aa} (her amino asidi bir tRNA taşır; durdurucu kodona tRNA gelmez)`],
      ['Chargaff', `(A + G) / (T + C) = ${counts.T + counts.C ? ((counts.A + counts.G) / (counts.T + counts.C)).toFixed(2).replace('.', ',') : '—'}`],
    ]} />
  </>} side={<>
    <Panel title="Okuma">
      <Choice label="Kalıp zincir" options={[{ value: 1, label: '1. zincir' }, { value: 2, label: '2. zincir' }]} value={s.template} onChange={(template) => set({ template, step: 0 })} />
      {result.codons.length > 1 && <Slider label={`Ribozom: ${step + 1}. kodon (${result.codons[step]?.codon ?? ''})`} value={step + 1} min={1} max={result.codons.length} step={1} onChange={(v) => set({ step: Math.max(0, v - 1) })} />}
    </Panel>
    <Panel title="Mutasyon">
      <Choice options={[{ value: 'none', label: 'Yok' }, { value: 'degisim', label: 'Baz değişimi' }, { value: 'ekleme', label: 'Ekleme' }, { value: 'eksilme', label: 'Eksilme' }]} value={s.mutation.kind} onChange={(kind) => set({ mutation: { ...s.mutation, kind } })} />
      {s.mutation.kind !== 'none' && <><Slider label="Konum (1. zincirde)" value={s.mutation.position} min={0} max={Math.max(0, strand.length - 1)} step={1} onChange={(position) => set({ mutation: { ...s.mutation, position } })} />
        {s.mutation.kind !== 'eksilme' && <Choice label="Yeni baz" options={['A', 'T', 'G', 'C'].map((b) => ({ value: b, label: b }))} value={s.mutation.base} onChange={(base) => set({ mutation: { ...s.mutation, base } })} />}</>}
    </Panel>
    <Panel title="Sayılardan hesapla">
      <div className="kit-row"><NumberField label="A sayısı (çift zincir)" value={s.calcA} onChange={(calcA) => set({ calcA: Math.max(0, Math.round(calcA)) })} width={150} />
        <NumberField label="G sayısı (çift zincir)" value={s.calcG} onChange={(calcG) => set({ calcG: Math.max(0, Math.round(calcG)) })} width={150} /></div>
      <Readouts items={[['T, C', `${calc.T}, ${calc.C}`], ['Toplam nükleotit', calc.total], ['Hidrojen bağı', calc.hBonds, 'ok'], ['Fosfodiester bağı', calc.phosphodiester], ['Bir eşlenmede gereken serbest nükleotit', calc.replicationNeed]]} />
      <NumberField label="mRNA uzunluğu (nükleotit)" value={s.calcL} onChange={(calcL) => set({ calcL: Math.max(0, Math.round(calcL)) })} width={200} />
      <Readouts items={[['Kodon', codonsL], ['Amino asit (son kodon DUR)', Math.max(0, codonsL - 1), 'ok'], ['Peptit bağı = su', Math.max(0, codonsL - 2)]]} />
    </Panel>
    <Steps title="Kurallar" lines={['DNA eşleşmesi: A–T, G–C. Transkripsiyonda T yerine U: kalıptaki A → mRNA\'da U.', 'Okuma ilk AUG\'dan başlar, durdurucu kodonda (UAA, UAG, UGA) biter; durdurucu amino asit kodlamaz.', 'n amino asit → n − 1 peptit bağı ve n − 1 su.', 'Tek baz eklenmesi/eksilmesi okuma çerçevesini kaydırır.']} />
  </>} />;
}

const initial = { strand: 'TACAAACCGATT', template: 1, step: 0, mutation: { kind: 'none', position: 4, base: 'G' }, calcA: 60, calcG: 40, calcL: 300 };

export default {
  Lab,
  initial,
  intro: 'DNA dizisini yaz (ya da hazır geni seç): tamamlayıcı zincir, hidrojen bağları, mRNA, kodonlar, antikodonlar ve amino asit zinciri anında oluşur. Bir baza tıklayıp mutasyon uygula; protein nasıl değişiyor, yan yana gör.',
  questions: [
    { id: 'hbag', title: 'Hidrojen bağı sayısı', exam: 'AYT', topic: 'Nükleik asitler',
      stem: 'Çift zincirli bir DNA molekülünde 60 adenin ve 40 sitozin nükleotidi bulunmaktadır. Bu molekülde kaç hidrojen bağı vardır?',
      choices: { A: '200', B: '220', C: '240', D: '260', E: '300' }, answer: 'C',
      setup: { calcA: 60, calcG: 40 },
      build: '"Sayılardan hesapla" panelinde A = 60, G = 40 gir (C = G olduğundan sitozin sayısı guanine eşittir).',
      look: 'Hidrojen bağı satırı 2·A + 3·G formülünü uygular.',
      explanation: 'A = T = 60 (60 A–T çifti, 2\'şer bağ) ve G = C = 40 (40 G–C çifti, 3\'er bağ).\n2·60 + 3·40 = 120 + 120 = 240.',
      rule: 'A–T arasında 2, G–C arasında 3 hidrojen bağı. Önce Chargaff ile eksik bazları bul.' },
    { id: 'peptit', title: 'Peptit bağı sayısı', exam: 'AYT', topic: 'Protein sentezi',
      stem: '5′-AUG UUU GGC UAA-3′ dizisine sahip mRNA\'dan sentezlenen polipeptitte kaç peptit bağı bulunur?',
      choices: { A: '1', B: '2', C: '3', D: '4', E: '12' }, answer: 'B',
      setup: { strand: 'TACAAACCGATT', template: 1, step: 3, mutation: { kind: 'none', position: 4, base: 'G' } },
      build: 'DNA\'ya bu mRNA\'nın kalıbını yaz: TACAAACCGATT (kalıp 1. zincir). Ribozomu son kodona getir.',
      look: 'Zincirde Met–Phe–Gly ve DUR: 3 amino asit. Durdurucu kodon amino asit eklemez.',
      explanation: 'AUG (Met), UUU (Phe), GGC (Gly), UAA (dur) → 3 amino asit → 3 − 1 = 2 peptit bağı.',
      rule: 'Amino asit sayısı = kodon sayısı − 1 (durdurucu); peptit bağı = amino asit − 1.' },
    { id: 'cerceve', title: 'Hangi mutasyon daha yıkıcı?', exam: 'AYT', topic: 'Genetik şifre',
      stem: 'Bir genin başlangıç kodonundan hemen sonraki bölgede meydana gelen aşağıdaki değişikliklerden hangisi genellikle proteinde en fazla amino asidin değişmesine yol açar?',
      choices: { A: 'Bir kodonun üçüncü bazının, aynı amino asidi kodlayacak biçimde değişmesi', B: 'Tek bir nükleotidin çıkması (eksilme)', C: 'Durdurucu kodondan sonra bir baz eklenmesi', D: 'Son kodonda tek baz değişimi', E: 'Bir intron bölgesinde baz değişimi' }, answer: 'B',
      setup: { strand: 'TACGGTCTTAAACGTACCATT', template: 1, mutation: { kind: 'eksilme', position: 4, base: 'G' } },
      build: 'Hazır "Uzun gen". Mutasyon: Eksilme, konum 4. Sonra türü "Baz değişimi" yapıp karşılaştır.',
      look: 'Eksilmede mutant zincirin bütün kodonları kırmızılaşıyor (çerçeve kayması); tek baz değişiminde çoğu zaman tek amino asit değişiyor ya da hiçbiri.',
      explanation: 'Tek nükleotit eksilmesi okuma çerçevesini kaydırır; sonrasındaki bütün kodonlar değişir (çoğu kez erken DUR da oluşur).\nÜçüncü baz değişimleri çoğu zaman sessizdir; durdurucudan sonraki değişiklik proteine yansımaz.',
      rule: 'Çerçeve kayması (3\'ün katı olmayan ekleme/eksilme) en yıkıcı nokta mutasyonudur.' },
    { id: 'antikodon', title: 'tRNA antikodonu', exam: 'AYT', topic: 'Protein sentezi',
      stem: 'mRNA\'daki GCU kodonuna karşılık gelen tRNA antikodonu aşağıdakilerden hangisidir?',
      choices: { A: 'CGA', B: 'GCT', C: 'CGU', D: 'UGA', E: 'GCA' }, answer: 'A',
      setup: { strand: 'TACCGAATT', template: 1, step: 1, mutation: { kind: 'none', position: 4, base: 'G' } },
      build: 'Hazır "Ala içeren gen" (TACCGAATT). Ribozomu 2. kodona (GCU) getir.',
      look: 'Amino asit kutucuğunun altında tRNA antikodonu yazar; RNA olduğu için T değil U kullanılır.',
      explanation: 'Antikodon kodonla eşleşir: G–C, C–G, U–A → CGA. (RNA\'da timin bulunmaz.)',
      rule: 'Antikodon = kodonun tamamlayıcısı (RNA eşleşmesi: A–U, G–C).' },
    { id: 'uzunluk', title: 'mRNA uzunluğundan amino asit', exam: 'AYT', topic: 'Protein sentezi',
      stem: 'Başlangıç kodonundan durdurucu kodona kadar tamamı okunan 300 nükleotitlik bir mRNA\'dan kaç amino asitlik polipeptit sentezlenir?',
      choices: { A: '98', B: '99', C: '100', D: '150', E: '300' }, answer: 'B',
      setup: { calcL: 300 },
      build: '"Sayılardan hesapla": mRNA uzunluğu 300.',
      look: '100 kodondan biri durdurucu: amino asit 99, peptit bağı 98.',
      explanation: '300 / 3 = 100 kodon. Son kodon durdurucu olduğundan amino asit kodlamaz → 99 amino asit.',
      rule: 'Kodon = nükleotit / 3; amino asit = kodon − 1 (durdurucu).' },
  ],
  tips: [
    { title: 'Sayım soruları', see: '"hidrojen bağı", "nükleotit sayısı", "fosfodiester"', look: 'Sayılardan hesapla paneli.', rule: 'A = T, G = C. H bağı = 2A + 3G. Fosfodiester = toplam nükleotit − 2 (doğrusal çift zincir).' },
    { title: 'Transkripsiyon ve translasyon', see: 'DNA kalıbı, mRNA, kodon, antikodon', look: 'Kalıp seçimi, ribozom kaydırıcısı.', rule: 'Kalıp DNA → mRNA (T yerine U). Okuma AUG\'dan durdurucuya. Antikodon kodonun tamamlayıcısı.', trap: 'Durdurucu kodon amino asit kodlamaz, tRNA gelmez.' },
    { title: 'Mutasyon etkisi', see: '"baz değişimi", "eklenme", "çıkarılma"', look: 'Mutasyon paneli: mutant protein ile karşılaştır.', rule: 'Değişim: sessiz / yanlış anlamlı / anlamsız. Ekleme/eksilme: çerçeve kayması.' },
    { title: 'Bağ ve su sayıları', see: '"peptit bağı", "açığa çıkan su"', look: 'Amino asit / peptit bağı satırı.', rule: 'n amino asit → n − 1 peptit bağı → n − 1 su (dehidrasyon).' },
  ],
};
