import { Link, Navigate, useParams } from 'react-router-dom';
import { usePageTitle } from '../hooks.js';
import { findUnit, subjectOf } from '../interactive/registry.js';
import MotionUnit from '../interactive/motion/MotionUnit.jsx';
import ModuleUnit from '../interactive/shell/ModuleUnit.jsx';
import '../interactive/interactive.css';

/** Bir ünitenin interaktif ortamı. Fizik · Hareket kendi stüdyosuyla, diğerleri ortak kabukla açılır. */
export default function InteractiveUnit() {
  const { subjectId, unitId } = useParams();
  const unit = findUnit(subjectId, unitId);
  usePageTitle(unit ? `${unit.title} · İnteraktif Öğrenme` : 'İnteraktif Öğrenme');
  if (!unit) return <Navigate to="/interaktif-ogrenme" replace />;
  const subject = subjectOf(subjectId);
  return <div className="il-page il-unit-page">
    <nav className="il-crumbs small" aria-label="Konum"><Link to="/interaktif-ogrenme">İnteraktif Öğrenme</Link> › <Link to={`/interaktif-ogrenme?ders=${subject.id}`}>{subject.name}</Link></nav>
    <div className="page-head"><h1>{unit.title}</h1><span className="muted">{unit.exam}{unit.topics ? ` · ${unit.topics}` : ''}</span></div>
    {unit.kind === 'motion' ? <MotionUnit /> : <ModuleUnit key={`${subjectId}/${unitId}`} unit={unit} />}
  </div>;
}
