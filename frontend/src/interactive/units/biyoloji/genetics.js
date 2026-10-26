// Mendel kalıtımı (saf işlevler): bağımsız açılım, baskınlık türleri, ABO, X'e bağlı genler.
// Gen: { letter, type: 'tam' | 'eksik' | 'es' | 'kan' | 'X', names?: [baskın, çekinik] }

export const GENOTYPES = {
  tam: ['AA', 'Aa', 'aa'], eksik: ['AA', 'Aa', 'aa'], es: ['AA', 'Aa', 'aa'],
  kan: ['IAIA', 'IAi', 'IBIB', 'IBi', 'IAIB', 'ii'],
  Xf: ['XAXA', 'XAXa', 'XaXa'], Xm: ['XAY', 'XaY'],
};

/** Genotip metnini alellere ayırır (harf, gen türüne göre). */
export function allelesOf(genotype, gene) {
  if (gene.type === 'kan') return genotype.match(/IA|IB|i/g);
  if (gene.type === 'X') return genotype.match(/X[Aa]|Y/g);
  return genotype.split('');
}

const rank = (allele) => ({ IA: 0, IB: 1, i: 2, XA: 0, Xa: 1, Y: 2 }[allele] ?? (allele === allele.toUpperCase() ? 0 : 1));
const sortPair = (pair) => [...pair].sort((p, q) => rank(p) - rank(q));

/** Bir ebeveynin gametleri: bağımsız açılım; aynı gametler birleştirilir. */
export function gametes(parent, genes) {
  let list = [{ alleles: [], p: 1 }];
  genes.forEach((gene, i) => {
    const pair = allelesOf(parent[i], gene);
    list = list.flatMap((g) => pair.map((allele) => ({ alleles: [...g.alleles, allele], p: g.p / pair.length })));
  });
  const merged = new Map();
  for (const g of list) {
    const key = g.alleles.join('');
    merged.set(key, { alleles: g.alleles, p: (merged.get(key)?.p ?? 0) + g.p });
  }
  return [...merged.values()];
}

/** Bir genin fenotipi (Türkçe). */
export function phenotypeOf(pair, gene) {
  const d = gene.names?.[0] || 'baskın';
  const r = gene.names?.[1] || 'çekinik';
  const name = gene.label || gene.letter;
  if (gene.type === 'kan') {
    const set = new Set(pair);
    if (set.has('IA') && set.has('IB')) return 'AB grubu';
    if (set.has('IA')) return 'A grubu';
    if (set.has('IB')) return 'B grubu';
    return '0 grubu';
  }
  if (gene.type === 'X') {
    const male = pair.includes('Y');
    const affected = male ? pair.includes('Xa') : pair.every((a) => a === 'Xa');
    return `${male ? 'erkek' : 'kız'} ${affected ? r : d}`;
  }
  const dominant = pair.filter((a) => a === a.toUpperCase()).length;
  if (gene.type === 'tam') return `${name}: ${dominant ? d : r}`;
  if (gene.type === 'eksik') return `${name}: ${dominant === 2 ? d : dominant === 1 ? 'ara fenotip' : r}`;
  return `${name}: ${dominant === 2 ? d : dominant === 1 ? `${d} + ${r} (birlikte)` : r}`;
}

/** Çaprazlama: hücreler (Punnett), genotip ve fenotip dağılımları. */
export function cross(parent1, parent2, genes) {
  const g1 = gametes(parent1, genes);
  const g2 = gametes(parent2, genes);
  const cells = [];
  const genotypeDist = new Map();
  const phenotypeDist = new Map();
  for (const a of g1) {
    for (const b of g2) {
      const pairs = genes.map((gene, i) => sortPair([a.alleles[i], b.alleles[i]]));
      const genotype = pairs.map((p) => p.join('')).join(' ');
      const phenotype = pairs.map((p, i) => phenotypeOf(p, genes[i])).join(' · ');
      const male = pairs.some((p) => p.includes('Y'));
      const p = a.p * b.p;
      cells.push({ row: a, col: b, pairs, genotype, phenotype, p, male });
      genotypeDist.set(genotype, (genotypeDist.get(genotype) ?? 0) + p);
      phenotypeDist.set(phenotype, (phenotypeDist.get(phenotype) ?? 0) + p);
    }
  }
  return { g1, g2, cells, genotypeDist, phenotypeDist };
}

/** Olasılık: hücre koşulu (fenotip/genotip filtresi), isteğe bağlı cinsiyet koşulu. */
export function probability(result, predicate, sex = 'all') {
  const pool = result.cells.filter((c) => sex === 'all' || (sex === 'male' ? c.male : !c.male));
  const total = pool.reduce((sum, c) => sum + c.p, 0);
  if (!total) return 0;
  return pool.filter(predicate).reduce((sum, c) => sum + c.p, 0) / total;
}
