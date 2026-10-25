// Öğretim görseli şablonlarının parametre sözleşmesi. İçerik aktarılmadan önce ve
// ön yüzde çizimden önce aynı denetim çalışır; geçersiz görsel sessizce çizilmez.
import { compileExpr, compileLogic } from './expr.js';

export const TONES = ['navy', 'ok', 'bad', 'warn', 'ink', 'focus', 'line'];
export const TEMPLATES = ['number-line', 'timeline', 'plot', 'geometry', 'diagram', 'venn', 'tokens', 'bar-model',
  'particles', 'motion', 'grid', 'circuit', 'sun-angle', 'truth-table'];

const isNumber = (value) => typeof value === 'number' && Number.isFinite(value);
const isText = (value, max = 400) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;

function checker(prefix) {
  const errors = [];
  const ids = new Set();
  const api = {
    errors,
    ids,
    fail: (message) => errors.push(`${prefix}: ${message}`),
    number: (value, label) => { if (!isNumber(value)) api.fail(`${label} sayı olmalı`); },
    text: (value, label, max) => { if (!isText(value, max)) api.fail(`${label} metin olmalı`); },
    optionalText: (value, label, max) => { if (value !== undefined && !isText(value, max)) api.fail(`${label} metin olmalı`); },
    tone: (value, label) => { if (value !== undefined && !TONES.includes(value)) api.fail(`${label} rengi ${TONES.join('/')} olmalı`); },
    array: (value, label, min = 0, max = 200) => {
      if (!Array.isArray(value) || value.length < min || value.length > max) {
        api.fail(`${label} ${min}-${max} öğeli dizi olmalı`);
        return [];
      }
      return value;
    },
    id: (value, label) => {
      if (typeof value !== 'string' || !/^[A-Za-z0-9:_.-]{1,40}$/.test(value)) api.fail(`${label} kimliği geçersiz`);
      else if (ids.has(value)) api.fail(`${label} kimliği tekrar ediyor: ${value}`);
      else ids.add(value);
    },
    expr: (value, variables, label) => {
      try { compileExpr(value, variables); } catch (error) { api.fail(`${label} ifadesi çözülemedi (${error.message})`); }
    },
  };
  return api;
}

function sliders(c, list) {
  const names = [];
  c.array(list ?? [], 'sliders', 0, 4).forEach((slider, index) => {
    if (!/^[a-z][a-z0-9]{0,9}$/.test(slider?.name ?? '') || ['x', 'pi', 'e'].includes(slider.name)) c.fail(`sliders[${index}].name geçersiz`);
    else names.push(slider.name);
    c.text(slider?.label, `sliders[${index}].label`, 80);
    ['min', 'max', 'step', 'value'].forEach((key) => c.number(slider?.[key], `sliders[${index}].${key}`));
    if (isNumber(slider?.min) && isNumber(slider?.max) && (slider.min >= slider.max || slider.value < slider.min || slider.value > slider.max)) {
      c.fail(`sliders[${index}] aralığı geçersiz`);
    }
  });
  return names;
}

