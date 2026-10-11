import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, qs } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useAsync, usePageTitle } from '../hooks.js';
import { ErrorBox, Loading } from '../components/States.jsx';
import plan from '../data/ilerleme-plani.json';

const TABS = [['today', 'Günlük'], ['week', 'Haftalık'], ['month', 'Aylık'], ['topics', 'Konu takvimi'], ['schedule', 'Çalışma programı']];
const format = (value) => value ? new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`)) : '';
const number = (value) => Number(value || 0).toLocaleString('tr-TR');
const dateToday = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};
const readDone = (key) => {
  try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; }
};

function Target({ title, target, actual, unit = 'soru' }) {
  return <div className="plan-target">
    <span>{title}</span><strong>{number(target)} {unit}</strong>
    {actual != null && <small>Bu dönem ilk kez çözülen: {number(actual)} soru</small>}
  </div>;
}

export default function StudyPlan() {
  usePageTitle('İlerleme Takip Paneli');
  const { user } = useAuth();
  const [tab, setTab] = useState('today');
  const [date, setDate] = useState(dateToday);
  const [subject, setSubject] = useState('');
  const storageKey = `yks.plan.topics.${user?.id ?? user?.username ?? 'student'}`;
  const [done, setDone] = useState(() => readDone(storageKey));
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Istanbul';
  const today = dateToday();
  const selectedDay = plan.gunluk_hedefler.find((row) => row.tarih === date);
  const selectedWeek = plan.haftalik_hedefler.find((row) => row.baslangic <= date && date <= row.bitis);
  const selectedMonth = plan.aylik_hedefler.find((row) => row.ay_basi <= date && date <= row.ay_sonu);
  const phase = plan.fazlar.find((row) => row.bas <= date && date <= row.bit);
  const period = tab === 'today' ? 'DAY' : tab === 'week' ? 'WEEK' : 'MONTH';
  const currentPeriod = tab === 'today' ? date === today : tab === 'week'
    ? selectedWeek?.baslangic <= today && today <= selectedWeek?.bitis
    : selectedMonth?.ay_basi <= today && today <= selectedMonth?.ay_sonu;
  const progress = useAsync(() => api.get('/api/progress/first-attempts' + qs({ period, zone })), [period, zone]);
  const shownProgress = currentPeriod && !progress.error ? progress.data : null;
  const examRows = plan.deneme_plani.filter((row) => tab === 'week'
    ? selectedWeek && selectedWeek.baslangic <= row.tarih && row.tarih <= selectedWeek.bitis
    : tab === 'month' ? selectedMonth && selectedMonth.ay_basi <= row.tarih && row.tarih <= selectedMonth.ay_sonu
      : row.tarih === date);
  const topics = plan.konu_takvimi.filter((row) => !subject || row.ders === subject);
  const upcomingTopics = plan.konu_takvimi.filter((row) => {
    const id = `${row.sinav}|${row.ders}|${row.konu}`;
    return !done[id] && row.bitis_tarihi >= date
      && (!selectedMonth || row.bitis_tarihi <= selectedMonth.ay_sonu);
  }).slice(0, 8);
  const subjects = [...new Set(plan.konu_takvimi.map((row) => row.ders))];
  const complete = Object.values(done).filter(Boolean).length;
  const toggleTopic = (row) => {
    const id = `${row.sinav}|${row.ders}|${row.konu}`;
    const next = { ...done, [id]: !done[id] };
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Tarayıcı depolaması kapalıysa yalnız açık ekran güncellenir. */ }
    setDone(next);
  };
  const weekday = new Date(`${date}T12:00:00`).getDay();
  const programColumn = weekday === 0 ? 7 : weekday;

  return <div className="study-plan">
    <h1>İlerleme Takip Paneli</h1>
    <p className="muted">Eczacılık hedefi için hazırlanmış örnek çalışma planı. Günlük, haftalık ve aylık sayılar sabit plandır; kendi hedeflerini <Link to="/hedefler">Hedeflerim</Link> bölümünde yönetebilirsin.</p>
    <div className="card plan-heading">
      <div><span className="muted small">Sınav planı</span><h2>{format(plan.sinav_tarihi)}</h2></div>
      <div><span className="muted small">Seçili faz</span><h2>{phase?.faz || 'Plan dönemi dışında'}</h2></div>
      <div><span className="muted small">Konu ilerlemesi</span><h2>{complete} / {plan.konu_takvimi.length}</h2></div>
    </div>
    <nav className="history-tabs" aria-label="Takip paneli bölümleri">
      {TABS.map(([id, label]) => <button key={id} type="button" className={`btn ${tab === id ? 'btn-primary' : 'btn-secondary'}`}
        aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</button>)}
    </nav>
    <div className="plan-toolbar">
      <label className="field"><span className="field-label">Plan tarihi</span><input type="date" value={date} min={plan.gunluk_hedefler[0].tarih}
        max={plan.sinav_tarihi} onChange={(event) => setDate(event.target.value)} /></label>
      <button type="button" className="btn btn-secondary" onClick={() => setDate(today)}>Bugüne dön</button>
    </div>

    {['today', 'week', 'month'].includes(tab) && <>
      {tab === 'today' && <section className="card">
        <h2>{format(date)} · Günlük plan</h2>
        {selectedDay ? <>
          <div className="plan-targets"><Target title="TYT soru hedefi" target={selectedDay.tyt_soru} />
            <Target title="TYT doğru hedefi" target={selectedDay.tyt_dogru} unit="doğru" />
            <Target title="AYT soru hedefi" target={selectedDay.ayt_soru} />
            <Target title="AYT doğru hedefi" target={selectedDay.ayt_dogru} unit="doğru" /></div>
          <p className="muted small">Hafta {selectedDay.hafta} · {selectedDay.faz}</p>
        </> : <p>Bu tarih için günlük plan bulunmuyor.</p>}
      </section>}
      {tab === 'week' && <section className="card">
        <h2>{selectedWeek ? `${selectedWeek.hafta}. hafta · ${format(selectedWeek.baslangic)} – ${format(selectedWeek.bitis)}` : 'Haftalık plan'}</h2>
        {selectedWeek ? <><div className="plan-targets">
          <Target title="Soru hedefi" target={selectedWeek.hedef_soru} actual={shownProgress?.total} />
          <Target title="Doğru hedefi" target={selectedWeek.hedef_dogru} unit="doğru" />
          <Target title="TYT denemesi" target={selectedWeek.planli_tyt_deneme} unit="deneme" />
          <Target title="AYT denemesi" target={selectedWeek.planli_ayt_deneme} unit="deneme" />
        </div></> : <p>Bu tarih için haftalık plan bulunmuyor.</p>}
      </section>}
      {tab === 'month' && <section className="card">
        <h2>{selectedMonth?.ay || 'Aylık plan'}</h2>
        {selectedMonth ? <><div className="plan-targets">
          <Target title="Soru hedefi" target={selectedMonth.soru_hedefi} actual={shownProgress?.total} />
          <Target title="Deneme planı" target={selectedMonth.planli_deneme} unit="deneme" />
          <Target title="TYT net hedefi" target={selectedMonth.tyt_net_hedefi} unit="net" />
          <Target title="AYT net hedefi" target={selectedMonth.ayt_net_hedefi} unit="net" />
        </div><p><strong>Bu ay bitirilecekler:</strong> {selectedMonth.bu_ay_bitecek_konular}</p></> : <p>Bu tarih için aylık plan bulunmuyor.</p>}
      </section>}
      {tab === 'month' && <section className="card table-card"><h2>Sınavdaki ders hedefleri</h2>
        <div className="table-wrap"><table className="table"><thead><tr><th scope="col">Ders</th><th scope="col">Plan başlangıcı</th><th scope="col">Sınav hedefi</th><th scope="col">Artış</th></tr></thead>
          <tbody>{plan.ders_hedefleri.map((row) => <tr key={row.ders}><th scope="row">{row.ders}</th><td>{row.baslangic_net} net</td>
            <td>{row.sinav_hedef_net} net</td><td>{row.kalan_net} net</td></tr>)}</tbody></table></div>
        <p className="muted small" style={{ padding: '0 14px' }}>Başlangıç netleri kaynak plandaki örnek öğrenciye aittir; senin sınav sonucun değildir.</p>
      </section>}
      {currentPeriod && progress.loading && <Loading text="Çalışma verileri yükleniyor…" />}
      {currentPeriod && progress.error && <ErrorBox error={progress.error} onRetry={progress.retry} />}
      {shownProgress && <section className="card" aria-label="Uygulamadaki çalışma ilerlemesi">
        <h2>Uygulamadaki çalışma</h2>
        <p>İlk kez çözülen {number(shownProgress.total)} soru · {number(shownProgress.correct)} doğru · {number(shownProgress.wrong)} yanlış · {number(shownProgress.blank)} boş</p>
        <p className="muted small">Buradaki sayı yalnız soruların ilk çözümünü içerir. Plan hedefi tekrar çözülen soruları da kapsayabilir; bu nedenle hedefin tamamlanma oranı olarak kullanılmaz.</p>
        <Link to="/ilerleme" className="btn btn-secondary">Ayrıntılı ilerlemem</Link>
      </section>}
      {phase && <section className="card"><h2>Bu fazda odaklan</h2><p>{phase.ne}</p>
        <p>Günlük {number(phase.gunluk)} soru · TYT {number(phase.tyt)} · AYT {number(phase.ayt)} · {phase.deneme}</p></section>}
      {upcomingTopics.length > 0 && <section className="card"><h2>Sıradaki konular</h2>
        <ul className="plan-list">{upcomingTopics.map((row) => <li key={`${row.sinav}|${row.ders}|${row.konu}`}>
          <strong>{row.ders} · {row.konu}</strong><span>Hedef: {format(row.bitis_tarihi)}</span>
        </li>)}</ul><button type="button" className="btn btn-secondary" onClick={() => setTab('topics')}>Konu takvimine git</button>
      </section>}
      <section className="card"><h2>Planlı denemeler</h2>
        {examRows.length ? <ul className="plan-list">{examRows.map((row) => <li key={row.deneme}>
          <strong>{row.sinav} · {row.deneme}</strong><span>{format(row.tarih)} · Beklenen {row.beklenen_net} net</span>
        </li>)}</ul> : <p className="muted">Seçilen dönemde planlı deneme yok.</p>}
        <Link to="/sinav/yeni" className="btn btn-secondary">Sınav başlat</Link>
      </section>
    </>}

    {tab === 'topics' && <section className="card">
      <h2>Konu takvimi</h2><p className="muted small">Biten konuları işaretle. İşaretler yalnız bu tarayıcıda, bu hesaba ayrılmış alanda saklanır.</p>
      <label className="field plan-subject"><span className="field-label">Ders</span><select value={subject} onChange={(event) => setSubject(event.target.value)}>
        <option value="">Tüm dersler</option>{subjects.map((item) => <option key={item}>{item}</option>)}
      </select></label>
      <ul className="plan-topic-list">{topics.map((row) => {
        const id = `${row.sinav}|${row.ders}|${row.konu}`;
        return <li key={id}><label><input type="checkbox" checked={Boolean(done[id])} onChange={() => toggleTopic(row)} />
          <span><strong>{row.konu}</strong><small>{row.sinav} · {row.ders} · {row.bitis_ayi}</small></span></label></li>;
      })}</ul>
    </section>}

    {tab === 'schedule' && <section className="card">
      <h2>{format(date)} · Çalışma programı</h2>
      <p className="muted small">Excel planındaki haftalık örnek saatler. Ders dağılımı faza göre değişebilir.</p>
      <div className="table-wrap"><table className="table"><thead><tr><th scope="col">Saat</th><th scope="col">{plan.haftalik_program[0][programColumn]}</th></tr></thead>
        <tbody>{plan.haftalik_program.slice(1).map((row) => <tr key={row[0]}><th scope="row">{row[0]}</th><td>{row[programColumn]}</td></tr>)}</tbody></table></div>
    </section>}
    <p className="muted small">Kaynak: {plan.kaynak}. Sınav tarihi ve çalışma sayıları plan varsayımıdır.</p>
  </div>;
}
