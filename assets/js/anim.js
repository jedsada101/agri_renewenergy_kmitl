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
})();