const validators = {
  'number-line'(c, p) {
    c.number(p.min, 'min'); c.number(p.max, 'max');
    if (isNumber(p.min) && isNumber(p.max) && p.min >= p.max) c.fail('min < max olmalı');
    if (p.step !== undefined) c.number(p.step, 'step');
    c.array(p.rows, 'rows', 1, 4).forEach((row, i) => {
      c.id(row?.id, `rows[${i}]`); c.text(row?.label, `rows[${i}].label`, 80);
      c.array(row?.intervals ?? [], `rows[${i}].intervals`, 0, 4).forEach((interval, j) => {
        c.number(interval?.from, `rows[${i}].intervals[${j}].from`); c.number(interval?.to, `rows[${i}].intervals[${j}].to`);
        c.tone(interval?.tone, `rows[${i}].intervals[${j}]`);
      });
      c.array(row?.points ?? [], `rows[${i}].points`, 0, 8).forEach((point, j) => {
        c.number(point?.x, `rows[${i}].points[${j}].x`); c.optionalText(point?.label, `rows[${i}].points[${j}].label`, 30);
      });
    });
    c.array(p.signs ?? [], 'signs', 0, 4).forEach((sign, i) => {
      c.id(sign?.id, `signs[${i}]`); c.text(sign?.label, `signs[${i}].label`, 60);
      const breaks = c.array(sign?.breaks, `signs[${i}].breaks`, 1, 6);
      const signs = c.array(sign?.signs, `signs[${i}].signs`, 2, 7);
      if (signs.length !== breaks.length + 1) c.fail(`signs[${i}] işaret sayısı kırılım + 1 olmalı`);
      if (signs.some((s) => !['+', '-', '0'].includes(s))) c.fail(`signs[${i}] yalnız + - 0 içerebilir`);
    });
    c.array(p.marks ?? [], 'marks', 0, 6).forEach((mark, i) => {
      c.id(mark?.id, `marks[${i}]`); c.number(mark?.x, `marks[${i}].x`); c.text(mark?.label, `marks[${i}].label`, 40); c.tone(mark?.tone, `marks[${i}]`);
    });
    if (p.intersection) {
      c.id(p.intersection.id, 'intersection');
      c.array(p.intersection.rows, 'intersection.rows', 2, 4).forEach((id) => { if (!c.ids.has(id)) c.fail(`intersection satırı yok: ${id}`); });
      c.optionalText(p.intersection.label, 'intersection.label', 60);
    }
  },
  timeline(c, p) {
    c.number(p.from, 'from'); c.number(p.to, 'to');
    if (p.from >= p.to) c.fail('from < to olmalı');
    c.array(p.eras ?? [], 'eras', 0, 8).forEach((era, i) => {
      c.id(era?.id, `eras[${i}]`); c.number(era?.from, `eras[${i}].from`); c.number(era?.to, `eras[${i}].to`);
      c.text(era?.label, `eras[${i}].label`, 60); c.tone(era?.tone, `eras[${i}]`);
    });
    c.array(p.events ?? [], 'events', 0, 12).forEach((event, i) => {
      c.id(event?.id, `events[${i}]`); c.number(event?.year, `events[${i}].year`); c.text(event?.label, `events[${i}].label`, 80);
      c.tone(event?.tone, `events[${i}]`);
    });
    c.array(p.spans ?? [], 'spans', 0, 6).forEach((span, i) => {
      c.id(span?.id, `spans[${i}]`); c.number(span?.from, `spans[${i}].from`); c.number(span?.to, `spans[${i}].to`);
      c.text(span?.label, `spans[${i}].label`, 80); c.tone(span?.tone, `spans[${i}]`);
    });
  },
  plot(c, p) {
    const x = c.array(p.x, 'x', 2, 2); const y = c.array(p.y, 'y', 2, 2);
    [...x, ...y].forEach((value) => c.number(value, 'eksen sınırı'));
    if (x[0] >= x[1] || y[0] >= y[1]) c.fail('eksen aralığı geçersiz');
    const variables = ['x', ...sliders(c, p.sliders)];
    c.array(p.functions ?? [], 'functions', 0, 4).forEach((fn, i) => {
      c.id(fn?.id, `functions[${i}]`); c.expr(fn?.expr, variables, `functions[${i}]`); c.tone(fn?.tone, `functions[${i}]`);
      c.optionalText(fn?.label, `functions[${i}].label`, 60);
      (fn?.holes ?? []).forEach((hole) => c.number(hole, `functions[${i}].holes`));
    });
    c.array(p.points ?? [], 'points', 0, 10).forEach((point, i) => {
      c.id(point?.id, `points[${i}]`); c.number(point?.x, `points[${i}].x`); c.number(point?.y, `points[${i}].y`);
      c.optionalText(point?.label, `points[${i}].label`, 40); c.tone(point?.tone, `points[${i}]`);
    });
    c.array(p.segments ?? [], 'segments', 0, 10).forEach((segment, i) => {
      c.id(segment?.id, `segments[${i}]`);
      [...c.array(segment?.from, `segments[${i}].from`, 2, 2), ...c.array(segment?.to, `segments[${i}].to`, 2, 2)]
        .forEach((value) => c.number(value, `segments[${i}]`));
      c.tone(segment?.tone, `segments[${i}]`);
    });
    c.array(p.areas ?? [], 'areas', 0, 3).forEach((area, i) => {
      c.id(area?.id, `areas[${i}]`); c.expr(area?.expr, variables, `areas[${i}]`);
      c.number(area?.from, `areas[${i}].from`); c.number(area?.to, `areas[${i}].to`); c.tone(area?.tone, `areas[${i}]`);
    });
    c.array(p.series ?? [], 'series', 0, 4).forEach((series, i) => {
      c.id(series?.id, `series[${i}]`); c.tone(series?.tone, `series[${i}]`);
      if (!['line', 'bar'].includes(series?.kind)) c.fail(`series[${i}].kind line/bar olmalı`);
      c.array(series?.points, `series[${i}].points`, 2, 40).forEach((point) => {
        if (!Array.isArray(point) || point.length !== 2 || !point.every(isNumber)) c.fail(`series[${i}] noktası [x,y] olmalı`);
      });
    });
    c.array(p.tangents ?? [], 'tangents', 0, 2).forEach((tangent, i) => {
      c.id(tangent?.id, `tangents[${i}]`); c.expr(tangent?.expr, variables, `tangents[${i}]`);
      if (!isNumber(tangent?.at) && !variables.includes(tangent?.at)) c.fail(`tangents[${i}].at sayı ya da kaydırıcı olmalı`);
    });
  },
  geometry(c, p) {
    const view = c.array(p.view, 'view', 4, 4);
    view.forEach((value) => c.number(value, 'view'));
    if (view[0] >= view[1] || view[2] >= view[3]) c.fail('view aralığı geçersiz');
    const points = new Set();
    c.array(p.points, 'points', 1, 40).forEach((point, i) => {
      c.id(point?.id, `points[${i}]`); points.add(point?.id);
      c.number(point?.x, `points[${i}].x`); c.number(point?.y, `points[${i}].y`);
      c.optionalText(point?.label, `points[${i}].label`, 20);
    });
    const needPoint = (id, label) => { if (!points.has(id)) c.fail(`${label} noktası yok: ${id}`); };
    c.array(p.segments ?? [], 'segments', 0, 32).forEach((segment, i) => {
      c.id(segment?.id, `segments[${i}]`); needPoint(segment?.from, `segments[${i}]`); needPoint(segment?.to, `segments[${i}]`);
      c.tone(segment?.tone, `segments[${i}]`); c.optionalText(segment?.label, `segments[${i}].label`, 30);
    });
    c.array(p.paths ?? [], 'paths', 0, 6).forEach((path, i) => {
      c.id(path?.id, `paths[${i}]`); c.array(path?.points, `paths[${i}].points`, 2, 24).forEach((id) => needPoint(id, `paths[${i}]`));
      c.tone(path?.tone, `paths[${i}]`); c.optionalText(path?.label, `paths[${i}].label`, 40);
    });
    c.array(p.polygons ?? [], 'polygons', 0, 10).forEach((polygon, i) => {
      c.id(polygon?.id, `polygons[${i}]`); c.array(polygon?.points, `polygons[${i}].points`, 3, 12).forEach((id) => needPoint(id, `polygons[${i}]`));
      c.tone(polygon?.tone, `polygons[${i}]`);
    });
    c.array(p.circles ?? [], 'circles', 0, 4).forEach((circle, i) => {
      c.id(circle?.id, `circles[${i}]`); needPoint(circle?.center, `circles[${i}].center`);
      if (circle?.through !== undefined) needPoint(circle.through, `circles[${i}].through`); else c.number(circle?.r, `circles[${i}].r`);
      c.tone(circle?.tone, `circles[${i}]`);
    });
    c.array(p.angles ?? [], 'angles', 0, 12).forEach((angle, i) => {
      c.id(angle?.id, `angles[${i}]`); ['vertex', 'from', 'to'].forEach((key) => needPoint(angle?.[key], `angles[${i}].${key}`));
      c.optionalText(angle?.label, `angles[${i}].label`, 20); c.tone(angle?.tone, `angles[${i}]`);
    });
    c.array(p.texts ?? [], 'texts', 0, 12).forEach((text, i) => {
      c.id(text?.id, `texts[${i}]`); c.number(text?.x, `texts[${i}].x`); c.number(text?.y, `texts[${i}].y`); c.text(text?.text, `texts[${i}].text`, 60);
    });
    c.array(p.drag ?? [], 'drag', 0, 2).forEach((drag, i) => {
      needPoint(drag?.point, `drag[${i}].point`);
      if (drag?.on?.circle === undefined && drag?.on?.segment === undefined) c.fail(`drag[${i}].on circle veya segment olmalı`);
    });
    c.array(p.measures ?? [], 'measures', 0, 6).forEach((measure, i) => {
      c.id(measure?.id, `measures[${i}]`);
      if (!['angle', 'length'].includes(measure?.kind)) c.fail(`measures[${i}].kind angle/length olmalı`);
      c.array(measure?.refs, `measures[${i}].refs`, 2, 3).forEach((id) => needPoint(id, `measures[${i}]`));
      c.text(measure?.label, `measures[${i}].label`, 30);
    });
  },
  diagram(c, p) {
    if (p.height !== undefined) c.number(p.height, 'height');
    const nodes = new Set();
    c.array(p.nodes, 'nodes', 2, 16).forEach((node, i) => {
      c.id(node?.id, `nodes[${i}]`); nodes.add(node?.id);
      c.number(node?.x, `nodes[${i}].x`); c.number(node?.y, `nodes[${i}].y`); c.text(node?.text, `nodes[${i}].text`, 140);
      c.tone(node?.tone, `nodes[${i}]`);
      if (node?.shape !== undefined && !['box', 'pill', 'circle'].includes(node.shape)) c.fail(`nodes[${i}].shape geçersiz`);
    });
    c.array(p.edges ?? [], 'edges', 0, 24).forEach((edge, i) => {
      c.id(edge?.id, `edges[${i}]`);
      if (!nodes.has(edge?.from) || !nodes.has(edge?.to)) c.fail(`edges[${i}] düğümü yok`);
      c.optionalText(edge?.label, `edges[${i}].label`, 50); c.tone(edge?.tone, `edges[${i}]`);
    });
  },
  venn(c, p) {
    const sets = c.array(p.sets, 'sets', 2, 3);
    const setIds = sets.map((set) => set?.id);
    sets.forEach((set, i) => { c.id(set?.id, `sets[${i}]`); c.text(set?.label, `sets[${i}].label`, 60); c.tone(set?.tone, `sets[${i}]`); });
    const inside = (list, label) => c.array(list, label, 0, 3).forEach((id) => { if (!setIds.includes(id)) c.fail(`${label} kümesi yok: ${id}`); });
    c.array(p.regions ?? [], 'regions', 0, 8).forEach((region, i) => {
      c.id(region?.id, `regions[${i}]`); inside(region?.inside, `regions[${i}].inside`);
      c.optionalText(region?.label, `regions[${i}].label`, 40); c.tone(region?.tone, `regions[${i}]`);
    });
    c.array(p.items ?? [], 'items', 0, 16).forEach((item, i) => {
      c.id(item?.id, `items[${i}]`); c.text(item?.text, `items[${i}].text`, 40); inside(item?.inside, `items[${i}].inside`);
    });
  },
  tokens(c, p) {
    const roles = p.roles ?? {};
    Object.entries(roles).forEach(([key, role]) => {
      c.id(`role:${key}`, `roles.${key}`); c.text(role?.label, `roles.${key}.label`, 40); c.tone(role?.tone, `roles.${key}`);
    });
    c.array(p.lines, 'lines', 1, 8).forEach((line, i) => {
      if (line?.id !== undefined) c.id(line.id, `lines[${i}]`);
      c.array(line?.tokens, `lines[${i}].tokens`, 1, 40).forEach((token, j) => {
        c.id(token?.id, `lines[${i}].tokens[${j}]`); c.text(token?.text, `lines[${i}].tokens[${j}].text`, 80);
        if (token?.role !== undefined && !(token.role in roles)) c.fail(`lines[${i}].tokens[${j}].role tanımsız`);
        c.optionalText(token?.note, `lines[${i}].tokens[${j}].note`, 120);
      });
    });
  },
  'bar-model'(c, p) {
    c.array(p.bars, 'bars', 1, 4).forEach((bar, i) => {
      c.id(bar?.id, `bars[${i}]`); c.text(bar?.label, `bars[${i}].label`, 60);
      c.array(bar?.segments, `bars[${i}].segments`, 1, 16).forEach((segment, j) => {
        c.id(segment?.id, `bars[${i}].segments[${j}]`); c.number(segment?.value, `bars[${i}].segments[${j}].value`);
        if (segment?.value <= 0) c.fail(`bars[${i}].segments[${j}].value pozitif olmalı`);
        c.optionalText(segment?.label, `bars[${i}].segments[${j}].label`, 40); c.tone(segment?.tone, `bars[${i}].segments[${j}]`);
      });
    });
    c.array(p.brackets ?? [], 'brackets', 0, 6).forEach((bracket, i) => {
      c.id(bracket?.id, `brackets[${i}]`); c.text(bracket?.label, `brackets[${i}].label`, 50);
      const bar = (p.bars ?? []).find((item) => item.id === bracket?.bar);
      if (!bar) c.fail(`brackets[${i}].bar yok`);
      else if (!(bracket.from >= 0 && bracket.to < bar.segments.length && bracket.from <= bracket.to)) c.fail(`brackets[${i}] aralığı geçersiz`);
    });
  },
  particles(c, p) {
    if (!['gas', 'reaction', 'mixture'].includes(p.mode)) c.fail('mode gas/reaction/mixture olmalı');
    const names = sliders(c, p.sliders);
    c.array(p.species, 'species', 1, 4).forEach((species, i) => {
      c.id(species?.id, `species[${i}]`); c.text(species?.label, `species[${i}].label`, 40); c.tone(species?.tone, `species[${i}]`);
      if (!Number.isInteger(species?.count) || species.count < 0 || species.count > 120) c.fail(`species[${i}].count 0-120 tam sayı olmalı`);
    });
    if (p.mode === 'reaction') {
      const ids = (p.species ?? []).map((s) => s.id);
      if (!ids.includes(p.reaction?.from) || !ids.includes(p.reaction?.to)) c.fail('reaction türleri yok');
      c.number(p.reaction?.forward, 'reaction.forward'); c.number(p.reaction?.backward, 'reaction.backward');
    }
    (p.readouts ?? []).forEach((readout, i) => {
      c.id(readout?.id, `readouts[${i}]`); c.text(readout?.label, `readouts[${i}].label`, 60); c.expr(readout?.expr, names, `readouts[${i}]`);
    });
  },
  motion(c, p) {
    if (!['1d', 'projectile'].includes(p.mode)) c.fail('mode 1d/projectile olmalı');
    c.number(p.duration, 'duration');
    if (p.mode === 'projectile') { c.number(p.v0, 'v0'); c.number(p.angle, 'angle'); c.number(p.g ?? 10, 'g'); c.number(p.x0 ?? 0, 'x0'); c.number(p.y0 ?? 0, 'y0'); }
    c.array(p.objects ?? [], 'objects', p.mode === '1d' ? 1 : 0, 3).forEach((object, i) => {
      c.id(object?.id, `objects[${i}]`); c.text(object?.label, `objects[${i}].label`, 40);
      ['x0', 'v0', 'a'].forEach((key) => c.number(object?.[key] ?? 0, `objects[${i}].${key}`)); c.tone(object?.tone, `objects[${i}]`);
    });
    if (p.graph !== undefined && p.graph !== null && !['x-t', 'v-t', 'y-t'].includes(p.graph)) c.fail('graph x-t/v-t/y-t olmalı');
    c.array(p.markers ?? [], 'markers', 0, 6).forEach((marker, i) => {
      c.id(marker?.id, `markers[${i}]`); c.number(marker?.t, `markers[${i}].t`); c.text(marker?.label, `markers[${i}].label`, 40);
    });
  },
  grid(c, p) {
    c.id('all', 'all');
    if (p.mode === 'pairs') {
      if (!Number.isInteger(p.n) || p.n < 3 || p.n > 40) c.fail('n 3-40 olmalı');
      const groups = c.array(p.groups, 'groups', 2, 3);
      groups.forEach((group, i) => { c.id(group?.id, `groups[${i}]`); c.text(group?.label, `groups[${i}].label`, 40); c.tone(group?.tone, `groups[${i}]`); });
      if (groups.reduce((sum, group) => sum + (group?.size ?? 0), 0) !== p.n) c.fail('grup büyüklükleri n etmeli');
      groups.forEach((a, i) => groups.slice(i).forEach((b) => c.ids.add(`pair:${a.id}-${b.id}`)));
    } else if (p.mode === 'punnett') {
      const rows = c.array(p.rows, 'rows', 1, 8); const cols = c.array(p.cols, 'cols', 1, 8);
      [...rows, ...cols].forEach((allele) => c.text(allele, 'alel', 8));
      c.array(p.highlight ?? [], 'highlight', 0, 4).forEach((item, i) => {
        c.id(item?.id, `highlight[${i}]`); c.array(item?.match, `highlight[${i}].match`, 1, 8); c.tone(item?.tone, `highlight[${i}]`);
        c.optionalText(item?.label, `highlight[${i}].label`, 50);
      });
    } else if (p.mode === 'cells') {
      if (!Number.isInteger(p.rows) || !Number.isInteger(p.cols) || p.rows < 1 || p.cols < 1 || p.rows * p.cols > 400) c.fail('rows×cols 1-400 olmalı');
      c.array(p.groups ?? [], 'groups', 0, 6).forEach((group, i) => {
        c.id(group?.id, `groups[${i}]`); c.tone(group?.tone, `groups[${i}]`); c.optionalText(group?.label, `groups[${i}].label`, 60);
        [...(group?.rows ?? []), ...(group?.cols ?? [])].forEach((index) => { if (!Number.isInteger(index) || index < 0) c.fail(`groups[${i}] indeksi geçersiz`); });
      });
    } else c.fail('mode pairs/punnett/cells olmalı');
  },
  circuit(c, p) {
    c.number(p.voltage, 'voltage');
    c.array(p.resistors, 'resistors', 1, 6).forEach((resistor, i) => {
      c.id(resistor?.id, `resistors[${i}]`); c.number(resistor?.ohm, `resistors[${i}].ohm`); c.text(resistor?.label, `resistors[${i}].label`, 20);
    });
    if (!['series', 'parallel'].includes(p.layout)) c.fail('layout series/parallel olmalı');
  },
  'sun-angle'(c, p) {
    c.number(p.latitude, 'latitude'); c.number(p.declination, 'declination');
    if (Math.abs(p.latitude) > 90 || Math.abs(p.declination) > 23.5) c.fail('enlem/deklinasyon aralık dışı');
    sliders(c, p.sliders);
    c.array(p.places ?? [], 'places', 0, 4).forEach((place, i) => {
      c.id(place?.id, `places[${i}]`); c.text(place?.label, `places[${i}].label`, 40); c.number(place?.latitude, `places[${i}].latitude`);
    });
  },
  'truth-table'(c, p) {
    const vars = c.array(p.vars, 'vars', 1, 3);
    if (vars.some((name) => !/^[pqrs]$/.test(name))) c.fail('vars yalnız p q r s olabilir');
    c.array(p.columns, 'columns', 1, 5).forEach((column, i) => {
      c.id(column?.id, `columns[${i}]`); c.text(column?.label, `columns[${i}].label`, 40);
      try { compileLogic(column?.expr ?? '', vars); } catch (error) { c.fail(`columns[${i}].expr çözülemedi (${error.message})`); }
    });
  },
};

