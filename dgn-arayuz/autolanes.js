/* Mr. Mars Music Studio · MRH DGN — aranjmanda otomasyon şeritleri */
(function (OS) {
  const U = OS.U, el = U.el, ui = OS.ui, T = OS.transport, AU = OS.auto;
  const L = ui.autoLanes = {};
  const SVGNS = 'http://www.w3.org/2000/svg';
  const LANE_H = 56;
  const svgs = new Map(); // lane.id -> çizim fonksiyonu

  const zoom = () => OS.project.zoom;
  const snapB = (b, free) => { const s = ui.arrange.snap; return s > 0 && !free ? Math.round(b / s) * s : b; };

  L.addLane = function (t, target) {
    OS.history.push();
    t.automation = t.automation || [];
    const used = new Set(t.automation.map(l => l.target));
    target = target || ['vol', 'pan'].find(x => !used.has(x)) || 'vol';
    t.automation.push({ id: U.uid(), target, points: [], read: true, write: false });
    t.showAuto = true;
    ui.changed();
  };

  L.reset = () => svgs.clear();

  // Aranjman.render tarafından çağrılır: [{ head, lane }] satırları döndürür
  L.rows = function (t, width) {
    const rows = (t.automation || []).map(l => row(t, l, width));
    const addHead = el('div', { class: 'thead auto-head', style: { height: '26px' } },
      el('div', { class: 'color', style: { background: t.color, opacity: 0.4 } }),
      el('button', { class: 'btn sm', onclick: () => L.addLane(t) }, '+ Otomasyon şeridi'));
    rows.push({ head: addHead, lane: el('div', { class: 'lane auto-lane', style: { height: '26px' } }) });
    return rows;
  };

  function row(t, l, width) {
    const s = AU.spec(t, l.target);
    const sel = el('select', {
      class: 'auto-sel', title: 'Otomasyon hedefi',
      onchange: () => { OS.history.push(); l.target = sel.value; l.points = []; ui.changed(); },
    });
    let group = null, og = sel;
    AU.targets(t).forEach(o => {
      if (o.group && o.group !== group) { group = o.group; og = el('optgroup', { label: group }); sel.appendChild(og); }
      og.appendChild(el('option', { value: o.target, selected: o.target === l.target }, o.group ? o.name.slice(o.group.length + 3) : o.name));
    });
    if (!s) sel.prepend(el('option', { value: l.target, selected: true }, '(cihaz kaldırıldı)'));
    const readout = el('span', { class: 'auto-val' });
    const tog = (key, txt, title, cls) => el('button', {
      class: `mini ${cls}${l[key] !== false && (key !== 'write' || l.write) ? ' on' : ''}`, title,
      onclick: e => { l[key] = key === 'read' ? l.read === false : !l.write; e.target.classList.toggle('on', key === 'read' ? l.read !== false : l.write); OS.store.markDirty(); OS.engine.updateMix(); },
    }, txt);
    const head = el('div', { class: 'thead auto-head', style: { height: LANE_H + 'px' } },
      el('div', { class: 'color', style: { background: t.color, opacity: 0.4 } }),
      el('div', { class: 'row', style: 'gap:4px;flex-wrap:nowrap' }, sel),
      el('div', { class: 'btns' },
        tog('read', 'R', 'Oku: eğriyi çal', 'auto-r'),
        tog('write', 'W', 'Yaz: çalarken kontrolü hareket ettirince eğriye kaydeder (bu sırada mevcut eğri çalınmaz)', 'r'),
        el('button', { class: 'mini', title: 'Noktaları temizle', onclick: () => { OS.history.push(); l.points = []; ui.changed(); } }, '⌫'),
        el('button', { class: 'mini', title: 'Şeridi sil', onclick: () => { OS.history.push(); t.automation.splice(t.automation.indexOf(l), 1); ui.changed(); } }, '✕'),
        readout));

    const lane = el('div', { class: 'lane auto-lane', style: { height: LANE_H + 'px' } });
    const svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('width', width); svg.setAttribute('height', LANE_H);
    svg.classList.add('auto-svg');
    lane.appendChild(svg);
    const H = LANE_H - 8, yOf = v => 4 + (1 - AU.norm(s, v)) * H, vOf = y => AU.denorm(s, 1 - (y - 4) / H);
    const fmt = v => s.unit === 'dB' && v <= -60 ? '-∞ dB' : U.fmtParam(s, v);

    function draw() {
      svg.innerHTML = '';
      if (!s) return;
      const z = zoom(), pts = l.points;
      const off = l.read === false;
      const cur = s === null ? 0 : (l.target === 'vol' ? t.vol : l.target === 'pan' ? t.pan : s.dev.values[s.pid]);
      if (!pts.length) {
        const ln = document.createElementNS(SVGNS, 'line');
        ln.setAttribute('x1', 0); ln.setAttribute('x2', width); ln.setAttribute('y1', yOf(cur)); ln.setAttribute('y2', yOf(cur));
        ln.setAttribute('class', 'auto-empty'); svg.appendChild(ln);
        readout.textContent = fmt(cur);
        return;
      }
      const step = s.type === 'choice' || s.type === 'bool';
      let d = `M0 ${yOf(pts[0].v)}`;
      pts.forEach((p, i) => {
        const x = p.b * z, y = yOf(p.v);
        if (step && i > 0) d += ` L${x} ${yOf(pts[i - 1].v)}`;
        // log/doğrusal eğriyi çizimde de örnekle
        if (!step && i > 0 && s.curve === 'log' && s.min > 0) { const p0 = pts[i - 1]; for (let k = 1; k < 8; k++) { const b = p0.b + (p.b - p0.b) * k / 8; d += ` L${b * z} ${yOf(AU.valueAt(l, s, b))}`; } }
        d += ` L${x} ${y}`;
      });
      d += ` L${width} ${yOf(pts[pts.length - 1].v)}`;
      const fill = document.createElementNS(SVGNS, 'path');
      fill.setAttribute('d', d + ` L${width} ${LANE_H} L0 ${LANE_H} Z`); fill.setAttribute('class', 'auto-fill');
      fill.style.fill = t.color;
      const path = document.createElementNS(SVGNS, 'path');
      path.setAttribute('d', d); path.setAttribute('class', 'auto-line' + (off ? ' off' : ''));
      path.style.stroke = t.color;
      svg.append(fill, path);
      pts.forEach(p => {
        const c = document.createElementNS(SVGNS, 'circle');
        c.setAttribute('cx', p.b * z); c.setAttribute('cy', yOf(p.v)); c.setAttribute('r', 4); c.setAttribute('class', 'auto-pt');
        c._p = p; svg.appendChild(c);
      });
      readout.textContent = fmt(AU.valueAt(l, s, T.position()));
    }
    svgs.set(l.id, { draw, live: () => { if (s && l.points.length) readout.textContent = fmt(AU.valueAt(l, s, T.position())); } });
    draw();

    const hit = (x, y) => l.points.find(p => Math.abs(p.b * zoom() - x) < 7 && Math.abs(yOf(p.v) - y) < 7);
    const local = e => { const r = lane.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    lane.addEventListener('mousedown', e => {
      if (!s || e.button !== 0) return;
      const [x, y] = local(e);
      OS.history.push();
      let p = hit(x, y);
      if (!p) { p = { b: Math.max(0, snapB(x / zoom(), e.shiftKey)), v: vOf(y) }; l.points.push(p); AU.sort(l); }
      const b0 = p.b, y0 = yOf(p.v);
      draw(); readout.textContent = fmt(p.v);
      U.drag(e, (dx, dy, ev) => {
        p.b = Math.max(0, snapB(b0 + dx / zoom(), ev.shiftKey));
        p.v = vOf(U.clamp(y0 + dy, 4, 4 + H));
        AU.sort(l); draw(); readout.textContent = fmt(p.v);
      }, () => { OS.store.markDirty(); if (!T.playing) { OS.engine.updateMix(); AU.applyAtPosition(); } });
    });
    const del = e => {
      e.preventDefault();
      const [x, y] = local(e), p = hit(x, y);
      if (p) { OS.history.push(); l.points.splice(l.points.indexOf(p), 1); draw(); OS.store.markDirty(); return; }
      if (e.type !== 'contextmenu') return;
      const b = snapB(x / zoom());
      U.menu(e.clientX, e.clientY, [
        { label: 'Döngü bölgesindeki noktaları sil', onclick: () => { const lp = OS.project.loop; OS.history.push(); l.points = l.points.filter(q => q.b < lp.start || q.b > lp.end); draw(); } },
        { label: 'Buradan sonrasını sil', onclick: () => { OS.history.push(); l.points = l.points.filter(q => q.b < b); draw(); } },
        { label: 'Tüm noktaları temizle', onclick: () => { OS.history.push(); l.points = []; draw(); } },
        { label: 'Döngü bölgesine rampa (min → maks)', onclick: () => { const lp = OS.project.loop; OS.history.push(); l.points = l.points.filter(q => q.b < lp.start || q.b > lp.end); l.points.push({ b: lp.start, v: s.min }, { b: lp.end, v: s.max }); AU.sort(l); draw(); } },
      ]);
    };
    lane.addEventListener('contextmenu', del);
    lane.addEventListener('dblclick', del);
    return { head, lane };
  }

  // Yazma modunda canlı güncelleme ve çalarken değer göstergesi
  AU.redraw = (t, l) => { const f = svgs.get(l.id); if (f) f.draw(); };
  setInterval(() => { if (T.playing) svgs.forEach(f => f.live()); }, 150);
})(window.OS);
