/* Mr. Mars Music Studio · MRH DGN — ayrılabilir pencereler
 * Her sekme (Aranjman, Session, ... Eklentiler) ve sekmelerin içindeki paneller (deckler, mikser,
 * looper, amfi yolları, piyano rulosu, inspektör ...) uygulama içinde ayrı, sürüklenebilir ve
 * boyutlandırılabilir bir pencereye alınabilir. Pencere kapatılınca içerik eski yerine döner.
 * Açık pencereler ve konumları hatırlanır.
 */
(function (OS) {
  const U = OS.U, el = U.el, ui = OS.ui;
  const D = OS.dock = { wins: new Map(), z: 2000 };
  // Ayrılabilir alt paneller (sekme içinde)
  const PANEL_SEL = '.mini-box, .deck, .dj-mixer, .pads, .dj-lib, .dj-panel, .rig-row-box, .reinst-top, .tuner, .dj-bar, .rack, .ses-grid, .strip.master, .plist';
  const GLOBAL = [['#inspector', 'inspector', 'İnspektör'], ['#lower-zone', 'lower', 'Editör (piyano rulosu / cihaz)'], ['#keyboard-bar', 'keyboard', 'Klavye']];
  const geo = k => { try { return JSON.parse(localStorage.getItem('os.dock.geo.' + k) || 'null'); } catch (e) { return null; } };
  const saveGeo = (k, g) => { try { localStorage.setItem('os.dock.geo.' + k, JSON.stringify(g)); } catch (e) { } };
  const saveOpen = () => { try { localStorage.setItem('os.dock.open', JSON.stringify([...D.wins.keys()])); } catch (e) { } };
  const tabTitle = v => { const b = document.querySelector(`#tabs button[data-view="${v}"]`); return b ? b.dataset.label || b.textContent : v; };

  // ---------------- Pencere ----------------
  function makeWin(key, title, onClose) {
    const g = geo(key) || { x: 80 + (D.wins.size % 6) * 40, y: 90 + (D.wins.size % 6) * 34, w: Math.min(innerWidth - 100, 900), h: Math.min(innerHeight - 140, 560) };
    const body = el('div', { class: 'fw-body' });
    const ttl = el('span', { class: 'fw-title' }, el('img', { src: 'mrmars-gorseller/icon-16.png', alt: '' }), title);
    const maxB = el('button', { class: 'fw-btn', title: 'Büyüt / küçült' }, '▢');
    const dockB = el('button', { class: 'fw-btn', title: 'Yerine geri yerleştir' }, '⤓');
    const closeB = el('button', { class: 'fw-btn fw-close', title: 'Kapat (yerine döner)' }, '✕');
    const head = el('div', { class: 'fw-head' }, ttl, el('span', { class: 'spacer' }), maxB, dockB, closeB);
    const win = el('div', { class: 'float-win', style: { left: g.x + 'px', top: g.y + 'px', width: g.w + 'px', height: g.h + 'px', zIndex: ++D.z } }, head, body);
    document.body.appendChild(win);
    const front = () => { win.style.zIndex = ++D.z; };
    win.addEventListener('mousedown', front, true);
    const store = () => saveGeo(key, { x: win.offsetLeft, y: win.offsetTop, w: win.offsetWidth, h: win.offsetHeight });
    head.addEventListener('mousedown', e => {
      if (e.target.closest('.fw-btn') || win.classList.contains('max')) return;
      const x0 = win.offsetLeft, y0 = win.offsetTop;
      U.drag(e, (dx, dy) => { win.style.left = U.clamp(x0 + dx, -win.offsetWidth + 80, innerWidth - 60) + 'px'; win.style.top = U.clamp(y0 + dy, 0, innerHeight - 30) + 'px'; }, store);
    });
    head.addEventListener('dblclick', e => { if (!e.target.closest('.fw-btn')) maxB.click(); });
    new ResizeObserver(() => { if (!win.classList.contains('max') && win.isConnected) store(); window.dispatchEvent(new Event('resize')); }).observe(win);
    maxB.onclick = () => { win.classList.toggle('max'); window.dispatchEvent(new Event('resize')); };
    dockB.onclick = closeB.onclick = () => onClose();
    return { win, body, front };
  }

  // ---------------- Sekmenin tamamı ----------------
  D.openView = function (v) {
    const key = 'view|' + v;
    if (D.wins.has(key)) { D.wins.get(key).front(); return; }
    const sec = document.getElementById('view-' + v); if (!sec) return;
    const ph = el('div', { class: 'view dock-ph-view', id: 'ph-' + v },
      el('img', { src: 'mrmars-gorseller/icon-64.png', alt: '' }),
      el('div', null, OS.t('Bu bölüm ayrı bir pencerede açık.')),
      el('div', { class: 'row', style: 'justify-content:center' },
        el('button', { class: 'btn', onclick: () => D.wins.get(key) && D.wins.get(key).front() }, OS.t('Pencereye git')),
        el('button', { class: 'btn primary', onclick: () => D.close(key) }, OS.t('Geri yerleştir'))));
    sec.parentNode.insertBefore(ph, sec);
    const w = makeWin(key, tabTitle(v), () => D.close(key));
    sec.classList.add('active', 'floated');
    w.body.appendChild(sec);
    D.wins.set(key, Object.assign(w, { kind: 'view', v, sec, ph }));
    const b = document.querySelector(`#tabs button[data-view="${v}"]`); if (b) b.classList.add('floating');
    if (ui.view === v) ph.classList.add('active');
    D.render(v);
    saveOpen();
  };
  D.render = function (v) {
    const r = { arrange: () => ui.arrange.render(), session: () => ui.session.render(), rack: () => ui.channelRack.render(), mixer: () => ui.mixer.render(), mini: () => ui.miniTools.render(), reinst: () => ui.reinstrument.render(), rig: () => ui.rig.render(), dj: () => ui.dj.render(), plugins: () => ui.plugins.render(), world: () => ui.world.render(), metal: () => ui.metal.render() }[v];
    try { r && r(); } catch (e) { console.warn(e); }
  };

  // ---------------- Alt panel ----------------
  const makePh = (key, title) => el('div', { class: 'dock-ph', 'data-ph': key }, el('span', null, '⧉ ' + title + ' — ' + OS.t('ayrı pencerede')), el('button', { class: 'btn sm', onclick: () => D.close(key) }, OS.t('Geri yerleştir')));
  D.openPanel = function (elx, key, title) {
    if (D.wins.has(key)) { D.wins.get(key).front(); return; }
    const ph = makePh(key, title);
    elx.parentNode.insertBefore(ph, elx);
    const w = makeWin(key, title, () => D.close(key));
    w.body.appendChild(elx);
    elx.classList.add('in-win');
    D.wins.set(key, Object.assign(w, { kind: 'panel', el: elx, ph, title }));
    saveOpen();
    window.dispatchEvent(new Event('resize'));
  };

  D.close = function (key) {
    const w = D.wins.get(key); if (!w) return;
    if (w.kind === 'view') {
      const b = document.querySelector(`#tabs button[data-view="${w.v}"]`); if (b) b.classList.remove('floating');
      w.ph.parentNode.insertBefore(w.sec, w.ph); w.ph.remove();
      w.sec.classList.remove('floated');
      w.sec.classList.toggle('active', ui.view === w.v);
    } else {
      w.el.classList.remove('in-win');
      if (w.ph.isConnected) { w.ph.parentNode.insertBefore(w.el, w.ph); w.ph.remove(); }
    }
    w.win.remove();
    D.wins.delete(key);
    saveOpen();
    if (w.kind === 'view') D.render(w.v);
    window.dispatchEvent(new Event('resize'));
  };

  // ---------------- Panellere "ayır" düğmesi ve yeniden çizimlerde senkron ----------------
  function keyOf(elx, view, idx) {
    const t = elx.querySelector('.mini-title, .rig-row-head b, .dletter, .dtitle b, b, .sname');
    const txt = t ? t.textContent.trim().slice(0, 40) : '';
    return view + '|' + (elx.className.split(' ')[0]) + '|' + (txt || idx);
  }
  function titleOf(elx, view) {
    const t = elx.querySelector('.mini-title, .rig-row-head b, .dtitle b, b, .sname');
    const base = tabTitle(view);
    if (elx.classList.contains('deck')) return base + ' — Deck ' + (elx.querySelector('.dletter') || {}).textContent;
    if (elx.classList.contains('tuner')) return OS.t('Akort cihazı');
    if (elx.classList.contains('dj-mixer')) return base + ' — ' + OS.t('Mikser');
    return base + (t ? ' — ' + t.textContent.trim().slice(0, 40) : '');
  }
  D.sync = function () {
    document.querySelectorAll('.view').forEach(sec => {
      const view = sec.id.replace('view-', '');
      if (!view || sec.classList.contains('dock-ph-view')) return;
      const counts = {};
      sec.querySelectorAll(PANEL_SEL).forEach(p => {
        if (p.closest('.float-win') && !p.closest('.floated')) return; // zaten ayrı pencerede
        if (p.parentElement.closest(PANEL_SEL)) return; // iç içe paneller: yalnız dıştakine düğme
        const c = p.className.split(' ')[0]; counts[c] = (counts[c] || 0) + 1;
        const key = keyOf(p, view, counts[c]);
        p.dataset.dock = key;
        const w = D.wins.get(key);
        if (w && w.kind === 'panel' && w.el !== p) {
          // sekme yeniden çizildi: yeni içeriği pencereye taşı, yerine yer tutucu koy
          const nph = makePh(key, w.title);
          p.parentNode.insertBefore(nph, p);
          if (w.ph.isConnected) w.ph.remove();
          w.ph = nph;
          w.el.remove(); w.el = p; p.classList.add('in-win'); w.body.appendChild(p);
          return;
        }
        if (!p.querySelector(':scope > .dock-btn')) {
          p.classList.add('dockable');
          p.appendChild(el('button', { class: 'dock-btn', title: OS.t('Ayrı pencerede aç'), onclick: e => { e.stopPropagation(); D.openPanel(p, p.dataset.dock, titleOf(p, view)); } }, '⧉'));
        }
      });
    });
    GLOBAL.forEach(([sel, k, title]) => {
      const p = document.querySelector(sel); if (!p || p.querySelector(':scope > .dock-btn')) return;
      p.classList.add('dockable');
      p.appendChild(el('button', { class: 'dock-btn', title: OS.t('Ayrı pencerede aç'), onclick: e => { e.stopPropagation(); D.openPanel(p, 'global|' + k, OS.t(title)); } }, '⧉'));
    });
  };

  D.init = function () {
    // sekme düğmeleri: çift tık veya ⧉ simgesi ile pencereye al
    document.querySelectorAll('#tabs button[data-view]').forEach(b => {
      b.dataset.label = b.textContent;
      const ic = el('span', { class: 'tab-pop', title: OS.t('Ayrı pencerede aç') }, '⧉');
      ic.addEventListener('click', e => { e.stopPropagation(); D.openView(b.dataset.view); });
      b.appendChild(ic);
      b.addEventListener('dblclick', () => D.openView(b.dataset.view));
      b.addEventListener('contextmenu', e => { e.preventDefault(); U.menu(e.clientX, e.clientY, [D.wins.has('view|' + b.dataset.view) ? { label: 'Geri yerleştir', onclick: () => D.close('view|' + b.dataset.view) } : { label: 'Ayrı pencerede aç', onclick: () => D.openView(b.dataset.view) }, { label: 'Tüm pencereleri yerleştir', onclick: () => [...D.wins.keys()].forEach(D.close) }]); });
    });
    let pend = false;
    new MutationObserver(() => { if (pend) return; pend = true; requestAnimationFrame(() => { pend = false; D.sync(); }); }).observe(document.body, { childList: true, subtree: true });
    D.sync();
  };
  // Son oturumda açık olan pencereleri geri aç
  D.restore = function () {
    let list = [];
    try { list = JSON.parse(localStorage.getItem('os.dock.open') || '[]'); } catch (e) { }
    list.filter(k => k.startsWith('view|')).forEach(k => D.openView(k.slice(5)));
    const panels = list.filter(k => !k.startsWith('view|'));
    if (!panels.length) return;
    panels.forEach(k => { const v = k.split('|')[0]; if (v !== 'global') D.render(v); });
    requestAnimationFrame(() => setTimeout(() => {
      D.sync();
      panels.forEach(k => {
        const p = k.startsWith('global|') ? document.querySelector(GLOBAL.find(g => 'global|' + g[1] === k)[0]) : document.querySelector(`[data-dock="${CSS.escape(k)}"]`);
        if (p && !D.wins.has(k)) D.openPanel(p, k, k.startsWith('global|') ? OS.t(GLOBAL.find(g => 'global|' + g[1] === k)[2]) : titleOf(p, k.split('|')[0]));
      });
    }, 200));
  };
})(window.OS);
