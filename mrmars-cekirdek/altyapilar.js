/* Mr. Mars Music Studio · MRH DGN — altyapı kütüphanesi: türlere göre davul, bas ve akor desenleri.
   Her altyapı düzenlenebilir MIDI parçaları olarak projeye yazılır. */
(function (OS) {
  const U = OS.U, el = U.el;
  // Davul: 16 adım. x vuruş, o hafif, . boş. Bas: x kök, o oktav üst, f beşli, . boş. Akor: stab deseni veya pad
  const G = (name, group, bpm, minor, prog, kit, drums, bass, chords, opt) => Object.assign({ name, group, bpm, minor, prog, kit, drums, bass, chords }, opt);
  const FOUR = 'x...x...x...x...', BACK = '....x.......x...';
  const LIST = [
    G('House', 'Dans', 124, true, [1, 6, 4, 5], 2, { K: FOUR, C: BACK, H: '..x...x...x...x.', O: '..x...x...x...x.' }, '..x...x...x..f..', 'x..x..x...x..x..'),
    G('Deep House', 'Dans', 120, true, [1, 7, 6, 4], 1, { K: FOUR, C: BACK, H: 'o.x.o.x.o.x.o.x.', O: '..o...o...o...o.' }, 'x..x....x.f.....', 'pad', { sev: true }),
    G('Tech House', 'Dans', 126, true, [1, 1, 1, 7], 2, { K: FOUR, C: BACK, H: 'oxo.oxo.oxo.oxo.', O: '..x...x...x...x.', T: '...x..x....x..x.' }, 'x.xx..x.x.xx..f.', '..x.....x.......'),
    G('Techno', 'Dans', 132, true, [1, 1, 1, 1], 2, { K: FOUR, C: '....x.......x...', H: 'xoxoxoxoxoxoxoxo', O: '..x...x...x...x.' }, 'x..x..x..x..x...', '.'),
    G('Trance', 'Dans', 138, true, [6, 4, 1, 5], 1, { K: FOUR, C: BACK, H: '..x...x...x...x.', O: '..x...x...x...x.' }, '..x...x...x...x.', 'x.xx.xx.x.xx.xx.'),
    G('Disco', 'Dans', 116, false, [2, 5, 1, 6], 0, { K: FOUR, S: BACK, H: 'x.x.x.x.x.x.x.x.', O: '..x...x...x...x.' }, 'x..o..x.x..o..f.', '..x...x...x...x.', { sev: true, realKit: true }),
    G('Synthwave', 'Dans', 100, true, [1, 6, 3, 7], 1, { K: 'x.......x.......', S: BACK, H: 'x.x.x.x.x.x.x.x.' }, 'x.x.x.x.x.x.x.x.', 'pad'),
    G('UK Garage', 'Kırık Ritim', 132, true, [1, 4, 6, 5], 1, { K: 'x.....x...x.....', C: BACK, H: '..x.o.x...x.o.xo' }, 'x.....x..f..x...', 'x..x...x..x.....', { sev: true }),
    G('Drum & Bass', 'Kırık Ritim', 174, true, [1, 1, 6, 7], 2, { K: 'x.........x.....', S: BACK, H: 'x.x.x.x.x.x.x.x.' }, 'x.......x..x....', 'pad'),
    G('Jungle', 'Kırık Ritim', 165, true, [1, 7, 1, 6], 0, { K: 'x.........xx....', S: '....x..o.o..x..o', H: 'x.x.x.x.x.x.x.x.' }, 'x..x......x.....', 'pad'),
    G('Dubstep', 'Kırık Ritim', 140, true, [1, 1, 6, 5], 2, { K: 'x.........x.....', S: '........x.......', H: 'x...x...x...x...' }, 'x.x...xxx...x.x.', '.'),
    G('Trap', 'Hip Hop', 140, true, [1, 6, 4, 5], 1, { K: 'x.....x...x.....', C: '........x.......', H: 'x.x.x.xxx.x.xxxx', O: '..............x.' }, 'x.....x...x.....', 'pad'),
    G('Boom Bap', 'Hip Hop', 90, true, [1, 4, 6, 5], 0, { K: 'x.....x.x.......', S: BACK, H: 'x.x.x.x.x.x.x.x.' }, 'x.....x.x.......', 'x.......x.......', { sev: true, swing: 12, realKit: true }),
    G('Lo-Fi Hip Hop', 'Hip Hop', 78, true, [2, 5, 1, 6], 3, { K: 'x.....x...x.....', S: BACK, H: 'x.o.x.o.x.o.x.o.' }, 'x.....x...f.....', 'pad', { sev: true, swing: 22 }),
    G('Reggaeton', 'Latin & Afro', 96, true, [1, 7, 6, 5], 1, { K: FOUR, S: '...x..x....x..x.', H: 'x.x.x.x.x.x.x.x.' }, 'x..x..x.x..x..x.', 'x..x..x.x..x..x.'),
    G('Afrobeats', 'Latin & Afro', 104, false, [1, 4, 5, 4], 1, { K: 'x...x...x...x...', T: '...x..x....x..x.', H: 'x.xxx.xxx.xxx.xx', P: 'x..x..x...x.x...' }, 'x.....x...x.f...', '..x..x....x..x..', { sev: true }),
    G('Bossa Nova', 'Latin & Afro', 128, false, [2, 5, 1, 6], 0, { K: 'x..x..x.x..x..x.', T: 'x..x..x...x..x..', H: 'x.x.x.x.x.x.x.x.' }, 'x.....f.x.....f.', 'x..x..x...x..x..', { sev: true, realKit: true }),
    G('Funk', 'Grup', 104, false, [1, 1, 4, 1], 0, { K: 'x..x..x...x.....', S: '....x..o.o..x..o', H: 'x.x.x.x.x.x.x.x.' }, 'x..x..x.o..x.fx.', '..x...x...x...x.', { sev: true, realKit: true }),
    G('Pop', 'Grup', 110, false, [1, 5, 6, 4], 0, { K: 'x.....x.x.......', S: BACK, H: 'x.x.x.x.x.x.x.x.' }, 'x.x.x.x.x.x.x.x.', 'pad', { realKit: true }),
    G('Rock', 'Grup', 124, false, [1, 4, 5, 4], 0, { K: 'x.......x.x.....', S: BACK, H: 'x.x.x.x.x.x.x.x.' }, 'x.x.x.x.x.x.x.x.', 'x.......x.......', { realKit: true }),
    G('Pop Balad', 'Grup', 72, false, [1, 5, 6, 4], 0, { K: 'x.......x.......', S: BACK, H: 'x.x.x.x.x.x.x.x.' }, 'x.......x.......', 'pad', { realKit: true }),
    G('Oriental House', 'Doğu', 124, true, [1, 2, 1, 7], 2, { K: FOUR, T: '...x..x....x..x.', H: '..x...x...x...x.', P: 'x..x..x.x..x..x.' }, 'x..x..x.x..x..x.', 'pad', { scale: [0, 1, 4, 5, 7, 8, 10] }),
    G('Türk Pop', 'Doğu', 112, true, [1, 7, 6, 5], 0, { K: 'x..x..x.x..x....', S: BACK, H: 'x.x.x.x.x.x.x.x.', P: '...x..x....x..x.' }, 'x..x..x.x.......', '..x...x...x...x.', { realKit: true }),
  ];
  const DRUM = { K: 36, S: 38, C: 39, H: 42, O: 46, T: 37, P: 56 };
  const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const MAJ = [0, 2, 4, 5, 7, 9, 11], MIN = [0, 2, 3, 5, 7, 8, 10];
  const degree = (scale, d) => scale[(d - 1 + 70) % 7] + 12 * Math.floor((d - 1) / 7);

  OS.backings = { LIST };

  // Seçilen altyapıyı nota listelerine çevirir (ölçü başı 4 vuruş)
  OS.backings.notes = function (g, keyIdx, bars) {
    const scale = g.scale || (g.minor ? MIN : MAJ), out = { drums: [], bass: [], chords: [] }, steps = 16, st = 0.25;
    const swing = (g.swing || 0) / 100 * st;
    const sw = i => i * st + (i % 2 ? swing : 0);
    for (let b = 0; b < bars; b++) {
      const t0 = b * 4, deg = g.prog[b % g.prog.length], root = keyIdx + degree(scale, deg);
      Object.keys(g.drums).forEach(k => {
        for (let i = 0; i < steps; i++) { const c = g.drums[k][i]; if (c === 'x' || c === 'o') out.drums.push({ p: DRUM[k], s: t0 + sw(i), l: 0.2, v: c === 'x' ? (k === 'H' ? (i % 4 === 0 ? 96 : 80) : 112) : 62 }); }
      });
      if (b % 8 === 7 && bars >= 8) for (let i = 12; i < 16; i++) out.drums.push({ p: [48, 45, 43, 41][i - 12], s: t0 + i * st, l: 0.2, v: 105 });
      if (b % 8 === 0) out.drums.push({ p: 49, s: t0, l: 1, v: b ? 100 : 90 });
      const bassRoot = 36 + (root % 12);
      for (let i = 0; i < steps; i++) { const c = g.bass[i]; if (c === '.' || c == null) continue; const next = g.bass.slice(i + 1).search(/[^.]/); out.bass.push({ p: bassRoot + (c === 'o' ? 12 : c === 'f' ? 7 : 0), s: t0 + sw(i), l: Math.max(0.2, Math.min(1, (next < 0 ? steps - i : next + 1) * st * 0.85)), v: 104 }); }
      const voiced = [deg, deg + 2, deg + 4].concat(g.sev ? [deg + 6] : []).map(d => { let p = 48 + keyIdx + degree(scale, d); while (p > 72) p -= 12; while (p < 50) p += 12; return p; }).sort((x, y) => x - y);
      if (g.chords === 'pad') voiced.forEach(p => out.chords.push({ p, s: t0, l: 3.9, v: 72 }));
      else if (g.chords !== '.') for (let i = 0; i < steps; i++) if (g.chords[i] === 'x') voiced.forEach(p => out.chords.push({ p, s: t0 + sw(i), l: 0.35, v: 84 }));
    }
    return out;
  };

  // Altyapıyı projeye ekler: var olan klipleri bozmaz, boş yerden devam eder
  OS.backings.write = function (g, keyIdx, bars) {
    const P = OS.project, T = OS.transport, n = OS.backings.notes(g, keyIdx, bars), syn = OS.plugins.get('inst.synth').presets;
    OS.history.push();
    const end = P.tracks.reduce((m, t) => Math.max(m, ...t.clips.map(c => c.start + c.length), 0), 0), at = Math.ceil(end / 4) * 4, len = bars * 4;
    P.bpm = g.bpm; T.bpm = g.bpm;
    const drumDev = g.realKit ? { instrument: 'inst.kit' } : { instrument: 'inst.drums', values: { kit: g.kit } };
    const dr = OS.makeTrack('instrument', g.name + ' · ' + OS.t('Davul'), drumDev);
    const bs = OS.makeTrack('instrument', g.name + ' · ' + OS.t('Bas'), { instrument: 'inst.synth', values: syn['Kalın Bas'] });
    const parts = [[dr, n.drums, 'Davul'], [bs, n.bass, 'Bas']];
    if (n.chords.length) {
      const pd = OS.makeTrack('instrument', g.name + ' · ' + OS.t('Akor'), { instrument: 'inst.synth', values: syn['Yumuşak Pad'] });
      pd.vol = -8; parts.push([pd, n.chords, 'Akor']);
      const rev = P.tracks.find(t => t.type === 'fx' && /reverb/i.test(t.name)); if (rev) pd.sends[rev.id] = -14;
    }
    parts.forEach(([t, notes, name]) => { t.clips.push({ id: U.uid(), start: at, length: len, name: g.name + ' ' + OS.t(name), notes }); });
    const fxAt = P.tracks.findIndex(t => t.type === 'fx');
    P.tracks.splice(fxAt < 0 ? P.tracks.length : fxAt, 0, ...parts.map(x => x[0]));
    P.loop = { on: true, start: at, end: at + len };
    OS.ui.changed(); OS.ui.updateTransportUI();
    T.setPosition(at);
    return at;
  };

  OS.backings.open = function () {
    const groups = [...new Set(LIST.map(g => g.group))];
    let cur = LIST[0], key = 9, bars = 8;
    const info = el('div', { class: 'muted' }), list = el('div', { class: 'back-grid' });
    const keySel = el('select', { onchange: e => key = +e.target.value }, KEYS.map((k, i) => el('option', { value: i, selected: i === key }, k)));
    const barSel = el('select', { onchange: e => bars = +e.target.value }, [4, 8, 16].map(n => el('option', { value: n, selected: n === bars }, n + ' ' + OS.t('ölçü'))));
    const show = () => { info.textContent = cur.name + ' · ' + cur.bpm + ' BPM · ' + OS.t(cur.minor ? 'Minör' : 'Majör'); list.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.n === cur.name)); };
    groups.forEach(gr => {
      list.appendChild(el('h4', { style: 'margin:8px 0 4px;color:var(--acc)' }, OS.t(gr)));
      const row = el('div', { class: 'row wrap' });
      LIST.filter(g => g.group === gr).forEach(g => { const b = el('button', { class: 'btn sm', onclick: () => { cur = g; show(); } }, g.name); b.dataset.n = g.name; row.appendChild(b); });
      list.appendChild(row);
    });
    const body = el('div', { class: 'back-lib' }, list, info,
      el('div', { class: 'row wrap' }, el('label', { class: 'field' }, OS.t('Tonalite'), keySel), el('label', { class: 'field' }, OS.t('Uzunluk'), barSel)),
      el('p', { class: 'muted' }, OS.t('Davul, bas ve akor düzenlenebilir MIDI parçaları olarak projeye eklenir; proje temposu bu altyapıya ayarlanır.')));
    show();
    U.modal(OS.t('Altyapı Kütüphanesi'), body, [{ label: 'Kapat' }, { label: OS.t('Projeye ekle ve çal'), primary: true, onclick: () => { OS.backings.write(cur, key, bars); OS.transport.play(); OS.ui.showView('arrange'); } }]);
  };
})(window.OS);
