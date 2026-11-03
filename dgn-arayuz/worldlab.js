/* Mr. Mars Music Studio · MRH DGN — Doğu · Batı · Afro sekmesi
 * 1) Mikrotonal makam / koma / Afrika dizileri akort paneli
 * 2) Poliritmik usul & Afro-groove sıralayıcı (her şeridin kendi adım sayısı ve döngü uzunluğu,
 *    swing, humanize, roll) — 4/4, 9/8, 7/8, 5/8, 10/8, 12/8, 3:2 aynı anda faz kaymadan
 * 3) Canlı drone ve atmosfer üreteci (tona kilitli)
 * 4) Tension / Build-Up makro ve DROP
 */
(function (OS) {
  const U = OS.U, el = U.el, ui = OS.ui, E = OS.engine, T = OS.transport, TU = OS.tuning;
  const W = ui.world = {};
  let root;
  W.init = function () { root = document.getElementById('view-world'); };
  const box = (title, ...kids) => el('div', { class: 'mini-box' }, el('div', { class: 'mini-title' }, title), ...kids);
  const sel = (opts, val, on, attrs) => { const s = el('select', Object.assign({ onchange: () => on(s.value) }, attrs || {}), opts.map(o => Array.isArray(o) ? el('option', { value: o[0], selected: String(o[0]) === String(val) }, o[1]) : el('option', { value: o, selected: o === val }, o))); return s; };
  const tog = (label, on, fn, title) => { const b = el('button', { class: 'btn sm' + (on ? ' on' : ''), title: title || '', onclick: () => { const v = !b.classList.contains('on'); b.classList.toggle('on', v); fn(v); } }, label); return b; };

  W.render = function () {
    root.innerHTML = '';
    root.append(el('div', { class: 'mini-grid world-grid' }, tuningBox(), grooveBox(), droneBox(), macroBox()));
  };

  // =====================================================================
  // 1) Akort / makam
  // =====================================================================
  function tuningBox() {
    const sysSel = sel(Object.keys(TU.SYSTEMS), TU.system, v => { TU.system = v; TU.scale = Object.keys(TU.SYSTEMS[v])[0]; TU.mode = 'makam'; TU.save(); W.render(); });
    const scSel = sel(Object.keys(TU.SYSTEMS[TU.system] || {}), TU.scale, v => { TU.scale = v; TU.mode = 'makam'; TU.save(); W.render(); });
    const tonicSel = sel(TU.NOTE.map((n, i) => [i, n]), TU.tonic, v => { TU.tonic = +v; TU.save(); W.render(); });
    const a4 = el('input', { class: 'inp', type: 'number', min: 415, max: 466, step: 0.5, value: TU.a4, style: 'width:64px', onchange: e => { TU.a4 = U.clamp(+e.target.value || 440, 415, 466); TU.save(); } });
    const deg = TU.degrees(), offs = TU.offsets();
    const keys = el('div', { class: 'tune-keys' });
    for (let i = 0; i < 12; i++) {
      const n = 60 + TU.tonic + i, pc = (TU.tonic + i) % 12, black = [1, 3, 6, 8, 10].includes(pc);
      const inScale = deg.some(c => Math.abs(c - i * 100) <= 60) || (TU.mode === 'scl' && TU.scl);
      const k = el('div', { class: 'tune-key' + (black ? ' blk' : '') + (inScale ? ' in' : ''), title: 'Tıklayınca seçili enstrümanda çalar' },
        el('b', null, TU.NOTE[pc]), el('span', null, (offs[i] > 0 ? '+' : '') + offs[i] + '¢'));
      k.addEventListener('mousedown', () => { E.resume(); E.liveNoteOn(n, 100); const up = () => { E.liveNoteOff(n); removeEventListener('mouseup', up); }; addEventListener('mouseup', up); });
      keys.appendChild(k);
    }
    return box('Mikrotonal Akort: Makam · Koma · Afrika Dizileri',
      el('div', { class: 'row' },
        tog('AKORT AÇIK', TU.active, v => { TU.active = v; TU.save(); }, 'Etkinken tüm enstrümanlar seçili makam / dizi ile çalar'),
        el('label', { class: 'field' }, 'Sistem', sysSel), el('label', { class: 'field' }, 'Makam / dizi', scSel),
        el('label', { class: 'field' }, 'Durak / tonik', tonicSel), el('label', { class: 'field' }, 'A4 (Hz)', a4)),
      el('div', { class: 'row' },
        tog('Makam kilidi', TU.lock, v => { TU.lock = v; TU.save(); W.render(); }, 'Makamda olmayan tuşlar en yakın perdeye kayar'),
        el('button', { class: 'btn sm', onclick: () => { const M = OS.midiTools; M.s.scaleOn = true; M.s.root = TU.tonic; M.s.scale = OS.SCALES[TU.scale] ? TU.scale : M.s.scale; M.save(); U.toast(OS.t('MIDI araçları ölçeği ayarlandı')); } }, 'MIDI araçlarına uygula'),
        el('button', { class: 'btn sm', onclick: async () => { const [f] = await U.pickFiles('.scl,text/plain'); if (!f) return; try { TU.scl = TU.parseScl(await U.readAsText(f), f.name); TU.mode = 'scl'; TU.active = true; TU.save(); W.render(); U.toast('Akort: ' + TU.scl.name); } catch (e) { U.toast(e.message); } } }, 'Akort dosyası (.scl) yükle…'),
        TU.mode === 'scl' && TU.scl ? tog('Sıralı eşleme', TU.mapSeq, v => { TU.mapSeq = v; TU.save(); }, 'Ardışık tuşlar ardışık derecelere (12 notalı olmayan dosyalar için)') : null,
        TU.mode === 'scl' ? el('button', { class: 'btn sm', onclick: () => { TU.mode = 'makam'; TU.save(); W.render(); } }, 'Makama dön') : null),
      el('div', { class: 'muted' }, OS.t('Etkin dizi') + ': ' + TU.describe() + ' — ' + deg.map(c => Math.round(c) + '¢').join(' · ')),
      keys,
      el('div', { class: 'muted' }, 'Türk makamları 53 koma (Arel-Ezgi-Uzdilek) yaklaşımıyla hesaplanır; 1 koma ≈ 22.64 cent. Tonik tuşu durak perdesidir; diğer tuşlar makamın en yakın perdesine cent sapmasıyla oturur. Klavyedeki tuşa basarak duyabilirsiniz.'));
  }

  // =====================================================================
  // 2) Poliritmik usul & Afro-groove sıralayıcı
  // =====================================================================
  const NOTE_OPTS = () => Object.keys(OS.WORLD_MAP).map(n => [n, OS.t(OS.WORLD_MAP[n])]);
  const lane = (note, steps, len, extra) => Object.assign({ id: U.uid(), note, steps, len, swing: 0, roll: false, mute: false }, extra || {});
  const pat = s => s.split('').map(c => ({ '.': 0, g: 1, x: 2, X: 3 })[c] || 0);
  // Hazır kalıplar: adım dizisi ("X" vurgu, "x" normal, "g" hayalet), döngü uzunluğu (çeyrek vuruş)
  const PRESETS = {
    'Afro House 4/4': () => [lane(36, pat('X...X...X...X...'), 4), lane(46, pat('gxXxgxXxgxXxgxXx'), 4, { swing: 18, roll: true }), lane(42, pat('..x...x.x.x...x.'), 4), lane(41, pat('x.....x...x.....'), 4), lane(64, pat('....X.......X...'), 4), lane(51, pat('x.x.xx.x.x.x'), 4)],
    'Amapiano / Log Drum': () => [lane(36, pat('X...X...X...X...'), 4), lane(54, pat('x..x..x...x..x..'), 4), lane(46, pat('gxgxgxgxgxgxgxgx'), 4, { swing: 22, roll: true }), lane(65, pat('....x.......x...'), 4)],
    'Poliritim 3:2': () => [lane(41, pat('X..'), 4), lane(42, pat('X.'), 4), lane(46, pat('xxxxxxxxxxxxxxxx'), 4, { roll: true })],
    'Poliritim 4:3 (Afro)': () => [lane(38, pat('X...'), 4), lane(45, pat('x..'), 4), lane(48, pat('gxgxgxgxgxgx'), 4, { roll: true })],
    'Afro 12/8 Çan (Standart)': () => [lane(51, pat('X.x.xx.x.x.x'), 4), lane(38, pat('X.....X.....'), 4), lane(39, pat('..x..x..x..x'), 4), lane(47, pat('xgxxgxxgxxgx'), 4, { roll: true })],
    'Son Clave 3-2': () => [lane(37, pat('X..X...X..X.X...'), 4), lane(41, pat('x.......x.......'), 4), lane(42, pat('...x..x....x..x.'), 4)],
    'Aksak 9/8 (2+2+2+3)': () => [lane(55, pat('X.......x'), 4.5), lane(56, pat('..x.x.x..'), 4.5), lane(57, pat('.g.g.g.gg'), 4.5, { roll: true })],
    'Devr-i Hindi 7/8 (3+2+2)': () => [lane(55, pat('X......'), 3.5), lane(56, pat('...x.x.'), 3.5), lane(57, pat('.g..g.g'), 3.5, { roll: true })],
    'Türk Aksağı 5/8 (2+3)': () => [lane(55, pat('X.x..'), 2.5), lane(56, pat('..x.x'), 2.5), lane(57, pat('.g.g.'), 2.5, { roll: true })],
    'Curcuna 10/8 (3+2+2+3)': () => [lane(55, pat('X....X....'), 5), lane(56, pat('...x.x.x.x'), 5), lane(57, pat('.g..g..g..'), 5, { roll: true })],
    'Sofyan 4/4': () => [lane(55, pat('X.......'), 4), lane(56, pat('....x.x.'), 4), lane(57, pat('..g...gg'), 4, { roll: true })],
    'Maksum (Arap 4/4)': () => [lane(55, pat('X.....X.'), 4), lane(56, pat('..x.x...'), 4), lane(60, pat('x.x.x.x.'), 4, { roll: true }), lane(57, pat('.g.g...g'), 4)],
    'Çiftetelli 8/8': () => [lane(55, pat('X..X..X.'), 4), lane(56, pat('...x...x'), 4), lane(57, pat('.g..g...'), 4, { roll: true })],
    'Doğu-Afro Füzyon': () => [lane(36, pat('X...X...X...X...'), 4), lane(55, pat('X.......x'), 4.5), lane(51, pat('X.x.xx.x.x.x'), 4), lane(46, pat('gxXxgxXxgxXxgxXx'), 4, { swing: 15, roll: true }), lane(58, pat('X...............'), 4)],
  };
  const G = W.groove = Object.assign({ lanes: PRESETS['Afro House 4/4'](), swing: 12, hTime: 6, hVel: 12, on: false, free: true, trackId: null, roll: 1, gain: 1 },
    (() => { try { const s = JSON.parse(localStorage.getItem('os.groove') || 'null'); return s || {}; } catch (e) { return {}; } })(), { on: false });
  const saveG = () => { const o = Object.assign({}, G); delete o.on; delete o.t0; delete o.last; try { localStorage.setItem('os.groove', JSON.stringify(o)); } catch (e) { } };

  // Groove'un çaldığı parça (dünya perküsyonu) — mikser, efekt ve kayıt için normal bir parça
  W.grooveTrack = function (create) {
    let t = OS.project.tracks.find(x => x.id === G.trackId);
    if (!t) t = OS.project.tracks.find(x => x.instrument && x.instrument.pluginId === 'inst.worldperc');
    if (!t && create) {
      OS.history.push();
      t = OS.makeTrack('instrument', 'Groove · Dünya Perküsyonu', { instrument: 'inst.worldperc' });
      OS.project.tracks.splice(OS.project.tracks.filter(x => x.type !== 'fx').length, 0, t);
      E.syncAll(); ui.changed();
    }
    if (t) G.trackId = t.id;
    return t;
  };
  // Bir şeridin [a, b) vuruş aralığındaki vuruşları: { beat, vel }
  function laneHits(l, a, b, rollMul) {
    const N = l.steps.length; if (!N || l.mute) return [];
    const st = l.len / N, out = [];
    for (let k = Math.ceil(a / st - 1e-9); k * st < b; k++) {
      const lv = l.steps[((k % N) + N) % N]; if (!lv) continue;
      let beat = k * st;
      const sw = (l.swing || G.swing) / 100;
      if (k % 2 === 1 && sw) beat += st * sw * 0.66; // tek adımlar geciktirilir (Afro swing)
      const vel = [0, 45, 95, 125][lv];
      const rm = l.roll ? rollMul : 1;
      for (let r = 0; r < rm; r++) out.push({ beat: beat + r * st / rm, vel: Math.max(20, vel - r * 6) });
    }
    return out;
  }
  // Zamanlayıcı: aktarım çalıyorsa ona kilitli, değilse proje temposunda serbest
  let gTimer = null;
  function gTick() {
    if (!G.on) return;
    const t = W.grooveTrack(false); if (!t || !t.instrument) return;
    const ctx = E.ctx, spb = 60 / T.bpm, now = ctx.currentTime, look = 0.12;
    let bNow;
    if (T.playing) bNow = T.position();
    else { if (G.t0 == null) G.t0 = now + 0.05; bNow = (now - G.t0) / spb; }
    const a = G.last == null ? bNow : G.last, b = bNow + look / spb;
    if (b <= a) return;
    const rollMul = [1, 2, 3, 4][Math.min(3, Math.floor(MAC.v * 4 - 1e-9))] || 1;
    G.lanes.forEach(l => laneHits(l, a, b, rollMul).forEach(h => {
      const jit = (Math.random() * 2 - 1) * G.hTime / 1000, vel = U.clamp(Math.round(h.vel * (1 + (Math.random() * 2 - 1) * G.hVel / 100) * (1 + MAC.v * 0.15)), 1, 127);
      const when = Math.max(now, now + (h.beat - bNow) * spb + jit);
      t.instrument.noteOn(l.note, vel, when);
      if (T.recording && t.arm) T.recNotes.push({ track: t, p: l.note, v: vel, start: h.beat, end: h.beat + 0.1 });
    }));
    G.last = b;
  }
  W.grooveStart = function () {
    W.grooveTrack(true); E.resume();
    G.on = true; G.t0 = null; G.last = null;
    clearInterval(gTimer); gTimer = setInterval(gTick, 25);
    document.addEventListener('os-transport', resync);
  };
  W.grooveStop = function () { G.on = false; clearInterval(gTimer); document.removeEventListener('os-transport', resync); };
  const resync = () => { G.last = null; G.t0 = null; };

  // Kalıbı aranjmana MIDI klip olarak yaz (swing ve humanize işlenmiş)
  function writeToArrangement(bars) {
    const t = W.grooveTrack(true), bpb = OS.project.sig[0], len = bars * bpb, at = Math.floor(T.position() / bpb) * bpb;
    const notes = [];
    G.lanes.forEach(l => laneHits(l, 0, len, 1).forEach(h => notes.push({ p: l.note, s: Math.max(0, h.beat + (Math.random() * 2 - 1) * G.hTime / 1000 / (60 / T.bpm)), l: 0.1, v: U.clamp(Math.round(h.vel * (1 + (Math.random() * 2 - 1) * G.hVel / 100)), 1, 127) })));
    OS.history.push();
    t.clips.push({ id: U.uid(), start: at, length: len, name: 'Groove', notes });
    ui.changed(); U.toast(OS.t('Groove aranjmana yazıldı') + ' (' + bars + ' ' + OS.t('ölçü') + ')');
  }

  function grooveBox() {
    const b = el('div', { class: 'mini-box groove-box' });
    const draw = () => {
      b.innerHTML = '';
      b.append(el('div', { class: 'mini-title' }, 'Poliritmik Usul & Afro-Groove Sıralayıcı'),
        el('div', { class: 'row' },
          el('button', { class: 'btn ' + (G.on ? 'on' : 'primary'), onclick: () => { G.on ? W.grooveStop() : W.grooveStart(); draw(); } }, G.on ? '■ ' + OS.t('Durdur') : '▶ ' + OS.t('Çal')),
          el('label', { class: 'field' }, 'Kalıp', sel([['', OS.t('Hazır kalıp seç…')]].concat(Object.keys(PRESETS).map(k => [k, k])), '', v => { if (!v) return; G.lanes = PRESETS[v](); G.last = null; saveG(); draw(); })),
          U.knob({ label: 'Swing', size: 32, min: 0, max: 60, def: 12, value: G.swing, fmt: v => Math.round(v) + '%', onchange: v => { G.swing = v; saveG(); } }),
          U.knob({ label: 'İnsansı (ms)', size: 32, min: 0, max: 25, def: 6, value: G.hTime, fmt: v => Math.round(v) + 'ms', onchange: v => { G.hTime = v; saveG(); } }),
          U.knob({ label: 'İnsansı (vel)', size: 32, min: 0, max: 40, def: 12, value: G.hVel, fmt: v => Math.round(v) + '%', onchange: v => { G.hVel = v; saveG(); } }),
          el('button', { class: 'btn sm', onclick: () => { G.lanes.push(lane(46, pat('x.x.x.x.x.x.x.x.'), 4)); saveG(); draw(); } }, '+ Şerit'),
          el('select', { onchange: e => { if (+e.target.value) writeToArrangement(+e.target.value); e.target.value = ''; } }, el('option', { value: '' }, OS.t('Aranjmana yaz…')), [1, 2, 4, 8, 16].map(n => el('option', { value: n }, n + ' ' + OS.t('ölçü'))))));
      G.lanes.forEach((l, li) => {
        const N = l.steps.length;
        const steps = el('div', { class: 'g-steps', style: { gridTemplateColumns: `repeat(${N}, 1fr)` } });
        l.steps.forEach((v, si) => {
          const s = el('div', { class: 'g-step lv' + v + (si % (N % 3 === 0 && N !== 12 && N !== 6 ? 3 : N === 12 ? 3 : 4) === 0 ? ' beat' : ''), title: OS.t('Tık: aç / vurgu / hayalet • Sağ tık: kapat') });
          s.addEventListener('mousedown', e => { e.preventDefault(); l.steps[si] = e.button === 2 ? 0 : [2, 2, 3, 1][v]; if (e.button !== 2 && v === 1) l.steps[si] = 0; saveG(); draw(); });
          s.addEventListener('contextmenu', e => e.preventDefault());
          steps.appendChild(s);
        });
        b.appendChild(el('div', { class: 'g-lane' + (l.mute ? ' muted' : '') },
          el('div', { class: 'g-head' },
            sel(NOTE_OPTS(), l.note, v => { l.note = +v; saveG(); }, { class: 'g-inst' }),
            el('label', { class: 'field', title: OS.t('Adım sayısı') }, '#', el('input', { class: 'inp', type: 'number', min: 1, max: 32, value: N, style: 'width:46px', onchange: e => { const n = U.clamp(+e.target.value || N, 1, 32); l.steps = Array.from({ length: n }, (_, i) => l.steps[i] || 0); saveG(); draw(); } })),
            el('label', { class: 'field', title: OS.t('Döngü uzunluğu (çeyrek vuruş): 4 = 4/4 ölçü, 4.5 = 9/8, 3.5 = 7/8, 2.5 = 5/8') }, '⟲', el('input', { class: 'inp', type: 'number', min: 0.5, max: 16, step: 0.5, value: l.len, style: 'width:52px', onchange: e => { l.len = U.clamp(+e.target.value || 4, 0.5, 16); saveG(); } })),
            el('button', { class: 'mini' + (l.roll ? ' on' : ''), title: OS.t('Build-Up makrosunda roll yapar'), onclick: () => { l.roll = !l.roll; saveG(); draw(); } }, 'R'),
            el('button', { class: 'mini m' + (l.mute ? ' on' : ''), onclick: () => { l.mute = !l.mute; saveG(); draw(); } }, 'M'),
            el('button', { class: 'mini', onclick: () => { G.lanes.splice(li, 1); saveG(); draw(); } }, '✕')),
          steps));
      });
      b.appendChild(el('div', { class: 'muted' }, 'Her şeridin kendi adım sayısı ve döngü uzunluğu vardır; böylece 4/4 kick, 9/8 aksak usul ve 3:2 çapraz ritim aynı vuruş ızgarasında faz kaymadan birlikte çalar. Aktarım (▶) çalıyorsa ona kilitlenir, durmuşsa proje temposunda serbest çalar. Sesler “Groove · Dünya Perküsyonu” parçasından çıkar; mikserde işlenebilir, kayda alınabilir.'));
    };
    draw();
    return b;
  }

  // =====================================================================
  // 3) Drone ve atmosfer
  // =====================================================================
  const DR = W.drone = { on: false, type: 'ney', src: 'manual', tonic: 9, oct: 3, level: 0.5, bright: 0.5, move: 0.3 };
  const DTYPES = [['ney', 'Ney Dem Sesi'], ['tambur', 'Tambur / Tanpura Demi'], ['pad', 'Analog Pad'], ['forest', 'Afro Orman'], ['wind', 'Rüzgâr'], ['rain', 'Yağmur'], ['chant', 'Tribal Koro']];
  function droneTonic() {
    if (DR.src === 'makam') return TU.tonic;
    if (DR.src.startsWith('deck')) { const d = ui.dj && ui.dj.decks[+DR.src.slice(4)]; const k = d && (d.shownKey || d.key); if (k && k !== '…') { const i = TU.NOTE.indexOf(k.replace('m', '')); if (i >= 0) return i; } }
    return DR.tonic;
  }
  function droneStart() {
    droneStop();
    E.resume();
    const ctx = E.ctx, out = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
    out.gain.value = 0; out.gain.setTargetAtTime(DR.level, ctx.currentTime, 1.2);
    lp.connect(out); out.connect(E.monitorBus);
    DR.out = out; DR.lp = lp; DR.parts = []; DR.timers = [];
    const root = 12 * (DR.oct + 1) + droneTonic();
    lp.frequency.value = 400 + DR.bright * 9000;
    const libModel = { ney: 'Ney', tambur: 'Tanbur', pad: 'Analog Poli Pad', chant: 'Koro (Aah)' }[DR.type];
    if (libModel) {
      const dev = new OS.Device(ctx, 'inst.library', { values: { model: OS.LIBRARY.findIndex(m => m.name === libModel), room: 0.5, expr: 0.6 + DR.move } });
      dev.out.connect(lp); DR.parts.push(dev);
      if (DR.type === 'tambur') {
        // tanpura deseni: 5li - oktav - oktav - kök
        const seq = [root + 7, root + 12, root + 12, root]; let i = 0;
        const tick = () => { const n = seq[i++ % 4]; dev.noteOn(n, 70 + Math.random() * 20); setTimeout(() => dev.noteOff(n), 1400); };
        tick(); DR.timers.push(setInterval(tick, 60000 / OS.transport.bpm * 2));
      } else { [root, root + 7, root + 12].forEach((n, k) => dev.noteOn(n, k ? 70 : 90)); DR.held = [root, root + 7, root + 12]; }
      DR.dev = dev;
    } else {
      // doğa atmosferleri: filtrelenmiş gürültü + rastgele olaylar
      const nb = ctx.createBuffer(2, ctx.sampleRate * 4, ctx.sampleRate);
      for (let c = 0; c < 2; c++) { const d = nb.getChannelData(c); let b = 0; for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; b = DR.type === 'rain' ? w : 0.98 * b + 0.02 * w * 6; d[i] = b; } }
      const src = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      src.buffer = nb; src.loop = true; bp.type = DR.type === 'rain' ? 'highpass' : 'bandpass'; bp.frequency.value = DR.type === 'rain' ? 2500 : DR.type === 'wind' ? 500 : 900; bp.Q.value = 0.8;
      lfo.frequency.value = 0.07 + DR.move * 0.2; lg.gain.value = DR.type === 'wind' ? 350 : 200; lfo.connect(lg); lg.connect(bp.frequency);
      src.connect(bp); bp.connect(lp); src.start(); lfo.start();
      DR.parts.push({ dispose: () => { try { src.stop(); lfo.stop(); } catch (e) { } } });
      if (DR.type === 'forest' || DR.type === 'rain') {
        const ev = () => {
          const t = ctx.currentTime;
          if (DR.type === 'forest') { // kuş cıvıltısı
            const o = ctx.createOscillator(), g = ctx.createGain(), f = 2200 + Math.random() * 2500;
            o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * (0.7 + Math.random() * 0.8), t + 0.12);
            g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.12, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
            const pan = ctx.createStereoPanner(); pan.pan.value = Math.random() * 2 - 1; o.connect(g); g.connect(pan); pan.connect(lp); o.start(t); o.stop(t + 0.2);
          } else { // damla
            const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(1500 + Math.random() * 2500, t); o.frequency.exponentialRampToValueAtTime(400, t + 0.03);
            g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05); o.connect(g); g.connect(lp); o.start(t); o.stop(t + 0.06);
          }
        };
        DR.timers.push(setInterval(() => { if (Math.random() < (DR.type === 'forest' ? 0.12 + DR.move * 0.3 : 0.6)) ev(); }, DR.type === 'forest' ? 220 : 40));
      }
    }
    DR.on = true;
  }
  function droneStop() {
    if (!DR.out) { DR.on = false; return; }
    const out = DR.out, parts = DR.parts, timers = DR.timers, t = E.ctx.currentTime;
    timers.forEach(clearInterval);
    out.gain.setTargetAtTime(0, t, 0.6);
    setTimeout(() => { if (DR.held && DR.dev) DR.held.forEach(n => DR.dev.noteOff(n)); parts.forEach(p => p.dispose && p.dispose()); try { out.disconnect(); } catch (e) { } }, 2500);
    DR.out = null; DR.on = false; DR.held = null;
  }
  W.droneStart = droneStart; W.droneStop = droneStop;
  function droneBox() {
    const srcOpts = [['manual', 'Elle seç'], ['makam', 'Makam toniği'], ['deck0', 'DJ Deck A tonu'], ['deck1', 'DJ Deck B tonu'], ['deck2', 'DJ Deck C tonu'], ['deck3', 'DJ Deck D tonu']];
    const restart = () => { if (DR.on) droneStart(); };
    return box('Canlı Drone & Atmosfer',
      el('div', { class: 'row' },
        el('button', { class: 'btn ' + (DR.on ? 'on' : 'primary'), onclick: e => { DR.on ? droneStop() : droneStart(); e.target.classList.toggle('on', DR.on); e.target.textContent = DR.on ? '■ ' + OS.t('Durdur') : '▶ ' + OS.t('Başlat'); } }, DR.on ? '■ ' + OS.t('Durdur') : '▶ ' + OS.t('Başlat')),
        el('label', { class: 'field' }, 'Tür', sel(DTYPES, DR.type, v => { DR.type = v; restart(); })),
        el('label', { class: 'field' }, 'Ton kaynağı', sel(srcOpts, DR.src, v => { DR.src = v; restart(); })),
        el('label', { class: 'field' }, 'Ton', sel(TU.NOTE.map((n, i) => [i, n]), DR.tonic, v => { DR.tonic = +v; restart(); })),
        el('label', { class: 'field' }, 'Oktav', sel([[2, '2'], [3, '3'], [4, '4']], DR.oct, v => { DR.oct = +v; restart(); }))),
      el('div', { class: 'row' },
        U.knob({ label: 'Seviye', size: 34, min: 0, max: 1, def: 0.5, value: DR.level, fmt: v => Math.round(v * 100) + '%', onchange: v => { DR.level = v; if (DR.out) DR.out.gain.setTargetAtTime(v * (1 + MAC.v * 0.6), E.ctx.currentTime, 0.1); } }),
        U.knob({ label: 'Parlaklık', size: 34, min: 0, max: 1, def: 0.5, value: DR.bright, fmt: v => Math.round(v * 100) + '%', onchange: v => { DR.bright = v; if (DR.lp) DR.lp.frequency.setTargetAtTime(400 + v * 9000, E.ctx.currentTime, 0.1); } }),
        U.knob({ label: 'Hareket', size: 34, min: 0, max: 1, def: 0.3, value: DR.move, fmt: v => Math.round(v * 100) + '%', onchange: v => { DR.move = v; } })),
      el('div', { class: 'muted' }, 'Uzun geçişler için kesintisiz dem sesi veya doğa atmosferi. “Ton kaynağı” DJ deck’i seçilirse parçanın algılanan tonuna kilitlenir; akort motoru açıksa dem sesi makam perdesiyle çalar.'));
  }

  // =====================================================================
  // 4) Tension / Build-Up makro + DROP
  // =====================================================================
  const MAC = W.macro = { v: 0, riser: null, saved: null };
  function applyMacro(v) {
    MAC.v = v;
    const ctx = E.ctx, t = ctx.currentTime, DJ = ui.dj;
    // riser gürültüsü
    if (v > 0.01 && !MAC.riser) {
      const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const s = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = nb; s.loop = true; bp.type = 'bandpass'; bp.Q.value = 2; g.gain.value = 0;
      s.connect(bp); bp.connect(g); g.connect(E.monitorBus); s.start(); MAC.riser = { s, bp, g };
    }
    if (MAC.riser) { MAC.riser.bp.frequency.setTargetAtTime(300 + v * v * 9000, t, 0.05); MAC.riser.g.gain.setTargetAtTime(v * 0.18, t, 0.05); }
    // DJ deckleri: yükselen HPF + rezonans
    if (DJ && DJ.decks && DJ.decks.length) {
      if (!MAC.saved) MAC.saved = DJ.decks.map(d => d.filterVal || 0);
      DJ.decks.forEach((d, i) => { if (d.playing) d.setFilter(Math.max(MAC.saved[i], v * 0.72)); });
    }
    if (DR.out) DR.out.gain.setTargetAtTime(DR.level * (1 + v * 0.6), t, 0.1);
    if (MAC.ind) MAC.ind.textContent = Math.round(v * 100) + '%';
  }
  function drop() {
    const DJ = ui.dj, ctx = E.ctx;
    // en yakın ölçü başına hizala (çalan deck ya da aktarım)
    let wait = 0;
    const d = DJ && DJ.decks && DJ.decks.find(x => x.playing && x.bpm);
    if (d) { const ph = (((d.position() - d.grid) / d.beat) % 4 + 4) % 4; wait = (4 - ph) % 4 * d.beat / d.eff; if (wait < 0.05) wait = 0; }
    else if (T.playing) { const b = T.position(), bpb = OS.project.sig[0]; wait = (Math.ceil(b / bpb) * bpb - b) * 60 / T.bpm; }
    setTimeout(() => {
      if (MAC.riser) { MAC.riser.g.gain.setValueAtTime(0, ctx.currentTime); try { MAC.riser.s.stop(ctx.currentTime + 0.05); } catch (e) { } MAC.riser = null; }
      if (MAC.saved && DJ) DJ.decks.forEach((x, i) => x.setFilter(MAC.saved[i] || 0));
      MAC.saved = null; MAC.v = 0;
      if (MAC.knob) MAC.knob.setValue(0); if (MAC.ind) MAC.ind.textContent = '0%';
      // darbe: derin boom + çarpma
      const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(35, t + 0.5);
      g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2); o.connect(g); g.connect(E.monitorBus); o.start(t); o.stop(t + 1.3);
      if (DR.out) DR.out.gain.setTargetAtTime(DR.level, t, 0.05);
      if (DJ && DJ.renderInfo) DJ.renderInfo();
    }, wait * 1000);
    U.toast(OS.t('DROP') + (wait > 0.05 ? ' — ' + OS.t('ölçü başında') : ''));
  }
  W.drop = drop; W.applyMacro = applyMacro;
  function macroBox() {
    MAC.ind = el('b', { class: 'macro-val' }, Math.round(MAC.v * 100) + '%');
    MAC.knob = U.knob({ label: 'TENSION', size: 96, min: 0, max: 1, def: 0, value: MAC.v, fmt: v => Math.round(v * 100) + '%', onchange: applyMacro });
    // MIDI controller'a öğretilebilir (sağ tık)
    const ML = OS.midiLearn;
    ML.extra.set('world-macro', { id: 'world-macro', def: { params: [{ id: 'v', name: 'Tension', min: 0, max: 1 }] }, values: { get v() { return MAC.v; } }, setParam: (id, v) => { applyMacro(v); MAC.knob.setValue(v); } });
    ML.extra.set('world-drop', { id: 'world-drop', def: { params: [{ id: 'v', name: 'DROP', type: 'bool', min: 0, max: 1 }] }, values: { v: 0 }, setParam: () => drop() });
    const learnMenu = (id, name) => e => { e.preventDefault(); U.menu(e.clientX, e.clientY, [{ header: name }, { label: 'MIDI öğren (sonra controller’da düğmeyi çevirin)', onclick: () => { ML.pending = { dev: id, p: 'v' }; U.toast(OS.t('Controller’da bir düğme / fader hareket ettirin')); } }]); };
    MAC.knob.addEventListener('contextmenu', learnMenu('world-macro', 'Tension'));
    setTimeout(() => { const b = MAC.knob.closest('.mini-box') && MAC.knob.closest('.mini-box').querySelector('.drop-btn'); if (b) b.addEventListener('contextmenu', learnMenu('world-drop', 'DROP')); }, 0);
    return box('Tension / Build-Up Makro',
      el('div', { class: 'row macro-row' }, MAC.knob,
        el('div', { style: 'display:flex;flex-direction:column;gap:8px' }, MAC.ind,
          el('button', { class: 'btn drop-btn', onclick: drop }, 'DROP'))),
      el('div', { class: 'muted' }, 'Tek düğmeyle: groove’daki “R” şeritleri giderek 2-3-4 kat roll yapar ve sertleşir, çalan DJ decklerinin filtresi açılır, riser gürültüsü ve drone yükselir. DROP her şeyi bir sonraki ölçü başında sıfırlar ve darbe sesi verir. Sağ tıkla bir MIDI düğmesine öğretebilirsiniz.'));
  }
})(window.OS);
