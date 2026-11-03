/* Mr. Mars Music Studio · MRH DGN — MIDI araçları: transpoze, ölçeğe oturtma, akor, arpej (latch)
 * Klavye / MIDI controller / ekran piyanosu / XY ped notaları E.liveNoteOn üzerinden buraya gelir.
 * Sıra: transpoze → ölçek → akor → arpej → enstrüman.
 */
(function (OS) {
  const U = OS.U, E = OS.engine;
  const CHORDS = {
    'Kapalı': [0], 'Majör': [0, 4, 7], 'Minör': [0, 3, 7], '7': [0, 4, 7, 10], 'maj7': [0, 4, 7, 11], 'm7': [0, 3, 7, 10],
    'sus2': [0, 2, 7], 'sus4': [0, 5, 7], 'Power (5)': [0, 7, 12], 'Oktav': [0, 12], 'add9': [0, 4, 7, 14], 'Diyatonik': 'dia',
  };
  const RATES = { '1/4': 1, '1/8': 0.5, '1/8T': 1 / 3, '1/16': 0.25, '1/16T': 1 / 6, '1/32': 0.125 };
  const MODES = ['Yukarı', 'Aşağı', 'Yukarı-Aşağı', 'Aşağı-Yukarı', 'Çalış sırası', 'Rastgele', 'Akor (tekrar)'];

  const M = OS.midiTools = {
    CHORDS, RATES, MODES,
    s: Object.assign({ transpose: 0, scaleOn: false, root: 0, scale: 'Majör', chord: 'Kapalı', arp: false, mode: 0, rate: '1/16', oct: 1, gate: 0.6, swing: 0, latch: false, velMode: 'Çalınan', vel: 100 },
      (() => { try { return JSON.parse(localStorage.getItem('os.miditools') || '{}'); } catch (e) { return {}; } })()),
    save() { try { localStorage.setItem('os.miditools', JSON.stringify(M.s)); } catch (e) { } },
    held: [],        // basılı tutulan girişler (arpej için)
    map: new Map(),  // giriş notası -> üretilen notalar (akor modunda)
  };

  const active = () => M.s.transpose || M.s.scaleOn || M.s.chord !== 'Kapalı' || M.s.arp;

  function quantize(n) {
    if (!M.s.scaleOn) return n;
    const sc = OS.SCALES[M.s.scale] || OS.SCALES['Majör'];
    const inS = p => sc.includes(((p - M.s.root) % 12 + 12) % 12);
    if (inS(n)) return n;
    for (let d = 1; d < 12; d++) { if (inS(n - d)) return n - d; if (inS(n + d)) return n + d; }
    return n;
  }
  function chordOf(n) {
    const c = CHORDS[M.s.chord];
    if (Array.isArray(c)) return c.map(i => n + i);
    const sc = (OS.SCALES[M.s.scale] || []).length >= 7 ? OS.SCALES[M.s.scale] : OS.SCALES['Majör'];
    const rel = ((n - M.s.root) % 12 + 12) % 12, deg = sc.indexOf(rel);
    if (deg < 0) return [n];
    return [0, 2, 4].map(i => { const d = deg + i; return n - rel + sc[d % sc.length] + 12 * Math.floor(d / sc.length); });
  }
  const velOf = v => M.s.velMode === 'Sabit' ? M.s.vel : M.s.velMode === 'Yumuşak' ? Math.round(40 + v * 0.5) : M.s.velMode === 'Sert' ? Math.min(127, Math.round(v * 1.3)) : v;
  M.process = n => chordOf(quantize(n + M.s.transpose)).filter(x => x >= 0 && x <= 127);

  // ---------------- Giriş ----------------
  M.noteOn = function (n, v) {
    if (!active()) return false;
    const notes = M.process(n), vv = velOf(v);
    if (M.s.arp) {
      if (M.s.latch && !M.held.some(h => h.down)) M.held = []; // yeni akor: önceki kilidi bırak
      M.held.push({ src: n, notes, v: vv, down: true, order: M.seq++ });
      startArp();
    } else {
      M.map.set(n, notes);
      notes.forEach(x => E.playNoteOn(x, vv));
    }
    return true;
  };
  M.seq = 0;
  M.noteOff = function (n) {
    if (M.s.arp) {
      const h = M.held.find(x => x.src === n && x.down); if (!h) return active();
      if (M.s.latch) h.down = false; else M.held.splice(M.held.indexOf(h), 1);
      if (!M.held.length) stopArp();
      return true;
    }
    const notes = M.map.get(n);
    if (!notes) return false;
    M.map.delete(n); notes.forEach(x => E.playNoteOff(x));
    return true;
  };
  M.panic = function () { M.held = []; stopArp(); M.map.forEach(ns => ns.forEach(x => E.playNoteOff(x))); M.map.clear(); };

  // ---------------- Arpej saati ----------------
  let timer = null, nextT = 0, step = 0;
  function pattern() {
    let base = [];
    const src = M.held.slice();
    if (MODES[M.s.mode] === 'Çalış sırası') src.sort((a, b) => a.order - b.order).forEach(h => h.notes.forEach(x => base.includes(x) || base.push(x)));
    else { src.forEach(h => h.notes.forEach(x => base.includes(x) || base.push(x))); base.sort((a, b) => a - b); }
    const v = src.length ? src[src.length - 1].v : 100;
    let seq = [];
    for (let o = 0; o < M.s.oct; o++) base.forEach(x => seq.push(x + 12 * o));
    const md = MODES[M.s.mode];
    if (md === 'Aşağı') seq.reverse();
    else if (md === 'Yukarı-Aşağı') seq = seq.concat(seq.slice(1, -1).reverse());
    else if (md === 'Aşağı-Yukarı') { seq.reverse(); seq = seq.concat(seq.slice(1, -1).reverse()); }
    return { seq: seq.filter(x => x <= 127), v, chord: md === 'Akor (tekrar)', rand: md === 'Rastgele' };
  }
  function startArp() {
    if (timer) return;
    E.init(); E.resume();
    const T = OS.transport;
    const stepBeats = RATES[M.s.rate] || 0.25, spb = 60 / T.bpm;
    // aktarım çalıyorsa vuruşa hizala
    if (T.playing) { const b = T.position(), nb = Math.ceil(b / stepBeats) * stepBeats; nextT = E.ctx.currentTime + (nb - b) * spb; step = Math.round(nb / stepBeats); }
    else { nextT = E.ctx.currentTime + 0.01; step = 0; }
    const tick = () => {
      if (!M.held.length) { stopArp(); return; }
      const T2 = OS.transport, sb = RATES[M.s.rate] || 0.25, d = sb * 60 / T2.bpm;
      while (nextT < E.ctx.currentTime + 0.1) {
        const { seq, v, chord, rand } = pattern();
        if (seq.length) {
          const sw = step % 2 === 1 ? M.s.swing / 100 * d * 0.5 : 0;
          const t = nextT + sw, len = Math.max(0.01, d * M.s.gate);
          const play = chord ? seq : [rand ? seq[Math.floor(Math.random() * seq.length)] : seq[step % seq.length]];
          play.forEach(x => { E.playNoteOn(x, v, t); E.playNoteOff(x, t + len); });
        }
        step++; nextT += d;
      }
    };
    tick();
    timer = setInterval(tick, 20);
  }
  function stopArp() { clearInterval(timer); timer = null; }
  M.restartArp = () => { if (timer) { stopArp(); startArp(); } };
})(window.OS);
