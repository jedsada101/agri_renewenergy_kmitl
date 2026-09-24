/* ============================================================
   anim.js — scroll reveals and the interactive chapter demos

   Every animation here is meant to teach something:
     · reveal      — draws the eye to the next idea, nothing more
     · diagram flow— shows the DIRECTION energy travels
     · demo A      — power is a rate, energy is what accumulates
     · demo B      — capacity factor turns kW into kWh
   ============================================================ */
(function () {
  'use strict';

  var reduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. Scroll reveal ---------- */
  document.documentElement.classList.add('anim-ready');

  var revealables = document.querySelectorAll('[data-reveal], [data-reveal-stagger], .figure');

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);          // reveal once, then stop watching
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealables.forEach(function (el) { io.observe(el); });
  } else {
    revealables.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- helpers ---------- */
  function fmt(n, digits) {
    return n.toLocaleString('en-US', {
      minimumFractionDigits: digits === undefined ? 1 : digits,
      maximumFractionDigits: digits === undefined ? 1 : digits
    });
  }

  /* ============================================================
     2. Demo A — power versus energy (the pump and the tank)

     Power sets the flow rate in the pipe; energy is the water that
     has collected in the tank. One simulated hour per real second.
     ============================================================ */
  (function powerEnergyDemo() {
    var root = document.querySelector('[data-demo="power-energy"]');
    if (!root) return;

    var MAX_HOURS = 8;
    var MAX_KW = 10;
    var TANK_TOP = 40, TANK_BOTTOM = 196;   // SVG coordinates
    var TANK_H = TANK_BOTTOM - TANK_TOP;
    var CAPACITY = MAX_KW * MAX_HOURS;      // 80 kWh fills the tank

    var slider  = root.querySelector('[data-pe-slider]');
    var btnPlay = root.querySelector('[data-pe-play]');
    var btnReset= root.querySelector('[data-pe-reset]');
    var fill    = root.querySelector('[data-pe-fill]');
    var outP    = root.querySelector('[data-pe-power]');
    var outT    = root.querySelector('[data-pe-time]');
    var outE    = root.querySelector('[data-pe-energy]');
    var playTh  = root.querySelector('[data-pe-play-th]');
    var playEn  = root.querySelector('[data-pe-play-en]');

    var power = parseFloat(slider.value);
    var hours = 0, energy = 0;
    var running = false, last = 0, raf = 0;

    var LABEL = {
      start: { th: 'เริ่มเดินปั๊ม', en: 'Start the pump' },
      pause: { th: 'หยุดชั่วคราว', en: 'Pause' },
      done:  { th: 'ครบ 8 ชั่วโมง', en: '8 hours done' }
    };

    function setPlayLabel(key) {
      playTh.textContent = LABEL[key].th;
      playEn.textContent = LABEL[key].en;
    }

    function draw() {
      var h = Math.min(1, energy / CAPACITY) * TANK_H;
      fill.setAttribute('y', TANK_BOTTOM - h);
      fill.setAttribute('height', h);
      outP.textContent = fmt(power);
      outT.textContent = fmt(hours);
      outE.textContent = fmt(energy);
      // droplets travel faster when the pump is bigger
      root.style.setProperty('--pe-speed', (1.6 - (power / MAX_KW) * 1.25).toFixed(2) + 's');
    }

    function step(ts) {
      if (!running) return;
      if (!last) last = ts;
      var dt = (ts - last) / 1000;          // real seconds
      last = ts;
      hours += dt;                          // 1 s  ->  1 h
      if (hours >= MAX_HOURS) {
        hours = MAX_HOURS;
        energy = power * MAX_HOURS;
        stop('done');
        draw();
        return;
      }
      energy = power * hours;               // E = P x t
      draw();
      raf = requestAnimationFrame(step);
    }

    function start() {
      if (hours >= MAX_HOURS) reset();
      running = true; last = 0;
      root.classList.add('is-running');
      setPlayLabel('pause');
      raf = requestAnimationFrame(step);
    }

    function stop(label) {
      running = false;
      cancelAnimationFrame(raf);
      root.classList.remove('is-running');
      setPlayLabel(label || 'start');
    }

    function reset() {
      stop('start');
      hours = 0; energy = 0;
      draw();
    }

    slider.addEventListener('input', function () {
      power = parseFloat(slider.value);
      energy = power * hours;               // rescale what is already in the tank
      draw();
    });
    btnPlay.addEventListener('click', function () { running ? stop('start') : start(); });
    btnReset.addEventListener('click', reset);

    // When motion is not wanted, show the finished state instead of moving to it.
    if (reduced) {
      hours = MAX_HOURS;
      energy = power * MAX_HOURS;
      setPlayLabel('done');
    }
    draw();
  })();

  /* ============================================================
     3. Demo B — capacity factor
     Shows what a chosen capacity factor means for a 1 MW plant:
     equivalent full-load hours and annual energy.
     ============================================================ */
  (function capacityFactorDemo() {
    var root = document.querySelector('[data-demo="capacity-factor"]');
    if (!root) return;

    var HOURS_YEAR = 8760;
    var RATED_MW = 1;

    var slider = root.querySelector('[data-cf-slider]');
    var fill   = root.querySelector('[data-cf-fill]');
    var outCF  = root.querySelector('[data-cf-value]');
    var outHrs = root.querySelector('[data-cf-hours]');
    var outEn  = root.querySelector('[data-cf-energy]');
    var presets = root.querySelectorAll('[data-cf-preset]');

    function render(cf) {
      var pct = cf / 100;
      fill.style.width = cf + '%';
      outCF.textContent = fmt(cf, 0);
      outHrs.textContent = Math.round(HOURS_YEAR * pct).toLocaleString('en-US');
      outEn.textContent = fmt(RATED_MW * HOURS_YEAR * pct / 1000, 2);
      presets.forEach(function (b) {
        b.classList.toggle('is-on', Math.abs(parseFloat(b.dataset.cfPreset) - cf) < 0.5);
      });
    }

    slider.addEventListener('input', function () { render(parseFloat(slider.value)); });
    presets.forEach(function (b) {
      b.addEventListener('click', function () {
        slider.value = b.dataset.cfPreset;
        render(parseFloat(slider.value));
      });
    });

    render(parseFloat(slider.value));
  })();

  /* ============================================================
     4. Demo C — moisture versus usable energy  (chapter 2)

     Takes 1 kg of fuel AS RECEIVED and splits the dry fuel's heating
     value into four parts, so the whole bar always totals HHV(dry):
       · usable        LHV as received
       · fuel moisture latent heat spent boiling the water in the fuel
       · hydrogen      latent heat of the water made by burning H
       · not fuel      the share of the kilogram that is water, not fuel
     ============================================================ */
  (function moistureEnergyDemo() {
    var root = document.querySelector('[data-demo="moisture-energy"]');
    if (!root) return;

    var LATENT = 2.442;   // MJ per kg of water vapour at 25 °C

    var FUELS = {
      wood:    { hhv: 19.0, h: 6.1 },
      husk:    { hhv: 15.5, h: 5.0 },
      bagasse: { hhv: 18.5, h: 5.8 }
    };

    var slider = root.querySelector('[data-me-slider]');
    var segs = {
      usable: root.querySelector('[data-me-seg="usable"]'),
      moist:  root.querySelector('[data-me-seg="moist"]'),
      hyd:    root.querySelector('[data-me-seg="hyd"]'),
      water:  root.querySelector('[data-me-seg="water"]')
    };
    var outM    = root.querySelector('[data-me-moisture]');
    var outLHV  = root.querySelector('[data-me-lhv]');
    var outMass = root.querySelector('[data-me-mass]');
    var outMax  = root.querySelector('[data-me-max]');
    var warn    = root.querySelector('[data-me-warn]');
    var presets = root.querySelectorAll('[data-me-fuel]');
    var fuel = 'husk';

    function render() {
      var f = FUELS[fuel];
      var M = parseFloat(slider.value) / 100;      // wet basis, mass fraction
      var hhvAr = f.hhv * (1 - M);                 // MJ per kg as received
      var hAr = (f.h / 100) * (1 - M);             // hydrogen mass fraction, as received
      var lossHyd = LATENT * 9 * hAr;
      var lossMoist = LATENT * M;
      var lhvAr = hhvAr - lossHyd - lossMoist;
      var notFuel = f.hhv * M;

      var total = f.hhv;
      var pct = function (v) { return Math.max(0, v / total * 100); };

      segs.usable.style.width = pct(lhvAr) + '%';
      segs.moist.style.width  = pct(lossMoist) + '%';
      segs.hyd.style.width    = pct(lossHyd) + '%';
      segs.water.style.width  = pct(notFuel) + '%';
      segs.usable.textContent = lhvAr > 2 ? fmt(lhvAr) + ' MJ' : '';

      outM.textContent = fmt(M * 100, 0);
      outLHV.textContent = fmt(Math.max(0, lhvAr), 2);
      outMass.textContent = lhvAr > 0.2
        ? Math.round(1000 / lhvAr).toLocaleString('en-US')
        : '∞';
      outMax.textContent = fmt(f.hhv, 1);

      presets.forEach(function (b) { b.classList.toggle('is-on', b.dataset.meFuel === fuel); });
      warn.hidden = lhvAr > 3;
    }

    slider.addEventListener('input', render);
    presets.forEach(function (b) {
      b.addEventListener('click', function () { fuel = b.dataset.meFuel; render(); });
    });
    render();
  })();

  /* ============================================================
     5. Demo D — agricultural residue calculator  (chapter 2)

     Main product tonnage  ->  residue tonnage  ->  energy  ->  electricity.
     Values are teaching approximations; the chapter says so in the note.
     ============================================================ */
  (function residueDemo() {
    var root = document.querySelector('[data-demo="residue-calc"]');
    if (!root) return;

    /* rpr = residue per tonne of main product · m = moisture as collected
       lhv = MJ/kg as received */
    var CROPS = {
      husk:    { rpr: 0.22, lhv: 13.0 },
      straw:   { rpr: 0.45, lhv: 12.5 },
      bagasse: { rpr: 0.28, lhv: 7.7 },
      efb:     { rpr: 0.22, lhv: 5.5 },
      cob:     { rpr: 0.27, lhv: 13.5 },
      rhizome: { rpr: 0.08, lhv: 12.0 }
    };
    var ETA = 0.22;          // biomass power plant, fuel energy to electricity
    var DIESEL_MJ_PER_L = 36.0;

    var input = root.querySelector('[data-rc-input]');
    var presets = root.querySelectorAll('[data-rc-crop]');
    var outResidue = root.querySelector('[data-rc-residue]');
    var outEnergy = root.querySelector('[data-rc-energy]');
    var outPower = root.querySelector('[data-rc-power]');
    var outDiesel = root.querySelector('[data-rc-diesel]');
    var crop = 'husk';

    function render() {
      var tonnes = parseFloat(input.value);
      if (!isFinite(tonnes) || tonnes < 0) tonnes = 0;
      var c = CROPS[crop];

      var residue = tonnes * c.rpr;                  // tonnes per year
      var energyMJ = residue * 1000 * c.lhv;         // MJ per year
      var elecMWh = energyMJ * ETA / 3600;           // MJ -> MWh
      var dieselL = energyMJ / DIESEL_MJ_PER_L;

      outResidue.textContent = fmt(residue, residue < 100 ? 1 : 0);
      outEnergy.textContent = fmt(energyMJ / 1000, energyMJ / 1000 < 100 ? 1 : 0);
      outPower.textContent = fmt(elecMWh, elecMWh < 100 ? 1 : 0);
      outDiesel.textContent = Math.round(dieselL).toLocaleString('en-US');

      presets.forEach(function (b) { b.classList.toggle('is-on', b.dataset.rcCrop === crop); });
    }

    input.addEventListener('input', render);
    presets.forEach(function (b) {
      b.addEventListener('click', function () { crop = b.dataset.rcCrop; render(); });
    });
    render();
  })();

  /* ============================================================
     6. Demo E — excess air and stack temperature  (chapter 2)

     A deliberately simple dry-flue-gas-loss model for a rice husk
     furnace. It shows the two operator-controllable levers; it is not
     a boiler design tool (radiation, unburned carbon and the moisture
     term are all left out, and the chapter says so).
     ============================================================ */
  (function excessAirDemo() {
    var root = document.querySelector('[data-demo="excess-air"]');
    if (!root) return;

    var AF_ST = 4.60;     // kg air per kg fuel, stoichiometric (rice husk)
    var LHV = 12.4;       // MJ/kg as received
    var CP_FG = 1.1;      // kJ/kg-K, flue gas
    var T_AMBIENT = 30;   // °C

    var sLambda = root.querySelector('[data-ea-lambda-slider]');
    var sTemp = root.querySelector('[data-ea-temp-slider]');
    var segUseful = root.querySelector('[data-ea-seg="useful"]');
    var segLoss = root.querySelector('[data-ea-seg="loss"]');
    var outLambda = root.querySelector('[data-ea-lambda]');
    var outO2 = root.querySelector('[data-ea-o2]');
    var outAir = root.querySelector('[data-ea-air]');
    var outEff = root.querySelector('[data-ea-eff]');
    var warn = root.querySelector('[data-ea-warn]');

    function render() {
      var lambda = parseFloat(sLambda.value);
      var tStack = parseFloat(sTemp.value);

      var air = lambda * AF_ST;                       // kg air per kg fuel
      var o2 = 21 * (1 - 1 / lambda);                 // % in dry flue gas
      var mFlue = 1 + air;                            // kg flue gas per kg fuel
      var lossMJ = mFlue * CP_FG * (tStack - T_AMBIENT) / 1000;
      var useful = Math.max(0, LHV - lossMJ);
      var eff = useful / LHV * 100;

      segUseful.style.width = (useful / LHV * 100) + '%';
      segLoss.style.width = Math.min(100, lossMJ / LHV * 100) + '%';
      segUseful.textContent = eff > 18 ? fmt(useful, 1) + ' MJ' : '';

      outLambda.textContent = fmt(lambda, 2);
      outO2.textContent = fmt(o2, 1);
      outAir.textContent = fmt(air, 1);
      outEff.textContent = fmt(eff, 0);

      warn.hidden = lambda >= 1.2;
    }

    sLambda.addEventListener('input', render);
    sTemp.addEventListener('input', render);
    render();
  })();

  /* ---------- helper: piecewise-linear lookup ----------
     table = [[x, [v1, v2, ...]], ...] sorted by x.
     Returns the interpolated value array at x. Used by the chapter 3
     demos, whose curves are published data points, not formulas.      */
  function interpRow(x, table) {
    if (x <= table[0][0]) return table[0][1].slice();
    var last = table[table.length - 1];
    if (x >= last[0]) return last[1].slice();
    for (var i = 1; i < table.length; i++) {
      if (x <= table[i][0]) {
        var x0 = table[i - 1][0], x1 = table[i][0];
        var a = table[i - 1][1], b = table[i][1];
        var f = (x - x0) / (x1 - x0);
        return a.map(function (v, k) { return v + (b[k] - v) * f; });
      }
    }
    return last[1].slice();
  }

  /* ============================================================
     7. Demo F — the thermal conversion spectrum  (chapter 3)

     One slider: the equivalence ratio. It renames the process and
     redistributes the fuel's energy between char, liquid, fuel gas
     and heat already released. The splits are indicative teaching
     values interpolated between published operating points, not a
     reactor model — the chapter says so in the note.
     ============================================================ */
  (function thermoSpectrumDemo() {
    var root = document.querySelector('[data-demo="thermo-spectrum"]');
    if (!root) return;

    var AF_ST = 4.60;          // kg air per kg fuel, rice husk (chapter 2)

    /* ER -> [char, liquid, gas, heat] as % of the fuel's energy */
    var SPLIT = [
      [0.00, [42, 38, 20, 0]],
      [0.10, [25, 25, 50, 0]],
      [0.25, [8, 6, 78, 8]],
      [0.35, [5, 3, 80, 12]],
      [0.50, [4, 6, 55, 35]],
      [0.80, [3, 4, 25, 68]],
      [1.00, [2, 1, 5, 92]],
      [1.30, [1, 0, 1, 98]],
      [1.60, [1, 0, 1, 98]]
    ];
    /* ER -> peak temperature, °C */
    var TEMP = [
      [0.00, [500]], [0.25, [900]], [0.35, [1000]],
      [0.50, [1050]], [1.00, [1200]], [1.60, [1000]]
    ];

    var NAME = [
      { max: 0.02, th: 'ไพโรไลซิส / ทอร์รีแฟกชัน', en: 'Pyrolysis / torrefaction' },
      { max: 0.20, th: 'กึ่งไพโรไลซิส — ไม่ใช่โหมดที่ต้องการ', en: 'Part-pyrolysis — not a wanted mode' },
      { max: 0.40, th: 'แก๊สซิฟิเคชัน', en: 'Gasification' },
      { max: 0.95, th: 'เผาไหม้ไม่สมบูรณ์ — ย่านควัน', en: 'Incomplete combustion — the smoke band' },
      { max: 99, th: 'การเผาไหม้', en: 'Combustion' }
    ];

    var slider = root.querySelector('[data-ts-slider]');
    var segs = {
      char: root.querySelector('[data-ts-seg="char"]'),
      liquid: root.querySelector('[data-ts-seg="liquid"]'),
      gas: root.querySelector('[data-ts-seg="gas"]'),
      heat: root.querySelector('[data-ts-seg="heat"]')
    };
    var nameTh = root.querySelector('[data-ts-name-th]');
    var nameEn = root.querySelector('[data-ts-name-en]');
    var outER = root.querySelector('[data-ts-er]');
    var outAir = root.querySelector('[data-ts-air]');
    var outTemp = root.querySelector('[data-ts-temp]');
    var warn = root.querySelector('[data-ts-warn]');
    var presets = root.querySelectorAll('[data-ts-preset]');

    function render() {
      var er = parseFloat(slider.value);
      var s = interpRow(er, SPLIT);
      var total = s[0] + s[1] + s[2] + s[3];

      segs.char.style.width = (s[0] / total * 100) + '%';
      segs.liquid.style.width = (s[1] / total * 100) + '%';
      segs.gas.style.width = (s[2] / total * 100) + '%';
      segs.heat.style.width = (s[3] / total * 100) + '%';

      var label = NAME.find(function (n) { return er <= n.max; }) || NAME[NAME.length - 1];
      nameTh.textContent = label.th;
      nameEn.textContent = label.en;

      outER.textContent = fmt(er, 2);
      outAir.textContent = fmt(er * AF_ST, 2);
      outTemp.textContent = Math.round(interpRow(er, TEMP)[0] / 10) * 10;

      // the two bands where the reactor is destroying value
      warn.hidden = !((er > 0.02 && er < 0.20) || (er >= 0.40 && er < 0.95));

      presets.forEach(function (b) {
        b.classList.toggle('is-on', Math.abs(parseFloat(b.dataset.tsPreset) - er) < 0.03);
      });
    }

    slider.addEventListener('input', render);
    presets.forEach(function (b) {
      b.addEventListener('click', function () {
        slider.value = b.dataset.tsPreset;
        render();
      });
    });
    render();
  })();

  /* ============================================================
     8. Demo G — producer gas quality  (chapter 3)

     Equation (3.4) made interactive. The inert balance is what the
     three sliders do NOT claim, so nitrogen dilution is visible
     rather than described.
     ============================================================ */
  (function producerGasDemo() {
    var root = document.querySelector('[data-demo="producer-gas"]');
    if (!root) return;

    var LHV_CO = 12.63, LHV_H2 = 10.78, LHV_CH4 = 35.88;   // MJ/Nm3, pure gases
    var LHV_NG = 36.0;        // natural gas, for comparison
    var GAS_FLOW = 100;       // Nm3/h assumed in the readout
    var ETA_E = 0.25;         // engine-generator, electrical
    var GAS_YIELD = 1.8;      // Nm3 of gas per kg of husk
    var LHV_HUSK = 12.4;      // MJ/kg as received

    var sCO = root.querySelector('[data-pg-co]');
    var sH2 = root.querySelector('[data-pg-h2]');
    var sCH4 = root.querySelector('[data-pg-ch4]');
    var segs = {
      co: root.querySelector('[data-pg-seg="co"]'),
      h2: root.querySelector('[data-pg-seg="h2"]'),
      ch4: root.querySelector('[data-pg-seg="ch4"]'),
      inert: root.querySelector('[data-pg-seg="inert"]')
    };
    var outLHV = root.querySelector('[data-pg-lhv]');
    var outRatio = root.querySelector('[data-pg-ratio]');
    var outPower = root.querySelector('[data-pg-power]');
    var outCGE = root.querySelector('[data-pg-cge]');
    var warn = root.querySelector('[data-pg-warn]');
    var presets = root.querySelectorAll('[data-pg-preset]');

    function render() {
      var co = parseFloat(sCO.value);
      var h2 = parseFloat(sH2.value);
      var ch4 = parseFloat(sCH4.value);
      var burnable = co + h2 + ch4;
      var inert = Math.max(0, 100 - burnable);

      var lhv = (co * LHV_CO + h2 * LHV_H2 + ch4 * LHV_CH4) / 100;

      var scale = burnable + inert;          // 100 unless the sliders overshoot
      segs.co.style.width = (co / scale * 100) + '%';
      segs.h2.style.width = (h2 / scale * 100) + '%';
      segs.ch4.style.width = (ch4 / scale * 100) + '%';
      segs.inert.style.width = (inert / scale * 100) + '%';

      outLHV.textContent = fmt(lhv, 2);
      outRatio.textContent = fmt(lhv / LHV_NG * 100, 0);
      outPower.textContent = fmt(GAS_FLOW * lhv * ETA_E / 3.6, 1);
      outCGE.textContent = fmt(GAS_YIELD * lhv / LHV_HUSK * 100, 0);

      warn.hidden = burnable <= 100;

      presets.forEach(function (b) {
        var p = b.dataset.pgPreset.split(',').map(parseFloat);
        b.classList.toggle('is-on',
          Math.abs(p[0] - co) < 0.6 && Math.abs(p[1] - h2) < 0.6 && Math.abs(p[2] - ch4) < 0.3);
      });
    }

    [sCO, sH2, sCH4].forEach(function (s) { s.addEventListener('input', render); });
    presets.forEach(function (b) {
      b.addEventListener('click', function () {
        var p = b.dataset.pgPreset.split(',');
        sCO.value = p[0]; sH2.value = p[1]; sCH4.value = p[2];
        render();
      });
    });
    render();
  })();

  /* ============================================================
     9. Demo H — pyrolysis product yields  (chapter 3)

     Two controls, peak temperature and heating rate, and two bars:
     the split by mass and the split by energy. The point of the demo
     is that the two bars never match, because char holds the most
     energy per kilogram.
     ============================================================ */
  (function pyrolysisYieldDemo() {
    var root = document.querySelector('[data-demo="pyrolysis-yields"]');
    if (!root) return;

    var FEED_KG = 1000;       // dry wood
    var LHV = { feed: 18.0, char: 30.0, oil: 17.0, gas: 8.0 };   // MJ/kg

    /* temperature -> [char, liquid, gas] as % of dry mass */
    var YIELD = {
      slow: [
        [300, [60, 25, 15]],
        [400, [38, 30, 32]],
        [500, [32, 28, 40]],
        [700, [25, 20, 55]],
        [900, [20, 10, 70]]
      ],
      fast: [
        [300, [55, 30, 15]],
        [400, [22, 60, 18]],
        [500, [14, 68, 18]],
        [600, [12, 58, 30]],
        [700, [10, 40, 50]],
        [900, [8, 15, 77]]
      ]
    };

    var LABEL = {
      char: { th: 'ถ่าน', en: 'Char' },
      oil: { th: 'ของเหลว', en: 'Liquid' },
      gas: { th: 'แก๊ส', en: 'Gas' }
    };

    var sTemp = root.querySelector('[data-py-temp]');
    var mseg = {
      char: root.querySelector('[data-py-mseg="char"]'),
      oil: root.querySelector('[data-py-mseg="oil"]'),
      gas: root.querySelector('[data-py-mseg="gas"]')
    };
    var eseg = {
      char: root.querySelector('[data-py-eseg="char"]'),
      oil: root.querySelector('[data-py-eseg="oil"]'),
      gas: root.querySelector('[data-py-eseg="gas"]')
    };
    var outChar = root.querySelector('[data-py-char]');
    var outOil = root.querySelector('[data-py-oil]');
    var outGas = root.querySelector('[data-py-gas]');
    var outETotal = root.querySelector('[data-py-etotal]');
    var modeTh = root.querySelector('[data-py-mode-th]');
    var modeEn = root.querySelector('[data-py-mode-en]');
    var rates = root.querySelectorAll('[data-py-rate]');
    var rate = 'slow';

    function render() {
      var t = parseFloat(sTemp.value);
      var y = interpRow(t, YIELD[rate]);
      var mass = { char: y[0], oil: y[1], gas: y[2] };
      var mTotal = mass.char + mass.oil + mass.gas;

      var energy = {
        char: mass.char * LHV.char,
        oil: mass.oil * LHV.oil,
        gas: mass.gas * LHV.gas
      };
      var eTotal = energy.char + energy.oil + energy.gas;

      ['char', 'oil', 'gas'].forEach(function (k) {
        mseg[k].style.width = (mass[k] / mTotal * 100) + '%';
        eseg[k].style.width = (energy[k] / eTotal * 100) + '%';
      });

      outChar.textContent = Math.round(mass.char / 100 * FEED_KG).toLocaleString('en-US');
      outOil.textContent = Math.round(mass.oil / 100 * FEED_KG).toLocaleString('en-US');
      outGas.textContent = Math.round(mass.gas / 100 * FEED_KG).toLocaleString('en-US');
      // energy still held in the products, MJ per 1,000 kg of dry feed
      // (mass values are kg per 100 kg of feed, so x10 scales to FEED_KG)
      outETotal.textContent =
        (Math.round(eTotal * FEED_KG / 100 / 10) * 10).toLocaleString('en-US');

      var top = mass.char >= mass.oil && mass.char >= mass.gas ? 'char'
        : (mass.oil >= mass.gas ? 'oil' : 'gas');
      modeTh.textContent = LABEL[top].th;
      modeEn.textContent = LABEL[top].en;

      rates.forEach(function (b) { b.classList.toggle('is-on', b.dataset.pyRate === rate); });
    }

    sTemp.addEventListener('input', render);
    rates.forEach(function (b) {
      b.addEventListener('click', function () { rate = b.dataset.pyRate; render(); });
    });
    render();
  })();
})();
