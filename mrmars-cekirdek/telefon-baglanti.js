/* Mr. Mars Music Studio · MRH DGN — bilgisayar ve telefon arasında doğrudan bağlantı.
   Dosya aracı sunucudan geçmez. Bağlantı bilgisi iki QR kodla değiş tokuş edilir, veri şifreli WebRTC kanalından akar. */
(function (root) {
  const PREFIX = 'MRA1.', CHUNK = 16384, HIGH = 1 << 20, LOW = 1 << 18;
  const b64u = s => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const ub64u = s => atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  const hexToB64 = h => b64u(h.split(':').map(x => String.fromCharCode(parseInt(x, 16))).join(''));
  const b64ToHex = s => Array.from(ub64u(s), c => c.charCodeAt(0).toString(16).padStart(2, '0').toUpperCase()).join(':');

  // SDP'nin yalnız gerekli alanları: QR kod küçük kalsın
  function pack(desc) {
    const L = desc.sdp.split(/\r?\n/), val = k => { const l = L.find(x => x.startsWith(k)); return l ? l.slice(k.length) : ''; };
    const cands = L.filter(x => x.startsWith('a=candidate:')).map(x => x.slice(12).split(' ')).filter(p => p[2].toLowerCase() === 'udp' && p[7] === 'host' || p[7] === 'srflx')
      .map(p => [p[4], +p[5], p[7] === 'srflx' ? 1 : 0]).filter(c => !/^127\.|^::1$/.test(c[0]));
    const rank = ip => /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip) ? 0 : ip.endsWith('.local') ? 1 : ip.includes(':') ? 3 : 2;
    cands.sort((a, b) => rank(a[0]) - rank(b[0]));
    const fp = val('a=fingerprint:sha-256 ');
    if (!fp) throw new Error('fingerprint');
    return b64u(JSON.stringify([desc.type === 'offer' ? 0 : 1, val('a=ice-ufrag:'), val('a=ice-pwd:'), hexToB64(fp), cands.slice(0, 4), val('a=setup:')]));
  }
  function unpack(text) {
    const [t, ufrag, pwd, fp, cands, setup] = JSON.parse(ub64u(text));
    const type = t === 0 ? 'offer' : 'answer';
    const sdp = ['v=0', 'o=- 1 2 IN IP4 127.0.0.1', 's=-', 't=0 0', 'a=group:BUNDLE 0', 'a=msid-semantic: WMS', 'm=application 9 UDP/DTLS/SCTP webrtc-datachannel', 'c=IN IP4 0.0.0.0',
      ...cands.map((c, i) => `a=candidate:${i + 1} 1 udp ${2122260223 - i * 256} ${c[0]} ${c[1]} typ ${c[2] ? 'srflx raddr 0.0.0.0 rport 0' : 'host'}`),
      'a=ice-ufrag:' + ufrag, 'a=ice-pwd:' + pwd, 'a=fingerprint:sha-256 ' + b64ToHex(fp), 'a=setup:' + setup, 'a=mid:0', 'a=sctp-port:5000', 'a=max-message-size:262144', ''].join('\r\n');
    return { type, sdp };
  }
  const gather = (pc, ms) => new Promise(res => {
    if (pc.iceGatheringState === 'complete') return res();
    const t = setTimeout(res, ms || 2500);
    pc.addEventListener('icegatheringstatechange', () => { if (pc.iceGatheringState === 'complete') { clearTimeout(t); res(); } });
  });
  const hex = buf => Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('');

  // Gönderen: bağlantıyı başlatır
  async function createOffer(iceServers) {
    const pc = new RTCPeerConnection({ iceServers: iceServers || [] }), dc = pc.createDataChannel('mix', { ordered: true });
    dc.binaryType = 'arraybuffer';
    await pc.setLocalDescription(await pc.createOffer());
    await gather(pc);
    return { pc, dc, code: pack(pc.localDescription) };
  }
  const acceptAnswer = (pc, code) => pc.setRemoteDescription(unpack(code.startsWith(PREFIX) ? code.slice(PREFIX.length) : code));
  // Alan: teklifi yanıtlar
  async function createAnswer(code, iceServers) {
    const pc = new RTCPeerConnection({ iceServers: iceServers || [] });
    await pc.setRemoteDescription(unpack(code));
    await pc.setLocalDescription(await pc.createAnswer());
    await gather(pc);
    return { pc, code: PREFIX + pack(pc.localDescription) };
  }
  // Dosyayı parça parça gönderir: kanal dolunca bekler, karşı taraf doğrulayınca biter
  async function sendFile(dc, blob, name, onProgress) {
    const buf = await blob.arrayBuffer(), sha = hex(await crypto.subtle.digest('SHA-256', buf));
    const ack = new Promise((res, rej) => { const h = e => { if (typeof e.data !== 'string') return; const m = JSON.parse(e.data); if (m.kind === 'ack') { dc.removeEventListener('message', h); m.ok ? res() : rej(new Error('checksum')); } }; dc.addEventListener('message', h); });
    dc.send(JSON.stringify({ kind: 'file', name, type: blob.type, size: buf.byteLength, sha }));
    dc.bufferedAmountLowThreshold = LOW;
    for (let o = 0; o < buf.byteLength; o += CHUNK) {
      if (dc.readyState !== 'open') throw new Error('closed');
      if (dc.bufferedAmount > HIGH) await new Promise(r => { const f = () => { dc.removeEventListener('bufferedamountlow', f); r(); }; dc.addEventListener('bufferedamountlow', f); });
      dc.send(buf.slice(o, Math.min(buf.byteLength, o + CHUNK)));
      if (onProgress && (o % (CHUNK * 32)) === 0) onProgress(o / buf.byteLength);
    }
    if (onProgress) onProgress(1);
    await ack;
  }
  // Alan: durumları ve biten dosyaları bildirir
  function receiver(dc, on) {
    dc.binaryType = 'arraybuffer';
    let cur = null;
    dc.addEventListener('message', async e => {
      if (typeof e.data === 'string') {
        const m = JSON.parse(e.data);
        if (m.kind === 'status') on.status && on.status(m);
        if (m.kind === 'file') { cur = { meta: m, parts: [], got: 0 }; on.start && on.start(m); }
        return;
      }
      if (!cur) return;
      cur.parts.push(e.data); cur.got += e.data.byteLength;
      on.progress && on.progress(cur.got / cur.meta.size);
      if (cur.got >= cur.meta.size) {
        const c = cur; cur = null;
        const blob = new Blob(c.parts, { type: c.meta.type }), ok = hex(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())) === c.meta.sha;
        dc.send(JSON.stringify({ kind: 'ack', ok }));
        ok ? on.done(blob, c.meta) : on.error && on.error('checksum');
      }
    });
  }
  root.OSLink = { PREFIX, pack, unpack, createOffer, acceptAnswer, createAnswer, sendFile, receiver };
})(window);
