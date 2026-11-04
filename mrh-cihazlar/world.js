/* Mr. Mars Music Studio · MRH DGN — Dünya Perküsyonu: Afro (djembe, conga, bongo, shaker, shekere, caxixi,
   agogo, çan, konuşan davul, log drum) ve Doğu (darbuka, bendir, erbane, def, tabla) sentezle */
(function (OS) {
  const R = OS.plugins.register, U = OS.U;
  const MAP = {
    36: 'Afro Kick', 37: 'Clave', 38: 'Djembe Bas', 39: 'Djembe Ton', 40: 'Djembe Slap', 41: 'Conga Alçak', 42: 'Conga Açık', 43: 'Conga Slap',
    44: 'Bongo Alçak', 45: 'Bongo Yüksek', 46: 'Shaker', 47: 'Shekere', 48: 'Caxixi', 49: 'Agogo Alçak', 50: 'Agogo Yüksek', 51: 'Afro Çan (12/8)',
    52: 'Konuşan Davul ↑', 53: 'Konuşan Davul ↓', 54: 'Log Drum', 55: 'Darbuka Düm', 56: 'Darbuka Tek', 57: 'Darbuka Ka', 58: 'Bendir',
    59: 'Erbane', 60: 'Def / Riq', 61: 'Tabla Na', 62: 'Tabla Tin', 63: 'Tabla Ge', 64: 'Afro El Çırpma', 65: 'Parmak Şıklatma', 66: 'Udu',
  };
  OS.WORLD_MAP = MAP; // Doğu·Batı·Afro kalıpları tam listeyi kullanır
  // Davul Makinesi'nde ve Enstrüman Kütüphanesi'nde olanlar bu cihazın listesinde tekrar görünmez, eski notalar çalar
  const LIST = {}; Object.keys(MAP).forEach(n => { if (n < 52 || n > 60) LIST[n] = MAP[n]; });
  R({
    id: 'inst.worldperc', name: 'Dünya Perküsyonu (Afro / Hint)', type: 'instrument', category: 'Enstrüman', drumMap: LIST,
    params: [
      { id: 'tune', name: 'Akort', min: -12, max: 12, def: 0, unit: 'st' },
      { id: 'decay', name: 'Uzunluk', min: 0.3, max: 2.5, def: 1 },
      { id: 'tone', name: 'Ton', min: -1, max: 1, def: 0 },
      { id: 'room', name: 'Oda', min: 0, max: 1, def: 0.15 },
      { id: 'vol', name: 'Ses', min: -40, max: 6, def: -4, unit: 'dB' },
    ],
    create(ctx) {
      const out = ctx.createGain(), bus = ctx.createGain(), tone = ctx.createBiquadFilter(), dry = ctx.createGain(), wet = ctx.createGain(), conv = ctx.createConvolver();
      tone.type = 'highshelf'; tone.frequency.value = 3000;
      conv.buffer = U.makeReverbIR(ctx, 1.1, 3.5, 0.45);
      bus.connect(tone); tone.connect(dry); tone.connect(conv); conv.connect(wet); dry.connect(out); wet.connect(out);
      const p = { tune: 0, decay: 1 };
      const nb = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), nd = nb.getChannelData(0);
      for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
      const live = [];
      const T = () => Math.pow(2, p.tune / 12), D = () => p.decay;
      function env(g, t, peak, dec, att) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + (att || 0.002)); g.gain.exponentialRampToValueAtTime(0.0001, t + dec); }
      function osc(t, type, f0, f1, sweep, dec, peak, dest, att) {
        const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type;
        o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + sweep);
        o.connect(g); g.connect(dest); env(g, t, peak, dec, att); o.start(t); o.stop(t + dec + 0.05); live.push(o); return o;
      }
      function noise(t, dec, type, f, q, peak, dest, att) {
        const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
        s.buffer = nb; s.loop = true; fl.type = type; fl.frequency.value = f; fl.Q.value = q || 1;
        s.connect(fl); fl.connect(g); g.connect(dest); env(g, t, peak, dec, att); s.start(t, Math.random() * 0.5); s.stop(t + dec + 0.05); live.push(s);
      }
      // gergi derili davul: perde düşüşü + vuruş gürültüsü
      const membrane = (t, f, drop, dec, nAmt, nF, dest, v) => { osc(t, 'sine', f * drop, f, 0.03, dec, v, dest); osc(t, 'triangle', f * 1.5 * drop, f * 1.5, 0.02, dec * 0.4, v * 0.25, dest); if (nAmt) noise(t, Math.min(0.08, dec), 'bandpass', nF, 1.2, v * nAmt, dest); };
      const jingles = (t, dec, v, dest, n) => { for (let i = 0; i < (n || 3); i++) noise(t + i * 0.006, dec * (1 - i * 0.2), 'bandpass', 7000 + i * 1300, 4, v * (0.5 - i * 0.1), dest); };
      const bell = (t, f, dec, v, dest) => { const c = ctx.createOscillator(), m = ctx.createOscillator(), mg = ctx.createGain(), g = ctx.createGain(); c.frequency.value = f; m.frequency.value = f * 2.76; mg.gain.setValueAtTime(f * 2, t); mg.gain.exponentialRampToValueAtTime(f * 0.1, t + dec); m.connect(mg); mg.connect(c.frequency); c.connect(g); g.connect(dest); env(g, t, v, dec); c.start(t); m.start(t); c.stop(t + dec + 0.05); m.stop(t + dec + 0.05); live.push(c, m); };
      function hit(n, vel, t) {
        const v = (vel == null ? 100 : vel) / 127, f = T(), d = D(), b = bus;
        switch (n) {
          case 36: osc(t, 'sine', 140 * f, 45 * f, 0.12, 0.6 * d, v, b); noise(t, 0.015, 'lowpass', 2500, 1, v * 0.25, b); break;
          case 37: osc(t, 'sine', 2500 * f, 0, 0, 0.05, v * 0.7, b); osc(t, 'square', 1700 * f, 0, 0, 0.02, v * 0.15, b); break;
          case 38: membrane(t, 70 * f, 2.2, 0.5 * d, 0.15, 900, b, v); break;
          case 39: membrane(t, 300 * f, 1.15, 0.25 * d, 0.3, 2500, b, v * 0.8); break;
          case 40: noise(t, 0.09 * d, 'bandpass', 3200, 1.5, v * 0.9, b); osc(t, 'triangle', 420 * f, 380 * f, 0.03, 0.08, v * 0.4, b); break;
          case 41: membrane(t, 185 * f, 1.3, 0.38 * d, 0.2, 1500, b, v * 0.9); break;
          case 42: membrane(t, 260 * f, 1.25, 0.32 * d, 0.2, 1800, b, v * 0.9); break;
          case 43: noise(t, 0.07 * d, 'bandpass', 2600, 1.4, v * 0.8, b); osc(t, 'triangle', 330 * f, 300 * f, 0.02, 0.06, v * 0.35, b); break;
          case 44: membrane(t, 380 * f, 1.2, 0.16 * d, 0.25, 3000, b, v * 0.8); break;
          case 45: membrane(t, 520 * f, 1.2, 0.13 * d, 0.25, 3600, b, v * 0.8); break;
          case 46: noise(t, 0.06 * d, 'highpass', 6000, 0.8, v * 0.55, b, 0.012); break;
          case 47: noise(t, 0.12 * d, 'bandpass', 5200, 1.2, v * 0.5, b, 0.02); noise(t + 0.03, 0.08 * d, 'highpass', 8000, 1, v * 0.3, b); break;
          case 48: noise(t, 0.05 * d, 'bandpass', 4200, 2, v * 0.55, b, 0.008); noise(t + 0.018, 0.04 * d, 'bandpass', 6400, 2, v * 0.3, b); break;
          case 49: bell(t, 560 * f, 0.4 * d, v * 0.35, b); break;
          case 50: bell(t, 840 * f, 0.35 * d, v * 0.35, b); break;
          case 51: bell(t, 1180 * f, 0.25 * d, v * 0.3, b); osc(t, 'square', 2350 * f, 0, 0, 0.04, v * 0.05, b); break;
          case 52: osc(t, 'sine', 160 * f, 260 * f, 0.18, 0.45 * d, v, b); noise(t, 0.03, 'bandpass', 1800, 1, v * 0.2, b); break;
          case 53: osc(t, 'sine', 260 * f, 140 * f, 0.22, 0.45 * d, v, b); noise(t, 0.03, 'bandpass', 1800, 1, v * 0.2, b); break;
          case 54: { // log drum: perdeli, kısa, sub-bas ağırlıklı
            osc(t, 'sine', 110 * f * 1.8, 110 * f, 0.05, 0.5 * d, v, b); osc(t, 'sine', 55 * f, 55 * f, 0.01, 0.55 * d, v * 0.6, b); osc(t, 'triangle', 220 * f, 0, 0, 0.12, v * 0.25, b); break;
          }
          case 55: membrane(t, 95 * f, 1.6, 0.45 * d, 0.1, 700, b, v); break;
          case 56: noise(t, 0.05 * d, 'bandpass', 4200, 2, v * 0.8, b); osc(t, 'sine', 880 * f, 720 * f, 0.02, 0.06, v * 0.35, b); break;
          case 57: noise(t, 0.035 * d, 'bandpass', 3000, 2.5, v * 0.6, b); break;
          case 58: membrane(t, 75 * f, 1.4, 0.7 * d, 0.05, 600, b, v); noise(t + 0.004, 0.25 * d, 'bandpass', 3500, 0.8, v * 0.25, b); break; // bendir: derin + tel cızıltısı
          case 59: membrane(t, 120 * f, 1.3, 0.5 * d, 0.1, 900, b, v * 0.8); jingles(t, 0.25 * d, v * 0.5, b, 2); break;
          case 60: jingles(t, 0.3 * d, v, b, 3); osc(t, 'sine', 420 * f, 380 * f, 0.02, 0.08, v * 0.2, b); break;
          case 61: osc(t, 'sine', 620 * f, 0, 0, 0.35 * d, v * 0.7, b); osc(t, 'sine', 1240 * f, 0, 0, 0.2 * d, v * 0.3, b); noise(t, 0.02, 'bandpass', 4000, 2, v * 0.3, b); break;
          case 62: osc(t, 'sine', 520 * f, 0, 0, 0.5 * d, v * 0.6, b); osc(t, 'sine', 1560 * f, 0, 0, 0.25 * d, v * 0.25, b); break;
          case 63: osc(t, 'sine', 75 * f, 120 * f, 0.25, 0.6 * d, v, b); break; // tabla ge: avuçla perde yükselir
          case 64: for (let i = 0; i < 4; i++) noise(t + i * 0.009 + Math.random() * 0.004, 0.02, 'bandpass', 1300 + Math.random() * 400, 1.4, v * 0.55, b); noise(t + 0.036, 0.14 * d, 'bandpass', 1300, 1.2, v * 0.5, b); break;
          case 65: noise(t, 0.03, 'bandpass', 2800, 3, v * 0.7, b); osc(t, 'sine', 1900 * f, 0, 0, 0.02, v * 0.2, b); break;
          case 66: osc(t, 'sine', 90 * f, 60 * f, 0.1, 0.5 * d, v, b); noise(t, 0.2 * d, 'lowpass', 400, 4, v * 0.3, b); break;
          default: membrane(t, U.midiToFreq(n), 1.3, 0.3 * d, 0.2, 2000, b, v * 0.8);
        }
        while (live.length > 400) live.shift();
      }
      return {
        output: out,
        set(id, v) { p[id] = v; if (id === 'vol') out.gain.value = U.dbToGain(v); if (id === 'tone') tone.gain.value = v * 9; if (id === 'room') { wet.gain.value = v * 0.6; dry.gain.value = 1 - v * 0.25; } },
        noteOn(n, v, t) { hit(n, v, Math.max(t || 0, ctx.currentTime)); },
        noteOff() { },
        allOff() { live.splice(0).forEach(s => { try { s.stop(); } catch (e) { } }); },
      };
    },
  });
})(window.OS);
