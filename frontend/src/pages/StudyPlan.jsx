import { useState } from 'react';
import { usePageTitle } from '../hooks.js';
import plan from '../data/ilerleme-plani.json';

const TABS = [['day', 'Günlük'], ['week', 'Haftalık'], ['month', 'Aylık']];
const format = (value) => new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
}).format(new Date(`${value}T12:00:00Z`));
const number = (value) => Number(value || 0).toLocaleString('tr-TR');
const dateToday = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

function Target({ title, value, unit = 'soru' }) {
  return <div className="plan-target"><span>{title}</span><strong>{number(value)} {unit}</strong></div>;
}

export default function StudyPlan() {
  usePageTitle('İlerleme Takip Paneli');
  const [tab, setTab] = useState('day');
  const [date, setDate] = useState(dateToday);
  const day = plan.gunluk_hedefler.find((row) => row.tarih === date);
  const week = plan.haftalik_hedefler.find((row) => row.baslangic <= date && date <= row.bitis);
  const month = plan.aylik_hedefler.find((row) => row.ay_basi <= date && date <= row.ay_sonu);

  return <div className="study-plan">
    <h1>İlerleme Takip Paneli</h1>
    <nav className="history-tabs" aria-label="Takip dönemi">
      {TABS.map(([id, label]) => <button key={id} type="button"
        className={`btn ${tab === id ? 'btn-primary' : 'btn-secondary'}`}
        aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</button>)}
    </nav>
    <div className="plan-toolbar">
      <label className="field"><span className="field-label">Plan tarihi</span>
        <input type="date" value={date} min={plan.gunluk_hedefler[0].tarih}
          max={plan.gunluk_hedefler.at(-1).tarih} onChange={(event) => setDate(event.target.value)} />
      </label>
      <button type="button" className="btn btn-secondary" onClick={() => setDate(dateToday())}>Bugüne dön</button>
    </div>

    {tab === 'day' && <section className="card">
      <h2>{format(date)} · Günlük</h2>
      {day ? <div className="plan-targets">
        <Target title="TYT soru hedefi" value={day.tyt_soru} />
        <Target title="TYT doğru hedefi" value={day.tyt_dogru} unit="doğru" />
        <Target title="AYT soru hedefi" value={day.ayt_soru} />
        <Target title="AYT doğru hedefi" value={day.ayt_dogru} unit="doğru" />
      </div> : <p>Bu tarih için günlük plan yok.</p>}
    </section>}

    {tab === 'week' && <section className="card">
      <h2>{week ? `${week.hafta}. hafta · ${format(week.baslangic)} – ${format(week.bitis)}` : 'Haftalık'}</h2>
      {week ? <div className="plan-targets">
        <Target title="Soru hedefi" value={week.hedef_soru} />
        <Target title="Doğru hedefi" value={week.hedef_dogru} unit="doğru" />
        <Target title="TYT denemesi" value={week.planli_tyt_deneme} unit="deneme" />
        <Target title="AYT denemesi" value={week.planli_ayt_deneme} unit="deneme" />
      </div> : <p>Bu tarih için haftalık plan yok.</p>}
    </section>}

    {tab === 'month' && <section className="card">
      <h2>{month?.ay || 'Aylık'}</h2>
      {month ? <div className="plan-targets">
        <Target title="Soru hedefi" value={month.soru_hedefi} />
        <Target title="Deneme planı" value={month.planli_deneme} unit="deneme" />
        <Target title="TYT net hedefi" value={month.tyt_net_hedefi} unit="net" />
        <Target title="AYT net hedefi" value={month.ayt_net_hedefi} unit="net" />
      </div> : <p>Bu tarih için aylık plan yok.</p>}
    </section>}
  </div>;
}
