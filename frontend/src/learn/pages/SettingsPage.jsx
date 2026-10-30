import { useEffect, useState } from 'react';
import { usePageTitle } from '../../hooks.js';
import { useLearn } from '../LearnContext.jsx';
import { makeEvent } from '../api.js';
import { WEEKDAY_NAMES } from '../engine/dates.js';
import { LEVELS } from '../ui.jsx';
import { downloadReminder } from '../reminders.js';

/** Ayarlar: sınav tarihi (tekrar sıkıştırması), günlük süre, sınavlar ve sırası, hatırlatma, karma set günü, anlatım düzeyi. */
export default function SettingsPage() {
  usePageTitle('Ayarlar · Konuyu Öğrenelim');
  const { settings, updateSettings, state, record } = useLearn();
  const [form, setForm] = useState(settings);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { setForm(settings); }, [settings]);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const toggleTrack = (track) => set('tracks', form.tracks.includes(track) ? form.tracks.filter((t) => t !== track) : [...form.tracks, track]);

  const save = async (event) => {
    event.preventDefault();
    setBusy(true); setMessage(''); setError('');
    try {
      if (form.notifications && typeof Notification !== 'undefined' && Notification.permission === 'default') await Notification.requestPermission();
      await updateSettings(form);
      setMessage('Kaydedildi. Plan yeni ayarlarla hesaplandı.');
    } catch (problem) {
      setError(problem.message);
    } finally {
      setBusy(false);
    }
  };

  return <div className="lr-page lr-settings">
    <div className="page-head"><h1>Ayarlar</h1><span className="muted">Konuyu Öğrenelim · Matematik</span></div>
    <form className="card lr-form" onSubmit={save}>
      <label className="lr-field"><span>Sınav tarihi</span>
        <input type="date" value={form.examDate} onChange={(e) => set('examDate', e.target.value)} />
        <small className="muted">Tarih girersen tekrar aralıkları sınava en az ~3 tekrar sığacak biçimde sıkışır; son 21 günde en çok 7 gün olur. Boş bırakırsan sıkıştırma yapılmaz.</small>
      </label>
      <label className="lr-field"><span>Günlük çalışma süresi (dakika)</span>
        <input type="number" min={20} max={600} step={10} value={form.dailyMinutes} onChange={(e) => set('dailyMinutes', e.target.value)} />
        <small className="muted">Bu, yalnız Konuyu Öğrenelim matematik planının bütçesi. Varsayılan 180.</small>
      </label>
      <fieldset className="lr-field"><legend>Hazırlandığın sınavlar</legend>
        {['TYT', 'AYT'].map((track) => <label key={track} className="lr-check-row"><input type="checkbox" checked={form.tracks.includes(track)} onChange={() => toggleTrack(track)} /> {track} Matematik</label>)}
      </fieldset>
      <label className="lr-field"><span>Yeni konu sırası</span>
        <select value={form.trackOrder.join(',')} onChange={(e) => set('trackOrder', e.target.value.split(','))}>
          <option value="TYT,AYT">Önce TYT, sonra AYT</option>
          <option value="AYT,TYT">Önce AYT, sonra TYT</option>
        </select>
      </label>
      <label className="lr-field"><span>Hatırlatma saati</span>
        <input type="time" value={form.reminderTime} onChange={(e) => set('reminderTime', e.target.value)} />
      </label>
      <label className="lr-check-row"><input type="checkbox" checked={form.notifications} onChange={(e) => set('notifications', e.target.checked)} /> Uygulama açıkken tarayıcı bildirimi göster (günde en çok bir kez)</label>
      <p className="small"><button type="button" className="lr-link" onClick={() => downloadReminder(form)}>Hatırlatmayı takvimine ekle (.ics)</button> — telefon takviminde her gün aynı saatte hatırlatır.</p>
      <label className="lr-field"><span>Haftalık karma set günü</span>
        <select value={form.mixedSetWeekday} onChange={(e) => set('mixedSetWeekday', Number(e.target.value))}>
          {WEEKDAY_NAMES.map((name, i) => <option key={name} value={i}>{name}</option>)}
        </select>
      </label>
      <fieldset className="lr-field"><legend>Varsayılan anlatım düzeyi</legend>
        <div className="lr-level-switch" role="group" aria-label="Anlatım düzeyi">
          {LEVELS.map((l) => <button key={l.id} type="button" className={state.levelPref === l.id ? 'active' : ''} aria-pressed={state.levelPref === l.id}
            onClick={() => record(makeEvent('lesson', { action: 'level', level: l.id }))} title={l.hint}>{l.label}</button>)}
        </div>
        <small className="muted">Derste iki kontrol sorusu zorlarsa daha basit, hepsi “Eminim” ile doğruysa daha derin anlatım önerilir.</small>
      </fieldset>
      <fieldset className="lr-field"><legend>Seviye testi</legend>
        {['TYT', 'AYT'].map((track) => <label key={track} className="lr-check-row"><input type="checkbox" checked={form.placementSkipped.includes(track)}
          onChange={() => set('placementSkipped', form.placementSkipped.includes(track) ? form.placementSkipped.filter((t) => t !== track) : [...form.placementSkipped, track])} /> {track} seviye testini önerme</label>)}
      </fieldset>
      <div className="lr-actions"><button type="submit" className="btn btn-primary" disabled={busy || !form.tracks.length}>{busy ? 'Kaydediliyor…' : 'Kaydet'}</button></div>
      {message && <p className="lr-good" role="status">{message}</p>}
      {error && <p className="field-error" role="alert">{error}</p>}
    </form>
  </div>;
}
