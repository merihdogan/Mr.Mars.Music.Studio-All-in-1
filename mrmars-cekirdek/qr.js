/* Mr. Mars Music Studio · MRH DGN — QR kod üretici (ISO 18004, bayt kipi, M düzeltme). İnternet gerektirmez. */
(function (root) {
  const ECC = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28];
  const BLOCKS = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49];
  const rawModules = v => { let r = (16 * v + 128) * v + 64; if (v >= 2) { const n = Math.floor(v / 7) + 2; r -= (25 * n - 10) * n - 55; if (v >= 7) r -= 36; } return r; };
  const dataCodewords = v => Math.floor(rawModules(v) / 8) - ECC[v] * BLOCKS[v];
  const mul = (x, y) => { let z = 0; for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11d); z ^= ((y >>> i) & 1) * x; } return z & 255; };
  function rsDivisor(deg) { const r = new Array(deg).fill(0); r[deg - 1] = 1; let root = 1; for (let i = 0; i < deg; i++) { for (let j = 0; j < deg; j++) { r[j] = mul(r[j], root); if (j + 1 < deg) r[j] ^= r[j + 1]; } root = mul(root, 2); } return r; }
  function rsRemainder(data, div) { const r = new Array(div.length).fill(0); for (const b of data) { const f = b ^ r.shift(); r.push(0); div.forEach((c, i) => { r[i] ^= mul(c, f); }); } return r; }
  const alignPositions = v => { if (v === 1) return []; const n = Math.floor(v / 7) + 2, step = v === 32 ? 26 : Math.ceil((v * 4 + 4) / (n * 2 - 2)) * 2, r = [6]; for (let p = v * 4 + 17 - 7, i = n - 1; i >= 1; i--, p -= step) r.splice(1, 0, p); return r; };

  function encode(text) {
    const bytes = Array.from(new TextEncoder().encode(text));
    let ver = 1; for (; ver <= 40; ver++) { const head = 4 + (ver <= 9 ? 8 : 16); if (head + bytes.length * 8 <= dataCodewords(ver) * 8) break; }
    if (ver > 40) throw new Error('QR: too long');
    const bits = [], push = (v, n) => { for (let i = n - 1; i >= 0; i--) bits.push((v >>> i) & 1); };
    push(4, 4); push(bytes.length, ver <= 9 ? 8 : 16); bytes.forEach(b => push(b, 8));
    const cap = dataCodewords(ver) * 8;
    push(0, Math.min(4, cap - bits.length)); push(0, (8 - bits.length % 8) % 8);
    for (let p = 0xec; bits.length < cap; p ^= 0xec ^ 0x11) push(p, 8);
    const data = []; for (let i = 0; i < bits.length; i += 8) { let b = 0; for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j]; data.push(b); }
    // Bloklara böl, düzeltme ekle, sırayla ör
    const nb = BLOCKS[ver], ec = ECC[ver], raw = Math.floor(rawModules(ver) / 8), nShort = nb - raw % nb, shortLen = Math.floor(raw / nb), div = rsDivisor(ec), blocks = [];
    for (let i = 0, k = 0; i < nb; i++) { const d = data.slice(k, k + shortLen - ec + (i < nShort ? 0 : 1)); k += d.length; blocks.push({ d, e: rsRemainder(d, div) }); }
    const all = [];
    for (let i = 0; i <= shortLen - ec; i++) blocks.forEach((b, j) => { if (i < shortLen - ec || j >= nShort) all.push(b.d[i]); });
    for (let i = 0; i < ec; i++) blocks.forEach(b => all.push(b.e[i]));
    // Sabit desenler
    const size = ver * 4 + 17, mods = Array.from({ length: size }, () => new Uint8Array(size)), fixed = Array.from({ length: size }, () => new Uint8Array(size));
    const set = (x, y, v) => { if (x >= 0 && y >= 0 && x < size && y < size) { mods[y][x] = v ? 1 : 0; fixed[y][x] = 1; } };
    for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
    [[3, 3], [size - 4, 3], [3, size - 4]].forEach(([cx, cy]) => { for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const d = Math.max(Math.abs(dx), Math.abs(dy)); set(cx + dx, cy + dy, d !== 2 && d !== 4); } });
    const ap = alignPositions(ver);
    ap.forEach((a, i) => ap.forEach((b, j) => { if ((i === 0 && j === 0) || (i === 0 && j === ap.length - 1) || (i === ap.length - 1 && j === 0)) return; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(a + dx, b + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1); }));
    const format = mask => {
      const d = mask; let r = d; for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
      const b = ((d << 10) | r) ^ 0x5412, g = i => (b >>> i) & 1; // M düzeltme düzeyinin kodu 00
      for (let i = 0; i <= 5; i++) set(8, i, g(i));
      set(8, 7, g(6)); set(8, 8, g(7)); set(7, 8, g(8));
      for (let i = 9; i < 15; i++) set(14 - i, 8, g(i));
      for (let i = 0; i < 8; i++) set(size - 1 - i, 8, g(i));
      for (let i = 8; i < 15; i++) set(8, size - 15 + i, g(i));
      set(8, size - 8, 1);
    };
    format(0);
    if (ver >= 7) { let r = ver; for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25); const b = (ver << 12) | r; for (let i = 0; i < 18; i++) { const a = size - 11 + i % 3, c = Math.floor(i / 3), v = (b >>> i) & 1; set(a, c, v); set(c, a, v); } }
    // Veriyi zikzak yerleştir
    let idx = 0;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < size; vert++) for (let j = 0; j < 2; j++) {
        const x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - vert : vert;
        if (!fixed[y][x] && idx < all.length * 8) { mods[y][x] = (all[idx >>> 3] >>> (7 - (idx & 7))) & 1; idx++; }
      }
    }
    const invert = {
      0: (x, y) => (x + y) % 2 === 0, 1: (x, y) => y % 2 === 0, 2: x => x % 3 === 0, 3: (x, y) => (x + y) % 3 === 0,
      4: (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, 5: (x, y) => x * y % 2 + x * y % 3 === 0, 6: (x, y) => (x * y % 2 + x * y % 3) % 2 === 0, 7: (x, y) => ((x + y) % 2 + x * y % 3) % 2 === 0,
    };
    const applyMask = m => { for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fixed[y][x] && invert[m](x, y)) mods[y][x] ^= 1; };
    const penalty = () => {
      let s = 0, dark = 0;
      const line = get => { let run = 0, last = -1, seq = 0; for (let i = 0; i < size; i++) { const c = get(i); if (c === last) { run++; if (run === 5) s += 3; else if (run > 5) s++; } else { run = 1; last = c; } seq = ((seq << 1) | c) & 0x7ff; if (i >= 10 && (seq === 0x05d || seq === 0x5d0)) s += 40; } };
      for (let i = 0; i < size; i++) { line(x => mods[i][x]); line(y => mods[y][i]); }
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { dark += mods[y][x]; if (x + 1 < size && y + 1 < size) { const c = mods[y][x]; if (c === mods[y][x + 1] && c === mods[y + 1][x] && c === mods[y + 1][x + 1]) s += 3; } }
      return s + Math.floor(Math.abs(dark * 20 - size * size * 10) / (size * size)) * 10;
    };
    let best = 0, low = Infinity;
    for (let m = 0; m < 8; m++) { applyMask(m); format(m); const p = penalty(); if (p < low) { low = p; best = m; } applyMask(m); }
    applyMask(best); format(best);
    return { size, version: ver, mask: best, get: (x, y) => mods[y][x] === 1 };
  }
  // Tuval üzerine, çevresinde sessiz alanla çizer
  function draw(canvas, text, pixels) {
    const q = encode(text), n = q.size + 8, scale = Math.max(2, Math.floor((pixels || 360) / n));
    canvas.width = canvas.height = n * scale;
    const g = canvas.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, canvas.width, canvas.height); g.fillStyle = '#000';
    for (let y = 0; y < q.size; y++) for (let x = 0; x < q.size; x++) if (q.get(x, y)) g.fillRect((x + 4) * scale, (y + 4) * scale, scale, scale);
    return q;
  }
  root.OSQR = { encode, draw };
})(window);
