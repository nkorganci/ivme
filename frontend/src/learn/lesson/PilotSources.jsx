import { evidenceFor, evidenceForQuestion, examScope } from '../content/evidence.js';

export function PilotSectionSources({ conceptId, sectionId }) {
  const evidence = evidenceFor(conceptId);
  const section = evidence?.sections[sectionId];
  if (!section) return null;
  const pages = [...new Set(section.claims.map((id) => evidence.claims[id].page))];
  return <details className="lm-terms lr-pilot-sources">
    <summary>Bu bölümün kaynağı ve kapsamı</summary>
    <p>{evidence.primarySource.title}. {examScope(section.exams)}</p>
    <p>{section.note}</p>
    <ul>{pages.map((page) => <li key={page}><a href={`${evidence.primarySource.url}#page=${page}`} target="_blank" rel="noopener noreferrer">Ana ders kitabı · sayfa {page} ↗</a></li>)}</ul>
    <p className="small muted">Anlatım ve örnekler İvme’nin özgün açıklamalarıdır. Kaynak ve hesap kontrolü yapıldı; bağımsız öğretmen incelemesi bekleniyor.</p>
  </details>;
}

export function PilotSolutionSources({ code }) {
  const evidence = evidenceForQuestion(code);
  const source = evidence?.questions[code];
  if (!source) return null;
  return <details className="lm-terms lr-pilot-solution-source">
    <summary>Çözümün kaynağı ve inceleme durumu</summary>
    <p>{source.year} {source.exam} · {source.archiveId} · OGM {source.sourceBook} derlemesi, sayfa {source.sourcePage}, soru {source.bookQuestion}.</p>
    <p>Çözüm İvme’nin özgün türetimidir. Sonuç, mevcut ÖSYM cevap anahtarı kaydıyla ve bağımsız hesapla karşılaştırıldı. Resmî ayrıntılı çözüm veya öğretmen onayı değildir.</p>
    <ul>{source.claims.map((id) => <li key={id}><a href={evidence.claims[id].url} target="_blank" rel="noopener noreferrer">{evidence.claims[id].title} · kitap s.{evidence.claims[id].page} ↗</a></li>)}</ul>
    <p className="small muted">Soru sürümü {source.questionVersion} · çözüm sürümü {source.solutionVersion} · öğretmen incelemesi bekleniyor.</p>
  </details>;
}
