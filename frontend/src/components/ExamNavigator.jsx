/**
 * Soru gezgini: cevaplı = dolu, boş = çizgili, işaretli = amber nokta, aktif = vurgulu.
 * Masaüstünde sağ panel; mobilde alt çubuğun üzerinde açılan çekmece (open ile).
 */
export default function ExamNavigator({ questions, answers, flags, current, onGo, open }) {
  const answered = questions.filter((q) => answers[q.questionId]).length;
  return (
    <aside id="soru-gezgini" className={`card navigator${open ? ' open' : ''}`} aria-label="Soru gezgini">
      <h2 className="nav-title">
        <span>Soru gezgini</span>
        <span className="muted">
          {answered}/{questions.length} cevaplı
        </span>
      </h2>
      <div className="nav-grid">
        {questions.map((q, i) => {
          const isAnswered = !!answers[q.questionId];
          const isFlagged = flags.has(q.questionId);
          return (
            <button
              key={q.questionId}
              type="button"
              className={`qbox${isAnswered ? ' answered' : ''}${isFlagged ? ' flagged' : ''}${i === current ? ' current' : ''}`}
              aria-label={`Soru ${i + 1}, ${isAnswered ? 'cevaplı' : 'boş'}${isFlagged ? ', işaretli' : ''}`}
              aria-current={i === current ? 'true' : undefined}
              onClick={() => onGo(i)}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      <ul className="nav-legend">
        <li>
          <span className="qbox answered" aria-hidden="true" /> Cevaplı
        </li>
        <li>
          <span className="qbox" aria-hidden="true" /> Boş
        </li>
        <li>
          <span className="qbox flagged" aria-hidden="true" /> İşaretli ({flags.size})
        </li>
      </ul>
    </aside>
  );
}
