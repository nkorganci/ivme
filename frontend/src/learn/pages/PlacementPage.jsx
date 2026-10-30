import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { usePageTitle } from '../../hooks.js';
import { useLearn } from '../LearnContext.jsx';
import { loadBanks } from '../bank.js';
import { makeEvent } from '../api.js';
import { uuid } from '../engine/random.js';
import { ENGINE } from '../engine/config.js';
import { pickPlacement } from '../engine/selection.js';
import { nextPlacementQuestion, placementResult } from '../engine/placement.js';
import { BankQuestion } from '../items.jsx';
import { BASE } from '../ui.jsx';

/** Seviye testi (spec §9): ≤ 20 dk, her üniteden 2 orta soru; ilk yanlış ünite başlangıç, iki doğru geçme adayı. */
export default function PlacementPage() {
  const { track } = useParams();
  usePageTitle(`${track} seviye testi · Konuyu Öğrenelim`);
  const learn = useLearn();
  const { index, answerBank, record, settings, updateSettings, state } = learn;
  const [units, setUnits] = useState(null);
  const [answers, setAnswers] = useState({});
  const [startedAt, setStartedAt] = useState(null);
  const [current, setCurrent] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [result, setResult] = useState(null);
  const setId = useMemo(() => uuid(), []);

  useEffect(() => {
    if (!['TYT', 'AYT'].includes(track)) return;
    const ids = index.concepts.filter((m) => m.exams.includes(track)).map((m) => m.id);
    loadBanks(ids).then((banks) => setUnits(pickPlacement({ index, banks, track, seed: `placement:${track}:${learn.today}` })));
  }, [track, index]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!['TYT', 'AYT'].includes(track)) return <Navigate to={BASE} replace />;
  const head = <div className="page-head"><h1>{track} Matematik seviye testi</h1><span className="muted">isteğe bağlı · en çok {ENGINE.placement.maxMinutes} dk</span></div>;

  const finish = (final) => {
    const outcome = placementResult(units, final, index, track);
    record(makeEvent('set', { action: 'done', setId, setType: 'placement', track, level: outcome.level, startUnit: outcome.startUnit, testOut: outcome.testOut }));
    setResult(outcome);
  };
  const advance = (final) => {
    const next = nextPlacementQuestion(units, final, startedAt, Date.now());
    setAnswered(false);
    if (next) setCurrent(next);
    else finish(final);
  };
  const skip = async () => {
    await updateSettings({ ...settings, placementSkipped: [...new Set([...settings.placementSkipped, track])] });
  };

  if (result) {
    const startUnit = index.units.find((u) => u.id === result.startUnit);
    return <div className="lr-page">{head}
      <section className="card lr-result">
        <h2>%{result.pct} ({result.correct}/{result.total})</h2>
        <p>Önerilen anlatım düzeyi: <strong>{result.level === 'L1' ? 'Basit' : 'Normal'}</strong>{result.suggestL3 ? ' — konularda derin anlatım önerileri de göreceksin.' : '.'}</p>
        {result.testOut.length > 0 && <p><strong>{result.testOut.length} kavramı</strong> kısa bir ustalık testiyle geçebilirsin: {result.testOut.map((id) => index.byId[id]?.title).join(', ')}.</p>}
        {startUnit && <p>Başlangıç noktan: <strong>{startUnit.title}</strong>. Planın buradan başlayacak; istediğin konuyu her zaman seçebilirsin.</p>}
        <div className="lr-actions"><Link className="btn btn-primary" to={BASE}>Bugünün planına git</Link><Link className="btn btn-secondary" to={`${BASE}/harita?sinav=${track}`}>Konu haritası</Link></div>
      </section>
    </div>;
  }

  if (!startedAt) {
    const done = state.placement[track];
    return <div className="lr-page">{head}
      <section className="card">
        <p>Her üniteden iki orta zorlukta soru. İkisini de doğru yaparsan o ünitenin kavramlarını <strong>kısa bir ustalık testiyle geçebilirsin</strong>; ilk yanlış yaptığın ünite başlangıç noktan olur. Puanın derslerdeki anlatım düzeyini ayarlar.</p>
        {done && <p className="small muted">Bu testi daha önce yaptın (%{done.pct}). Yeniden yapmak sonucu günceller.</p>}
        {!units ? <p className="muted">Sorular hazırlanıyor…</p> : units.length === 0 ? <p className="muted">Banka soruları henüz eşlenmedi.</p> :
          <div className="lr-actions">
            <button type="button" className="btn btn-primary btn-lg" onClick={() => { setStartedAt(Date.now()); setCurrent(nextPlacementQuestion(units, {}, Date.now(), Date.now())); }}>Teste başla ({units.length} ünite)</button>
            <button type="button" className="btn btn-secondary" onClick={skip}>Atla, en baştan başlayacağım</button>
          </div>}
      </section>
    </div>;
  }

  if (!current) return <div className="lr-page">{head}<p className="muted">Hazırlanıyor…</p></div>;
  const asked = Object.keys(answers).length;
  return <div className="lr-page">{head}
    <section className="card lr-runner">
      <p className="small muted">Ünite: <strong>{current.unit.title}</strong> · {asked + 1}. soru</p>
      <BankQuestion question={current.question} conceptId={current.question.conceptId} context="placement" setId={setId} answerBank={answerBank}
        onAnswered={(value) => { setAnswers((a) => ({ ...a, [current.question.code]: value.correct })); setAnswered(true); }} />
      {answered && <div className="lr-section-nav"><button type="button" className="btn btn-primary" onClick={() => advance(answers)}>Sonraki</button>
        <button type="button" className="btn btn-secondary" onClick={() => finish(answers)}>Testi bitir</button></div>}
    </section>
  </div>;
}
