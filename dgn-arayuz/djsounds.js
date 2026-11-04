/* Mr. Mars Music Studio · MRH DGN — sampler için hazır ses bankaları: sentezlenmiş DJ efektleri ve kayıtlı davullar */
(function (OS) {
  const U = OS.U, DJ = OS.ui.dj, SR = 32000;
  const noise = (c, sec) => { const b = c.createBuffer(1, Math.ceil(sec * SR), SR), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; const s = c.createBufferSource(); s.buffer = b; return s; };
  const filt = (c, type, f, q) => { const b = c.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q) b.Q.value = q; return b; };
  const osc = (c, type, f) => { const o = c.createOscillator(); o.type = type; o.frequency.value = f; return o; };
  const gain = (c, v) => { const g = c.createGain(); g.gain.value = v; return g; };

  // Her ses: [ad, süre, kurucu(c, çıkış, süre)]
  const FX = [
    ['Yükseliş', 4, (c, o, d) => { const n = noise(c, d), f = filt(c, 'bandpass', 300, 1.2), g = gain(c, 0); n.connect(f); f.connect(g); g.connect(o); f.frequency.exponentialRampToValueAtTime(9000, d); g.gain.linearRampToValueAtTime(0.8, d * 0.97); g.gain.linearRampToValueAtTime(0, d); n.start(); }],
    ['İniş', 3, (c, o, d) => { const n = noise(c, d), f = filt(c, 'bandpass', 9000, 1.2), g = gain(c, 0.8); n.connect(f); f.connect(g); g.connect(o); f.frequency.exponentialRampToValueAtTime(200, d); g.gain.linearRampToValueAtTime(0, d); n.start(); }],
    ['Darbe', 2.5, (c, o, d) => { const s = osc(c, 'sine', 90), g = gain(c, 1); s.frequency.exponentialRampToValueAtTime(28, 0.6); g.gain.exponentialRampToValueAtTime(0.001, d); s.connect(g); g.connect(o); s.start(); s.stop(d); const n = noise(c, 1.4), h = filt(c, 'lowpass', 5000), a = gain(c, 0.7); a.gain.exponentialRampToValueAtTime(0.001, 1.3); n.connect(h); h.connect(a); a.connect(o); n.start(); }],
    ['Sub İniş', 2, (c, o, d) => { const s = osc(c, 'sine', 110), g = gain(c, 0.9); s.frequency.exponentialRampToValueAtTime(30, d); g.gain.setValueAtTime(0.9, d * 0.7); g.gain.linearRampToValueAtTime(0, d); s.connect(g); g.connect(o); s.start(); s.stop(d); }],
    ['Korna', 1.6, (c, o) => { [0, 0.2, 0.4, 0.9].forEach((t, i) => { [466, 472, 702].forEach(f => { const s = osc(c, 'sawtooth', f), g = gain(c, 0), h = filt(c, 'lowpass', 2600); const len = i === 3 ? 0.65 : 0.15; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.16, t + 0.01); g.gain.setValueAtTime(0.16, t + len); g.gain.linearRampToValueAtTime(0, t + len + 0.03); s.connect(h); h.connect(g); g.connect(o); s.start(t); s.stop(t + len + 0.05); }); }); }],
    ['Siren', 3, (c, o, d) => { const s = osc(c, 'square', 700), l = osc(c, 'sine', 1.6), lg = gain(c, 350), g = gain(c, 0.25), h = filt(c, 'lowpass', 3000); l.connect(lg); lg.connect(s.frequency); s.connect(h); h.connect(g); g.connect(o); g.gain.setValueAtTime(0.25, d - 0.1); g.gain.linearRampToValueAtTime(0, d); s.start(); l.start(); s.stop(d); l.stop(d); }],
    ['Lazer', 0.6, (c, o, d) => { for (let k = 0; k < 3; k++) { const t = k * 0.14, s = osc(c, 'sawtooth', 3200), g = gain(c, 0), h = filt(c, 'bandpass', 2000, 2); s.frequency.setValueAtTime(3200, t); s.frequency.exponentialRampToValueAtTime(180, t + 0.13); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.14); s.connect(h); h.connect(g); g.connect(o); s.start(t); s.stop(t + 0.15); } }],
    ['Zap', 0.35, (c, o, d) => { const s = osc(c, 'square', 80), g = gain(c, 0.45); s.frequency.exponentialRampToValueAtTime(2400, d); g.gain.linearRampToValueAtTime(0, d); s.connect(g); g.connect(o); s.start(); s.stop(d); }],
    ['Süpürme', 2, (c, o, d) => { const n = noise(c, d), f = filt(c, 'highpass', 200, 2), g = gain(c, 0); n.connect(f); f.connect(g); g.connect(o); f.frequency.exponentialRampToValueAtTime(9000, d * 0.6); f.frequency.exponentialRampToValueAtTime(300, d); g.gain.linearRampToValueAtTime(0.7, d * 0.6); g.gain.linearRampToValueAtTime(0, d); n.start(); }],
    ['Ters Zil', 2.5, (c, o, d) => { const n = noise(c, d), f = filt(c, 'highpass', 4500), g = gain(c, 0.0001); n.connect(f); f.connect(g); g.connect(o); g.gain.exponentialRampToValueAtTime(0.75, d * 0.985); g.gain.linearRampToValueAtTime(0, d); n.start(); }],
    ['Trampet Yağmuru', 2, (c, o, d) => { let t = 0, step = 0.25; while (t < d - 0.05) { const n = noise(c, 0.1), f = filt(c, 'bandpass', 2200, 0.8), g = gain(c, 0); const lv = 0.25 + 0.65 * (t / d); g.gain.setValueAtTime(lv, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.09); n.connect(f); f.connect(g); g.connect(o); n.start(t); t += step; if (t > d * 0.5) step = 0.125; if (t > d * 0.75) step = 0.0625; } }],
    ['Plak Durma', 1.2, (c, o, d) => { const s = osc(c, 'sawtooth', 220), f = filt(c, 'lowpass', 2400), g = gain(c, 0.5); s.frequency.exponentialRampToValueAtTime(18, d); f.frequency.exponentialRampToValueAtTime(200, d); g.gain.linearRampToValueAtTime(0, d); s.connect(f); f.connect(g); g.connect(o); s.start(); s.stop(d); }],
    ['Vuruş Yankısı', 2, (c, o, d) => { [0, 0.25, 0.5, 0.75, 1, 1.25].forEach((t, i) => { const s = osc(c, 'triangle', 660), g = gain(c, 0), lv = 0.6 * Math.pow(0.62, i); g.gain.setValueAtTime(lv, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2); s.connect(g); g.connect(o); s.start(t); s.stop(t + 0.22); }); }],
    ['Çan', 2, (c, o, d) => { [880, 1320, 2093, 3136].forEach((f, i) => { const s = osc(c, 'sine', f), g = gain(c, 0.3 / (i + 1)); g.gain.exponentialRampToValueAtTime(0.001, d); s.connect(g); g.connect(o); s.start(); s.stop(d); }); }],
    ['Beyaz Vuruş', 0.5, (c, o, d) => { const n = noise(c, d), g = gain(c, 0.8); g.gain.exponentialRampToValueAtTime(0.001, d); n.connect(g); g.connect(o); n.start(); }],
    ['Tok Vuruş', 0.5, (c, o, d) => { const s = osc(c, 'sine', 160), g = gain(c, 1); s.frequency.exponentialRampToValueAtTime(45, 0.1); g.gain.exponentialRampToValueAtTime(0.001, d); s.connect(g); g.connect(o); s.start(); s.stop(d); }],
  ];
  const KIT = [[36, 'Kick'], [38, 'Snare'], [39, 'Clap'], [37, 'Rim'], [42, 'Hi-Hat Kapalı'], [46, 'Hi-Hat Açık'], [49, 'Crash'], [51, 'Ride'], [45, 'Tom Orta'], [41, 'Tom Alçak 2'], [56, 'Cowbell'], [54, 'Tambur'], [60, 'Bongo Yüksek'], [64, 'Konga'], [63, 'Darbuka'], [62, 'Djembe']];

  async function renderFx([name, dur, build]) {
    const c = new OfflineAudioContext(1, Math.ceil(dur * SR), SR), o = gain(c, 0.9);
    o.connect(c.destination); build(c, o, dur);
    const b = await c.startRendering(), d = b.getChannelData(0);
    let pk = 0; for (let i = 0; i < d.length; i++) pk = Math.max(pk, Math.abs(d[i]));
    if (pk > 0) for (let i = 0; i < d.length; i++) d[i] *= 0.75 / pk;
    return new File([U.encodeWav([d], SR, 16)], name + '.wav', { type: 'audio/wav' });
  }
  DJ.sounds = {
    FX,
    async files(kind) {
      if (kind === 'fx') return Promise.all(FX.map(renderFx));
      await OS.loadDrumSamples(OS.engine.ctx);
      return KIT.map(([n, name]) => { const bin = atob(window.OS_DRUM_SAMPLES[n]), a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new File([a], name + '.wav', { type: 'audio/wav' }); });
    },
    // Hazır bankayı açar; yoksa oluşturup 16 pedi doldurur, kullanıcının bankalarına dokunmaz
    async addBank(kind) {
      const P = DJ.pads, name = kind === 'fx' ? 'DJ Efektleri' : 'Kayıtlı Davullar', at = P.banks.findIndex(b => b.name === name);
      if (at >= 0) { P.bank = at; return; }
      const files = await this.files(kind);
      P.newBank(name);
      for (let i = 0; i < files.length; i++) await P.load(i, files[i]);
    },
  };
})(window.OS);
