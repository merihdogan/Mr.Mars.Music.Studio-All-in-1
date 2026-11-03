/* Mr. Mars Music Studio · MRH DGN — sesi notaya çevirme (transkripsiyon) ve nota/tab/riff/MIDI/XML çıktıları
 *
 * Melodi modu: YIN perde algılama (tek ses: vokal, solo çalgı, riff).
 * Çok sesli mod: FFT + harmonik toplama ile her karede birden çok perde (akorlar, piyano, gitar).
 * Tam bir miksi ayrı çalgılara ayırmak tarayıcıda mümkün değildir; sonuç her zaman bir
 * yaklaşıklıktır ve en iyi sonuç tek çalgılı / belirgin melodili kayıtlarda alınır.
 */
(function (OS) {
  const U = OS.U, E = OS.engine;
  const TR = OS.transcribe = {};
  const pause = () => new Promise(r => setTimeout(r, 0));

  // ---------------- Dosya çözme ----------------
  TR.decode = async function (file) {
    E.init();
    const ab = await U.readAsArrayBuffer(file);
    try { return await E.ctx.decodeAudioData(ab); }
    catch (e) { throw new Error(OS.t('Bu dosyanın sesi çözülemedi. WAV, MP3, OGG, FLAC, M4A/AAC veya ses içeren MP4/WebM deneyin; ya da MIDI dosyası yükleyin.')); }
  };
  // Mono'ya indir ve ~11 kHz'e düşür (perde için yeterli, hızlı)
  function prep(buf, target) {
    const ch = buf.numberOfChannels, sr = buf.sampleRate, k = Math.max(1, Math.round(sr / target));
    const n = Math.floor(buf.length / k), out = new Float32Array(n), cs = [];
    for (let c = 0; c < ch; c++) cs.push(buf.getChannelData(c));
    for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < k; j++) for (let c = 0; c < ch; c++) s += cs[c][i * k + j]; out[i] = s / (k * ch); }
    return { x: out, sr: sr / k };
  }

  // ---------------- FFT (radix-2, yerinde) ----------------
  function fft(re, im) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
    for (let len = 2; len <= n; len <<= 1) {
      const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a);
      for (let i = 0; i < n; i += len) {
        let cr = 1, ci = 0;
        for (let j = 0; j < len / 2; j++) {
          const ur = re[i + j], ui = im[i + j], k = i + j + len / 2;
          const vr = re[k] * cr - im[k] * ci, vi = re[k] * ci + im[k] * cr;
          re[i + j] = ur + vr; im[i + j] = ui + vi; re[k] = ur - vr; im[k] = ui - vi;
          const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
        }
      }
    }
  }

  // ---------------- Melodi (YIN) ----------------
  async function mono(x, sr, opt, progress) {
    const W = 1024, hop = 256, tauMax = Math.floor(sr / 55), tauMin = Math.floor(sr / 1400);
    const frames = Math.floor((x.length - W - tauMax) / hop), out = [];
    const d = new Float32Array(tauMax + 1);
    for (let f = 0; f < frames; f++) {
      const o = f * hop;
      let rms = 0; for (let i = 0; i < W; i++) rms += x[o + i] * x[o + i]; rms = Math.sqrt(rms / W);
      let midi = null, conf = 0;
      if (rms > opt.gate) {
        d[0] = 1; let run = 0, tau = -1;
        for (let t = 1; t <= tauMax; t++) {
          let s = 0; for (let i = 0; i < W / 2; i++) { const df = x[o + i] - x[o + i + t]; s += df * df; }
          run += s; d[t] = run ? s * t / run : 1;
        }
        for (let t = tauMin; t < tauMax; t++) if (d[t] < 0.15) { while (t + 1 < tauMax && d[t + 1] < d[t]) t++; tau = t; break; }
        if (tau > 0) {
          const a = d[tau - 1], b = d[tau], c = d[tau + 1], den = a + c - 2 * b, tt = den ? tau + (a - c) / (2 * den) : tau;
          midi = 69 + 12 * Math.log2(sr / tt / 440); conf = 1 - b;
        }
      }
      out.push({ t: (o + W / 2) / sr, midi, rms, conf });
      if (f % 300 === 0) { progress && progress(f / frames); await pause(); }
    }
    // medyan filtre
    const med = out.map((fr, i) => {
      const w = out.slice(Math.max(0, i - 2), i + 3).map(q => q.midi).filter(v => v != null);
      if (fr.midi == null || w.length < 3) return fr.midi == null ? null : fr.midi;
      w.sort((a, b) => a - b); return w[Math.floor(w.length / 2)];
    });
    // notalara böl
    const notes = []; let cur = null;
    const dt = hop / sr;
    for (let i = 0; i < out.length; i++) {
      const m = med[i], fr = out[i];
      const onset = cur && i > 0 && fr.rms > out[i - 1].rms * 1.8 && fr.rms > opt.gate * 3;
      if (m == null) { if (cur) { notes.push(cur); cur = null; } continue; }
      const r = Math.round(m);
      if (cur && Math.abs(m - cur.p) < 0.65 && !onset) { cur.end = fr.t + dt / 2; cur.peak = Math.max(cur.peak, fr.rms); continue; }
      if (cur) notes.push(cur);
      cur = { p: r, start: fr.t - dt / 2, end: fr.t + dt / 2, peak: fr.rms };
    }
    if (cur) notes.push(cur);
    return finish(notes.filter(n => n.end - n.start >= opt.minDur));
  }

  // ---------------- Çok sesli (harmonik toplama) ----------------
  async function poly(x, sr, opt, progress) {
    const N = 4096, hop = 512, frames = Math.floor((x.length - N) / hop);
    const win = new Float32Array(N); for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1));
    const re = new Float32Array(N), im = new Float32Array(N), mag = new Float32Array(N / 2);
    const lo = 36, hi = 92, sal = new Float32Array(hi - lo + 1);
    const act = new Map(), notes = [];
    let globalMax = 1e-9;
    const rows = [];
    for (let f = 0; f < frames; f++) {
      const o = f * hop;
      let rms = 0;
      for (let i = 0; i < N; i++) { const v = x[o + i]; re[i] = v * win[i]; im[i] = 0; rms += v * v; }
      rms = Math.sqrt(rms / N);
      fft(re, im);
      for (let k = 0; k < N / 2; k++) mag[k] = Math.log1p(100 * Math.sqrt(re[k] * re[k] + im[k] * im[k]));
      let mx = 0;
      for (let m = lo; m <= hi; m++) {
        const f0 = 440 * Math.pow(2, (m - 69) / 12); let s = 0;
        const at = h => { const b = Math.round(f0 * h / sr * N); return b < N / 2 - 1 ? Math.max(mag[b - 1], mag[b], mag[b + 1]) : 0; };
        for (let h = 1; h <= 6; h++) s += at(h) * Math.pow(0.8, h - 1);
        // temel frekans zayıfsa bu perde büyük olasılıkla bir üst oktavın gölgesidir
        if (at(1) < 0.6 * at(2)) s *= 0.35;
        sal[m - lo] = s; if (s > mx) mx = s;
      }
      globalMax = Math.max(globalMax, mx);
      // tepe seçimi: yerel maksimum, eşik, en fazla opt.voices perde, oktav kopyalarını ele
      const cand = [];
      if (rms > opt.gate) for (let m = lo; m <= hi; m++) {
        const s = sal[m - lo];
        if (s < mx * opt.thresh) continue;
        if ((m > lo && sal[m - lo - 1] > s) || (m < hi && sal[m - lo + 1] > s)) continue;
        cand.push({ m, s });
      }
      cand.sort((a, b) => b.s - a.s);
      const pick = [];
      for (const c of cand) {
        if (pick.length >= opt.voices) break;
        if (pick.some(q => (Math.abs(q.m - c.m) === 12 || Math.abs(q.m - c.m) === 19 || Math.abs(q.m - c.m) === 24) && c.s < q.s * 0.9)) continue;
        pick.push(c);
      }
      rows.push({ t: (o + N / 2) / sr, pick, rms });
      if (f % 100 === 0) { progress && progress(f / frames); await pause(); }
    }
    // nota izleme: 1 karelik boşluğa izin ver, en az 2 kare
    const dt = hop / sr;
    rows.forEach((r, i) => {
      const seen = new Set();
      r.pick.forEach(({ m, s }) => {
        seen.add(m);
        const a = act.get(m);
        if (a) { a.end = r.t + dt / 2; a.peak = Math.max(a.peak, s); a.gap = 0; a.frames++; }
        else act.set(m, { p: m, start: r.t - dt / 2, end: r.t + dt / 2, peak: s, gap: 0, frames: 1 });
      });
      for (const [m, a] of act) if (!seen.has(m)) { if (++a.gap > 1) { if (a.frames >= 3) notes.push(a); act.delete(m); } }
    });
    for (const [, a] of act) if (a.frames >= 3) notes.push(a);
    // uzun analiz penceresinin gecikmesini telafi et
    notes.forEach(n => { n.start -= N / sr * 0.22; });
    // aynı anda çalan güçlü notaların yanında çok zayıf kalanlar büyük olasılıkla harmonik gölgesidir
    const keep = notes.filter(n => {
      const ov = notes.filter(o => o !== n && o.start < n.end && o.end > n.start);
      const strongest = Math.max(n.peak, ...ov.map(o => o.peak));
      return n.peak >= strongest * (0.62 - opt.thresh * 0.1) && n.end - n.start >= Math.max(opt.minDur, 0.12);
    });
    keep.forEach(n => n.peak = n.peak / globalMax * 0.3);
    return finish(keep);
  }

  function finish(notes) {
    const pk = Math.max(1e-9, ...notes.map(n => n.peak));
    return notes.map(n => ({ p: n.p, start: n.start, end: n.end, v: U.clamp(Math.round(50 + 77 * Math.sqrt(n.peak / pk)), 30, 127) }));
  }

  // ---------------- Ana giriş ----------------
  // opt: { mode: 'melody'|'poly', sens: 0..1, bpm: sayı|null, quant: vuruş (0 = kapalı), voices }
  TR.run = async function (buf, opt, progress) {
    opt = Object.assign({ mode: 'melody', sens: 0.5, quant: 0.25, voices: 4 }, opt);
    const { x, sr } = prep(buf, opt.mode === 'poly' ? 11025 : 11025);
    let peak = 0; for (let i = 0; i < x.length; i += 7) peak = Math.max(peak, Math.abs(x[i]));
    const o = { gate: peak * (0.06 - opt.sens * 0.05), minDur: 0.05 + (1 - opt.sens) * 0.07, thresh: 0.78 - opt.sens * 0.18, voices: opt.voices };
    const raw = opt.mode === 'poly' ? await poly(x, sr, o, progress) : await mono(x, sr, o, progress);
    const bpm = opt.bpm || U.detectBPM(buf);
    const grid = opt.bpm ? 0 : U.detectBeatOffset(buf, bpm);
    const spb = 60 / bpm, q = opt.quant;
    const notes = raw.map(n => {
      let s = (n.start - grid) / spb, e = (n.end - grid) / spb;
      if (q) { s = Math.round(s / q) * q; e = Math.max(s + q, Math.round(e / q) * q); }
      return { p: n.p, s: Math.max(0, s), l: Math.max(0.05, e - s), v: n.v };
    }).filter(n => n.p >= 0 && n.p <= 127);
    // aynı perdede çakışan notaları birleştir
    notes.sort((a, b) => a.s - b.s || a.p - b.p);
    const out = [];
    notes.forEach(n => { const prev = out.slice().reverse().find(m => m.p === n.p); if (prev && prev.s + prev.l > n.s + 0.01) prev.l = Math.max(prev.l, n.s + n.l - prev.s); else out.push(n); });
    progress && progress(1);
    return { notes: out, bpm, offset: grid, beats: buf.duration / spb };
  };

  // ---------------- MIDI dosyası yazma ----------------
  TR.toMidi = function (notes, bpm, name, program) {
    const PPQ = 480, ev = [];
    notes.forEach(n => { ev.push({ t: Math.round(n.s * PPQ), d: [0x90, n.p, n.v || 100] }); ev.push({ t: Math.round((n.s + n.l) * PPQ), d: [0x80, n.p, 0] }); });
    ev.sort((a, b) => a.t - b.t || (a.d[0] === 0x80 ? -1 : 1));
    const bytes = [], vlq = v => { const b = [v & 0x7f]; while ((v >>= 7)) b.unshift((v & 0x7f) | 0x80); return b; };
    const tempo = Math.round(60000000 / bpm), nm = [...new TextEncoder().encode(name || 'Mr. Mars')];
    bytes.push(0, 0xff, 0x03, ...vlq(nm.length), ...nm);
    bytes.push(0, 0xff, 0x51, 3, (tempo >> 16) & 255, (tempo >> 8) & 255, tempo & 255);
    bytes.push(0, 0xff, 0x58, 4, (OS.project ? OS.project.sig[0] : 4), 2, 24, 8);
    if (program != null) bytes.push(0, 0xc0, program & 127);
    let last = 0; ev.forEach(e => { bytes.push(...vlq(e.t - last), ...e.d); last = e.t; });
    bytes.push(0, 0xff, 0x2f, 0);
    const head = [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, (PPQ >> 8) & 255, PPQ & 255];
    const len = bytes.length, trk = [0x4d, 0x54, 0x72, 0x6b, (len >> 24) & 255, (len >> 16) & 255, (len >> 8) & 255, len & 255];
    return new Blob([new Uint8Array(head.concat(trk, bytes))], { type: 'audio/midi' });
  };
  // Enstrüman adından genel MIDI programı (dışa aktarılan MIDI başka programlarda doğru çalgıyla açılsın)
  TR.gmProgram = name => {
    const m = { 'Akustik Gitar': 25, 'Klasik Gitar (Naylon)': 24, 'Elektro Gitar (Temiz)': 27, 'Elektro Gitar (Distorsiyon)': 30, 'Bas Gitar': 33, 'Bağlama / Saz': 104, 'Cura': 104, 'Ud': 104, 'Kanun': 107, 'Cümbüş': 105, 'Mandolin': 25, 'Banjo': 105, 'Arp (Harp)': 46, 'Sitar': 104, 'Klavsen': 6, 'Flüt': 73, 'Ney': 77, 'Klarnet': 71, 'Klarnet (Türk / Sol)': 71, 'Obua': 68, 'Saksafon (Alto)': 65, 'Saksafon (Tenor)': 66, 'Trompet': 56, 'Trombon': 57, 'Korno': 60, 'Zurna': 111, 'Mızıka': 22, 'Keman': 40, 'Viyola': 41, 'Çello': 42, 'Kontrbas (Yay)': 43, 'Kemençe': 110, 'Yaylı Grubu (Orkestra)': 48, 'Piyano': 0, 'Elektrik Piyano': 4, 'Org': 16, 'Akordeon': 21, 'Marimba': 12, 'Vibrafon': 11, 'Müzik Kutusu / Çelesta': 10, 'Çan': 14, 'Synth Lead': 81, 'Synth Pad': 89, 'Koro (Aah)': 52 };
    return m[name] != null ? m[name] : 0;
  };

  // ---------------- Ölçülere bölme (nota ve tab için) ----------------
  // Izgara: 1/16 (0.25 vuruş). Her olay: { s (adım), d (adım), ps: [perdeler] } ya da rest.
  TR.measures = function (notes, sig) {
    const bpb = sig[0], spm = bpb * 4, q = n => Math.round(n.s * 4), lenOf = n => Math.max(1, Math.round(n.l * 4));
    const groups = new Map();
    notes.forEach(n => { const k = q(n); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(n); });
    const onsets = [...groups.keys()].sort((a, b) => a - b);
    const total = onsets.length ? Math.ceil((onsets[onsets.length - 1] + 1) / spm) : 1;
    const meas = Array.from({ length: total }, () => []);
    onsets.forEach((k, i) => {
      const g = groups.get(k), next = i + 1 < onsets.length ? onsets[i + 1] : Infinity;
      let d = Math.min(Math.max(...g.map(lenOf)), next - k);
      let s = k;
      // ölçü çizgisini aşan sesleri bağla (tie)
      while (d > 0) {
        const mi = Math.floor(s / spm), room = (mi + 1) * spm - s, dd = Math.min(d, room);
        if (meas[mi]) meas[mi].push({ s: s - mi * spm, d: dd, ps: g.map(n => n.p).sort((a, b) => a - b), tie: d > dd, v: Math.max(...g.map(n => n.v || 100)) });
        d -= dd; s += dd;
      }
    });
    return { meas, spm };
  };

  // ---------------- Gitar / bas tabı ----------------
  const TUNINGS = { gitar: [64, 59, 55, 50, 45, 40], bas: [43, 38, 33, 28] };
  const TNAMES = { gitar: ['e', 'B', 'G', 'D', 'A', 'E'], bas: ['G', 'D', 'A', 'E'] };
  TR.tab = function (notes, sig, kind, fromBar, toBar) {
    const tun = TUNINGS[kind || 'gitar'], names = TNAMES[kind || 'gitar'];
    const { meas, spm } = TR.measures(notes, sig);
    let pos = 3; const lines = [];
    const a = fromBar || 0, b = Math.min(meas.length, toBar || meas.length);
    for (let row = a; row < b; row += 4) {
      const strs = tun.map((_, i) => names[i].padEnd(2) + '|');
      for (let mi = row; mi < Math.min(b, row + 4); mi++) {
        const cols = Array.from({ length: spm }, () => tun.map(() => '--'));
        meas[mi].forEach(ev => {
          const used = new Set();
          ev.ps.slice().sort((x, y) => y - x).forEach(p => {
            let best = null;
            tun.forEach((o, si) => { const fr = p - o; if (fr < 0 || fr > 19 || used.has(si)) return; const cost = Math.abs(fr - pos) + (fr === 0 ? -1 : 0); if (!best || cost < best.cost) best = { si, fr, cost }; });
            if (best) { used.add(best.si); cols[ev.s][best.si] = String(best.fr).padEnd(2, '-'); pos = best.fr || pos; }
          });
        });
        cols.forEach(c => c.forEach((v, si) => strs[si] += v));
        strs.forEach((_, si) => strs[si] += '|');
      }
      lines.push(`${OS.t('Ölçü')} ${row + 1}`, ...strs, '');
    }
    return lines.join('\n');
  };

  // ---------------- Riff bulma ----------------
  TR.riffs = function (notes, sig) {
    // Ölçü çizgisinden bağımsız: nota dizisinde (perde + 1/8 hassasiyetle aralık) tekrar eden kalıpları arar
    const bpb = sig[0];
    const groups = new Map();
    notes.forEach(n => { const k = Math.round(n.s * 4); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(n); });
    const on = [...groups.keys()].sort((x, y) => x - y);
    const tok = on.map((k, i) => groups.get(k).map(n => n.p).sort((x, y) => x - y).join('.') + '/' + (i + 1 < on.length ? Math.min(16, Math.round((on[i + 1] - k) / 2)) : 'x'));
    const used = new Uint8Array(tok.length), found = [];
    for (let L = Math.min(24, Math.floor(tok.length / 2)); L >= 3; L--) {
      const map = new Map();
      for (let i = 0; i + L <= tok.length; i++) {
        const key = tok.slice(i, i + L - 1).join(' ') + ' ' + tok[i + L - 1].split('/')[0];
        if (!map.has(key)) map.set(key, []); map.get(key).push(i);
      }
      for (const [, starts] of map) {
        const ok = []; starts.forEach(st => { if ((!ok.length || st >= ok[ok.length - 1] + L) && !used.slice(st, st + L).some(Boolean)) ok.push(st); });
        if (ok.length < 2) continue;
        ok.forEach(st => used.fill(1, st, st + L));
        found.push({ L, starts: ok });
      }
    }
    found.sort((x, y) => y.L * y.starts.length - x.L * x.starts.length);
    return found.slice(0, 8).map((r, i) => {
      const s0 = on[r.starts[0]] / 4, last = on[r.starts[0] + r.L - 1] / 4;
      const ns = notes.filter(n => n.s >= s0 - 0.01 && n.s <= last + 0.01).map(n => Object.assign({}, n, { s: n.s - s0 }));
      const lenBeats = Math.max(...ns.map(n => n.s + n.l));
      return {
        name: 'Riff ' + String.fromCharCode(65 + i), bars: Math.max(1, Math.round(lenBeats / bpb * 2) / 2), count: r.starts.length,
        starts: r.starts.map(st => Math.floor(on[st] / 4 / bpb) + 1), notes: ns, names: ns.map(n => U.noteName(n.p)).join(' '),
      };
    });
  };

  // ---------------- XML ----------------
  const STEP = ['C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'A', 'B'], ALT = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];
  const TYPES = { 1: ['16th', 0], 2: ['eighth', 0], 3: ['eighth', 1], 4: ['quarter', 0], 6: ['quarter', 1], 8: ['half', 0], 12: ['half', 1], 16: ['whole', 0] };
  const split = d => { const out = []; for (const v of [16, 12, 8, 6, 4, 3, 2, 1]) while (d >= v) { out.push(v); d -= v; } return out; };
  TR.scoreXml = function (notes, sig, bpm, title, instrument) {
    const { meas, spm } = TR.measures(notes, sig);
    const avg = notes.length ? notes.reduce((a, n) => a + n.p, 0) / notes.length : 60;
    const clef = avg < 55 ? '<sign>F</sign><line>4</line>' : '<sign>G</sign><line>2</line>';
    const esc = s => String(s).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c]);
    const pitch = p => `<pitch><step>${STEP[p % 12]}</step>${ALT[p % 12] ? '<alter>1</alter>' : ''}<octave>${Math.floor(p / 12) - 1}</octave></pitch>`;
    const noteXml = (ps, d, tieStart, tieStop) => split(d).map((dd, k, arr) => ps.map((p, i) => {
      const [type, dot] = TYPES[dd];
      const ts = (tieStop || k > 0) ? '<tie type="stop"/>' : '', tst = (tieStart || k < arr.length - 1) ? '<tie type="start"/>' : '';
      return `<note>${i ? '<chord/>' : ''}${pitch(p)}<duration>${dd}</duration>${ts}${tst}<voice>1</voice><type>${type}</type>${dot ? '<dot/>' : ''}${ALT[p % 12] ? '<accidental>sharp</accidental>' : ''}</note>`;
    }).join('')).join('');
    const rest = d => split(d).map(dd => `<note><rest/><duration>${dd}</duration><voice>1</voice><type>${TYPES[dd][0]}</type>${TYPES[dd][1] ? '<dot/>' : ''}</note>`).join('');
    let body = '', prevTie = false;
    meas.forEach((m, i) => {
      let x = `<measure number="${i + 1}">`;
      if (i === 0) x += `<attributes><divisions>4</divisions><key><fifths>0</fifths></key><time><beats>${sig[0]}</beats><beat-type>${sig[1]}</beat-type></time><clef>${clef}</clef></attributes><direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${Math.round(bpm)}</per-minute></metronome></direction-type><sound tempo="${Math.round(bpm)}"/></direction>`;
      let cur = 0;
      m.forEach(ev => { if (ev.s > cur) x += rest(ev.s - cur); x += noteXml(ev.ps, ev.d, ev.tie, prevTie && ev.s === 0); prevTie = ev.tie; cur = ev.s + ev.d; });
      if (cur < spm) x += rest(spm - cur);
      body += x + '</measure>';
    });
    return `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">\n<score-partwise version="3.1"><work><work-title>${esc(title || 'Mr. Mars')}</work-title></work><identification><encoding><software>Mr. Mars Music Studio All in 1</software></encoding></identification><part-list><score-part id="P1"><part-name>${esc(instrument || '')}</part-name></score-part></part-list><part id="P1">${body}</part></score-partwise>`;
  };

  // ---------------- Nota görüntüsü (SVG, yazdırılabilir) ----------------
  // Diatonik konum: C4 = 0; diyezler bir alttaki notanın yerine yazılır
  const DIA = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];
  const diaOf = p => (Math.floor(p / 12) - 5) * 7 + DIA[p % 12];
  TR.scoreSVG = function (notes, sig, opts) {
    opts = opts || {};
    const { meas, spm } = TR.measures(notes, sig);
    const avg = notes.length ? notes.reduce((a, n) => a + n.p, 0) / notes.length : 60;
    const bass = avg < 55; // alt çizgi: sol anahtarında E4 (dia 2), fa anahtarında G2 (dia -10)
    const bottom = bass ? -10 : 2;
    const W = opts.width || 1000, perRow = 4, sp = 8, rowH = 150, left = 60, mw = (W - left - 20) / perRow;
    const rows = Math.max(1, Math.ceil(meas.length / perRow));
    const H = rows * rowH + 70;
    let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Segoe UI, sans-serif"><rect width="100%" height="100%" fill="#fff"/>`;
    if (opts.title) s += `<text x="${W / 2}" y="28" text-anchor="middle" font-size="20" font-weight="700">${opts.title.replace(/[<&]/g, '')}</text>`;
    if (opts.sub) s += `<text x="${W / 2}" y="48" text-anchor="middle" font-size="12" fill="#555">${opts.sub.replace(/[<&]/g, '')}</text>`;
    for (let r = 0; r < rows; r++) {
      const top = 70 + r * rowH + 30, yOf = d => top + 4 * sp - (d - bottom) * sp / 2;
      for (let l = 0; l < 5; l++) s += `<line x1="${left - 40}" x2="${W - 20}" y1="${top + l * sp}" y2="${top + l * sp}" stroke="#000" stroke-width="1"/>`;
      s += `<text x="${left - 38}" y="${top + (bass ? 3.2 : 5) * sp}" font-size="${bass ? 34 : 44}" font-family="Segoe UI Symbol">${bass ? '𝄢' : '𝄞'}</text>`;
      if (r === 0) s += `<text x="${left - 2}" y="${top + 1.9 * sp}" font-size="15" font-weight="700">${sig[0]}</text><text x="${left - 2}" y="${top + 3.9 * sp}" font-size="15" font-weight="700">${sig[1]}</text>`;
      for (let k = 0; k < perRow; k++) {
        const mi = r * perRow + k; if (mi >= meas.length) break;
        const x0 = left + 14 + k * mw;
        s += `<line x1="${x0 + mw - 14}" x2="${x0 + mw - 14}" y1="${top}" y2="${top + 4 * sp}" stroke="#000"/><text x="${x0 - 8}" y="${top - 10}" font-size="9" fill="#777">${mi + 1}</text>`;
        if (opts.marks && opts.marks[mi]) s += `<text x="${x0}" y="${top - 18}" font-size="11" fill="#c0392b" font-weight="700">${opts.marks[mi]}</text>`;
        const xs = st => x0 + 6 + st / spm * (mw - 28);
        meas[mi].forEach(ev => {
          const x = xs(ev.s), d = ev.d, open = d >= 8, flags = d <= 1 ? 2 : d <= 3 ? 1 : 0, dot = d === 3 || d === 6 || d === 12;
          const ds = ev.ps.map(diaOf), up = ds.reduce((a, b) => a + b, 0) / ds.length < bottom + 4;
          ds.forEach((dd, i) => {
            const y = yOf(dd), p = ev.ps[i];
            for (let L = bottom - 2; L >= dd; L -= 2) s += `<line x1="${x - 8}" x2="${x + 8}" y1="${yOf(L)}" y2="${yOf(L)}" stroke="#000"/>`;
            for (let L = bottom + 10; L <= dd; L += 2) s += `<line x1="${x - 8}" x2="${x + 8}" y1="${yOf(L)}" y2="${yOf(L)}" stroke="#000"/>`;
            s += `<ellipse cx="${x}" cy="${y}" rx="5.2" ry="3.8" transform="rotate(-20 ${x} ${y})" fill="${open ? '#fff' : '#000'}" stroke="#000" stroke-width="1.4"/>`;
            if (ALT[p % 12]) s += `<text x="${x - 15}" y="${y + 4}" font-size="13">♯</text>`;
            if (dot) s += `<circle cx="${x + 9}" cy="${y - 1}" r="1.6"/>`;
          });
          if (d < 16) {
            const ys = ds.map(yOf), yTop = Math.min(...ys), yBot = Math.max(...ys), sx = up ? x + 5 : x - 5;
            const y1 = up ? yBot : yTop, y2 = up ? yTop - 28 : yBot + 28;
            s += `<line x1="${sx}" x2="${sx}" y1="${y1}" y2="${y2}" stroke="#000" stroke-width="1.2"/>`;
            for (let f = 0; f < flags; f++) { const fy = y2 + (up ? f * 6 : -f * 6); s += `<path d="M${sx} ${fy} q 8 ${up ? 6 : -6} 6 ${up ? 14 : -14}" fill="none" stroke="#000" stroke-width="1.4"/>`; }
          }
          if (ev.tie) s += `<path d="M${x + 6} ${yOf(ds[0]) + 6} q 12 6 24 0" fill="none" stroke="#000"/>`;
        });
        let cur = 0;
        meas[mi].forEach(ev => { if (ev.s - cur >= 4) s += `<text x="${xs(cur)}" y="${top + 2.6 * sp}" font-size="18" font-family="Segoe UI Symbol">𝄽</text>`; cur = ev.s + ev.d; });
        if (!meas[mi].length) s += `<text x="${x0 + mw / 2 - 20}" y="${top + 2.6 * sp}" font-size="20" font-family="Segoe UI Symbol">𝄻</text>`;
      }
    }
    return s + '</svg>';
  };

  // Not adlarıyla düz metin (solfej / harf)
  TR.noteList = function (notes, sig) {
    const { meas } = TR.measures(notes, sig);
    const SOLF = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
    return meas.map((m, i) => `${OS.t('Ölçü')} ${i + 1}: ` + (m.length ? m.map(ev => ev.ps.map(p => `${U.noteName(p)} (${SOLF[p % 12]})`).join('+')).join('  ') : '—')).join('\n');
  };
})(window.OS);
