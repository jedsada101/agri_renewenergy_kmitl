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
  /* ============================================================
     10. Demo J — geothermal gradient and what it unlocks  (chapter 5)

     Equation (4.1) plus the drilling-cost rule of thumb. The point
     the sliders make is that depth is set by geology: at an average
     gradient the useful temperatures are simply out of reach.
     ============================================================ */
  (function geoGradientDemo() {
    var root = document.querySelector('[data-demo="geo-gradient"]');
    if (!root) return;

    var T_SURFACE = 30;          // °C, Thailand annual mean
    var COST_0 = 1.2;            // MUSD, notional cost at the surface
    var DOUBLE_EVERY = 1.5;      // km — well cost doubles every 1.5 km
    var SCALE_LO = 30, SCALE_HI = 300;   // the temperature ladder drawn above

    /* upper bound, class, and the technology that becomes possible */
    var BANDS = [
      { max: 70,  clsTh: 'อุณหภูมิต่ำมาก',  clsEn: 'Very low',
                  useTh: 'อาบน้ำ · เลี้ยงสัตว์น้ำ', useEn: 'Bathing · aquaculture' },
      { max: 120, clsTh: 'อุณหภูมิต่ำ',      clsEn: 'Low temperature',
                  useTh: 'อบแห้งผลผลิต · ทำความเย็นแบบดูดซึม', useEn: 'Crop drying · absorption cooling' },
      { max: 180, clsTh: 'อุณหภูมิปานกลาง',  clsEn: 'Intermediate',
                  useTh: 'ไบนารี (ORC)', useEn: 'Binary (ORC)' },
      { max: 240, clsTh: 'อุณหภูมิสูง',      clsEn: 'High enthalpy',
                  useTh: 'แฟลชเดี่ยวหรือแฟลชคู่', useEn: 'Single or double flash' },
      { max: 374, clsTh: 'อุณหภูมิสูงมาก',   clsEn: 'Very high enthalpy',
                  useTh: 'แฟลชคู่ · ไอแห้ง', useEn: 'Double flash · dry steam' },
      { max: 999, clsTh: 'เหนือจุดวิกฤตของน้ำ', clsEn: 'Above water’s critical point',
                  useTh: 'ยังเป็นงานวิจัย ไม่ใช่เทคโนโลยีพร้อมใช้', useEn: 'Research, not proven technology' }
    ];

    var sGrad = root.querySelector('[data-gg-grad]');
    var sDepth = root.querySelector('[data-gg-depth]');
    var mark = root.querySelector('[data-gg-mark]');
    var outTemp = root.querySelector('[data-gg-temp]');
    var outCost = root.querySelector('[data-gg-cost]');
    var clsTh = root.querySelector('[data-gg-class-th]');
    var clsEn = root.querySelector('[data-gg-class-en]');
    var useTh = root.querySelector('[data-gg-use-th]');
    var useEn = root.querySelector('[data-gg-use-en]');
    var warn = root.querySelector('[data-gg-warn]');
    var warnCrit = root.querySelector('[data-gg-warn-crit]');
    var presets = root.querySelectorAll('[data-gg-preset]');

    function render() {
      var grad = parseFloat(sGrad.value);
      var depth = parseFloat(sDepth.value);
      var temp = T_SURFACE + grad * depth;

      outTemp.textContent = Math.round(temp);
      outCost.textContent = fmt(COST_0 * Math.pow(2, depth / DOUBLE_EVERY), 1);

      var band = BANDS.find(function (b) { return temp <= b.max; }) || BANDS[BANDS.length - 1];
      clsTh.textContent = band.clsTh;
      clsEn.textContent = band.clsEn;
      useTh.textContent = band.useTh;
      useEn.textContent = band.useEn;

      var pos = (temp - SCALE_LO) / (SCALE_HI - SCALE_LO) * 100;
      mark.style.left = Math.max(0, Math.min(100, pos)) + '%';

      /* past this depth a single well tends to swallow a small project whole */
      warn.hidden = depth <= 3.5;

      /* above 374 C water has no liquid/vapour distinction left to exploit */
      warnCrit.hidden = temp <= 374;

      presets.forEach(function (b) {
        b.classList.toggle('is-on', Math.abs(parseFloat(b.dataset.ggPreset) - grad) < 1);
      });
    }

    sGrad.addEventListener('input', render);
    sDepth.addEventListener('input', render);
    presets.forEach(function (b) {
      b.addEventListener('click', function () {
        sGrad.value = b.dataset.ggPreset;
        render();
      });
    });
    render();
  })();

  /* ============================================================
     11. Demo K — flash separator pressure  (chapter 5)

     Equation (4.6) and the turbine expansion together. Flash
     fraction rises as pressure falls while work per kilogram falls;
     their product peaks near the midpoint of the temperature range.

     SAT holds saturation properties as
       [p bar, Tsat °C, hf, hg kJ/kg, sf, sg kJ/kg-K]
     which is enough precision for teaching.
     ============================================================ */
  (function geoFlashDemo() {
    var root = document.querySelector('[data-demo="geo-flash"]');
    if (!root) return;

    var SAT = [
      [0.05,  32.88,  137.75, 2560.7, 0.4762, 8.3939],
      [0.10,  45.81,  191.81, 2583.9, 0.6492, 8.1488],
      [0.20,  60.06,  251.40, 2609.7, 0.8320, 7.9072],
      [0.50,  81.32,  340.49, 2645.9, 1.0910, 7.5939],
      [1.00,  99.61,  417.44, 2674.9, 1.3026, 7.3588],
      [1.50, 111.35,  467.11, 2693.1, 1.4336, 7.2230],
      [2.00, 120.21,  504.70, 2706.3, 1.5301, 7.1271],
      [3.00, 133.53,  561.43, 2724.9, 1.6717, 6.9909],
      [4.00, 143.61,  604.72, 2738.1, 1.7766, 6.8955],
      [5.00, 151.84,  640.19, 2748.1, 1.8606, 6.8212],
      [6.00, 158.83,  670.50, 2756.1, 1.9311, 6.7600],
      [8.00, 170.41,  721.02, 2768.3, 2.0461, 6.6628],
      [10.0, 179.88,  762.68, 2777.1, 2.1382, 6.5850],
      [12.0, 187.96,  798.50, 2783.8, 2.2159, 6.5217],
      [15.0, 198.29,  844.67, 2791.0, 2.3145, 6.4406],
      [20.0, 212.38,  908.50, 2798.3, 2.4468, 6.3390],
      [25.0, 223.95,  961.93, 2800.9, 2.5543, 6.2536],
      [30.0, 233.85, 1008.30, 2803.2, 2.6455, 6.1856],
      [40.0, 250.35, 1087.40, 2800.3, 2.7968, 6.0685],
      [50.0, 263.94, 1154.50, 2794.2, 2.9207, 5.9735],
      [65.0, 280.86, 1241.10, 2778.0, 3.0748, 5.8570]
    ];

    /* linear interpolation down a column of SAT, keyed on column `key` */
    function lookup(value, key) {
      if (value <= SAT[0][key]) return SAT[0].slice();
      var last = SAT[SAT.length - 1];
      if (value >= last[key]) return last.slice();
      for (var i = 1; i < SAT.length; i++) {
        if (value <= SAT[i][key]) {
          var a = SAT[i - 1], b = SAT[i];
          var f = (value - a[key]) / (b[key] - a[key]);
          return a.map(function (v, k) { return v + (b[k] - v) * f; });
        }
      }
      return last.slice();
    }
    var byP = function (p) { return lookup(p, 0); };
    var byT = function (t) { return lookup(t, 1); };

    var COND = { hf: 191.81, hfg: 2392.09, sf: 0.6492, sfg: 7.4996 };
    var ETA_T = 0.80;        // turbine isentropic efficiency
    var BRINE = 100;         // kg/s assumed in the power readout

    var sTres = root.querySelector('[data-gf-tres]');
    var sPsep = root.querySelector('[data-gf-psep]');
    var segSteam = root.querySelector('[data-gf-seg="steam"]');
    var segBrine = root.querySelector('[data-gf-seg="brine"]');
    var outSpec = root.querySelector('[data-gf-spec]');
    var outX = root.querySelector('[data-gf-x]');
    var outW = root.querySelector('[data-gf-w]');
    var outPower = root.querySelector('[data-gf-power]');
    var warn = root.querySelector('[data-gf-warn]');
    var btnOpt = root.querySelector('[data-gf-opt]');

    /* work per kg of brine at this reservoir temperature and separator pressure */
    function specificWork(tRes, pSep) {
      var hfRes = byT(tRes)[2];
      var sep = byP(pSep);
      var x = (hfRes - sep[2]) / (sep[3] - sep[2]);
      if (!(x > 0)) x = 0;

      var x2s = Math.min(1, (sep[5] - COND.sf) / COND.sfg);
      var h2s = COND.hf + x2s * COND.hfg;
      var w = ETA_T * (sep[3] - h2s);
      if (!(w > 0)) w = 0;

      return { x: x, w: w, spec: x * w };
    }

    function render() {
      var tRes = parseFloat(sTres.value);
      var pSep = parseFloat(sPsep.value);
      var r = specificWork(tRes, pSep);

      segSteam.style.width = (r.x * 100) + '%';
      segBrine.style.width = ((1 - r.x) * 100) + '%';

      outX.textContent = fmt(r.x * 100, 1);
      outW.textContent = Math.round(r.w);
      outSpec.textContent = fmt(r.spec, 1);
      outPower.textContent = fmt(r.spec * BRINE / 1000, 2);

      /* no steam worth speaking of once the separator nears reservoir pressure */
      warn.hidden = r.x >= 0.02;
    }

    /* sweep the slider's own range — the optimum is found, not assumed */
    function jumpToOptimum() {
      var tRes = parseFloat(sTres.value);
      var pSatRes = byT(tRes)[0];
      var best = null, bestP = 0.5;
      for (var p = 0.5; p <= 20.001; p += 0.05) {
        if (p >= pSatRes) break;
        var s = specificWork(tRes, p).spec;
        if (best === null || s > best) { best = s; bestP = p; }
      }
      sPsep.value = Math.round(bestP * 10) / 10;
      render();
    }

    sTres.addEventListener('input', render);
    sPsep.addEventListener('input', render);
    btnOpt.addEventListener('click', jumpToOptimum);
    render();
  })();

  /* ============================================================
     12. Demo L — ground-source heat pump in a hot climate  (chapter 5)

     Equation (4.10) run on the cooling side, which is the side that
     matters in Thailand. The ground sits still; the air does not.
     ============================================================ */
  (function gshpDemo() {
    var root = document.querySelector('[data-demo="gshp-cop"]');
    if (!root) return;

    var Q_COOL = 50;         // kW of cooling duty
    var T_EVAP = 5;          // °C at the evaporator
    var APPROACH = 7;        // K — condenser sits this far above its sink
    var ETA_II = 0.45;       // fraction of the Carnot COP a real machine reaches
    var HOURS = 8000;        // operating hours per year
    var TARIFF = 4.20;       // THB per kWh
    var W_REF = 18;          // kW — full width of the bar

    var sAir = root.querySelector('[data-gs-tair]');
    var sGnd = root.querySelector('[data-gs-tgnd]');
    var segGround = root.querySelector('[data-gs-seg="ground"]');
    var segExtra = root.querySelector('[data-gs-seg="extra"]');
    var segRest = root.querySelector('[data-gs-seg="rest"]');
    var outSave = root.querySelector('[data-gs-save]');
    var outAir = root.querySelector('[data-gs-copair]');
    var outGnd = root.querySelector('[data-gs-copgnd]');
    var outPct = root.querySelector('[data-gs-pct]');
    var warn = root.querySelector('[data-gs-warn]');
    var presets = root.querySelectorAll('[data-gs-preset]');

    function cop(tSink) {
      var tc = T_EVAP + 273.15;
      var th = tSink + APPROACH + 273.15;
      return ETA_II * tc / (th - tc);
    }

    function render() {
      var tAir = parseFloat(sAir.value);
      var tGnd = parseFloat(sGnd.value);

      var copAir = cop(tAir), copGnd = cop(tGnd);
      var wAir = Q_COOL / copAir, wGnd = Q_COOL / copGnd;

      outAir.textContent = fmt(copAir, 2);
      outGnd.textContent = fmt(copGnd, 2);
      outPct.textContent = fmt((1 - wGnd / wAir) * 100, 0);
      outSave.textContent = fmt((wAir - wGnd) * HOURS * TARIFF / 1000, 0);

      /* the shorter bar is whichever system wins; the middle band is the gap */
      var low = Math.min(wAir, wGnd);
      var gap = Math.abs(wAir - wGnd);
      segGround.style.width = Math.min(100, low / W_REF * 100) + '%';
      segExtra.style.width = Math.min(100, gap / W_REF * 100) + '%';
      segRest.style.width = Math.max(0, 100 - (low + gap) / W_REF * 100) + '%';

      /* below ground temperature the air-cooled machine is the better one */
      warn.hidden = tAir > tGnd;

      presets.forEach(function (b) {
        b.classList.toggle('is-on', Math.abs(parseFloat(b.dataset.gsPreset) - tAir) < 0.3);
      });
    }

    sAir.addEventListener('input', render);
    sGnd.addEventListener('input', render);
    presets.forEach(function (b) {
      b.addEventListener('click', function () {
        sAir.value = b.dataset.gsPreset;
        render();
      });
    });
    render();
  })();

  /* ============================================================
     13. Demo M — head against flow  (chapter 4)

     Equation (5.1). The power readout is almost beside the point;
     the pipe diameter is what carries the lesson, because it is
     what the money actually buys.
     ============================================================ */
  (function hydroPowerDemo() {
    var root = document.querySelector('[data-demo="hydro-power"]');
    if (!root) return;

    var RHO_G = 9.81;
    var ETA = 0.70;
    var CF = 0.55;
    var V_PIPE = 2.5;        // m/s — a normal penstock design velocity
    var HOUSEHOLD = 1800;    // kWh/yr for a rural household

    var sHead = root.querySelector('[data-hp-head]');
    var sFlow = root.querySelector('[data-hp-flow]');
    var segOut = root.querySelector('[data-hp-seg="out"]');
    var segLoss = root.querySelector('[data-hp-seg="loss"]');
    var outPower = root.querySelector('[data-hp-power]');
    var outEnergy = root.querySelector('[data-hp-energy]');
    var outDia = root.querySelector('[data-hp-dia]');
    var outHomes = root.querySelector('[data-hp-homes]');
    var warn = root.querySelector('[data-hp-warn]');
    var presets = root.querySelectorAll('[data-hp-preset]');

    function render() {
      var head = parseFloat(sHead.value);
      var flow = parseFloat(sFlow.value);

      var kW = RHO_G * flow * head * ETA;
      var kWh = kW * 8760 * CF;

      /* the pipe that carries this flow at a sane velocity */
      var dia = Math.sqrt(4 * flow / (Math.PI * V_PIPE)) * 1000;

      outPower.textContent = fmt(kW, 1);
      outEnergy.textContent = fmt(kWh / 1000, 0);
      outDia.textContent = Math.round(dia / 10) * 10;
      outHomes.textContent = Math.round(kWh / HOUSEHOLD);

      segOut.style.width = (ETA * 100) + '%';
      segLoss.style.width = ((1 - ETA) * 100) + '%';

      /* past a metre the penstock stops being an off-the-shelf item */
      warn.hidden = dia <= 1000;

      presets.forEach(function (b) {
        var parts = b.dataset.hpPreset.split('|');
        b.classList.toggle('is-on',
          Math.abs(parseFloat(parts[0]) - head) < 0.5 &&
          Math.abs(parseFloat(parts[1]) - flow) < 0.03);
      });
    }

    sHead.addEventListener('input', render);
    sFlow.addEventListener('input', render);
    presets.forEach(function (b) {
      b.addEventListener('click', function () {
        var parts = b.dataset.hpPreset.split('|');
        sHead.value = parts[0];
        sFlow.value = parts[1];
        render();
      });
    });
    render();
  })();

  /* ============================================================
     14. Demo N — penstock diameter  (chapter 4)

     Darcy-Weisbach, equation (5.2), on the site of worked example
     5.2. The fifth-power dependence is not stated here; it is left
     for the slider to demonstrate.
     ============================================================ */
  (function penstockDemo() {
    var root = document.querySelector('[data-demo="penstock"]');
    if (!root) return;

    var H_GROSS = 60;        // m
    var LENGTH = 300;        // m
    var F_DARCY = 0.0125;
    var ETA = 0.65;
    var RHO_G = 9.81;
    var G2 = 19.62;          // 2g

    var sDia = root.querySelector('[data-pk-dia]');
    var sFlow = root.querySelector('[data-pk-flow]');
    var segNet = root.querySelector('[data-pk-seg="net"]');
    var segLoss = root.querySelector('[data-pk-seg="loss"]');
    var outPower = root.querySelector('[data-pk-power]');
    var outLoss = root.querySelector('[data-pk-loss]');
    var outVel = root.querySelector('[data-pk-vel]');
    var outPct = root.querySelector('[data-pk-pct]');
    var warn = root.querySelector('[data-pk-warn]');
    var presets = root.querySelectorAll('[data-pk-preset]');

    function render() {
      var d = parseFloat(sDia.value) / 1000;
      var q = parseFloat(sFlow.value);

      var v = 4 * q / (Math.PI * d * d);
      var hf = F_DARCY * (LENGTH / d) * (v * v / G2);
      if (hf > H_GROSS) hf = H_GROSS;          // the pipe can give no more
      var hNet = H_GROSS - hf;
      var pct = hf / H_GROSS * 100;

      outVel.textContent = fmt(v, 2);
      outLoss.textContent = fmt(hf, 2);
      outPct.textContent = fmt(pct, 1);
      outPower.textContent = fmt(RHO_G * q * hNet * ETA, 1);

      segNet.style.width = (hNet / H_GROSS * 100) + '%';
      segLoss.style.width = pct + '%';

      /* both the design rule and the velocity limit have to hold */
      warn.hidden = !(pct > 15 || v > 4);

      presets.forEach(function (b) {
        b.classList.toggle('is-on',
          Math.abs(parseFloat(b.dataset.pkPreset) - parseFloat(sDia.value)) < 3);
      });
    }

    sDia.addEventListener('input', render);
    sFlow.addEventListener('input', render);
    presets.forEach(function (b) {
      b.addEventListener('click', function () {
        sDia.value = b.dataset.pkPreset;
        render();
      });
    });
    render();
  })();

  /* ============================================================
     15. Demo O — turbine selection  (chapter 4)

     Equations (5.1) and (5.3). Running speed is restricted to the
     values a 50 Hz generator can actually hold, because that is the
     constraint the chart in Figure 5.4 quietly assumes.
     ============================================================ */
  (function turbinePickDemo() {
    var root = document.querySelector('[data-demo="turbine-pick"]');
    if (!root) return;

    var RHO_G = 9.81;
    var ETA_T = 0.68;        // turbine alone, before the generator (cf. worked example 5.4)

    /* 50 Hz synchronous speeds, by pole count */
    var SPEEDS = [
      { rpm: 3000, poles: 2 }, { rpm: 1500, poles: 4 }, { rpm: 1000, poles: 6 },
      { rpm: 750, poles: 8 }, { rpm: 600, poles: 10 }, { rpm: 500, poles: 12 }
    ];

    /* upper Ns bound for each machine, in ascending order */
    var TYPES = [
      { max: 20,   th: 'เพลตัน หัวฉีดเดียว',   en: 'Pelton, single jet' },
      { max: 40,   th: 'เพลตัน หลายหัวฉีด',    en: 'Pelton, multi-jet' },
      { max: 80,   th: 'เทอร์โก',              en: 'Turgo' },
      { max: 200,  th: 'ครอสโฟลว์ หรือ ฟรานซิส', en: 'Crossflow or Francis' },
      { max: 400,  th: 'ฟรานซิส',              en: 'Francis' },
      { max: 1000, th: 'คาปลัน / ใบพัด',       en: 'Kaplan / propeller' }
    ];

    var sHead = root.querySelector('[data-tp-head]');
    var sFlow = root.querySelector('[data-tp-flow]');
    var sSpeed = root.querySelector('[data-tp-speed]');
    var mark = root.querySelector('[data-tp-mark]');
    var outNs = root.querySelector('[data-tp-ns]');
    var outPower = root.querySelector('[data-tp-power]');
    var outPoles = root.querySelector('[data-tp-poles]');
    var typeTh = root.querySelector('[data-tp-type-th]');
    var typeEn = root.querySelector('[data-tp-type-en]');
    var warn = root.querySelector('[data-tp-warn]');
    var presets = root.querySelectorAll('[data-tp-preset]');

    function render() {
      var head = parseFloat(sHead.value);
      var flow = parseFloat(sFlow.value);
      var sp = SPEEDS[parseInt(sSpeed.value, 10)];

      var power = RHO_G * flow * head * ETA_T;
      var ns = sp.rpm * Math.sqrt(power) / Math.pow(head, 1.25);

      outPower.textContent = fmt(power, 1);
      outNs.textContent = Math.round(ns);
      outPoles.textContent = sp.poles;

      var t = TYPES.find(function (x) { return ns <= x.max; });
      if (t) {
        typeTh.textContent = t.th;
        typeEn.textContent = t.en;
      } else {
        typeTh.textContent = 'เร็วเกินกว่ากังหันทุกชนิด';
        typeEn.textContent = 'Faster than any turbine';
      }

      /* the ladder above spans Ns 10 to 1000, drawn logarithmically */
      var pos = (Math.log(ns) / Math.LN10 - 1) / 2 * 100;
      mark.style.left = Math.max(0, Math.min(100, pos)) + '%';

      /* nothing on the market lives outside this band at this speed */
      warn.hidden = ns >= 8 && ns <= 1000;

      presets.forEach(function (b) {
        var parts = b.dataset.tpPreset.split('|');
        b.classList.toggle('is-on',
          Math.abs(parseFloat(parts[0]) - head) < 0.5 &&
          Math.abs(parseFloat(parts[1]) - flow) < 0.03);
      });
    }

    sHead.addEventListener('input', render);
    sFlow.addEventListener('input', render);
    sSpeed.addEventListener('input', render);
    presets.forEach(function (b) {
      b.addEventListener('click', function () {
        var parts = b.dataset.tpPreset.split('|');
        sHead.value = parts[0];
        sFlow.value = parts[1];
        if (parts[2] !== undefined) sSpeed.value = parts[2];
        render();
      });
    });
    render();
  })();

  /* ============================================================
     16. Demo P — dispersion and depth  (chapter 6)

     Equation (6.1) solved by fixed-point iteration, so the readouts
     stay honest across all three depth regimes rather than snapping
     between the deep and shallow approximations.
     ============================================================ */
  (function waveDepthDemo() {
    var root = document.querySelector('[data-demo="wave-depth"]');
    if (!root) return;

    var G = 9.81;

    var sT = root.querySelector('[data-wd-period]');
    var sD = root.querySelector('[data-wd-depth]');
    var mark = root.querySelector('[data-wd-mark]');
    var outLen = root.querySelector('[data-wd-len]');
    var outC = root.querySelector('[data-wd-c]');
    var outCg = root.querySelector('[data-wd-cg]');
    var outOrb = root.querySelector('[data-wd-orb]');
    var warn = root.querySelector('[data-wd-warn]');
    var presets = root.querySelectorAll('[data-wd-preset]');

    /* L = (gT^2 / 2pi) tanh(2 pi d / L), iterated from the deep-water value */
    function wavelength(T, d) {
      var L0 = G * T * T / (2 * Math.PI);
      var L = L0;
      for (var i = 0; i < 60; i++) {
        var next = L0 * Math.tanh(2 * Math.PI * d / L);
        if (Math.abs(next - L) < 1e-6) { L = next; break; }
        L = next;
      }
      return L;
    }

    function render() {
      var T = parseFloat(sT.value);
      var d = parseFloat(sD.value);

      var L = wavelength(T, d);
      var k = 2 * Math.PI / L;
      var c = L / T;

      /* n = cg/c rises from 1/2 in deep water to 1 in shallow */
      var kd = k * d;
      var n = 0.5 * (1 + 2 * kd / Math.sinh(2 * kd));
      var cg = n * c;

      outLen.textContent = fmt(L, 1);
      outC.textContent = fmt(c, 2);
      outCg.textContent = fmt(cg, 2);
      /* horizontal amplitude at the bed relative to the surface, in finite depth:
         (1/sinh kd) / (cosh kd / sinh kd) = 1/cosh kd. It vanishes in deep water and
         approaches unity in shallow, which is what makes bottom-hinged flaps possible. */
      outOrb.textContent = Math.round(100 / Math.cosh(kd));

      /* the ladder spans d/L from 0.002 to 1, drawn logarithmically */
      var ratio = d / L;
      var pos = (Math.log(ratio) / Math.LN10 + 2.7) / 2.7 * 100;
      mark.style.left = Math.max(0, Math.min(100, pos)) + '%';

      warn.hidden = ratio >= 0.05;

      presets.forEach(function (b) {
        var parts = b.dataset.wdPreset.split('|');
        b.classList.toggle('is-on',
          Math.abs(parseFloat(parts[0]) - T) < 0.3 &&
          Math.abs(parseFloat(parts[1]) - d) < 0.5);
      });
    }

    sT.addEventListener('input', render);
    sD.addEventListener('input', render);
    presets.forEach(function (b) {
      b.addEventListener('click', function () {
        var parts = b.dataset.wdPreset.split('|');
        sT.value = parts[0];
        sD.value = parts[1];
        render();
      });
    });
    render();
  })();

  /* ============================================================
     17. Demo Q — wave power by sea  (chapter 6)

     Equation (6.5), real-sea form. The bar compares the chosen sea
     against a world-class resource, because the lesson of this
     chapter is the spread between sites rather than any one figure.
     ============================================================ */
  (function wavePowerDemo() {
    var root = document.querySelector('[data-demo="wave-power"]');
    if (!root) return;

    var K = 0.49;            // kW/m per (m^2 . s), real-sea coefficient
    var WORLD_CLASS = 45;    // kW/m, the bar's full width
    var IRELAND = 39.7;      // kW/m, from worked example 6.3

    var sHs = root.querySelector('[data-wp-hs]');
    var sTe = root.querySelector('[data-wp-te]');
    var segHere = root.querySelector('[data-wp-seg="here"]');
    var segRest = root.querySelector('[data-wp-seg="rest"]');
    var outPower = root.querySelector('[data-wp-power]');
    var outEnergy = root.querySelector('[data-wp-energy]');
    var outLen = root.querySelector('[data-wp-len]');
    var outRatio = root.querySelector('[data-wp-ratio]');
    var warn = root.querySelector('[data-wp-warn]');
    var presets = root.querySelectorAll('[data-wp-preset]');

    function render() {
      var hs = parseFloat(sHs.value);
      var te = parseFloat(sTe.value);

      var p = K * hs * hs * te;

      outPower.textContent = fmt(p, 1);
      outEnergy.textContent = Math.round(p * 8760 / 1000);
      outLen.textContent = Math.round(1.56 * te * te);
      outRatio.textContent = Math.round(p / IRELAND * 100);

      var share = Math.min(100, p / WORLD_CLASS * 100);
      segHere.style.width = share + '%';
      segRest.style.width = (100 - share) + '%';

      /* below this the fixed costs of working offshore swamp the resource */
      warn.hidden = p >= 5;

      presets.forEach(function (b) {
        var parts = b.dataset.wpPreset.split('|');
        b.classList.toggle('is-on',
          Math.abs(parseFloat(parts[0]) - hs) < 0.06 &&
          Math.abs(parseFloat(parts[1]) - te) < 0.3);
      });
    }

    sHs.addEventListener('input', render);
    sTe.addEventListener('input', render);
    presets.forEach(function (b) {
      b.addEventListener('click', function () {
        var parts = b.dataset.wpPreset.split('|');
        sHs.value = parts[0];
        sTe.value = parts[1];
        render();
      });
    });
    render();
  })();

  /* ============================================================
     18. Demo R — capture width  (chapter 6)

     Equation (6.6). The bar is drawn against the lambda/2pi ceiling
     rather than against the device width, so the headroom that
     phase control could still claim is the thing on display.
     ============================================================ */
  (function waveCaptureDemo() {
    var root = document.querySelector('[data-demo="wave-capture"]');
    if (!root) return;

    var K = 0.49;
    var HS = 2.0;            // m — held fixed so the sliders isolate the geometry

    var sB = root.querySelector('[data-wc-width]');
    var sEff = root.querySelector('[data-wc-eff]');
    var sTe = root.querySelector('[data-wc-te]');
    var segCap = root.querySelector('[data-wc-seg="captured"]');
    var segHead = root.querySelector('[data-wc-seg="headroom"]');
    var outPower = root.querySelector('[data-wc-power]');
    var outLc = root.querySelector('[data-wc-lc]');
    var outCwr = root.querySelector('[data-wc-cwr]');
    var outMax = root.querySelector('[data-wc-max]');
    var warn = root.querySelector('[data-wc-warn]');
    var presets = root.querySelectorAll('[data-wc-preset]');

    function render() {
      var B = parseFloat(sB.value);
      var share = parseFloat(sEff.value) / 100;
      var te = parseFloat(sTe.value);

      var pWave = K * HS * HS * te;
      var lambda = 1.56 * te * te;
      var lcMax = lambda / (2 * Math.PI);
      var lc = lcMax * share;

      outMax.textContent = fmt(lcMax, 1);
      outLc.textContent = fmt(lc, 2);
      outCwr.textContent = fmt(lc / B, 2);
      outPower.textContent = fmt(lc * pWave, 1);

      segCap.style.width = (share * 100) + '%';
      segHead.style.width = ((1 - share) * 100) + '%';

      /* above 1 the buoy outreaches itself — the antenna effect */
      warn.hidden = lc / B <= 1;

      presets.forEach(function (b) {
        var parts = b.dataset.wcPreset.split('|');
        b.classList.toggle('is-on',
          Math.abs(parseFloat(parts[0]) - B) < 0.3 &&
          Math.abs(parseFloat(parts[2]) - te) < 0.3);
      });
    }

    sB.addEventListener('input', render);
    sEff.addEventListener('input', render);
    sTe.addEventListener('input', render);
    presets.forEach(function (b) {
      b.addEventListener('click', function () {
        var parts = b.dataset.wcPreset.split('|');
        sB.value = parts[0];
        sEff.value = parts[1];
        sTe.value = parts[2];
        render();
      });
    });
    render();
  })();

  /* ============================================================
     19. Demo S — tidal range and the land it costs  (chapter 7)

     Equation (7.4). The comparison against solar on the same
     footprint is the point: a barrage's constraint is not its
     physics but the area of intertidal mudflat it consumes.
     ============================================================ */
  (function tidalRangeDemo() {
    var root = document.querySelector('[data-demo="tidal-range"]');
    if (!root) return;

    var RHO_G_HALF = 0.5 * 1025 * 9.81;   // J per m3 per m of head
    var CYCLES = 706;        // semidiurnal cycles per year
    var ETA_EX = 0.33;       // one-way extraction factor
    var SOLAR_MW_PER_KM2 = 70;
    var SOLAR_KWH_PER_KWP = 1500;

    var sArea = root.querySelector('[data-tr-area]');
    var sRange = root.querySelector('[data-tr-range]');
    var segTidal = root.querySelector('[data-tr-seg="tidal"]');
    var segSolar = root.querySelector('[data-tr-seg="solar"]');
    var outEnergy = root.querySelector('[data-tr-energy]');
    var outPer = root.querySelector('[data-tr-per]');
    var outRated = root.querySelector('[data-tr-rated]');
    var outRatio = root.querySelector('[data-tr-ratio]');
    var warn = root.querySelector('[data-tr-warn]');
    var presets = root.querySelectorAll('[data-tr-preset]');

    function render() {
      var areaKm = parseFloat(sArea.value);
      var R = parseFloat(sRange.value);

      var perCycleJ = RHO_G_HALF * areaKm * 1e6 * R * R;
      var perCycleMWh = perCycleJ / 3.6e9;
      var annualGWh = perCycleMWh * CYCLES * ETA_EX / 1000;

      /* what the same footprint would yield under panels */
      var solarGWh = areaKm * SOLAR_MW_PER_KM2 * 1000 * SOLAR_KWH_PER_KWP / 1e6;
      var share = Math.min(100, annualGWh / solarGWh * 100);

      outPer.textContent = Math.round(perCycleMWh);
      outEnergy.textContent = fmt(annualGWh, 1);
      outRated.textContent = fmt(annualGWh * 1000 / (8760 * 0.25), 1);
      outRatio.textContent = fmt(share, 1);

      segTidal.style.width = share + '%';
      segSolar.style.width = (100 - share) + '%';

      /* no barrage anywhere is known to pay below about 4 m of range */
      warn.hidden = R >= 4;

      presets.forEach(function (b) {
        var parts = b.dataset.trPreset.split('|');
        b.classList.toggle('is-on',
          Math.abs(parseFloat(parts[0]) - areaKm) < 0.6 &&
          Math.abs(parseFloat(parts[1]) - R) < 0.06);
      });
    }

    sArea.addEventListener('input', render);
    sRange.addEventListener('input', render);
    presets.forEach(function (b) {
      b.addEventListener('click', function () {
        var parts = b.dataset.trPreset.split('|');
        sArea.value = parts[0];
        sRange.value = parts[1];
        render();
      });
    });
    render();
  })();

  /* ============================================================
     20. Demo T — tidal stream and the cube law  (chapter 7)

     Equation (7.5), with the equivalent wind rotor computed
     alongside so the density advantage is a number rather than
     an assertion.
     ============================================================ */
  (function tidalStreamDemo() {
    var root = document.querySelector('[data-demo="tidal-stream"]');
    if (!root) return;

    var RHO_SEA = 1025, RHO_AIR = 1.225;
    var CP_TIDAL = 0.40, CP_WIND = 0.45;
    var V_WIND = 12;         // m/s, rated wind for the comparison
    var WORLD_CLASS = 3.5;   // m/s, the bar's full width
    var CF = 0.35;

    var sVel = root.querySelector('[data-ts2-vel]');
    var sDia = root.querySelector('[data-ts2-dia]');
    var segHere = root.querySelector('[data-ts2-seg="here"]');
    var segRest = root.querySelector('[data-ts2-seg="rest"]');
    var outPower = root.querySelector('[data-ts2-power]');
    var outDens = root.querySelector('[data-ts2-dens]');
    var outEnergy = root.querySelector('[data-ts2-energy]');
    var outWind = root.querySelector('[data-ts2-wind]');
    var warn = root.querySelector('[data-ts2-warn]');
    var presets = root.querySelectorAll('[data-ts2-preset]');

    function render() {
      var v = parseFloat(sVel.value);
      var D = parseFloat(sDia.value);
      var A = Math.PI * D * D / 4;

      var dens = 0.5 * RHO_SEA * v * v * v;        // W/m2 in the current
      var P = dens * A * CP_TIDAL;                 // W at the shaft

      outDens.textContent = fmt(dens / 1000, 1);
      outPower.textContent = fmt(P / 1e6, 2);
      outEnergy.textContent = fmt(P * 8760 * CF / 1e9, 1);

      /* the wind rotor that would match this output */
      var aWind = 2 * P / (RHO_AIR * Math.pow(V_WIND, 3) * CP_WIND);
      outWind.textContent = Math.round(Math.sqrt(4 * aWind / Math.PI));

      var share = Math.min(100, Math.pow(v / WORLD_CLASS, 3) * 100);
      segHere.style.width = share + '%';
      segRest.style.width = (100 - share) + '%';

      /* below 2 m/s the fixed offshore costs swamp a cubed-away resource */
      warn.hidden = v >= 2;

      presets.forEach(function (b) {
        var parts = b.dataset.ts2Preset.split('|');
        b.classList.toggle('is-on',
          Math.abs(parseFloat(parts[0]) - v) < 0.06 &&
          Math.abs(parseFloat(parts[1]) - D) < 0.3);
      });
    }

    sVel.addEventListener('input', render);
    sDia.addEventListener('input', render);
    presets.forEach(function (b) {
      b.addEventListener('click', function () {
        var parts = b.dataset.ts2Preset.split('|');
        sVel.value = parts[0];
        sDia.value = parts[1];
        render();
      });
    });
    render();
  })();

  /* ============================================================
     21. Demo U — rating against the spring-neap cycle  (chapter 7)

     The capacity factor is integrated hour by hour through a
     14.77-day cycle rather than assumed, so the trade between a
     smaller machine and clipped energy is the student's to find.
     ============================================================ */
  (function tidalCycleDemo() {
    var root = document.querySelector('[data-demo="tidal-cycle"]');
    if (!root) return;

    var T_TIDE = 12.4206;    // h, the M2 period
    var T_BEAT = 14.77 * 24; // h, spring to spring
    var D_ROTOR = 18;        // m, held fixed; only the rating is explored
    var CP = 0.40, RHO = 1025;
    var AREA = Math.PI * D_ROTOR * D_ROTOR / 4;

    var sSpring = root.querySelector('[data-tc-spring]');
    var sNeap = root.querySelector('[data-tc-neap]');
    var sRated = root.querySelector('[data-tc-rated]');
    var segCap = root.querySelector('[data-tc-seg="captured"]');
    var segClip = root.querySelector('[data-tc-seg="clipped"]');
    var outCf = root.querySelector('[data-tc-cf]');
    var outEnergy = root.querySelector('[data-tc-energy]');
    var outSpill = root.querySelector('[data-tc-spill]');
    var outRatio = root.querySelector('[data-tc-ratio]');
    var warn = root.querySelector('[data-tc-warn]');
    var presets = root.querySelectorAll('[data-tc-preset]');

    function render() {
      var vSpring = parseFloat(sSpring.value);
      var vNeap = parseFloat(sNeap.value);
      var ratedShare = parseFloat(sRated.value) / 100;

      var vRated = vSpring * ratedShare;
      var pRated = 0.5 * RHO * AREA * Math.pow(vRated, 3) * CP;

      /* integrate across one spring-neap beat in 10-minute steps */
      var raw = 0, used = 0, steps = 0;
      for (var t = 0; t < T_BEAT; t += 1 / 6) {
        /* the peak speed itself breathes with the fortnightly beat */
        var envelope = 0.5 * (vSpring + vNeap)
                     + 0.5 * (vSpring - vNeap) * Math.cos(2 * Math.PI * t / T_BEAT);
        var v = Math.abs(envelope * Math.sin(2 * Math.PI * t / T_TIDE));
        var p = 0.5 * RHO * AREA * Math.pow(v, 3) * CP;
        raw += p;
        used += Math.min(p, pRated);
        steps++;
      }
      var meanUsed = used / steps;

      outCf.textContent = Math.round(meanUsed / pRated * 100);
      outEnergy.textContent = fmt(meanUsed * 8760 / 1e9, 1);
      outSpill.textContent = Math.round((raw - used) / raw * 100);
      outRatio.textContent = fmt(Math.pow(vSpring / vNeap, 3), 1);

      var capShare = used / raw * 100;
      segCap.style.width = capShare + '%';
      segClip.style.width = (100 - capShare) + '%';

      /* past this, clipping costs more than the smaller machine saves */
      warn.hidden = (raw - used) / raw <= 0.20;

      presets.forEach(function (b) {
        var parts = b.dataset.tcPreset.split('|');
        b.classList.toggle('is-on',
          Math.abs(parseFloat(parts[0]) - vSpring) < 0.06 &&
          Math.abs(parseFloat(parts[2]) - parseFloat(sRated.value)) < 1);
      });
    }

    sSpring.addEventListener('input', render);
    sNeap.addEventListener('input', render);
    sRated.addEventListener('input', render);
    presets.forEach(function (b) {
      b.addEventListener('click', function () {
        var parts = b.dataset.tcPreset.split('|');
        sSpring.value = parts[0];
        sNeap.value = parts[1];
        sRated.value = parts[2];
        render();
      });
    });
    render();
  })();

  /* ============================================================
     22. Demo V — wind power and air density  (chapter 9)

     Equations (9.2) and (9.3). The density correction is the point:
     every catalogue quotes 1.225 kg/m3, which no Thai site ever sees.
     ============================================================ */
  (function windPowerDemo() {
    var root = document.querySelector('[data-demo="wind-power"]');
    if (!root) return;

    var R_DRY = 287.05;      // J/kg.K
    var P0 = 101325;         // Pa at sea level
    var RHO_STD = 1.225;     // kg/m3, the catalogue reference at 15 C
    var WORLD_CLASS = 600;   // W/m2, the bar's full width

    var sVel = root.querySelector('[data-wpw-vel]');
    var sDia = root.querySelector('[data-wpw-dia]');
    var sTemp = root.querySelector('[data-wpw-temp]');
    var sAlt = root.querySelector('[data-wpw-alt]');
    var segActual = root.querySelector('[data-wpw-seg="actual"]');
    var segRest = root.querySelector('[data-wpw-seg="rest"]');
    var outPower = root.querySelector('[data-wpw-power]');
    var outDens = root.querySelector('[data-wpw-dens]');
    var outRho = root.querySelector('[data-wpw-rho]');
    var outPenalty = root.querySelector('[data-wpw-penalty]');
    var warn = root.querySelector('[data-wpw-warn]');
    var presets = root.querySelectorAll('[data-wpw-preset]');

    function render() {
      var v = parseFloat(sVel.value);
      var D = parseFloat(sDia.value);
      var T = parseFloat(sTemp.value);
      var h = parseFloat(sAlt.value);

      /* the barometric formula of equation (9.3), then the gas law */
      var p = P0 * Math.pow(1 - 2.2558e-5 * h, 5.2559);
      var rho = p / (R_DRY * (T + 273.15));

      var dens = 0.5 * rho * v * v * v;          // W/m2
      var A = Math.PI * D * D / 4;

      outRho.textContent = fmt(rho, 3);
      outDens.textContent = fmt(dens, 1);
      outPower.textContent = fmt(dens * A / 1000, 1);
      outPenalty.textContent = fmt((rho / RHO_STD - 1) * 100, 1);

      var share = Math.min(100, dens / WORLD_CLASS * 100);
      segActual.style.width = share + '%';
      segRest.style.width = (100 - share) + '%';

      /* below this band grid generation does not pay, whatever the turbine */
      warn.hidden = dens >= 100;

      presets.forEach(function (b) {
        var q = b.dataset.wpwPreset.split('|');
        b.classList.toggle('is-on',
          Math.abs(parseFloat(q[0]) - v) < 0.06 &&
          Math.abs(parseFloat(q[1]) - D) < 0.6);
      });
    }

    [sVel, sDia, sTemp, sAlt].forEach(function (el) {
      el.addEventListener('input', render);
    });
    presets.forEach(function (b) {
      b.addEventListener('click', function () {
        var q = b.dataset.wpwPreset.split('|');
        sVel.value = q[0]; sDia.value = q[1]; sTemp.value = q[2]; sAlt.value = q[3];
        render();
      });
    });
    render();
  })();

  /* ============================================================
     23. Demo W — the Betz point  (chapter 9)

     Equations (9.4) and (9.5). The slider makes the contradiction
     physical: both ends of its travel give zero power, so the
     optimum has to lie between them.
     ============================================================ */
  (function betzDemo() {
    var root = document.querySelector('[data-demo="betz"]');
    if (!root) return;

    var sA = root.querySelector('[data-bz-a]');
    var sVel = root.querySelector('[data-bz-vel]');
    var segCap = root.querySelector('[data-bz-seg="captured"]');
    var segPass = root.querySelector('[data-bz-seg="passed"]');
    var outCp = root.querySelector('[data-bz-cp]');
    var outVd = root.querySelector('[data-bz-vd]');
    var outV2 = root.querySelector('[data-bz-v2]');
    var outExp = root.querySelector('[data-bz-exp]');
    var warn = root.querySelector('[data-bz-warn]');
    var presets = root.querySelectorAll('[data-bz-preset]');

    function render() {
      var a = parseFloat(sA.value);
      var v1 = parseFloat(sVel.value);

      var cp = 4 * a * (1 - a) * (1 - a);
      var vd = v1 * (1 - a);
      var v2 = v1 * (1 - 2 * a);

      outCp.textContent = fmt(cp, 3);
      outVd.textContent = fmt(vd, 2);
      outV2.textContent = fmt(Math.max(0, v2), 2);
      /* mass conservation: A2/A1 = v1/v2, unbounded as v2 goes to zero */
      outExp.textContent = v2 > 0.05 ? fmt(v1 / v2, 1) : '∞';

      segCap.style.width = (cp * 100) + '%';
      segPass.style.width = ((1 - cp) * 100) + '%';

      /* past about 0.45 the wake stalls and the disc model breaks down */
      warn.hidden = a <= 0.45;

      presets.forEach(function (b) {
        b.classList.toggle('is-on', Math.abs(parseFloat(b.dataset.bzPreset) - a) < 0.008);
      });
    }

    sA.addEventListener('input', render);
    sVel.addEventListener('input', render);
    presets.forEach(function (b) {
      b.addEventListener('click', function () {
        sA.value = b.dataset.bzPreset;
        render();
      });
    });
    render();
  })();

  /* ============================================================
     24. Demo X — wind shear and tower height  (chapter 9)

     The log law of equation (9.6), referred to a 10 m measurement.
     The marginal readout answers the question a developer actually
     asks: what does the next twenty metres of tower buy?
     ============================================================ */
  (function windShearDemo() {
    var root = document.querySelector('[data-demo="wind-shear"]');
    if (!root) return;

    var Z_REF = 10;          // m, the measurement height
    var BAR_FULL = 4;        // the bar spans a fourfold power gain

    var sH = root.querySelector('[data-ws-height]');
    var sRef = root.querySelector('[data-ws-ref]');
    var segBase = root.querySelector('[data-ws-seg="base"]');
    var segGain = root.querySelector('[data-ws-seg="gain"]');
    var outVel = root.querySelector('[data-ws-vel]');
    var outGain = root.querySelector('[data-ws-gain]');
    var outAlpha = root.querySelector('[data-ws-alpha]');
    var outMarg = root.querySelector('[data-ws-marginal]');
    var warn = root.querySelector('[data-ws-warn]');
    var presets = root.querySelectorAll('[data-ws-preset]');

    var z0 = 0.10;           // the preset buttons set this

    function speedAt(z, vRef) {
      return vRef * Math.log(z / z0) / Math.log(Z_REF / z0);
    }

    function render() {
      var z = parseFloat(sH.value);
      var vRef = parseFloat(sRef.value);

      var v = speedAt(z, vRef);
      var gain = Math.pow(v / vRef, 3);

      outVel.textContent = fmt(v, 2);
      outGain.textContent = fmt(gain, 2);

      /* the power-law exponent that would match this log-law profile */
      outAlpha.textContent = z > Z_REF
        ? fmt(Math.log(v / vRef) / Math.log(z / Z_REF), 2)
        : '—';

      /* what another twenty metres of tower would add */
      var vNext = speedAt(z + 20, vRef);
      outMarg.textContent = fmt((Math.pow(vNext / v, 3) - 1) * 100, 1);

      var base = Math.min(100, 1 / BAR_FULL * 100);
      var total = Math.min(100, gain / BAR_FULL * 100);
      segBase.style.width = base + '%';
      segGain.style.width = Math.max(0, total - base) + '%';

      /* the rotor must clear the upwind canopy by at least twice its height;
         z0 is roughly a tenth of canopy height, so the canopy is about 10*z0 */
      warn.hidden = z >= 3 * (10 * z0);

      presets.forEach(function (b) {
        b.classList.toggle('is-on', Math.abs(parseFloat(b.dataset.wsPreset) - z0) < 1e-6);
      });
    }

    sH.addEventListener('input', render);
    sRef.addEventListener('input', render);
    presets.forEach(function (b) {
      b.addEventListener('click', function () {
        z0 = parseFloat(b.dataset.wsPreset);
        render();
      });
    });
    render();
  })();

  /* ============================================================
     25. Demo Y — Weibull times power curve equals AEP  (chapter 9)

     Equations (9.7) to (9.9), integrated in 0.5 m/s bins. The gamma
     function is needed for the mean and the energy pattern factor,
     so a Lanczos approximation is carried here.
     ============================================================ */
  (function windAepDemo() {
    var root = document.querySelector('[data-demo="wind-aep"]');
    if (!root) return;

    var P_RATED = 3000;      // kW, held fixed so the rated speed is the variable
    var V_IN = 3, V_OUT = 25;
    var LOSSES = 0.88;       // wake, availability and electrical
    var DV = 0.5;

    var sK = root.querySelector('[data-ae-k]');
    var sC = root.querySelector('[data-ae-c]');
    var sRated = root.querySelector('[data-ae-rated]');
    var segLow = root.querySelector('[data-ae-seg="low"]');
    var segMid = root.querySelector('[data-ae-seg="mid"]');
    var segHigh = root.querySelector('[data-ae-seg="high"]');
    var outCf = root.querySelector('[data-ae-cf]');
    var outEnergy = root.querySelector('[data-ae-energy]');
    var outMean = root.querySelector('[data-ae-mean]');
    var outKe = root.querySelector('[data-ae-ke]');
    var warn = root.querySelector('[data-ae-warn]');
    var presets = root.querySelectorAll('[data-ae-preset]');

    /* Lanczos approximation, good to about 15 significant figures */
    var LG = [676.5203681218851, -1259.1392167224028, 771.32342877765313,
              -176.61502916214059, 12.507343278686905, -0.13857109526572012,
              9.9843695780195716e-6, 1.5056327351493116e-7];
    function gamma(z) {
      if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
      z -= 1;
      var x = 0.99999999999980993;
      for (var i = 0; i < LG.length; i++) x += LG[i] / (z + i + 1);
      var t = z + LG.length - 0.5;
      return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
    }

    function render() {
      var k = parseFloat(sK.value);
      var c = parseFloat(sC.value);
      var vRated = parseFloat(sRated.value);

      /* region 2 follows the cube law from cut-in, then flat to cut-out */
      function power(v) {
        if (v < V_IN || v > V_OUT) return 0;
        if (v >= vRated) return P_RATED;
        return P_RATED * (v * v * v - V_IN * V_IN * V_IN) /
                         (vRated * vRated * vRated - V_IN * V_IN * V_IN);
      }

      var total = 0, low = 0, mid = 0, high = 0;
      for (var i = 0; i < 30 / DV; i++) {
        var v = (i + 0.5) * DV;
        var f = (k / c) * Math.pow(v / c, k - 1) * Math.exp(-Math.pow(v / c, k));
        var e = f * power(v) * DV;
        total += e;
        if (v < 6) low += e; else if (v < 10) mid += e; else high += e;
      }

      var net = total * LOSSES;
      outCf.textContent = fmt(net / P_RATED * 100, 1);
      outEnergy.textContent = fmt(net * 8760 / 1e6, 2);
      outMean.textContent = fmt(c * gamma(1 + 1 / k), 2);
      outKe.textContent = fmt(gamma(1 + 3 / k) / Math.pow(gamma(1 + 1 / k), 3), 2);

      segLow.style.width = (low / total * 100) + '%';
      segMid.style.width = (mid / total * 100) + '%';
      segHigh.style.width = (high / total * 100) + '%';

      /* below this a grid-connected project can scarcely repay its capital */
      warn.hidden = net / P_RATED >= 0.15;

      presets.forEach(function (b) {
        var q = b.dataset.aePreset.split('|');
        b.classList.toggle('is-on',
          Math.abs(parseFloat(q[0]) - k) < 0.03 &&
          Math.abs(parseFloat(q[1]) - c) < 0.06 &&
          Math.abs(parseFloat(q[2]) - vRated) < 0.3);
      });
    }

    [sK, sC, sRated].forEach(function (el) { el.addEventListener('input', render); });
    presets.forEach(function (b) {
      b.addEventListener('click', function () {
        var q = b.dataset.aePreset.split('|');
        sK.value = q[0]; sC.value = q[1]; sRated.value = q[2];
        render();
      });
    });
    render();
  })();

  /* ============================================================
     26. Demo Z1 — where the Sun is  (chapter 8)

     Equations (8.3) and (8.4). Azimuth is measured from south,
     positive to the west, so a value past ±90° means the Sun is in
     the northern half of the sky — every Thai noon from late April
     to mid-August.
     ============================================================ */
  (function solarGeometryDemo() {
    var root = document.querySelector('[data-demo="solar-geometry"]');
    if (!root) return;

    var RAD = Math.PI / 180;

    var sLat = root.querySelector('[data-sg-lat]');
    var sDay = root.querySelector('[data-sg-day-n]');
    var sTime = root.querySelector('[data-sg-time]');
    var sTilt = root.querySelector('[data-sg-tilt]');
    var mark = root.querySelector('[data-sg-mark]');
    var outAlt = root.querySelector('[data-sg-alt]');
    var outAzi = root.querySelector('[data-sg-azi]');
    var outInc = root.querySelector('[data-sg-inc]');
    var outDay = root.querySelector('[data-sg-day]');
    var warn = root.querySelector('[data-sg-warn]');
    var presets = root.querySelectorAll('[data-sg-preset]');

    function render() {
      var lat = parseFloat(sLat.value);
      var n = parseFloat(sDay.value);
      var t = parseFloat(sTime.value);
      var tilt = parseFloat(sTilt.value);

      var decl = 23.45 * Math.sin(360 * (284 + n) / 365 * RAD);
      var omega = 15 * (t - 12);
      var phi = lat * RAD, d = decl * RAD, w = omega * RAD;

      var cosZ = Math.sin(phi) * Math.sin(d) + Math.cos(phi) * Math.cos(d) * Math.cos(w);
      cosZ = Math.max(-1, Math.min(1, cosZ));
      var zen = Math.acos(cosZ);
      var alt = 90 - zen / RAD;

      /* azimuth from south; the sign follows the hour angle */
      var azi = 0;
      if (Math.sin(zen) > 1e-6) {
        var cosA = (cosZ * Math.sin(phi) - Math.sin(d)) / (Math.sin(zen) * Math.cos(phi));
        azi = Math.acos(Math.max(-1, Math.min(1, cosA))) / RAD;
        if (omega < 0) azi = -azi;
      }

      /* a south-facing plane at tilt beta behaves like a flat one at latitude phi - beta */
      var pb = (lat - tilt) * RAD;
      var cosI = Math.sin(pb) * Math.sin(d) + Math.cos(pb) * Math.cos(d) * Math.cos(w);
      var inc = Math.acos(Math.max(-1, Math.min(1, cosI))) / RAD;

      var cosWs = Math.max(-1, Math.min(1, -Math.tan(phi) * Math.tan(d)));
      var dayLen = 2 * Math.acos(cosWs) / RAD / 15;

      var up = alt > 0;
      outAlt.textContent = fmt(alt, 1);
      outAzi.textContent = up ? Math.round(azi) : '—';
      outInc.textContent = up ? fmt(inc, 1) : '—';
      outDay.textContent = fmt(dayLen, 1);
      mark.style.left = Math.max(0, Math.min(90, alt)) / 90 * 100 + '%';

      /* the Sun is north of overhead whenever declination exceeds latitude */
      warn.hidden = !(up && decl > lat);

      presets.forEach(function (b) {
        var q = b.dataset.sgPreset.split('|');
        b.classList.toggle('is-on',
          Math.abs(parseFloat(q[0]) - lat) < 0.2 &&
          Math.abs(parseFloat(q[1]) - n) < 1 &&
          Math.abs(parseFloat(q[2]) - t) < 0.2);
      });
    }

    [sLat, sDay, sTime, sTilt].forEach(function (el) { el.addEventListener('input', render); });
    presets.forEach(function (b) {
      b.addEventListener('click', function () {
        var q = b.dataset.sgPreset.split('|');
        sLat.value = q[0]; sDay.value = q[1]; sTime.value = q[2];
        render();
      });
    });
    render();
  })();

  /* ============================================================
     27. Demo Z2 — tilt and orientation over a whole year  (chapter 8)

     Equation (8.5) summed every 10 minutes for 365 days. Each step
     takes a constant clearness index, so GHI follows the
     extraterrestrial curve scaled to the site's annual total. The
     diffuse share comes from that index (fd = 1.40 − 1.9 Kt, which
     gives about half for Bangkok). Because the plane-of-array total
     is linear in fd, the best tilt for a latitude is found from
     sums cached once per latitude.
     ============================================================ */
  (function tiltOptimizerDemo() {
    var root = document.querySelector('[data-demo="tilt-optimizer"]');
    if (!root) return;

    var RAD = Math.PI / 180;
    var GSC = 1.367;          // kW/m²
    var ALBEDO = 0.2;         // soil and grass
    var STEPS = 144;          // 10-minute steps per day
    var MAX_TILT = 60;

    var sLat = root.querySelector('[data-to-lat]');
    var sGhi = root.querySelector('[data-to-ghi]');
    var sTilt = root.querySelector('[data-to-tilt]');
    var sAzi = root.querySelector('[data-to-azi]');
    var segGot = root.querySelector('[data-to-seg="got"]');
    var segLost = root.querySelector('[data-to-seg="lost"]');
    var outPoa = root.querySelector('[data-to-poa]');
    var outFlat = root.querySelector('[data-to-flat]');
    var outBest = root.querySelector('[data-to-best]');
    var outGap = root.querySelector('[data-to-gap]');
    var warn = root.querySelector('[data-to-warn]');
    var presets = root.querySelectorAll('[data-to-preset]');

    /* the trigonometry that does not depend on the plane, computed once */
    var SD = [], CD = [], G0 = [], CW = [], SW = [];
    for (var n0 = 1; n0 <= 365; n0++) {
      var d0 = 23.45 * Math.sin(360 * (284 + n0) / 365 * RAD) * RAD;
      SD.push(Math.sin(d0)); CD.push(Math.cos(d0));
      G0.push(1 + 0.033 * Math.cos(360 * n0 / 365 * RAD));
    }
    for (var m0 = 0; m0 < STEPS; m0++) {
      var w0 = ((m0 + 0.5) * 1440 / STEPS - 720) / 4 * RAD;
      CW.push(Math.cos(w0)); SW.push(Math.sin(w0));
    }

    /* beam sum on a plane: Σ G0n·max(0, cos θi), in units of Gsc·step */
    function beamSum(lat, tilt, azi) {
      var sp = Math.sin(lat * RAD), cp = Math.cos(lat * RAD);
      var sb = Math.sin(tilt * RAD), cb = Math.cos(tilt * RAD);
      var sa = Math.sin(azi * RAD), ca = Math.cos(azi * RAD);
      var sum = 0;
      for (var n = 0; n < 365; n++) {
        var sd = SD[n], cd = CD[n], g0 = G0[n];
        for (var m = 0; m < STEPS; m++) {
          var cw = CW[m], sw = SW[m];
          if (sp * sd + cp * cd * cw <= 0) continue;     // Sun below the horizon
          var ci = sd * sp * cb - sd * cp * sb * ca + cd * cp * cb * cw +
                   cd * sp * sb * ca * cw + cd * sb * sa * sw;
          if (ci > 0) sum += g0 * ci;
        }
      }
      return sum;
    }

    /* per latitude: horizontal sum H and the south-facing beam sum for every tilt */
    var cache = {};
    function tableFor(lat) {
      if (cache[lat]) return cache[lat];
      var beam = [];
      for (var t = 0; t <= MAX_TILT; t++) beam.push(beamSum(lat, t, 0));
      var hours = 24 / STEPS;
      cache[lat] = { H: beam[0], beam: beam, h0kWh: beam[0] * GSC * hours };
      return cache[lat];
    }

    /* plane-of-array total as a multiple of GHI */
    function ratio(tab, beam, tilt, fd) {
      var cb = Math.cos(tilt * RAD);
      return ((1 - fd) * beam + fd * tab.H * (1 + cb) / 2 + ALBEDO * tab.H * (1 - cb) / 2) / tab.H;
    }

    function render() {
      var lat = parseFloat(sLat.value);
      var ghi = parseFloat(sGhi.value);
      var tilt = parseFloat(sTilt.value);
      var azi = parseFloat(sAzi.value);

      var tab = tableFor(lat);
      var kt = ghi / tab.h0kWh;
      var fd = Math.max(0.2, Math.min(0.9, 1.40 - 1.9 * kt));

      var bestT = 0, bestR = 0;
      for (var t = 0; t <= MAX_TILT; t++) {
        var r = ratio(tab, tab.beam[t], t, fd);
        if (r > bestR) { bestR = r; bestT = t; }
      }

      var beam = azi === 0 ? tab.beam[tilt] : beamSum(lat, tilt, azi);
      var here = ratio(tab, beam, tilt, fd);
      var got = Math.min(100, here / bestR * 100);
      var vsFlat = (here - 1) * 100;

      outPoa.textContent = Math.round(ghi * here);
      outFlat.textContent = (vsFlat >= 0 ? '+' : '−') + fmt(Math.abs(vsFlat), 1);
      outBest.textContent = bestT;
      outGap.textContent = fmt(100 - got, 1);
      segGot.style.width = got + '%';
      segLost.style.width = (100 - got) + '%';

      /* below 10° rain no longer washes the glass — soiling outweighs any gain */
      warn.hidden = tilt >= 10;

      presets.forEach(function (b) {
        var q = b.dataset.toPreset.split('|');
        b.classList.toggle('is-on',
          Math.abs(parseFloat(q[0]) - lat) < 0.2 &&
          Math.abs(parseFloat(q[1]) - ghi) < 10 &&
          Math.abs(parseFloat(q[2]) - tilt) < 1 &&
          Math.abs(parseFloat(q[3]) - azi) < 5);
      });
    }

    [sLat, sGhi, sTilt, sAzi].forEach(function (el) { el.addEventListener('input', render); });
    presets.forEach(function (b) {
      b.addEventListener('click', function () {
        var q = b.dataset.toPreset.split('|');
        sLat.value = q[0]; sGhi.value = q[1]; sTilt.value = q[2]; sAzi.value = q[3];
        render();
      });
    });
    render();
  })();

  /* ============================================================
     28. Demo Z3 — the I–V curve of a 500 Wp module  (chapter 8)

     Equation (8.7), the single-diode model, solved by Newton's
     method for I at each V. Parameters are fitted to the label of
     worked example 8.5 (Voc 45.6 V, Isc 13.85 A, 72 cells in
     series); n = 1.05 reproduces Pmp = 499 W and FF = 0.790 at
     Rs = 0.12 Ω, and gives a power coefficient near −0.36 %/K.
     ============================================================ */
  (function ivCurveDemo() {
    var root = document.querySelector('[data-demo="iv-curve"]');
    if (!root) return;

    var K_Q = 1.380649e-23 / 1.602177e-19;   // k/q, V/K
    var NS = 72, N_ID = 1.05, EG = 1.12;      // cells, ideality, silicon bandgap (eV)
    var ISC = 13.85, VOC = 45.6, RSH = 350;
    var ALPHA_I = 0.0005;                     // current rises 0.05 %/K
    var T_REF = 298.15, RS_REF = 0.12;
    var IL_REF = ISC * (1 + RS_REF / RSH);
    var I0_REF = (IL_REF - VOC / RSH) / (Math.exp(VOC / (N_ID * NS * K_Q * T_REF)) - 1);

    /* plot frame, matching the axes drawn in the SVG */
    var X0 = 54, X1 = 516, Y0 = 266, YTOP = 26;
    var V_MAX = 50, I_MAX = 15, P_MAX = 560;
    function px(v) { return X0 + v / V_MAX * (X1 - X0); }
    function pyI(i) { return Y0 - i / I_MAX * (Y0 - YTOP); }
    function pyP(p) { return Y0 - p / P_MAX * (Y0 - YTOP); }

    var sG = root.querySelector('[data-iv-g]');
    var sT = root.querySelector('[data-iv-t]');
    var sRs = root.querySelector('[data-iv-rs]');
    var lineI = root.querySelector('[data-iv-cur]');
    var lineP = root.querySelector('[data-iv-pow]');
    var dot = root.querySelector('[data-iv-mpp]');
    var drop = root.querySelector('[data-iv-mppv]');
    var tag = root.querySelector('[data-iv-tag]');
    var outP = root.querySelector('[data-iv-p]');
    var outVmp = root.querySelector('[data-iv-vmp]');
    var outVoc = root.querySelector('[data-iv-voc]');
    var outFf = root.querySelector('[data-iv-ff]');
    var warn = root.querySelector('[data-iv-warn]');
    var presets = root.querySelectorAll('[data-iv-preset]');

    function render() {
      var G = parseFloat(sG.value);
      var tc = parseFloat(sT.value);
      var rs = parseFloat(sRs.value);
      var T = tc + 273.15;
      var vt = N_ID * NS * K_Q * T;
      var il = IL_REF * G / 1000 * (1 + ALPHA_I * (tc - 25));
      var i0 = I0_REF * Math.pow(T / T_REF, 3) *
               Math.exp(EG / (N_ID * K_Q) * (1 / T_REF - 1 / T));

      /* Newton on f(I) = IL − I0[exp((V+IRs)/Vt) − 1] − (V+IRs)/Rsh − I */
      function current(v, guess) {
        var I = guess;
        for (var k = 0; k < 40; k++) {
          var e = Math.exp((v + I * rs) / vt);
          var f = il - i0 * (e - 1) - (v + I * rs) / RSH - I;
          var df = -i0 * e * rs / vt - rs / RSH - 1;
          var step = f / df;
          I -= step;
          if (Math.abs(step) < 1e-7) break;
        }
        return I;
      }

      /* Voc by bisection: the voltage at which the current reaches zero */
      var lo = 0, hi = 60;
      for (var b = 0; b < 40; b++) {
        var mid = (lo + hi) / 2;
        if (current(mid, il) > 0) lo = mid; else hi = mid;
      }
      var voc = lo;
      var isc = current(0, il);

      var ptsI = [], ptsP = [], best = { p: 0, v: 0, i: 0 };
      var N = 240, guess = il;
      for (var j = 0; j <= N; j++) {
        var v = voc * j / N;
        var I = Math.max(0, current(v, guess));
        guess = I;
        var p = v * I;
        if (p > best.p) best = { p: p, v: v, i: I };
        ptsI.push(px(v).toFixed(1) + ',' + pyI(I).toFixed(1));
        ptsP.push(px(v).toFixed(1) + ',' + pyP(p).toFixed(1));
      }
      lineI.setAttribute('points', ptsI.join(' '));
      lineP.setAttribute('points', ptsP.join(' '));

      var ff = best.p / (voc * isc);
      var cx = px(best.v), cy = pyP(best.p);
      dot.setAttribute('cx', cx.toFixed(1));
      dot.setAttribute('cy', cy.toFixed(1));
      drop.setAttribute('x1', cx.toFixed(1));
      drop.setAttribute('x2', cx.toFixed(1));
      drop.setAttribute('y1', cy.toFixed(1));
      tag.textContent = Math.round(best.p) + ' W';

      outP.textContent = Math.round(best.p);
      outVmp.textContent = fmt(best.v, 1);
      outVoc.textContent = fmt(voc, 1);
      outFf.textContent = fmt(ff, 3);

      /* an acceptance test would reject a module this far gone */
      warn.hidden = ff >= 0.72;

      presets.forEach(function (btn) {
        var q = btn.dataset.ivPreset.split('|');
        btn.classList.toggle('is-on',
          Math.abs(parseFloat(q[0]) - G) < 1 &&
          Math.abs(parseFloat(q[1]) - tc) < 0.5 &&
          Math.abs(parseFloat(q[2]) - rs) < 0.005);
      });
    }

    [sG, sT, sRs].forEach(function (el) { el.addEventListener('input', render); });
    presets.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var q = btn.dataset.ivPreset.split('|');
        sG.value = q[0]; sT.value = q[1]; sRs.value = q[2];
        render();
      });
    });
    render();
  })();

  /* ============================================================
     29. Demo Z4 — the heat tax on a 500 Wp module  (chapter 8)

     Equation (8.9). The loss is quoted against the power the module
     would give at the same irradiance but a 25 °C cell, so that
     only the temperature effect shows.
     ============================================================ */
  (function tempLossDemo() {
    var root = document.querySelector('[data-demo="temp-loss"]');
    if (!root) return;

    var P_STC = 500;                       // W
    var SCALE_LO = 10, SCALE_HI = 80;      // the temperature ladder drawn above

    var sAmb = root.querySelector('[data-tl-amb]');
    var sG = root.querySelector('[data-tl-g]');
    var sNoct = root.querySelector('[data-tl-noct]');
    var sGamma = root.querySelector('[data-tl-gamma]');
    var mark = root.querySelector('[data-tl-mark]');
    var segKept = root.querySelector('[data-tl-seg="kept"]');
    var segLost = root.querySelector('[data-tl-seg="lost"]');
    var outTemp = root.querySelector('[data-tl-temp]');
    var outPower = root.querySelector('[data-tl-power]');
    var outLoss = root.querySelector('[data-tl-loss]');
    var outWp = root.querySelector('[data-tl-wp]');
    var warn = root.querySelector('[data-tl-warn]');
    var presets = root.querySelectorAll('[data-tl-preset]');

    function render() {
      var amb = parseFloat(sAmb.value);
      var G = parseFloat(sG.value);
      var noct = parseFloat(sNoct.value);
      var gamma = parseFloat(sGamma.value) / 100;    // %/K to 1/K

      var tCell = amb + (noct - 20) / 800 * G;
      var factor = 1 + gamma * (tCell - 25);
      var power = P_STC * G / 1000 * factor;
      var loss = (1 - factor) * 100;                  // negative when the cell is below 25 °C

      outTemp.textContent = fmt(tCell, 1);
      outPower.textContent = Math.round(power);
      outLoss.textContent = (loss < 0 ? '−' : '') + fmt(Math.abs(loss), 1);
      outWp.textContent = Math.round(P_STC * (1 - factor));

      var lost = Math.max(0, Math.min(100, loss));
      segKept.style.width = (100 - lost) + '%';
      segLost.style.width = lost + '%';
      var pos = (tCell - SCALE_LO) / (SCALE_HI - SCALE_LO) * 100;
      mark.style.left = Math.max(0, Math.min(100, pos)) + '%';

      /* above 70 °C the encapsulant and joints age noticeably faster */
      warn.hidden = tCell <= 70;

      presets.forEach(function (b) {
        var q = b.dataset.tlPreset.split('|');
        b.classList.toggle('is-on',
          Math.abs(parseFloat(q[0]) - amb) < 0.3 &&
          Math.abs(parseFloat(q[1]) - G) < 5 &&
          Math.abs(parseFloat(q[2]) - noct) < 0.5 &&
          Math.abs(parseFloat(q[3]) - gamma * 100) < 0.005);
      });
    }

    [sAmb, sG, sNoct, sGamma].forEach(function (el) { el.addEventListener('input', render); });
    presets.forEach(function (b) {
      b.addEventListener('click', function () {
        var q = b.dataset.tlPreset.split('|');
        sAmb.value = q[0]; sG.value = q[1]; sNoct.value = q[2]; sGamma.value = q[3];
        render();
      });
    });
    render();
  })();

  /* ============================================================
     30. Demo Z5 — solar pumping against diesel  (chapter 8)

     Equation (8.13) and the costs of worked example 8.10. The array
     is bought in whole 500 Wp modules; the pump-and-controller and
     balance-of-system costs scale with size so that the example's
     4.14 kWp case reproduces its 150,000 baht and 2.3-year payback.
     ============================================================ */
  (function solarPumpDemo() {
    var root = document.querySelector('[data-demo="solar-pump"]');
    if (!root) return;

    var RHO_G = 1000 * 9.81;
    var PR = 0.78;               // no grid inverter, so a little above table 8.4
    var ETA_MODULE = 0.21;       // for the light-falling-on-the-array bar
    var DIESEL_ETA = 0.11, DIESEL_KWH_L = 10, DIESEL_THB = 32;
    var DAYS = 300, SERVICE_THB = 8000;
    var MODULE_KWP = 0.5, MODULE_THB_PER_KWP = 14000;
    var PUMP_THB_FIXED = 20000, PUMP_THB_PER_KWP = 8500;
    var BOS_THB_PER_KWP = 7000;

    var sQ = root.querySelector('[data-sp-q]');
    var sH = root.querySelector('[data-sp-h]');
    var sEta = root.querySelector('[data-sp-eta]');
    var sSun = root.querySelector('[data-sp-sun]');
    var segHyd = root.querySelector('[data-sp-seg="hyd"]');
    var segPump = root.querySelector('[data-sp-seg="pump"]');
    var segSolar = root.querySelector('[data-sp-seg="solar"]');
    var outKwp = root.querySelector('[data-sp-kwp]');
    var outHyd = root.querySelector('[data-sp-hyd]');
    var outDiesel = root.querySelector('[data-sp-diesel]');
    var outPay = root.querySelector('[data-sp-pay]');
    var warn = root.querySelector('[data-sp-warn]');
    var presets = root.querySelectorAll('[data-sp-preset]');

    function render() {
      var q = parseFloat(sQ.value);
      var h = parseFloat(sH.value);
      var eta = parseFloat(sEta.value);
      var sun = parseFloat(sSun.value);

      var eHyd = RHO_G * q * h / 3.6e6;            // kWh/day
      var eElec = eHyd / eta;
      var kwp = eElec / (sun * PR);
      var kwpBuilt = Math.ceil(kwp / MODULE_KWP - 1e-9) * MODULE_KWP;

      var litres = eHyd / DIESEL_ETA / DIESEL_KWH_L;
      var dieselCost = litres * DAYS * DIESEL_THB + SERVICE_THB;
      var capex = kwpBuilt * (MODULE_THB_PER_KWP + BOS_THB_PER_KWP) +
                  PUMP_THB_FIXED + PUMP_THB_PER_KWP * kwp;

      outKwp.textContent = fmt(kwp, 2);
      outHyd.textContent = fmt(eHyd, 2);
      outDiesel.textContent = fmt(litres, 2);
      outPay.textContent = fmt(capex / dieselCost, 1);

      /* daily light on the array's area: kWp / efficiency × peak sun hours */
      var light = kwp / ETA_MODULE * sun;
      var aHyd = eHyd / light * 100;
      var aPump = (eElec - eHyd) / light * 100;
      segHyd.style.width = aHyd + '%';
      segPump.style.width = aPump + '%';
      segSolar.style.width = Math.max(0, 100 - aHyd - aPump) + '%';

      /* beyond this a grid connection, or a smaller load, usually wins */
      warn.hidden = kwp <= 15;

      presets.forEach(function (b) {
        var p = b.dataset.spPreset.split('|');
        b.classList.toggle('is-on',
          Math.abs(parseFloat(p[0]) - q) < 2.5 &&
          Math.abs(parseFloat(p[1]) - h) < 0.5 &&
          Math.abs(parseFloat(p[2]) - eta) < 0.005 &&
          Math.abs(parseFloat(p[3]) - sun) < 0.05);
      });
    }

    [sQ, sH, sEta, sSun].forEach(function (el) { el.addEventListener('input', render); });
    presets.forEach(function (b) {
      b.addEventListener('click', function () {
        var p = b.dataset.spPreset.split('|');
        sQ.value = p[0]; sH.value = p[1]; sEta.value = p[2]; sSun.value = p[3];
        render();
      });
    });
    render();
  })();

  /* ============================================================
     31. Demo AA — a farm load profile against the sun  (chapter 10)

     Equation (10.2), simulated hour by hour. The array follows a
     half-sine from 06:00 to 18:00 scaled to 3.8 kWh/kWp/day. The
     battery charges from surplus and discharges into deficit at 95%
     each way, and the day is run three times so that the battery
     starts the reported day in its steady state.
     ============================================================ */
  (function farmLoadDemo() {
    var root = document.querySelector('[data-demo="farm-load"]');
    if (!root) return;

    var YIELD = 3.8;                   // kWh/kWp/day
    var C_BUY = 4.20, C_SELL = 2.20;   // baht/kWh
    var PV_BAHT = 22000, BATT_BAHT = 10000;   // per kWp, per usable kWh
    var ETA = 0.95;
    var NIGHT = [0, 1, 2, 3, 4, 5, 19, 20, 21, 22, 23];
    var MIDDAY = [10, 11, 12, 13, 14, 15];

    /* hourly kW, hour 0 to 23 */
    var PROFILES = {
      poultry: { th: 'โรงเรือนไก่เนื้อ', en: 'Broiler house',
        kw: [7, 7, 7, 7, 7, 7, 8, 9, 11, 13, 14.5, 15.5, 15.5, 15.5, 15.5, 15, 14, 12, 10, 9, 8, 8, 7.5, 7] },
      mill:    { th: 'โรงสีข้าว', en: 'Rice mill',
        kw: [3, 3, 3, 3, 3, 3, 3, 20, 60, 60, 60, 60, 30, 60, 60, 60, 60, 20, 3, 3, 3, 3, 3, 3] },
      cold:    { th: 'ห้องเย็นผลไม้', en: 'Fruit cold room',
        kw: [8, 8, 8, 8, 8, 8, 8.5, 9, 10, 11, 12, 13, 13.5, 14, 14, 13.5, 12.5, 11, 10, 9.5, 9, 8.5, 8, 8] },
      shrimp:  { th: 'ฟาร์มกุ้ง', en: 'Shrimp farm',
        kw: [30, 30, 30, 30, 30, 30, 30, 15, 15, 15, 8, 8, 8, 8, 8, 8, 8, 15, 15, 15, 30, 30, 30, 30] }
    };

    var PV_SHAPE = (function () {
      var s = [], total = 0;
      for (var h = 0; h < 24; h++) {
        var m = h + 0.5;
        var v = (m > 6 && m < 18) ? Math.sin(Math.PI * (m - 6) / 12) : 0;
        s.push(v); total += v;
      }
      return s.map(function (v) { return v / total * YIELD; });
    })();

    var X0 = 54, X1 = 516, Y0 = 250, YTOP = 30;

    var sPv = root.querySelector('[data-fl-pv-size]');
    var sBatt = root.querySelector('[data-fl-batt]');
    var sShift = root.querySelector('[data-fl-shift]');
    var lineLoad = root.querySelector('[data-fl-load]');
    var linePv = root.querySelector('[data-fl-pv]');
    var areaSelf = root.querySelector('[data-fl-self]');
    var yMid = root.querySelector('[data-fl-ymid]');
    var yMax = root.querySelector('[data-fl-ymax]');
    var nameTh = root.querySelector('[data-fl-name-th]');
    var nameEn = root.querySelector('[data-fl-name-en]');
    var outSc = root.querySelector('[data-fl-sc]');
    var outSs = root.querySelector('[data-fl-ss]');
    var outSav = root.querySelector('[data-fl-sav]');
    var outPay = root.querySelector('[data-fl-pay]');
    var warn = root.querySelector('[data-fl-warn]');
    var presets = root.querySelectorAll('[data-fl-preset]');

    var current = 'poultry';

    /* a round axis maximum: 10, 20, 50, 100 ... */
    function niceMax(v) {
      var p = Math.pow(10, Math.floor(Math.log(v) / Math.LN10));
      var steps = [1, 2, 4, 5, 10];
      for (var i = 0; i < steps.length; i++) if (steps[i] * p >= v) return steps[i] * p;
      return 10 * p;
    }

    function render() {
      var kwp = parseFloat(sPv.value);
      var batt = parseFloat(sBatt.value);
      var shift = parseFloat(sShift.value) / 100;
      var prof = PROFILES[current];

      /* move a share of the night load evenly into the middle of the day */
      var load = prof.kw.slice(), moved = 0;
      NIGHT.forEach(function (h) { var d = load[h] * shift; load[h] -= d; moved += d; });
      MIDDAY.forEach(function (h) { load[h] += moved / MIDDAY.length; });
      var pv = PV_SHAPE.map(function (v) { return v * kwp; });

      var soc = 0, res;
      for (var run = 0; run < 3; run++) {
        var self = 0, exp = 0, tl = 0, tp = 0;
        for (var h = 0; h < 24; h++) {
          var p = pv[h], l = load[h];
          tl += l; tp += p;
          var direct = Math.min(p, l);
          self += direct;
          var surplus = p - direct, deficit = l - direct;
          if (surplus > 0) {
            var charge = Math.min(surplus * ETA, batt - soc);
            soc += charge;
            exp += surplus - charge / ETA;
          }
          if (deficit > 0) {
            var draw = Math.min(deficit / ETA, soc);
            soc -= draw;
            self += draw * ETA;
          }
        }
        res = { self: self, exp: exp, load: tl, pv: tp };
      }

      var sc = res.pv > 0 ? res.self / res.pv : 0;
      var ss = res.self / res.load;
      var saving = 365 * (res.self * C_BUY + res.exp * C_SELL);
      var capex = kwp * PV_BAHT + batt * BATT_BAHT;

      outSc.textContent = res.pv > 0 ? fmt(sc * 100, 1) : '—';
      outSs.textContent = fmt(ss * 100, 1);
      outSav.textContent = Math.round(saving / 1000).toLocaleString('en-US');
      outPay.textContent = saving > 0 ? fmt(capex / saving, 1) : '—';

      /* chart */
      var peak = Math.max(Math.max.apply(null, load), Math.max.apply(null, pv));
      var top = niceMax(peak * 1.05);
      function px(h) { return X0 + h / 24 * (X1 - X0); }
      function py(v) { return Y0 - v / top * (Y0 - YTOP); }
      var ptsL = [], ptsP = [], ptsS = [];
      for (var k = 0; k < 24; k++) {
        /* draw each hour as a step so the area reads as energy */
        ptsL.push(px(k).toFixed(1) + ',' + py(load[k]).toFixed(1), px(k + 1).toFixed(1) + ',' + py(load[k]).toFixed(1));
        var mid = px(k + 0.5).toFixed(1);
        ptsP.push(mid + ',' + py(pv[k]).toFixed(1));
        var s = Math.min(load[k], pv[k]);
        ptsS.push(px(k).toFixed(1) + ',' + py(s).toFixed(1), px(k + 1).toFixed(1) + ',' + py(s).toFixed(1));
      }
      lineLoad.setAttribute('points', ptsL.join(' '));
      linePv.setAttribute('points', ptsP.join(' '));
      areaSelf.setAttribute('points', px(0) + ',' + Y0 + ' ' + ptsS.join(' ') + ' ' + px(24) + ',' + Y0);
      yMid.textContent = (top / 2).toLocaleString('en-US');
      yMax.textContent = top.toLocaleString('en-US') + ' kW';
      nameTh.textContent = prof.th;
      nameEn.textContent = prof.en;

      /* below this a third of the output is sold at half price */
      warn.hidden = !(kwp > 0 && sc < 0.70);

      presets.forEach(function (b) {
        var q = b.dataset.flPreset.split('|');
        b.classList.toggle('is-on',
          q[0] === current &&
          Math.abs(parseFloat(q[1]) - kwp) < 2.5 &&
          Math.abs(parseFloat(q[2]) - batt) < 5 &&
          Math.abs(parseFloat(q[3]) - shift * 100) < 2.5);
      });
    }

    [sPv, sBatt, sShift].forEach(function (el) { el.addEventListener('input', render); });
    presets.forEach(function (b) {
      b.addEventListener('click', function () {
        var q = b.dataset.flPreset.split('|');
        current = q[0];
        sPv.value = q[1]; sBatt.value = q[2]; sShift.value = q[3];
        render();
      });
    });
    render();
  })();

  /* ============================================================
     32. Demo AB — biogas from a pig farm  (chapter 10)

     Equation (10.6). Farm demand is fixed at 0.2 kWh per head per
     day (evaporative-cooled housing); the bar splits the gas energy
     into electricity, heat recoverable by CHP (taken as 45%), and
     the rest lost.
     ============================================================ */
  (function biogasFarmDemo() {
    var root = document.querySelector('[data-demo="biogas-farm"]');
    if (!root) return;

    var LHV = 22;               // MJ/m³ at 60% methane
    var X_CH4 = 0.6, RHO_CH4 = 0.717, GWP = 28;
    var DEMAND = 0.2;           // kWh/head/day
    var HEAT_SHARE = 0.45;
    var RUN_HOURS = 20;         // engine hours a day, allowing for maintenance
    var MIN_ENGINE_KW = 20;

    var sN = root.querySelector('[data-bg-n]');
    var sVs = root.querySelector('[data-bg-vs]');
    var sY = root.querySelector('[data-bg-y]');
    var sEta = root.querySelector('[data-bg-eta]');
    var segElec = root.querySelector('[data-bg-seg="elec"]');
    var segHeat = root.querySelector('[data-bg-seg="heat"]');
    var segLoss = root.querySelector('[data-bg-seg="loss"]');
    var outGas = root.querySelector('[data-bg-gas]');
    var outEl = root.querySelector('[data-bg-el]');
    var outCover = root.querySelector('[data-bg-cover]');
    var outCo2 = root.querySelector('[data-bg-co2]');
    var warn = root.querySelector('[data-bg-warn]');
    var presets = root.querySelectorAll('[data-bg-preset]');

    function render() {
      var n = parseFloat(sN.value);
      var vs = parseFloat(sVs.value);
      var y = parseFloat(sY.value);
      var eta = parseFloat(sEta.value);

      var gas = n * vs * y;                       // m³/day
      var el = gas * LHV * eta / 3.6;             // kWh/day
      var co2 = gas * X_CH4 * RHO_CH4 * GWP * 365 / 1000;   // t/yr

      outGas.textContent = Math.round(gas).toLocaleString('en-US');
      outEl.textContent = Math.round(el).toLocaleString('en-US');
      outCover.textContent = Math.round(el / (n * DEMAND) * 100);
      outCo2.textContent = Math.round(co2).toLocaleString('en-US');

      segElec.style.width = eta * 100 + '%';
      segHeat.style.width = HEAT_SHARE * 100 + '%';
      segLoss.style.width = Math.max(0, 100 - eta * 100 - HEAT_SHARE * 100) + '%';

      /* small gas engines are inefficient and costly to keep running */
      warn.hidden = el / RUN_HOURS >= MIN_ENGINE_KW;

      presets.forEach(function (b) {
        var q = b.dataset.bgPreset.split('|');
        b.classList.toggle('is-on',
          Math.abs(parseFloat(q[0]) - n) < 250 &&
          Math.abs(parseFloat(q[1]) - vs) < 0.005 &&
          Math.abs(parseFloat(q[2]) - y) < 0.005 &&
          Math.abs(parseFloat(q[3]) - eta) < 0.005);
      });
    }

    [sN, sVs, sY, sEta].forEach(function (el) { el.addEventListener('input', render); });
    presets.forEach(function (b) {
      b.addEventListener('click', function () {
        var q = b.dataset.bgPreset.split('|');
        sN.value = q[0]; sVs.value = q[1]; sY.value = q[2]; sEta.value = q[3];
        render();
      });
    });
    render();
  })();

  /* ============================================================
     33. Demo AC — off-grid battery and array  (chapter 10)

     Equation (10.7). A DoD below 0.75 stands for lead-acid, above
     it for LFP; the two differ in price per nominal Wh and in cycle
     life, which shortens as the cycles are driven deeper.
     ============================================================ */
  (function offgridSizeDemo() {
    var root = document.querySelector('[data-demo="offgrid-size"]');
    if (!root) return;

    var ETA_B = 0.95, ETA_SYS = 0.70;
    var PV_BAHT = 30;                       // per Wp, small off-grid
    var ELEC_FIXED = 5000, ELEC_PER_WP = 8; // controller and inverter
    var CHEM = {
      lfp:  { baht: 8, cycles: 4000, refDod: 0.8, maxYears: 15 },
      lead: { baht: 4, cycles: 1000, refDod: 0.5, maxYears: 5 }
    };

    var sLoad = root.querySelector('[data-og-load]');
    var sAut = root.querySelector('[data-og-aut]');
    var sPsh = root.querySelector('[data-og-psh]');
    var sDod = root.querySelector('[data-og-dod]');
    var segUse = root.querySelector('[data-og-seg="use"]');
    var segRes = root.querySelector('[data-og-seg="reserve"]');
    var outBatt = root.querySelector('[data-og-batt]');
    var outPv = root.querySelector('[data-og-pv]');
    var outCost = root.querySelector('[data-og-cost]');
    var outLife = root.querySelector('[data-og-life]');
    var warn = root.querySelector('[data-og-warn]');
    var presets = root.querySelectorAll('[data-og-preset]');

    function render() {
      var load = parseFloat(sLoad.value);
      var aut = parseFloat(sAut.value);
      var psh = parseFloat(sPsh.value);
      var dod = parseFloat(sDod.value);
      var chem = dod < 0.75 ? CHEM.lead : CHEM.lfp;

      var batt = load * aut / (dod * ETA_B);     // Wh nominal
      var pv = load / (psh * ETA_SYS);           // Wp
      var cost = batt * chem.baht + pv * PV_BAHT + ELEC_FIXED + ELEC_PER_WP * pv;
      var cycles = chem.cycles * Math.pow(chem.refDod / dod, 1.5);
      var life = Math.min(chem.maxYears, cycles / 365);

      outBatt.textContent = fmt(batt / 1000, 2);
      outPv.textContent = Math.round(pv).toLocaleString('en-US');
      outCost.textContent = Math.round(cost / 1000).toLocaleString('en-US');
      outLife.textContent = life < 10 ? fmt(life, 1) : Math.round(life);

      segUse.style.width = dod * 100 + '%';
      segRes.style.width = (100 - dod * 100) + '%';

      /* monsoon spells of three to five dull days come every year */
      warn.hidden = aut >= 2;

      presets.forEach(function (b) {
        var q = b.dataset.ogPreset.split('|');
        b.classList.toggle('is-on',
          Math.abs(parseFloat(q[0]) - load) < 5 &&
          Math.abs(parseFloat(q[1]) - aut) < 0.25 &&
          Math.abs(parseFloat(q[2]) - psh) < 0.05 &&
          Math.abs(parseFloat(q[3]) - dod) < 0.025);
      });
    }

    [sLoad, sAut, sPsh, sDod].forEach(function (el) { el.addEventListener('input', render); });
    presets.forEach(function (b) {
      b.addEventListener('click', function () {
        var q = b.dataset.ogPreset.split('|');
        sLoad.value = q[0]; sAut.value = q[1]; sPsh.value = q[2]; sDod.value = q[3];
        render();
      });
    });
    render();
  })();

  /* ============================================================
     34. Demo AD — life-cycle cost, diesel against solar  (chapter 10)

     Equation (10.8) on the pumping system of worked example 8.10:
     5.95 L of diesel a day for 300 days, 8,000 baht/yr servicing;
     solar maintenance 2,000 baht/yr and a 25,000-baht controller in
     year 10; 24,000 m³ of water a year over 20 years.
     ============================================================ */
  (function lccCompareDemo() {
    var root = document.querySelector('[data-demo="lcc-compare"]');
    if (!root) return;

    var YEARS = 20;
    var LITRES = 5.95 * 300, DIESEL_SERVICE = 8000;
    var SOLAR_OM = 2000, CONTROLLER = 25000, CONTROLLER_YEAR = 10;
    var WATER = 24000;
    var X0 = 54, X1 = 516, Y0 = 250, YTOP = 30;

    var sR = root.querySelector('[data-lc-r]');
    var sFuel = root.querySelector('[data-lc-fuel]');
    var sEsc = root.querySelector('[data-lc-esc]');
    var sCap = root.querySelector('[data-lc-cap]');
    var lineD = root.querySelector('[data-lc-diesel]');
    var lineS = root.querySelector('[data-lc-solar]');
    var cross = root.querySelector('[data-lc-cross]');
    var yMid = root.querySelector('[data-lc-ymid]');
    var yMax = root.querySelector('[data-lc-ymax]');
    var outNpv = root.querySelector('[data-lc-npv]');
    var outPb = root.querySelector('[data-lc-pb]');
    var outWd = root.querySelector('[data-lc-wd]');
    var outWs = root.querySelector('[data-lc-ws]');
    var warn = root.querySelector('[data-lc-warn]');
    var presets = root.querySelectorAll('[data-lc-preset]');

    function render() {
      var r = parseFloat(sR.value) / 100;
      var fuel = parseFloat(sFuel.value);
      var esc = parseFloat(sEsc.value) / 100;
      var cap = parseFloat(sCap.value) * 1000;

      var cumD = [0], cumS = [cap], water = 0, payback = null;
      for (var t = 1; t <= YEARS; t++) {
        var df = Math.pow(1 + r, -t);
        var d = (LITRES * fuel * Math.pow(1 + esc, t - 1) + DIESEL_SERVICE) * df;
        var s = (SOLAR_OM + (t === CONTROLLER_YEAR ? CONTROLLER : 0)) * df;
        cumD.push(cumD[t - 1] + d);
        cumS.push(cumS[t - 1] + s);
        water += WATER * df;
        if (payback === null && cumS[t] <= cumD[t]) {
          /* interpolate within the year the lines cross */
          var g0 = cumS[t - 1] - cumD[t - 1], g1 = cumS[t] - cumD[t];
          payback = t - 1 + g0 / (g0 - g1);
        }
      }
      var pvD = cumD[YEARS], pvS = cumS[YEARS];

      outNpv.textContent = Math.round((pvD - pvS) / 1000).toLocaleString('en-US');
      outPb.textContent = payback === null ? '—' : fmt(payback, 1);
      outWd.textContent = fmt(pvD / water, 2);
      outWs.textContent = fmt(pvS / water, 2);

      var top = Math.max(pvD, pvS) * 1.05;
      var step = top > 1.5e6 ? 500000 : top > 600000 ? 250000 : 100000;
      top = Math.ceil(top / step) * step;
      function px(y) { return X0 + y / YEARS * (X1 - X0); }
      function py(v) { return Y0 - v / top * (Y0 - YTOP); }
      lineD.setAttribute('points', cumD.map(function (v, i) { return px(i).toFixed(1) + ',' + py(v).toFixed(1); }).join(' '));
      lineS.setAttribute('points', cumS.map(function (v, i) { return px(i).toFixed(1) + ',' + py(v).toFixed(1); }).join(' '));
      yMid.textContent = Math.round(top / 2000).toLocaleString('en-US');
      yMax.textContent = Math.round(top / 1000).toLocaleString('en-US') + ' k';

      if (payback === null) {
        cross.setAttribute('visibility', 'hidden');
      } else {
        var i0 = Math.floor(payback), f = payback - i0;
        var v = cumS[i0] + (cumS[Math.min(YEARS, i0 + 1)] - cumS[i0]) * f;
        cross.setAttribute('visibility', 'visible');
        cross.setAttribute('cx', px(payback).toFixed(1));
        cross.setAttribute('cy', py(v).toFixed(1));
      }

      /* beyond this the solar case is weak on these numbers */
      warn.hidden = payback !== null && payback <= 8;

      presets.forEach(function (b) {
        var q = b.dataset.lcPreset.split('|');
        b.classList.toggle('is-on',
          Math.abs(parseFloat(q[0]) - r * 100) < 0.25 &&
          Math.abs(parseFloat(q[1]) - fuel) < 0.5 &&
          Math.abs(parseFloat(q[2]) - esc * 100) < 0.25 &&
          Math.abs(parseFloat(q[3]) - cap / 1000) < 2.5);
      });
    }

    [sR, sFuel, sEsc, sCap].forEach(function (el) { el.addEventListener('input', render); });
    presets.forEach(function (b) {
      b.addEventListener('click', function () {
        var q = b.dataset.lcPreset.split('|');
        sR.value = q[0]; sFuel.value = q[1]; sEsc.value = q[2]; sCap.value = q[3];
        render();
      });
    });
    render();
  })();

})();
