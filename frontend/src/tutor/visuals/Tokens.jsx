import { stroke, fill, visible } from './svg.js';

/** Metin parçaları: cümle öğeleri, heceler, noktalama; rol renkleri ve notlar adım adım görünür. */
export default function Tokens({ params, state }) {
  const roles = params.roles ?? {};
  const roleShown = (role) => role && (visible(state, `role:${role}`) || state?.focus?.has(`role:${role}`));
  return <div className="viz-tokens" role="group" aria-label="Metin çözümlemesi">
    {(params.lines ?? []).map((line, li) => <p key={line.id ?? li} className="viz-token-line">
      {line.tokens.map((token) => {
        const active = roleShown(token.role) || state?.focus?.has(token.id);
        const tone = roles[token.role]?.tone ?? 'navy';
        const style = active ? { borderColor: stroke(tone), background: fill(tone) } : undefined;
        return <span key={token.id} className={`viz-token${active ? ' active' : ''}${token.mark ? ' viz-token-mark' : ''}`} style={style}>
          <span className="viz-token-text">{token.text}</span>
          {active && token.role && <span className="viz-token-role" style={{ color: stroke(tone) }}>{roles[token.role]?.label}</span>}
          {active && token.note && <span className="viz-token-note">{token.note}</span>}
        </span>;
      })}
    </p>)}
    {Object.keys(roles).length > 0 && <p className="viz-legend">{Object.entries(roles).map(([key, role]) =>
      <span key={key} className={`viz-legend-item${roleShown(key) ? '' : ' faded'}`}>
        <span className="viz-swatch" style={{ background: stroke(role.tone ?? 'navy') }} />{role.label}</span>)}</p>}
  </div>;
}
