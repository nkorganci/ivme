// İdeal gaz hesapları (saf işlevler).
export const R = 22.4 / 273; // atm·L/(mol·K): normal koşullarda 1 mol gaz 22,4 L

export const GASES = { He: 4, Ne: 20, CH4: 16, N2: 28, O2: 32, CO2: 44, SO2: 64 };

/** PV = nRT: seçilen bilinmeyeni diğer üçünden hesaplar. */
export function solveGas({ solveFor, P, V, T, n }) {
  if (solveFor === 'P') return { P: (n * R * T) / V, V, T, n };
  if (solveFor === 'V') return { P, V: (n * R * T) / P, T, n };
  if (solveFor === 'T') return { P, V, T: (P * V) / (n * R), n };
  return { P, V, T, n: (P * V) / (R * T) };
}
