/* Mr. Mars Music Studio · MRH DGN — Format Dönüştürücü: ses ve video dosyalarından toplu biçim dönüşümü, kalite ayarları, indirme.
   Bütün işlem bu bilgisayarda yapılır; dosya hiçbir yere yüklenmez. */
(function (OS) {
  const U = OS.U, el = U.el, Lab = OS.audioLab;
  const KINDS = [
    { id: 'wav', label: 'WAV', bits: [24, 16, 32], rates: true },
    { id: 'aiff', label: 'AIFF', bits: [24, 16], rates: true },
    { id: 'flac', label: 'FLAC', bits: [24, 16], rates: true, level: true },
    { id: 'alac', label: 'Apple Lossless (M4A)', bits: [24, 16], rates: true },
    { id: 'mp3', label: 'MP3', kbps: [320, 256, 224, 192, 160, 128, 96, 64], rates: [44100, 48000, 32000] },
    { id: 'aac', label: 'AAC (M4A)', kbps: [256, 192, 160, 128, 96], rates: [44100, 48000] },
    { id: 'opus', label: 'Opus (OGG)', kbps: [320, 256, 192, 160, 128, 96, 64] },
    { id: 'mp4', label: 'MP4 (video kapaklı)', rates: [44100, 48000] },
  ];
  const RATES = [22050, 32000, 44100, 48000, 88200, 96000, 176400, 192000];
  const state = { items: [], kind: 'flac', bits: 24, kbps: 320, sr: 0, level: 5 };
  const mb = n => (n / 1048576).toFixed(n < 1048576 ? 2 : 1) + ' MB';
  const stem = n => n.replace(/\.[^.]+$/, '');
  const sec = s => { s = Math.round(s); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

  OS.converter = { state, KINDS };
  OS.converter.add = async function (file, redraw) {
    const it = { file, out: stem(file.name), status: OS.t('Okunuyor…'), audio: null, result: null };
    state.items.push(it); redraw();
    try { it.audio = await Lab.readFile(file); it.before = Lab.measure(it.audio.L, it.audio.R, it.audio.sr); it.status = OS.t('Hazır'); }
    catch (e) { console.warn(e); it.status = e.message; it.bad = true; }
    redraw();
    return it;
  };
  OS.converter.convert = async function (it, onProg) {
    const k = KINDS.find(x => x.id === state.kind), a = it.audio;
    const target = k.id === 'opus' ? 48000 : state.sr || (k.rates === true ? 0 : (k.rates || []).includes(a.sr) ? a.sr : k.rates ? k.rates[0] : 0);
    const q = await Lab.process(a.L, a.R, a.sr, Lab.settings, target, p => onProg(p * 0.5));
    const meta = Object.assign({}, Lab.meta, { title: Lab.meta.title || it.out });
    const spec = { kind: k.id, bits: state.bits, kbps: state.kbps, level: state.level };
    if (k.bits && !k.bits.includes(spec.bits)) spec.bits = k.bits[0];
    if (k.kbps && !k.kbps.includes(spec.kbps)) spec.kbps = k.kbps[0];
    const f = await Lab.encode(q, spec, it.out, meta, p => onProg(0.5 + p * 0.5), Lab.settings.dither);
    return { file: f, report: q };
  };

  OS.converter.open = function () {
    const list = el('div', { style: 'display:flex;flex-direction:column;gap:6px;max-height:34vh;overflow:auto' });
    const bar = el('div', { style: 'height:6px;width:0;background:var(--acc);border-radius:3px' }), status = el('div', { class: 'muted', style: 'min-height:1.3em' });
    const opt = el('div', { class: 'row', style: 'justify-content:center;gap:12px' });
    const redraw = () => {
      list.innerHTML = '';
      if (!state.items.length) list.appendChild(el('div', { class: 'muted', style: 'text-align:center;padding:12px' }, OS.t('Henüz dosya yok')));
      state.items.forEach((it, i) => {
        const b = it.before, info = it.audio ? [sec(b.seconds), (it.audio.sr / 1000).toFixed(it.audio.sr % 1000 ? 1 : 0) + ' kHz', it.audio.channels === 1 ? 'Mono' : 'Stereo', it.audio.bits ? it.audio.bits + '-bit' : '', Lab.dbStr(b.lufs) + ' LUFS', Lab.dbStr(b.truePeakDb) + ' dBTP'].filter(Boolean).join(' · ') : '';
        const r = it.result, after = r ? [r.file.name, mb(r.file.size), r.report ? Lab.dbStr(r.report.after.lufs) + ' LUFS' : '', r.report ? Lab.dbStr(r.report.after.truePeakDb) + ' dBTP' : '', r.file.kbps ? r.file.kbps + ' kbps' : ''].filter(Boolean).join(' · ') : '';
        const name = el('input', { class: 'inp', value: it.out, style: 'flex:1;min-width:120px', onchange: e => { it.out = e.target.value.trim() || stem(it.file.name); } });
        list.appendChild(el('div', { class: 'conv-item', style: 'border:1px solid var(--line2);border-radius:6px;padding:6px 8px;display:flex;flex-direction:column;gap:4px' },
          el('div', { class: 'row', style: 'flex-wrap:nowrap' }, name,
            r ? el('button', { class: 'btn sm primary', onclick: () => U.download(r.file, r.file.name) }, OS.t('İndir')) : null,
            r && OS.phone.isOpen() ? el('button', { class: 'btn sm', onclick: () => OS.phone.sendReady(r.file) }, OS.t('Telefona')) : null,
            el('button', { class: 'btn sm', title: OS.t('Listeden çıkar'), onclick: () => { state.items.splice(i, 1); redraw(); } }, '×')),
          el('div', { class: 'muted', style: 'font-size:12px' }, it.file.name + (info ? ' · ' + info : '') + ' · ' + it.status),
          r ? el('div', { style: 'font-size:12px;color:var(--acc)' }, '→ ' + after) : null,
          r && /^(audio|video)/.test(r.file.type) ? el('audio', { controls: true, src: r.url, style: 'width:100%;height:32px' }) : null));
      });
    };
    const addFiles = async fl => { for (const f of fl) await OS.converter.add(f, redraw); };
    const drawOpts = () => {
      opt.innerHTML = '';
      const k = KINDS.find(x => x.id === state.kind);
      const sel = (label, options, val, on) => el('label', { class: 'field' }, OS.t(label), el('select', { onchange: e => { on(e.target.value); drawOpts(); } }, options.map(([v, t]) => el('option', { value: v, selected: String(v) === String(val) }, t))));
      opt.appendChild(sel('Biçim', KINDS.map(x => [x.id, OS.t(x.label)]), state.kind, v => { state.kind = v; const n = KINDS.find(x => x.id === v); if (n.rates && n.rates !== true && state.sr && !n.rates.includes(state.sr)) state.sr = 0; }));
      if (k.bits) opt.appendChild(sel('Bit derinliği', k.bits.map(b => [b, b === 32 ? '32-bit float' : b + '-bit']), k.bits.includes(state.bits) ? state.bits : k.bits[0], v => { state.bits = +v; }));
      if (k.kbps) opt.appendChild(sel('Bit hızı', k.kbps.map(b => [b, b + ' kbps']), k.kbps.includes(state.kbps) ? state.kbps : k.kbps[0], v => { state.kbps = +v; }));
      if (k.rates) opt.appendChild(sel('Örnekleme hızı', [[0, OS.t('Kaynak gibi')]].concat((k.rates === true ? RATES : k.rates).map(r => [r, (r / 1000) + ' kHz'])), state.sr, v => { state.sr = +v; }));
      if (k.level) opt.appendChild(sel('Sıkıştırma', [[0, '0 ' + OS.t('(hızlı)')], [2, '2'], [5, '5'], [8, '8 ' + OS.t('(en küçük)')]], state.level, v => { state.level = +v; }));
    };
    const drop = el('div', { class: 'reinst-drop', style: 'padding:12px;text-align:center;border:1px dashed var(--line2);border-radius:6px' }, OS.t('Dosyaları buraya sürükleyin'),
      el('div', { class: 'row', style: 'justify-content:center;margin-top:6px' },
        el('button', { class: 'btn sm', onclick: async () => addFiles(await U.pickFiles('audio/*,video/*,.flac,.aif,.aiff,.opus,.m4a', true)) }, OS.t('Dosya ekle…')),
        el('button', { class: 'btn sm', onclick: async () => { const u = await U.prompt(OS.t('Dosya adresi (URL)'), 'https://'); if (!u) return; try { const r = await fetch(u); if (!r.ok) throw new Error(r.status); const b = await r.blob(); await addFiles([new File([b], decodeURIComponent(new URL(u).pathname.split('/').pop()) || 'url', { type: b.type })]); } catch (e) { status.textContent = OS.t('Bu adresten dosya alınamadı. Site izin vermiyor olabilir; dosyayı indirip ekleyin.'); } } }, OS.t('Adresten ekle…'))));
    drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('drop-hint'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('drop-hint'));
    drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('drop-hint'); addFiles([...e.dataTransfer.files]); });
    const go = el('button', { class: 'btn primary', onclick: async () => {
      const todo = state.items.filter(i => i.audio); if (!todo.length) { status.textContent = OS.t('Önce dosya ekleyin'); return; }
      go.disabled = true;
      for (let n = 0; n < todo.length; n++) {
        const it = todo[n]; it.status = OS.t('Dönüştürülüyor…'); redraw();
        try { if (it.result && it.result.url) URL.revokeObjectURL(it.result.url); it.result = await OS.converter.convert(it, p => { bar.style.width = Math.round((n + p) / todo.length * 100) + '%'; status.textContent = it.out + ' · ' + Math.round(p * 100) + '%'; }); it.result.url = URL.createObjectURL(it.result.file); it.status = OS.t('Tamamlandı'); }
        catch (e) { console.error(e); it.result = null; it.status = OS.t('Hata') + ': ' + e.message; }
        redraw();
      }
      go.disabled = false; status.textContent = OS.t('Dönüştürme bitti'); bar.style.width = '100%';
    } }, OS.t('Dönüştür'));
    const zip = el('button', { class: 'btn', onclick: async () => { const fs = state.items.filter(i => i.result).map(i => i.result.file); if (!fs.length) { status.textContent = OS.t('Önce dönüştürün'); return; } zip.disabled = true; status.textContent = OS.t('ZIP hazırlanıyor…'); const z = await Lab.zip(fs, 'mr-mars-donusum.zip'); U.download(z, z.name); status.textContent = z.name + ' · ' + mb(z.size); zip.disabled = false; } }, OS.t('Tümünü ZIP indir'));
    const body = el('div', { style: 'display:flex;flex-direction:column;gap:8px;width:min(820px,88vw)' }, drop, list, opt, Lab.panel(null), el('div', { style: 'height:6px;background:var(--bg);border-radius:3px;overflow:hidden' }, bar), status,
      el('p', { class: 'muted', style: 'margin:0;font-size:12px' }, OS.t('Dosyalar bu bilgisayarda işlenir, hiçbir yere yüklenmez. Sıkıştırılmış bir dosyayı kayıpsız biçime çevirmek kaybolan kaliteyi geri getirmez.')));
    const m = U.modal(OS.t('Format Dönüştürücü'), body, [{ label: 'Kapat' }]);
    m.box.querySelector('.modal-buttons').append(zip, go);
    drawOpts(); redraw();
    OS.converter._ui = { go, zip, status, redraw };
  };
})(window.OS);
