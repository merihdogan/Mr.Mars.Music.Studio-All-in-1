/* Mr. Mars Music Studio · MRH DGN — gitar / bas: amfiler, kabinler, pedallar */
(function (OS) {
  const R = OS.plugins.register, U = OS.U;
  const shell = (...a) => OS.fxShell(...a), lfo = (...a) => OS.fxLfo(...a);

  // ---------------- AMFİLER ----------------
  // Her model: ön kazanç aşamaları, eğri tipi, ton yığını merkezleri, güç aşaması.
  const AMPS = [
    { name: 'Temiz', stages: 1, curve: 'tube', pre: 1.5, tight: 70, bassF: 120, midF: 600, trebF: 3200, sag: 0.2, bright: 3 },
    { name: 'Crunch', stages: 2, curve: 'asym', pre: 4, tight: 90, bassF: 100, midF: 800, trebF: 2800, sag: 0.4, bright: 2 },
    { name: 'Lead', stages: 3, curve: 'soft', pre: 8, tight: 110, bassF: 90, midF: 650, trebF: 3000, sag: 0.5, bright: 1 },
    { name: 'Yüksek Kazanç', stages: 3, curve: 'hard', pre: 14, tight: 140, bassF: 80, midF: 750, trebF: 3500, sag: 0.3, bright: 2 },
    { name: 'Vintage Combo', stages: 1, curve: 'tube', pre: 3, tight: 60, bassF: 150, midF: 500, trebF: 2500, sag: 0.7, bright: 4 },
    { name: 'Bas Tüp', stages: 1, curve: 'tube', pre: 2.5, tight: 30, bassF: 60, midF: 500, trebF: 2500, sag: 0.4, bright: 0, bass: true },
    { name: 'Bas Modern', stages: 2, curve: 'soft', pre: 3, tight: 35, bassF: 50, midF: 800, trebF: 4000, sag: 0.2, bright: 2, bass: true },
    // Tarzına göre adlandırılmış amfiler
    { name: 'Klasik Crunch', stages: 2, curve: 'asym', pre: 5, tight: 80, bassF: 100, midF: 900, trebF: 2600, sag: 0.5, bright: 3, vF: 1200, vG: 3 },
    { name: 'Hard Rock', stages: 3, curve: 'asym', pre: 9, tight: 100, bassF: 110, midF: 800, trebF: 2800, sag: 0.4, bright: 2, vF: 900, vG: 4 },
    { name: 'Modern Hi-Gain', stages: 3, curve: 'hard', pre: 12, tight: 120, bassF: 100, midF: 750, trebF: 3000, sag: 0.35, bright: 2, vF: 750, vG: 3 },
    { name: 'Parlak Temiz', stages: 1, curve: 'tube', pre: 1.2, tight: 60, bassF: 120, midF: 500, trebF: 3500, sag: 0.15, bright: 4, vF: 600, vG: -4 },
    { name: 'Sıcak Combo', stages: 2, curve: 'asym', pre: 4, tight: 70, bassF: 150, midF: 700, trebF: 2200, sag: 0.8, bright: 1, vF: 1000, vG: 2 },
    { name: 'Temiz Reverb', stages: 1, curve: 'tube', pre: 2, tight: 70, bassF: 110, midF: 450, trebF: 3800, sag: 0.3, bright: 3, vF: 500, vG: -5 },
    { name: 'Ağır Metal', stages: 3, curve: 'hard', pre: 16, tight: 150, bassF: 80, midF: 700, trebF: 3200, sag: 0.6, bright: 1, vF: 500, vG: -4 },
    { name: 'Akıcı Lead', stages: 3, curve: 'soft', pre: 12, tight: 130, bassF: 90, midF: 650, trebF: 3000, sag: 0.3, bright: 2, vF: 750, vG: 5 },
    { name: 'Parlak Crunch', stages: 2, curve: 'asym', pre: 4, tight: 90, bassF: 120, midF: 1000, trebF: 3000, sag: 0.6, bright: 5, vF: 2200, vG: 4 },
    { name: 'Sıkı Metal', stages: 3, curve: 'hard', pre: 15, tight: 160, bassF: 85, midF: 800, trebF: 3600, sag: 0.2, bright: 2, vF: 900, vG: 2 },
    { name: 'Modern Metal', stages: 3, curve: 'hard', pre: 18, tight: 170, bassF: 90, midF: 700, trebF: 3200, sag: 0.25, bright: 1, vF: 650, vG: 3 },
    { name: 'Temiz Jazz', stages: 1, curve: 'soft', pre: 1, tight: 60, bassF: 100, midF: 700, trebF: 4000, sag: 0, bright: 4, vF: 1000, vG: 0 },
    { name: 'Yumuşak Overdrive', stages: 2, curve: 'soft', pre: 6, tight: 85, bassF: 110, midF: 850, trebF: 2700, sag: 0.45, bright: 2, vF: 1200, vG: 3 },
    { name: 'Bas Klasik', stages: 1, curve: 'tube', pre: 3, tight: 28, bassF: 55, midF: 450, trebF: 2200, sag: 0.5, bright: 0, vF: 800, vG: 2, bass: true },
    { name: 'Bas Hi-Fi', stages: 1, curve: 'soft', pre: 1.5, tight: 25, bassF: 45, midF: 700, trebF: 5000, sag: 0.1, bright: 3, vF: 500, vG: -3, bass: true },
    { name: 'Bas Overdrive', stages: 2, curve: 'asym', pre: 6, tight: 40, bassF: 60, midF: 900, trebF: 3000, sag: 0.3, bright: 2, vF: 1000, vG: 4, bass: true },
  ];
  OS.AMP_MODELS = AMPS;

  R({
    id: 'gtr.amp', name: 'Amfi Kafası', category: 'Gitar & Bas',
    params: [
      { id: 'model', name: 'Model', type: 'choice', options: AMPS.map(a => a.name), min: 0, max: AMPS.length - 1, def: 1 },
      { id: 'gain', name: 'Gain', min: 0, max: 10, def: 5 },
      { id: 'bass', name: 'Bas', min: 0, max: 10, def: 5 },
      { id: 'mid', name: 'Orta', min: 0, max: 10, def: 5 },
      { id: 'treble', name: 'Tiz', min: 0, max: 10, def: 5 },
      { id: 'presence', name: 'Presence', min: 0, max: 10, def: 5 },
      { id: 'master', name: 'Master', min: 0, max: 10, def: 5 },
      { id: 'bright', name: 'Parlak', type: 'bool', min: 0, max: 1, def: 0 },
    ],
    create(ctx) {
      const input = ctx.createGain(), tight = ctx.createBiquadFilter(), bright = ctx.createBiquadFilter();
      tight.type = 'highpass'; bright.type = 'highshelf'; bright.frequency.value = 2500;
      const stages = [], interF = [];
      for (let i = 0; i < 3; i++) {
        const g = ctx.createGain(), ws = ctx.createWaveShaper(), f = ctx.createBiquadFilter();
        ws.oversample = '4x'; f.type = 'lowpass'; f.frequency.value = 9000 - i * 1500;
        stages.push({ g, ws }); interF.push(f);
      }
      const bass = ctx.createBiquadFilter(), mid = ctx.createBiquadFilter(), treb = ctx.createBiquadFilter(), pres = ctx.createBiquadFilter();
      const voice = ctx.createBiquadFilter(); voice.type = 'peaking'; voice.Q.value = 0.9;
      bass.type = 'lowshelf'; mid.type = 'peaking'; mid.Q.value = 0.7; treb.type = 'highshelf'; pres.type = 'peaking'; pres.frequency.value = 4500; pres.Q.value = 0.8;
      const power = ctx.createWaveShaper(), powerIn = ctx.createGain(), master = ctx.createGain(), comp = ctx.createDynamicsCompressor(), out = ctx.createGain();
      power.curve = U.curve('tube', 1.5); power.oversample = '2x';
      const p = { model: 1, gain: 5, bass: 5, mid: 5, treble: 5, presence: 5, master: 5, bright: 0 };
      function build() {
        const m = AMPS[Math.round(p.model)];
        [input, tight, bright, ...stages.map(s => s.g), ...stages.map(s => s.ws), ...interF].forEach(n => { try { n.disconnect(); } catch (e) { } });
        input.connect(tight); tight.connect(bright);
        tight.frequency.value = m.tight;
        bright.gain.value = p.bright >= 0.5 ? 6 + m.bright : m.bright;
        let prev = bright;
        const g = p.gain / 10;
        for (let i = 0; i < m.stages; i++) {
          const st = stages[i];
          prev.connect(st.g); st.g.connect(st.ws); st.ws.connect(interF[i]);
          st.g.gain.value = 1 + m.pre * g * (i === 0 ? 1 : 0.6);
          st.ws.curve = U.curve(m.curve, 1 + g * (i + 1) * 1.2);
          prev = interF[i];
        }
        prev.connect(bass);
        bass.frequency.value = m.bassF; mid.frequency.value = m.midF; treb.frequency.value = m.trebF;
        bass.gain.value = (p.bass - 5) * 2.4; mid.gain.value = (p.mid - 5) * 2.4; treb.gain.value = (p.treble - 5) * 2.4;
        pres.gain.value = (p.presence - 5) * 1.8;
        voice.frequency.value = m.vF || 1000; voice.gain.value = m.vG || 0;
        comp.threshold.value = -24 + (1 - m.sag) * 18; comp.ratio.value = 2 + m.sag * 4; comp.attack.value = 0.01; comp.release.value = 0.2;
        const vm = p.master / 10;
        powerIn.gain.value = 0.6 + vm * 1.6;
        master.gain.value = 0.15 + vm * 0.5;
        // kazanç arttıkça çıkış seviyesini dengele
        out.gain.value = 1 / (1 + g * (m.stages - 0.5) * 0.6);
      }
      bass.connect(mid); mid.connect(treb); treb.connect(pres); pres.connect(voice); voice.connect(comp); comp.connect(powerIn); powerIn.connect(power); power.connect(master); master.connect(out);
      build();
      return { input, output: out, set(id, v) { p[id] = v; build(); } };
    },
  });

  // ---------------- KABİNLER ----------------
  const CABS = [
    { name: '1x12 Açık', hp: 85, res: 110, resG: 4, mid: 1800, midG: -2, mid2: 3000, mid2G: 3, lp: 5200 },
    { name: '2x12 Klasik', hp: 80, res: 100, resG: 5, mid: 1500, midG: -3, mid2: 2700, mid2G: 4, lp: 5000 },
    { name: '4x12 Modern Kapalı', hp: 75, res: 95, resG: 6, mid: 1100, midG: -2, mid2: 2400, mid2G: 5, lp: 4500 },
    { name: '4x12 Vintage Kapalı', hp: 75, res: 105, resG: 5, mid: 900, midG: 1, mid2: 2000, mid2G: 4, lp: 4000 },
    { name: '1x10 Küçük', hp: 120, res: 150, resG: 3, mid: 1200, midG: 2, mid2: 3200, mid2G: 2, lp: 5500 },
    { name: '4x10 Bas', hp: 40, res: 70, resG: 4, mid: 600, midG: -3, mid2: 2500, mid2G: 2, lp: 6000 },
    { name: '8x10 Bas', hp: 35, res: 60, resG: 6, mid: 500, midG: -4, mid2: 2000, mid2G: 1, lp: 4500 },
    { name: '1x15 Bas', hp: 32, res: 55, resG: 5, mid: 700, midG: -2, mid2: 1800, mid2G: 0, lp: 3500 },
    { name: '4x12 Yüksek Güç', hp: 78, res: 100, resG: 5, mid: 1000, midG: -1, mid2: 2500, mid2G: 5, lp: 4700 },
    { name: '2x12 Parlak', hp: 90, res: 120, resG: 3, mid: 1300, midG: 1, mid2: 3200, mid2G: 5, lp: 6000 },
    { name: '1x12 Açık Combo', hp: 85, res: 115, resG: 3, mid: 700, midG: -3, mid2: 3000, mid2G: 3, lp: 5800 },
    { name: '2x12 Açık Vintage', hp: 82, res: 110, resG: 4, mid: 800, midG: -2, mid2: 2600, mid2G: 3, lp: 5200 },
    { name: '4x12 Büyük Gövde', hp: 70, res: 85, resG: 7, mid: 600, midG: -4, mid2: 2300, mid2G: 4, lp: 4600 },
    { name: '4x12 Sıkı', hp: 72, res: 92, resG: 6, mid: 750, midG: -2, mid2: 2700, mid2G: 5, lp: 5000 },
    { name: '1x12 Sıcak', hp: 100, res: 140, resG: 3, mid: 1100, midG: 2, mid2: 2400, mid2G: 2, lp: 4500 },
    { name: '4x10 Sıcak Combo', hp: 70, res: 95, resG: 4, mid: 900, midG: 1, mid2: 2200, mid2G: 3, lp: 4800 },
    { name: '2x12 Stereo Temiz', hp: 80, res: 105, resG: 3, mid: 1200, midG: 0, mid2: 3500, mid2G: 2, lp: 7000 },
    { name: '4x10 Bas Hi-Fi + Tweeter', hp: 38, res: 65, resG: 4, mid: 600, midG: -3, mid2: 4000, mid2G: 3, lp: 9000 },
    { name: '2x10 Bas Combo', hp: 45, res: 80, resG: 4, mid: 800, midG: -1, mid2: 2500, mid2G: 2, lp: 5000 },
  ];
  OS.CAB_MODELS = CABS;
  R({
    id: 'gtr.cab', name: 'Kabin Simülatörü', category: 'Gitar & Bas',
    params: [
      { id: 'model', name: 'Kabin', type: 'choice', options: CABS.map(c => c.name), min: 0, max: CABS.length - 1, def: 2 },
      { id: 'mic', name: 'Mikrofon Konumu', min: 0, max: 1, def: 0.4 },
      { id: 'room', name: 'Oda', min: 0, max: 1, def: 0.1 },
      { id: 'level', name: 'Seviye', min: -24, max: 12, def: 0, unit: 'dB' },
      { id: 'useir', name: 'IR Kullan', type: 'bool', min: 0, max: 1, def: 0 },
      { id: 'dist', name: 'Mikrofon Mesafesi', min: 0, max: 1, def: 0.2 },
      { id: 'angle', name: 'Mikrofon Açısı', min: 0, max: 1, def: 0 },
      { id: 'm1pan', name: 'Mik 1 Pan', min: -1, max: 1, def: 0 },
      { id: 'm2lvl', name: 'Mik 2 Seviye', min: -60, max: 6, def: -60, unit: 'dB' },
      { id: 'm2type', name: 'Mik 2 Tipi', type: 'choice', options: ['Dinamik', 'Şerit (ribbon)', 'Kondansatör'], min: 0, max: 2, def: 1 },
      { id: 'm2pos', name: 'Mik 2 Konumu', min: 0, max: 1, def: 0.6 },
      { id: 'm2axis', name: 'Mik 2 Eksen Dışı 45°', type: 'bool', min: 0, max: 1, def: 0 },
      { id: 'm2pan', name: 'Mik 2 Pan', min: -1, max: 1, def: 0 },
      { id: 'm2inv', name: 'Mik 2 Ters Faz', type: 'bool', min: 0, max: 1, def: 0 },
    ],
    create(ctx, host) {
      const input = ctx.createGain(), out = ctx.createGain(), sim = ctx.createGain(), conv = ctx.createConvolver();
      const f = { hp: ctx.createBiquadFilter(), res: ctx.createBiquadFilter(), mid: ctx.createBiquadFilter(), mid2: ctx.createBiquadFilter(), lp: ctx.createBiquadFilter(), lp2: ctx.createBiquadFilter() };
      f.hp.type = 'highpass'; f.res.type = 'peaking'; f.res.Q.value = 2; f.mid.type = 'peaking'; f.mid.Q.value = 1.2; f.mid2.type = 'peaking'; f.mid2.Q.value = 1.5;
      f.lp.type = 'lowpass'; f.lp2.type = 'lowpass'; f.lp.Q.value = 0.9; f.lp2.Q.value = 0.6;
      sim.connect(f.hp); f.hp.connect(f.res); f.res.connect(f.mid); f.mid.connect(f.mid2); f.mid2.connect(f.lp); f.lp.connect(f.lp2);
      const room = shell(ctx), rconv = ctx.createConvolver();
      rconv.buffer = U.makeReverbIR(ctx, 0.4, 3, 0.5);
      room.input.connect(rconv); rconv.connect(room.wet);
      // mikrofon 1: mevcut zincir + pan; mikrofon 2: hoparlör çekirdeğinden ayrı bir ton yolu
      const m1pan = ctx.createStereoPanner(); f.lp2.connect(m1pan); m1pan.connect(room.input);
      const m2 = { pk: ctx.createBiquadFilter(), lp: ctx.createBiquadFilter(), hp: ctx.createBiquadFilter(), g: ctx.createGain(), pan: ctx.createStereoPanner() };
      m2.pk.type = 'peaking'; m2.pk.Q.value = 1.2; m2.lp.type = 'lowpass'; m2.hp.type = 'highpass';
      f.mid.connect(m2.hp); m2.hp.connect(m2.pk); m2.pk.connect(m2.lp); m2.lp.connect(m2.g); m2.g.connect(m2.pan); m2.pan.connect(room.input);
      conv.connect(room.input); room.output.connect(out);
      const p = { model: 2, mic: 0.4, useir: 0, dist: 0.2, angle: 0, room: 0.1, m1pan: 0, m2lvl: -60, m2type: 1, m2pos: 0.6, m2axis: 0, m2pan: 0, m2inv: 0 };
      let irBuffer = null, irName = '';
      function apply() {
        const c = CABS[Math.round(p.model)];
        // yakın mikrofon: bas artışı (proximity); uzak: daha çok oda, daha az bas; açı: tizler azalır
        f.hp.frequency.value = c.hp * (1 + p.dist * 0.6); f.res.frequency.value = c.res; f.res.gain.value = c.resG + (1 - p.dist) * 3 - p.dist * 2;
        f.mid.frequency.value = c.mid; f.mid.gain.value = c.midG; f.mid2.frequency.value = c.mid2; f.mid2.gain.value = c.mid2G + (0.5 - p.mic) * 6;
        f.lp.frequency.value = c.lp * (0.7 + (1 - p.mic) * 0.6) * (1 - p.angle * 0.45) * (1 - p.dist * 0.15); f.lp2.frequency.value = c.lp * 1.3 * (1 - p.angle * 0.3);
        room.mix(Math.min(1, p.room * 0.6 + p.dist * 0.45));
        m1pan.pan.value = p.m1pan; m2.pan.pan.value = p.m2pan;
        const t = Math.round(p.m2type), ax = p.m2axis >= 0.5 ? 0.55 : 1;
        // dinamik: orta tepe; şerit: koyu, yumuşak tiz; kondansatör: geniş ve parlak
        m2.hp.frequency.value = [70, 40, 50][t]; m2.pk.frequency.value = [2500, 900, 5000][t]; m2.pk.gain.value = [4, 2, 3][t] + (0.5 - p.m2pos) * 5;
        m2.lp.frequency.value = [6000, 3800, 9000][t] * (0.7 + (1 - p.m2pos) * 0.6) * ax;
        m2.g.gain.value = (p.m2lvl <= -60 ? 0 : U.dbToGain(p.m2lvl)) * (p.m2inv >= 0.5 ? -1 : 1);
        // kabin global bypass (harici IR yükleyici kullanan için)
        if (OS.cabBypass) { try { input.disconnect(); } catch (e) { } input.connect(out); return; }
        try { input.disconnect(); } catch (e) { }
        if (p.useir >= 0.5 && irBuffer) { conv.buffer = irBuffer; input.connect(conv); } else input.connect(sim);
      }
      apply();
      return {
        input, output: out,
        set(id, v) { if (id in p) { p[id] = v; apply(); } if (id === 'level') out.gain.value = U.dbToGain(v); },
        async loadIR(file) {
          const ab = await U.readAsArrayBuffer(file);
          irBuffer = await ctx.decodeAudioData(ab); irName = file.name;
          host.device.extra = { irName, ir: U.abToB64(ab) };
          host.device.setParam('useir', 1); apply();
        },
        save() { return host.device.extra; },
        restore(x) {
          if (x && x.ir) this.ready = ctx.decodeAudioData(U.b64ToAb(x.ir)).then(b => { irBuffer = b; irName = x.irName; apply(); }).catch(() => { });
        },
        irName: () => irName,
      };
    },
    ui(container, dev) {
      const lab = U.el('span', { class: 'muted' }, dev.extra && dev.extra.irName ? 'IR: ' + dev.extra.irName : 'Kendi kabin IR dosyanızı (WAV) yükleyebilirsiniz');
      container.appendChild(U.el('div', { class: 'row' }, U.el('button', {
        class: 'btn sm', onclick: async () => {
          const [f] = await U.pickFiles('audio/*,.wav'); if (!f) return;
          await dev.inst.loadIR(f); lab.textContent = 'IR: ' + f.name; OS.ui && OS.ui.refreshDevice && OS.ui.refreshDevice(dev);
        },
      }, 'IR Yükle…'), lab));
    },
  });

  // ---------------- PEDALLAR ----------------
  R({
    id: 'pdl.od', name: 'Overdrive Pedalı', category: 'Pedallar',
    params: [
      { id: 'drive', name: 'Drive', min: 0, max: 10, def: 4 },
      { id: 'tone', name: 'Tone', min: 0, max: 10, def: 5 },
      { id: 'level', name: 'Level', min: 0, max: 10, def: 5 },
    ],
    create(ctx) {
      // orta frekans tümseği + yumuşak kırpma
      const hp = ctx.createBiquadFilter(), hump = ctx.createBiquadFilter(), g = ctx.createGain(), ws = ctx.createWaveShaper(), tone = ctx.createBiquadFilter(), lvl = ctx.createGain();
      hp.type = 'highpass'; hp.frequency.value = 720; hp.Q.value = 0.5; hump.type = 'peaking'; hump.frequency.value = 720; hump.gain.value = 6;
      tone.type = 'lowpass'; ws.oversample = '4x';
      const dry = ctx.createGain(); dry.gain.value = 0.25;
      const input = ctx.createGain(); input.connect(hp); input.connect(dry);
      hp.connect(hump); hump.connect(g); g.connect(ws); ws.connect(tone); dry.connect(tone); tone.connect(lvl);
      return {
        input, output: lvl,
        set(id, v) {
          if (id === 'drive') { g.gain.value = 1 + v * 3; ws.curve = U.curve('asym', 1 + v * 0.8); }
          if (id === 'tone') tone.frequency.value = 800 * Math.pow(10, v / 10);
          if (id === 'level') lvl.gain.value = v / 5 * 0.7;
        },
      };
    },
  });
  R({
    id: 'pdl.dist', name: 'Distortion Pedalı', category: 'Pedallar',
    params: [
      { id: 'dist', name: 'Distortion', min: 0, max: 10, def: 6 },
      { id: 'filter', name: 'Filter', min: 0, max: 10, def: 5 },
      { id: 'level', name: 'Volume', min: 0, max: 10, def: 5 },
    ],
    create(ctx) {
      const hp = ctx.createBiquadFilter(), g = ctx.createGain(), ws = ctx.createWaveShaper(), lp = ctx.createBiquadFilter(), lvl = ctx.createGain();
      hp.type = 'highpass'; hp.frequency.value = 120; lp.type = 'lowpass'; ws.oversample = '4x';
      hp.connect(g); g.connect(ws); ws.connect(lp); lp.connect(lvl);
      return {
        input: hp, output: lvl,
        set(id, v) {
          if (id === 'dist') { g.gain.value = 2 + v * 10; ws.curve = U.curve('hard', 1 + v * 0.5); }
          if (id === 'filter') lp.frequency.value = 6000 * Math.pow(0.15, v / 10);
          if (id === 'level') lvl.gain.value = v / 5 * 0.35;
        },
      };
    },
  });
  R({
    id: 'pdl.fuzz', name: 'Fuzz Pedalı', category: 'Pedallar',
    params: [
      { id: 'fuzz', name: 'Fuzz', min: 0, max: 10, def: 7 },
      { id: 'tone', name: 'Tone', min: 0, max: 10, def: 5 },
      { id: 'level', name: 'Volume', min: 0, max: 10, def: 5 },
    ],
    create(ctx) {
      const g = ctx.createGain(), ws = ctx.createWaveShaper(), lp = ctx.createBiquadFilter(), sc = ctx.createBiquadFilter(), lvl = ctx.createGain();
      lp.type = 'lowpass'; sc.type = 'peaking'; sc.frequency.value = 800; sc.Q.value = 0.7; ws.oversample = '4x';
      g.connect(ws); ws.connect(sc); sc.connect(lp); lp.connect(lvl);
      return {
        input: g, output: lvl,
        set(id, v) {
          if (id === 'fuzz') { g.gain.value = 4 + v * 20; ws.curve = U.curve('fuzz', 2 + v); }
          if (id === 'tone') { lp.frequency.value = 1500 + v * 600; sc.gain.value = -8 + v * 1.2; }
          if (id === 'level') lvl.gain.value = v / 5 * 0.3;
        },
      };
    },
  });
  R({
    id: 'pdl.comp', name: 'Kompresör Pedalı', category: 'Pedallar',
    params: [
      { id: 'sustain', name: 'Sustain', min: 0, max: 10, def: 5 },
      { id: 'attack', name: 'Attack', min: 0, max: 10, def: 5 },
      { id: 'level', name: 'Level', min: 0, max: 10, def: 5 },
    ],
    create(ctx) {
      const c = ctx.createDynamicsCompressor(), lvl = ctx.createGain();
      c.knee.value = 10; c.release.value = 0.25; c.connect(lvl);
      return {
        input: c, output: lvl,
        set(id, v) {
          if (id === 'sustain') { c.threshold.value = -10 - v * 4; c.ratio.value = 2 + v * 1.5; }
          if (id === 'attack') c.attack.value = 0.001 + v * 0.005;
          if (id === 'level') lvl.gain.value = (v / 5) * (1 + (c.ratio.value - 2) * 0.15);
        },
      };
    },
  });
  R({
    id: 'pdl.wah', name: 'Wah Pedalı', category: 'Pedallar',
    params: [
      { id: 'pos', name: 'Pedal', min: 0, max: 1, def: 0.5 },
      { id: 'mode', name: 'Mod', type: 'choice', options: ['Manuel', 'Oto (LFO)'], min: 0, max: 1, def: 0 },
      { id: 'rate', name: 'Oto Hız', min: 0.1, max: 10, def: 2, unit: 'Hz', curve: 'log' },
      { id: 'q', name: 'Q', min: 1, max: 20, def: 6 },
    ],
    create(ctx) {
      const f = ctx.createBiquadFilter(), L = lfo(ctx), out = ctx.createGain();
      f.type = 'bandpass'; out.gain.value = 2.5;
      const dry = ctx.createGain(); dry.gain.value = 0.15;
      const input = ctx.createGain(); input.connect(f); input.connect(dry); f.connect(out); dry.connect(out);
      L.gain.connect(f.frequency);
      const p = { pos: 0.5, mode: 0 };
      const apply = () => {
        const fr = 400 * Math.pow(2200 / 400, p.pos);
        if (p.mode >= 0.5) { f.frequency.value = 1000; L.gain.gain.value = 700; }
        else { L.gain.gain.value = 0; f.frequency.value = fr; }
      };
      apply();
      return {
        input, output: out,
        set(id, v) { if (id in p) { p[id] = v; apply(); } if (id === 'rate') L.osc.frequency.value = v; if (id === 'q') f.Q.value = v; },
        dispose() { L.stop(); },
      };
    },
  });
  R({
    id: 'pdl.boost', name: 'Clean Boost', category: 'Pedallar',
    params: [{ id: 'boost', name: 'Boost', min: 0, max: 20, def: 6, unit: 'dB' }, { id: 'tone', name: 'Tiz', min: -10, max: 10, def: 0, unit: 'dB' }],
    create(ctx) {
      const g = ctx.createGain(), t = ctx.createBiquadFilter(); t.type = 'highshelf'; t.frequency.value = 2500; g.connect(t);
      return { input: g, output: t, set(id, v) { if (id === 'boost') g.gain.value = U.dbToGain(v); if (id === 'tone') t.gain.value = v; } };
    },
  });
  R({
    id: 'pdl.octave', name: 'Oktav Altı (Sub)', category: 'Pedallar',
    params: [{ id: 'sub', name: 'Sub', min: 0, max: 1, def: 0.5 }, { id: 'dry', name: 'Direkt', min: 0, max: 1, def: 0.8 }],
    create(ctx) {
      // tam dalga doğrultma + alçak geçiren ile yaklaşık oktav efekti (analog tip "octave up/fuzz")
      const input = ctx.createGain(), dry = ctx.createGain(), ws = ctx.createWaveShaper(), lp = ctx.createBiquadFilter(), sub = ctx.createGain(), out = ctx.createGain(), hp = ctx.createBiquadFilter();
      const c = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; c[i] = Math.abs(x) * 2 - 0.6; }
      ws.curve = c; lp.type = 'lowpass'; lp.frequency.value = 1800; hp.type = 'highpass'; hp.frequency.value = 40;
      input.connect(dry); input.connect(ws); ws.connect(hp); hp.connect(lp); lp.connect(sub); dry.connect(out); sub.connect(out);
      return { input, output: out, set(id, v) { if (id === 'sub') sub.gain.value = v; if (id === 'dry') dry.gain.value = v; } };
    },
  });
  R({
    id: 'pdl.eq', name: 'Grafik EQ Pedalı', category: 'Pedallar',
    params: [100, 200, 400, 800, 1600, 3200, 6400].map(f => ({ id: 'b' + f, name: f >= 1000 ? (f / 1000) + 'k' : String(f), min: -15, max: 15, def: 0, unit: 'dB' })).concat([{ id: 'level', name: 'Seviye', min: -15, max: 15, def: 0, unit: 'dB' }]),
    create(ctx) {
      const bands = {}; let prev = null, first = null;
      [100, 200, 400, 800, 1600, 3200, 6400].forEach(f => { const b = ctx.createBiquadFilter(); b.type = 'peaking'; b.frequency.value = f; b.Q.value = 1.4; bands['b' + f] = b; if (prev) prev.connect(b); else first = b; prev = b; });
      const lvl = ctx.createGain(); prev.connect(lvl);
      return { input: first, output: lvl, set(id, v) { if (bands[id]) bands[id].gain.value = v; if (id === 'level') lvl.gain.value = U.dbToGain(v); } };
    },
  });

  // ---------------- Çift amfi (paralel iki amfi + kabin yolu) ----------------
  R({
    id: 'gtr.dualamp', name: 'Çift Amfi (A/B)', category: 'Gitar & Bas',
    params: [
      { id: 'ampA', name: 'Amfi A', type: 'choice', options: AMPS.map(a => a.name), min: 0, max: AMPS.length - 1, def: 7 },
      { id: 'cabA', name: 'Kabin A', type: 'choice', options: CABS.map(c => c.name), min: 0, max: CABS.length - 1, def: 3 },
      { id: 'gainA', name: 'Gain A', min: 0, max: 10, def: 6 },
      { id: 'ampB', name: 'Amfi B', type: 'choice', options: AMPS.map(a => a.name), min: 0, max: AMPS.length - 1, def: 15 },
      { id: 'cabB', name: 'Kabin B', type: 'choice', options: CABS.map(c => c.name), min: 0, max: CABS.length - 1, def: 9 },
      { id: 'gainB', name: 'Gain B', min: 0, max: 10, def: 4 },
      { id: 'blend', name: 'A ↔ B', min: 0, max: 1, def: 0.5 },
      { id: 'width', name: 'Stereo Genişlik', min: 0, max: 1, def: 0.7 },
      { id: 'level', name: 'Seviye', min: -24, max: 12, def: -6, unit: 'dB' },
    ],
    create(ctx) {
      const input = ctx.createGain(), out = ctx.createGain();
      const path = () => {
        const amp = new OS.Device(ctx, 'gtr.amp'), cab = new OS.Device(ctx, 'gtr.cab'), g = ctx.createGain(), pan = ctx.createStereoPanner();
        input.connect(amp.in); amp.out.connect(cab.in); cab.out.connect(g); g.connect(pan); pan.connect(out);
        return { amp, cab, g, pan };
      };
      const A = path(), B = path(), p = { blend: 0.5, width: 0.7 };
      const mix = () => { A.g.gain.value = Math.cos(p.blend * Math.PI / 2); B.g.gain.value = Math.sin(p.blend * Math.PI / 2); A.pan.pan.value = -p.width; B.pan.pan.value = p.width; };
      mix();
      return {
        input, output: out,
        set(id, v) {
          if (id === 'ampA') A.amp.setParam('model', v); if (id === 'ampB') B.amp.setParam('model', v);
          if (id === 'cabA') A.cab.setParam('model', v); if (id === 'cabB') B.cab.setParam('model', v);
          if (id === 'gainA') A.amp.setParam('gain', v); if (id === 'gainB') B.amp.setParam('gain', v);
          if (id === 'blend' || id === 'width') { p[id] = v; mix(); }
          if (id === 'level') out.gain.value = U.dbToGain(v);
        },
        dispose() { [A, B].forEach(x => { x.amp.dispose(); x.cab.dispose(); }); },
      };
    },
  });

  // ---------------- Manyetik eşleştirme (gitar karakterini başka bir manyetiğe benzetme) ----------------
  // Her manyetik: rezonans tepesi (Hz, dB, Q) ve tiz kesimi. Dönüşüm = kaynağın tersi + hedef.
  const PICKUPS = [
    { name: 'Tek bobin (single coil)', f: 4500, g: 5, q: 1.4, hc: 9000 },
    { name: 'Humbucker', f: 2200, g: 6, q: 1.2, hc: 5000 },
    { name: 'Kalın tek bobin', f: 3200, g: 6, q: 1.6, hc: 7000 },
    { name: 'Aktif humbucker', f: 2800, g: 3, q: 0.8, hc: 8000 },
    { name: 'Akustik piezo', f: 6000, g: 2, q: 0.7, hc: 14000 },
  ];
  R({
    id: 'gtr.pickup', name: 'Manyetik Eşleştirme', category: 'Gitar & Bas',
    params: [
      { id: 'from', name: 'Gitarınızın manyetiği', type: 'choice', options: PICKUPS.map(x => x.name), min: 0, max: PICKUPS.length - 1, def: 0 },
      { id: 'to', name: 'Hedef ses', type: 'choice', options: PICKUPS.map(x => x.name), min: 0, max: PICKUPS.length - 1, def: 1 },
      { id: 'amount', name: 'Miktar', min: 0, max: 1, def: 1 },
      { id: 'output', name: 'Çıkış (sıcak/soğuk)', min: -12, max: 12, def: 0, unit: 'dB' },
    ],
    create(ctx) {
      const mk = t => { const f = ctx.createBiquadFilter(); f.type = t; return f; };
      const undo = mk('peaking'), add = mk('peaking'), shelf = mk('highshelf'), g = ctx.createGain();
      shelf.frequency.value = 4000;
      undo.connect(add); add.connect(shelf); shelf.connect(g);
      const p = { from: 0, to: 1, amount: 1 };
      const apply = () => {
        const a = PICKUPS[Math.round(p.from)], b = PICKUPS[Math.round(p.to)], k = p.amount;
        undo.frequency.value = a.f; undo.Q.value = a.q; undo.gain.value = -a.g * k;
        add.frequency.value = b.f; add.Q.value = b.q; add.gain.value = b.g * k;
        shelf.gain.value = U.clamp(20 * Math.log10(b.hc / a.hc) * 1.5 * k, -12, 12);
        // humbucker daha yüksek çıkışlıdır
        g.gain.value = U.dbToGain(((b.name.includes('umbucker') ? 4 : 0) - (a.name.includes('umbucker') ? 4 : 0)) * k + (p.output || 0));
      };
      apply();
      return { input: undo, output: g, set(id, v) { p[id] = v; apply(); } };
    },
  });

  // Ön ayarlı gitar zinciri şablonları (Amfi Rack ve parça eklerken kullanılır)
  OS.RIG_PRESETS = {
    'Temiz + Chorus': [['pdl.comp', {}], ['gtr.amp', { model: 0, gain: 3 }], ['gtr.cab', { model: 1 }], ['fx.chorus', { mix: 0.4 }], ['fx.reverb', { mix: 0.25 }]],
    'Blues Crunch': [['pdl.od', { drive: 3, level: 6 }], ['gtr.amp', { model: 1, gain: 5 }], ['gtr.cab', { model: 3 }], ['fx.reverb', { mix: 0.2, size: 1.5 }]],
    'Klasik Rock': [['pdl.boost', { boost: 6 }], ['gtr.amp', { model: 2, gain: 7 }], ['gtr.cab', { model: 3 }], ['fx.delay', { sync: 6, mix: 0.18 }]],
    'Metal Ritim': [['fx.gate', { th: -55 }], ['pdl.od', { drive: 1, tone: 6, level: 8 }], ['gtr.amp', { model: 3, gain: 8, mid: 4, bass: 6 }], ['gtr.cab', { model: 2 }]],
    'Fuzz Solo': [['pdl.fuzz', {}], ['gtr.amp', { model: 4, gain: 4 }], ['gtr.cab', { model: 0 }], ['fx.delay', { sync: 7, mix: 0.3, fb: 0.45 }], ['fx.reverb', { mix: 0.3 }]],
    'Bas - Temiz': [['pdl.comp', { sustain: 4 }], ['gtr.amp', { model: 5, gain: 3, bass: 6 }], ['gtr.cab', { model: 6 }]],
    'Klasik Crunch Rock': [['gtr.amp', { model: 7, gain: 7 }], ['gtr.cab', { model: 3 }], ['fx.reverb', { mix: 0.15, size: 1.2 }]],
    'Modern Metal Ritim': [['fx.gate', { th: -50 }], ['pdl.od', { drive: 0.5, tone: 7, level: 8 }], ['gtr.amp', { model: 13, gain: 7, mid: 4 }], ['gtr.cab', { model: 12 }]],
    'Temiz Funk': [['pdl.comp', { sustain: 6 }], ['gtr.amp', { model: 10, gain: 2, treble: 6 }], ['gtr.cab', { model: 10 }], ['fx.reverb', { mix: 0.2 }]],
    'Parlak Indie': [['pdl.boost', { boost: 4 }], ['gtr.amp', { model: 15, gain: 5 }], ['gtr.cab', { model: 9 }], ['fx.delay', { sync: 6, mix: 0.2 }], ['fx.reverb', { mix: 0.25 }]],
    'Jazz Temiz': [['gtr.amp', { model: 18, gain: 1, treble: 4 }], ['gtr.cab', { model: 16 }], ['fx.chorus', { mix: 0.3 }], ['fx.reverb', { mix: 0.2 }]],
    'Bas - Grind': [['pdl.comp', { sustain: 5 }], ['gtr.amp', { model: 22, gain: 6 }], ['gtr.cab', { model: 17 }]],
    'Bas - Rock': [['pdl.comp', { sustain: 6 }], ['gtr.amp', { model: 6, gain: 6 }], ['gtr.cab', { model: 5 }]],
  };
})(window.OS);
