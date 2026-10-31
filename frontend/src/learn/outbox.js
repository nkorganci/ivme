/** Immutable, per-event keys: one tab can acknowledge its batch without overwriting another tab. */
export class LearnOutbox {
  constructor({ userId, storage, postEvents, postBankAnswer, entries = new Map(), onSaved = () => {}, onChange = () => {} }) {
    Object.assign(this, { userId, storage, postEvents, postBankAnswer, onSaved, onChange });
    this.prefix = `ivme:konu-ogrenme:giden:${userId}:v3:`;
    this.entries = entries;
    this.bankResults = new Map();
    this.storageError = '';
    this.networkError = '';
    this.active = true;
    this.sending = null;
    this.restore();
  }

  changed() { if (this.active) this.onChange(); }
  failStorage() {
    this.storageError = 'Tarayıcı kaydı kullanılamıyor veya bozuk. Bekleyen cevaplar sunucuya kaydedilene kadar bu sayfayı kapatma.';
  }
  restore() {
    try {
      this.storageError = '';
      // Explicit fresh-start policy: never migrate or replay pre-reset drafts.
      const oldPrefix = `ivme:konu-ogrenme:giden:${this.userId}:`;
      const oldKeys = Array.from({ length: this.storage.length }, (_, i) => this.storage.key(i));
      for (const key of oldKeys) {
        if (key === oldPrefix + 'v1' || key?.startsWith(oldPrefix + 'v2:')) this.storage.removeItem(key);
      }
      const keys = Array.from({ length: this.storage.length }, (_, i) => this.storage.key(i));
      for (const key of keys.filter((k) => k?.startsWith(this.prefix))) {
        try {
          const raw = this.storage.getItem(key);
          if (raw === null) continue; // another tab acknowledged it
          const entry = JSON.parse(raw);
          if (!entry?.event?.id || key !== this.prefix + entry.event.id) throw Error('Invalid event');
          if (!this.entries.has(entry.event.id)) this.entries.set(entry.event.id, entry);
        } catch { this.failStorage(); }
      }
    } catch { this.failStorage(); }
  }
  persist(entry) {
    try { this.storage.setItem(this.prefix + entry.event.id, JSON.stringify(entry)); }
    catch { this.failStorage(); }
  }
  add(events) {
    if (!this.active) return;
    for (const event of events) {
      if (this.entries.has(event.id)) continue;
      const entry = { event };
      this.entries.set(event.id, entry); // retain in memory even when storage is full
      this.persist(entry);
    }
    this.changed();
  }
  get pending() { return this.entries.size; }
  get error() {
    const rejected = [...this.entries.values()].filter((e) => e.error);
    return [this.storageError, this.networkError, ...rejected.map((e) => `Kaydedilemedi (${e.event.id}): ${e.error}`)].filter(Boolean).join(' ');
  }
  async send(entries) {
    if (!this.active || !entries.length) return;
    try {
      const bank = entries[0].event.itemType === 'bank';
      const result = bank
        ? await this.postBankAnswer(entries[0].event, this.userId)
        : await this.postEvents(entries.map((e) => e.event), this.userId);
      if (bank && result.event?.id === entries[0].event.id) this.bankResults.set(result.event.id, result);
      const saved = bank ? [result.event] : result.events ?? [];
      const requested = new Set(entries.map((e) => e.event.id));
      const acknowledged = saved.filter((e) => requested.has(e?.id) && Number.isSafeInteger(e.seq) && e.seq > 0);
      // Publish DB acknowledgements before removing the retry copy.
      if (this.active) this.onSaved(acknowledged);
      for (const event of acknowledged) {
        try { this.storage.removeItem(this.prefix + event.id); }
        catch { this.failStorage(); }
        this.entries.delete(event.id);
      }
      if (acknowledged.length !== entries.length) this.networkError = 'Sunucu bütün kayıtları onaylamadı. Onaylanmayan cevaplar bekliyor.';
    } catch (error) {
      if ([400, 404, 409, 413, 422].includes(error.status)) {
        if (entries.length > 1) {
          const middle = Math.ceil(entries.length / 2);
          await this.send(entries.slice(0, middle));
          await this.send(entries.slice(middle));
        } else {
          entries[0].error = error.message;
          this.persist(entries[0]);
        }
      } else {
        this.networkError = 'Sunucuya kaydedilemedi — bağlantı gelince aynı kayıtla tekrar denenecek.';
        throw error;
      }
    } finally { this.changed(); }
  }
  flush(retryRejected = false) {
    if (this.sending) return this.sending;
    this.sending = this.drain(retryRejected).finally(() => { this.sending = null; });
    return this.sending;
  }
  async drain(retryRejected) {
    this.restore();
    for (const entry of this.entries.values()) {
      try {
        if (!this.storage.getItem(this.prefix + entry.event.id)) this.persist(entry);
      } catch { this.failStorage(); }
    }
    this.networkError = '';
    const pending = [...this.entries.values()].filter((e) => retryRejected || !e.error);
    if (retryRejected) for (const entry of pending) { delete entry.error; this.persist(entry); }
    try {
      let batch = [];
      for (const entry of pending) {
        if (!this.active) break;
        if (entry.event.itemType === 'bank') {
          await this.send(batch); batch = [];
          await this.send([entry]);
        } else {
          batch.push(entry);
          if (batch.length === 50) { await this.send(batch); batch = []; }
        }
      }
      await this.send(batch);
    } catch { /* error is visible; keep every unacknowledged event */ }
    this.changed();
  }
}
