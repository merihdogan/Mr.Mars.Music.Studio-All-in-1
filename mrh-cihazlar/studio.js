/* Mr. Mars Music Studio · MRH DGN — stüdyo işlemcileri: FET / opto kompresör, kaset, satüratör,
   AM-ring-FM modülatör, formant filtre, shimmer reverb */
(function (OS) {
  const R = OS.plugins.register, U = OS.U;
  const shell = (...a) => OS.fxShell(...a), lfo = (...a) => OS.fxLfo(...a);

  R({
    id: 'fx.fetcomp', name: 'FET Kompresör (hızlı)', category: 'Stüdyo',
    params: [
      { id: 'input', name: 'Giriş', min: 0, max: 30, def: 12, unit: 'dB' },
      { id: 'output', name: 'Çıkış', min: -30, max: 6, def: -8, unit: 'dB' },
      { id: 'ratio', name: 'Oran', type: 'choice', options: ['4:1', '8:1', '12:1', '20:1', 'Tümü (ezici)'], min: 0, max: 4, def: 0 },
      { id: 'att', name: 'Atak', min: 0.00002, max: 0.0008, def: 0.0002, unit: 's', curve: 'log' },
      { id: 'rel', name: 'Bırakma', min: 0.05, max: 1.1, def: 0.25, unit: 's', curve: 'log' },
      { id: 'mix', name: 'Paralel', min: 0, max: 1, def: 1 },
    ],
    create(ctx) {
      const s = shell(ctx), ig = ctx.createGain(), c = ctx.createDynamicsCompressor(), sat = ctx.createWaveShaper(), og = ctx.createGain();
      c.threshold.value = -20; c.knee.value = 3;
      s.input.connect(ig); ig.connect(c); c.connect(sat); sat.connect(og); og.connect(s.wet);
      sat.curve = U.curve('soft', 1.4);
      return {
        input: s.input, output: s.output,
        set(id, v) {
          if (id === 'input') ig.gain.value = U.dbToGain(v); if (id === 'output') og.gain.value = U.dbToGain(v);
          if (id === 'ratio') { const r = Math.round(v); c.ratio.value = [4, 8, 12, 20, 20][r]; c.knee.value = r === 4 ? 0 : 3; sat.curve = U.curve(r === 4 ? 'hard' : 'soft', r === 4 ? 2.2 : 1.4); }
          if (id === 'att') c.attack.value = v; if (id === 'rel') c.release.value = v; if (id === 'mix') s.mix(v);
        },
      };
    },
  });

  R({
    id: 'fx.optocomp', name: 'Opto Kompresör (yumuşak)', category: 'Stüdyo',
    params: [
      { id: 'peak', name: 'Tepe Azaltma', min: 0, max: 100, def: 40 },
      { id: 'gain', name: 'Kazanç', min: 0, max: 30, def: 6, unit: 'dB' },
      { id: 'mode', name: 'Mod', type: 'choice', options: ['Sıkıştır', 'Sınırla'], min: 0, max: 1, def: 0 },
      { id: 'emph', name: 'Tiz Vurgusu', min: 0, max: 1, def: 0 },
    ],
    create(ctx) {
      const c = ctx.createDynamicsCompressor(), g = ctx.createGain(), warm = ctx.createBiquadFilter(), emph = ctx.createBiquadFilter();
      c.attack.value = 0.01; c.release.value = 0.6; c.knee.value = 12;
      warm.type = 'lowshelf'; warm.frequency.value = 180; warm.gain.value = 1;
      emph.type = 'highshelf'; emph.frequency.value = 3000;
      emph.connect(c); c.connect(warm); warm.connect(g);
      return {
        input: emph, output: g,
        set(id, v) {
          if (id === 'peak') c.threshold.value = -v * 0.45; if (id === 'gain') g.gain.value = U.dbToGain(v);
          if (id === 'mode') { c.ratio.value = v >= 0.5 ? 20 : 3.5; c.knee.value = v >= 0.5 ? 4 : 12; }
          if (id === 'emph') emph.gain.value = -v * 6;
        },
      };
    },
  });

  R({
    id: 'fx.tape', name: 'Kaset / Bant Makinesi', category: 'Stüdyo',
    params: [
      { id: 'drive', name: 'Satürasyon', min: 0, max: 1, def: 0.4 },
      { id: 'wow', name: 'Wow', min: 0, max: 1, def: 0.3 },
      { id: 'flutter', name: 'Flutter', min: 0, max: 1, def: 0.2 },
      { id: 'hiss', name: 'Hışırtı', min: 0, max: 1, def: 0.15 },
      { id: 'age', name: 'Yıpranma', min: 0, max: 1, def: 0.3 },
      { id: 'mix', name: 'Karışım', min: 0, max: 1, def: 1 },
    ],
    create(ctx) {
      const s = shell(ctx), dl = ctx.createDelay(0.05), ws = ctx.createWaveShaper(), lp = ctx.createBiquadFilter(), hp = ctx.createBiquadFilter(), bump = ctx.createBiquadFilter();
      const W = lfo(ctx), F = lfo(ctx), hissG = ctx.createGain(), ns = ctx.createBufferSource();
      dl.delayTime.value = 0.01; W.osc.frequency.value = 0.6; F.osc.frequency.value = 7.5;
      W.gain.connect(dl.delayTime); F.gain.connect(dl.delayTime);
      lp.type = 'lowpass'; hp.type = 'highpass'; bump.type = 'peaking'; bump.frequency.value = 90; bump.gain.value = 3; ws.oversample = '2x';
      const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), nd = nb.getChannelData(0); let lpv = 0;
      for (let i = 0; i < nd.length; i++) { lpv += 0.3 * (Math.random() * 2 - 1 - lpv); nd[i] = lpv; }
      ns.buffer = nb; ns.loop = true; ns.connect(hissG); hissG.connect(s.wet); ns.start();
      s.input.connect(dl); dl.connect(ws); ws.connect(bump); bump.connect(hp); hp.connect(lp); lp.connect(s.wet);
      const p = { drive: 0.4, wow: 0.3, flutter: 0.2, hiss: 0.15, age: 0.3 };
      const apply = () => {
        ws.curve = U.curve('tube', 1 + p.drive * 3);
        W.gain.gain.value = p.wow * 0.0025; F.gain.gain.value = p.flutter * 0.0003;
        hissG.gain.value = p.hiss * 0.02;
        lp.frequency.value = 16000 - p.age * 11000; hp.frequency.value = 20 + p.age * 120;
      };
      apply();
      return {
        input: s.input, output: s.output,
        set(id, v) { if (id in p) { p[id] = v; apply(); } if (id === 'mix') s.mix(v); },
        dispose() { W.stop(); F.stop(); try { ns.stop(); } catch (e) { } },
      };
    },
  });

  const SAT = ['Tüp', 'Bant', 'Transistör', 'Dijital'], SATK = ['tube', 'soft', 'asym', 'hard'];
  R({
    id: 'fx.saturator', name: 'Satüratör', category: 'Stüdyo',
    params: [
      { id: 'drive', name: 'Sürüş', min: 0, max: 24, def: 6, unit: 'dB' },
      { id: 'type', name: 'Tip', type: 'choice', options: SAT, min: 0, max: 3, def: 0 },
      { id: 'tone', name: 'Ton', min: -1, max: 1, def: 0 },
      { id: 'out', name: 'Çıkış', min: -24, max: 6, def: -3, unit: 'dB' },
      { id: 'mix', name: 'Karışım', min: 0, max: 1, def: 1 },
    ],
    create(ctx) {
      const s = shell(ctx), g = ctx.createGain(), ws = ctx.createWaveShaper(), t = ctx.createBiquadFilter(), o = ctx.createGain();
      ws.oversample = '4x'; t.type = 'highshelf'; t.frequency.value = 3000;
      s.input.connect(g); g.connect(ws); ws.connect(t); t.connect(o); o.connect(s.wet);
      const p = { drive: 6, type: 0 };
      const apply = () => { g.gain.value = U.dbToGain(p.drive); ws.curve = U.curve(SATK[Math.round(p.type)], 1.2 + p.drive / 12); };
      apply();
      return { input: s.input, output: s.output, set(id, v) { if (id in p) { p[id] = v; apply(); } if (id === 'tone') t.gain.value = v * 8; if (id === 'out') o.gain.value = U.dbToGain(v); if (id === 'mix') s.mix(v); } };
    },
  });

  R({
    id: 'fx.ringmod', name: 'AM / Ring / FM Modülatör', category: 'Modülasyon',
    params: [
      { id: 'mode', name: 'Mod', type: 'choice', options: ['AM (genlik)', 'Ring', 'FM (frekans)'], min: 0, max: 2, def: 1 },
      { id: 'freq', name: 'Frekans', min: 0.5, max: 2000, def: 220, unit: 'Hz', curve: 'log' },
      { id: 'depth', name: 'Derinlik', min: 0, max: 1, def: 0.8 },
      { id: 'mix', name: 'Karışım', min: 0, max: 1, def: 0.6 },
    ],
    create(ctx) {
      const s = shell(ctx), vca = ctx.createGain(), osc = ctx.createOscillator(), og = ctx.createGain(), dl = ctx.createDelay(0.02);
      osc.start(); osc.connect(og);
      const p = { mode: 1, freq: 220, depth: 0.8 };
      const route = () => {
        try { s.input.disconnect(vca); } catch (e) { } try { s.input.disconnect(dl); } catch (e) { } try { og.disconnect(); } catch (e) { } try { vca.disconnect(); dl.disconnect(); } catch (e) { }
        osc.frequency.value = p.freq;
        const m = Math.round(p.mode);
        if (m === 2) { dl.delayTime.value = 0.005; og.gain.value = 0.004 * p.depth; og.connect(dl.delayTime); s.input.connect(dl); dl.connect(s.wet); }
        else { vca.gain.value = m === 0 ? 1 - p.depth / 2 : 0; og.gain.value = m === 0 ? p.depth / 2 : p.depth; og.connect(vca.gain); s.input.connect(vca); vca.connect(s.wet); }
      };
      route();
      return { input: s.input, output: s.output, set(id, v) { if (id in p) { p[id] = v; route(); } if (id === 'mix') s.mix(v); }, dispose() { try { osc.stop(); } catch (e) { } } };
    },
  });

  const VOW = { a: [800, 1150, 2900], e: [400, 1600, 2700], i: [350, 1700, 2700], o: [450, 800, 2830], u: [325, 700, 2530] };
  const ORDER = ['a', 'e', 'i', 'o', 'u'];
  R({
    id: 'fx.formant', name: 'Formant Filtre (vokal)', category: 'Filtre',
    params: [
      { id: 'vowel', name: 'Ünlü (A-E-I-O-U)', min: 0, max: 4, def: 0 },
      { id: 'rate', name: 'LFO Hız', min: 0.05, max: 8, def: 0.5, unit: 'Hz', curve: 'log' },
      { id: 'depth', name: 'LFO Miktar', min: 0, max: 4, def: 0 },
      { id: 'q', name: 'Rezonans', min: 2, max: 25, def: 8 },
      { id: 'mix', name: 'Karışım', min: 0, max: 1, def: 1 },
    ],
    create(ctx) {
      const s = shell(ctx), bands = [0, 1, 2].map(() => ctx.createBiquadFilter()), sum = ctx.createGain();
      bands.forEach((b, i) => { b.type = 'bandpass'; s.input.connect(b); b.connect(sum); });
      sum.gain.value = 8; sum.connect(s.wet);
      const p = { vowel: 0, rate: 0.5, depth: 0, q: 8 };
      let t0 = performance.now(), timer = null;
      const apply = v => {
        const x = U.clamp(v, 0, 4), i = Math.floor(Math.min(3.999, x)), f = x - i, A = VOW[ORDER[i]], B = VOW[ORDER[i + 1] || 'u'];
        bands.forEach((b, k) => { b.frequency.value = A[k] + (B[k] - A[k]) * f; b.Q.value = p.q; });
      };
      if (!(ctx instanceof OfflineAudioContext)) timer = setInterval(() => { const ph = (performance.now() - t0) / 1000 * p.rate; apply(p.vowel + Math.sin(ph * 2 * Math.PI) * p.depth * 0.5 * (p.depth > 0)); }, 20);
      apply(0);
      return { input: s.input, output: s.output, set(id, v) { if (id in p) { p[id] = v; apply(p.vowel); } if (id === 'mix') s.mix(v); }, dispose() { clearInterval(timer); } };
    },
  });

  R({
    id: 'fx.shimmer', name: 'Shimmer Reverb', category: 'Uzay',
    params: [
      { id: 'size', name: 'Süre', min: 1, max: 10, def: 4, unit: 's' },
      { id: 'shimmer', name: 'Shimmer', min: 0, max: 0.8, def: 0.45 },
      { id: 'interval', name: 'Aralık', type: 'choice', options: ['+1 oktav', '+5li', '+2 oktav', '−1 oktav'], min: 0, max: 3, def: 0 },
      { id: 'tone', name: 'Ton', min: 1000, max: 16000, def: 7000, unit: 'Hz', curve: 'log' },
      { id: 'mix', name: 'Karışım', min: 0, max: 1, def: 0.4 },
    ],
    create(ctx) {
      const s = shell(ctx), conv = ctx.createConvolver(), lp = ctx.createBiquadFilter(), fb = ctx.createGain(), dl = ctx.createDelay(0.2);
      const ps = OS.makePitchShifter(ctx, 0.09);
      lp.type = 'lowpass'; dl.delayTime.value = 0.03;
      s.input.connect(conv); conv.connect(lp); lp.connect(s.wet);
      lp.connect(ps.input); ps.output.connect(fb); fb.connect(dl); dl.connect(conv); // geri beslemede perde kaydırma
      const p = { size: 4 };
      let h = null;
      const regen = () => { conv.buffer = U.makeReverbIR(ctx, p.size, 2.2, 0.3); };
      regen();
      return {
        input: s.input, output: s.output,
        set(id, v) {
          if (id === 'size') { p.size = v; clearTimeout(h); if (ctx instanceof OfflineAudioContext) regen(); else h = setTimeout(regen, 150); }
          if (id === 'shimmer') fb.gain.value = v; if (id === 'tone') lp.frequency.value = v; if (id === 'mix') s.mix(v);
          if (id === 'interval') ps.setRatio([2, 1.5, 4, 0.5][Math.round(v)]);
        },
        dispose() { clearTimeout(h); ps.dispose(); },
      };
    },
  });
})(window.OS);
