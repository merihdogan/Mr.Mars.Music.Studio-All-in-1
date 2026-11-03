/* Mr. Mars Music Studio · MRH DGN — "Metal Creative" sekmesi ve menüsü
 * 1) MRH Riff Fabrikası: stil × akort × bölüm tipi başına 40 riff parçası (gitar + bas + davul + synth + FX)
 *    dinleme, şarkıya ekleme, DI WAV + amfili WAV + MIDI paketi (.zip) dışa aktarma
 * 2) DGN Şarkı Kurucu: hazır şarkı yapıları, bölüm sırası, projeye çok kanallı yazma
 * 3) Mr. Mars Metal Ton Arşivi: yüksek kazançlı amfi × kabin tonları + tür paketleri
 * 4) MRH metal synth ön ayarları, Metal mix şablonu, hızlı cihaz ekleme
 */
(function (OS) {
  const U = OS.U, el = U.el, ui = OS.ui, E = OS.engine, T = OS.transport, G = OS.metalGen;
  const MC = ui.metal = {};
  let root;
  const box = (title, ...kids) => el('div', { class: 'mini-box' }, el('div', { class: 'mini-title' }, title), ...kids);
  const sel = (opts, val, on) => { const s = el('select', { onchange: () => on(s.value) }, opts.map(o => Array.isArray(o) ? el('option', { value: o[0], selected: String(o[0]) === String(val) }, o[1]) : el('option', { value: o, selected: o === val }, o))); return s; };

  const S = MC.state = Object.assign({ style: 'Modern Metal', tuning: 'Drop A (7 tel)', type: 'riff', bpm: 0, form: 'Modern Metal (tam şarkı)', song: [], toneFilter: '' },
    (() => { try { return JSON.parse(localStorage.getItem('os.metal') || '{}'); } catch (e) { return {}; } })());
  const save = () => { try { localStorage.setItem('os.metal', JSON.stringify(S)); } catch (e) { } };
  const bpmOf = () => S.bpm || G.STYLES[S.style].bpm;

  // =====================================================================
  // Mr. Mars Metal Ton Arşivi
  // =====================================================================
  const AMP7 = [['Modern Metal', { gain: 6.5, bass: 5, mid: 5.5, treble: 6, presence: 6 }], ['Ağır Metal', { gain: 6, bass: 4.5, mid: 4.5, treble: 6.5, presence: 6.5 }],
    ['Modern Hi-Gain', { gain: 7, bass: 5, mid: 6.5, treble: 6, presence: 5.5 }], ['Akıcı Lead', { gain: 6, bass: 3.5, mid: 6, treble: 6.5, presence: 5 }],
    ['Sıkı Metal', { gain: 6.5, bass: 5.5, mid: 5, treble: 6, presence: 6 }], ['Hard Rock', { gain: 8, bass: 4.5, mid: 7, treble: 6.5, presence: 6 }],
    ['Yüksek Kazanç', { gain: 7, bass: 5, mid: 5, treble: 6, presence: 6 }]];
  const CAB10 = [['4x12 Modern Kapalı', 0.35], ['4x12 Vintage Kapalı', 0.4], ['4x12 Yüksek Güç', 0.38], ['4x12 Büyük Gövde', 0.3], ['4x12 Sıkı', 0.35],
    ['2x12 Klasik', 0.45], ['2x12 Parlak', 0.5], ['1x12 Açık', 0.5], ['2x12 Açık Vintage', 0.45], ['1x12 Açık Combo', 0.42]];
  const ampIdx = n => Math.max(0, OS.AMP_MODELS.findIndex(a => a.name === n));
  const cabIdx = n => Math.max(0, OS.CAB_MODELS.findIndex(c => c.name === n));
  const TONES = MC.TONES = {};
  const ampChain = (amp, cab, o) => {
    o = o || {};
    return [['fx.gate', { th: o.gate || -58 }], ['fx.dienhance', Object.assign({ chunk: 0.5, fresh: 0.3, crush: 0.15 }, o.di || {})], ['pdl.od', Object.assign({ drive: 0.5, tone: 6.5, level: 8.5 }, o.od || {})],
      ['gtr.amp', Object.assign({ model: ampIdx(amp[0]) }, amp[1], o.amp || {})], ['gtr.cab', Object.assign({ model: cabIdx(cab[0]), mic: cab[1], dist: 0.15 }, o.cab || {})],
      ['fx.eq', Object.assign({ hp: 85, p1f: 450, p1g: -2.5, p1q: 1.2, p2f: 3200, p2g: 1 }, o.eq || {})]].concat(o.post || []);
  };
  AMP7.forEach(a => CAB10.forEach(c => { TONES['Arşiv › ' + a[0] + ' → ' + c[0]] = ampChain(a, c); }));
  const A = n => AMP7.find(a => a[0] === n), C = n => CAB10.find(c => c[0] === n);
  const pack = (name, list) => list.forEach(([n, amp, cab, o]) => { TONES[name + ' › ' + n] = ampChain(A(amp), C(cab), o); });
  pack('Deathcore', [
    ['Sıkı Chug', 'Modern Metal', '4x12 Modern Kapalı', { di: { chunk: 0.9, crush: 0.35 }, amp: { gain: 7, bass: 5.5 } }],
    ['Slam Duvarı', 'Ağır Metal', '4x12 Büyük Gövde', { di: { chunk: 0.8, low: 0.35 }, amp: { gain: 7.5, bass: 6 } }],
    ['Dissonant Lead', 'Akıcı Lead', '4x12 Sıkı', { di: { fresh: 0.6, clang: 0.15 } }],
    ['Isırgan Üst Orta', 'Sıkı Metal', '4x12 Yüksek Güç', { amp: { mid: 6.5, presence: 7 } }],
    ['Breakdown Ağırlığı', 'Yüksek Kazanç', '4x12 Modern Kapalı', { di: { chunk: 1, low: 0.5, crush: 0.4 } }],
    ['Karanlık Ritim', 'Modern Hi-Gain', '4x12 Vintage Kapalı', { amp: { treble: 5, presence: 4.5 } }],
    ['Modern Kesici', 'Modern Metal', '4x12 Sıkı', { di: { fresh: 0.5 }, amp: { presence: 7 } }],
    ['8 Tel Netlik', 'Sıkı Metal', '4x12 Büyük Gövde', { di: { chunk: 0.7 }, eq: { hp: 70, p1g: -4 } }],
  ]);
  pack('Thrash', [
    ['80ler Kesik Orta', 'Hard Rock', '4x12 Vintage Kapalı', { di: { chunk: 0.4, fresh: 0.4 }, amp: { mid: 3.5, gain: 7 } }],
    ['Körfez Bölgesi', 'Akıcı Lead', '4x12 Modern Kapalı', { amp: { mid: 4, bass: 4 } }],
    ['Alman Hız', 'Sıkı Metal', '4x12 Sıkı', { amp: { gain: 6 } }],
    ['Galop Ritmi', 'Modern Hi-Gain', '4x12 Yüksek Güç', { di: { chunk: 0.6 } }],
    ['Kirli Crunch', 'Hard Rock', '2x12 Klasik', { od: { drive: 1.5 } }],
    ['Modern Thrash', 'Modern Metal', '4x12 Modern Kapalı', { amp: { mid: 4.5 } }],
    ['Solo', 'Akıcı Lead', '4x12 Modern Kapalı', { di: { fresh: 0.5 }, post: [['fx.delay', { sync: 7, mix: 0.18, fb: 0.3 }], ['fx.reverb', { mix: 0.15 }]] }],
    ['Ham Kayıt', 'Yüksek Kazanç', '1x12 Açık', { di: { chunk: 0.3 } }],
  ]);
  pack('Djent', [
    ['Sıkı Tık', 'Modern Metal', '4x12 Sıkı', { di: { chunk: 1, fresh: 0.6, crush: 0.4 }, gate: -50 }],
    ['Polimetrik Ritim', 'Ağır Metal', '4x12 Modern Kapalı', { di: { chunk: 0.9 }, amp: { bass: 4 } }],
    ['Kristal Temiz', 'Akıcı Lead', '2x12 Açık Vintage', { amp: { gain: 1.5 }, di: { chunk: 0.2, crush: 0 }, post: [['fx.chorus', { mix: 0.3 }], ['fx.reverb', { mix: 0.35 }]] }],
    ['Atmosferik Lead', 'Sıkı Metal', '4x12 Büyük Gövde', { post: [['fx.delay', { sync: 6, mix: 0.25, fb: 0.4 }], ['fx.shimmer', { mix: 0.2 }]] }],
  ]);
  pack('Nu Metal', [
    ['Bounce', 'Ağır Metal', '4x12 Büyük Gövde', { amp: { mid: 3, bass: 6.5 }, di: { chunk: 0.6 } }],
    ['Gevşek Alçak', 'Yüksek Kazanç', '4x12 Modern Kapalı', { di: { low: 0.3 }, amp: { mid: 3.5 } }],
    ['Temiz Arpej', 'Akıcı Lead', '1x12 Açık Combo', { amp: { gain: 1.2 }, di: { chunk: 0, crush: 0 }, post: [['fx.chorus', { mix: 0.25 }]] }],
    ['Çınlayan Efekt', 'Modern Hi-Gain', '4x12 Vintage Kapalı', { di: { clang: 0.35, cFreq: 250 } }],
  ]);
  TONES['İsveç Death Metal › Testere'] = [['fx.gate', { th: -55 }], ['fx.dienhance', { saw: 1, sDrive: 9, sBass: 10, sMid: 10, sTreble: 10, chunk: 0.2 }], ['gtr.amp', { model: ampIdx('Klasik Crunch'), gain: 3, mid: 6 }], ['gtr.cab', { model: cabIdx('4x12 Vintage Kapalı') }]];
  TONES['Bas › Modern Metal (DI + sim)'] = [['fx.comp', { th: -18, ratio: 4 }], ['gtr.amp', { model: ampIdx('Bas Overdrive'), gain: 5, bass: 6 }], ['gtr.cab', { model: cabIdx('8x10 Bas') }], ['fx.eq', { hp: 35, p1f: 500, p1g: -3, p2f: 1500, p2g: 3 }]];
  TONES['Bas › Temiz Sub'] = [['fx.comp', { th: -20, ratio: 5 }], ['fx.eq', { hp: 30, lsf: 80, lsg: 3, p1f: 400, p1g: -4 }]];
  MC.toneNames = () => Object.keys(TONES);

  function applyTone(t, name) {
    if (!t) { U.toast(OS.t('Önce bir parça seçin')); return; }
    OS.history.push();
    t.inserts.forEach(d => d.dispose()); t.inserts.length = 0;
    TONES[name].forEach(([id, vals]) => { const d = OS.newDevice(id); Object.keys(vals).forEach(k => d.setParam(k, vals[k])); t.inserts.push(d); });
    E.syncTrack(t); ui.renderInspector && ui.renderInspector(); ui.emit('os-devices'); ui.changed();
    U.toast(OS.t('Ton uygulandı') + ': ' + name);
  }
  MC.applyTone = applyTone;
  const selTrack = () => OS.project.tracks.find(t => t.id === ui.selectedTrack);

  // =====================================================================
  // MRH metal synth ön ayarları (Dijital Mini Synth)
  // =====================================================================
  const SYN = {
    'Sub Drop Bas': { engine: 0, timbre: 0.2, shape: 0.2, cut: 400, fenv: 0.6, a: 0.001, d: 1.2, s: 0.4, r: 0.4, glide: 0.3 },
    'Karanlık Pad': { engine: 1, timbre: 0.3, shape: 0.7, cut: 1600, res: 2, a: 0.9, d: 2, s: 0.8, r: 2.5 },
    'Kuzey Işığı Pad': { engine: 0, timbre: 0.8, shape: 0.5, cut: 5000, a: 1.2, d: 2, s: 0.85, r: 3 },
    'Metalcore Arp Kristal': { engine: 3, timbre: 0.8, shape: 0.7, cut: 9000, a: 0.001, d: 0.5, s: 0, r: 0.3 },
    'Djent Atmosfer': { engine: 1, timbre: 0.6, shape: 0.3, cut: 2600, res: 4, fenv: 0.2, a: 1.5, d: 3, s: 0.7, r: 4 },
    'Süper Testere Lead': { engine: 0, timbre: 0.9, shape: 0.8, cut: 8000, fenv: 0.3, a: 0.005, d: 0.4, s: 0.9, r: 0.3, glide: 0.06 },
    'Kesici Kare Lead': { engine: 1, timbre: 0.9, shape: 0.9, cut: 6000, res: 3, a: 0.003, s: 1, r: 0.2 },
    'Koro Ahhs': { engine: 4, timbre: 0.3, shape: 0.2, cut: 4000, a: 0.5, d: 1, s: 0.9, r: 1.5 },
    'Uhrevi Koro': { engine: 4, timbre: 0.7, shape: 0.8, cut: 3000, res: 2, a: 0.8, s: 0.8, r: 2.5 },
    'Breakdown Sub Vuruşu': { engine: 0, timbre: 0, shape: 0, cut: 220, fenv: 0.9, a: 0.001, d: 0.6, s: 0, r: 0.3 },
    'Synth Bas Wobble': { engine: 0, timbre: 0.6, shape: 0.6, cut: 700, res: 8, fenv: 0.7, a: 0.002, d: 0.25, s: 0.3, r: 0.15 },
    'Pluck Arp': { engine: 1, timbre: 0.5, shape: 0.6, cut: 2400, res: 3, fenv: 0.8, a: 0.001, d: 0.22, s: 0, r: 0.2 },
    'Cam Çan': { engine: 2, timbre: 0.9, shape: 0.3, cut: 12000, a: 0.001, d: 1.6, s: 0, r: 1.2 },
    'Gerilim Yükselişi': { engine: 0, timbre: 1, shape: 1, cut: 300, res: 6, fenv: 1, a: 3.5, d: 1, s: 1, r: 1 },
    'Endüstriyel Bas': { engine: 1, timbre: 1, shape: 0.9, cut: 1100, res: 5, fenv: 0.5, a: 0.002, d: 0.3, s: 0.7, r: 0.2 },
    'Org Doom': { engine: 2, timbre: 0.4, shape: 0.1, cut: 3500, a: 0.02, s: 1, r: 0.3 },
    'Kayan Lead': { engine: 0, timbre: 0.7, shape: 0.6, cut: 5000, a: 0.01, s: 1, r: 0.25, glide: 0.18 },
    'Sinematik Yaylı': { engine: 0, timbre: 0.5, shape: 0.4, cut: 3500, a: 0.7, d: 1.5, s: 0.85, r: 1.8 },
    'Nefes Pad': { engine: 4, timbre: 0.5, shape: 0.5, cut: 2000, a: 1.2, s: 0.6, r: 2 },
    'Tremolo Lead': { engine: 1, timbre: 0.8, shape: 0.5, cut: 7000, a: 0.003, d: 0.08, s: 0.6, r: 0.08 },
    'Piano Tel (Karplus)': { engine: 3, timbre: 0.5, shape: 0.4, cut: 7000, a: 0.001, d: 2.5, s: 0, r: 1 },
    'Sert Arp 16': { engine: 0, timbre: 0.6, shape: 0.9, cut: 3000, res: 5, fenv: 0.7, a: 0.001, d: 0.12, s: 0, r: 0.1 },
    'Derin Drone': { engine: 1, timbre: 0.2, shape: 0.9, cut: 900, res: 3, a: 2, s: 1, r: 4 },
    'Vokal Lead': { engine: 4, timbre: 0.8, shape: 0.6, cut: 6000, a: 0.02, s: 0.9, r: 0.3, glide: 0.05 },
    'Kristal Pad': { engine: 2, timbre: 0.7, shape: 0.6, cut: 10000, a: 0.6, d: 2, s: 0.7, r: 2.5 },
    'Bozuk Synth Riff': { engine: 1, timbre: 1, shape: 1, cut: 4000, res: 2, fenv: 0.3, a: 0.001, d: 0.3, s: 0.8, r: 0.1 },
  };
  MC.SYN = SYN;
  const msp = OS.plugins.get('inst.minisynth');
  if (msp) { msp.presets = msp.presets || {}; Object.keys(SYN).forEach(k => { msp.presets['MC › ' + k] = SYN[k]; }); }

  // =====================================================================
  // Önizleme çalar
  // =====================================================================
  const PV = { devs: null, timer: null, bus: null, live: false };
  // önizleme zinciri yalnız çalarken hedefe bağlıdır; bağlı değilken tarayıcı onu hiç işlemez (CPU harcamaz)
  const pvConnect = on => { if (!PV.out || PV.live === on) return; PV.live = on; if (on) PV.out.connect(E.monitorBus); else try { PV.out.disconnect(); } catch (e) { } };
  function previewDevs() {
    if (PV.devs) return PV.devs;
    const ctx = E.init(), bus = PV.bus = ctx.createGain(); bus.gain.value = 0.6;
    // önizleme toplamı kliplemesin diye güvenlik limiteri
    PV.lim = ctx.createDynamicsCompressor(); PV.lim.threshold.value = -3; PV.lim.ratio.value = 20; PV.lim.attack.value = 0.002; PV.lim.release.value = 0.1; PV.lim.knee.value = 0;
    PV.out = ctx.createGain(); bus.connect(PV.lim); PV.lim.connect(PV.out);
    const mk = (pid, vals, chain) => {
      const d = new OS.Device(ctx, pid, { values: vals }); let last = d.out;
      (chain || []).forEach(([id, v]) => { const fx = new OS.Device(ctx, id, { values: v }); last.connect(fx.in); last = fx.out; });
      last.connect(bus); return d;
    };
    const gtone = TONES['Arşiv › Modern Metal → 4x12 Modern Kapalı'];
    PV.devs = {
      gtr: mk('inst.metalgtr', { double: 1, tight: 0.85 }, gtone),
      lead: mk('inst.metalgtr', { pm: 2, tight: 0.4, pick: 1 }, TONES['Thrash › Solo']),
      clean: mk('inst.metalgtr', { pm: 2, tight: 0.2, double: 1, bright: 0.6 }, TONES['Djent › Kristal Temiz']),
      bass: mk('inst.metalbass', { tone: 1 }),
      drums: mk('inst.metaldrums', {}, [['fx.drumpunch', { punch: 0.6, crunch: 0.3, mix: 0.6 }]]),
      synth: mk('inst.minisynth', SYN['Karanlık Pad']),
      fx: mk('inst.industrial', {}),
    };
    return PV.devs;
  }
  MC.stop = function () { clearTimeout(PV.timer); PV.playing = null; if (PV.devs) Object.values(PV.devs).forEach(d => d.allOff()); pvConnect(false); document.querySelectorAll('.mc-play.on').forEach(b => b.classList.remove('on')); };
  MC.preview = async function (chunks, btn) {
    MC.stop(); await E.resume();
    const devs = previewDevs(), ctx = E.ctx, bpm = bpmOf(), spb = 60 / bpm, t0 = ctx.currentTime + 0.15;
    pvConnect(true);
    let at = 0;
    chunks.forEach(c => {
      Object.keys(G.PARTS).forEach(k => (c[k] || []).forEach(n => {
        const d = devs[k]; if (!d) return;
        d.noteOn(n.p, n.v, t0 + (at + n.s) * spb); d.noteOff(n.p, t0 + (at + n.s + n.l) * spb);
      }));
      at += c.beats;
    });
    if (btn) btn.classList.add('on');
    PV.timer = setTimeout(() => { if (btn) btn.classList.remove('on'); pvConnect(false); }, (at * spb + 2.5) * 1000);
  };

  // =====================================================================
  // Projeye yazma
  // =====================================================================
  const PART_SETUP = {
    gtrL: ['MC · Gitar L', 'inst.metalgtr', { tight: 0.85 }, 'Arşiv › Modern Metal → 4x12 Modern Kapalı', -0.9],
    gtrR: ['MC · Gitar R', 'inst.metalgtr', { tight: 0.85, bright: 0.66 }, 'Arşiv › Ağır Metal → 4x12 Büyük Gövde', 0.9],
    bass: ['MC · Bas', 'inst.metalbass', { tone: 1 }, null, 0],
    drums: ['MC · Davul', 'inst.metaldrums', {}, null, 0],
    lead: ['MC · Lead Gitar', 'inst.metalgtr', { pm: 2, tight: 0.4, pick: 1 }, 'Thrash › Solo', 0.15],
    clean: ['MC · Temiz Gitar', 'inst.metalgtr', { pm: 2, tight: 0.2, double: 1 }, 'Djent › Kristal Temiz', 0],
    synth: ['MC · Synth', 'inst.minisynth', SYN['Karanlık Pad'], null, 0],
    fx: ['MC · Endüstriyel FX', 'inst.industrial', {}, null, 0],
  };
  function partTrack(key) {
    const P = OS.project, [name, pid, vals, tone, pan] = PART_SETUP[key];
    let t = P.tracks.find(x => x.mcPart === key);
    if (t) return t;
    t = OS.makeTrack('instrument', name, { instrument: pid, values: vals });
    t.mcPart = key; t.pan = pan;
    if (tone) TONES[tone].forEach(([id, v]) => t.inserts.push(OS.newDevice(id, v)));
    if (key === 'drums') t.inserts.push(OS.newDevice('fx.drumpunch', { punch: 0.6, crunch: 0.3, chunk: 0.4, mix: 0.6, thud: 3, sizzle: 3 }));
    if (key === 'bass') t.inserts.push(OS.newDevice('fx.eq', { hp: 30, p1f: 450, p1g: -2 }));
    const rev = P.tracks.find(x => x.type === 'fx' && /reverb/i.test(x.name));
    if (rev && ['lead', 'clean', 'synth', 'fx'].includes(key)) t.sends[rev.id] = key === 'fx' ? -8 : -12;
    P.tracks.splice(P.tracks.filter(x => x.type !== 'fx').length, 0, t);
    return t;
  }
  // bölümleri sırayla projeye yaz (çalma imlecinin bulunduğu ölçüden itibaren)
  MC.writeSong = function (sections, opts) {
    opts = opts || {};
    if (!sections.length) { U.toast(OS.t('Şarkıda bölüm yok')); return; }
    OS.history.push();
    const P = OS.project, bpb = P.sig[0];
    P.bpm = bpmOf(); T.bpm = P.bpm;
    let at = opts.fromStart ? 0 : Math.floor(T.position() / bpb) * bpb;
    const start0 = at;
    const hum = (n, k) => Object.assign({}, n, { s: Math.max(0, n.s + (k === 'R' ? 0.012 + Math.random() * 0.02 : Math.random() * 0.012) * (P.bpm / 60)), v: U.clamp(n.v + Math.round((Math.random() - 0.5) * 6), 1, 127) });
    sections.forEach(sec => {
      const c = G.chunk(S.style, S.tuning, sec.type, sec.idx), name = c.name;
      for (let r = 0; r < (sec.reps || 1); r++) {
        const put = (key, notes) => { if (!notes.length) return; const t = partTrack(key); t.clips.push({ id: U.uid(), start: at, length: c.beats, name, notes }); };
        put('gtrL', c.gtr.map(n => hum(n, 'L'))); put('gtrR', c.gtr.map(n => hum(n, 'R')));
        put('bass', c.bass.map(n => Object.assign({}, n))); put('drums', c.drums.map(n => Object.assign({}, n)));
        put('lead', c.lead.map(n => Object.assign({}, n))); put('clean', c.clean.map(n => Object.assign({}, n)));
        put('synth', c.synth.map(n => Object.assign({}, n))); put('fx', c.fx.map(n => Object.assign({}, n)));
        at += c.beats;
      }
    });
    P.loop = { on: true, start: start0, end: at };
    E.syncAll(); ui.changed(); ui.emit('os-project', { full: true });
    U.toast(OS.t('Şarkı projeye yazıldı') + ' (' + Math.round((at - start0) / bpb) + ' ' + OS.t('ölçü') + ')');
  };

  // =====================================================================
  // Çevrimdışı render, WAV, MIDI ve ZIP paketi
  // =====================================================================
  async function renderPart(pid, vals, chain, notes, beats, bpm) {
    const sr = 48000, spb = 60 / bpm, len = beats * spb + 2.5;
    const ctx = new OfflineAudioContext(2, Math.ceil(len * sr), sr);
    const d = new OS.Device(ctx, pid, { values: vals }); let last = d.out;
    (chain || []).forEach(([id, v]) => { const fx = new OS.Device(ctx, id, { values: v }); last.connect(fx.in); last = fx.out; });
    last.connect(ctx.destination);
    notes.forEach(n => { d.noteOn(n.p, n.v, n.s * spb); d.noteOff(n.p, (n.s + n.l) * spb); });
    return ctx.startRendering();
  }
  MC.renderPart = renderPart;
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = b => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  // sıkıştırmasız (store) ZIP yazıcı
  function makeZip(files) {
    const enc = new TextEncoder(), parts = [], central = []; let off = 0;
    files.forEach(f => {
      const name = enc.encode(f.name), data = f.data, crc = crc32(data);
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
      h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true);
      parts.push(new Uint8Array(h.buffer), name, data);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
      c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, name.length, true); c.setUint32(42, off, true);
      central.push(new Uint8Array(c.buffer), name);
      off += 30 + name.length + data.length;
    });
    const csize = central.reduce((a, b) => a + b.length, 0), e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, csize, true); e.setUint32(16, off, true);
    return new Blob([...parts, ...central, new Uint8Array(e.buffer)], { type: 'application/zip' });
  }
  MC.makeZip = makeZip;
  const safe = s => String(s).replace(/[\\/:*?"<>|#]+/g, '-').replace(/\s+/g, ' ').trim();
  MC.exportPack = async function (count, withAmp) {
    const TR = OS.transcribe, bpm = bpmOf(), list = G.list(S.style, S.tuning, S.type, count), files = [];
    const base = safe(`${S.style} - ${S.tuning} - ${G.TYPES[S.type]} - ${bpm} BPM`);
    U.toast(OS.t('Paket hazırlanıyor…'), 60000);
    for (let i = 0; i < list.length; i++) {
      const c = list[i], nm = safe(`${String(i + 1).padStart(2, '0')} ${c.name}`);
      const gtrNotes = c.gtr.length ? c.gtr : c.clean.length ? c.clean : c.lead;
      if (gtrNotes.length) {
        const di = await renderPart('inst.metalgtr', { double: 1, tight: 0.85, pm: c.clean.length && !c.gtr.length ? 2 : 0 }, null, gtrNotes, c.beats, bpm);
        files.push({ name: `${base}/DI/${nm} - Gitar DI.wav`, data: new Uint8Array(await U.bufferToWav(di, 24).arrayBuffer()) });
        if (withAmp) {
          const amp = await renderPart('inst.metalgtr', { double: 1, tight: 0.85 }, TONES['Arşiv › Modern Metal → 4x12 Modern Kapalı'], gtrNotes, c.beats, bpm);
          files.push({ name: `${base}/Amfili/${nm} - Gitar Amfi.wav`, data: new Uint8Array(await U.bufferToWav(amp, 24).arrayBuffer()) });
        }
      }
      if (c.bass.length) { const b = await renderPart('inst.metalbass', { tone: 0 }, null, c.bass, c.beats, bpm); files.push({ name: `${base}/DI/${nm} - Bas DI.wav`, data: new Uint8Array(await U.bufferToWav(b, 24).arrayBuffer()) }); }
      const midi = async (notes, part, prog2) => { if (!notes.length || !TR || !TR.toMidi) return; const blob = TR.toMidi(notes, bpm, part, prog2); files.push({ name: `${base}/MIDI/${nm} - ${part}.mid`, data: new Uint8Array(await blob.arrayBuffer()) }); };
      await midi(gtrNotes, 'Gitar', 30); await midi(c.bass, 'Bas', 33); await midi(c.drums, 'Davul', null); await midi(c.synth, 'Synth', 89); await midi(c.lead, 'Lead', 30);
      U.toast(OS.t('Paket hazırlanıyor…') + ' ' + (i + 1) + ' / ' + list.length, 60000);
    }
    U.download(makeZip(files), base + '.zip');
    U.toast(files.length + ' ' + OS.t('dosya paketlendi'));
  };
  MC.exportSongMidi = async function () {
    const TR = OS.transcribe; if (!S.song.length || !TR) return;
    const parts = {}; let at = 0;
    S.song.forEach(sec => { const c = G.chunk(S.style, S.tuning, sec.type, sec.idx); for (let r = 0; r < sec.reps; r++) { Object.keys(G.PARTS).forEach(k => { parts[k] = parts[k] || []; c[k].forEach(n => parts[k].push(Object.assign({}, n, { s: n.s + at }))); }); at += c.beats; } });
    const files = [];
    for (const k of Object.keys(parts)) if (parts[k].length) files.push({ name: safe(`Metal Şarkı - ${OS.t(G.PARTS[k])}.mid`), data: new Uint8Array(await TR.toMidi(parts[k], bpmOf(), G.PARTS[k], k === 'drums' ? null : k === 'bass' ? 33 : k === 'synth' ? 89 : 30).arrayBuffer()) });
    U.download(makeZip(files), safe(`Metal Şarkı - ${S.style} - ${bpmOf()} BPM - MIDI`) + '.zip');
  };

  // =====================================================================
  // Metal mix şablonu
  // =====================================================================
  MC.mixTemplate = function (withSong) {
    const go = () => {
      OS.newProject(false);
      const P = OS.project, dev = OS.newDevice;
      P.tracks.filter(t => t.type !== 'fx').forEach(t => { t.inserts.forEach(d => d.dispose()); t.instrument && t.instrument.dispose(); });
      P.tracks = P.tracks.filter(t => t.type === 'fx');
      P.name = 'Metal Mix Şablonu';
      // lead / temiz gitar ağır amfi zinciri taşır: yalnız şarkıda kullanılınca oluşturulur (CPU)
      ['drums', 'gtrL', 'gtrR', 'bass', 'synth', 'fx'].forEach(k => partTrack(k));
      const vo = OS.makeTrack('audio', 'Vokal');
      vo.inserts.push(dev('fx.gate', { th: -50 }), dev('fx.eq', { hp: 100, p1f: 300, p1g: -3, p2f: 3500, p2g: 2 }), dev('fx.fetcomp', { input: 18 }), dev('fx.optocomp'));
      const rev = P.tracks.find(t => t.type === 'fx' && /reverb/i.test(t.name)), dly = P.tracks.find(t => t.type === 'fx' && /delay/i.test(t.name));
      if (rev) vo.sends[rev.id] = -12; if (dly) vo.sends[dly.id] = -16;
      P.tracks.splice(P.tracks.filter(x => x.type !== 'fx').length, 0, vo);
      const vol = { drums: -2, gtrL: -6, gtrR: -6, bass: -5, lead: -8, clean: -9, synth: -14, fx: -10 };
      P.tracks.forEach(t => { if (t.mcPart && vol[t.mcPart] != null) t.vol = vol[t.mcPart]; });
      P.master.inserts.forEach(d => d.dispose());
      P.master.inserts = [dev('fx.eq', { hp: 25 }), dev('fx.comp', { th: -14, ratio: 2 }), dev('fx.limiter')];
      P.tracks.forEach((t, i) => t.color = OS.TRACK_COLORS[i % OS.TRACK_COLORS.length]);
      E.syncAll(); OS.history.clear();
      document.dispatchEvent(new CustomEvent('os-project', { detail: { full: true } }));
      if (withSong) { if (!S.song.length) S.song = G.randomSong(S.style, S.tuning, S.form); MC.writeSong(S.song, { fromStart: true }); }
      U.toast(OS.t('Metal mix şablonu hazır'));
    };
    U.confirm ? U.confirm(OS.t('Mevcut proje kapatılıp metal mix şablonu açılsın mı? (Kaydedilmemiş değişiklikler kaybolur)')).then(ok => ok && go()) : (confirm(OS.t('Mevcut proje kapatılıp metal mix şablonu açılsın mı? (Kaydedilmemiş değişiklikler kaybolur)')) && go());
  };

  // Hızlı cihaz ekleme
  MC.addTrack = function (key) { OS.history.push(); const t = partTrack(key); E.syncAll(); ui.selectedTrack = t.id; ui.changed(); ui.emit('os-project', { full: true }); U.toast(OS.t(PART_SETUP[key][0]) + ' ' + OS.t('eklendi')); };
  MC.insertFx = function (pid, preset) {
    const t = selTrack(); if (!t) { U.toast(OS.t('Önce bir parça seçin')); return; }
    OS.history.push(); const pl = OS.plugins.get(pid), d = OS.newDevice(pid, preset && pl.presets ? pl.presets[preset] : null);
    t.inserts.splice(0, 0, d); E.syncTrack(t); ui.renderInspector && ui.renderInspector(); ui.emit('os-devices'); ui.changed();
    U.toast(OS.t(pl.name) + ' → ' + t.name);
  };

  // Üst menü
  MC.menu = () => [
    { header: 'Metal Creative' },
    { label: 'Metal Creative sekmesini aç', onclick: () => ui.showView('metal') },
    '-',
    { label: 'Rastgele metal şarkı üret ve projeye yaz', onclick: () => { S.song = G.randomSong(S.style, S.tuning, S.form); save(); MC.writeSong(S.song); } },
    { label: 'Metal mix şablonu (boş)', onclick: () => MC.mixTemplate(false) },
    { label: 'Metal mix şablonu + örnek şarkı', onclick: () => MC.mixTemplate(true) },
    '-',
    { label: 'Parça ekle: Metal Gitar DI (çift kayıt)', onclick: () => { MC.addTrack('gtrL'); MC.addTrack('gtrR'); } },
    { label: 'Parça ekle: Metal Bas (5 tel)', onclick: () => MC.addTrack('bass') },
    { label: 'Parça ekle: Metal Davul Kiti', onclick: () => MC.addTrack('drums') },
    { label: 'Parça ekle: Endüstriyel Yıkım FX', onclick: () => MC.addTrack('fx') },
    '-',
    { label: 'Seçili parçaya: DI Güçlendirici', onclick: () => MC.insertFx('fx.dienhance', 'Modern Chug') },
    { label: 'Seçili parçaya: Davul Yumruğu', onclick: () => MC.insertFx('fx.drumpunch', 'Davul Grubu (paralel)') },
    { label: 'Seçili parçaya: Metal ton (arşivden)…', onclick: () => ui.showView('metal') },
  ];

  // =====================================================================
  // Sekme arayüzü
  // =====================================================================
  MC.init = function () { root = document.getElementById('view-metal'); };
  MC.render = function () {
    if (!root) return;
    root.innerHTML = '';
    root.append(el('div', { class: 'mini-grid metal-grid' }, riffBox(), songBox(), toneBox(), toolsBox()));
  };

  function riffBox() {
    const st = G.STYLES[S.style];
    const list = G.list(S.style, S.tuning, S.type, 40);
    const rows = el('div', { class: 'mc-list' }, list.map(c => {
      const notes = c.gtr.length + c.clean.length + c.lead.length;
      return el('div', { class: 'mc-row' },
        el('button', { class: 'btn sm mc-play', title: OS.t('Dinle'), onclick: e => MC.preview([c], e.currentTarget) }, '▶'),
        el('span', { class: 'mc-name' }, c.name),
        el('span', { class: 'muted mc-meta' }, notes + ' ' + OS.t('nota')),
        el('button', { class: 'btn sm', title: OS.t('Şarkıya ekle'), onclick: () => { S.song.push({ type: S.type, idx: c.idx, reps: 1 }); save(); MC.render(); } }, '+ ' + OS.t('Şarkı')),
        el('button', { class: 'btn sm', title: OS.t('Çalma imlecine yaz'), onclick: () => MC.writeSong([{ type: S.type, idx: c.idx, reps: 1 }]) }, '⇣ ' + OS.t('Proje')));
    }));
    return box('MRH Riff Fabrikası · Breakdown · Bölüm Üreteci',
      el('div', { class: 'row wrap' },
        el('label', { class: 'field' }, 'Stil', sel(Object.keys(G.STYLES), S.style, v => { S.style = v; S.tuning = G.STYLES[v].tunings[0]; S.bpm = 0; save(); MC.render(); })),
        el('label', { class: 'field' }, 'Akort', sel(Object.keys(G.TUNINGS).map(k => [k, k + (st.tunings.includes(k) ? ' ★' : '')]), S.tuning, v => { S.tuning = v; save(); MC.render(); })),
        el('label', { class: 'field' }, 'Bölüm', sel(Object.entries(G.TYPES), S.type, v => { S.type = v; save(); MC.render(); })),
        el('label', { class: 'field' }, 'BPM', el('input', { class: 'inp', type: 'number', min: 50, max: 260, value: bpmOf(), style: 'width:60px', onchange: e => { S.bpm = U.clamp(+e.target.value || 0, 50, 260); save(); } })),
        el('button', { class: 'btn sm', onclick: MC.stop }, '■ ' + OS.t('Durdur'))),
      rows,
      el('div', { class: 'row wrap' },
        el('button', { class: 'btn sm', onclick: () => MC.exportPack(20, false) }, 'DI paketi indir (20 parça, WAV + MIDI)'),
        el('button', { class: 'btn sm', onclick: () => MC.exportPack(20, true) }, 'DI + amfili paket indir'),
        el('button', { class: 'btn sm', onclick: () => MC.exportPack(40, false) }, 'Tam paket (40)')),
      el('p', { class: 'muted' }, 'Her parça 2 ölçüdür; gitar, bas, davul, synth ve FX birlikte üretilir ve birbirine kilitlidir (kick gitarın chug’larını izler). ★ stilin önerilen akortlarıdır. Gitar ve bas notalarında vuruş gücü 100 ve altı palm mute, üstü açık tel çalar; piyano rulosunda düzenleyebilirsiniz. DI dosyaları herhangi bir amfi simülatörüne (bu uygulamanın Amfi Rack’i dahil) girilebilir.'));
  }

  function songBox() {
    const total = S.song.reduce((a, s) => a + 8 * s.reps, 0), secs = Math.round(total * 60 / bpmOf());
    const list = el('div', { class: 'mc-song' }, S.song.length ? S.song.map((sec, i) => el('div', { class: 'mc-row' },
      el('span', { class: 'mc-sec mc-' + sec.type }, OS.t(G.TYPES[sec.type])),
      el('select', { onchange: e => { sec.idx = +e.target.value; save(); } }, Array.from({ length: 40 }, (_, k) => el('option', { value: k, selected: k === sec.idx }, '#' + (k + 1)))),
      el('select', { onchange: e => { sec.reps = +e.target.value; save(); MC.render(); } }, [1, 2, 3, 4].map(n => el('option', { value: n, selected: n === sec.reps }, '× ' + n))),
      el('button', { class: 'btn sm mc-play', onclick: e => MC.preview([G.chunk(S.style, S.tuning, sec.type, sec.idx)], e.currentTarget) }, '▶'),
      el('button', { class: 'btn sm', title: '↑', onclick: () => { if (i) { S.song.splice(i - 1, 0, S.song.splice(i, 1)[0]); save(); MC.render(); } } }, '↑'),
      el('button', { class: 'btn sm', title: '↓', onclick: () => { if (i < S.song.length - 1) { S.song.splice(i + 1, 0, S.song.splice(i, 1)[0]); save(); MC.render(); } } }, '↓'),
      el('button', { class: 'btn sm', onclick: () => { S.song.splice(i, 1); save(); MC.render(); } }, '✕'))) : el('p', { class: 'muted' }, 'Henüz bölüm yok: bir yapı seçip “Rastgele şarkı” deyin ya da soldaki listeden “+ Şarkı” ile ekleyin.'));
    return box('DGN Şarkı Kurucu',
      el('div', { class: 'row wrap' },
        el('label', { class: 'field' }, 'Yapı', sel(Object.keys(G.FORMS), S.form, v => { S.form = v; save(); })),
        el('button', { class: 'btn sm', onclick: () => { S.song = G.randomSong(S.style, S.tuning, S.form); save(); MC.render(); } }, '🎲 Rastgele şarkı'),
        el('button', { class: 'btn sm', onclick: () => { S.song = []; save(); MC.render(); } }, 'Temizle')),
      list,
      el('div', { class: 'row wrap' },
        el('span', { class: 'muted' }, `${S.song.length} ${OS.t('bölüm')} · ${Math.round(total / 4)} ${OS.t('ölçü')} · ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`),
        el('button', { class: 'btn sm mc-play', onclick: e => MC.preview(S.song.flatMap(s => Array(s.reps).fill(G.chunk(S.style, S.tuning, s.type, s.idx))), e.currentTarget) }, '▶ ' + OS.t('Tümünü dinle')),
        el('button', { class: 'btn sm primary', onclick: () => MC.writeSong(S.song) }, 'Projeye yaz (çok kanallı)'),
        el('button', { class: 'btn sm', onclick: MC.exportSongMidi }, 'MIDI olarak indir (.zip)')),
      el('p', { class: 'muted' }, 'Projeye yazınca “MC ·” ile başlayan parçalar oluşturulur: çift kayıt gitar (L/R, insansı zamanlama), 5 telli bas, metal davul (Davul Yumruğu ile), lead, temiz gitar, synth ve endüstriyel FX. Tempo şarkı temposuna ayarlanır ve döngü şarkıyı kapsar. Her şey MIDI olduğu için riffleri, tonları ve davulu sonradan değiştirebilirsiniz.'));
  }

  function toneBox() {
    const names = Object.keys(TONES).filter(n => !S.toneFilter || n.toLowerCase().includes(S.toneFilter.toLowerCase()));
    const groups = {}; names.forEach(n => { const g = n.split(' › ')[0]; (groups[g] = groups[g] || []).push(n); });
    const tsel = el('select', { size: 9, class: 'mc-tones' }, Object.keys(groups).map(g => el('optgroup', { label: OS.t(g) }, groups[g].map(n => el('option', { value: n }, n.split(' › ')[1].split(' → ').map(x => OS.t(x)).join(' → '))))));
    const cur = () => tsel.value || names[0];
    return box('Mr. Mars Metal Ton Arşivi · Amfi × Kabin Tonları + Tür Paketleri',
      el('div', { class: 'row wrap' },
        el('input', { placeholder: OS.t('Ara (amfi, kabin, tür)…'), value: S.toneFilter, oninput: e => { S.toneFilter = e.target.value; save(); clearTimeout(MC._tf); MC._tf = setTimeout(() => { MC.render(); const i = root.querySelector('.mc-toneinp'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 250); }, class: 'inp mc-toneinp', style: 'flex:1' }),
        el('span', { class: 'muted' }, names.length + ' ' + OS.t('ton'))),
      tsel,
      el('div', { class: 'row wrap' },
        el('button', { class: 'btn sm primary', onclick: () => applyTone(selTrack(), cur()) }, 'Seçili parçaya uygula'),
        el('button', { class: 'btn sm', onclick: () => { OS.history.push(); const t = OS.makeTrack('audio', 'Gitar · ' + cur().split(' › ')[1]); OS.project.tracks.splice(OS.project.tracks.filter(x => x.type !== 'fx').length, 0, t); ui.selectedTrack = t.id; E.syncAll(); applyTone(t, cur()); ui.emit('os-project', { full: true }); } }, 'Yeni gitar parçası (kayıt için)'),
        el('button', { class: 'btn sm', onclick: () => { const t = OS.project.tracks.find(x => x.mcPart === 'gtrL'), r = OS.project.tracks.find(x => x.mcPart === 'gtrR'); if (!t && !r) { U.toast(OS.t('Önce şarkıyı projeye yazın')); return; } [t, r].forEach(x => x && applyTone(x, cur())); } }, 'MC gitarlarına uygula')),
      el('p', { class: 'muted' }, 'Her ton tam bir zincirdir: gürültü kapısı → DI Güçlendirici → sıkılaştırıcı overdrive → amfi → kabin → EQ. Amfi ve kabinler Mr. Mars ses modelleridir. Kendi kabin IR’ınızı (.wav) kabin cihazında “IR Kullan” ile yükleyebilirsiniz.'));
  }

  function toolsBox() {
    const synSel = el('select', null, Object.keys(SYN).map(k => el('option', { value: k }, k)));
    return box('Metal Araçları · Cihazlar · Mix Şablonu',
      el('div', { class: 'mc-tools' },
        el('div', null, el('b', null, 'DI Güçlendirici'), el('p', { class: 'muted' }, 'Amfiden önce: Gövde (palm mute ağırlığı), Derin Oktav, Tel Parlatıcı, Testere Distorsiyonu (Drive / Level / Bas / Orta / Tiz / Karışım), Metal Halka (ring mod), Sıkıştır (clip).'),
          el('button', { class: 'btn sm', onclick: () => MC.insertFx('fx.dienhance', 'Modern Chug') }, 'Seçili parçaya ekle')),
        el('div', null, el('b', null, 'Davul Yumruğu'), el('p', { class: 'muted' }, 'Vuruş (tek düğme kompresör), Kırçıl (clip), Transient (3 bant atak / kuyruk), Gümbür 100 Hz, Parıltı 8 kHz, paralel Karışım.'),
          el('button', { class: 'btn sm', onclick: () => MC.insertFx('fx.drumpunch', 'Davul Grubu (paralel)') }, 'Seçili parçaya ekle')),
        el('div', null, el('b', null, 'Enstrümanlar'), el('p', { class: 'muted' }, 'Metal Gitar DI, 5 telli Metal Bas (DI / Amfi 1 / Amfi 2 / Temiz), Metal Davul Kiti ve 90 sesli Endüstriyel Yıkım FX (Vuruş, Alt Bas, Stereo, Oda, Renk, Parçala).'),
          el('div', { class: 'row wrap' },
            el('button', { class: 'btn sm', onclick: () => { MC.addTrack('gtrL'); MC.addTrack('gtrR'); } }, '+ Gitar L/R'),
            el('button', { class: 'btn sm', onclick: () => MC.addTrack('bass') }, '+ Bas'),
            el('button', { class: 'btn sm', onclick: () => MC.addTrack('drums') }, '+ Davul'),
            el('button', { class: 'btn sm', onclick: () => MC.addTrack('fx') }, '+ Endüstriyel FX'))),
        el('div', null, el('b', null, 'MRH Metal Synth Ön Ayarları'), el('div', { class: 'row wrap' }, synSel,
          el('button', { class: 'btn sm mc-play', onclick: e => { const d = previewDevs().synth; Object.entries(Object.assign({}, OS.plugins.get('inst.minisynth').params.reduce((o, p) => (o[p.id] = p.def, o), {}), SYN[synSel.value])).forEach(([k, v]) => d.setParam(k, v)); MC.preview([{ beats: 4, synth: [{ p: 45, s: 0, l: 1.8, v: 100 }, { p: 52, s: 0, l: 1.8, v: 90 }, { p: 57, s: 2, l: 1.8, v: 100 }, { p: 60, s: 2, l: 1.8, v: 90 }] }], e.currentTarget); } }, '▶'),
          el('button', { class: 'btn sm', onclick: () => { OS.history.push(); const t = OS.makeTrack('instrument', 'Synth · ' + synSel.value, { instrument: 'inst.minisynth', values: SYN[synSel.value] }); OS.project.tracks.splice(OS.project.tracks.filter(x => x.type !== 'fx').length, 0, t); E.syncAll(); ui.changed(); ui.emit('os-project', { full: true }); } }, 'Yeni synth parçası'))),
        el('div', null, el('b', null, 'Metal Mix Şablonu'), el('p', { class: 'muted' }, 'Davul (Davul Yumruğu), çift gitar (ton zinciri), bas, lead, temiz gitar, synth, FX, vokal (kapı, EQ, FET + opto kompresör), reverb / delay dönüşleri ve master (EQ, glue kompresör, limiter).'),
          el('div', { class: 'row wrap' },
            el('button', { class: 'btn sm', onclick: () => MC.mixTemplate(false) }, 'Boş şablon'),
            el('button', { class: 'btn sm primary', onclick: () => MC.mixTemplate(true) }, 'Şablon + örnek şarkı')))));
  }
})(window.OS);
