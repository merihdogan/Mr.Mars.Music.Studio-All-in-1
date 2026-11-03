/* Mr. Mars Music Studio · MRH DGN — Eklenti (plugin) API
 *
 * Her efekt, enstrüman, amfi, kabin ve pedal bu API ile kaydedilir; yerleşik
 * cihazlar da dışarıdan yüklenen eklentiler de aynı yolu kullanır.
 *
 * MrMars.register({
 *   id: 'benim.efekt',            // benzersiz kimlik
 *   name: 'Efektim',              // görünen ad
 *   type: 'effect' | 'instrument',
 *   category: 'Gitar' ...,        // menü grubu
 *   params: [ {id, name, min, max, def, unit, curve:'log', type:'choice'|'bool', options:[...] } ],
 *   create(ctx, host) {           // ctx: AudioContext veya OfflineAudioContext
 *     return {
 *       input, output,            // AudioNode (enstrümanlarda input gerekmez)
 *       set(paramId, value),      // parametre değişimi
 *       noteOn(note, vel, time), noteOff(note, time), allOff(),   // enstrümanlar
 *       loadFile(file) / custom   // isteğe bağlı
 *       dispose()
 *     };
 *   },
 *   ui(container, device)         // isteğe bağlı özel arayüz
 * });
 */
(function (OS) {
  const U = OS.U;
  const registry = new Map();
  const listeners = [];

  const API = {
    version: 1,
    register(def) {
      if (!def || !def.id || !def.create) throw new Error('Eklenti tanımı geçersiz: id ve create() gerekli');
      def.type = def.type || 'effect';
      def.params = def.params || [];
      def.category = def.category || (def.type === 'instrument' ? 'Enstrüman' : 'Efekt');
      def.name = def.name || def.id;
      registry.set(def.id, def);
      listeners.forEach(f => f(def));
      return def;
    },
    get: id => registry.get(id),
    all: type => Array.from(registry.values()).filter(d => !type || d.type === type),
    onRegister: f => listeners.push(f),
    utils: U,
  };

  // Eklentilerin göreceği genel ad
  API.yapimci = 'MRH DGN';
  window.MrMars = API;
  OS.plugins = API;

  const defaults = def => {
    const o = {};
    def.params.forEach(p => { o[p.id] = p.def != null ? p.def : (p.min || 0); });
    return o;
  };

  // Bir eklentinin canlı örneğini saran cihaz
  class Device {
    constructor(ctx, pluginId, state) {
      const def = registry.get(pluginId);
      this.ctx = ctx;
      this.pluginId = pluginId;
      this.missing = !def;
      this.def = def || { id: pluginId, name: pluginId + ' (bulunamadı)', type: 'effect', params: [], create: c => { const g = c.createGain(); return { input: g, output: g }; } };
      this.id = (state && state.id) || U.uid();
      this.values = Object.assign(defaults(this.def), (state && state.values) || {});
      this.bypass = !!(state && state.bypass);
      this.extra = (state && state.extra) || {};
      this.in = ctx.createGain();
      this.out = ctx.createGain();
      try {
        this.inst = this.def.create(ctx, { device: this, utils: U, sampleRate: ctx.sampleRate });
      } catch (e) {
        console.error('Eklenti oluşturulamadı', pluginId, e);
        const g = ctx.createGain();
        this.inst = { input: g, output: g };
        this.error = String(e);
      }
      if (this.inst.input) this.in.connect(this.inst.input);
      if (this.inst.output) this.inst.output.connect(this.out);
      for (const k in this.values) this.setParam(k, this.values[k]);
      if (this.inst.restore && this.extra) { try { this.inst.restore(this.extra); } catch (e) { console.warn(e); } }
      if (this.bypass) this.setBypass(true);
    }
    get isInstrument() { return this.def.type === 'instrument'; }
    setParam(id, v) {
      this.values[id] = v;
      try { this.inst.set && this.inst.set(id, v); } catch (e) { console.warn(e); }
    }
    setBypass(b) {
      this.bypass = b;
      if (this.isInstrument) { this.out.gain.value = b ? 0 : 1; return; }
      try { this.in.disconnect(); } catch (e) { }
      if (b) this.in.connect(this.out);
      else if (this.inst.input) this.in.connect(this.inst.input);
    }
    noteOn(n, v, t) { if (this.inst.noteOn) this.inst.noteOn(n, v, t); }
    noteOff(n, t) { if (this.inst.noteOff) this.inst.noteOff(n, t); }
    allOff() { if (this.inst.allOff) this.inst.allOff(); }
    serialize() {
      const extra = this.inst.save ? this.inst.save() : this.extra;
      return { id: this.id, plugin: this.pluginId, values: Object.assign({}, this.values), bypass: this.bypass, extra };
    }
    dispose() {
      try { this.inst.dispose && this.inst.dispose(); } catch (e) { }
      try { this.in.disconnect(); this.out.disconnect(); } catch (e) { }
    }
  }
  OS.Device = Device;

  // Ön ayarlar (tarayıcı belleğinde, eklenti başına)
  OS.presets = {
    list(pid) { try { return JSON.parse(localStorage.getItem('os.presets.' + pid) || '{}'); } catch (e) { return {}; } },
    save(pid, name, values) { const l = this.list(pid); l[name] = values; try { localStorage.setItem('os.presets.' + pid, JSON.stringify(l)); } catch (e) { } },
    remove(pid, name) { const l = this.list(pid); delete l[name]; try { localStorage.setItem('os.presets.' + pid, JSON.stringify(l)); } catch (e) { } },
  };
})(window.OS);
