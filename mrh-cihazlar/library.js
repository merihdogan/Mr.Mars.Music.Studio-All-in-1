/* Mr. Mars Music Studio · MRH DGN — Enstrüman Kütüphanesi: telli, mızraplı, üflemeli, yaylı, tuşlu ve
   Türk müziği çalgılarının sentezle modellenmiş sesleri (örnek kaydı kullanılmaz) */
(function (OS) {
  const R = OS.plugins.register, U = OS.U;

  // body: gövde rezonansları [frekans, kazanç dB, Q]; hp/lp: genel ton
  const M = [
    // ---- Telli / mızraplı (Karplus-Strong + gövde) ----
    { name: 'Akustik Gitar', group: 'Telli', eng: 'pluck', bright: 0.55, decay: 0.9985, body: [[110, 6, 2], [220, 4, 2], [2500, 3, 1]], lp: 9000 },
    { name: 'Klasik Gitar (Naylon)', group: 'Telli', eng: 'pluck', bright: 0.35, decay: 0.998, body: [[100, 6, 2], [200, 4, 2], [1800, -2, 1]], lp: 6000 },
    { name: 'Elektro Gitar (Temiz)', group: 'Telli', eng: 'pluck', bright: 0.6, decay: 0.9992, body: [[700, 3, 1], [3000, 4, 1.5]], lp: 7000, hp: 90 },
    { name: 'Elektro Gitar (Distorsiyon)', group: 'Telli', eng: 'pluck', bright: 0.7, decay: 0.9995, body: [[800, 5, 1], [2500, 3, 1]], lp: 5000, hp: 100, drive: 18 },
    { name: 'Bas Gitar', group: 'Telli', eng: 'pluck', bright: 0.3, decay: 0.9993, body: [[80, 5, 1.5], [700, 2, 1]], lp: 3500, oct: -1 },
    { name: 'Bağlama / Saz', group: 'Türk Çalgıları', eng: 'pluck', bright: 0.85, decay: 0.9975, body: [[350, 4, 3], [1200, 5, 2], [3500, 6, 2]], lp: 11000, hp: 120, buzz: 0.35, course: 3 },
    { name: 'Cura', group: 'Türk Çalgıları', eng: 'pluck', bright: 0.9, decay: 0.997, body: [[600, 4, 3], [2500, 6, 2]], lp: 12000, hp: 200, buzz: 0.3, course: 2, oct: 1 },
    { name: 'Ud', group: 'Türk Çalgıları', eng: 'pluck', bright: 0.4, decay: 0.997, body: [[90, 7, 2], [250, 5, 2], [1100, 2, 1.5]], lp: 5000, course: 2 },
    { name: 'Kanun', group: 'Türk Çalgıları', eng: 'pluck', bright: 0.8, decay: 0.9988, body: [[200, 4, 2], [1500, 3, 1.5], [4000, 4, 1.5]], lp: 12000, course: 3 },
    { name: 'Cümbüş', group: 'Türk Çalgıları', eng: 'pluck', bright: 0.75, decay: 0.997, body: [[180, 4, 2], [900, 6, 3], [2800, 5, 2]], lp: 9000, buzz: 0.2, course: 2 },
    { name: 'Mandolin', group: 'Telli', eng: 'pluck', bright: 0.8, decay: 0.997, body: [[400, 4, 2], [2000, 4, 2]], lp: 10000, course: 2 },
    { name: 'Banjo', group: 'Telli', eng: 'pluck', bright: 0.9, decay: 0.995, body: [[500, 6, 4], [2000, 6, 2]], lp: 12000, hp: 150 },
    { name: 'Arp (Harp)', group: 'Telli', eng: 'pluck', bright: 0.45, decay: 0.9994, body: [[150, 4, 1.5], [600, 2, 1]], lp: 8000 },
    { name: 'Sitar', group: 'Telli', eng: 'pluck', bright: 0.85, decay: 0.9985, body: [[300, 3, 2], [2000, 6, 3]], lp: 10000, buzz: 0.6 },
    { name: 'Klavsen', group: 'Tuşlu', eng: 'pluck', bright: 0.95, decay: 0.9985, body: [[300, 2, 1], [3000, 4, 1]], lp: 12000, course: 2 },
    // ---- Üflemeli ----
    { name: 'Flüt', group: 'Üflemeli', eng: 'wind', harm: [1, 0.25, 0.1, 0.04, 0.02], breath: 0.12, vib: [5, 12], att: 0.06, lpMul: 6 },
    { name: 'Ney', group: 'Türk Çalgıları', eng: 'wind', harm: [1, 0.18, 0.06, 0.03], breath: 0.3, vib: [4.5, 18], att: 0.12, lpMul: 5, form: [[700, 4, 2]] },
    { name: 'Klarnet', group: 'Üflemeli', eng: 'wind', harm: [1, 0.02, 0.7, 0.02, 0.45, 0.02, 0.28, 0.02, 0.15, 0.01, 0.08], breath: 0.03, vib: [5, 6], att: 0.04, lpMul: 10 },
    { name: 'Klarnet (Türk / Sol)', group: 'Türk Çalgıları', eng: 'wind', harm: [1, 0.05, 0.8, 0.05, 0.55, 0.04, 0.35, 0.03, 0.2], breath: 0.06, vib: [6, 22], att: 0.03, lpMul: 14, form: [[1500, 4, 2]] },
    { name: 'Obua', group: 'Üflemeli', eng: 'wind', harm: [0.6, 1, 0.8, 0.6, 0.4, 0.3, 0.2, 0.15], breath: 0.03, vib: [5, 8], att: 0.05, lpMul: 12, form: [[1100, 6, 3]] },
    { name: 'Saksafon (Alto)', group: 'Üflemeli', eng: 'wind', harm: 'rich', richExp: 0.9, breath: 0.08, vib: [5, 10], att: 0.05, lpMul: 8, form: [[550, 5, 2], [1600, 4, 2]], growl: 0.15 },
    { name: 'Saksafon (Tenor)', group: 'Üflemeli', eng: 'wind', harm: 'rich', richExp: 0.85, breath: 0.1, vib: [4.8, 10], att: 0.06, lpMul: 7, form: [[450, 6, 2], [1300, 4, 2]], growl: 0.25, oct: -1 },
    { name: 'Trompet', group: 'Üflemeli', eng: 'wind', harm: 'rich', richExp: 0.6, breath: 0.02, vib: [5.5, 6], att: 0.035, lpMul: 3, brass: 1, form: [[1300, 5, 1.5]] },
    { name: 'Trombon', group: 'Üflemeli', eng: 'wind', harm: 'rich', richExp: 0.7, breath: 0.02, vib: [5, 5], att: 0.06, lpMul: 3, brass: 1, form: [[600, 5, 1.5]], oct: -1 },
    { name: 'Korno', group: 'Üflemeli', eng: 'wind', harm: 'rich', richExp: 1.1, breath: 0.02, vib: [5, 4], att: 0.08, lpMul: 3, brass: 0.6, form: [[400, 5, 1.5]] },
    { name: 'Zurna', group: 'Türk Çalgıları', eng: 'wind', harm: 'rich', richExp: 0.35, breath: 0.05, vib: [6, 15], att: 0.02, lpMul: 20, form: [[1200, 8, 2], [2800, 6, 2]] },
    { name: 'Mızıka', group: 'Üflemeli', eng: 'wind', harm: [1, 0.6, 0.5, 0.35, 0.25, 0.2, 0.12], breath: 0.06, vib: [6, 10], att: 0.03, lpMul: 8, form: [[1800, 5, 2]] },
    // ---- Yaylı ----
    { name: 'Keman', group: 'Yaylı', eng: 'bow', vib: [5.5, 18], att: 0.09, body: [[290, 5, 2], [1000, 3, 1.5], [2600, 6, 2]], lpMul: 14 },
    { name: 'Viyola', group: 'Yaylı', eng: 'bow', vib: [5.2, 16], att: 0.1, body: [[220, 5, 2], [800, 3, 1.5], [2000, 5, 2]], lpMul: 12 },
    { name: 'Çello', group: 'Yaylı', eng: 'bow', vib: [5, 14], att: 0.12, body: [[110, 6, 2], [500, 4, 1.5], [1500, 3, 2]], lpMul: 10, oct: -1 },
    { name: 'Kontrbas (Yay)', group: 'Yaylı', eng: 'bow', vib: [4.5, 10], att: 0.15, body: [[70, 6, 2], [300, 4, 1.5]], lpMul: 8, oct: -2 },
    { name: 'Kemençe', group: 'Türk Çalgıları', eng: 'bow', vib: [6, 25], att: 0.06, body: [[400, 6, 3], [1400, 5, 2], [3200, 5, 2]], lpMul: 16 },
    { name: 'Yaylı Grubu (Orkestra)', group: 'Yaylı', eng: 'bow', vib: [5, 12], att: 0.3, body: [[250, 4, 1.5], [2500, 3, 1.5]], lpMul: 10, ens: 3 },
    // ---- Tuşlu / vurmalı ----
    { name: 'Piyano', group: 'Tuşlu', eng: 'fm', ratio: 1, index: 1.4, idec: 0.4, dec: 2.8, sus: 0, rel: 0.4, hammer: 0.15, det: 1.5 },
    { name: 'Elektrik Piyano', group: 'Tuşlu', eng: 'fm', ratio: 1, index: 3, idec: 0.9, dec: 2, sus: 0.15, rel: 0.4 },
    { name: 'Org', group: 'Tuşlu', eng: 'organ', bars: [1, 0.8, 0.6, 0, 0.4, 0, 0, 0.3], trem: 6 },
    { name: 'Akordeon', group: 'Tuşlu', eng: 'organ', bars: [1, 0.7, 0.5, 0.4, 0.3, 0.25, 0.2, 0.15], reed: 1, trem: 0, det: 9 },
    { name: 'Marimba', group: 'Vurmalı', eng: 'fm', ratio: 4, index: 2.5, idec: 0.05, dec: 0.6, sus: 0, rel: 0.3 },
    { name: 'Vibrafon', group: 'Vurmalı', eng: 'fm', ratio: 4, index: 1, idec: 0.2, dec: 3, sus: 0, rel: 1, trem: 5 },
    { name: 'Müzik Kutusu / Çelesta', group: 'Vurmalı', eng: 'fm', ratio: 5, index: 2, idec: 0.3, dec: 1.5, sus: 0, rel: 0.6, oct: 1 },
    { name: 'Çan', group: 'Vurmalı', eng: 'fm', ratio: 3.5, index: 6, idec: 2, dec: 4, sus: 0, rel: 2 },
    // ---- Synth / vokal ----
    { name: 'Synth Lead', group: 'Synth', eng: 'synth', wave: 'sawtooth', det: 10, cut: 5, att: 0.01 },
    { name: 'Synth Pad', group: 'Synth', eng: 'synth', wave: 'sawtooth', det: 18, cut: 2.5, att: 0.5, rel: 1.5 },
    { name: 'Koro (Aah)', group: 'Vokal', eng: 'bow', vib: [5, 14], att: 0.25, body: [[700, 10, 5], [1150, 8, 5], [2800, 4, 4]], lpMul: 6, ens: 3, noise: 0.03 },
    // ---- V.05: Afro / Doğu / Batı ekleri (listenin sonuna eklenir, eski projelerdeki sıra bozulmaz) ----
    { name: 'Balafon', group: 'Afro', eng: 'fm', ratio: 4, index: 3, idec: 0.04, dec: 0.55, sus: 0, rel: 0.25, hammer: 0.25 },
    { name: 'Kalimba', group: 'Afro', eng: 'fm', ratio: 3, index: 1.2, idec: 0.08, dec: 1.4, sus: 0, rel: 0.5, det: 4 },
    { name: 'Kora', group: 'Afro', eng: 'pluck', bright: 0.75, decay: 0.9993, body: [[180, 4, 2], [1200, 3, 2], [3500, 2, 2]], lp: 11000 },
    { name: 'Log Drum (Afro / Amapiano)', group: 'Afro', eng: 'fm', ratio: 1, index: 0.3, idec: 0.1, dec: 0.55, sus: 0, rel: 0.2, drop: 2.2, dropT: 0.05, oct: -1 },
    { name: 'Konuşan Davul (perdeli)', group: 'Afro', eng: 'fm', ratio: 1.5, index: 0.8, idec: 0.1, dec: 0.5, sus: 0, rel: 0.2, drop: 0.7, dropT: 0.15, hammer: 0.2 },
    { name: 'Duduk', group: 'Türk Çalgıları', eng: 'wind', harm: [1, 0.6, 0.3, 0.15, 0.08, 0.04], breath: 0.05, vib: [5, 14], att: 0.08, lpMul: 5, form: [[600, 5, 2], [1200, 3, 2]] },
    { name: 'Yaylı Tambur', group: 'Türk Çalgıları', eng: 'bow', vib: [5.5, 15], att: 0.07, body: [[300, 4, 3], [1800, 5, 2], [3500, 4, 2]], lpMul: 14 },
    { name: 'Tanbur', group: 'Türk Çalgıları', eng: 'pluck', bright: 0.6, decay: 0.9993, body: [[150, 5, 2], [900, 4, 2], [3000, 3, 2]], lp: 9000, buzz: 0.1 },
    { name: 'Divan Sazı', group: 'Türk Çalgıları', eng: 'pluck', bright: 0.7, decay: 0.999, body: [[250, 5, 3], [1000, 5, 2], [3200, 5, 2]], lp: 10000, buzz: 0.3, course: 3, oct: -1 },
    { name: 'Analog Sub Bas', group: 'Synth', eng: 'synth', wave: 'sawtooth', det: 3, cut: 1.2, att: 0.005, rel: 0.12, oct: -1 },
    { name: '90’lar House Org Bas', group: 'Synth', eng: 'organ', bars: [1, 0, 0.6, 0, 0.3, 0, 0, 0], trem: 0, oct: -1 },
    { name: 'Analog Poli Pad', group: 'Synth', eng: 'synth', wave: 'sawtooth', det: 14, cut: 2, att: 0.6, rel: 2 },
    { name: 'Elektrik Piyano Yumuşak', group: 'Tuşlu', eng: 'fm', ratio: 1, index: 2.5, idec: 1.2, dec: 3, sus: 0.1, rel: 0.5, trem: 4.5 },
    { name: 'Brass Section', group: 'Üflemeli', eng: 'wind', harm: 'rich', richExp: 0.65, breath: 0.02, vib: [5.5, 6], att: 0.05, lpMul: 3, brass: 1, ens: 3, form: [[1200, 4, 1.5]] },
  ];
  OS.LIBRARY = M;

  R({
    id: 'inst.library', name: 'Enstrüman Kütüphanesi', type: 'instrument', category: 'Enstrüman',
    params: [
      { id: 'model', name: 'Enstrüman', type: 'choice', options: M.map(m => m.name), min: 0, max: M.length - 1, def: 0 },
      { id: 'tone', name: 'Ton', min: -1, max: 1, def: 0 },
      { id: 'expr', name: 'İfade (vibrato)', min: 0, max: 2, def: 1 },
      { id: 'sustain', name: 'Uzunluk', min: 0.3, max: 2, def: 1 },
      { id: 'transpose', name: 'Oktav', min: -2, max: 2, def: 0, step: 1 },
      { id: 'room', name: 'Oda', min: 0, max: 1, def: 0.15 },
      { id: 'vol', name: 'Ses', min: -40, max: 6, def: -6, unit: 'dB' },
    ],
    create(ctx) {
      const out = ctx.createGain(), post = ctx.createGain(), dryG = ctx.createGain(), wetG = ctx.createGain(), conv = ctx.createConvolver();
      conv.buffer = U.makeReverbIR(ctx, 1.6, 3, 0.5);
      post.connect(dryG); post.connect(conv); conv.connect(wetG); dryG.connect(out); wetG.connect(out);
      const voiceBus = ctx.createGain();
      const p = { model: 0, tone: 0, expr: 1, sustain: 1, transpose: 0, room: 0.15 };
      let chain = [];
      const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); { const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
      const voices = [], ksCache = new Map(), waves = new Map();
      const m = () => M[Math.round(p.model)];

      // modele özgü ortak son işlem: gövde filtreleri, ton, bozulma
      function buildPost() {
        try { voiceBus.disconnect(); } catch (e) { }
        chain.forEach(n => { try { n.disconnect(); } catch (e) { } });
        chain = [];
        const md = m();
        const add = n => { (chain.length ? chain[chain.length - 1] : voiceBus).connect(n); chain.push(n); return n; };
        if (md.hp) { const f = add(ctx.createBiquadFilter()); f.type = 'highpass'; f.frequency.value = md.hp; }
        if (md.drive) { const g = add(ctx.createGain()); g.gain.value = md.drive; const ws = add(ctx.createWaveShaper()); ws.curve = U.curve('asym', 3); ws.oversample = '4x'; const g2 = add(ctx.createGain()); g2.gain.value = 0.25; }
        (md.body || []).concat(md.form || []).forEach(([f, g, q]) => { const b = add(ctx.createBiquadFilter()); b.type = 'peaking'; b.frequency.value = f; b.gain.value = g; b.Q.value = q; });
        const tl = add(ctx.createBiquadFilter()); tl.type = 'highshelf'; tl.frequency.value = 2500; tl.gain.value = p.tone * 9;
        if (md.lp) { const f = add(ctx.createBiquadFilter()); f.type = 'lowpass'; f.frequency.value = md.lp * (1 + p.tone * 0.4); }
        (chain.length ? chain[chain.length - 1] : voiceBus).connect(post);
        ksCache.clear();
      }

      function pluckBuf(f, md, vel) {
        const key = Math.round(f * 10) + ':' + p.sustain + ':' + Math.round(vel * 4);
        if (ksCache.has(key)) return ksCache.get(key);
        const sr = ctx.sampleRate, dec = Math.min(0.99995, 1 - (1 - md.decay) / p.sustain), len = Math.floor(sr * Math.min(6, 1.2 + 3 * p.sustain));
        const buf = ctx.createBuffer(1, len, sr), d = buf.getChannelData(0);
        const P = sr / f, N = Math.max(2, Math.floor(P)), frac = P - N, line = new Float32Array(N + 1);
        const br = U.clamp(md.bright * (0.7 + vel * 0.4), 0.05, 0.99);
        let lp = 0; for (let i = 0; i <= N; i++) { lp += br * ((Math.random() * 2 - 1) - lp); line[i] = lp; }
        // çekme noktası etkisi: hat içinde tarak filtre
        const pick = Math.max(1, Math.floor(N * 0.13)); for (let i = N; i >= pick; i--) line[i] -= 0.5 * line[i - pick];
        const damp = 0.35 + md.bright * 0.6;
        let idx = 0, prev = 0;
        for (let i = 0; i < len; i++) {
          const a = line[idx], b = line[(idx + 1) % (N + 1)], s = a * (1 - frac) + b * frac;
          let y = dec * (damp * s + (1 - damp) * prev); prev = s;
          if (md.buzz) { const th = 0.25 * (1 - md.buzz); if (y > th) y = th + (y - th) * 0.4; else if (y < -th) y = -th + (y + th) * 0.4; } // perde teması (cızıltı)
          d[i] = s; line[idx] = y; idx = (idx + 1) % (N + 1);
        }
        if (ksCache.size > 300) ksCache.clear();
        ksCache.set(key, buf); return buf;
      }
      function wave(md) {
        if (waves.has(md.name)) return waves.get(md.name);
        const N = 40, re = new Float32Array(N), im = new Float32Array(N);
        for (let h = 1; h < N; h++) im[h] = md.harm === 'rich' ? 1 / Math.pow(h, md.richExp || 1) : (md.harm[h - 1] || 0);
        const w = ctx.createPeriodicWave(re, im); waves.set(md.name, w); return w;
      }
      const env = (g, t, a, peak, dec, sus) => { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); if (dec) g.gain.setTargetAtTime(peak * sus, t + a, dec / 3); };

      function noteOn(n, vel, t) {
        t = Math.max(t || 0, ctx.currentTime);
        const md = m(), v = (vel == null ? 100 : vel) / 127;
        const nn = n + 12 * (p.transpose + (md.oct || 0)), f = U.midiToFreq(nn);
        const amp = ctx.createGain(); amp.connect(voiceBus);
        const src = [], vc = { n, amp, src, released: false, start: t, md };
        if (md.eng === 'pluck') {
          const courses = md.course || 1;
          for (let c = 0; c < courses; c++) {
            const s = ctx.createBufferSource(), g = ctx.createGain();
            s.buffer = pluckBuf(f * (1 + (c - (courses - 1) / 2) * 0.0015), md, v);
            g.gain.value = 0.9 / Math.sqrt(courses); s.connect(g); g.connect(amp);
            s.start(t + c * 0.006); src.push(s);
          }
          amp.gain.setValueAtTime(0.6 + v * 0.6, t);
          vc.auto = src[0].buffer.duration;
        } else if (md.eng === 'wind' || md.eng === 'bow') {
          const ens = md.ens || 1;
          const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = Math.min(18000, f * (md.lpMul || 8) * (0.6 + v * 0.6)); lp.Q.value = 0.7; lp.connect(amp);
          const vib = ctx.createOscillator(), vg = ctx.createGain(); vib.frequency.value = md.vib[0]; vib.connect(vg);
          vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(md.vib[1] * p.expr, t + 0.35); vib.start(t); src.push(vib);
          for (let e = 0; e < ens; e++) {
            const o = ctx.createOscillator(), og = ctx.createGain();
            if (md.eng === 'bow') o.type = 'sawtooth'; else o.setPeriodicWave(wave(md));
            o.frequency.value = f; o.detune.value = ens > 1 ? (e - (ens - 1) / 2) * 9 : 0; vg.connect(o.detune);
            og.gain.value = 0.5 / ens; o.connect(og); og.connect(lp); o.start(t); src.push(o);
          }
          if (md.brass) { lp.frequency.setValueAtTime(f * 1.2, t); lp.frequency.linearRampToValueAtTime(Math.min(16000, f * 9 * (0.5 + v)), t + 0.06); lp.frequency.setTargetAtTime(f * 5 * (0.5 + v), t + 0.08, 0.2); }
          const br = md.breath || md.noise || (md.eng === 'bow' ? 0.02 : 0);
          if (br) {
            const ns = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), ng = ctx.createGain();
            ns.buffer = noise; ns.loop = true; bp.type = 'bandpass'; bp.frequency.value = Math.min(12000, f * 2); bp.Q.value = 1.5;
            ng.gain.value = br * 1.5; ns.connect(bp); bp.connect(ng); ng.connect(amp); ns.start(t); src.push(ns);
          }
          if (md.growl) { const gr = ctx.createOscillator(), gg = ctx.createGain(); gr.frequency.value = 32; gg.gain.value = md.growl * 0.5; gr.connect(gg); gg.connect(amp.gain); gr.start(t); src.push(gr); }
          env(amp, t, md.att * (1.4 - v * 0.6), 0.5 + v * 0.5, 0.4, 0.85);
        } else if (md.eng === 'fm') {
          const car = ctx.createOscillator(), mod = ctx.createOscillator(), mg = ctx.createGain();
          car.frequency.value = f; mod.frequency.value = f * md.ratio; mod.connect(mg); mg.connect(car.frequency); car.connect(amp);
          // perde kayması (log drum, konuşan davul)
          if (md.drop) { car.frequency.setValueAtTime(f * md.drop, t); car.frequency.exponentialRampToValueAtTime(f, t + md.dropT); mod.frequency.setValueAtTime(f * md.ratio * md.drop, t); mod.frequency.exponentialRampToValueAtTime(f * md.ratio, t + md.dropT); }
          const peak = f * md.index * (0.4 + v * 0.8);
          mg.gain.setValueAtTime(peak, t); mg.gain.setTargetAtTime(peak * 0.05, t, md.idec);
          car.start(t); mod.start(t); src.push(car, mod);
          if (md.det) { const c2 = ctx.createOscillator(), g2 = ctx.createGain(); c2.frequency.value = f; c2.detune.value = md.det; g2.gain.value = 0.5; mg.connect(c2.frequency); c2.connect(g2); g2.connect(amp); c2.start(t); src.push(c2); }
          if (md.hammer) { const ns = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), hg = ctx.createGain(); ns.buffer = noise; hp.type = 'bandpass'; hp.frequency.value = f * 4; hg.gain.setValueAtTime(md.hammer * v, t); hg.gain.exponentialRampToValueAtTime(0.0001, t + 0.04); ns.connect(hp); hp.connect(hg); hg.connect(amp); ns.start(t); ns.stop(t + 0.05); }
          if (md.trem) { const tr = ctx.createOscillator(), tg = ctx.createGain(); tr.frequency.value = md.trem; tg.gain.value = 0.15; tr.connect(tg); tg.connect(amp.gain); tr.start(t); src.push(tr); }
          const dec = md.dec * p.sustain * (1.3 - (nn - 60) / 100);
          env(amp, t, 0.003, 0.35 + v * 0.45, Math.max(0.1, dec), md.sus);
          if (!md.sus) vc.auto = dec * 2.2;
        } else if (md.eng === 'organ') {
          const ratios = [0.5, 1, 1.5, 2, 3, 4, 5, 6];
          md.bars.forEach((b, i) => {
            if (!b) return;
            const o = ctx.createOscillator(), g = ctx.createGain();
            o.type = md.reed ? 'square' : 'sine'; o.frequency.value = f * ratios[i] * (md.reed ? 1 : 1); if (md.reed && i % 2) o.detune.value = md.det;
            g.gain.value = b * (md.reed ? 0.06 : 0.12); o.connect(g); g.connect(amp); o.start(t); src.push(o);
          });
          if (md.trem) { const tr = ctx.createOscillator(), tg = ctx.createGain(); tr.frequency.value = md.trem; tg.gain.value = 0.1; tr.connect(tg); tg.connect(amp.gain); tr.start(t); src.push(tr); }
          env(amp, t, md.reed ? 0.03 : 0.005, 0.6 + v * 0.3, 0.2, 0.95);
        } else {
          const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = Math.min(18000, f * md.cut * 4 * (0.5 + v)); lp.Q.value = 2; lp.connect(amp);
          [-1, 0, 1].forEach(k => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = md.wave; o.frequency.value = f; o.detune.value = k * md.det; g.gain.value = 0.25; o.connect(g); g.connect(lp); o.start(t); src.push(o); });
          env(amp, t, md.att, 0.5 + v * 0.4, 0.5, 0.8);
        }
        voices.push(vc);
        src[0].onended = () => { const i = voices.indexOf(vc); if (i >= 0) voices.splice(i, 1); try { amp.disconnect(); } catch (e) { } };
        if (vc.auto) src.forEach(s => { try { s.stop(t + vc.auto + 0.1); } catch (e) { } });
        if (voices.filter(x => !x.released).length > 32) off(voices.find(x => !x.released), t, 0.03);
      }
      function off(vc, t, r) {
        if (!vc || vc.released) return;
        vc.released = true;
        const g = vc.amp.gain;
        if (g.cancelAndHoldAtTime) g.cancelAndHoldAtTime(t); else g.cancelScheduledValues(t);
        g.setTargetAtTime(0, t, Math.max(0.01, r / 4));
        vc.src.forEach(s => { try { s.stop(t + r * 1.6 + 0.05); } catch (e) { } });
      }
      const relOf = md => md.eng === 'pluck' ? 0.25 * p.sustain : md.eng === 'fm' ? (md.rel || 0.4) : md.eng === 'organ' ? 0.08 : md.rel || 0.18;
      buildPost();
      return {
        output: out,
        set(id, v) {
          const prev = p[id]; p[id] = v;
          if (id === 'vol') out.gain.value = U.dbToGain(v);
          if (id === 'room') { wetG.gain.value = v * 0.6; dryG.gain.value = 1 - v * 0.3; }
          if ((id === 'model' && Math.round(prev) !== Math.round(v)) || id === 'tone') buildPost();
          if (id === 'sustain') ksCache.clear();
        },
        noteOn,
        noteOff(n, t) { t = Math.max(t || 0, ctx.currentTime); const vc = voices.find(x => x.n === n && !x.released && x.start <= t + 0.001); if (vc) off(vc, t, relOf(vc.md)); },
        allOff() { voices.forEach(v => off(v, ctx.currentTime, 0.03)); },
      };
    },
  });
})(window.OS);
