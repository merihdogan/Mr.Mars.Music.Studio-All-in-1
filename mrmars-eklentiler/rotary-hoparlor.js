/* Mr. Mars Music Studio · MRH DGN — eklenti */
// Örnek eklenti: dönen hoparlör (rotary) efekti — org ve gitar için
MrMars.register({
  id: 'ornek.rotary',
  name: 'Dönen Hoparlör',
  type: 'effect',
  category: 'Modülasyon',
  params: [
    { id: 'speed', name: 'Hız', type: 'choice', options: ['Yavaş', 'Hızlı'], min: 0, max: 1, def: 0 },
    { id: 'depth', name: 'Derinlik', min: 0, max: 1, def: 0.7 },
    { id: 'drive', name: 'Sürüş', min: 1, max: 10, def: 2 },
    { id: 'mix', name: 'Karışım', min: 0, max: 1, def: 0.8 },
  ],
  create(ctx) {
    const U = MrMars.utils;
    const input = ctx.createGain(), out = ctx.createGain(), dry = ctx.createGain(), wet = ctx.createGain();
    const ws = ctx.createWaveShaper(), xo = ctx.createBiquadFilter(), xo2 = ctx.createBiquadFilter();
    xo.type = 'lowpass'; xo.frequency.value = 800; xo2.type = 'highpass'; xo2.frequency.value = 800;
    input.connect(dry); dry.connect(out); input.connect(ws); ws.connect(xo); ws.connect(xo2);
    const mkRotor = (src, rate) => {
      const d = ctx.createDelay(0.02), pan = ctx.createStereoPanner(), amp = ctx.createGain();
      const l = ctx.createOscillator(), lg = ctx.createGain(), lp = ctx.createGain(), la = ctx.createGain();
      d.delayTime.value = 0.004; l.frequency.value = rate; l.connect(lg); lg.connect(d.delayTime); l.connect(lp); lp.connect(pan.pan); l.connect(la); la.connect(amp.gain);
      src.connect(d); d.connect(amp); amp.connect(pan); pan.connect(wet); l.start();
      return { l, lg, lp, la };
    };
    const horn = mkRotor(xo2, 0.8), drum = mkRotor(xo, 0.65);
    wet.connect(out);
    const p = { speed: 0, depth: 0.7 };
    const apply = () => {
      const fast = p.speed >= 0.5, t = ctx.currentTime;
      horn.l.frequency.setTargetAtTime(fast ? 6.8 : 0.8, t, 0.6);
      drum.l.frequency.setTargetAtTime(fast ? 5.9 : 0.65, t, 1.5);
      [horn, drum].forEach(r => { r.lg.gain.value = 0.0015 * p.depth; r.lp.gain.value = 0.8 * p.depth; r.la.gain.value = 0.25 * p.depth; });
    };
    apply();
    return {
      input, output: out,
      set(id, v) {
        if (id in p) { p[id] = v; apply(); }
        if (id === 'drive') ws.curve = U.curve('tube', v);
        if (id === 'mix') { dry.gain.value = 1 - v; wet.gain.value = v; }
      },
      dispose() { try { horn.l.stop(); drum.l.stop(); } catch (e) {} },
    };
  },
});
