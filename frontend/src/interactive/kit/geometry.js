// Düzlem geometri çekirdeği (saf işlevler): uzaklık, açı, alan, özel doğrular, merkezler, sınıflama.

export const sub = ([ax, ay], [bx, by]) => [ax - bx, ay - by];
export const add = ([ax, ay], [bx, by]) => [ax + bx, ay + by];
export const mul = ([ax, ay], k) => [ax * k, ay * k];
export const dot = ([ax, ay], [bx, by]) => ax * bx + ay * by;
export const cross = ([ax, ay], [bx, by]) => ax * by - ay * bx;
export const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
export const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
export const lerp = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];

/** Q köşesindeki açı (derece), P–Q–R. */
export function angleAt(p, q, r) {
  const u = sub(p, q); const v = sub(r, q);
  const c = dot(u, v) / (Math.hypot(...u) * Math.hypot(...v));
  return (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
}

/** Çokgen alanı (ayakkabı bağı formülü), işaretsiz. */
export function polygonArea(points) {
  let sum = 0;
  points.forEach((p, i) => { const q = points[(i + 1) % points.length]; sum += p[0] * q[1] - q[0] * p[1]; });
  return Math.abs(sum) / 2;
}

/** P'den AB doğrusuna dik inen ayak. */
export function foot(p, a, b) {
  const ab = sub(b, a);
  const t = dot(sub(p, a), ab) / dot(ab, ab);
  return add(a, mul(ab, t));
}

/** İki doğrunun (p1p2 ve p3p4) kesişimi; paralelse null. */
export function intersect(p1, p2, p3, p4) {
  const d = cross(sub(p2, p1), sub(p4, p3));
  if (Math.abs(d) < 1e-12) return null;
  const t = cross(sub(p3, p1), sub(p4, p3)) / d;
  return add(p1, mul(sub(p2, p1), t));
}

export function centroid(a, b, c) { return [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3]; }

export function incenter(a, b, c) {
  const la = dist(b, c); const lb = dist(c, a); const lc = dist(a, b); const sum = la + lb + lc;
  return [(la * a[0] + lb * b[0] + lc * c[0]) / sum, (la * a[1] + lb * b[1] + lc * c[1]) / sum];
}

export function circumcenter(a, b, c) {
  const d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
  if (Math.abs(d) < 1e-12) return null;
  const s = (p) => p[0] * p[0] + p[1] * p[1];
  return [(s(a) * (b[1] - c[1]) + s(b) * (c[1] - a[1]) + s(c) * (a[1] - b[1])) / d, (s(a) * (c[0] - b[0]) + s(b) * (a[0] - c[0]) + s(c) * (b[0] - a[0])) / d];
}

/** Üçgenin bütün ölçüleri: kenarlar a=|BC|, b=|CA|, c=|AB|; açılar; alan; türler; merkezler. */
export function triangleInfo(A, B, C) {
  const a = dist(B, C); const b = dist(C, A); const c = dist(A, B);
  const alpha = angleAt(B, A, C); const beta = angleAt(A, B, C); const gamma = angleAt(A, C, B);
  const area = polygonArea([A, B, C]);
  const u = (a + b + c) / 2;
  const eq = (x, y) => Math.abs(x - y) < 1e-6 * Math.max(1, x, y);
  const right = [alpha, beta, gamma].findIndex((x) => Math.abs(x - 90) < 1e-6);
  const maxAngle = Math.max(alpha, beta, gamma);
  return {
    a, b, c, alpha, beta, gamma, area, perimeter: a + b + c, u,
    bySide: eq(a, b) && eq(b, c) ? 'eşkenar' : eq(a, b) || eq(b, c) || eq(a, c) ? 'ikizkenar' : 'çeşitkenar',
    byAngle: right >= 0 ? 'dik' : maxAngle > 90 ? 'geniş açılı' : 'dar açılı',
    rightAt: right >= 0 ? ['A', 'B', 'C'][right] : null,
    G: centroid(A, B, C), I: incenter(A, B, C), O: circumcenter(A, B, C),
    r: area / u, R: area > 1e-12 ? (a * b * c) / (4 * area) : Infinity,
    degenerate: area < 1e-9,
  };
}

/** SSS (üç kenar) ile üçgen yerleştirme: B orijinde, C x ekseninde. Üçgen eşitsizliği bozuksa null. */
export function placeBySides(a, b, c) {
  if (!(a > 0 && b > 0 && c > 0) || a >= b + c || b >= a + c || c >= a + b) return null;
  const x = (c * c - b * b + a * a) / (2 * a);
  const y = Math.sqrt(Math.max(0, c * c - x * x));
  return { A: [x, y], B: [0, 0], C: [a, 0] };
}

const parallel = (p, q, r, s) => Math.abs(cross(sub(q, p), sub(s, r))) < 1e-6 * dist(p, q) * dist(r, s);

/** Dörtgen sınıflaması (ABCD sırasıyla). */
export function quadInfo(A, B, C, D) {
  const ab = dist(A, B); const bc = dist(B, C); const cd = dist(C, D); const da = dist(D, A);
  const angles = [angleAt(D, A, B), angleAt(A, B, C), angleAt(B, C, D), angleAt(C, D, A)];
  const p1 = parallel(A, B, D, C); const p2 = parallel(B, C, A, D);
  const eq = (x, y) => Math.abs(x - y) < 1e-6 * Math.max(1, x, y);
  const right = angles.every((x) => Math.abs(x - 90) < 1e-6);
  const diag1 = dist(A, C); const diag2 = dist(B, D);
  const perpendicularDiagonals = Math.abs(dot(sub(C, A), sub(D, B))) < 1e-6 * diag1 * diag2;
  let type = 'dörtgen';
  if (p1 && p2) {
    const allEqual = eq(ab, bc) && eq(bc, cd) && eq(cd, da);
    type = right && allEqual ? 'kare' : right ? 'dikdörtgen' : allEqual ? 'eşkenar dörtgen' : 'paralelkenar';
  } else if (p1 || p2) type = 'yamuk';
  else if ((eq(ab, da) && eq(bc, cd)) || (eq(ab, bc) && eq(cd, da))) type = 'deltoid';
  return { sides: [ab, bc, cd, da], angles, type, diag1, diag2, perpendicularDiagonals, area: polygonArea([A, B, C, D]), O: intersect(A, C, B, D) };
}
