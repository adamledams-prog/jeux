const Comfort = (() => {
  const STORAGE_KEY = "jeux_comfort_v1";

  const PATTERNS = {
    tap: 14,
    death: [80, 45, 110, 40, 90],
    kill: [50, 30, 60],
    killReady: [30],
    frozen: [55, 35, 55],
    power: [20],
    powerFail: [65, 40, 65],
    timerWarn: [38],
    timerUrgent: [42, 42, 42],
    timerFinal: [24],
    victory: [35, 45, 35, 45, 90],
    defeat: [130, 70, 130],
    return: [28, 38, 28, 38, 75],
    offer: [45, 35, 55],
    start: [22, 32, 42],
    join: [18, 28],
  };

  let settings = {
    volume: 88,
    muted: false,
    vibrate: true,
    calmMotion: false,
  };

  function isCoarseTouch() {
    return window.matchMedia("(pointer: coarse)").matches;
  }

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function shouldReduceMotion() {
    return settings.calmMotion || prefersReducedMotion();
  }

  function applyToAudio() {
    if (typeof Sfx === "undefined") return;
    const vol = settings.muted ? 0 : settings.volume / 100;
    Sfx.setMuted(settings.muted);
    Sfx.setVolume(vol);
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.volume === "number") settings.volume = Math.min(100, Math.max(0, parsed.volume));
        if (typeof parsed.muted === "boolean") settings.muted = parsed.muted;
        if (typeof parsed.vibrate === "boolean") settings.vibrate = parsed.vibrate;
        if (typeof parsed.calmMotion === "boolean") settings.calmMotion = parsed.calmMotion;
      } else if (isCoarseTouch()) {
        settings.vibrate = true;
      }
    } catch (_) {
      /* ignore */
    }
    applyToAudio();
    document.body.classList.toggle("touch-device", isCoarseTouch());
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (_) {
      /* ignore */
    }
    applyToAudio();
  }

  function vibratePattern(name) {
    if (!settings.vibrate) return;
    const pattern = PATTERNS[name];
    if (!pattern || !navigator.vibrate) return;
    try {
      navigator.vibrate(pattern);
    } catch (_) {
      /* ignore */
    }
  }

  function setVolume(value) {
    settings.volume = Math.min(100, Math.max(0, Math.round(value)));
    if (settings.volume > 0) settings.muted = false;
    save();
  }

  function setMuted(value) {
    settings.muted = Boolean(value);
    save();
  }

  function setVibrate(value) {
    settings.vibrate = Boolean(value);
    save();
  }

  function setCalmMotion(value) {
    settings.calmMotion = Boolean(value);
    save();
  }

  function get() {
    return { ...settings };
  }

  return {
    load,
    save,
    get,
    setVolume,
    setMuted,
    setVibrate,
    setCalmMotion,
    vibratePattern,
    isCoarseTouch,
    shouldReduceMotion,
    applyToAudio,
  };
})();
