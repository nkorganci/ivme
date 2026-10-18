export function selectionKey(value, type) {
  if (value == null) return 'null';
  if (type === 'date') {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return 'null';
    value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  return JSON.stringify(value);
}

export function selectionPasses(value, model, type) {
  if (!model) return true;
  const key = selectionKey(value, type);
  if (model.values && !model.values.includes(key)) return false;
  if (type === 'date' && (model.from || model.until)) {
    if (key === 'null') return false;
    const day = JSON.parse(key);
    if ((model.from && day < model.from) || (model.until && day > model.until)) return false;
  }
  return true;
}
