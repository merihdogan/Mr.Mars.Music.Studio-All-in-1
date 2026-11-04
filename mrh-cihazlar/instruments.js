/* Mr. Mars Music Studio · MRH DGN — yerleşik enstrümanlar */
(function (OS) {
  const R = OS.plugins.register, U = OS.U;
  const WAVES = ['sine', 'triangle', 'sawtooth', 'square'];
  const WAVE_TR = ['Sinüs', 'Üçgen', 'Testere', 'Kare'];

  function release(param, t, r) {
    if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(t);
    else { param.cancelScheduledValues(t); }
    param.setTargetAtTime(0, t, Math.max(0.005, r / 4));
  }

  // ---------------- ÇOK SESLİ SENTEZLEYİCİ ----------------
  R({
    id: 'inst.synth', name: 'Analog Sentezleyici', type: 'instrument', category: 'Enstrüman',
    params: [
      { id: 'w1', name: 'Osc 1', type: 'choice', options: WAVE_TR, min: 0, max: 3, def: 2 },
      { id: 'w2', name: 'Osc 2', type: 'choice', options: WAVE_TR, min: 0, max: 3, def: 3 },
      { id: 'semi', name: 'Osc2 Yarım Ton', min: -24, max: 24, def: 0, step: 1 },
      { id: 'det', name: 'Detune', min: 0, max: 50, def: 8, unit: 'c' },
      { id: 'mix', name: 'Osc Karışım', min: 0, max: 1, def: 0.5 },
      { id: 'sub', name: 'Sub Osc', min: 0, max: 1, def: 0 },
      { id: 'noise', name: 'Gürültü', min: 0, max: 1, def: 0 },
      { id: 'ftype', name: 'Filtre', type: 'choice', options: ['Alçak Geçiren', 'Yüksek Geçiren', 'Bant Geçiren'], min: 0, max: 2, def: 0 },
      { id: 'cut', name: 'Kesim', min: 40, max: 18000, def: 2400, unit: 'Hz', curve: 'log' },
      { id: 'res', name: 'Rezonans', min: 0.1, max: 20, def: 2, curve: 'log' },
      { id: 'fenv', name: 'Filtre Env', min: 0, max: 1, def: 0.4 },
      { id: 'fa', name: 'F Atak', min: 0.001, max: 4, def: 0.01, unit: 's', curve: 'log' },
      { id: 'fd', name: 'F Düşüş', min: 0.01, max: 4, def: 0.3, unit: 's', curve: 'log' },
      { id: 'fs', name: 'F Süreklilik', min: 0, max: 1, def: 0.2 },
      { id: 'a', name: 'Atak', min: 0.001, max: 5, def: 0.005, unit: 's', curve: 'log' },
      { id: 'd', name: 'Düşüş', min: 0.01, max: 5, def: 0.25, unit: 's', curve: 'log' },
      { id: 's', name: 'Süreklilik', min: 0, max: 1, def: 0.7 },
      { id: 'r', name: 'Bırakma', min: 0.01, max: 8, def: 0.3, unit: 's', curve: 'log' },
      { id: 'vib', name: 'Vibrato', min: 0, max: 50, def: 0, unit: 'c' },
      { id: 'vrate', name: 'Vib Hız', min: 0.5, max: 12, def: 5, unit: 'Hz' },
      { id: 'glide', name: 'Glide', min: 0, max: 1, def: 0, unit: 's' },
      { id: 'vol', name: 'Ses', min: -40, max: 6, def: -8, unit: 'dB' },
    ],
    presets: {
      'Kalın Bas': { w1: 2, w2: 3, semi: -12, det: 4, mix: 0.4, sub: 0.6, cut: 600, res: 3, fenv: 0.5, fd: 0.2, fs: 0.1, a: 0.002, d: 0.3, s: 0.8, r: 0.1, vol: -6 },
      'Süper Testere Lead': { w1: 2, w2: 2, semi: 0, det: 22, mix: 0.5, cut: 5000, res: 1.5, fenv: 0.3, a: 0.005, s: 0.8, r: 0.25, vib: 10, vol: -10 },
      'Yumuşak Pad': { w1: 2, w2: 1, semi: 12, det: 15, mix: 0.4, cut: 1800, res: 1, fenv: 0.2, fa: 1.2, fd: 2, fs: 0.5, a: 1.2, d: 1, s: 0.8, r: 2.5, vol: -12 },
      'Pluck': { w1: 3, w2: 2, semi: 12, det: 6, mix: 0.4, cut: 400, res: 4, fenv: 0.8, fa: 0.001, fd: 0.18, fs: 0, a: 0.001, d: 0.35, s: 0, r: 0.3, vol: -8 },
      'Brass': { w1: 2, w2: 2, semi: 0, det: 8, cut: 900, res: 1.2, fenv: 0.6, fa: 0.06, fd: 0.4, fs: 0.4, a: 0.05, d: 0.3, s: 0.8, r: 0.2, vol: -10 },
      'Org': { w1: 0, w2: 0, semi: 12, det: 0, mix: 0.5, sub: 0.5, cut: 8000, res: 0.7, fenv: 0, a: 0.005, d: 0.1, s: 1, r: 0.05, vib: 8, vol: -10 },
      'Acid Bas': { w1: 2, w2: 2, semi: 0, det: 0, mix: 0, cut: 300, res: 15, fenv: 0.7, fa: 0.001, fd: 0.2, fs: 0, a: 0.001, d: 0.3, s: 0.6, r: 0.08, glide: 0.06, vol: -10 },
    },
    create(ctx) {
      const out = ctx.createGain();
      const p = {};
      const voices = [];
      let lastFreq = 0, noiseBuf = null;
      const getNoise = () => { if (!noiseBuf) { noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; } return noiseBuf; };
      function noteOn(n, vel, t) {
        t = Math.max(t || 0, ctx.currentTime);
        const f = U.midiToFreq(n), v = (vel == null ? 100 : vel) / 127;
        const vg = ctx.createGain(), filt = ctx.createBiquadFilter(), amp = ctx.createGain();
        filt.type = ['lowpass', 'highpass', 'bandpass'][Math.round(p.ftype || 0)]; filt.Q.value = p.res;
        const oscs = [];
        const mk = (type, freq, cents, gain) => {
          const o = ctx.createOscillator(), g = ctx.createGain();
          o.type = type; o.detune.value = cents; g.gain.value = gain;
          if (p.glide > 0 && lastFreq) { o.frequency.setValueAtTime(lastFreq * freq / f, t); o.frequency.exponentialRampToValueAtTime(freq, t + p.glide); }
          else o.frequency.setValueAtTime(freq, t);
          o.connect(g); g.connect(vg); o.start(t); oscs.push(o);
          return o;
        };
        mk(WAVES[Math.round(p.w1)], f, -p.det / 2, 1 - p.mix);
        mk(WAVES[Math.round(p.w2)], f * Math.pow(2, p.semi / 12), p.det / 2, p.mix);
        if (p.sub > 0) mk('sine', f / 2, 0, p.sub);
        if (p.noise > 0) { const ns = ctx.createBufferSource(), ng = ctx.createGain(); ns.buffer = getNoise(); ns.loop = true; ng.gain.value = p.noise * 0.5; ns.connect(ng); ng.connect(vg); ns.start(t); oscs.push(ns); }
        if (p.vib > 0) {
          const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = p.vrate; lg.gain.value = p.vib;
          l.connect(lg); oscs.forEach(o => o.detune && lg.connect(o.detune)); l.start(t); oscs.push(l);
        }
        lastFreq = f;
        vg.gain.value = 0.35;
        vg.connect(filt); filt.connect(amp); amp.connect(out);
        // filtre zarfı
        const base = p.cut, peak = Math.min(20000, base + p.fenv * (18000 - base) * v);
        filt.frequency.setValueAtTime(base, t);
        filt.frequency.linearRampToValueAtTime(peak, t + p.fa);
        filt.frequency.setTargetAtTime(base + (peak - base) * p.fs, t + p.fa, p.fd / 3);
        // genlik zarfı
        amp.gain.setValueAtTime(0, t);
        amp.gain.linearRampToValueAtTime(v, t + p.a);
        amp.gain.setTargetAtTime(v * p.s, t + p.a, p.d / 3);
        const voice = { n, oscs, amp, filt, released: false, start: t };
        voices.push(voice);
        oscs[0].onended = () => { const i = voices.indexOf(voice); if (i >= 0) voices.splice(i, 1); try { amp.disconnect(); } catch (e) { } };
        // en fazla 24 ses
        if (voices.filter(x => !x.released).length > 24) stopVoice(voices.find(x => !x.released), t, 0.02);
      }
      function stopVoice(vc, t, r) {
        if (!vc || vc.released) return;
        vc.released = true;
        release(vc.amp.gain, t, r);
        vc.oscs.forEach(o => { try { o.stop(t + r * 1.5 + 0.05); } catch (e) { } });
      }
      return {
        output: out,
        set(id, v) { p[id] = v; if (id === 'vol') out.gain.value = U.dbToGain(v); },
        noteOn,
        noteOff(n, t) { t = Math.max(t || 0, ctx.currentTime); const vc = voices.find(x => x.n === n && !x.released && x.start <= t + 0.001); stopVoice(vc, t, p.r); },
        allOff() { const t = ctx.currentTime; voices.forEach(v => stopVoice(v, t, 0.02)); },
      };
    },
  });

  // ---------------- DAVUL MAKİNESİ ----------------
  const DRUM_MAP = {
    35: 'Kick 2', 36: 'Kick', 37: 'Rim', 38: 'Snare', 39: 'Clap', 40: 'Snare 2', 41: 'Tom Alçak 2', 42: 'Hi-Hat Kapalı', 43: 'Tom Alçak',
    44: 'Hi-Hat Pedal', 45: 'Tom Orta', 46: 'Hi-Hat Açık', 47: 'Tom Orta 2', 48: 'Tom Yüksek', 49: 'Crash', 50: 'Tom Yüksek 2', 51: 'Ride', 54: 'Tef', 56: 'Cowbell', 57: 'Crash 2', 65: 'Darbuka Düm', 66: 'Darbuka Tek', 67: 'Darbuka Ka',
  };
  OS.DRUM_MAP = DRUM_MAP;
  R({
    id: 'inst.drums', name: 'Davul Makinesi', type: 'instrument', category: 'Enstrüman', drumMap: DRUM_MAP,
    params: [
      { id: 'kit', name: 'Kit', type: 'choice', options: ['Akustik', 'Elektronik Derin', 'Elektronik Sert', 'Lo-Fi'], min: 0, max: 3, def: 0 },
      { id: 'tune', name: 'Akort', min: -12, max: 12, def: 0, unit: 'st' },
      { id: 'decay', name: 'Uzunluk', min: 0.3, max: 3, def: 1 },
      { id: 'kick', name: 'Kick', min: -30, max: 6, def: 0, unit: 'dB' },
      { id: 'snare', name: 'Snare', min: -30, max: 6, def: 0, unit: 'dB' },
      { id: 'hats', name: 'Hi-Hat', min: -30, max: 6, def: -4, unit: 'dB' },
      { id: 'toms', name: 'Tomlar', min: -30, max: 6, def: -2, unit: 'dB' },
      { id: 'cym', name: 'Ziller', min: -30, max: 6, def: -6, unit: 'dB' },
      { id: 'vol', name: 'Ses', min: -40, max: 6, def: -3, unit: 'dB' },
    ],
    create(ctx) {
      const out = ctx.createGain(), p = { kit: 0, tune: 0, decay: 1, kick: 0, snare: 0, hats: -4, toms: -2, cym: -6 };
      const nb = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), nd = nb.getChannelData(0);
      for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
      const active = [];
      let openHat = [];
      const tr = () => Math.pow(2, p.tune / 12);
      const env = (g, t, peak, dec) => { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + dec); };
      function noise(t, dec, type, freq, q, peak, dest) {
        const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        s.buffer = nb; s.loop = true; f.type = type; f.frequency.value = freq; f.Q.value = q || 1;
        s.connect(f); f.connect(g); g.connect(dest); env(g, t, peak, dec); s.start(t); s.stop(t + dec + 0.05);
        active.push(s); return s;
      }
      function tone(t, type, f0, f1, sweep, dec, peak, dest) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + sweep);
        o.connect(g); g.connect(dest); env(g, t, peak, dec); o.start(t); o.stop(t + dec + 0.05);
        active.push(o); return o;
      }
      function hit(n, vel, t) {
        const v = vel / 127, k = Math.round(p.kit), T = tr(), D = p.decay;
        const bus = ctx.createGain(); bus.connect(out);
        const lvl = g => { bus.gain.value = U.dbToGain(g) * v; };
        switch (n) {
          case 35: case 36: {
            lvl(p.kick);
            if (k === 1) tone(t, 'sine', 120 * T, 40 * T, 0.08, 0.9 * D, 1, bus);
            else if (k === 2) { tone(t, 'sine', 200 * T, 50 * T, 0.05, 0.4 * D, 1, bus); noise(t, 0.01, 'lowpass', 3000, 1, 0.3, bus); }
            else { tone(t, 'sine', 150 * T, 48 * T, 0.09, 0.45 * D, 1, bus); tone(t, 'triangle', 300 * T, 80 * T, 0.03, 0.05, 0.4, bus); }
            break;
          }
          case 38: case 40: {
            lvl(p.snare);
            const nf = k === 1 ? 'highpass' : 'bandpass';
            noise(t, (k === 3 ? 0.12 : 0.22) * D, nf, k === 1 ? 2000 : 3000, 0.8, 0.8, bus);
            tone(t, 'triangle', 220 * T, 160 * T, 0.05, 0.12 * D, 0.6, bus);
            break;
          }
          case 37: lvl(p.snare); tone(t, 'square', 900 * T, 0, 0, 0.03, 0.4, bus); noise(t, 0.02, 'highpass', 4000, 1, 0.3, bus); break;
          case 39: {
            lvl(p.snare);
            for (let i = 0; i < 3; i++) noise(t + i * 0.011, 0.02, 'bandpass', 1200, 1.2, 0.6, bus);
            noise(t + 0.033, 0.18 * D, 'bandpass', 1200, 1.2, 0.6, bus);
            break;
          }
          case 42: case 44: {
            lvl(p.hats);
            openHat.forEach(s => { try { s.stop(t); } catch (e) { } }); openHat = [];
            noise(t, (n === 44 ? 0.04 : 0.06) * D, 'highpass', 7500, 1, 0.6, bus);
            break;
          }
          case 46: lvl(p.hats); openHat.push(noise(t, 0.4 * D, 'highpass', 7000, 1, 0.5, bus)); break;
          case 41: case 43: case 45: case 47: case 48: case 50: {
            lvl(p.toms);
            const base = { 41: 80, 43: 95, 45: 115, 47: 135, 48: 160, 50: 190 }[n] * T;
            tone(t, 'sine', base * 1.6, base, 0.08, 0.5 * D, 1, bus);
            noise(t, 0.04, 'lowpass', 2000, 1, 0.15, bus);
            break;
          }
          case 49: case 57: lvl(p.cym); noise(t, 1.6 * D, 'highpass', 5000, 0.7, 0.5, bus); noise(t, 0.6 * D, 'bandpass', 9000, 1, 0.3, bus); break;
          case 51: {
            lvl(p.cym);
            noise(t, 0.8 * D, 'highpass', 8000, 0.7, 0.25, bus);
            [520, 820, 1150].forEach(f => tone(t, 'square', f * T, 0, 0, 0.6 * D, 0.04, bus));
            break;
          }
          case 54: lvl(p.cym); noise(t, 0.15, 'highpass', 9000, 1, 0.5, bus); break;
          case 65: lvl(p.toms); tone(t, 'sine', 150 * T, 95 * T, 0.03, 0.45 * D, 1, bus); tone(t, 'triangle', 230 * T, 145 * T, 0.02, 0.18 * D, 0.25, bus); noise(t, 0.05, 'bandpass', 700, 1.2, 0.1, bus); break;
          case 66: lvl(p.toms); noise(t, 0.05 * D, 'bandpass', 4200, 2, 0.8, bus); tone(t, 'sine', 880 * T, 720 * T, 0.02, 0.06, 0.35, bus); break;
          case 67: lvl(p.toms); noise(t, 0.035 * D, 'bandpass', 3000, 2.5, 0.6, bus); break;
          case 56: lvl(p.toms); tone(t, 'square', 540 * T, 0, 0, 0.25, 0.25, bus); tone(t, 'square', 800 * T, 0, 0, 0.25, 0.25, bus); break;
          default: {
            // haritada olmayan nota: perdeli darbe
            lvl(p.toms); tone(t, 'triangle', U.midiToFreq(n), 0, 0, 0.3 * D, 0.6, bus);
          }
        }
        if (k === 3) { // lo-fi: bus'a hafif bit ezme
          bus.disconnect(); const ws = ctx.createWaveShaper(); ws.curve = U.curve('crush', 5, 8192); bus.connect(ws); ws.connect(out);
        }
      }
      return {
        output: out,
        set(id, v) { p[id] = v; if (id === 'vol') out.gain.value = U.dbToGain(v); },
        noteOn(n, v, t) { hit(n, v == null ? 100 : v, Math.max(t || 0, ctx.currentTime)); },
        noteOff() { },
        allOff() { active.splice(0).forEach(s => { try { s.stop(); } catch (e) { } }); },
      };
    },
  });

  // ---------------- ÖRNEKLEYİCİ (SAMPLER) ----------------
  R({
    id: 'inst.sampler', name: 'Örnekleyici (Sampler)', type: 'instrument', category: 'Enstrüman',
    params: [
      { id: 'root', name: 'Kök Nota', min: 24, max: 96, def: 60, step: 1 },
      { id: 'tune', name: 'İnce Akort', min: -100, max: 100, def: 0, unit: 'c' },
      { id: 'start', name: 'Başlangıç', min: 0, max: 0.99, def: 0 },
      { id: 'loop', name: 'Döngü', type: 'bool', min: 0, max: 1, def: 0 },
      { id: 'a', name: 'Atak', min: 0.001, max: 4, def: 0.002, unit: 's', curve: 'log' },
      { id: 'r', name: 'Bırakma', min: 0.01, max: 6, def: 0.3, unit: 's', curve: 'log' },
      { id: 'cut', name: 'Filtre', min: 100, max: 20000, def: 20000, unit: 'Hz', curve: 'log' },
      { id: 'vol', name: 'Ses', min: -40, max: 6, def: -3, unit: 'dB' },
    ],
    create(ctx, host) {
      const out = ctx.createGain(), filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.connect(out);
      const p = {}; let buffer = null, name = '';
      const voices = [];
      return {
        output: out,
        set(id, v) { p[id] = v; if (id === 'vol') out.gain.value = U.dbToGain(v); if (id === 'cut') filt.frequency.value = v; },
        noteOn(n, vel, t) {
          if (!buffer) return;
          t = Math.max(t || 0, ctx.currentTime);
          const s = ctx.createBufferSource(), g = ctx.createGain();
          s.buffer = buffer; s.playbackRate.value = U.midiToFreq(n) / U.midiToFreq12(Math.round(p.root)) * Math.pow(2, p.tune / 1200);
          if (p.loop >= 0.5) { s.loop = true; s.loopStart = p.start * buffer.duration; s.loopEnd = buffer.duration; }
          s.connect(g); g.connect(filt);
          const v = (vel == null ? 100 : vel) / 127;
          g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + p.a);
          s.start(t, p.start * buffer.duration);
          const vc = { n, s, g, released: false };
          voices.push(vc); s.onended = () => { const i = voices.indexOf(vc); if (i >= 0) voices.splice(i, 1); };
        },
        noteOff(n, t) {
          t = Math.max(t || 0, ctx.currentTime);
          const vc = voices.find(x => x.n === n && !x.released); if (!vc) return;
          vc.released = true; release(vc.g.gain, t, p.r); try { vc.s.stop(t + p.r * 1.5 + 0.05); } catch (e) { }
        },
        allOff() { voices.forEach(v => { try { v.s.stop(); } catch (e) { } }); },
        async loadFile(file) {
          const ab = await U.readAsArrayBuffer(file);
          buffer = await ctx.decodeAudioData(ab.slice(0)); name = file.name;
          host.device.extra = { name, data: U.abToB64(ab) };
        },
        save() { return host.device.extra; },
        restore(x) { if (x && x.data) this.ready = ctx.decodeAudioData(U.b64ToAb(x.data)).then(b => { buffer = b; name = x.name; }).catch(() => { }); },
        sampleName: () => name,
        buffer: () => buffer,
      };
    },
    ui(container, dev) {
      const lab = U.el('span', { class: 'muted' }, dev.extra && dev.extra.name ? dev.extra.name : 'Örnek yüklenmedi');
      container.appendChild(U.el('div', { class: 'row' }, U.el('button', {
        class: 'btn sm', onclick: async () => {
          const [f] = await U.pickFiles('audio/*'); if (!f) return;
          await dev.inst.loadFile(f); lab.textContent = f.name;
        },
      }, 'Ses Örneği Yükle…'), lab));
    },
  });
})(window.OS);
