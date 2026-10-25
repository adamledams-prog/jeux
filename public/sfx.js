const Sfx = (() => {
  let ctx = null;
  let muted = false;
  let masterVolume = 1;

  function amp(gain) {
    if (muted || masterVolume <= 0) return 0;
    return gain * masterVolume;
  }

  function getCtx() {
    if (!ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      ctx = new Ctx();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function tone(freq, durationSec, type = "sine", gain = 0.08, delaySec = 0) {
    const g0 = amp(gain);
    if (g0 <= 0) return;
    const ac = getCtx();
    if (!ac) return;
    const t0 = ac.currentTime + delaySec;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(g0, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + durationSec);
    osc.connect(g);
    g.connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + durationSec + 0.03);
  }

  function sweep(freqStart, freqEnd, durationSec, type = "sine", gain = 0.06) {
    const g0 = amp(gain);
    if (g0 <= 0) return;
    const ac = getCtx();
    if (!ac) return;
    const t0 = ac.currentTime;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), t0 + durationSec);
    g.gain.setValueAtTime(g0, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + durationSec);
    osc.connect(g);
    g.connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + durationSec + 0.03);
  }

  function noise(durationSec, gain = 0.035, filterHz = 900) {
    const g0 = amp(gain);
    if (g0 <= 0) return;
    const ac = getCtx();
    if (!ac) return;
    const len = Math.floor(ac.sampleRate * durationSec);
    const buffer = ac.createBuffer(1, len, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource();
    const g = ac.createGain();
    const filter = ac.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = filterHz;
    const t0 = ac.currentTime;
    src.buffer = buffer;
    g.gain.setValueAtTime(g0, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + durationSec);
    src.connect(filter);
    filter.connect(g);
    g.connect(ac.destination);
    src.start(t0);
    src.stop(t0 + durationSec + 0.02);
  }

  function chord(freqs, durationSec, gain = 0.05) {
    freqs.forEach((f, i) => tone(f, durationSec, "sine", gain * 0.7, i * 0.03));
  }

  return {
    unlock() {
      getCtx();
    },
    setMuted(value) {
      muted = value;
    },
    setVolume(value) {
      masterVolume = Math.min(1, Math.max(0, value));
    },
    getVolume() {
      return masterVolume;
    },
    uiTap() {
      tone(620, 0.04, "sine", 0.04);
    },
    kill() {
      noise(0.08, 0.05, 600);
      tone(180, 0.12, "sawtooth", 0.09);
      setTimeout(() => tone(90, 0.16, "sawtooth", 0.06), 70);
    },
    power() {
      tone(520, 0.07, "triangle", 0.06);
      tone(780, 0.09, "triangle", 0.045);
    },
    powerFail() {
      tone(240, 0.08, "square", 0.045);
      tone(180, 0.1, "square", 0.03);
    },
    freeze() {
      chord([880, 1108], 0.1, 0.04);
      tone(660, 0.14, "sine", 0.04);
    },
    frozenHit() {
      tone(1200, 0.05, "sine", 0.05);
      sweep(400, 150, 0.2, "triangle", 0.05);
    },
    join() {
      tone(392, 0.06, "sine", 0.05);
      tone(523, 0.08, "sine", 0.05);
    },
    lobbyPlayer() {
      tone(494, 0.05, "triangle", 0.04);
    },
    startGame() {
      tone(330, 0.1, "triangle", 0.07);
      setTimeout(() => tone(494, 0.12, "triangle", 0.075), 85);
      setTimeout(() => tone(659, 0.16, "triangle", 0.08), 180);
    },
    victory() {
      [523, 659, 784, 1047].forEach((f, i) => {
        setTimeout(() => tone(f, 0.2, "sine", 0.065), i * 110);
      });
    },
    defeat() {
      tone(220, 0.22, "sawtooth", 0.06);
      setTimeout(() => tone(165, 0.28, "sawtooth", 0.05), 140);
      setTimeout(() => tone(110, 0.35, "sawtooth", 0.04), 300);
    },
    rematch() {
      tone(392, 0.08, "triangle", 0.06);
      setTimeout(() => tone(523, 0.1, "triangle", 0.06), 100);
    },
    portalPlace() {
      sweep(200, 520, 0.18, "sine", 0.06);
      tone(1040, 0.06, "sine", 0.03);
    },
    portalTeleport() {
      sweep(900, 120, 0.22, "triangle", 0.07);
      noise(0.1, 0.04, 1200);
    },
    dash() {
      sweep(180, 420, 0.12, "sawtooth", 0.05);
      noise(0.06, 0.03, 1400);
    },
    invisible() {
      sweep(800, 1600, 0.25, "sine", 0.035);
      tone(2000, 0.08, "sine", 0.02);
    },
    speed() {
      sweep(300, 600, 0.14, "square", 0.04);
      tone(720, 0.1, "triangle", 0.045);
    },
    disguise() {
      [440, 554, 659].forEach((f, i) => {
        setTimeout(() => tone(f, 0.09, "triangle", 0.04), i * 55);
      });
    },
    vision() {
      tone(300, 0.12, "sine", 0.04);
      setTimeout(() => tone(600, 0.2, "sine", 0.05), 80);
      setTimeout(() => tone(900, 0.15, "sine", 0.035), 200);
    },
    killReady() {
      tone(280, 0.05, "sine", 0.03);
    },
    timerWarn30() {
      tone(440, 0.08, "sine", 0.045);
    },
    timerWarn10() {
      tone(554, 0.1, "sine", 0.05);
      setTimeout(() => tone(554, 0.1, "sine", 0.05), 200);
    },
    timerFinal() {
      tone(698, 0.07, "square", 0.04);
    },
    deathBurst() {
      sweep(500, 80, 0.35, "sawtooth", 0.05);
    },
    playerReturn() {
      tone(262, 0.14, "sine", 0.05);
      tone(330, 0.14, "sine", 0.05, 0.1);
      tone(392, 0.18, "sine", 0.055, 0.2);
      tone(523, 0.22, "triangle", 0.05, 0.32);
      sweep(180, 880, 0.4, "sine", 0.035);
    },
    resurrectOffer() {
      tone(440, 0.12, "sine", 0.04);
      setTimeout(() => tone(554, 0.16, "sine", 0.045), 120);
    },
  };
})();
