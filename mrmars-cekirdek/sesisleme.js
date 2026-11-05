/* Mr. Mars Music Studio · MRH DGN — ses kalite motoru: yüksek kaliteli örnekleme dönüşümü, EBU R128 / BS.1770 ses yüksekliği,
   gerçek tepe sınırlayıcı, ton, stereo ve düzenleme adımları; dosya yazıcılar (WAV, AIFF, FLAC, ALAC, MP3, AAC, OPUS) ve ZIP */
(function (OS) {
  const Lab = OS.audioLab = {};
  const tick = () => new Promise(r => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); });
  const db2g = d => Math.pow(10, d / 20), g2db = g => 20 * Math.log10(Math.max(1e-9, g));

  // ---------------- Örnekleme hızı dönüşümü: Kaiser pencereli sinc, örtüşmeyi keser ----------------
  const bessel = x => { let s = 1, t = 1; for (let k = 1; k < 30; k++) { t *= (x / (2 * k)) * (x / (2 * k)); s += t; if (t < 1e-12 * s) break; } return s; };
  Lab.resample = async function (x, from, to, prog) {
    if (from === to) return x;
    const ratio = to / from, cut = Math.min(1, ratio) * 0.97, half = Math.ceil(32 / Math.min(1, cut)), beta = 12, phases = 1024, n = Math.round(x.length * ratio), out = new Float32Array(n);
    const tab = new Float32Array((phases + 1) * (2 * half)), ib = 1 / bessel(beta);
    for (let p = 0; p <= phases; p++) for (let i = 0; i < 2 * half; i++) {
      const t = i - half + 1 - p / phases, u = t / half, w = Math.abs(u) >= 1 ? 0 : bessel(beta * Math.sqrt(1 - u * u)) * ib, a = Math.PI * t * cut;
      tab[p * 2 * half + i] = (Math.abs(a) < 1e-9 ? cut : cut * Math.sin(a) / a) * w;
    }
    const step = from / to, len = x.length, w2 = 2 * half;
    for (let i = 0; i < n; i++) {
      const pos = i * step, ip = Math.floor(pos), fp = (pos - ip) * phases, p0 = Math.floor(fp), f = fp - p0, a = p0 * w2, b = a + w2;
      let s = 0;
      for (let k = 0; k < w2; k++) { const j = ip - half + 1 + k; if (j >= 0 && j < len) s += x[j] * (tab[a + k] + (tab[b + k] - tab[a + k]) * f); }
      out[i] = s;
      if ((i & 0xffff) === 0) { prog && prog(i / n); await tick(); }
    }
    return out;
  };

  // ---------------- Süzgeçler ----------------
  function biquad(x, b0, b1, b2, a1, a2) { let x1 = 0, x2 = 0, y1 = 0, y2 = 0; for (let i = 0; i < x.length; i++) { const v = x[i], y = b0 * v + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = v; y2 = y1; y1 = y; x[i] = y; } return x; }
  const hpCoef = (f, sr, Q) => { const w = 2 * Math.PI * f / sr, c = Math.cos(w), a = Math.sin(w) / (2 * Q), n = 1 + a; return [(1 + c) / 2 / n, -(1 + c) / n, (1 + c) / 2 / n, -2 * c / n, (1 - a) / n]; };
  const shelfCoef = (type, f, sr, db) => {
    const A = Math.pow(10, db / 40), w = 2 * Math.PI * f / sr, c = Math.cos(w), al = Math.sin(w) / Math.SQRT2, q = 2 * Math.sqrt(A) * al;
    if (type === 'low') { const a0 = (A + 1) + (A - 1) * c + q; return [A * ((A + 1) - (A - 1) * c + q) / a0, 2 * A * ((A - 1) - (A + 1) * c) / a0, A * ((A + 1) - (A - 1) * c - q) / a0, -2 * ((A - 1) + (A + 1) * c) / a0, ((A + 1) + (A - 1) * c - q) / a0]; }
    const a0 = (A + 1) - (A - 1) * c + q; return [A * ((A + 1) + (A - 1) * c + q) / a0, -2 * A * ((A - 1) + (A + 1) * c) / a0, A * ((A + 1) + (A - 1) * c - q) / a0, 2 * ((A - 1) - (A + 1) * c) / a0, ((A + 1) - (A - 1) * c - q) / a0];
  };

  // ---------------- Ölçüm: ITU-R BS.1770-4 (LUFS), gerçek tepe (4x), DC ----------------
  function kWeight(x, sr) {
    const y = Float64Array.from(x);
    const f0 = 1681.974450955533, G = 3.999843853973347, Q = 0.7071752369554196, K = Math.tan(Math.PI * f0 / sr), Vh = Math.pow(10, G / 20), Vb = Math.pow(Vh, 0.4996667741545416), a0 = 1 + K / Q + K * K;
    biquad(y, (Vh + Vb * K / Q + K * K) / a0, 2 * (K * K - Vh) / a0, (Vh - Vb * K / Q + K * K) / a0, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0);
    const f1 = 38.13547087602444, Q1 = 0.5003270373238773, K1 = Math.tan(Math.PI * f1 / sr), a1 = 1 + K1 / Q1 + K1 * K1;
    biquad(y, 1 / a1 * 1, -2 / a1, 1 / a1, 2 * (K1 * K1 - 1) / a1, (1 - K1 / Q1 + K1 * K1) / a1);
    return y;
  }
  Lab.lufs = function (L, R, sr) {
    const chans = R && R !== L ? [kWeight(L, sr), kWeight(R, sr)] : [kWeight(L, sr)], n = chans[0].length, size = Math.round(0.4 * sr), hop = Math.round(0.1 * sr), blocks = [];
    if (n < size) return -Infinity;
    const pre = chans.map(c => { const p = new Float64Array(n + 1); for (let i = 0; i < n; i++) p[i + 1] = p[i] + c[i] * c[i]; return p; });
    for (let o = 0; o + size <= n; o += hop) { let s = 0; pre.forEach(p => { s += (p[o + size] - p[o]) / size; }); blocks.push(s); }
    const loud = v => -0.691 + 10 * Math.log10(Math.max(1e-12, v)), mean = a => a.reduce((x, y) => x + y, 0) / a.length;
    const abs = blocks.filter(b => loud(b) > -70); if (!abs.length) return -Infinity;
    const rel = loud(mean(abs)) - 10, gated = abs.filter(b => loud(b) > rel);
    return gated.length ? loud(mean(gated)) : -Infinity;
  };
  // 4x katlama için kısa sinc çekirdekleri: gerçek tepe tahmini
  const TP = (() => { const taps = 12, phases = [0.25, 0.5, 0.75].map(fr => { const h = new Float64Array(taps); let sum = 0; for (let i = 0; i < taps; i++) { const t = i - taps / 2 + 1 - fr, w = 0.5 + 0.5 * Math.cos(Math.PI * t / (taps / 2)), a = Math.PI * t; h[i] = (Math.abs(a) < 1e-9 ? 1 : Math.sin(a) / a) * w; sum += h[i]; } for (let i = 0; i < taps; i++) h[i] /= sum; return h; }); return { taps, phases }; })();
  const tpAt = (x, i) => { let m = Math.abs(x[i]); for (const h of TP.phases) { let s = 0; for (let k = 0; k < TP.taps; k++) { const j = i - TP.taps / 2 + 1 + k; if (j >= 0 && j < x.length) s += x[j] * h[k]; } const a = Math.abs(s); if (a > m) m = a; } return m; };
  Lab.truePeak = function (L, R) { let m = 0; [L, R].forEach(x => { if (!x) return; for (let i = 0; i < x.length; i++) if (Math.abs(x[i]) > m * 0.7) { const v = tpAt(x, i); if (v > m) m = v; } }); return m; };
  Lab.measure = function (L, R, sr) {
    let peak = 0, dcL = 0; const n = L.length; for (let i = 0; i < n; i++) { const a = Math.abs(L[i]), b = R ? Math.abs(R[i]) : 0; if (a > peak) peak = a; if (b > peak) peak = b; dcL += L[i]; }
    const tp = Lab.truePeak(L, R === L ? null : R), lufs = Lab.lufs(L, R, sr);
    return { peakDb: g2db(peak), truePeakDb: g2db(tp), lufs, plr: g2db(tp) - lufs, dc: dcL / Math.max(1, n), seconds: n / sr };
  };

  // ---------------- Dinamik: yumuşak kompresör ve ileri bakışlı gerçek tepe sınırlayıcı ----------------
  async function compress(L, R, sr, amount) {
    const thr = db2g(-24 + 6 * (1 - amount)), ratio = 1 + amount * 2.5, at = Math.exp(-1 / (0.02 * sr)), rl = Math.exp(-1 / (0.25 * sr));
    let env = 0, sum = 0, cnt = 0; const makeupRef = (() => { let s = 0; for (let i = 0; i < L.length; i += 16) s += L[i] * L[i] + R[i] * R[i]; return Math.sqrt(s / Math.max(1, L.length / 8)); })();
    for (let i = 0; i < L.length; i++) {
      const v = Math.max(Math.abs(L[i]), Math.abs(R[i])); env = v > env ? at * env + (1 - at) * v : rl * env + (1 - rl) * v;
      const g = env > thr ? Math.pow(env / thr, 1 / ratio - 1) : 1; L[i] *= g; R[i] *= g;
      if ((i & 0x3ffff) === 0) await tick();
    }
    let s2 = 0; for (let i = 0; i < L.length; i += 16) s2 += L[i] * L[i] + R[i] * R[i];
    const after = Math.sqrt(s2 / Math.max(1, L.length / 8)), mk = after > 0 ? makeupRef / after : 1;
    for (let i = 0; i < L.length; i++) { L[i] *= mk; R[i] *= mk; }
  }
  async function limiter(L, R, sr, ceil, prog) {
    const n = L.length, look = Math.max(4, Math.round(0.005 * sr)), rel = Math.exp(-1 / (0.1 * sr)), need = new Float32Array(n + look);
    const mono = L === R;
    for (let i = 0; i < n; i++) { const a = Math.abs(L[i]), b = mono ? 0 : Math.abs(R[i]); let p = a > b ? a : b; if (p > ceil * 0.7) { const t = Math.max(tpAt(L, i), mono ? 0 : tpAt(R, i)); if (t > p) p = t; } need[i] = p > ceil ? ceil / p : 1; if ((i & 0x3ffff) === 0) { prog && prog(i / n * 0.5); await tick(); } }
    // Kazanç, tepe gelmeden önce iner: pencere içindeki en düşük değer, sonra yavaş dönüş ve kısa ortalama
    const g = new Float32Array(n);
    for (let i = n - 1, hold = 1, left = 0; i >= 0; i--) { if (need[i] <= hold) { hold = need[i]; left = look; } else if (left > 0) left--; else { hold = need[i]; left = 0; } g[i] = hold; }
    for (let i = 0, cur = 1; i < n; i++) { cur = g[i] < cur ? g[i] : Math.min(g[i], rel * cur + (1 - rel)); g[i] = cur; }
    const smooth = new Float32Array(n), len = Math.max(2, look >> 1); let acc = 0; for (let i = 0; i < n; i++) { acc += g[i]; if (i >= len) acc -= g[i - len]; smooth[i] = i >= len - 1 ? acc / len : Math.min(g[i], acc / (i + 1)); }
    for (let i = 0; i < n; i++) { L[i] *= smooth[i]; if (!mono) R[i] *= smooth[i]; if ((i & 0x3ffff) === 0) { prog && prog(0.5 + i / n * 0.5); await tick(); } }
  }

  // ---------------- Kalite ayarları ----------------
  Lab.PRESETS = {
    off: { label: 'Kapalı (olduğu gibi)', mode: 'none', limit: false },
    guard: { label: 'Yalnız tepeyi koru (-1 dBTP)', mode: 'guard', ceil: -1, limit: false },
    stream: { label: 'Müzik platformları (-14 LUFS, -1 dBTP)', mode: 'lufs', lufs: -14, ceil: -1, limit: true },
    dynamic: { label: 'Dinamik dinleme (-16 LUFS, -1 dBTP)', mode: 'lufs', lufs: -16, ceil: -1, limit: true },
    loud: { label: 'Kulüp / yüksek ses (-9 LUFS, -1 dBTP)', mode: 'lufs', lufs: -9, ceil: -1, limit: true },
    norm: { label: 'Tepeye normalize (-1 dBFS)', mode: 'peak', ceil: -1, limit: false },
  };
  const DEF = { preset: 'guard', mode: 'guard', lufs: -14, ceil: -1, limit: false, hp: 0, bass: 0, treble: 0, width: 100, comp: 0, vol: 0, trimS: 0, trimE: 0, fadeI: 0, fadeO: 0, silence: false, channels: 0, dither: true };
  Lab.settings = Object.assign({}, DEF, (() => { try { return JSON.parse(localStorage.getItem('os.quality') || '{}'); } catch (e) { return {}; } })());
  Lab.saveSettings = () => { try { localStorage.setItem('os.quality', JSON.stringify(Lab.settings)); } catch (e) { } };
  Lab.meta = { title: '', artist: '', album: '', year: '', genre: '', track: '', isrc: '', cover: null, coverType: '' };
  Lab.defaults = () => Object.assign({}, DEF);

  // Girdi: Float dizileri. Çıktı: yeni diziler + ölçüm raporu. targetSr 0 ise kaynak hız korunur.
  Lab.process = async function (srcL, srcR, sr, opt, targetSr, prog) {
    prog = prog || (() => { });
    const o = Object.assign({}, DEF, opt);
    let a = 0, b = srcL.length;
    if (o.trimS > 0) a = Math.min(b, Math.round(o.trimS * sr));
    if (o.trimE > 0) b = Math.min(b, Math.round(o.trimE * sr));
    if (b <= a) throw new Error(OS.t('Kırpma aralığı geçersiz'));
    if (o.silence) { const th = db2g(-60), hit = i => Math.abs(srcL[i]) > th || (srcR && Math.abs(srcR[i]) > th); while (a < b - 1 && !hit(a)) a++; while (b > a + 1 && !hit(b - 1)) b--; }
    const before = Lab.measure(srcL, srcR || srcL, sr);
    const untouched = o.mode === 'none' && !o.limit && !o.hp && !o.bass && !o.treble && o.width === 100 && !o.comp && !o.vol && !o.fadeI && !o.fadeO && a === 0 && b === srcL.length && !o.channels && (!targetSr || targetSr === sr);
    if (untouched) return { L: srcL, R: srcR || srcL, sr, before, after: before, gainDb: 0, exact: true };
    let L = Float32Array.from(srcL.subarray(a, b)), R = srcR && srcR !== srcL ? Float32Array.from(srcR.subarray(a, b)) : L;
    const wantMono = o.channels === 1;
    if (wantMono && R !== L) { for (let i = 0; i < L.length; i++) L[i] = (L[i] + R[i]) * 0.5; R = L; }
    if (o.channels === 2 && R === L) R = Float32Array.from(L);
    if (targetSr && targetSr !== sr) { const x = await Lab.resample(L, sr, targetSr, k => prog(k * 0.3)); R = R === L ? x : await Lab.resample(R, sr, targetSr, k => prog(0.3 + k * 0.3)); L = x; sr = targetSr; }
    const mono = R === L, apply = (f, ...c) => { biquad(L, ...c); if (!mono) biquad(R, ...c); };
    if (o.hp > 0) apply(0, ...hpCoef(o.hp, sr, 0.7071));
    if (o.bass) apply(0, ...shelfCoef('low', 120, sr, o.bass));
    if (o.treble) apply(0, ...shelfCoef('high', 8000, sr, o.treble));
    if (!mono && o.width !== 100) { const w = o.width / 100; for (let i = 0; i < L.length; i++) { const m = (L[i] + R[i]) * 0.5, s = (L[i] - R[i]) * 0.5 * w; L[i] = m + s; R[i] = m - s; } }
    if (o.comp > 0 && !mono) await compress(L, R, sr, o.comp / 100);
    const scale = g => { if (g === 1) return; for (let i = 0; i < L.length; i++) L[i] *= g; if (!mono) for (let i = 0; i < R.length; i++) R[i] *= g; };
    if (o.vol) scale(db2g(o.vol));
    let gainDb = o.vol || 0;
    const ceil = db2g(o.ceil) * 0.985;
    if (o.mode === 'lufs') { const now = Lab.lufs(L, R, sr); if (isFinite(now)) { const g = o.lufs - now; scale(db2g(g)); gainDb += g; } }
    if (o.mode === 'peak') { const tp = Lab.truePeak(L, mono ? null : R); if (tp > 0) { const g = ceil / tp; scale(g); gainDb += g2db(g); } }
    if (o.limit) {
      await limiter(L, R, sr, ceil, k => prog(0.6 + k * 0.3));
      // Sınırlayıcı sesi kıstıysa hedefe bir kez daha yaklaş
      if (o.mode === 'lufs') { const now = Lab.lufs(L, R, sr), diff = o.lufs - now; if (isFinite(now) && Math.abs(diff) > 0.1 && Math.abs(diff) < 6) { scale(db2g(diff)); await limiter(L, R, sr, ceil, k => prog(0.9 + k * 0.05)); } }
    }
    if (o.mode === 'guard' || o.limit) { const tp = Lab.truePeak(L, mono ? null : R); if (tp > ceil) { const g = ceil / tp * 0.9995; scale(g); gainDb += g2db(g); } }
    // Tamsayı dosyada kırpılma olmasın: ses, bas veya kompresör taşırdıysa tümünü kıs
    { let pk = 0; for (let i = 0; i < L.length; i++) { const a = Math.abs(L[i]), b = mono ? 0 : Math.abs(R[i]); if (a > pk) pk = a; if (b > pk) pk = b; } if (pk > 0.9995) { const g = 0.9995 / pk; scale(g); gainDb += g2db(g); } }
    const fade = (from, to, ramp) => { for (let i = from; i < to; i++) { const k = ramp(i); L[i] *= k; if (!mono) R[i] *= k; } };
    if (o.fadeI > 0) { const n = Math.min(L.length, Math.round(o.fadeI * sr)); fade(0, n, i => i / n); }
    if (o.fadeO > 0) { const n = Math.min(L.length, Math.round(o.fadeO * sr)), s = L.length - n; fade(s, L.length, i => (L.length - 1 - i) / n); }
    const after = Lab.measure(L, R, sr);
    prog(1);
    return { L, R, sr, before, after, gainDb };
  };

  // ---------------- Dosya yazıcılar ----------------
  const te = new TextEncoder();
  const metaEntries = m => [['title', m.title], ['artist', m.artist], ['album', m.album], ['year', m.year], ['genre', m.genre], ['track', m.track], ['isrc', m.isrc]].filter(e => e[1]);
  function wavFile(L, R, sr, bits, name, meta, dither) {
    const ch = R === L ? 1 : 2, n = L.length, bps = bits / 8, info = [], map = { title: 'INAM', artist: 'IART', album: 'IPRD', year: 'ICRD', genre: 'IGNR', track: 'ITRK', isrc: 'ISRC' };
    metaEntries(meta).forEach(([k, v]) => { const b = te.encode(v), pad = b.length % 2 === 0 ? 2 : 1, c = new Uint8Array(8 + b.length + pad), d = new DataView(c.buffer); for (let i = 0; i < 4; i++) c[i] = map[k].charCodeAt(i); d.setUint32(4, b.length + 1, true); c.set(b, 8); info.push(c); });
    const infoLen = info.reduce((a, c) => a + c.length, 0), listSize = infoLen ? 12 + infoLen : 0, dataSize = n * ch * bps, buf = new ArrayBuffer(44 + dataSize), v = new DataView(buf), ws = (o, s) => { for (let i = 0; i < 4; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    ws(0, 'RIFF'); v.setUint32(4, 36 + dataSize + (dataSize & 1) + listSize, true); ws(8, 'WAVE'); ws(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, bits === 32 ? 3 : 1, true); v.setUint16(22, ch, true); v.setUint32(24, sr, true); v.setUint32(28, sr * ch * bps, true); v.setUint16(32, ch * bps, true); v.setUint16(34, bits, true); ws(36, 'data'); v.setUint32(40, dataSize, true);
    if (bits === 32) { let o = 44; for (let i = 0; i < n; i++) { v.setFloat32(o, L[i], true); o += 4; if (ch === 2) { v.setFloat32(o, R[i], true); o += 4; } } }
    else { const a = OS.pcmInt(L, bits, dither), b = ch === 2 ? OS.pcmInt(R, bits, dither) : null; let o = 44; const put = x => { if (bits === 16) { v.setInt16(o, x, true); o += 2; } else { v.setUint8(o, x & 255); v.setUint8(o + 1, (x >> 8) & 255); v.setUint8(o + 2, (x >> 16) & 255); o += 3; } }; for (let i = 0; i < n; i++) { put(a[i]); if (b) put(b[i]); } }
    const parts = [buf]; if (dataSize & 1) parts.push(new Uint8Array(1));
    if (infoLen) { const h = new Uint8Array(12), d = new DataView(h.buffer); [76, 73, 83, 84].forEach((c, i) => { h[i] = c; }); d.setUint32(4, 4 + infoLen, true); [73, 78, 70, 79].forEach((c, i) => { h[8 + i] = c; }); parts.push(h, ...info); }
    return new File(parts, name + '.wav', { type: 'audio/wav' });
  }
  function ext80(v) { const b = new Uint8Array(10), e = Math.floor(Math.log2(v)), m = v / Math.pow(2, e), hi = Math.floor(m * 2147483648), lo = Math.floor((m * 2147483648 - hi) * 4294967296), d = new DataView(b.buffer); d.setUint16(0, e + 16383); d.setUint32(2, hi); d.setUint32(6, lo); return b; }
  function aiffFile(L, R, sr, bits, name, meta, dither) {
    const ch = R === L ? 1 : 2, n = L.length, bps = bits / 8, size = n * ch * bps, buf = new ArrayBuffer(54 + size + (size & 1)), v = new DataView(buf), u = new Uint8Array(buf), ws = (o, s) => { for (let i = 0; i < 4; i++) u[o + i] = s.charCodeAt(i); };
    ws(0, 'FORM'); v.setUint32(4, 46 + size + (size & 1)); ws(8, 'AIFF'); ws(12, 'COMM'); v.setUint32(16, 18); v.setUint16(20, ch); v.setUint32(22, n); v.setUint16(26, bits); u.set(ext80(sr), 28); ws(38, 'SSND'); v.setUint32(42, size + 8); v.setUint32(46, 0); v.setUint32(50, 0);
    const a = OS.pcmInt(L, bits, dither), b = ch === 2 ? OS.pcmInt(R, bits, dither) : null; let o = 54; const put = x => { if (bits === 16) { v.setInt16(o, x); o += 2; } else { u[o] = (x >> 16) & 255; u[o + 1] = (x >> 8) & 255; u[o + 2] = x & 255; o += 3; } };
    for (let i = 0; i < n; i++) { put(a[i]); if (b) put(b[i]); }
    return new File([buf], name + '.aiff', { type: 'audio/aiff' });
  }
  // MP3 etiketi: ID3v2.3, UTF-16
  function id3(meta) {
    const map = { title: 'TIT2', artist: 'TPE1', album: 'TALB', year: 'TYER', genre: 'TCON', track: 'TRCK', isrc: 'TSRC' }, frames = [];
    const frame = (id, body) => { const f = new Uint8Array(10 + body.length), d = new DataView(f.buffer); for (let i = 0; i < 4; i++) f[i] = id.charCodeAt(i); d.setUint32(4, body.length); f.set(body, 10); return f; };
    metaEntries(meta).forEach(([k, v]) => { const body = new Uint8Array(3 + v.length * 2), d = new DataView(body.buffer); body[0] = 1; body[1] = 0xff; body[2] = 0xfe; for (let i = 0; i < v.length; i++) d.setUint16(3 + i * 2, v.charCodeAt(i), true); frames.push(frame(map[k], body)); });
    if (meta.cover) { const mime = te.encode(meta.coverType || 'image/jpeg'), body = new Uint8Array(mime.length + 4 + meta.cover.length); body[0] = 0; body.set(mime, 1); body[mime.length + 2] = 3; body[mime.length + 3] = 0; body.set(meta.cover, mime.length + 4); frames.push(frame('APIC', body)); }
    if (!frames.length) return null;
    const size = frames.reduce((a, f) => a + f.length, 0), h = new Uint8Array(10); h.set([73, 68, 51, 3, 0, 0]); [21, 14, 7, 0].forEach((s, i) => { h[6 + i] = (size >>> s) & 127; });
    return [h, ...frames];
  }
  Lab.id3 = id3;
  // MP4 etiket kutusu
  Lab.mp4Tags = function (meta, box, full) {
    const u32 = v => [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255], items = [];
    const text = (code, v) => items.push(box(code, box('data', u32(1), u32(0), te.encode(v))));
    const C = String.fromCharCode(0xa9); // kutu adlarında 0xA9 baytı
    if (meta.title) text(C + 'nam', meta.title); if (meta.artist) text(C + 'ART', meta.artist); if (meta.album) text(C + 'alb', meta.album); if (meta.year) text(C + 'day', meta.year); if (meta.genre) text(C + 'gen', meta.genre);
    if (meta.track && +meta.track) items.push(box('trkn', box('data', u32(0), u32(0), [0, 0, 0, +meta.track, 0, 0, 0, 0])));
    if (meta.cover) items.push(box('covr', box('data', u32(/png/.test(meta.coverType) ? 14 : 13), u32(0), meta.cover)));
    if (!items.length) return null;
    return box('udta', full('meta', 0, full('hdlr', 0, u32(0), [109, 100, 105, 114], [97, 112, 112, 108], new Array(9).fill(0)), box('ilst', ...items)));
  };
  // Ogg Opus
  const OGG = new Uint32Array(256); for (let i = 0; i < 256; i++) { let r = i << 24; for (let j = 0; j < 8; j++) r = r & 0x80000000 ? ((r << 1) ^ 0x04c11db7) >>> 0 : (r << 1) >>> 0; OGG[i] = r >>> 0; }
  function oggPage(packets, flags, granule, serial, seq) {
    const lace = []; packets.forEach(p => { let n = p.length; while (n >= 255) { lace.push(255); n -= 255; } lace.push(n); });
    const size = packets.reduce((a, p) => a + p.length, 0), a = new Uint8Array(27 + lace.length + size), v = new DataView(a.buffer);
    a.set([79, 103, 103, 83, 0, flags]); v.setUint32(6, granule % 4294967296, true); v.setUint32(10, Math.floor(granule / 4294967296), true); v.setUint32(14, serial, true); v.setUint32(18, seq, true); a[26] = lace.length; a.set(lace, 27);
    let o = 27 + lace.length; packets.forEach(p => { a.set(p, o); o += p.length; });
    let c = 0; for (let i = 0; i < a.length; i++) c = ((c << 8) ^ OGG[((c >>> 24) ^ a[i]) & 255]) >>> 0; v.setUint32(22, c, true);
    return a;
  }
  async function opusFile(L, R, sr, kbps, name, meta, prog) {
    const ch = R === L ? 1 : 2, cfg = { codec: 'opus', sampleRate: 48000, numberOfChannels: ch, bitrate: kbps * 1000 };
    if (!window.AudioEncoder || !(await AudioEncoder.isConfigSupported(cfg)).supported) throw new Error(OS.t('Bu tarayıcı bu biçimi üretemiyor. Başka biçim seçin.'));
    if (sr !== 48000) { L = await Lab.resample(L, sr, 48000, k => prog(k * 0.3)); R = ch === 2 ? await Lab.resample(R, sr, 48000, k => prog(0.3 + k * 0.3)) : L; }
    const pk = []; let fail = null;
    const enc = new AudioEncoder({ output: c => { const d = new Uint8Array(c.byteLength); c.copyTo(d); pk.push(d); }, error: e => { fail = e; } });
    enc.configure(cfg);
    for (let o = 0; o < L.length; o += 4800) {
      if (fail) throw fail;
      const n = Math.min(4800, L.length - o), buf = new Float32Array(n * ch); buf.set(L.subarray(o, o + n), 0); if (ch === 2) buf.set(R.subarray(o, o + n), n);
      const ad = new AudioData({ format: 'f32-planar', sampleRate: 48000, numberOfFrames: n, numberOfChannels: ch, timestamp: Math.round(o / 48000 * 1e6), data: buf }); enc.encode(ad); ad.close();
      if (o % 48000 === 0) { prog(0.6 + o / L.length * 0.4); await tick(); while (enc.encodeQueueSize > 64) await new Promise(r => setTimeout(r, 2)); }
    }
    await enc.flush(); enc.close();
    if (fail) throw fail;
    const serial = (Math.random() * 0xffffffff) >>> 0, pages = [], pre = 312;
    const head = new Uint8Array(19), hv = new DataView(head.buffer); head.set(te.encode('OpusHead')); head[8] = 1; head[9] = ch; hv.setUint16(10, pre, true); hv.setUint32(12, 48000, true);
    pages.push(oggPage([head], 2, 0, serial, 0));
    const vendor = te.encode('MRH DGN'), comments = metaEntries(meta).map(([k, v]) => te.encode(({ title: 'TITLE', artist: 'ARTIST', album: 'ALBUM', year: 'DATE', genre: 'GENRE', track: 'TRACKNUMBER', isrc: 'ISRC' })[k] + '=' + v));
    const tags = new Uint8Array(8 + 4 + vendor.length + 4 + comments.reduce((a, c) => a + 4 + c.length, 0)), tv = new DataView(tags.buffer); tags.set(te.encode('OpusTags')); tv.setUint32(8, vendor.length, true); tags.set(vendor, 12); let at = 12 + vendor.length; tv.setUint32(at, comments.length, true); at += 4; comments.forEach(c => { tv.setUint32(at, c.length, true); tags.set(c, at + 4); at += 4 + c.length; });
    pages.push(oggPage([tags], 0, 0, serial, 1));
    let seq = 2, gran = 0;
    for (let i = 0; i < pk.length; i += 50) { const group = pk.slice(i, i + 50); gran = Math.min(L.length + pre, gran + group.length * 960); pages.push(oggPage(group, i + 50 >= pk.length ? 4 : 0, gran, serial, seq++)); }
    return new File(pages, name + '.opus', { type: 'audio/ogg' });
  }
  Lab.wavFile = wavFile;
  /* spec: {kind:'wav'|'aiff'|'flac'|'alac'|'mp3'|'aac'|'opus'|'mp4', bits, kbps, level} */
  Lab.encode = async function (q, spec, name, meta, prog, wantDither) {
    prog = prog || (() => { });
    meta = meta || {};
    const { L, R, sr } = q, P = OS.phone._enc;
    const dither = wantDither !== false && spec.bits === 16 && !q.exact;
    let f;
    if (spec.kind === 'wav') f = wavFile(L, R, sr, spec.bits, name, meta, dither);
    else if (spec.kind === 'aiff') f = aiffFile(L, R, sr, spec.bits, name, meta, dither);
    else if (spec.kind === 'flac') f = new File(await OS.encodeFlac(L, R === L ? null : R, sr, spec.bits, { meta, dither, level: spec.level == null ? 5 : spec.level, prog, tick }), name + '.flac', { type: 'audio/flac' });
    else if (spec.kind === 'alac') { const frames = await OS.alacFrames(L, R === L ? null : R, spec.bits, { dither, prog, tick }); f = P.muxMp4(null, { video: false, kind: 'alac', bits: spec.bits, scale: sr, channels: R === L ? 1 : 2, samples: frames }, L.length / sr, name, meta); }
    else if (spec.kind === 'mp3') f = await P.toMp3(P.pcm(L, R, sr), name, spec.kbps, prog, meta);
    else if (spec.kind === 'aac') { const t = await P.encodeAudioAac(P.pcm(L, R, sr), k => prog(k * 2), (spec.kbps || 192) * 1000); f = P.muxMp4(null, t, L.length / sr, name, meta); f.kbps = t.bitrate / 1000; }
    else if (spec.kind === 'mp4') f = await P.toMp4(P.pcm(L, R, sr), name, prog, meta);
    else if (spec.kind === 'opus') f = await opusFile(L, R, sr, spec.kbps || 160, name, meta, prog);
    else throw new Error('format ' + spec.kind);
    return f;
  };

  // ---------------- ZIP (sıkıştırmasız): ses dosyaları zaten kendi biçiminde ----------------
  const CRC = new Int32Array(256); for (let i = 0; i < 256; i++) { let c = i; for (let j = 0; j < 8; j++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1; CRC[i] = c; }
  Lab.zip = async function (files, name) {
    const parts = [], central = []; let off = 0;
    for (const f of files) {
      const data = new Uint8Array(await f.arrayBuffer()), nm = te.encode(f.name); let c = -1; for (let i = 0; i < data.length; i++) c = (c >>> 8) ^ CRC[(c ^ data[i]) & 255]; c = (c ^ -1) >>> 0;
      const h = new Uint8Array(30 + nm.length), v = new DataView(h.buffer); v.setUint32(0, 0x04034b50, true); v.setUint16(4, 20, true); v.setUint16(6, 0x800, true); v.setUint32(14, c, true); v.setUint32(18, data.length, true); v.setUint32(22, data.length, true); v.setUint16(26, nm.length, true); h.set(nm, 30);
      parts.push(h, data);
      const e = new Uint8Array(46 + nm.length), w = new DataView(e.buffer); w.setUint32(0, 0x02014b50, true); w.setUint16(4, 20, true); w.setUint16(6, 20, true); w.setUint16(8, 0x800, true); w.setUint32(16, c, true); w.setUint32(20, data.length, true); w.setUint32(24, data.length, true); w.setUint16(28, nm.length, true); w.setUint32(42, off, true); e.set(nm, 46); central.push(e);
      off += h.length + data.length;
      await tick();
    }
    const size = central.reduce((a, e) => a + e.length, 0), end = new Uint8Array(22), d = new DataView(end.buffer); d.setUint32(0, 0x06054b50, true); d.setUint16(8, files.length, true); d.setUint16(10, files.length, true); d.setUint32(12, size, true); d.setUint32(16, off, true);
    return new File([...parts, ...central, end], name, { type: 'application/zip' });
  };

  // ---------------- Dosya okuma: kaynak hızı korunur, WAV/AIFF bit bit okunur ----------------
  const ascii = (u, o, n) => String.fromCharCode.apply(null, u.subarray(o, o + n));
  function parseWav(buf) {
    const u = new Uint8Array(buf), v = new DataView(buf); if (ascii(u, 0, 4) !== 'RIFF' || ascii(u, 8, 4) !== 'WAVE') return null;
    let o = 12, fmt = null, data = null;
    while (o + 8 <= u.length) { const id = ascii(u, o, 4), sz = v.getUint32(o + 4, true); if (id === 'fmt ') { let tag = v.getUint16(o + 8, true); const ext = tag === 0xfffe && sz >= 26 ? v.getUint16(o + 32, true) : tag; fmt = { tag: ext, ch: v.getUint16(o + 10, true), sr: v.getUint32(o + 12, true), bits: v.getUint16(o + 22, true) }; } else if (id === 'data') { data = [o + 8, Math.min(sz, u.length - o - 8)]; break; } o += 8 + sz + (sz & 1); }
    if (!fmt || !data || (fmt.tag !== 1 && fmt.tag !== 3)) return null;
    return readPcm(v, data[0], data[1], fmt.ch, fmt.bits, fmt.tag === 3, true, fmt.sr);
  }
  function parseAiff(buf) {
    const u = new Uint8Array(buf), v = new DataView(buf); if (ascii(u, 0, 4) !== 'FORM' || !/^AIF[FC]$/.test(ascii(u, 8, 4))) return null;
    let o = 12, ch, bits, sr, data = null;
    while (o + 8 <= u.length) { const id = ascii(u, o, 4), sz = v.getUint32(o + 4); if (id === 'COMM') { ch = v.getUint16(o + 8); bits = v.getUint16(o + 14); const e = v.getUint16(o + 16) - 16383, hi = v.getUint32(o + 18); sr = Math.round(hi * Math.pow(2, e - 31)); if (ascii(u, 8, 4) === 'AIFC' && !/^(NONE|twos|sowt)$/.test(ascii(u, o + 26, 4))) return null; } else if (id === 'SSND') { const off = v.getUint32(o + 8); data = [o + 16 + off, sz - 8 - off]; } o += 8 + sz + (sz & 1); }
    if (!data || !ch) return null;
    return readPcm(v, data[0], data[1], ch, bits, false, false, sr);
  }
  function readPcm(v, o, size, ch, bits, isFloat, little, sr) {
    const bps = bits >> 3, n = Math.floor(size / (ch * bps)), Arr = bits > 16 && !isFloat ? Float64Array : Float32Array, L = new Arr(n), R = ch > 1 ? new Arr(n) : L, max = Math.pow(2, bits - 1) - 1;
    const rd = isFloat ? (bits === 64 ? p => v.getFloat64(p, little) : p => v.getFloat32(p, little))
      : bits === 8 ? p => (v.getUint8(p) - 128) / 127 : bits === 16 ? p => v.getInt16(p, little) / max
        : bits === 24 ? p => { const b0 = v.getUint8(p), b1 = v.getUint8(p + 1), b2 = v.getUint8(p + 2), x = little ? b0 | (b1 << 8) | (b2 << 16) : b2 | (b1 << 8) | (b0 << 16); return (x > 8388607 ? x - 16777216 : x) / max; }
          : p => v.getInt32(p, little) / max;
    for (let i = 0; i < n; i++) { const p = o + i * ch * bps; L[i] = rd(p); if (ch > 1) R[i] = rd(p + bps); }
    return { L, R, sr, bits: isFloat ? 32 : bits, channels: ch, lossless: true };
  }
  // Çözücüye kaynak hızını söyle: tarayıcı aksi halde kendi hızına çevirir
  function sniffRate(buf) {
    const u = new Uint8Array(buf), s4 = ascii(u, 0, 4);
    if (s4 === 'fLaC') return { sr: (u[18] << 12) | (u[19] << 4) | (u[20] >> 4), lossless: true, bits: (((u[20] & 1) << 4) | (u[21] >> 4)) + 1 };
    if (s4 === 'OggS') return { sr: 48000 };
    let o = 0; if (ascii(u, 0, 3) === 'ID3') o = 10 + ((u[6] & 127) << 21 | (u[7] & 127) << 14 | (u[8] & 127) << 7 | (u[9] & 127));
    for (let i = o; i < Math.min(u.length - 4, o + 65536); i++) if (u[i] === 0xff && (u[i + 1] & 0xe0) === 0xe0) { const ver = (u[i + 1] >> 3) & 3, idx = (u[i + 2] >> 2) & 3, layer = (u[i + 1] >> 1) & 3; if (ver !== 1 && layer !== 0 && idx !== 3) { const t = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] }[ver]; return { sr: t[idx] }; } }
    // MP4: mdhd zaman ölçeği
    for (let i = 0; i < u.length - 24; i++) if (u[i] === 109 && u[i + 1] === 100 && u[i + 2] === 104 && u[i + 3] === 100) { const v = new DataView(buf), ver = u[i + 4], ts = v.getUint32(i + (ver ? 24 : 16)); if (ts >= 8000 && ts <= 384000 && ts % 25 !== 1) return { sr: ts }; }
    return { sr: 48000 };
  }
  Lab.readFile = async function (file) {
    const buf = await file.arrayBuffer();
    const pcm = parseWav(buf) || parseAiff(buf);
    if (pcm) return pcm;
    const s = sniffRate(buf), sr = s.sr >= 8000 && s.sr <= 384000 ? s.sr : 48000;
    let ab; try { ab = await new OfflineAudioContext(2, 1, sr).decodeAudioData(buf.slice(0)); } catch (e) { throw new Error(OS.t('Bu dosyanın sesi çözülemedi.')); }
    const mono = ab.numberOfChannels === 1, L = ab.getChannelData(0);
    return { L, R: mono ? L : ab.getChannelData(1), sr: ab.sampleRate, bits: s.bits || 0, channels: ab.numberOfChannels, lossless: !!s.lossless };
  };
  Lab.dbStr = v => (isFinite(v) ? v.toFixed(1) : '-∞');

  // ---------------- Ayar paneli: her pencerede aynı ----------------
  Lab.panel = function (onChange, opts) {
    opts = opts || {};
    const el = OS.U.el, S = Lab.settings, M = Lab.meta, fire = () => { Lab.saveSettings(); onChange && onChange(); };
    const num = (k, min, max, step, w) => el('input', { class: 'inp', type: 'number', min, max, step, value: S[k], style: 'width:' + (w || 72) + 'px', onchange: e => { S[k] = +e.target.value; S.preset = 'custom'; presetSel.value = 'custom'; fire(); } });
    const row = (label, ctl) => el('label', { class: 'field', style: 'justify-content:space-between;gap:8px' }, OS.t(label), ctl);
    const presetSel = el('select', { onchange: e => { const p = Lab.PRESETS[e.target.value]; if (p) Object.assign(S, { mode: p.mode, limit: p.limit }, p.lufs != null ? { lufs: p.lufs } : {}, p.ceil != null ? { ceil: p.ceil } : {}); S.preset = e.target.value; sync(); fire(); } },
      Object.keys(Lab.PRESETS).map(k => el('option', { value: k, selected: S.preset === k }, OS.t(Lab.PRESETS[k].label))), el('option', { value: 'custom', selected: S.preset === 'custom' }, OS.t('Özel')));
    const modeSel = el('select', { onchange: e => { S.mode = e.target.value; S.preset = 'custom'; presetSel.value = 'custom'; fire(); } }, [['none', 'Değiştirme'], ['guard', 'Taşarsa kıs'], ['peak', 'Tepeye normalize'], ['lufs', 'LUFS hedefi']].map(([v, t]) => el('option', { value: v, selected: S.mode === v }, OS.t(t))));
    const limit = el('input', { type: 'checkbox', checked: S.limit, onchange: e => { S.limit = e.target.checked; S.preset = 'custom'; presetSel.value = 'custom'; fire(); } });
    const lufs = num('lufs', -30, -5, 0.5), ceil = num('ceil', -6, 0, 0.1);
    const sync = () => { modeSel.value = S.mode; limit.checked = S.limit; lufs.value = S.lufs; ceil.value = S.ceil; };
    const chk = k => el('input', { type: 'checkbox', checked: S[k], onchange: e => { S[k] = e.target.checked; fire(); } });
    const grid = (...k) => el('div', { style: 'display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:6px 14px' }, ...k);
    const chan = el('select', { onchange: e => { S.channels = +e.target.value; fire(); } }, [[0, 'Kaynak gibi'], [2, 'Stereo'], [1, 'Mono']].map(([v, t]) => el('option', { value: v, selected: S.channels === v }, OS.t(t))));
    const txt = (k, label) => row(label, el('input', { class: 'inp', style: 'width:150px', value: M[k] || '', onchange: e => { M[k] = e.target.value.trim(); onChange && onChange(); } }));
    const coverName = el('span', { class: 'muted' }, M.cover ? OS.t('Kapak eklendi') : '');
    const cover = el('button', { class: 'btn sm', onclick: async e => { e.preventDefault(); const [f] = await OS.U.pickFiles('image/jpeg,image/png'); if (!f) return; M.cover = new Uint8Array(await f.arrayBuffer()); M.coverType = f.type; coverName.textContent = f.name; onChange && onChange(); } }, OS.t('Kapak seç…'));
    const sec = (title, ...kids) => el('details', { style: 'border:1px solid var(--line2);border-radius:6px;padding:6px 8px' }, el('summary', { style: 'cursor:pointer' }, OS.t(title)), el('div', { style: 'padding-top:8px;display:flex;flex-direction:column;gap:6px' }, ...kids));
    return el('div', { style: 'display:flex;flex-direction:column;gap:6px' },
      el('label', { class: 'field', style: 'justify-content:center;gap:8px' }, OS.t('Kalite ayarı'), presetSel),
      sec('Ses yüksekliği ve tepe', grid(row('Yöntem', modeSel), row('LUFS hedefi', lufs), row('Tepe sınırı (dB)', ceil), row('Gerçek tepe sınırlayıcı', limit), row('Ses (dB)', num('vol', -40, 20, 0.5)))),
      sec('Ton ve temizlik', grid(row('Alt kesim (Hz, 0 = kapalı)', num('hp', 0, 200, 5)), row('Bas (dB)', num('bass', -12, 12, 0.5)), row('Tiz (dB)', num('treble', -12, 12, 0.5)), row('Stereo genişlik (%)', num('width', 0, 200, 5)), row('Kompresör (%)', num('comp', 0, 100, 5)), row('16-bit için dither', chk('dither')))),
      sec('Kesme ve geçiş', grid(row('Başlangıçtan kes (sn)', num('trimS', 0, 86400, 0.1)), row('Şu saniyede bitir (0 = sonu)', num('trimE', 0, 86400, 0.1)), row('Giriş fade (sn)', num('fadeI', 0, 120, 0.1)), row('Çıkış fade (sn)', num('fadeO', 0, 120, 0.1)), row('Baş ve sondaki sessizliği kes', chk('silence')), row('Kanallar', chan))),
      sec('Parça bilgileri', grid(txt('title', 'Parça adı'), txt('artist', 'Sanatçı'), txt('album', 'Albüm'), txt('year', 'Yıl'), txt('genre', 'Tür'), txt('track', 'Parça no'), txt('isrc', 'ISRC'), el('div', { class: 'row' }, cover, coverName))));
  };
})(window.OS);