/** Görsel bloğunu denetler; hata listesi boşsa ön yüz çizebilir. */
export function validateVisual(visual) {
  if (!visual || visual.recommended !== true) return [];
  const c = checker(`visual(${visual.template})`);
  if (!TEMPLATES.includes(visual.template)) return [`Bilinmeyen şablon: ${visual.template}`];
  if (!visual.params || typeof visual.params !== 'object') return ['params nesne olmalı'];
  validators[visual.template](c, visual.params);
  const known = c.ids;
  (visual.frames ?? []).forEach((frame, index) => {
    if (!isText(frame?.caption)) c.fail(`frames[${index}].caption eksik`);
    [...(frame?.show ?? []), ...(frame?.focus ?? [])].forEach((id) => {
      if (!known.has(id)) c.fail(`frames[${index}] bilinmeyen öğe: ${id}`);
    });
    Object.entries(frame?.set ?? {}).forEach(([name, value]) => {
      if (!isNumber(value)) c.fail(`frames[${index}].set.${name} sayı olmalı`);
      if (!(visual.params.sliders ?? []).some((slider) => slider.name === name) && !['t'].includes(name)) c.fail(`frames[${index}].set.${name} kaydırıcı değil`);
    });
  });
  return c.errors;
}

/** Çizimde kullanılacak görünür/odak kümeleri: kare yoksa her şey görünür. */
export function frameState(visual, index) {
  const frame = visual.frames?.[index];
  return {
    show: frame?.show ? new Set(frame.show) : null,
    focus: new Set(frame?.focus ?? []),
    set: frame?.set ?? {},
    caption: frame?.caption ?? '',
  };
}
