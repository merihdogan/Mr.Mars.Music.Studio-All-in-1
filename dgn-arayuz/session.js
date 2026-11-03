/* Mr. Mars Music Studio · MRH DGN — Session görünümü: parça x sahne klip ızgarası, nicelemeli klip başlatma */
(function (OS) {
  const U = OS.U, el = U.el, ui = OS.ui, E = OS.engine, T = OS.transport;
  const S = ui.session = { scenes: 8, quant: null };
  let root;

  S.init = function () {
    root = document.getElementById('view-session');
    document.addEventListener('os-session', () => { if (root.classList.contains('active')) S.render(); });
    document.addEventListener('os-transport', () => { if (root.classList.contains('active')) S.render(); });
    document.addEventListener('os-project', () => { if (root.classList.contains('active')) S.render(); });
  };
  const slots = t => { if (!t.session) t.session = []; while (t.session.length < S.scenes) t.session.push(null); return t.session; };
  const quant = () => S.quant == null ? OS.project.sig[0] : S.quant;

  S.sendClip = function (t, c) {
    const sl = slots(t); let i = sl.findIndex(x => !x); if (i < 0) { sl.push(null); S.scenes = sl.length; i = sl.length - 1; }
    OS.history.push();
    sl[i] = Object.assign(U.deepClone(c), { id: U.uid(), start: 0, muted: false });
    OS.store.markDirty(); U.toast(OS.t('Klip Session’a eklendi') + ' (' + (i + 1) + ')');
  };

  S.render = function () {
    if (!root) return;
    root.innerHTML = '';
    const P = OS.project, SES = OS.sessionState, tracks = P.tracks.filter(t => t.type !== 'fx');
    const qSel = el('select', { onchange: e => { S.quant = e.target.value === 'bar' ? null : +e.target.value; } },
      [['bar', '1 ölçü'], [2, '1/2 ölçü'], [1, '1 vuruş'], [0, 'Hemen']].map(([v, l]) => el('option', { value: v, selected: (S.quant == null ? 'bar' : String(S.quant)) === String(v) }, l)));
    root.appendChild(el('div', { class: 'toolbar' },
      el('b', null, 'Session'),
      el('label', null, 'Başlatma nicelemesi', qSel),
      el('button', { class: 'btn sm', onclick: () => { tracks.forEach(t => SES.playing.has(t.id) && E.sessionLaunch(t, null, quant())); } }, '■ Tüm klipleri durdur'),
      el('button', { class: 'btn sm', onclick: () => E.sessionToArrangement() }, '⟲ Aranjmana dön'),
      el('button', { class: 'btn sm', onclick: () => { S.scenes++; S.render(); } }, '+ Sahne'),
      el('span', { class: 'spacer' }),
      el('span', { class: 'muted' }, 'Klibe tıklayın: sonraki ölçüde başlar ve döngüde çalar. Aranjmandaki bir klibe sağ tıklayıp “Session’a gönder” diyebilirsiniz.')));
    const grid = el('div', { class: 'ses-grid', style: { gridTemplateColumns: `repeat(${tracks.length}, 150px) 90px` } });
    tracks.forEach(t => grid.appendChild(el('div', { class: 'ses-head', style: { borderTopColor: t.color } }, t.name)));
    grid.appendChild(el('div', { class: 'ses-head' }, 'Sahne'));
    for (let r = 0; r < S.scenes; r++) {
      tracks.forEach(t => grid.appendChild(slotEl(t, r)));
      grid.appendChild(el('button', { class: 'btn sm ses-scene', onclick: () => tracks.forEach(t => E.sessionLaunch(t, slots(t)[r] ? r : null, quant())) }, '▶ ' + (r + 1)));
    }
    tracks.forEach(t => grid.appendChild(el('button', { class: 'btn sm', title: 'Bu parçanın klibini durdur', onclick: () => E.sessionLaunch(t, null, quant()) }, '■')));
    root.appendChild(grid);
  };

  function slotEl(t, r) {
    const SES = OS.sessionState, c = slots(t)[r], pl = SES.playing.get(t.id), q = SES.queue.get(t.id);
    const playing = pl && pl.slot === r, queued = q && q.slot === r;
    const d = el('div', { class: 'ses-slot' + (c ? ' full' : '') + (playing ? ' playing' : '') + (queued ? ' queued' : ''), style: c ? { background: t.color + (playing ? 'ff' : '99') } : {} },
      c ? el('span', null, (playing ? '▶ ' : '▷ ') + (c.name || OS.t('Klip'))) : null);
    d.addEventListener('click', () => {
      if (c) { E.resume(); E.sessionLaunch(t, r, quant()); return; }
      if (t.type === 'instrument') {
        OS.history.push();
        slots(t)[r] = { id: U.uid(), start: 0, length: OS.project.sig[0], name: t.name + ' ' + (r + 1), notes: [] };
        ui.showView('arrange'); ui.pianoRoll.open(t, slots(t)[r]);
      }
    });
    d.addEventListener('contextmenu', e => {
      e.preventDefault(); if (!c) return;
      U.menu(e.clientX, e.clientY, [
        c.notes ? { label: 'Piyano rulosunda aç', onclick: () => { ui.showView('arrange'); ui.pianoRoll.open(t, c); } } : null,
        { label: 'Uzunluk (vuruş)…', onclick: async () => { const v = await U.prompt(OS.t('Klip uzunluğu (vuruş)'), c.length); if (+v > 0) { OS.history.push(); c.length = +v; S.render(); } } },
        { label: 'Aranjmana kopyala (imleçte)', onclick: () => { OS.history.push(); t.clips.push(Object.assign(U.deepClone(c), { id: U.uid(), start: T.position() })); ui.changed(); } },
        { label: 'Sil', onclick: () => { OS.history.push(); slots(t)[r] = null; S.render(); OS.store.markDirty(); } },
      ].filter(Boolean));
    });
    return d;
  }
})(window.OS);
