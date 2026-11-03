/* Mr. Mars Music Studio · MRH DGN — mikrotonal akort motoru
 * 12-TET dışında Türk makamları (53 koma / Arel-Ezgi-Uzdilek yaklaşımı), Arap makamları
 * (çeyrek ses), Afrika pentatonik / heksatonik / eşit-yedili diziler ve akort dosyası (.scl) dosyaları.
 * Etkin olduğunda tüm enstrümanlar notaları U.midiToFreq üzerinden seçilen akorda çalar.
 * Klavyede ana ses (tonik) seçilen tuştur; her tuş makamdaki en yakın dereceye cent sapmasıyla
 * oturur. "Makam kilidi" açıkken makamda olmayan tuşlar en yakın dereceye kaydırılır.
 */
(function (OS) {
  const K = 1200 / 53; // 1 koma ≈ 22.64 cent
  const k = arr => arr.map(x => +(x * K).toFixed(2)); // koma dizisini cent'e çevir
  // Dereceler: ana sesten itibaren cent (oktav = 1200, listeye dahil edilmez)
  const SYSTEMS = {
    'Türk Makamları (53 koma)': {
      'Rast': k([0, 9, 17, 22, 31, 40, 48]),
      'Uşşak': k([0, 8, 13, 22, 31, 35, 44]),
      'Hüseyni': k([0, 8, 13, 22, 31, 39, 44]),
      'Hicaz': k([0, 5, 17, 22, 31, 39, 44]),
      'Hicazkar': k([0, 5, 17, 22, 31, 35, 48]),
      'Nihavend': k([0, 9, 13, 22, 31, 35, 44]),
      'Kürdi': k([0, 4, 13, 22, 31, 35, 44]),
      'Saba': k([0, 8, 13, 18, 30, 35, 44]),
      'Segah': k([0, 5, 14, 22, 27, 36, 45]),
      'Hüzzam': k([0, 5, 14, 19, 31, 36, 45]),
      'Karcığar': k([0, 8, 13, 22, 27, 39, 44]),
      'Nikriz': k([0, 9, 13, 25, 31, 39, 44]),
      'Muhayyer': k([0, 8, 13, 22, 31, 39, 44]),
      'Bayati Araban': k([0, 8, 13, 22, 27, 39, 44]),
      'Hümayun': k([0, 5, 17, 22, 31, 35, 44]),
    },
    'Arap Makamları (çeyrek ses)': {
      'Rast (Arap)': [0, 200, 350, 500, 700, 900, 1050],
      'Bayati': [0, 150, 300, 500, 700, 800, 1000],
      'Sikah': [0, 150, 350, 550, 650, 850, 1050],
      'Hijaz': [0, 100, 400, 500, 700, 800, 1000],
      'Saba (Arap)': [0, 150, 300, 400, 700, 800, 1000],
      'Nahawand': [0, 200, 300, 500, 700, 800, 1100],
      'Kurd': [0, 100, 300, 500, 700, 800, 1000],
      'Ajam': [0, 200, 400, 500, 700, 900, 1100],
    },
    'Afrika Dizileri': {
      'Afrika Majör Pentatonik': [0, 200, 400, 700, 900],
      'Afrika Minör Pentatonik': [0, 300, 500, 700, 1000],
      'Afro Heksatonik': [0, 200, 300, 500, 700, 1000],
      'Tizita (Etiyopya)': [0, 200, 400, 700, 900],
      'Bati (Etiyopya)': [0, 400, 500, 700, 1100],
      'Ambassel (Etiyopya)': [0, 100, 500, 700, 800],
      'Anchihoye (Etiyopya)': [0, 100, 500, 600, 800],
      'Eşit Yedili (balafon / Chopi)': [0, 171.43, 342.86, 514.29, 685.71, 857.14, 1028.57],
      'Eşit Beşli (Ganda / kalimba)': [0, 240, 480, 720, 960],
      'Afro Dorian (High-life)': [0, 200, 300, 500, 700, 900, 1000],
    },
    'Batı': {
      'Majör': [0, 200, 400, 500, 700, 900, 1100],
      'Doğal Minör': [0, 200, 300, 500, 700, 800, 1000],
      'Armonik Minör': [0, 200, 300, 500, 700, 800, 1100],
      'Frigyen Dominant': [0, 100, 400, 500, 700, 800, 1000],
      'Blues': [0, 300, 500, 600, 700, 1000],
    },
  };
  const NOTE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  const T = OS.tuning = Object.assign({
    active: false, mode: 'makam', system: 'Türk Makamları (53 koma)', scale: 'Hicaz', tonic: 9, a4: 440, lock: false, scl: null, mapSeq: false,
  }, (() => { try { return JSON.parse(localStorage.getItem('os.tuning') || '{}'); } catch (e) { return {}; } })());
  T.SYSTEMS = SYSTEMS;
  T.save = () => { const o = {}; ['active', 'mode', 'system', 'scale', 'tonic', 'a4', 'lock', 'scl', 'mapSeq'].forEach(x => o[x] = T[x]); try { localStorage.setItem('os.tuning', JSON.stringify(o)); } catch (e) { } document.dispatchEvent(new CustomEvent('os-tuning')); };
  T.degrees = () => T.mode === 'scl' && T.scl ? T.scl.cents : ((SYSTEMS[T.system] || {})[T.scale] || [0, 200, 400, 500, 700, 900, 1100]);
  T.period = () => T.mode === 'scl' && T.scl ? T.scl.period : 1200;

  // Tuştan frekans: tonik tuşuna göre yarım ton uzaklığı -> en yakın derece (cent) + oktav
  T.cents = function (n) {
    const deg = T.degrees(), per = T.period(), rel = n - T.tonic - 60; // tonik: C4 oktavındaki seçili ses
    if (T.mode === 'scl' && T.scl && (T.mapSeq || deg.length !== 12)) {
      // sıralı eşleme: ardışık tuşlar ardışık dereceler (12 notalı olmayan akort dosyaları için)
      const nd = deg.length, o = Math.floor(rel / nd), i = ((rel % nd) + nd) % nd;
      return o * per + deg[i];
    }
    const o = Math.floor(rel / 12), semi = ((rel % 12) + 12) % 12, c12 = semi * 100;
    let best = null, bd = 1e9;
    deg.concat([per]).forEach(c => { const d = Math.abs(c - c12); if (d < bd) { bd = d; best = c; } });
    // kilit kapalıyken makamda karşılığı olmayan tuşlar 12-TET kalır
    if (!T.lock && bd > 60) best = c12;
    return o * per + best;
  };
  T.freq = function (n) {
    const tonicHz = T.a4 * Math.pow(2, (T.tonic + 60 - 69) / 12);
    return tonicHz * Math.pow(2, T.cents(n) / 1200);
  };
  // Tonik ve dizinin yarım tona yuvarlanmış hâli (MIDI araçları / piyano rulosu ölçek kilidi için)
  T.semitoneSet = () => [...new Set(T.degrees().map(c => Math.round(c / 100) % 12))].sort((a, b) => a - b);
  T.describe = () => T.mode === 'scl' && T.scl ? T.scl.name : NOTE[T.tonic] + ' ' + T.scale;
  T.offsets = () => { // her tuş için 12-TET'e göre cent sapması (gösterim)
    const out = []; for (let i = 0; i < 12; i++) { const n = 60 + T.tonic + i; out.push(+(T.cents(n) - i * 100).toFixed(1)); } return out;
  };

  // ---------------- akort dosyası (.scl) ----------------
  T.parseScl = function (text, name) {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('!'));
    if (lines.length < 2) throw new Error('Geçersiz .scl dosyası');
    const desc = lines[0], count = parseInt(lines[1], 10);
    const vals = lines.slice(2, 2 + count).map(l => {
      const tok = l.split(/\s+/)[0];
      if (tok.includes('.')) return parseFloat(tok);
      const [a, b] = tok.split('/').map(Number);
      return 1200 * Math.log2(a / (b || 1));
    });
    if (vals.length !== count || vals.some(v => !isFinite(v))) throw new Error('Geçersiz .scl dosyası');
    const period = vals[vals.length - 1];
    return { name: (desc || name || 'Akort').slice(0, 60), cents: [0].concat(vals.slice(0, -1)), period };
  };
  T.NOTE = NOTE;

  // Makamları MIDI araçlarının / piyano rulosunun ölçek listesine de ekle (yarım tona yuvarlanmış)
  if (OS.SCALES) Object.keys(SYSTEMS).forEach(sys => Object.keys(SYSTEMS[sys]).forEach(n => { if (!OS.SCALES[n]) OS.SCALES[n] = [...new Set(SYSTEMS[sys][n].map(c => Math.round(c / 100) % 12))]; }));
})(window.OS);
