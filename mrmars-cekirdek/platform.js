/* Mr. Mars Music Studio · MRH DGN — platform katmanı: dokunmatik köprü, telefon panelleri,
   ses kilidi açma, kurulabilir çevrimdışı uygulama (PWA). Diğer tüm betiklerden önce yüklenir. */
(function () {
  const OS = window.OS = window.OS || {};
  const P = OS.platform = {
    touch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    ios: /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
    standalone: matchMedia('(display-mode: standalone)').matches || navigator.standalone === true,
    web: /^https?:$/.test(location.protocol),
    installEvent: null,
  };

  // ---------------- Dokunmatik köprü ----------------
  // Kod fare olaylarıyla yazıldı: basılı tutma ve sürükleme isteyen kontrollere dokunuşlar fare olayı
  // olarak iletilir; öteki yerlerde tarayıcının kendi kaydırması ve dokunuşu çalışır.
  if (P.touch) {
    const orig = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (type, fn, opt) {
      if (type === 'mousedown' && this instanceof Element) this.__md = true;
      return orig.call(this, type, fn, opt);
    };
    const NATIVE = 'input,select,textarea,a,label,option';
    const scrolls = e => { const s = getComputedStyle(e); return (/(auto|scroll)/.test(s.overflowY) && e.scrollHeight > e.clientHeight + 1) || (/(auto|scroll)/.test(s.overflowX) && e.scrollWidth > e.clientWidth + 1); };
    function holder(t) {
      for (let e = t; e && e.nodeType === 1 && e !== document.body; e = e.parentElement) {
        if (e.classList.contains('modal-back')) return null;
        if (e.__md) return e;
        if (scrolls(e)) return null;
      }
      return null;
    }
    const live = new Map();
    let lastTap = null;
    function move(e) {
      for (const t of e.changedTouches) {
        const r = live.get(t.identifier); if (!r) continue;
        if (Math.hypot(t.clientX - r.x, t.clientY - r.y) > 8) { r.moved = true; clearTimeout(r.timer); }
        if (r.bridged) { e.preventDefault(); fire('mousemove', r.target, t.clientX, t.clientY); }
      }
    }
    const fire = (type, target, x, y) => {
      const ev = new MouseEvent(type, { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y, button: type === 'contextmenu' ? 2 : 0, buttons: type === 'mouseup' ? 0 : 1 });
      // yeniden çizilen kontrol DOM'dan çıkmış olabilir: bırakma olayı yine de pencereye ulaşmalı
      (target.isConnected ? target : document).dispatchEvent(ev);
    };
    document.addEventListener('touchstart', e => {
      for (const t of e.changedTouches) {
        const target = t.target.nodeType === 1 ? t.target : t.target.parentElement;
        if (!target || target.closest(NATIVE)) continue;
        const bridged = !!holder(target);
        if (!bridged && !P.ios) continue; // Android uzun basmayı kendi iletir
        const rec = { target, bridged, x: t.clientX, y: t.clientY, moved: false, menu: false };
        // basılı tutulan sampler pedinde menü geç açılır
        rec.timer = setTimeout(() => { if (!rec.moved) { rec.menu = true; fire('contextmenu', target, rec.x, rec.y); } }, target.closest('.pad.momentary') ? 1500 : 550);
        live.set(t.identifier, rec);
        if (!target.__tb) { target.__tb = true; target.addEventListener('touchmove', move, { passive: false }); target.addEventListener('touchend', end, { passive: false }); target.addEventListener('touchcancel', end, { passive: false }); }
        if (bridged) { e.preventDefault(); fire('mousedown', target, t.clientX, t.clientY); }
      }
    }, { passive: false, capture: true });
    document.addEventListener('touchmove', move, { passive: false, capture: true });
    function end(e) {
      for (const t of e.changedTouches) {
        const r = live.get(t.identifier); if (!r) continue;
        live.delete(t.identifier); clearTimeout(r.timer);
        if (!r.bridged) continue;
        e.preventDefault();
        fire('mouseup', r.target, t.clientX, t.clientY);
        if (e.type === 'touchend' && !r.moved && !r.menu && r.target.isConnected) {
          fire('click', r.target, t.clientX, t.clientY);
          const now = performance.now();
          if (lastTap && lastTap.target === r.target && now - lastTap.t < 320) { fire('dblclick', r.target, t.clientX, t.clientY); lastTap = null; }
          else lastTap = { target: r.target, t: now };
        }
      }
    }
    document.addEventListener('touchend', end, { passive: false, capture: true });
    document.addEventListener('touchcancel', end, { passive: false, capture: true });
  }

  // ---------------- Ses kilidi: mobil tarayıcılar sesi yalnız dokunuşla başlatır ----------------
  const unlock = () => { const c = OS.engine && OS.engine.ctx; if (c && c.state !== 'running') c.resume().catch(() => { }); };
  ['touchend', 'click', 'keydown'].forEach(t => document.addEventListener(t, unlock, { capture: true, passive: true }));

  // ---------------- Dar ekran panelleri ----------------
  addEventListener('DOMContentLoaded', () => {
    const bar = document.getElementById('topbar'); if (!bar) return;
    const t = s => (OS.t ? OS.t(s) : s);
    const tog = (label, cls) => { const b = document.createElement('button'); b.className = 'btn ghost m-toggle'; b.textContent = label[0]; b.title = t(label[1]); b.onclick = () => b.classList.toggle('on', document.body.classList.toggle(cls)); bar.appendChild(b); };
    tog(['☰', 'Panel'], 'show-panel');
    tog(['🎹', 'Klavye'], 'show-keys');
  });

  // ---------------- Kurulabilir uygulama ----------------
  if (P.web && isSecureContext) {
    const link = document.createElement('link'); link.rel = 'manifest'; link.href = 'manifest.webmanifest'; document.head.appendChild(link);
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('mrmars-sw.js').catch(() => { });
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => { });
    addEventListener('beforeinstallprompt', e => { e.preventDefault(); P.installEvent = e; });
  }
  P.canInstall = () => !P.standalone && !!(P.installEvent || (P.ios && P.web));
  P.install = () => {
    if (P.installEvent) { P.installEvent.prompt(); P.installEvent = null; return; }
    OS.U.modal(OS.t('Ana ekrana ekle'), OS.t('Safari’de Paylaş düğmesine dokunun, sonra “Ana Ekrana Ekle”yi seçin. Uygulama bundan sonra internetsiz de açılır.'));
  };
})();
