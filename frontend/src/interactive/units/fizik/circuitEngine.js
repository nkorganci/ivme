// Seri–paralel devre çözücü (saf işlevler). Düğümler:
//   { id, type: 'R' | 'L' | 'K', name, r, closed }  R direnç, L ampul, K anahtar (kapalı = tel, açık = ∞)
//   { id, type: 'S' | 'P', children: [...] }          S seri grup, P paralel grup

export const resistanceOf = (node) => {
  if (node.type === 'K') return node.closed ? 0 : Infinity;
  if (node.type === 'R' || node.type === 'L') return node.r;
  const values = node.children.map(resistanceOf);
  if (node.type === 'S') return values.some((v) => v === Infinity) ? Infinity : values.reduce((p, v) => p + v, 0);
  if (values.some((v) => v === 0)) return 0;
  const finite = values.filter((v) => v !== Infinity);
  return finite.length ? 1 / finite.reduce((p, v) => p + 1 / v, 0) : Infinity;
};

/** Devreyi çözer: her düğüm için akım I, gerilim V, güç P. */
export function solveCircuit(root, emf, internal = 0) {
  const Req = resistanceOf(root);
  const total = Req + internal;
  const short = total === 0;
  const I = short || Req === Infinity ? 0 : emf / total;
  const out = new Map();
  const assign = (node, current, voltage) => {
    out.set(node.id, { I: current, V: voltage, P: current * voltage, R: resistanceOf(node) });
    if (node.type === 'S') {
      const values = node.children.map(resistanceOf);
      const finiteDrop = values.reduce((p, v) => (v === Infinity ? p : p + current * v), 0);
      const openCount = values.filter((v) => v === Infinity).length;
      node.children.forEach((child, i) => {
        const v = values[i] === Infinity ? (voltage - finiteDrop) / openCount : current * values[i];
        assign(child, current, v);
      });
    } else if (node.type === 'P') {
      const values = node.children.map(resistanceOf);
      const zero = values.filter((v) => v === 0).length;
      node.children.forEach((child, i) => {
        const v = values[i];
        const c = zero ? (v === 0 ? current / zero : 0) : v === Infinity ? 0 : voltage / v;
        assign(child, c, voltage);
      });
    }
  };
  assign(root, I, short ? 0 : emf - I * internal);
  return { Req, I, short, values: out };
}

/** Eşdeğer direnç yazımı: 6 + (6 ∥ 3 = 2). */
export function equivalentText(node) {
  const value = resistanceOf(node);
  const show = (v) => (v === Infinity ? '∞' : Number(v.toFixed(3)).toString().replace('.', ','));
  if (node.type === 'K') return node.closed ? '0' : '∞';
  if (node.type === 'R' || node.type === 'L') return show(node.r);
  const parts = node.children.map((child) => (node.type === 'P' && child.type === 'S' ? `(${equivalentText(child)})` : equivalentText(child)));
  if (node.type === 'S') return parts.join(' + ');
  return `(${parts.join(' ∥ ')} = ${show(value)})`;
}

export function walk(node, fn, parent = null) {
  fn(node, parent);
  if (node.children) node.children.forEach((child) => walk(child, fn, node));
}
export const leaves = (root) => { const out = []; walk(root, (n) => { if (!n.children) out.push(n); }); return out; };
export const findNode = (root, id) => { let hit = null; walk(root, (n) => { if (n.id === id) hit = n; }); return hit; };

const clone = (node) => JSON.parse(JSON.stringify(node));
const nextId = (root) => { let max = 0; walk(root, (n) => { const k = Number(String(n.id).replace(/\D/g, '')); if (k > max) max = k; }); return `e${max + 1}`; };

/** Gruplar tek elemana inerse sadeleştirilir; iç içe aynı tür gruplar birleşir. */
function tidy(node) {
  if (!node.children) return node;
  let children = node.children.map(tidy).flatMap((c) => (c.type === node.type ? c.children : [c]));
  if (children.length === 1) return children[0];
  return { ...node, children };
}

function replace(root, id, make) {
  if (root.id === id) return make(root, null);
  if (!root.children) return root;
  return { ...root, children: root.children.map((child) => replace(child, id, make)) };
}

export function addInSeries(root, id, element) {
  const tree = clone(root);
  const fresh = { ...element, id: nextId(tree) };
  const parent = (() => { let p = null; walk(tree, (n, par) => { if (n.id === id) p = par; }); return p; })();
  if (parent && parent.type === 'S') {
    const index = parent.children.findIndex((c) => c.id === id);
    parent.children.splice(index + 1, 0, fresh);
    return tidy(tree);
  }
  return tidy(replace(tree, id, (node) => ({ id: `${fresh.id}s`, type: 'S', children: [node, fresh] })));
}

export function addInParallel(root, id, element) {
  const tree = clone(root);
  const fresh = { ...element, id: nextId(tree) };
  return tidy(replace(tree, id, (node) => ({ id: `${fresh.id}p`, type: 'P', children: [node, fresh] })));
}

export function removeNode(root, id) {
  if (root.id === id) return root;
  const prune = (node) => {
    if (!node.children) return node;
    const children = node.children.filter((c) => c.id !== id).map(prune);
    return { ...node, children };
  };
  const tree = tidy(prune(clone(root)));
  return tree.children && tree.children.length === 0 ? root : tree;
}

export function updateNode(root, id, patch) {
  return replace(clone(root), id, (node) => ({ ...node, ...patch }));
}

/** Şema yerleşimi: her düğüm için kutu (x, y, w, h). Seri yatay, paralel dikey dizilir. */
export const CELL = { w: 118, h: 78, rail: 22 };
export function measure(node) {
  if (!node.children) return { w: CELL.w, h: CELL.h };
  const sizes = node.children.map(measure);
  if (node.type === 'S') return { w: sizes.reduce((p, s) => p + s.w, 0), h: Math.max(...sizes.map((s) => s.h)) };
  return { w: Math.max(...sizes.map((s) => s.w)) + 2 * CELL.rail, h: sizes.reduce((p, s) => p + s.h, 0) };
}
export function layout(node, x, y, boxes = []) {
  const size = measure(node);
  boxes.push({ node, x, y, w: size.w, h: size.h });
  if (node.children) {
    if (node.type === 'S') {
      let cx = x;
      for (const child of node.children) { const s = measure(child); layout(child, cx, y + (size.h - s.h) / 2, boxes); cx += s.w; }
    } else {
      let cy = y;
      for (const child of node.children) { const s = measure(child); layout(child, x + CELL.rail + (size.w - 2 * CELL.rail - s.w) / 2, cy, boxes); cy += s.h; }
    }
  }
  return boxes;
}
