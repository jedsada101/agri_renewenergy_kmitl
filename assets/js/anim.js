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
})();
