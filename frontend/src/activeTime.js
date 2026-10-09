const IDLE_MS = 60_000;
const MAX_MS = 21_600_000;

/** Approximate active time. Timestamps must come from the same monotonic clock. */
export class ActiveTime {
  constructor(now, visible, focused) {
    this.activeMs = 0;
    this.lastTime = now;
    this.lastInteraction = now;
    this.visible = visible;
    this.focused = focused;
  }

  advance(now) {
    const end = Math.max(this.lastTime, now);
    if (this.visible && this.focused) {
      const activeUntil = Math.min(end, this.lastInteraction + IDLE_MS);
      this.activeMs = Math.min(MAX_MS, this.activeMs + Math.max(0, activeUntil - this.lastTime));
    }
    this.lastTime = end;
  }

  interact(now) {
    this.advance(now);
    if (this.visible && this.focused) this.lastInteraction = now;
  }

  setVisibility(now, visible) {
    this.advance(now);
    this.visible = visible;
    if (visible) this.lastInteraction = now;
  }

  setFocus(now, focused) {
    this.advance(now);
    this.focused = focused;
    if (focused) this.lastInteraction = now;
  }

  read(now) {
    this.advance(now);
    return Math.floor(this.activeMs / 1000);
  }

  reset(now) {
    this.activeMs = 0;
    this.lastTime = now;
    this.lastInteraction = now;
  }
}
