/* Mr. Mars Music Studio · MRH DGN — Controller Merkezi: bağlı cihazlar, canlı sinyal izleme, adım adım
   eşleme sihirbazı, cihaz profilleri, jog biçimi, yumuşak devralma ve genel HID desteği */
(function (OS) {
  const U = OS.U, el = U.el, DJ = OS.ui.dj;
  const C = DJ.ctrl = { log: [], hid: [] };
  const S = () => DJ._i.settings, save = () => DJ._i.saveSettings();

  // Sihirbazın sorduğu kontroller
  const deckSteps = L => [
    ['play', 'PLAY'], ['cue', 'CUE'], ['sync', 'SYNC'], ['headcue', 'Kulaklık (PFL)'], ['vol', 'Kanal faderı', 1], ['pitch', 'Tempo faderı', 1], ['jog', 'Jog tekerleği (çevirin)', 1], ['jogtouch', 'Jog üstüne dokunma'],
    ['eqhigh', 'EQ Tiz', 1], ['eqmid', 'EQ Orta', 1], ['eqlow', 'EQ Bas', 1], ['filter', 'Filtre', 1], ['trim', 'Gain / Trim', 1], ['fx', 'FX 1 düğmesi', 1], ['fx2', 'FX 2 düğmesi', 1], ['fx3', 'FX 3 düğmesi', 1],
    ['hot1', 'Ped 1'], ['hot2', 'Ped 2'], ['hot3', 'Ped 3'], ['hot4', 'Ped 4'], ['hot5', 'Ped 5'], ['hot6', 'Ped 6'], ['hot7', 'Ped 7'], ['hot8', 'Ped 8'],
    ['padnext', 'Sonraki ped sayfası'], ['padprev', 'Önceki ped sayfası'], ['loopin', 'Döngü başı (IN)'], ['loopout', 'Döngü sonu (OUT)'], ['loophalf', 'Döngü ½'], ['loopdouble', 'Döngü ×2'], ['loopexit', 'Döngüden çık'],
    ['jumpback', 'Beat jump geri'], ['jumpfwd', 'Beat jump ileri'], ['keylock', 'Key Lock'], ['load', 'Seçili parçayı yükle'],
  ].map(([a, l, c]) => ({ action: L + '.' + a, label: 'Deck ' + L, what: l, cont: !!c }));
  const STEPS = n => [
    { action: 'xfader', label: 'Mikser', what: 'Crossfader', cont: true }, { action: 'master', label: 'Mikser', what: 'Master seviye', cont: true },
    { action: 'cuemix', label: 'Mikser', what: 'Cue/Master karışımı', cont: true }, { action: 'cuevol', label: 'Mikser', what: 'Kulaklık seviyesi', cont: true },
    { action: 'lib.scroll', label: 'Kütüphane', what: 'Gezinme düğmesi (çevirin)', cont: true }, { action: 'shift', label: 'Genel', what: 'SHIFT' },
    ...['A', 'B', 'C', 'D'].slice(0, n).flatMap(deckSteps),
  ];
  C.continuous = a => { const k = a.includes('.') ? a.slice(a.indexOf('.') + 1) : a; return /^(vol|pitch|jog|eq\w+|filter|trim|fx\d?|res|send[AB]|scroll)$/.test(k) || ['xfader', 'master', 'cuemix', 'cuevol', 'samplervol', 'mfx'].includes(a); };

  // ---------------- Canlı sinyal izleme ----------------
  DJ.monitor = function (key, data) {
    C.log.unshift({ key, hex: data ? [...data].map(x => x.toString(16).padStart(2, '0')).join(' ') : '', action: S().map[key] || '' });
    if (C.log.length > 12) C.log.length = 12;
    if (C.drawLog) C.drawLog();
  };

  // ---------------- Cihaz profilleri: cihaz takılınca kendi eşlemesi yüklenir ----------------
  const midiIns = () => OS.midiAccess ? [...OS.midiAccess.inputs.values()] : [];
  const midiOuts = () => OS.midiAccess ? [...OS.midiAccess.outputs.values()] : [];
  C.saveProfile = name => { const s = S(); s.profiles = s.profiles || {}; s.profiles[name] = Object.assign({}, s.map); save(); U.toast(OS.t('Profil kaydedildi') + ': ' + name); };
  C.loadProfile = name => { const s = S(), m = s.profiles && s.profiles[name]; if (!m) return false; s.map = Object.assign({}, m); s.activeProfile = name; save(); return true; };
  function autoProfile() {
    const s = S(); if (!s.profiles) return;
    const dev = midiIns().find(i => s.profiles[i.name]) || C.hid.find(h => s.profiles[h.name]);
    if (dev && s.activeProfile !== dev.name) { C.loadProfile(dev.name); U.toast(OS.t('Controller profili yüklendi') + ': ' + dev.name); }
  }
  let bound = null;
  setInterval(() => {
    if (OS.midiAccess && OS.midiAccess !== bound) { bound = OS.midiAccess; bound.addEventListener('statechange', () => { autoProfile(); if (C.drawDevices) C.drawDevices(); }); autoProfile(); }
  }, 1000);

  // ---------------- Genel HID: düğmeler bit, faderler bayt olarak öğrenilir ----------------
  C.hidSupported = () => !!navigator.hid;
  function attachHid(dev) {
    if (C.hid.some(h => h.dev === dev)) return;
    const h = { dev, name: dev.productName || 'HID', id: dev.vendorId.toString(16) + '_' + dev.productId.toString(16), last: {}, noisy: {}, t0: performance.now() };
    C.hid.push(h);
    dev.addEventListener('inputreport', e => onReport(h, e));
  }
  function onReport(h, e) {
    const rid = e.reportId, b = new Uint8Array(e.data.buffer, e.data.byteOffset, e.data.byteLength), prev = h.last[rid];
    h.last[rid] = b.slice();
    if (!prev) return;
    const calibrating = performance.now() - h.t0 < 1500;
    for (let i = 0; i < b.length; i++) {
      if (b[i] === prev[i]) continue;
      const bk = rid + ':' + i;
      if (calibrating) { h.noisy[bk] = true; continue; } // dokunulmadan değişen baytlar (sayaç, sensör) yok sayılır
      if (h.noisy[bk]) continue;
      const base = 'hid:' + h.id + ':' + bk, byteKey = base, map = S().map, pend = DJ.learn && DJ.pending;
      // jog / sürekli kontrol
      if ((pend && C.continuous(DJ.pending)) || map[byteKey]) {
        const act = pend ? DJ.pending : map[byteKey], isJog = /\.jog$|^lib\.scroll$/.test(act);
        if (isJog) { let dl = b[i] - prev[i]; if (dl > 127) dl -= 256; if (dl < -127) dl += 256; DJ.input(byteKey, 0.5, dl < 0 ? 128 + Math.max(dl, -63) : Math.min(dl, 63), false, false, true); }
        else DJ.input(byteKey, b[i] / 255, b[i] >> 1, false, false, true);
        continue;
      }
      // düğmeler
      const xor = b[i] ^ prev[i];
      for (let bit = 0; bit < 8; bit++) {
        if (!(xor & (1 << bit))) continue;
        const on = !!(b[i] & (1 << bit));
        DJ.input(base + ':' + bit, on ? 1 : 0, on ? 127 : 0, on, !on, false);
      }
    }
  }
  C.addHid = async function () {
    try {
      const list = await navigator.hid.requestDevice({ filters: [] });
      for (const dev of list) { if (!dev.opened) await dev.open(); attachHid(dev); }
      autoProfile(); if (C.drawDevices) C.drawDevices();
    } catch (e) { U.toast(OS.t('HID cihazı açılamadı') + ': ' + e.message); }
  };
  if (navigator.hid) {
    navigator.hid.getDevices().then(async list => { for (const dev of list) { try { if (!dev.opened) await dev.open(); attachHid(dev); } catch (e) { } } }).catch(() => { });
    navigator.hid.addEventListener('disconnect', e => { C.hid = C.hid.filter(h => h.dev !== e.device); if (C.drawDevices) C.drawDevices(); });
  }

  // ---------------- Sihirbaz ----------------
  function wizard(body, onDone) {
    const steps = STEPS(S().count); let i = 0, timer = null;
    const finish = () => { clearInterval(timer); DJ.learn = false; DJ.pending = null; onDone(); };
    const title = el('div', { class: 'wiz-title' }), prog = el('div', { class: 'muted' });
    const show = () => {
      if (i >= steps.length) { finish(); return; }
      const st = steps[i]; DJ.learn = true; DJ.pending = st.action;
      title.textContent = OS.t(st.label) + ': ' + OS.t(st.what);
      prog.textContent = (i + 1) + ' / ' + steps.length + ' · ' + OS.t(st.cont ? 'Kontrolü hareket ettirin' : 'Düğmeye basın');
    };
    body.innerHTML = '';
    body.append(title, prog, el('div', { class: 'row wrap' },
      el('button', { class: 'btn sm', onclick: () => { i++; show(); } }, 'Bu kontrol yok, atla'),
      el('button', { class: 'btn sm', onclick: () => { i = Math.max(0, i - 1); show(); } }, 'Geri'),
      el('button', { class: 'btn sm', onclick: () => { const g = steps[i].label; while (i < steps.length && steps[i].label === g) i++; show(); } }, 'Bu bölümü atla'),
      el('button', { class: 'btn sm primary', onclick: finish }, 'Bitir')));
    timer = setInterval(() => { if (!body.isConnected) { finish(); return; } if (DJ.pending == null && i < steps.length) { i++; show(); } }, 80);
    show();
  }

  // ---------------- Pencere ----------------
  C.open = function () {
    const s = S(), devices = el('div', { class: 'ctrl-list' }), logBox = el('div', { class: 'ctrl-log mono' }), wizBox = el('div', { class: 'ctrl-wiz' });
    C.drawDevices = () => {
      if (!devices.isConnected && C._drawn) { C.drawDevices = null; return; }
      C._drawn = true; devices.innerHTML = '';
      const row = (name, kind, out) => el('div', { class: 'lib-row q-row' }, el('span', { class: 'mono' }, kind), el('span', { class: 'ln' }, name), el('span', { class: 'muted' }, out ? OS.t('Işık çıkışı var') : ''),
        el('button', { class: 'btn sm', onclick: () => C.saveProfile(name) }, 'Profil kaydet'),
        (s.profiles && s.profiles[name]) ? el('button', { class: 'btn sm', onclick: () => { C.loadProfile(name); U.toast(OS.t('Profil yüklendi')); } }, 'Profili yükle') : null);
      midiIns().forEach(i => devices.appendChild(row(i.name, 'MIDI', midiOuts().some(o => o.name === i.name))));
      C.hid.forEach(h => devices.appendChild(row(h.name, 'HID')));
      if (!midiIns().length && !C.hid.length) devices.appendChild(el('div', { class: 'muted' }, OS.t(OS.midiAccess ? 'Bağlı controller yok. USB’yi takın; liste kendiliğinden yenilenir.' : !navigator.requestMIDIAccess ? 'Bu tarayıcı MIDI desteklemiyor. iPhone ve iPad’de hiçbir tarayıcıda yoktur; Mac’te Safari’de de yoktur.' : 'MIDI izni verilmedi veya tarayıcı desteklemiyor.')));
    };
    C.drawLog = () => {
      if (!logBox.isConnected && C._logDrawn) { C.drawLog = null; return; }
      C._logDrawn = true;
      logBox.innerHTML = '';
      if (!C.log.length) logBox.appendChild(el('div', { class: 'muted' }, OS.t('Controller’da bir kontrole dokunun; sinyal burada görünür.')));
      C.log.forEach(l => logBox.appendChild(el('div', null, l.key + (l.hex ? '  [' + l.hex + ']' : '') + (l.action ? '  → ' + l.action : ''))));
    };
    const body = el('div', { class: 'ctrl-center' },
      el('b', null, OS.t('Bağlı cihazlar')), devices,
      el('div', { class: 'row wrap' },
        el('button', { class: 'btn sm primary', onclick: () => wizard(wizBox, () => { wizBox.innerHTML = ''; wizBox.appendChild(el('div', { class: 'muted' }, OS.t('Eşleme tamamlandı. Yukarıdan “Profil kaydet” ile cihaza kaydedin.'))); DJ.render(); }) }, 'Eşleme sihirbazını başlat'),
        C.hidSupported() ? el('button', { class: 'btn sm', title: OS.t('MIDI modu olmayan controller için. Cihaz seçildikten sonra 2 saniye dokunmayın.'), onclick: C.addHid }, 'HID cihazı ekle (deneysel)') : null),
      wizBox,
      el('b', null, OS.t('Ayarlar')),
      el('div', { class: 'form-grid' },
        OS.t('Jog / enkoder biçimi'), el('select', { onchange: e => { s.jogMode = e.target.value; save(); } }, [['auto', 'Otomatik'], ['twos', 'İkiye tümleyen (1…63 / 127…65)'], ['offset', 'Merkez 64 (63 / 65)'], ['sign', 'İşaret biti (1…63 / 65…127)']].map(([v, l]) => el('option', { value: v, selected: v === (s.jogMode || 'auto') }, l))),
        OS.t('Yumuşak devralma'), el('label', { class: 'field', title: OS.t('Fader ekrandaki değere ulaşana kadar ses sıçramaz') }, el('input', { type: 'checkbox', checked: !!s.soft, onchange: e => { s.soft = e.target.checked; save(); } }), OS.t('Fader ve tempo için açık'))),
      el('b', null, OS.t('Canlı sinyal')), logBox,
      el('b', null, OS.t('Bilgisayar klavyesi')),
      el('div', { class: 'form-grid' }, DJ.KEY_HELP.flatMap(([k, d]) => [el('span', { class: 'mono' }, k), OS.t(d)])),
      el('p', { class: 'muted' }, 'USB’den standart MIDI gönderen controller’lar sürücü veya lisans istemeden çalışır; her kontrol sihirbazla bir kez eşlenir. Bazı modeller önce üreticinin sürücüsünü veya bir MIDI moduna geçirilmeyi ister. Yalnızca kendi HID protokolünü kullanan modellerde deneysel HID yolu dener; ışıklar ve yüksek çözünürlüklü jog bu yolda çalışmaz.'));
    C.log.length = 0; C._drawn = false; C._logDrawn = false;
    const m = U.modal(OS.t('Controller Merkezi'), body, [{ label: 'Kapat', onclick: () => { DJ.learn = false; DJ.pending = null; } }]);
    C.drawDevices(); C.drawLog();
    return m;
  };
})(window.OS);
