// DNA → mRNA → protein (saf işlevler). Standart genetik kod; amino asitler üç harfli kısaltmayla.
const CODE = {
  UUU: 'Phe', UUC: 'Phe', UUA: 'Leu', UUG: 'Leu', CUU: 'Leu', CUC: 'Leu', CUA: 'Leu', CUG: 'Leu',
  AUU: 'Ile', AUC: 'Ile', AUA: 'Ile', AUG: 'Met', GUU: 'Val', GUC: 'Val', GUA: 'Val', GUG: 'Val',
  UCU: 'Ser', UCC: 'Ser', UCA: 'Ser', UCG: 'Ser', CCU: 'Pro', CCC: 'Pro', CCA: 'Pro', CCG: 'Pro',
  ACU: 'Thr', ACC: 'Thr', ACA: 'Thr', ACG: 'Thr', GCU: 'Ala', GCC: 'Ala', GCA: 'Ala', GCG: 'Ala',
  UAU: 'Tyr', UAC: 'Tyr', UAA: 'DUR', UAG: 'DUR', CAU: 'His', CAC: 'His', CAA: 'Gln', CAG: 'Gln',
  AAU: 'Asn', AAC: 'Asn', AAA: 'Lys', AAG: 'Lys', GAU: 'Asp', GAC: 'Asp', GAA: 'Glu', GAG: 'Glu',
  UGU: 'Cys', UGC: 'Cys', UGA: 'DUR', UGG: 'Trp', CGU: 'Arg', CGC: 'Arg', CGA: 'Arg', CGG: 'Arg',
  AGU: 'Ser', AGC: 'Ser', AGA: 'Arg', AGG: 'Arg', GGU: 'Gly', GGC: 'Gly', GGA: 'Gly', GGG: 'Gly',
};
const DNA_PAIR = { A: 'T', T: 'A', G: 'C', C: 'G' };
const RNA_PAIR = { A: 'U', T: 'A', G: 'C', C: 'G' };
const ANTI = { A: 'U', U: 'A', G: 'C', C: 'G' };

export const cleanDNA = (text) => String(text ?? '').toUpperCase().replace(/[^ATGC]/g, '');
export const complement = (dna) => dna.split('').map((b) => DNA_PAIR[b]).join('');
/** Kalıp zincirden mRNA (eşleşme kuralıyla, U ile). */
export const transcribe = (template) => template.split('').map((b) => RNA_PAIR[b]).join('');
export const anticodon = (codon) => codon.split('').map((b) => ANTI[b]).join('');
export const aminoOf = (codon) => CODE[codon] ?? '?';

/** İlk AUG'dan başlayıp durdurucu kodona kadar okur. */
export function translate(mrna) {
  const start = mrna.indexOf('AUG');
  if (start < 0) return { start: -1, codons: [], protein: [], stop: null };
  const codons = []; const protein = []; let stop = null;
  for (let i = start; i + 3 <= mrna.length; i += 3) {
    const codon = mrna.slice(i, i + 3);
    const aa = aminoOf(codon);
    codons.push({ index: i, codon, aa });
    if (aa === 'DUR') { stop = codon; break; }
    protein.push(aa);
  }
  return { start, codons, protein, stop };
}

/** Çift zincirli DNA sayımları (Chargaff, hidrojen ve fosfodiester bağları). */
export function countsFromStrand(strand) {
  const other = complement(strand);
  const all = strand + other;
  const count = (b) => all.split('').filter((x) => x === b).length;
  const A = count('A'); const G = count('G');
  return countsFromComposition(A, G, strand.length);
}
/** A ve G sayısından (çift zincirde) bütün sayımlar. */
export function countsFromComposition(A, G, perStrand = A + G) {
  const T = A; const C = G;
  const total = A + T + G + C;
  return { A, T, G, C, total, pairs: total / 2, hBonds: 2 * A + 3 * G, phosphodiester: total - 2, deoxyribose: total, phosphate: total, replicationNeed: total, perStrand };
}

/** Mutasyon: konum (0'dan), tür ve yeni baz; kalıp zincire uygulanır. */
export function mutate(strand, { kind, position, base }) {
  if (position < 0 || position > strand.length) return strand;
  if (kind === 'degisim') return strand.slice(0, position) + base + strand.slice(position + 1);
  if (kind === 'ekleme') return strand.slice(0, position) + base + strand.slice(position);
  if (kind === 'eksilme') return strand.slice(0, position) + strand.slice(position + 1);
  return strand;
}

/** Proteinleri karşılaştırıp mutasyonun etkisini adlandırır. */
export function classify(before, after, kind) {
  const same = before.protein.join('-') === after.protein.join('-') && before.stop === after.stop;
  if (same) return 'sessiz: protein değişmedi (aynı amino asidi kodlayan kodon)';
  if (kind !== 'degisim') return 'çerçeve kayması: okuma çerçevesi kaydı, sonraki bütün kodonlar değişti';
  if (after.protein.length < before.protein.length && after.stop) return 'anlamsız: erken durdurucu kodon, protein kısaldı';
  return 'yanlış anlamlı: tek bir amino asit değişti';
}
