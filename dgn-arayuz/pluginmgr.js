/* Mr. Mars Music Studio · MRH DGN — eklenti yöneticisi: dış eklenti yükleme, listeleme, şablon */
(function (OS) {
  const U = OS.U, el = U.el, ui = OS.ui;
  const PM = ui.plugins = { sources: {} }; // pluginId -> 'Yerleşik' | 'Klasör: x.js' | 'Yüklendi: x.js'
  let root, currentSource = 'Yerleşik';

  OS.plugins.onRegister(def => { PM.sources[def.id] = currentSource; });
  OS.plugins.all().forEach(d => PM.sources[d.id] = 'Yerleşik');

  // Kod çalıştırma: eklentiler MrMars.register(...) çağırır
  PM.evalPlugin = function (code, label) {
    const prev = currentSource; currentSource = label;
    try { new Function('MrMars', code)(window.MrMars); return true; }
    catch (e) { console.error(e); U.toast('Eklenti hatası (' + label + '): ' + e.message, 5000); return false; }
    finally { currentSource = prev; }
  };

  // plugins/ klasöründeki dosyalar (plugins/index.js listesine yazılanlar)
  PM.loadFolder = async function () {
    for (const f of window.MRMARS_EKLENTILERI || []) {
      await new Promise(res => {
        const prev = currentSource; currentSource = 'Klasör: ' + f;
        const s = el('script', { src: 'mrmars-eklentiler/' + f });
        s.onload = () => { currentSource = prev; res(); };
        s.onerror = () => { currentSource = prev; console.warn('Eklenti yüklenemedi', f); res(); };
        document.body.appendChild(s);
      });
    }
  };

  PM.loadStored = async function () {
    const keys = await OS.store.keys('plugins').catch(() => []);
    for (const k of keys) { const r = await OS.store.get('plugins', k); if (r && r.code) PM.evalPlugin(r.code, 'Yüklendi: ' + k); }
  };

  PM.install = async function () {
    const files = await U.pickFiles('.js,text/javascript', true);
    for (const f of files) {
      const code = await U.readAsText(f);
      if (PM.evalPlugin(code, 'Yüklendi: ' + f.name)) { await OS.store.put('plugins', f.name, { code, date: Date.now() }); U.toast(f.name + ' yüklendi'); }
    }
    PM.render();
  };

  PM.init = function () { root = document.getElementById('view-plugins'); };

  PM.render = async function () {
    root.innerHTML = '';
    const stored = await OS.store.keys('plugins').catch(() => []);
    root.append(
      el('div', { class: 'row' },
        el('h2', { style: 'margin:0' }, 'Eklentiler'), el('span', { class: 'spacer' }),
        el('button', { class: 'btn primary', onclick: PM.install }, 'Eklenti Yükle (.js)…'),
        el('button', { class: 'btn', onclick: () => U.download(new Blob([TEMPLATE], { type: 'text/javascript' }), 'benim-eklentim.js') }, 'Eklenti şablonunu indir'),
        el('button', { class: 'btn', onclick: showApi }, 'API Belgesi')),
      el('div', { class: 'muted' }, 'Bu uygulamaya yeni efekt ve enstrümanlar eklenti olarak eklenir. Bir eklenti yüklediğinizde tüm parçalarda, mikserde ve Amfi Rack’te kullanılabilir. Eklentiyi kalıcı yapmanın iki yolu var: (1) buradan yükleyin (taşınabilir profilde saklanır) veya (2) dosyayı “plugins” klasörüne koyup adını plugins/index.js listesine ekleyin.'),
    );
    if (stored.length) {
      root.appendChild(el('h3', null, 'Yüklenen eklenti dosyaları'));
      const l = el('div', { class: 'plist' });
      stored.forEach(k => l.appendChild(el('div', { class: 'pcard row' }, el('span', { class: 'pn', style: 'flex:1' }, k),
        el('button', { class: 'btn sm danger', onclick: async () => { await OS.store.del('plugins', k); U.toast('Silindi. Değişiklik yeniden başlatınca tamamlanır.'); PM.render(); } }, 'Kaldır'))));
      root.appendChild(l);
    }
    const groups = {};
    OS.plugins.all().forEach(d => { const g = (d.type === 'instrument' ? 'Enstrümanlar' : 'Efektler') + ' › ' + d.category; (groups[g] = groups[g] || []).push(d); });
    Object.keys(groups).sort((a, b) => a.localeCompare(b, 'tr')).forEach(g => {
      root.appendChild(el('h3', { style: 'margin:8px 0 4px' }, g));
      const l = el('div', { class: 'plist' });
      groups[g].forEach(d => l.appendChild(el('div', { class: 'pcard' }, el('div', { class: 'pn' }, d.name), el('div', { class: 'pm' }, d.id + ' • ' + d.params.length + ' parametre • ' + (PM.sources[d.id] || 'Yerleşik')))));
      root.appendChild(l);
    });
  };

  function showApi() {
    U.modal('Eklenti API', el('div', { class: 'code', style: 'max-width:820px;max-height:60vh' }, API_DOC + '\n\n// ---- Örnek ----\n' + TEMPLATE));
  }

  const API_DOC = `MrMars.register(tanım)

tanım = {
  id:        'benzersiz.kimlik',
  name:      'Görünen ad',
  type:      'effect' | 'instrument',
  category:  'Menüde görünen grup',
  params:    [ { id, name, min, max, def, unit?, curve?: 'log', step?, type?: 'choice'|'bool', options?: [...] } ],
  presets?:  { 'Ön ayar adı': { paramId: değer, ... } },
  create(ctx, host) {          // ctx: AudioContext veya render için OfflineAudioContext
    // Web Audio düğümlerini kurun ve şunu döndürün:
    return {
      input,  output,            // AudioNode (enstrümanda yalnızca output)
      set(paramId, değer),       // parametre değişti
      noteOn(nota, velocity, zaman), noteOff(nota, zaman), allOff(),   // enstrümanlar
      save()  -> nesne,          // isteğe bağlı: projede saklanacak ek veri
      restore(nesne),            // isteğe bağlı: projeden geri yükleme (this.ready = Promise verebilir)
      dispose()                  // isteğe bağlı: temizlik
    };
  },
  ui(kutu, cihaz)              // isteğe bağlı: düğmelerin üstüne özel arayüz
}

host.device  : cihaz nesnesi (values, extra, setParam)
MrMars.utils : yardımcılar (dbToGain, curve, makeReverbIR, midiToFreq, el, knob ...)
Proje temposu : window.OS.transport.bpm`;

  const TEMPLATE = `// Mr. Mars Music Studio eklenti şablonu: basit "Lo-Fi Telefon" efekti
MrMars.register({
  id: 'kullanici.telefon',
  name: 'Telefon Efekti',
  type: 'effect',
  category: 'Kullanıcı Eklentileri',
  params: [
    { id: 'low',  name: 'Alt Sınır', min: 100,  max: 1000, def: 400,  unit: 'Hz', curve: 'log' },
    { id: 'high', name: 'Üst Sınır', min: 1500, max: 8000, def: 3000, unit: 'Hz', curve: 'log' },
    { id: 'drive', name: 'Bozulma', min: 1, max: 20, def: 3 },
  ],
  create(ctx) {
    const U = MrMars.utils;
    const hp = ctx.createBiquadFilter(), lp = ctx.createBiquadFilter(), ws = ctx.createWaveShaper();
    hp.type = 'highpass'; lp.type = 'lowpass';
    hp.connect(ws); ws.connect(lp);
    return {
      input: hp, output: lp,
      set(id, v) {
        if (id === 'low') hp.frequency.value = v;
        if (id === 'high') lp.frequency.value = v;
        if (id === 'drive') ws.curve = U.curve('soft', v);
      },
    };
  },
});
`;
  PM.TEMPLATE = TEMPLATE;
})(window.OS);
