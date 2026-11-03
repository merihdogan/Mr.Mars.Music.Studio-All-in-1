/* Mr. Mars Music Studio · MRH DGN — Metal Creative riff / bölüm / şarkı üreteci
 * Kayıtlı örnek yerine kurallı (algoritmik) üretim: her stil + akort + bölüm tipi için tohumlu,
 * tekrarlanabilir "riff parçaları" (2 ölçü). Her parça gitar, bas, davul, synth, FX, lead ve temiz
 * gitar notalarını birlikte içerir; parçalar birleştirilerek şarkı kurulur.
 * Not kuralı: gitar / bas notalarında vuruş gücü ≤ 100 = palm mute, > 100 = açık tel.
 */
(function (OS) {
  const U = OS.U;
  const G = OS.metalGen = {};

  G.TUNINGS = {
    'Drop E (8 tel)': 28, 'Drop F': 29, 'Drop G': 31, 'Drop G# (7 tel)': 32, 'Drop A (7 tel)': 33,
    'Drop B': 35, 'Drop C': 36, 'Drop D': 38, 'Standart E': 40,
  };
  G.TYPES = {
    riff: 'Ana Riff', verse: 'Verse', chorus: 'Nakarat', breakdown: 'Breakdown', lead: 'Lead / Solo',
    clean: 'Temiz Bölüm', transition: 'Geçiş', intro: 'Giriş',
  };
  // Stil tanımları: tempo, önerilen akortlar, dizi, ritim hücreleri, davul karakteri
  const PHRY = [0, 1, 3, 5, 7, 8, 10], HMIN = [0, 2, 3, 5, 7, 8, 11], LOCR = [0, 1, 3, 5, 6, 8, 10], AEOL = [0, 2, 3, 5, 7, 8, 10];
  G.STYLES = {
    'Modern Metal': { bpm: 170, tunings: ['Drop A (7 tel)', 'Drop G'], scale: PHRY, cells: ['xxxx', 'x.xx', 'xx.x', 'x...', 'x.x.', 'xxx.', '.xxx', 'x..x'], drum: 'groove', dis: 0.15 },
    'Metalcore': { bpm: 160, tunings: ['Drop C', 'Drop G', 'Drop F'], scale: AEOL, cells: ['x.xx', 'xx.x', 'x...', 'x.x.', 'xxxx', 'x..x'], drum: 'groove', dis: 0.1, gallop: true },
    'Deathcore': { bpm: 140, tunings: ['Drop G# (7 tel)', 'Drop E (8 tel)', 'Drop G'], scale: LOCR, cells: ['xxxx', 'x.xx', 'x...', '....', 'x..x', 'xx..'], drum: 'blast', dis: 0.4 },
    'Slam': { bpm: 80, tunings: ['Drop E (8 tel)', 'Drop F'], scale: LOCR, cells: ['xxxx', 'xx..', 'x...', 'x.x.', '....'], drum: 'slam', dis: 0.35, half: true },
    'Nu Metal': { bpm: 100, tunings: ['Drop B', 'Drop C', 'Drop A (7 tel)'], scale: PHRY, cells: ['x..x', '.x..', 'x.x.', 'x...', '..x.', 'xx.x'], drum: 'bounce', dis: 0.2, octave: true },
    'Djent': { bpm: 130, tunings: ['Drop A (7 tel)', 'Drop F', 'Drop E (8 tel)'], scale: PHRY, poly: [3, 5, 7, 5, 3], drum: 'djent', dis: 0.2 },
    'Thrash': { bpm: 200, tunings: ['Standart E', 'Drop D'], scale: PHRY, cells: ['x.xx', 'xxxx', 'x.xx', 'xx.x'], drum: 'thrash', dis: 0.1, gallop: true },
    'Breakdowns': { bpm: 135, tunings: ['Drop E (8 tel)', 'Drop G# (7 tel)', 'Drop A (7 tel)', 'Drop C', 'Drop G'], scale: LOCR, cells: ['x...', 'x..x', '..x.', 'x.x.', '....', 'xx..'], drum: 'breakdown', dis: 0.45, half: true },
  };
  const DR = { kick: 36, kick2: 35, snare: 38, rim: 40, hat: 42, hatO: 46, ped: 44, crash: 49, crash2: 57, ride: 51, bell: 53, china: 52, stack: 54, splash: 55, toms: [50, 48, 47, 45, 43, 41] };
  G.DR = DR;
  const IND = OS.metal ? OS.metal.IND_BASE : 24;
  const rndF = seed => { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
  const hash = str => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const pick = (r, a) => a[Math.floor(r() * a.length)];

  // 2 ölçülük 16'lık ızgara üzerinde gitar olayları
  function rhythm(st, type, r) {
    const steps = 32, ev = new Array(steps).fill(null);
    if (st.poly && (type === 'riff' || type === 'verse' || type === 'breakdown')) {
      // djent: 4/4 üzerinde tek sayılı (3-5-7) motifler; ölçü çizgisinden bağımsız döner
      const g = pick(r, st.poly), motif = Array.from({ length: g }, (_, i) => i === 0 ? 'x' : r() < 0.45 ? 'x' : '.');
      for (let i = 0; i < steps; i++) ev[i] = motif[i % g] === 'x' ? 'c' : null;
      return ev;
    }
    const cells = st.cells || ['x...'];
    for (let b = 0; b < 8; b++) {
      let c = pick(r, cells);
      if (st.gallop && r() < 0.35) c = 'x.xx';
      if (b === 0 && c[0] !== 'x') c = 'x' + c.slice(1);
      for (let k = 0; k < 4; k++) ev[b * 4 + k] = c[k] === 'x' ? 'c' : null;
    }
    return ev;
  }

  // Bir riff parçası üret
  G.chunk = function (style, tuning, type, idx) {
    const st = G.STYLES[style] || G.STYLES['Modern Metal'], root = G.TUNINGS[tuning] != null ? G.TUNINGS[tuning] : 33;
    const seed = hash(style + '|' + tuning + '|' + type + '|' + idx), r = rndF(seed);
    const bpm = st.bpm, beats = 8, sc = st.scale;
    const out = { id: style + '/' + tuning + '/' + type + '/' + idx, style, tuning, type, idx, bpm, beats, name: (G.TYPES[type] || type) + ' ' + (idx + 1), gtr: [], bass: [], drums: [], synth: [], fx: [], lead: [], clean: [] };
    const S = 0.25; // 16'lık = çeyrek vuruşun 1/4'ü
    const gN = (p, s, l, v) => out.gtr.push({ p, s, l, v });
    const chordAt = (p, s, l, v, kind) => { const iv = kind === 'dis' ? [0, 6, 12] : kind === 'b2' ? [0, 1, 7] : [0, 7, 12]; iv.forEach(i => gN(p + i, s, l, v)); };
    const bassFor = p => (p - 12 >= 23 ? p - 12 : p);
    const scaleNote = (deg, oct) => root + sc[((deg % sc.length) + sc.length) % sc.length] + 12 * (Math.floor(deg / sc.length) + (oct || 0));

    if (type === 'clean' || type === 'intro') {
      // temiz arpej: kök + beşli + oktav + minör üçlü (yukarı oktavda)
      const prog = [0, pick(r, [5, 3, 1]), pick(r, [3, 6, 4]), pick(r, [4, 1, 6])];
      const shape = [0, 7, 12, 15, 19, 15, 12, 7];
      prog.forEach((d, bi) => {
        const base = scaleNote(d, 1);
        for (let k = 0; k < 4; k++) out.clean.push({ p: base + shape[(k + bi) % shape.length], s: bi * 2 + k * 0.5, l: 0.9, v: 108 + Math.floor(r() * 12) });
        if (type === 'intro') out.synth.push({ p: base + 12, s: bi * 2, l: 2, v: 70 }, { p: base + 15, s: bi * 2, l: 2, v: 65 }, { p: base + 19, s: bi * 2, l: 2, v: 60 });
      });
      for (let b = 0; b < beats; b++) {
        if (type === 'clean') { out.drums.push({ p: DR.bell, s: b, l: 0.2, v: 70 }); if (b % 4 === 0) out.drums.push({ p: DR.kick, s: b, l: 0.2, v: 90 }); if (b % 4 === 2) out.drums.push({ p: 37, s: b, l: 0.2, v: 80 }); }
      }
      if (type === 'intro') out.fx.push({ p: IND + 9 * 6 + Math.floor(r() * 6), s: 0, l: 8, v: 90 }); // ambiyans
      return out;
    }

    if (type === 'lead') {
      // harmonik minörde tremolo / alternatif penalı lead + altta sıkı ritim
      const hm = HMIN; let deg = 7 + Math.floor(r() * 4);
      for (let i = 0; i < 32; i++) {
        if (i % 2 === 0 && r() < 0.6) deg += pick(r, [-2, -1, 1, 1, 2, -3, 3]);
        deg = U.clamp(deg, 4, 16);
        const p = root + 24 + hm[((deg % 7) + 7) % 7] + 12 * Math.floor(deg / 7) - 12;
        if (r() < 0.9) out.lead.push({ p, s: i * S, l: S * 0.95, v: 110 + Math.floor(r() * 12) });
      }
      for (let i = 0; i < 32; i += 2) gN(root, i * S, S * 0.8, 90);
      drumsFor('chorus', st, out, r, null);
      bassLine(out, bassFor);
      return out;
    }

    const ev = rhythm(st, type, r);
    // perde seçimi: çoğunlukla açık en kalın tel, araya dizi notaları ve aksan akorları
    let pitchCycle = [];
    const motifLen = 4 + Math.floor(r() * 4);
    for (let i = 0; i < motifLen; i++) pitchCycle.push(r() < 0.65 ? 0 : pick(r, [1, 2, 3, 5, 6, 7]));
    const chug = [];
    for (let i = 0; i < 32; i++) {
      if (!ev[i]) continue;
      let len = 1; while (i + len < 32 && !ev[i + len] && len < 8) len++;
      chug.push({ i, len });
    }
    const half = type === 'breakdown' || st.half;
    chug.forEach((c, n) => {
      const s = c.i * S;
      const degree = pitchCycle[n % pitchCycle.length];
      const dis = r() < st.dis;
      if (type === 'chorus') {
        // nakarat: uzun açık güç akorları + aralarda chug
        if (c.i % 8 === 0) { const d = pick(r, [0, 0, 3, 5, 1]); chordAt(scaleNote(d), s, Math.min(8, c.len) * S * 0.98 + (c.len < 4 ? 0.5 : 0), 118, 'p5'); }
        else gN(root, s, c.len * S * 0.8, 92);
        return;
      }
      if (type === 'breakdown') {
        // breakdown: kalın tel chug'ları, büyük boşluklar, dissonant aksan akorları
        if (c.len >= 4 && r() < 0.5) chordAt(root, s, c.len * S * 0.95, 120, dis ? (r() < 0.5 ? 'dis' : 'b2') : 'p5');
        else gN(root, s, Math.min(c.len, 2) * S * 0.85, 96 + Math.floor(r() * 4));
        return;
      }
      if (st.octave && degree && r() < 0.5) { gN(root + 12, s, c.len * S * 0.9, 112); return; } // nu metal oktav sıçraması
      if (degree === 0) gN(root, s, Math.min(c.len, 2) * S * 0.85, 86 + Math.floor(r() * 14));
      else if (dis && c.len >= 2) chordAt(scaleNote(degree), s, c.len * S * 0.95, 116, 'dis');
      else gN(scaleNote(degree), s, c.len * S * 0.9, c.len >= 3 ? 112 : 96);
    });
    if (type === 'transition') {
      // geçiş: ilk ölçü riff, ikinci ölçünün sonu boşluk + tom fill; sona braam / bas vuruşu
      out.gtr = out.gtr.filter(n => n.s < 6);
      chordAt(root, 6, 1.9, 120, 'p5');
    }
    bassLine(out, bassFor);
    drumsFor(type, st, out, r, chug);
    // synth ve FX
    if (type === 'chorus') {
      const triad = [0, 3, 7];
      [0, 4].forEach(b => { const d = pick(r, [0, 5, 3]); triad.forEach(iv => out.synth.push({ p: scaleNote(d, 2) + iv, s: b, l: 3.95, v: 72 })); });
      out.fx.push({ p: IND + 2 * 6 + Math.floor(r() * 6), s: 0, l: 1, v: 100 }); // örs
    }
    if (type === 'breakdown') {
      out.fx.push({ p: IND + 12 * 6 + Math.floor(r() * 6), s: 0, l: 2, v: 115 }); // bozuk bas vuruşu
      if (r() < 0.5) out.fx.push({ p: IND + 3 * 6 + Math.floor(r() * 6), s: 4, l: 3, v: 100 }); // braam
      for (let b = 0; b < beats; b += 2) out.synth.push({ p: root + 12, s: b, l: 0.4, v: 90 });
    }
    if (type === 'transition') out.fx.push({ p: IND + 3 * 6 + Math.floor(r() * 6), s: 4, l: 4, v: 110 });
    if (type === 'verse' && r() < 0.5) for (let i = 0; i < 16; i++) out.synth.push({ p: scaleNote(pick(r, [0, 2, 4, 7]), 3), s: i * 0.5, l: 0.45, v: 55 }); // arka arp
    if (half) out.half = true;
    return out;
  };

  function bassLine(out, bassFor) {
    // bas: gitarın en kalın notasını izler (akorlarda yalnız kök), chug'larda kısa
    const seen = new Set();
    out.gtr.slice().sort((a, b) => a.s - b.s || a.p - b.p).forEach(n => {
      const k = n.s.toFixed(3); if (seen.has(k)) return; seen.add(k);
      out.bass.push({ p: bassFor(n.p), s: n.s, l: n.l, v: n.v > 100 ? 116 : 104 });
    });
  }

  function drumsFor(type, st, out, r, chug) {
    const D = out.drums, add = (p, s, v, l) => D.push({ p, s, l: l || 0.2, v });
    const style = st.drum, half = type === 'breakdown' || st.half;
    const syncKick = !!chug && (style === 'groove' || style === 'djent' || style === 'breakdown' || style === 'slam' || type === 'breakdown');
    for (let bar = 0; bar < 2; bar++) {
      const o = bar * 4;
      if (bar === 0) add(type === 'breakdown' ? DR.china : DR.crash, 0, 115, 1);
      if (type === 'breakdown' || (half && type !== 'chorus')) {
        add(DR.snare, o + 2, 122);
        for (let b = 0; b < 4; b++) add(b % 2 ? DR.china : DR.crash2, o + b, b % 2 ? 105 : 95);
      } else if (style === 'blast' && type === 'verse') {
        for (let i = 0; i < 8; i++) { add(i % 2 ? DR.snare : DR.kick, o + i * 0.5, 110); add(DR.ride, o + i * 0.5, 95); add(DR.kick2, o + i * 0.5 + 0.25, 100); }
        continue;
      } else if (style === 'thrash') {
        for (let i = 0; i < 8; i++) { add(i % 2 ? DR.snare : DR.kick, o + i * 0.5, i % 2 ? 108 : 112); add(DR.hat, o + i * 0.5, 90); }
        continue;
      } else {
        add(DR.snare, o + 1, 118); add(DR.snare, o + 3, 120);
        const cym = type === 'chorus' ? DR.ride : DR.hat;
        for (let i = 0; i < 8; i++) add(cym, o + i * 0.5, i % 2 ? 80 : 100);
        if (type === 'chorus') { add(DR.crash, o + 2, 100, 1); }
      }
      if (!syncKick) {
        if (type === 'chorus') for (let i = 0; i < 16; i++) { if (bar === 1 || i % 4 === 0 || i % 4 === 2) add(i % 2 ? DR.kick2 : DR.kick, o + i * 0.25, 100); }
        else if (style === 'bounce') [0, 1.5, 2.5].forEach(b => add(DR.kick, o + b, 112));
        else [0, 0.5, 2, 2.5].forEach(b => add(DR.kick, o + b, 110));
      }
    }
    if (syncKick) {
      // kick gitar chug'larını birebir izler (modern metal / djent / breakdown kuralı)
      let alt = 0;
      chug.forEach(c => { add(alt ? DR.kick2 : DR.kick, c.i * 0.25, 112); alt = 1 - alt; });
    }
    // bölüm sonu fill (geçişte her zaman)
    if (type === 'transition' || r() < 0.3) {
      const from = 7, n = 8;
      for (let i = 0; i < n; i++) add(DR.toms[Math.min(DR.toms.length - 1, Math.floor(i / 2) + (type === 'transition' ? 0 : 2))], from + i * 0.125, 105 + (i % 2) * 6);
      if (type === 'transition') { D.splice(0, D.length, ...D.filter(d => d.s < 6 || d.s >= 7 || [DR.kick, DR.kick2].includes(d.p))); for (let i = 0; i < 4; i++) add(DR.snare, 6 + i * 0.25, 90 + i * 8); }
    }
  }

  G.list = function (style, tuning, type, n) { return Array.from({ length: n || 40 }, (_, i) => G.chunk(style, tuning, type, i)); };

  // Şarkı yapıları
  G.FORMS = {
    'Modern Metal (tam şarkı)': [['intro', 1], ['riff', 2], ['verse', 2], ['chorus', 2], ['riff', 1], ['verse', 2], ['chorus', 2], ['transition', 1], ['breakdown', 2], ['lead', 2], ['chorus', 2], ['breakdown', 1]],
    'Breakdown ağırlıklı': [['riff', 2], ['breakdown', 2], ['verse', 2], ['breakdown', 2], ['transition', 1], ['breakdown', 4]],
    'Kısa demo (1 dk)': [['riff', 2], ['verse', 2], ['chorus', 2], ['breakdown', 2]],
    'Nakarat odaklı (metalcore)': [['intro', 1], ['verse', 2], ['chorus', 2], ['verse', 2], ['chorus', 2], ['clean', 2], ['breakdown', 2], ['chorus', 4]],
  };
  G.randomSong = function (style, tuning, form, seed) {
    const r = rndF(seed || (Date.now() & 0xffffff));
    const chosen = {};
    return (G.FORMS[form] || G.FORMS['Kısa demo (1 dk)']).map(([type, reps]) => {
      // aynı tip bölümler şarkı içinde genelde aynı riffi kullanır (tekrar = akılda kalıcılık)
      if (chosen[type] == null || r() < 0.25) chosen[type] = Math.floor(r() * 40);
      return { type, idx: chosen[type], reps };
    });
  };
  G.PARTS = { gtr: 'Gitar', bass: 'Bas', drums: 'Davul', synth: 'Synth', fx: 'FX', lead: 'Lead Gitar', clean: 'Temiz Gitar' };
})(window.OS);
