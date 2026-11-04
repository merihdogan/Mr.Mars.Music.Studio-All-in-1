/* Mr. Mars Music Studio · MRH DGN — yaratıcı efektler (zarf filtre, plak, parlatıcı, de-esser, armonizör,
   ritim kapısı, vokoder) ve kayıtlı davul seti */
(function (OS) {
  const R = OS.plugins.register, U = OS.U;
  const shell = (...a) => OS.fxShell(...a);
  const BUTTER = -3.01; // Web Audio alçak/yüksek geçirende Q dB cinsindendir
  const absCurve = () => new Float32Array([1, 0, 1]);
  const biquad = (ctx, type, f, q) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q != null) b.Q.value = q; return b; };
  // Sinyalin zarfı: mutlak değer + alçak geçiren
  function follower(ctx, hz) {
    const ws = ctx.createWaveShaper(), lp = biquad(ctx, 'lowpass', hz, 0.5);
    ws.curve = absCurve(); ws.connect(lp);
    return { input: ws, output: lp, lp };
  }

  R({
    id: 'fx.envfilter', name: 'Zarf Filtre (Auto-Wah)', category: 'Yaratıcı',
    params: [
      { id: 'base', name: 'Taban', min: 100, max: 2000, def: 300, unit: 'Hz', curve: 'log' },
      { id: 'depth', name: 'Derinlik', min: 0, max: 8000, def: 3000, unit: 'Hz' },
      { id: 'q', name: 'Rezonans', min: 0.5, max: 15, def: 5, curve: 'log' },
      { id: 'speed', name: 'Hız', min: 2, max: 60, def: 14, unit: 'Hz', curve: 'log' },
      { id: 'mix', name: 'Karışım', min: 0, max: 1, def: 1 },
    ],
    create(ctx) {
      const s = shell(ctx), f = biquad(ctx, 'bandpass', 300, 5), env = follower(ctx, 14), amt = ctx.createGain();
      s.input.connect(f); f.connect(s.wet);
      s.input.connect(env.input); env.output.connect(amt); amt.connect(f.frequency);
      return {
        input: s.input, output: s.output,
        set(id, v) {
          if (id === 'base') f.frequency.value = v; if (id === 'depth') amt.gain.value = v * 2;
          if (id === 'q') f.Q.value = v; if (id === 'speed') env.lp.frequency.value = v; if (id === 'mix') s.mix(v);
        },
      };
    },
  });

  R({
    id: 'fx.vinyl', name: 'Plak (Lo-Fi)', category: 'Yaratıcı',
    params: [
      { id: 'crackle', name: 'Cızırtı', min: 0, max: 1, def: 0.4 },
      { id: 'noise', name: 'Hışırtı', min: 0, max: 1, def: 0.15 },
      { id: 'wow', name: 'Dalgalanma', min: 0, max: 1, def: 0.3 },
      { id: 'age', name: 'Yaş', min: 0, max: 1, def: 0.5 },
      { id: 'mix', name: 'Karışım', min: 0, max: 1, def: 1 },
    ],
    create(ctx) {
      const s = shell(ctx), d = ctx.createDelay(0.05), lp = biquad(ctx, 'lowpass', 8000, 0.5), hp = biquad(ctx, 'highpass', 120, 0.5);
      d.delayTime.value = 0.008;
      s.input.connect(d); d.connect(hp); hp.connect(lp); lp.connect(s.wet);
      const wow = ctx.createOscillator(), wowG = ctx.createGain(); wow.frequency.value = 0.55; wow.connect(wowG); wowG.connect(d.delayTime); wow.start();
      // 4 saniyelik döngü: seyrek çıtırtılar ve sürekli hışırtı ayrı kanallarda
      const n = ctx.sampleRate * 4, cb = ctx.createBuffer(1, n, ctx.sampleRate), hb = ctx.createBuffer(1, n, ctx.sampleRate), c = cb.getChannelData(0), h = hb.getChannelData(0);
      let seed = 12345; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < n; i++) h[i] = (rnd() * 2 - 1);
      for (let k = 0; k < 70; k++) { const at = Math.floor(rnd() * (n - 200)), a = 0.2 + rnd() * 0.8, sign = rnd() < 0.5 ? -1 : 1, len = 8 + rnd() * 60; for (let i = 0; i < len; i++) c[at + i] += sign * a * Math.exp(-i / (len / 3)); }
      const cs = ctx.createBufferSource(), hs = ctx.createBufferSource(), cg = ctx.createGain(), hg = ctx.createGain(), hl = biquad(ctx, 'lowpass', 5000, 0.5);
      cs.buffer = cb; hs.buffer = hb; cs.loop = hs.loop = true;
      // Cızırtı yalnız sinyal varken duyulur: sessizlikte ve bypass'ta kaybolur
      const env = follower(ctx, 3), boost = ctx.createGain(), clamp = ctx.createWaveShaper(), gate = ctx.createGain();
      boost.gain.value = 60; clamp.curve = new Float32Array([0, 0, 1]); gate.gain.value = 0;
      s.input.connect(env.input); env.output.connect(boost); boost.connect(clamp); clamp.connect(gate.gain);
      cs.connect(cg); cg.connect(gate); hs.connect(hl); hl.connect(hg); hg.connect(gate); gate.connect(s.wet);
      cs.start(); hs.start();
      return {
        input: s.input, output: s.output,
        set(id, v) {
          if (id === 'crackle') cg.gain.value = v * 0.35; if (id === 'noise') hg.gain.value = v * 0.04;
          if (id === 'wow') wowG.gain.value = v * 0.0012;
          if (id === 'age') { lp.frequency.value = 14000 * Math.pow(0.18, v); hp.frequency.value = 40 + v * 200; }
          if (id === 'mix') s.mix(v);
        },
        dispose() { [wow, cs, hs].forEach(x => { try { x.stop(); } catch (e) { } }); },
      };
    },
  });

  R({
    id: 'fx.exciter', name: 'Parlatıcı (Exciter)', category: 'Yaratıcı',
    params: [
      { id: 'freq', name: 'Başlangıç', min: 1000, max: 12000, def: 4000, unit: 'Hz', curve: 'log' },
      { id: 'drive', name: 'Sürüş', min: 1, max: 20, def: 6 },
      { id: 'amount', name: 'Miktar', min: 0, max: 1, def: 0.3 },
    ],
    create(ctx) {
      const out = ctx.createGain(), input = ctx.createGain(), h1 = biquad(ctx, 'highpass', 4000, 0.7), ws = ctx.createWaveShaper(), h2 = biquad(ctx, 'highpass', 4000, 0.7), amt = ctx.createGain();
      input.connect(out); input.connect(h1); h1.connect(ws); ws.connect(h2); h2.connect(amt); amt.connect(out);
      return {
        input, output: out,
        set(id, v) {
          if (id === 'freq') h1.frequency.value = h2.frequency.value = v;
          if (id === 'drive') ws.curve = U.curve('soft', v);
          if (id === 'amount') amt.gain.value = v * 2;
        },
      };
    },
  });

  R({
    id: 'fx.deesser', name: 'De-esser (Vokal)', category: 'Yaratıcı',
    params: [
      { id: 'freq', name: 'Frekans', min: 2500, max: 12000, def: 6000, unit: 'Hz', curve: 'log' },
      { id: 'thr', name: 'Eşik', min: 0, max: 0.3, def: 0.03 },
      { id: 'amount', name: 'Miktar', min: 0, max: 1, def: 0.7 },
    ],
    create(ctx) {
      // Sinyal iki banda ayrılır; yalnız üst bant, kendi zarfı eşiği geçtikçe kısılır
      const input = ctx.createGain(), output = ctx.createGain(), lp1 = biquad(ctx, 'lowpass', 6000, BUTTER), lp2 = biquad(ctx, 'lowpass', 6000, BUTTER), hp1 = biquad(ctx, 'highpass', 6000, BUTTER), hp2 = biquad(ctx, 'highpass', 6000, BUTTER);
      const vca = ctx.createGain(), det = ctx.createWaveShaper(), smooth = biquad(ctx, 'lowpass', 120, 0.5), scale = ctx.createGain();
      input.connect(lp1); lp1.connect(lp2); lp2.connect(output);
      input.connect(hp1); hp1.connect(hp2); hp2.connect(vca); vca.connect(output);
      hp2.connect(det); det.connect(smooth); smooth.connect(scale); scale.connect(vca.gain);
      const p = { thr: 0.03, amount: 0.7 };
      const curve = () => { const n = 1025, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = Math.abs(i / (n - 1) * 2 - 1); c[i] = Math.min(1, Math.max(0, (x - p.thr) / Math.max(0.01, p.thr + 0.02))); } det.curve = c; };
      curve();
      return {
        input, output,
        set(id, v) {
          if (id === 'freq') lp1.frequency.value = lp2.frequency.value = hp1.frequency.value = hp2.frequency.value = v;
          if (id === 'thr') { p.thr = v; curve(); }
          if (id === 'amount') { p.amount = v; scale.gain.value = -v * 0.95; }
        },
      };
    },
  });

  const HARM = [['+3 / +5 (majör)', 4, 7], ['+3m / +5 (minör)', 3, 7], ['Oktav üst', 12, 0], ['Oktav alt', -12, 0], ['Beşli', 7, 0], ['Oktav alt + üst', -12, 12]];
  R({
    id: 'fx.harmonizer', name: 'Armonizör', category: 'Yaratıcı',
    params: [
      { id: 'set', name: 'Aralık', type: 'choice', options: HARM.map(x => x[0]), min: 0, max: HARM.length - 1, def: 0 },
      { id: 'level', name: 'Seviye', min: 0, max: 1.5, def: 0.7 },
      { id: 'mix', name: 'Karışım', min: 0, max: 1, def: 0.5 },
    ],
    create(ctx) {
      const s = shell(ctx), a = OS.makePitchShifter(ctx, 0.07), b = OS.makePitchShifter(ctx, 0.07), ag = ctx.createGain(), bg = ctx.createGain();
      s.input.connect(a.input); s.input.connect(b.input); a.output.connect(ag); b.output.connect(bg); ag.connect(s.wet); bg.connect(s.wet);
      const apply = (set, level) => { const [, x, y] = HARM[set]; a.setRatio(Math.pow(2, x / 12)); b.setRatio(Math.pow(2, y / 12)); ag.gain.value = level; bg.gain.value = y ? level : 0; };
      const p = { set: 0, level: 0.7 };
      return {
        input: s.input, output: s.output,
        set(id, v) { if (id === 'set') { p.set = Math.round(v); apply(p.set, p.level); } if (id === 'level') { p.level = v; apply(p.set, v); } if (id === 'mix') s.mix(v); },
      };
    },
  });

  const GATES = [['Trance', 'x.xx.xx.x.xx.xx.'], ['Düz 1/8', 'x.x.x.x.x.x.x.x.'], ['Sekizli atlama', 'xx..xx..xx..xx..'], ['Hızlı', 'xxx.xxx.xxx.xxx.'], ['Kırık', 'x..x..x.x..x..x.'], ['Yarım', 'xxxxxxxx........']];
  R({
    id: 'fx.rhythmgate', name: 'Ritim Kapısı (Trance Gate)', category: 'Yaratıcı',
    params: [
      { id: 'pat', name: 'Desen', type: 'choice', options: GATES.map(x => x[0]), min: 0, max: GATES.length - 1, def: 0 },
      { id: 'depth', name: 'Derinlik', min: 0, max: 1, def: 1 },
      { id: 'att', name: 'Yumuşaklık', min: 0.001, max: 0.03, def: 0.004, unit: 's', curve: 'log' },
    ],
    create(ctx) {
      const vca = ctx.createGain(), p = { pat: 0, depth: 1, att: 0.004 };
      return {
        input: vca, output: vca,
        set(id, v) { p[id] = id === 'pat' ? Math.round(v) : v; },
        // Motor vuruş aralığını verir; adım başı 1/16. Kapalı adım kendi sonunda yine açılır, durunca sessiz kalmaz.
        schedule(a, b, toTime) {
          const pat = GATES[p.pat][1], step = 0.25;
          for (let k = Math.ceil(a / step) * step; k < b; k += step) {
            const t = toTime(k); if (t < ctx.currentTime) continue;
            const i = Math.round(k / step) % pat.length;
            vca.gain.setTargetAtTime(pat[i] === 'x' ? 1 : 1 - p.depth, t, p.att);
            if (pat[i] !== 'x') vca.gain.setTargetAtTime(1, toTime(k + step), p.att);
          }
        },
      };
    },
  });

  const VOC_NOTES = ['C2', 'D2', 'E2', 'F2', 'G2', 'A2', 'B2', 'C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4'];
  const VOC_MIDI = [36, 38, 40, 41, 43, 45, 47, 48, 50, 52, 53, 55, 57, 59, 60];
  R({
    id: 'fx.vocoder', name: 'Vokoder (Robot Ses)', category: 'Yaratıcı',
    params: [
      { id: 'note', name: 'Nota', type: 'choice', options: VOC_NOTES, min: 0, max: VOC_NOTES.length - 1, def: 7 },
      { id: 'chord', name: 'Akor', type: 'choice', options: ['Tek nota', 'Beşli', 'Minör', 'Majör'], min: 0, max: 3, def: 1 },
      { id: 'noise', name: 'Hışırtı', min: 0, max: 1, def: 0.15 },
      { id: 'speed', name: 'Tepki', min: 10, max: 100, def: 40, unit: 'Hz', curve: 'log' },
      { id: 'level', name: 'Seviye', min: 0, max: 8, def: 4 },
      { id: 'mix', name: 'Karışım', min: 0, max: 1, def: 1 },
    ],
    create(ctx) {
      const s = shell(ctx), car = ctx.createGain(), out = ctx.createGain(), bands = 14, smooths = [];
      out.connect(s.wet);
      for (let i = 0; i < bands; i++) {
        const f = 120 * Math.pow(8000 / 120, i / (bands - 1)), q = 5;
        const mf = biquad(ctx, 'bandpass', f, q), cf = biquad(ctx, 'bandpass', f, q), vca = ctx.createGain(), env = follower(ctx, 40), scale = ctx.createGain();
        vca.gain.value = 0; scale.gain.value = 12;
        s.input.connect(mf); mf.connect(env.input); env.output.connect(scale); scale.connect(vca.gain);
        car.connect(cf); cf.connect(vca); vca.connect(out);
        smooths.push(env.lp);
      }
      const oscs = [0, 1, 2].map(() => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sawtooth'; g.gain.value = 0.3; o.connect(g); g.connect(car); o.start(); return { o, g }; });
      const n = ctx.sampleRate * 2, nb = ctx.createBuffer(1, n, ctx.sampleRate), nd = nb.getChannelData(0); for (let i = 0; i < n; i++) nd[i] = Math.random() * 2 - 1;
      const ns = ctx.createBufferSource(), ng = ctx.createGain(); ns.buffer = nb; ns.loop = true; ns.connect(ng); ng.connect(car); ns.start();
      const p = { note: 7, chord: 1 };
      const tune = () => { const m = VOC_MIDI[p.note], iv = [[0, 0, 0], [0, 7, 12], [0, 3, 7], [0, 4, 7]][p.chord]; oscs.forEach((x, i) => { x.o.frequency.value = U.midiToFreq12 ? U.midiToFreq12(m + iv[i]) : 440 * Math.pow(2, (m + iv[i] - 69) / 12); x.g.gain.value = p.chord === 0 && i ? 0 : 0.3; }); };
      tune();
      return {
        input: s.input, output: s.output,
        set(id, v) {
          if (id === 'note') { p.note = Math.round(v); tune(); } if (id === 'chord') { p.chord = Math.round(v); tune(); }
          if (id === 'noise') ng.gain.value = v * 0.3; if (id === 'speed') smooths.forEach(x => x.frequency.value = v);
          if (id === 'level') out.gain.value = v; if (id === 'mix') s.mix(v);
        },
        dispose() { oscs.forEach(x => { try { x.o.stop(); } catch (e) { } }); try { ns.stop(); } catch (e) { } },
      };
    },
  });

  // ---------------- Kayıtlı davul seti: sesler ayrı dosyadan, ilk gerektiğinde yüklenir ----------------
  const KIT_MAP = {
    35: 'Kick 2', 36: 'Kick', 37: 'Rim', 38: 'Snare', 39: 'Clap', 40: 'Snare 2', 41: 'Tom Alçak 2', 42: 'Hi-Hat Kapalı', 43: 'Tom Alçak', 44: 'Hi-Hat Pedal', 45: 'Tom Orta', 46: 'Hi-Hat Açık', 47: 'Tom Orta 2', 48: 'Tom Yüksek',
    49: 'Crash', 51: 'Ride', 52: 'China', 54: 'Tambur', 55: 'Splash', 56: 'Cowbell', 60: 'Bongo Yüksek', 61: 'Bongo Alçak', 62: 'Djembe', 63: 'Darbuka', 64: 'Konga', 69: 'Cabasa', 70: 'Shaker', 75: 'Clave', 76: 'Tahta Blok', 81: 'Üçgen',
  };
  const buffers = {};
  let loading = null;
  OS.loadDrumSamples = function (ctx) {
    if (loading) return loading;
    loading = new Promise((res, rej) => {
      const finish = async () => {
        const data = window.OS_DRUM_SAMPLES || {};
        await Promise.all(Object.keys(data).map(async n => { const bin = atob(data[n]), a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); buffers[n] = await ctx.decodeAudioData(a.buffer); }));
        res(buffers);
      };
      if (window.OS_DRUM_SAMPLES) { finish(); return; }
      const sc = document.createElement('script'); sc.src = 'mrh-cihazlar/ornek-davul.js'; sc.onload = finish; sc.onerror = () => { loading = null; rej(new Error('samples')); };
      document.head.appendChild(sc);
    });
    return loading;
  };
  const GROUP = n => n <= 36 ? 'kick' : [37, 38, 39, 40].includes(n) ? 'snare' : [42, 44, 46].includes(n) ? 'hats' : [41, 43, 45, 47, 48].includes(n) ? 'toms' : [49, 51, 52, 55].includes(n) ? 'cym' : 'perc';
  R({
    id: 'inst.kit', name: 'Kayıtlı Davul Seti', type: 'instrument', category: 'Enstrüman', drumMap: KIT_MAP,
    params: [
      { id: 'tune', name: 'Akort', min: -12, max: 12, def: 0, unit: 'st' },
      { id: 'kick', name: 'Kick', min: -30, max: 6, def: 0, unit: 'dB' },
      { id: 'snare', name: 'Snare', min: -30, max: 6, def: 0, unit: 'dB' },
      { id: 'hats', name: 'Hi-Hat', min: -30, max: 6, def: -4, unit: 'dB' },
      { id: 'toms', name: 'Tomlar', min: -30, max: 6, def: -2, unit: 'dB' },
      { id: 'cym', name: 'Ziller', min: -30, max: 6, def: -6, unit: 'dB' },
      { id: 'perc', name: 'Perküsyon', min: -30, max: 6, def: -3, unit: 'dB' },
      { id: 'vol', name: 'Ses', min: -40, max: 6, def: -3, unit: 'dB' },
    ],
    create(ctx) {
      const out = ctx.createGain(), g = {}, active = []; let tune = 0, hat = [];
      ['kick', 'snare', 'hats', 'toms', 'cym', 'perc'].forEach(k => { g[k] = ctx.createGain(); g[k].connect(out); });
      const ready = OS.loadDrumSamples(ctx).catch(() => U.toast(OS.t('Davul sesleri yüklenemedi')));
      const hit = (n, v, t) => {
        const b = buffers[n]; if (!b) return;
        const s = ctx.createBufferSource(), a = ctx.createGain();
        s.buffer = b; s.playbackRate.value = Math.pow(2, tune / 12); a.gain.value = Math.pow(v / 127, 1.4) * 1.3;
        s.connect(a); a.connect(g[GROUP(n)]);
        if (n === 42 || n === 44 || n === 46) { hat.forEach(x => { try { x.stop(t); } catch (e) { } }); hat = n === 46 ? [s] : []; }
        s.start(t); active.push(s); s.onended = () => { const i = active.indexOf(s); if (i >= 0) active.splice(i, 1); };
      };
      return {
        output: out, ready,
        set(id, v) { if (id === 'tune') tune = v; else if (id === 'vol') out.gain.value = U.dbToGain(v); else if (g[id]) g[id].gain.value = U.dbToGain(v); },
        noteOn(n, v, t) { hit(n, v == null ? 100 : v, Math.max(t || 0, ctx.currentTime)); },
        noteOff() { },
        allOff() { active.splice(0).forEach(s => { try { s.stop(); } catch (e) { } }); },
      };
    },
  });
})(window.OS);
