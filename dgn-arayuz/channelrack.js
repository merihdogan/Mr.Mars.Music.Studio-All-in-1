/* Mr. Mars Music Studio · MRH DGN — Desen Rafı: adım sıralayıcı (step sequencer) ile desen yazımı */
(function (OS) {
  const U = OS.U, el = U.el, ui = OS.ui, T = OS.transport;
  const CR = ui.channelRack = { bar: 0, steps: 16, expanded: {} };
  const DRUM_ROWS = [36, 38, 39, 42, 46, 49, 51, 45, 48, 37, 56];
  let root, stepEls = [];

  CR.init = function () {
    root = document.getElementById('view-rack');
    document.addEventListener('os-project', () => { if (root.classList.contains('active')) CR.render(); });
    requestAnimationFrame(loop);
  };

  const P = () => OS.project;
  const patStart = () => CR.bar * P().sig[0];
  // 1 adım = 1/16 nota (0.25 vuruş)
  const STEP = 0.25;

  function clipFor(t, create) {
    const s = patStart();
    let c = t.clips.find(x => x.notes && Math.abs(x.start - s) < 1e-6);
    if (!c && create) {
      c = { id: U.uid(), start: s, length: Math.max(P().sig[0], CR.steps * STEP), name: t.name + ' desen', notes: [] };
      t.clips.push(c);
    }
    return c;
  }

  CR.render = function () {
    root.innerHTML = ''; stepEls = [];
    const Pp = P();
    const barInp = el('input', { class: 'inp', type: 'number', min: 1, value: CR.bar + 1, style: 'width:60px', onchange: () => { CR.bar = Math.max(0, (+barInp.value || 1) - 1); CR.render(); } });
    const stepsSel = el('select', { onchange: () => { CR.steps = +stepsSel.value; CR.render(); } }, [16, 32, 64].map(n => el('option', { value: n, selected: n === CR.steps }, n + ' adım')));
    const swing = U.knob({ label: 'Swing', size: 34, min: 0, max: 100, def: 0, value: Pp.swing || 0, fmt: v => Math.round(v) + '%', onchange: v => { Pp.swing = v; OS.store.markDirty(); } });
    root.appendChild(el('div', { class: 'toolbar' },
      el('b', null, 'Desen Rafı'),
      el('label', null, 'Desen ölçüsü', barInp),
      el('button', { class: 'btn sm', onclick: () => { CR.bar = Math.max(0, CR.bar - 1); CR.render(); } }, '◀'),
      el('button', { class: 'btn sm', onclick: () => { CR.bar++; CR.render(); } }, '▶'),
      stepsSel, swing,
      el('button', { class: 'btn sm', onclick: () => { Pp.loop = { on: true, start: patStart(), end: patStart() + CR.steps * STEP }; T.setPosition(patStart()); ui.updateTransportUI(); T.play(); } }, '▶ Deseni döngüde çal'),
      el('button', { class: 'btn sm', onclick: copyPattern }, 'Deseni sonraki ölçüye kopyala'),
      el('span', { class: 'spacer' }),
      el('button', { class: 'btn sm', onclick: e => ui.pluginMenu(e.clientX, e.clientY, 'instrument', id => { ui.arrange.addTrack('instrument', id); CR.render(); }) }, '+ Kanal (enstrüman)'),
    ));
    const grid = el('div', { class: 'rack' });
    const tracks = Pp.tracks.filter(t => t.type === 'instrument');
    if (!tracks.length) grid.appendChild(el('div', { class: 'muted', style: 'padding:12px' }, 'Enstrüman parçası yok. “+ Kanal” ile ekleyin.'));
    tracks.forEach(t => {
      const drum = t.instrument && t.instrument.def.drumMap;
      const rows = drum ? (CR.expanded[t.id] ? DRUM_ROWS : DRUM_ROWS.slice(0, 4)) : [t.rackNote || 60];
      rows.forEach((note, ri) => grid.appendChild(row(t, note, ri, drum, rows.length)));
    });
    root.appendChild(grid);
    root.appendChild(el('div', { class: 'muted', style: 'padding:6px 10px' }, 'Tık: adım aç/kapat • Shift+tık: vurgulu (yüksek velocity) • Sağ tık: sessiz vuruş (düşük velocity) • Satır adına tıklayın: piyano rulosunda açılır. Desenler aranjmana normal MIDI klip olarak yazılır.'));
  };

  function row(t, note, ri, drum, nrows) {
    const c = clipFor(t, false);
    const name = drum ? (OS.DRUM_MAP[note] || U.noteName(note)) : t.name;
    const head = el('div', { class: 'rack-head', style: { borderLeftColor: t.color } });
    if (ri === 0) {
      head.append(
        el('button', { class: 'mini m' + (t.mute ? ' on' : ''), title: 'Sessiz', onclick: () => { t.mute = !t.mute; OS.engine.updateMix(); CR.render(); } }, 'M'),
        el('button', { class: 'mini s' + (t.solo ? ' on' : ''), title: 'Solo', onclick: () => { t.solo = !t.solo; OS.engine.updateMix(); CR.render(); } }, 'S'));
      if (drum) head.appendChild(el('button', { class: 'mini', title: 'Tüm davul satırları', onclick: () => { CR.expanded[t.id] = !CR.expanded[t.id]; CR.render(); } }, CR.expanded[t.id] ? '−' : '+'));
    } else head.append(el('span', { style: 'width:' + (drum ? 72 : 48) + 'px' }));
    head.appendChild(el('span', { class: 'rack-name', title: t.name, onclick: () => { const cc = clipFor(t, true); ui.showView('arrange'); ui.pianoRoll.open(t, cc); } }, drum ? name : t.name));
    if (!drum) {
      const ns = el('select', { title: 'Satır notası', onchange: () => { t.rackNote = +ns.value; CR.render(); } });
      for (let n = 24; n <= 96; n++) ns.appendChild(el('option', { value: n, selected: n === note }, U.noteName(n)));
      head.appendChild(ns);
    }
    const steps = el('div', { class: 'rack-steps' });
    for (let i = 0; i < CR.steps; i++) {
      const s = i * STEP;
      const n = c && c.notes.find(x => x.p === note && Math.abs(x.s - s) < 0.01);
      const b = el('div', { class: 'step' + (n ? ' on' : '') + (Math.floor(i / 4) % 2 ? ' alt' : ''), title: (i + 1) + '' });
      if (n) b.style.opacity = 0.45 + n.v / 127 * 0.55;
      b.addEventListener('mousedown', e => {
        e.preventDefault();
        OS.history.push();
        const cc = clipFor(t, true);
        if (cc.length < s + STEP) cc.length = Math.ceil((s + STEP) / P().sig[0]) * P().sig[0];
        const ex = cc.notes.findIndex(x => x.p === note && Math.abs(x.s - s) < 0.01);
        if (ex >= 0 && !e.shiftKey && e.button !== 2) cc.notes.splice(ex, 1);
        else {
          if (ex >= 0) cc.notes.splice(ex, 1);
          const v = e.shiftKey ? 127 : e.button === 2 ? 55 : 100;
          cc.notes.push({ p: note, s, l: drum ? STEP : STEP * 0.95, v });
          if (t.instrument) { OS.engine.resume(); const now = OS.engine.ctx.currentTime; t.instrument.noteOn(note, v, now); t.instrument.noteOff(note, now + 0.15); }
        }
        ui.changed();
      });
      b.addEventListener('contextmenu', e => e.preventDefault());
      steps.appendChild(b);
      stepEls.push(b);
    }
    const tools = el('div', { class: 'rack-tools' },
      el('button', {
        class: 'mini', title: 'Doldur', onclick: e => U.menu(e.clientX, e.clientY, [1, 2, 4, 8].map(k => ({ label: `Her ${k}. adımı doldur`, onclick: () => fill(t, note, k, drum) })).concat([{ label: 'Satırı temizle', onclick: () => fill(t, note, 0) }, { label: 'Rastgele', onclick: () => fill(t, note, -1, drum) }])),
      }, '⋯'));
    return el('div', { class: 'rack-row' }, head, steps, tools);
  }

  function fill(t, note, every, drum) {
    OS.history.push();
    const c = clipFor(t, true);
    c.notes = c.notes.filter(x => !(x.p === note && x.s < CR.steps * STEP - 1e-6));
    for (let i = 0; i < CR.steps; i++) {
      const on = every > 0 ? i % every === 0 : every < 0 ? Math.random() < 0.3 : false;
      if (on) c.notes.push({ p: note, s: i * STEP, l: drum ? STEP : STEP * 0.95, v: 100 });
    }
    c.length = Math.max(c.length, CR.steps * STEP);
    ui.changed();
  }
  function copyPattern() {
    OS.history.push();
    const s0 = patStart(), len = Math.max(P().sig[0], CR.steps * STEP);
    P().tracks.filter(t => t.type === 'instrument').forEach(t => {
      const c = clipFor(t, false); if (!c) return;
      const n = U.deepClone(c); n.id = U.uid(); n.start = s0 + len;
      t.clips = t.clips.filter(x => !(x.notes && Math.abs(x.start - n.start) < 1e-6));
      t.clips.push(n);
    });
    CR.bar += Math.round(len / P().sig[0]);
    ui.changed(); U.toast('Desen kopyalandı');
  }

  let last = -1;
  function loop() {
    if (root && root.classList.contains('active')) {
      const b = T.playing ? T.position() - patStart() : -1;
      const i = b >= 0 && b < CR.steps * STEP ? Math.floor(b / STEP) : -1;
      if (i !== last) {
        last = i;
        root.querySelectorAll('.rack-row').forEach(r => r.querySelectorAll('.step').forEach((s, k) => s.classList.toggle('now', k === i)));
      }
    }
    requestAnimationFrame(loop);
  }
})(window.OS);
