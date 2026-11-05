/* Mr. Mars Music Studio · MRH DGN — kayıpsız ses kodlayıcıları: FLAC ve Apple Lossless (ALAC) çerçeveleri */
(function (OS) {
  // Bit yazıcı: en anlamlı bit önce
  class Bits {
    constructor(n) { this.a = new Uint8Array(n || 65536); this.p = 0; this.cur = 0; this.left = 8; }
    room(n) { if (this.p + n >= this.a.length) { const b = new Uint8Array(Math.max(this.a.length * 2, this.p + n + 1024)); b.set(this.a); this.a = b; } }
    bit(v) { this.cur = (this.cur << 1) | v; if (--this.left === 0) { this.room(1); this.a[this.p++] = this.cur; this.cur = 0; this.left = 8; } }
    put(v, n) { // n en çok 53 bit; negatif sayıyı ikiye tümleyen olarak yazar
      if (n > 32) { this.put(Math.floor(v / 4294967296), n - 32); this.put(v % 4294967296, 32); return; }
      this.room((n >> 3) + 2);
      for (let i = n - 1; i >= 0; i--) { const bit = i >= 31 ? Math.floor(v / Math.pow(2, i)) & 1 : (v >> i) & 1; this.cur = (this.cur << 1) | bit; if (--this.left === 0) { this.a[this.p++] = this.cur; this.cur = 0; this.left = 8; } }
    }
    zeros(n) { for (; n >= 8 && this.left === 8; n -= 8) { this.room(1); this.a[this.p++] = 0; } for (; n > 0; n--) this.bit(0); }
    align() { while (this.left !== 8) this.bit(0); }
    bytes() { return this.a.subarray(0, this.p); }
  }
  const toInt = (s, bits, dither) => {
    const n = s.length, out = new Int32Array(n), max = Math.pow(2, bits - 1) - 1, min = -max - 1;
    for (let i = 0; i < n; i++) { let v = s[i] * max; if (dither) v += Math.random() - Math.random(); v = Math.round(v); out[i] = v > max ? max : v < min ? min : v; }
    return out;
  };
  OS.pcmInt = toInt;

  // ---------------- FLAC ----------------
  const CRC8 = new Uint8Array(256), CRC16 = new Uint16Array(256);
  for (let i = 0; i < 256; i++) { let c = i; for (let j = 0; j < 8; j++) c = c & 0x80 ? ((c << 1) ^ 7) & 255 : (c << 1) & 255; CRC8[i] = c; let d = i << 8; for (let j = 0; j < 8; j++) d = d & 0x8000 ? ((d << 1) ^ 0x8005) & 0xffff : (d << 1) & 0xffff; CRC16[i] = d; }
  const crc8 = (a, s, e) => { let c = 0; for (let i = s; i < e; i++) c = CRC8[c ^ a[i]]; return c; };
  const crc16 = (a, s, e) => { let c = 0; for (let i = s; i < e; i++) c = ((c << 8) & 0xffff) ^ CRC16[(c >> 8) ^ a[i]]; return c; };
  const BLOCK = 4096;
  // Sabit öngörücü artıkları (derece 0-4)
  function residual(x, order) {
    const n = x.length, r = new Int32Array(Math.max(0, n - order));
    for (let i = order; i < n; i++) {
      r[i - order] = order === 0 ? x[i] : order === 1 ? x[i] - x[i - 1] : order === 2 ? x[i] - 2 * x[i - 1] + x[i - 2] : order === 3 ? x[i] - 3 * x[i - 1] + 3 * x[i - 2] - x[i - 3] : x[i] - 4 * x[i - 1] + 6 * x[i - 2] - 4 * x[i - 3] + x[i - 4];
    }
    return r;
  }
  const zig = v => (v >= 0 ? v * 2 : -v * 2 - 1);
  function bestK(r, s, e, maxK) {
    let sum = 0; for (let i = s; i < e; i++) sum += zig(r[i]);
    const n = e - s; if (!n) return { k: 0, bits: 0 };
    const mean = sum / n; let k = 0; while (k < maxK && Math.pow(2, k) < mean * 0.7) k++;
    const size = kk => { let b = n * (kk + 1), d = Math.pow(2, kk); for (let i = s; i < e; i++) b += Math.floor(zig(r[i]) / d); return b; };
    let best = size(k); if (k > 0) { const b = size(k - 1); if (b < best) { best = b; k--; } }
    return { k, bits: best };
  }
  function planSub(x, level) {
    const n = x.length; let plan = null, maxPo = level >= 5 ? 6 : level >= 2 ? 4 : 2;
    const orders = n < 8 ? [0] : level >= 2 ? [0, 1, 2, 3, 4] : [1, 2];
    orders.forEach(order => {
      const r = residual(x, order);
      for (let po = 0; po <= maxPo; po++) {
        const parts = 1 << po; if (n % parts) break; const each = n >> po; if (each <= order) break;
        let bits = 0; const ks = []; let at = 0;
        for (let p = 0; p < parts; p++) { const len = p === 0 ? each - order : each, q = bestK(r, at, at + len, 28); ks.push(q.k); bits += q.bits + 5; at += len; }
        if (!plan || bits < plan.bits) plan = { order, po, ks, r, bits, each };
      }
    });
    return plan;
  }
  function writeSub(w, x, bps, plan) {
    w.put(0, 1); w.put(8 + plan.order, 6); w.put(0, 1); // sabit öngörücü, boşa bit yok
    for (let i = 0; i < plan.order; i++) w.put(x[i] < 0 ? x[i] + Math.pow(2, bps) : x[i], bps);
    w.put(1, 2); w.put(plan.po, 4); // RICE2: 5 bit parametre
    let at = 0;
    for (let p = 0; p < plan.ks.length; p++) {
      const k = plan.ks[p], len = p === 0 ? plan.each - plan.order : plan.each, d = Math.pow(2, k);
      w.put(k, 5);
      for (let i = 0; i < len; i++) { const u = zig(plan.r[at + i]), q = Math.floor(u / d); w.zeros(q); w.bit(1); if (k) w.put(u - q * d, k); }
      at += len;
    }
  }
  const SR_CODE = { 88200: 1, 176400: 2, 192000: 3, 8000: 4, 16000: 5, 22050: 6, 24000: 7, 32000: 8, 44100: 9, 48000: 10, 96000: 11 }, BPS_CODE = { 16: 4, 24: 6 };
  // MD5: FLAC başlığında sesin parmak izi olarak durur
  function Md5() {
    const K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) >>> 0), S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
    let h = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476], buf = new Uint8Array(64), fill = 0, total = 0;
    const block = (a, o) => {
      const v = new DataView(a.buffer, a.byteOffset + o, 64); let [A, B, C, D] = h;
      for (let i = 0; i < 64; i++) {
        let F, g, r = i >> 4; if (r === 0) { F = (B & C) | (~B & D); g = i; } else if (r === 1) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; } else if (r === 2) { F = B ^ C ^ D; g = (3 * i + 5) % 16; } else { F = C ^ (B | ~D); g = (7 * i) % 16; }
        const s = S[r * 4 + (i % 4)], x = (A + F + K[i] + v.getUint32(g * 4, true)) | 0; A = D; D = C; C = B; B = (B + ((x << s) | (x >>> (32 - s)))) | 0;
      }
      h = [(h[0] + A) | 0, (h[1] + B) | 0, (h[2] + C) | 0, (h[3] + D) | 0];
    };
    return {
      add(a) { total += a.length; let o = 0; if (fill) { const n = Math.min(64 - fill, a.length); buf.set(a.subarray(0, n), fill); fill += n; o = n; if (fill === 64) { block(buf, 0); fill = 0; } } for (; o + 64 <= a.length; o += 64) block(a, o); if (o < a.length) { buf.set(a.subarray(o), fill); fill += a.length - o; } },
      done() { const bits = total * 8, pad = new Uint8Array(((fill < 56 ? 56 : 120) - fill) + 8); pad[0] = 0x80; const d = new DataView(pad.buffer); d.setUint32(pad.length - 8, bits % 4294967296, true); d.setUint32(pad.length - 4, Math.floor(bits / 4294967296), true); this.add(pad); const out = new Uint8Array(16), v = new DataView(out.buffer); h.forEach((x, i) => v.setUint32(i * 4, x, true)); return out; },
    };
  }
  OS.encodeFlac = async function (L, R, sr, bits, opt) {
    const o = opt || {}, tick = o.tick, prog = o.prog, meta = o.meta || {}, level = o.level == null ? 5 : o.level;
    if (!SR_CODE[sr]) throw new Error('FLAC sample rate ' + sr);
    const l = toInt(L, bits, o.dither), r = R ? toInt(R, bits, o.dither) : null, total = l.length, parts = [], ch = r ? 2 : 1, md5 = Md5(), sb = bits >> 3;
    const head = new Bits(4096);
    head.put(0x664c6143, 32);
    head.put(0, 1); head.put(0, 7); head.put(34, 24);
    head.put(BLOCK, 16); head.put(BLOCK, 16); head.put(0, 24); head.put(0, 24);
    head.put(sr, 20); head.put(ch - 1, 3); head.put(bits - 1, 5); head.put(Math.floor(total / 4294967296), 4); head.put(total % 4294967296, 32);
    const md5At = head.p; for (let i = 0; i < 16; i++) head.put(0, 8);
    const te = new TextEncoder(), vendor = te.encode('MRH DGN'), names = { title: 'TITLE', artist: 'ARTIST', album: 'ALBUM', year: 'DATE', genre: 'GENRE', track: 'TRACKNUMBER', isrc: 'ISRC' }, tags = Object.keys(names).filter(k => meta[k]).map(k => te.encode(names[k] + '=' + meta[k]));
    const vlen = 4 + vendor.length + 4 + tags.reduce((a, t) => a + 4 + t.length, 0);
    head.put(meta.cover ? 0 : 1, 1); head.put(4, 7); head.put(vlen, 24);
    const le = v => { [0, 8, 16, 24].forEach(s => head.put((v >>> s) & 255, 8)); };
    le(vendor.length); vendor.forEach(b => head.put(b, 8)); le(tags.length); tags.forEach(t => { le(t.length); t.forEach(b => head.put(b, 8)); });
    const first = new Uint8Array(head.bytes()); parts.push(first);
    if (meta.cover) {
      const mime = te.encode(meta.coverType || 'image/jpeg'), p = new Bits(64 + mime.length);
      p.put(1, 1); p.put(6, 7); p.put(32 + mime.length + meta.cover.length, 24); p.put(3, 32); p.put(mime.length, 32); mime.forEach(b => p.put(b, 8)); p.put(0, 32); p.put(0, 32); p.put(0, 32); p.put(0, 32); p.put(0, 32); p.put(meta.cover.length, 32);
      parts.push(new Uint8Array(p.bytes()), meta.cover);
    }
    const raw = new Uint8Array(BLOCK * ch * sb);
    let frame = 0;
    for (let at = 0; at < total; at += BLOCK, frame++) {
      const n = Math.min(BLOCK, total - at), a = l.subarray(at, at + n), b = r ? r.subarray(at, at + n) : null;
      let w8 = 0; for (let i = 0; i < n; i++) { const x = a[i]; raw[w8++] = x & 255; raw[w8++] = (x >> 8) & 255; if (sb === 3) raw[w8++] = (x >> 16) & 255; if (b) { const y = b[i]; raw[w8++] = y & 255; raw[w8++] = (y >> 8) & 255; if (sb === 3) raw[w8++] = (y >> 16) & 255; } }
      md5.add(raw.subarray(0, w8));
      const w = new Bits(n * 8); let ms = false, pa, pb, pm, ps, mid, side;
      pa = planSub(a, level);
      if (b) { mid = new Int32Array(n); side = new Int32Array(n); for (let i = 0; i < n; i++) { side[i] = a[i] - b[i]; mid[i] = (a[i] + b[i]) >> 1; } pb = planSub(b, level); pm = planSub(mid, level); ps = planSub(side, level); ms = pm.bits + ps.bits < pa.bits + pb.bits; }
      w.put(0xfff8, 16); w.put(n === BLOCK ? 12 : 7, 4); w.put(SR_CODE[sr], 4); w.put(!b ? 0 : ms ? 10 : 1, 4); w.put(BPS_CODE[bits], 3); w.put(0, 1);
      if (frame < 0x80) w.put(frame, 8);
      else if (frame < 0x800) { w.put(0xc0 | (frame >> 6), 8); w.put(0x80 | (frame & 63), 8); }
      else if (frame < 0x10000) { w.put(0xe0 | (frame >> 12), 8); w.put(0x80 | ((frame >> 6) & 63), 8); w.put(0x80 | (frame & 63), 8); }
      else { w.put(0xf0 | (frame >> 18), 8); w.put(0x80 | ((frame >> 12) & 63), 8); w.put(0x80 | ((frame >> 6) & 63), 8); w.put(0x80 | (frame & 63), 8); }
      if (n !== BLOCK) w.put(n - 1, 16);
      w.put(crc8(w.a, 0, w.p), 8);
      if (ms) { writeSub(w, mid, bits, pm); writeSub(w, side, bits + 1, ps); } else { writeSub(w, a, bits, pa); if (b) writeSub(w, b, bits, pb); }
      w.align();
      w.put(crc16(w.a, 0, w.p), 16);
      parts.push(new Uint8Array(w.bytes()));
      if (frame % 40 === 0) { prog && prog(at / total); if (tick) await tick(); }
    }
    first.set(md5.done(), md5At);
    return parts;
  };

  // ---------------- ALAC çerçeveleri: geçerli "sıkıştırılmamış" kip ----------------
  OS.alacFrames = async function (L, R, bits, opt) {
    const o = opt || {}, l = toInt(L, bits, o.dither), r = R ? toInt(R, bits, o.dither) : null, FRAME = 4096, out = [], total = l.length, full = Math.pow(2, bits);
    for (let at = 0; at < total; at += FRAME) {
      const n = Math.min(FRAME, total - at), partial = n !== FRAME ? 1 : 0, w = new Bits(n * 2 * (bits >> 3) + 32);
      w.put(r ? 1 : 0, 3); w.put(0, 4); w.put(0, 12); w.put(partial, 1); w.put(0, 2); w.put(1, 1); // çift/tek kanal, kaçış
      if (partial) w.put(n, 32);
      for (let i = 0; i < n; i++) { const a = l[at + i]; w.put(a < 0 ? a + full : a, bits); if (r) { const b = r[at + i]; w.put(b < 0 ? b + full : b, bits); } }
      w.put(7, 3); w.align();
      out.push({ data: new Uint8Array(w.bytes()), dur: n });
      if (out.length % 20 === 0) { o.prog && o.prog(at / total); if (o.tick) await o.tick(); }
    }
    return out;
  };
})(window.OS);
