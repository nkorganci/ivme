import { useState } from 'react';
import { calculate } from './scientificMath.js';

const KEYS = [
  ['sin(', 'cos(', 'tan(', 'sqrt(', 'log('],
  ['asin(', 'acos(', 'atan(', 'ln(', 'exp('],
  ['7', '8', '9', '/', '^'],
  ['4', '5', '6', '*', '!'],
  ['1', '2', '3', '-', 'pi'],
  ['0', '.', '(', ')', '+'],
];
const LABEL = { 'sqrt(': '√', 'pi': 'π', '*': '×', '/': '÷' };

export default function ScientificCalculator({ onClose }) {
  const [expression, setExpression] = useState('');
  const [degrees, setDegrees] = useState(true);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const append = (value) => { setExpression((current) => (current + value).slice(0, 160)); setError(''); };
  const evaluate = () => {
    try { setResult(String(calculate(expression, degrees))); setError(''); }
    catch (e) { setError(e.message); setResult(''); }
  };
  return <section className={onClose ? 'page-ink-panel calculator' : 'calculator calculator-inline'} aria-label="Bilimsel hesap makinesi">
    <div className="page-ink-panel-head"><strong>Bilimsel hesap makinesi</strong>{onClose && <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} aria-label="Hesap makinesini kapat">✕</button>}</div>
    <label className="sr-only" htmlFor="ink-calculation">Hesaplama ifadesi</label>
    <input id="ink-calculation" value={expression} maxLength={160} onChange={(e) => setExpression(e.target.value)}
      onKeyDown={(e) => { if (e.key === 'Enter') evaluate(); }} placeholder="Örnek: sin(30)+sqrt(9)" />
    <div className="calculator-result" role="status">{error || (result ? `= ${result}` : 'İşlemi girip = tuşuna bas')}</div>
    <div className="calculator-actions">
      <button type="button" className="btn btn-secondary btn-sm" aria-pressed={degrees} onClick={() => setDegrees(true)}>DEG</button>
      <button type="button" className="btn btn-secondary btn-sm" aria-pressed={!degrees} onClick={() => setDegrees(false)}>RAD</button>
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setExpression(''); setResult(''); setError(''); }}>AC</button>
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setExpression((current) => current.slice(0, -1))}>⌫</button>
    </div>
    <div className="calculator-keys">{KEYS.flat().map((key, index) => <button key={`${key}-${index}`} type="button" className="btn btn-secondary btn-sm"
      onClick={() => append(key)} aria-label={key}>{LABEL[key] || key.replace('(', '')}</button>)}</div>
    <button type="button" className="btn btn-primary calculator-equals" onClick={evaluate}>=</button>
  </section>;
}
