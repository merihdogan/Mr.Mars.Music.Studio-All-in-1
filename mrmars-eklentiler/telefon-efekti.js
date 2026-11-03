// Mr. Mars Music Studio · MRH DGN — eklenti şablonu: basit "Lo-Fi Telefon" efekti
MrMars.register({
  id: 'kullanici.telefon',
  name: 'Telefon Efekti',
  type: 'effect',
  category: 'Kullanıcı Eklentileri',
  params: [
    { id: 'low',  name: 'Alt Sınır', min: 100,  max: 1000, def: 400,  unit: 'Hz', curve: 'log' },
    { id: 'high', name: 'Üst Sınır', min: 1500, max: 8000, def: 3000, unit: 'Hz', curve: 'log' },
    { id: 'drive', name: 'Bozulma', min: 1, max: 20, def: 3 },
  ],
  create(ctx) {
    const U = MrMars.utils;
    const hp = ctx.createBiquadFilter(), lp = ctx.createBiquadFilter(), ws = ctx.createWaveShaper();
    hp.type = 'highpass'; lp.type = 'lowpass';
    hp.connect(ws); ws.connect(lp);
    return {
      input: hp, output: lp,
      set(id, v) {
        if (id === 'low') hp.frequency.value = v;
        if (id === 'high') lp.frequency.value = v;
        if (id === 'drive') ws.curve = U.curve('soft', v);
      },
    };
  },
});
