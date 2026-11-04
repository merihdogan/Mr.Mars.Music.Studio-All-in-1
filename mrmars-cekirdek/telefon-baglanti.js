/* Mr. Mars Music Studio · MRH DGN — bilgisayar ve telefon arasında doğrudan bağlantı.
   Müzik doğrudan cihazdan cihaza, şifreli WebRTC kanalından akar. Aracı servisler yalnız kısa el sıkışma
   mesajlarını taşır; bunlar QR koddaki anahtarla uçtan uca şifrelidir ve anahtar sunucuya hiç gitmez. */
(function (root) {
  const CHUNK = 16384, HIGH = 1 << 20, LOW = 1 << 18;
  const DEFAULTS = { http: ['https://ntfy.sh'], mqtt: ['wss://broker.emqx.io:8084/mqtt', 'wss://test.mosquitto.org:8081/'] };
  const ICE = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] }];
  const b64u = a => btoa(String.fromCharCode.apply(null, a)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const ub64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  const rand = n => b64u(crypto.getRandomValues(new Uint8Array(n)));
  const hex = buf => Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('');

  // Basit yayın kanalı: EventSource ile dinle, POST ile yayınla
  function httpTransport(base, topic, onData, onState) {
    const es = new EventSource(base + '/' + topic + '/sse?since=all');
    es.onopen = () => onState(true);
    es.onerror = () => onState(false);
    es.onmessage = e => { try { const m = JSON.parse(e.data); if (m.event === 'message' && m.message) onData(m.message); } catch (err) { } };
    return { send: text => fetch(base + '/' + topic, { method: 'POST', body: text, mode: 'cors', headers: { 'Content-Type': 'text/plain' } }).catch(() => { }), close: () => es.close() };
  }
  // En küçük MQTT 3.1.1 istemcisi (WebSocket üzerinden, QoS 0)
  function mqttTransport(url, topic, onData, onState) {
    let ws, ready = false, ping, dead = false;
    const enc = new TextEncoder(), dec = new TextDecoder();
    const str = s => { const b = enc.encode(s); return [b.length >> 8, b.length & 255, ...b]; };
    const packet = (head, body) => { const len = []; let n = body.length; do { let d = n % 128; n = Math.floor(n / 128); if (n) d |= 128; len.push(d); } while (n); return new Uint8Array([head, ...len, ...body]); };
    const open = () => {
      try { ws = new WebSocket(url, 'mqtt'); } catch (e) { onState(false); return; }
      ws.binaryType = 'arraybuffer';
      ws.onopen = () => ws.send(packet(0x10, [...str('MQTT'), 4, 2, 0, 45, ...str('mm' + rand(9))]));
      ws.onerror = () => onState(false);
      ws.onclose = () => { ready = false; clearInterval(ping); onState(false); };
      ws.onmessage = e => {
        const a = new Uint8Array(e.data), type = a[0] >> 4;
        if (type === 2) { ws.send(packet(0x82, [0, 1, ...str(topic), 0])); ping = setInterval(() => { try { ws.send(new Uint8Array([0xc0, 0])); } catch (err) { } }, 30000); return; }
        if (type === 9) { ready = true; onState(true); return; }
        if (type === 3) { let i = 1, n = 0, m = 1, b; do { b = a[i++]; n += (b & 127) * m; m *= 128; } while (b & 128); const tl = (a[i] << 8) | a[i + 1]; i += 2 + tl; onData(dec.decode(a.subarray(i))); }
      };
    };
    open();
    return { send: text => { if (ready) try { ws.send(packet(0x30, [...str(topic), ...enc.encode(text)])); } catch (e) { } }, close: () => { dead = true; clearInterval(ping); try { ws.close(); } catch (e) { } } };
  }
  // Uçtan uca şifreli el sıkışma kanalı: mesaj bütün aracılardan gönderilir, ilk gelen kullanılır
  async function relay(room, keyText, me, onMsg, onState) {
    const key = await crypto.subtle.importKey('raw', ub64u(keyText), 'AES-GCM', false, ['encrypt', 'decrypt']);
    const seen = new Set(), topic = 'mrmars' + room, up = new Set();
    const onData = async text => {
      try {
        const raw = ub64u(text), m = JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: raw.subarray(0, 12) }, key, raw.subarray(12))));
        if (seen.has(m.id) || m.from === me || (m.to && m.to !== me)) return;
        seen.add(m.id); onMsg(m);
      } catch (e) { /* başkasının mesajı ya da bozuk veri */ }
    };
    const cfg = root.OS_RELAYS || DEFAULTS, list = [];
    const state = (name, ok) => { ok ? up.add(name) : up.delete(name); onState && onState(up.size); };
    cfg.http.forEach(u => list.push(httpTransport(u, topic, onData, ok => state(u, ok))));
    cfg.mqtt.forEach(u => list.push(mqttTransport(u, topic, onData, ok => state(u, ok))));
    return {
      async send(obj) {
        const iv = crypto.getRandomValues(new Uint8Array(12)), plain = new TextEncoder().encode(JSON.stringify(Object.assign({ id: rand(8), from: me }, obj)));
        const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain)), all = new Uint8Array(12 + ct.length); all.set(iv); all.set(ct, 12);
        const text = b64u(all); list.forEach(t => t.send(text));
      },
      close() { list.forEach(t => t.close()); },
    };
  }
  const gather = (pc, ms) => new Promise(res => {
    if (pc.iceGatheringState === 'complete') return res();
    const t = setTimeout(res, ms || 1500);
    pc.addEventListener('icegatheringstatechange', () => { if (pc.iceGatheringState === 'complete') { clearTimeout(t); res(); } });
  });
  // Mesaj sınırına sığsın: TCP adayları ve gereksiz satırlar atılır
  const slim = d => ({ type: d.type, sdp: d.sdp.split('\r\n').filter(l => !(l.startsWith('a=candidate:') && / tcp /i.test(l))).join('\r\n') });
  const iceList = () => root.OS_ICE !== undefined ? root.OS_ICE : ICE;
  async function createOffer() {
    const pc = new RTCPeerConnection({ iceServers: iceList() }), dc = pc.createDataChannel('mix', { ordered: true });
    dc.binaryType = 'arraybuffer';
    await pc.setLocalDescription(await pc.createOffer());
    await gather(pc);
    return { pc, dc, desc: slim(pc.localDescription) };
  }
  async function createAnswer(desc) {
    const pc = new RTCPeerConnection({ iceServers: iceList() });
    await pc.setRemoteDescription(desc);
    await pc.setLocalDescription(await pc.createAnswer());
    await gather(pc);
    return { pc, desc: slim(pc.localDescription) };
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
  function receiver(dc, on) {
    dc.binaryType = 'arraybuffer';
    let cur = null;
    dc.addEventListener('message', async e => {
      if (typeof e.data === 'string') {
        const m = JSON.parse(e.data);
        if (m.kind === 'status') on.status && on.status(m);
        if (m.kind === 'error') on.remoteError && on.remoteError(m);
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
  root.OSLink = { rand, relay, createOffer, createAnswer, sendFile, receiver };
})(window);
