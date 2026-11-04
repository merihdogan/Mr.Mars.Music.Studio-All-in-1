/* Mr. Mars Music Studio · MRH DGN — Telefona Gönder: üretilen parçayı veya DJ mixini MP3, WAV ya da MP4 olarak
   QR kodla eşleşen telefona doğrudan gönderir. Dosya hiçbir sunucuya yüklenmez. */
(function (OS) {
  const U = OS.U, el = U.el, ui = OS.ui, E = OS.engine, Link = window.OSLink;
  const PAGE = 'https://merihdogan.github.io/Mr.Mars.Music.Studio-All-in-1/telefon.html';
  const P = OS.phone = { base: null, link: null, stream: null };
  const pageUrl = () => P.base || (/^https?:$/.test(location.protocol) ? new URL('telefon.html', location.href).href : PAGE);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const addScript = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('script ' + src)); document.head.appendChild(s); });
  const once = {}; const lazy = src => (once[src] = once[src] || addScript(src));
  const safe = s => String(s || 'mix').replace(/[\\/:*?"<>|]/g, '_').trim() || 'mix';
  const stamp = () => new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');

  // ---------------- Kaynak: proje veya DJ belleği ----------------
  async function getAudio(source) {
    if (source === 'dj') {
      const M = ui.dj && ui.dj.mem;
      if (!M || !M.mr) throw new Error(OS.t('Henüz gönderilecek DJ mixi yok. Önce bir parça çalın.'));
      const blob = await M.blob();
      return { buffer: await E.init().decodeAudioData(await blob.arrayBuffer()), name: 'dj-set-' + stamp() };
    }
    const has = OS.project.tracks.some(t => t.clips.length);
    if (!has) throw new Error(OS.t('Projede gönderilecek klip yok'));
    const buffer = await E.render({ sampleRate: 44100, tail: source === 'loop' ? 0.5 : 3, loopOnly: source === 'loop' });
    return { buffer, name: safe(OS.project.name) };
  }

  // ---------------- MP3 ----------------
  async function toMp3(ab, name, kbps, prog) {
    await lazy('mrmars-cekirdek/mp3kod.js');
    const sr = ab.sampleRate === 48000 ? 48000 : 44100;
    const enc = new window.lamejs.Mp3Encoder(2, sr, kbps), L = ab.getChannelData(0), R = ab.numberOfChannels > 1 ? ab.getChannelData(1) : L;
    if (ab.sampleRate !== sr) throw new Error('sample rate ' + ab.sampleRate);
    const parts = [], step = 1152 * 40, l = new Int16Array(step), r = new Int16Array(step);
    const conv = (s, o, d, n) => { for (let i = 0; i < n; i++) { const v = s[o + i]; d[i] = v >= 1 ? 32767 : v <= -1 ? -32768 : v * 32767; } };
    for (let o = 0; o < L.length; o += step) {
      const n = Math.min(step, L.length - o);
      conv(L, o, l, n); conv(R, o, r, n);
      const b = enc.encodeBuffer(l.subarray(0, n), r.subarray(0, n));
      if (b.length) parts.push(new Uint8Array(b));
      prog(o / L.length); await wait(0);
    }
    const end = enc.flush(); if (end.length) parts.push(new Uint8Array(end));
    return new File(parts, name + '.mp3', { type: 'audio/mpeg' });
  }

  // ---------------- MP4 (H.264 + AAC) ----------------
  const u32 = v => [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255];
  const u16 = v => [(v >>> 8) & 255, v & 255];
  const str = s => Array.from(s, c => c.charCodeAt(0));
  const zeros = n => new Array(n).fill(0);
  function box(type, ...parts) {
    const flat = parts.map(p => (p instanceof Uint8Array ? p : new Uint8Array(p))), size = flat.reduce((a, p) => a + p.length, 8), out = new Uint8Array(size);
    out.set(u32(size), 0); out.set(str(type), 4);
    let o = 8; flat.forEach(p => { out.set(p, o); o += p.length; });
    return out;
  }
  const full = (type, flags, ...parts) => box(type, u32(flags), ...parts);
  const MATRIX = [...u32(0x10000), ...zeros(12), ...u32(0x10000), ...zeros(12), ...u32(0x40000000)];
  function tableBoxes(t, chunkOffsets) {
    const list = [];
    const runs = []; t.samples.forEach(s => { const r = runs[runs.length - 1]; if (r && r[1] === s.dur) r[0]++; else runs.push([1, s.dur]); });
    list.push(full('stts', 0, u32(runs.length), ...runs.flatMap(r => [...u32(r[0]), ...u32(r[1])]).reduce((a, x) => (a.push(x), a), []).length ? [runs.flatMap(r => [...u32(r[0]), ...u32(r[1])])] : []));
    if (t.video) { const keys = []; t.samples.forEach((s, i) => { if (s.key) keys.push(i + 1); }); list.push(full('stss', 0, u32(keys.length), keys.flatMap(k => u32(k)))); }
    const stsc = []; t.chunks.forEach((n, i) => { if (!stsc.length || stsc[stsc.length - 1][1] !== n) stsc.push([i + 1, n]); });
    list.push(full('stsc', 0, u32(stsc.length), stsc.flatMap(e => [...u32(e[0]), ...u32(e[1]), ...u32(1)])));
    list.push(full('stsz', 0, u32(0), u32(t.samples.length), t.samples.flatMap(s => u32(s.data.length))));
    list.push(full('stco', 0, u32(chunkOffsets.length), chunkOffsets.flatMap(o => u32(o))));
    return list;
  }
  function trackBox(id, t, offsets, seconds) {
    const durMs = Math.round(seconds * 1000), durT = t.samples.reduce((a, s) => a + s.dur, 0);
    const tkhd = full('tkhd', 3, u32(0), u32(0), u32(id), u32(0), u32(durMs), zeros(8), u16(0), u16(0), u16(t.video ? 0 : 0x100), u16(0), MATRIX, u32((t.video ? t.w : 0) * 65536), u32((t.video ? t.h : 0) * 65536));
    const mdhd = full('mdhd', 0, u32(0), u32(0), u32(t.scale), u32(durT), u16(0x55c4), u16(0));
    const hdlr = full('hdlr', 0, u32(0), str(t.video ? 'vide' : 'soun'), zeros(12), str(t.video ? 'Video' : 'Sound'), [0]);
    const dinf = box('dinf', full('dref', 0, u32(1), full('url ', 1)));
    const stsd = full('stsd', 0, u32(1), t.video
      ? box('avc1', zeros(6), u16(1), zeros(16), u16(t.w), u16(t.h), u32(0x480000), u32(0x480000), u32(0), u16(1), zeros(32), u16(24), u16(0xffff), box('avcC', t.config))
      : box('mp4a', zeros(6), u16(1), zeros(8), u16(2), u16(16), zeros(4), u32(t.scale * 65536), esds(t.config, t.bitrate)));
    const stbl = box('stbl', stsd, ...tableBoxes(t, offsets));
    const media = box('minf', t.video ? full('vmhd', 1, zeros(8)) : full('smhd', 0, zeros(4)), dinf, stbl);
    return box('trak', tkhd, box('mdia', mdhd, hdlr, media));
  }
  function esds(asc, bitrate) {
    const cfg = Array.from(asc), dcd = [0x40, 0x15, 0, 0, 0, ...u32(bitrate), ...u32(bitrate), 5, cfg.length, ...cfg];
    const es = [...u16(1), 0, 4, dcd.length, ...dcd, 6, 1, 2];
    return full('esds', 0, [3, es.length, ...es]);
  }
  function muxMp4(video, audio, seconds, name) {
    // Ses ~1 sn'lik öbekler, video kare kare: oynatıcı için zamanca iç içe
    const groups = [];
    let ai = 0, vi = 0; const perChunk = Math.max(1, Math.round(audio.scale / 1024));
    audio.chunks = []; video.chunks = [];
    while (ai < audio.samples.length || vi < video.samples.length) {
      if (vi < video.samples.length) { groups.push({ t: video, from: vi, n: 1 }); video.chunks.push(1); vi++; }
      if (ai < audio.samples.length) { const n = Math.min(perChunk, audio.samples.length - ai); groups.push({ t: audio, from: ai, n }); audio.chunks.push(n); ai += n; }
    }
    const ftyp = box('ftyp', str('isom'), u32(0x200), str('isomiso2avc1mp41'));
    const durMs = Math.round(seconds * 1000);
    const mvhd = full('mvhd', 0, u32(0), u32(0), u32(1000), u32(durMs), u32(0x10000), u16(0x100), u16(0), zeros(8), MATRIX, zeros(24), u32(3));
    const moov = (vo, ao) => box('moov', mvhd, trackBox(1, video, vo, seconds), trackBox(2, audio, ao, seconds));
    const headSize = ftyp.length + moov(video.chunks.map(() => 0), audio.chunks.map(() => 0)).length + 8;
    const vo = [], ao = []; let at = headSize; const parts = [];
    groups.forEach(g => { (g.t === video ? vo : ao).push(at); for (let i = 0; i < g.n; i++) { const d = g.t.samples[g.from + i].data; parts.push(d); at += d.length; } });
    const mdatSize = at - headSize + 8;
    return new File([ftyp, moov(vo, ao), new Uint8Array(u32(mdatSize)), new Uint8Array(str('mdat')), ...parts], name + '.mp4', { type: 'video/mp4' });
  }
  async function encodeAudioAac(ab, prog) {
    const sr = ab.sampleRate, bitrate = 192000, cfg = { codec: 'mp4a.40.2', sampleRate: sr, numberOfChannels: 2, bitrate };
    if (!window.AudioEncoder || !(await AudioEncoder.isConfigSupported(cfg)).supported) throw new Error(OS.t('Bu tarayıcı MP4 üretemiyor. MP3 veya WAV seçin.'));
    const t = { video: false, scale: sr, bitrate, samples: [], config: null };
    let fail = null;
    const enc = new AudioEncoder({ output: (c, meta) => { if (meta && meta.decoderConfig && meta.decoderConfig.description && !t.config) t.config = new Uint8Array(meta.decoderConfig.description); const d = new Uint8Array(c.byteLength); c.copyTo(d); t.samples.push({ data: d, dur: 1024 }); }, error: e => { fail = e; } });
    enc.configure(cfg);
    const L = ab.getChannelData(0), R = ab.numberOfChannels > 1 ? ab.getChannelData(1) : L, step = 4096;
    for (let o = 0; o < L.length; o += step) {
      if (fail) throw fail;
      const n = Math.min(step, L.length - o), buf = new Float32Array(n * 2); buf.set(L.subarray(o, o + n), 0); buf.set(R.subarray(o, o + n), n);
      const a = new AudioData({ format: 'f32-planar', sampleRate: sr, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round(o / sr * 1e6), data: buf });
      enc.encode(a); a.close();
      if (o % (step * 32) === 0) { prog(o / L.length * 0.5); while (enc.encodeQueueSize > 64) await wait(5); await wait(0); }
    }
    await enc.flush(); enc.close();
    if (fail) throw fail; if (!t.config) throw new Error('AAC config');
    return t;
  }
  async function encodeCoverVideo(ab, title, prog) {
    const W = 720, H = 720, cfg = { codec: 'avc1.42001f', width: W, height: H, bitrate: 400000, framerate: 1, avc: { format: 'avc' } };
    if (!window.VideoEncoder || !(await VideoEncoder.isConfigSupported(cfg)).supported) throw new Error(OS.t('Bu tarayıcı MP4 üretemiyor. MP3 veya WAV seçin.'));
    const scale = 90000, t = { video: true, scale, w: W, h: H, samples: [], config: null };
    let fail = null;
    const enc = new VideoEncoder({ output: (c, meta) => { if (meta && meta.decoderConfig && meta.decoderConfig.description && !t.config) t.config = new Uint8Array(meta.decoderConfig.description); const d = new Uint8Array(c.byteLength); c.copyTo(d); t.samples.push({ data: d, dur: scale, key: c.type === 'key' }); }, error: e => { fail = e; } });
    enc.configure(cfg);
    // Kapak: ad ve dalga biçimi, üstünde ilerleyen çizgi
    const cv = new OffscreenCanvas(W, H), g = cv.getContext('2d'), L = ab.getChannelData(0), bars = 150, peaks = new Float32Array(bars), span = Math.max(1, Math.floor(L.length / bars));
    for (let i = 0; i < bars; i++) { let p = 0; for (let j = i * span, e = Math.min(L.length, j + span); j < e; j += 37) p = Math.max(p, Math.abs(L[j])); peaks[i] = p; }
    const seconds = ab.duration, frames = Math.max(1, Math.ceil(seconds));
    const paint = k => {
      g.fillStyle = '#10141a'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#4fd1c5'; g.font = 'bold 34px sans-serif'; g.textAlign = 'center'; g.fillText('Mr. Mars Music Studio', W / 2, 90);
      g.fillStyle = '#e8edf2'; g.font = '30px sans-serif'; g.fillText(String(title).slice(0, 38), W / 2, 150);
      const bw = (W - 80) / bars, mid = H / 2 + 30;
      for (let i = 0; i < bars; i++) { const h = Math.max(2, peaks[i] * 200); g.fillStyle = i / bars <= k ? '#4fd1c5' : '#37414d'; g.fillRect(40 + i * bw, mid - h, Math.max(1, bw - 1), h * 2); }
      const s = Math.floor(k * seconds), f = v => String(v).padStart(2, '0');
      g.fillStyle = '#9aa7b4'; g.font = '26px monospace'; g.fillText(f(Math.floor(s / 60)) + ':' + f(s % 60), W / 2, H - 60);
    };
    for (let i = 0; i < frames; i++) {
      if (fail) throw fail;
      paint(i / frames);
      const fr = new VideoFrame(cv, { timestamp: i * 1e6, duration: 1e6 });
      enc.encode(fr, { keyFrame: i % 4 === 0 }); fr.close();
      prog(0.5 + i / frames * 0.5);
      while (enc.encodeQueueSize > 8) await wait(5);
      if (i % 8 === 0) await wait(0);
    }
    await enc.flush(); enc.close();
    if (fail) throw fail; if (!t.config) throw new Error('H264 config');
    return t;
  }
  async function toMp4(ab, name, prog) {
    const a = await encodeAudioAac(ab, prog), v = await encodeCoverVideo(ab, name, prog);
    return muxMp4(v, a, ab.duration, name);
  }

  // ---------------- Dosyayı hazırla ----------------
  P.makeFile = async function (source, format, prog) {
    prog = prog || (() => { });
    const { buffer, name } = await getAudio(source);
    if (format === 'wav') return new File([U.encodeWav([buffer.getChannelData(0), buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : buffer.getChannelData(0)], buffer.sampleRate, 16)], name + '.wav', { type: 'audio/wav' });
    if (format === 'mp4') return toMp4(buffer, name, prog);
    return toMp3(buffer, name, 192, prog);
  };

  // ---------------- Kamera ve QR okuma ----------------
  async function decodeCanvas(cv) {
    await lazy('mrmars-cekirdek/qroku.js');
    const g = cv.getContext('2d', { willReadFrequently: true }), im = g.getImageData(0, 0, cv.width, cv.height), r = window.jsQR(im.data, im.width, im.height, { inversionAttempts: 'dontInvert' });
    return r ? r.data : null;
  }
  P.decodeImage = async function (src) {
    const img = new Image(); img.src = src; await img.decode();
    const cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight; cv.getContext('2d').drawImage(img, 0, 0);
    return decodeCanvas(cv);
  };
  function stopCamera() {
    if (P.scanTimer) { clearTimeout(P.scanTimer); P.scanTimer = null; }
    if (P.stream) { P.stream.getTracks().forEach(t => t.stop()); P.stream = null; }
  }
  // Telefonun gösterdiği kodu okuyup bağlantıyı tamamlar
  async function runCamera(video, onCode, onFail) {
    try {
      P.stream = P.testStream || await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } }, audio: false });
    } catch (e) { onFail(e); return; }
    video.srcObject = P.stream; video.muted = true; video.playsInline = true;
    try { await video.play(); } catch (e) { }
    const cv = document.createElement('canvas');
    const tick = async () => {
      if (!P.stream) return;
      if (video.videoWidth) {
        cv.width = video.videoWidth; cv.height = video.videoHeight; cv.getContext('2d', { willReadFrequently: true }).drawImage(video, 0, 0);
        const code = await decodeCanvas(cv);
        if (code && code.startsWith(Link.PREFIX)) { onCode(code); return; }
      }
      P.scanTimer = setTimeout(tick, 180);
    };
    tick();
  }

  // ---------------- Bağlantı ----------------
  P.isOpen = () => !!(P.link && P.link.dc.readyState === 'open');
  P.disconnect = () => { stopCamera(); if (P.link) { try { P.link.pc.close(); } catch (e) { } } P.link = null; };
  P.connect = async function () {
    P.disconnect();
    const l = await Link.createOffer([]);
    P.link = l; l.url = pageUrl() + '#o=' + l.code;
    return l;
  };
  P.accept = code => Link.acceptAnswer(P.link.pc, code);
  P.send = async function (source, format, onStatus) {
    const dc = P.link.dc, say = (txt, k) => { onStatus(txt, k); try { dc.send(JSON.stringify({ kind: 'status', text: txt })); } catch (e) { } };
    say(OS.t('Hazırlanıyor…'), 0);
    const file = await P.makeFile(source, format, k => onStatus(OS.t('Hazırlanıyor…'), k));
    onStatus(OS.t('Gönderiliyor…'), 0);
    await Link.sendFile(dc, file, file.name, k => onStatus(OS.t('Gönderiliyor…'), k));
    return file;
  };

  // ---------------- Pencere ----------------
  const mb = n => (n / 1048576).toFixed(1) + ' MB';
  P.open = function () {
    const view = (document.querySelector('#tabs button.active') || {}).dataset; const isDj = view && view.view === 'dj';
    const srcSel = el('select', null, el('option', { value: 'dj', selected: isDj }, OS.t('DJ Mixer: son mix (en çok 30 dk)')), el('option', { value: 'project', selected: !isDj }, OS.t('Proje: tüm şarkı')), el('option', { value: 'loop' }, OS.t('Proje: yalnız döngü bölgesi')));
    const fmtSel = el('select', null, el('option', { value: 'mp3' }, 'MP3 (192 kbps)'), el('option', { value: 'wav' }, 'WAV (16-bit)'), el('option', { value: 'mp4' }, OS.t('MP4 (video kapaklı)')));
    const status = el('div', { class: 'muted', style: 'min-height:1.4em' }), bar = el('div', { style: 'height:6px;width:0;background:var(--acc);border-radius:3px;transition:width .15s' }), barBox = el('div', { style: 'height:6px;background:var(--bg);border-radius:3px;overflow:hidden' }, bar);
    const qr = el('canvas', { style: 'width:min(340px,70vw);height:auto;background:#fff;border-radius:6px;display:none;image-rendering:pixelated' }), video = el('video', { style: 'width:300px;height:300px;object-fit:cover;background:#000;border-radius:6px;display:none' });
    const stepA = el('div', { style: 'display:none;flex-direction:column;align-items:center;gap:6px' }, el('b', null, OS.t('1. Bu kodu telefonun kamerasıyla okutun')), qr);
    const stepB = el('div', { style: 'display:none;flex-direction:column;align-items:center;gap:6px' }, el('b', null, OS.t('2. Telefonda çıkan kodu bu kameraya gösterin')), video);
    const paste = el('input', { class: 'inp', placeholder: OS.t('Kamera yoksa telefondaki kodu buraya yapıştırın'), style: 'width:100%', onchange: () => useCode(paste.value.trim()) });
    const pasteRow = el('div', { style: 'display:none' }, paste);
    const set = (txt, k) => { status.textContent = txt; bar.style.width = k == null ? '0' : Math.round(k * 100) + '%'; };
    const hint = el('p', { class: 'muted', style: 'margin:0' }, OS.t('Dosya sunucuya yüklenmez, doğrudan telefona gider. Telefon ve bilgisayar aynı Wi-Fi ağında olmalı.'));
    let sending = false;
    const sendNow = async () => {
      if (sending) return; sending = true; sendBtn.disabled = true;
      try { const f = await P.send(srcSel.value, fmtSel.value, set); set(OS.t('Gönderildi') + ': ' + f.name + ' · ' + mb(f.size), 1); }
      catch (e) { console.error(e); set(OS.t('Gönderilemedi') + ': ' + e.message); }
      sending = false; sendBtn.disabled = false;
    };
    const sendBtn = el('button', { class: 'btn primary', onclick: () => (P.isOpen() ? sendNow() : pair()) }, OS.t('QR kodu göster'));
    const onOpen = () => { stopCamera(); stepA.style.display = stepB.style.display = pasteRow.style.display = 'none'; hint.style.display = 'none'; sendBtn.textContent = OS.t('Telefona gönder'); set(OS.t('Telefon bağlandı')); sendNow(); };
    const useCode = async code => {
      if (!code) return;
      stopCamera(); set(OS.t('Bağlanıyor…'));
      try { await P.accept(code); } catch (e) { console.error(e); set(OS.t('Kod okunamadı, yeniden deneyin')); return; }
      P.connectTimer = setTimeout(() => { if (!P.isOpen()) set(OS.t('Bağlanılamadı. Telefon ve bilgisayarın aynı Wi-Fi ağında olduğundan emin olun.')); }, 15000);
    };
    async function pair() {
      sendBtn.disabled = true; set(OS.t('Bağlantı hazırlanıyor…'));
      try {
        const l = await P.connect();
        window.OSQR.draw(qr, l.url, 460); qr.style.display = 'block';
        stepA.style.display = stepB.style.display = 'flex'; pasteRow.style.display = 'block';
        l.dc.addEventListener('open', () => { clearTimeout(P.connectTimer); onOpen(); });
        l.dc.addEventListener('close', () => { sendBtn.textContent = OS.t('QR kodu göster'); set(OS.t('Bağlantı kapandı')); });
        video.style.display = 'block';
        runCamera(video, useCode, () => { video.style.display = 'none'; set(OS.t('Kamera açılamadı. Telefondaki kodu aşağıya yapıştırın.')); });
        set(OS.t('Telefon bekleniyor…'));
      } catch (e) { console.error(e); set(OS.t('Gönderilemedi') + ': ' + e.message); }
      sendBtn.disabled = false;
    }
    const body = el('div', { style: 'display:flex;flex-direction:column;gap:10px;width:min(660px,86vw)' },
      el('div', { class: 'row' }, el('label', { class: 'field' }, OS.t('Kaynak'), srcSel), el('label', { class: 'field' }, OS.t('Biçim'), fmtSel)),
      el('div', { style: 'display:flex;flex-wrap:wrap;justify-content:center;gap:16px' }, stepA, stepB), pasteRow, barBox, status, hint);
    if (P.isOpen()) { sendBtn.textContent = OS.t('Telefona gönder'); hint.style.display = 'none'; set(OS.t('Telefon bağlı')); }
    const m = U.modal(OS.t('Telefona Gönder'), body, [{ label: 'Kapat', onclick: () => { stopCamera(); } }]);
    m.box.querySelector('.modal-buttons').appendChild(sendBtn);
    P._dialog = { pair, useCode, sendNow, srcSel, fmtSel, status, sendBtn, qr };
  };
})(window.OS);
