const clamp = (value) => Math.max(0, Math.min(1, value));

export function shapePoints(shape, start, end) {
  const [x1, y1] = start;
  const [x2, y2] = end;
  if (shape === 'LINE') return [start, end];
  if (shape === 'RECTANGLE') return [[x1, y1], [x2, y1], [x2, y2], [x1, y2], [x1, y1]];
  if (shape === 'TRIANGLE') return [[(x1 + x2) / 2, y1], [x2, y2], [x1, y2], [(x1 + x2) / 2, y1]];
  if (shape === 'ELLIPSE') {
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    const rx = Math.abs(x2 - x1) / 2;
    const ry = Math.abs(y2 - y1) / 2;
    return Array.from({ length: 49 }, (_, i) => [clamp(cx + rx * Math.cos(i * Math.PI / 24)), clamp(cy + ry * Math.sin(i * Math.PI / 24))]);
  }
  if (shape === 'ANGLE') return [[x1, y2], [x1, y1], [x2, y1]];
  return [start, end];
}
