export const DIVISION_CONTROLS = {
  'bolme-basamak': [
    { key: 'a', label: 'Yüzler rakamı', value: 3, min: 0, max: 9, step: 1 },
    { key: 'd', label: 'Bölen', value: 4, options: [[4, '4 · son iki basamak'], [9, '9 · rakamlar toplamı']] },
  ],
  'bolme-bilesik': [
    { key: 'n', label: 'Kart sayısı', value: 12, min: 1, max: 36, step: 1 },
    { key: 'pair', label: 'İki kontrol', value: 0, options: [[0, '3 ve 4'], [1, '2 ve 6'], [2, '4 ve 9']] },
  ],
  'bolme-dongu': [{ key: 'n', label: '3’ün üssü', value: 6, min: 1, max: 24, step: 1 }],
};

export function divisionModel(id, v) {
  if (id === 'bolme-basamak') {
    const n = 2016 + 100 * v.a, sum = 9 + v.a;
    return { kind: 'division-place', ...v, n, r: n % v.d, sum,
      equation: `${n} = ${v.d} × ${Math.floor(n / v.d)} + ${n % v.d}`,
      observation: v.d === 4
        ? `${n} = ${20 + v.a}×100 + 16. Yüzlükler 4’e tam bölünür; yalnız 16’ya bakarız: kalan 0. Yüzler rakamını değiştirmek kalanı değiştirmez.`
        : `Rakamlar toplamı 2+${v.a}+1+6=${sum}; 9 ile kalan ${sum % 9}. Yüzler rakamı 1 arttığında sayı 100 artar; 100=9×11+1 olduğundan kalan bir adım ilerler.` };
  }
  if (id === 'bolme-bilesik') {
    const [a, b] = [[3, 4], [2, 6], [4, 9]][v.pair];
    return { kind: 'division-filters', ...v, a, b, product: a * b,
      results: [v.n % a === 0, v.n % b === 0, v.n % (a * b) === 0],
      equation: `${v.n} ÷ ${a}: kalan ${v.n % a} · ${v.n} ÷ ${b}: kalan ${v.n % b}`,
      observation: v.pair === 1
        ? `2 ve 6 aralarında asal değil. ${v.n} sayısının 12 ile kalanı ${v.n % 12}. 6’yı seç: ilk iki kutu geçer, 12 kutusu geçmez; iki koşul çarpımı garanti etmez.`
        : `${a} ve ${b} aralarında asal. İki kontrol de geçtiğinde ${a * b} kontrolü de geçer. ${v.n % (a * b) === 0 ? 'Seçilen sayı üç kontrolden de geçti.' : 'Seçilen sayı en az bir koşulu sağlamıyor.'}` };
  }
  if (id === 'bolme-dongu') {
    const cycle = [3, 4, 2, 1], index = (v.n - 1) % 4;
    return { kind: 'division-cycle', ...v, cycle, index, r: cycle[index],
      equation: `Üs: ${v.n} = 4 × ${Math.floor(v.n / 4)} + ${v.n % 4} · Sayının 5 ile kalanı: ${cycle[index]}`,
      observation: `${v.n % 4 === 0 ? 'Üs 4’ün katı: son kutuyu seçeriz.' : `Üssün 4 ile kalanı ${v.n % 4}: ${index + 1}. kutuyu seçeriz.`} 3’ün ${v.n}. kuvvetinin 5 ile kalanı ${cycle[index]}. Üssün kalanı ile sayının kalanı farklı görevlerdedir.` };
  }
  return null;
}
