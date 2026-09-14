/* ============================================================
   app.js — language switch, theme switch, reading progress,
   table-of-contents scrollspy, chapter progress on the home page
   ============================================================ */
(function () {
  'use strict';

  /* ---------- storage helpers (safe on file:// and private mode) ---------- */
  var store = {
    get: function (k, fallback) {
      try {
        var v = localStorage.getItem(k);
        return v === null ? fallback : v;
      } catch (e) { return fallback; }
    },
    set: function (k, v) {
      try { localStorage.setItem(k, v); } catch (e) { /* ignore */ }
    },
    json: function (k, fallback) {
      var raw = store.get(k, null);
      if (!raw) return fallback;
      try { return JSON.parse(raw); } catch (e) { return fallback; }
    }
  };
  window.RE = window.RE || {};
  window.RE.store = store;

  var doc = document.documentElement;

  /* ---------- 1. Language ---------- */
  function setLang(lang) {
    doc.dataset.lang = lang;
    doc.lang = lang;
    store.set('re.lang', lang);
    document.querySelectorAll('[data-lang-btn]').forEach(function (btn) {
      var isOn = btn.dataset.langBtn === lang;
      btn.setAttribute('aria-pressed', isOn ? 'true' : 'false');
      btn.classList.toggle('on', isOn);
    });
    // let components (e.g. quiz results) re-render their strings
    document.dispatchEvent(new CustomEvent('re:langchange', { detail: { lang: lang } }));
  }

  document.querySelectorAll('[data-lang-btn]').forEach(function (btn) {
    btn.addEventListener('click', function () { setLang(btn.dataset.langBtn); });
  });
  document.querySelectorAll('[data-lang-toggle]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      setLang(doc.dataset.lang === 'th' ? 'en' : 'th');
    });
  });
  setLang(doc.dataset.lang || 'th');

  /* ---------- 2. Theme ---------- */
  function setTheme(theme) {
    doc.dataset.theme = theme;
    store.set('re.theme', theme);
    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
      var icon = btn.querySelector('.icon');
      if (icon) icon.textContent = theme === 'dark' ? '☾' : '☀';
    });
  }
  document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      setTheme(doc.dataset.theme === 'dark' ? 'light' : 'dark');
    });
  });
  setTheme(doc.dataset.theme || 'light');

  /* ---------- 3. Reading progress bar ---------- */
  var bar = document.querySelector('.progress');
  if (bar) {
    var tick = function () {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var pct = h > 0 ? (window.scrollY / h) * 100 : 0;
      bar.style.width = Math.min(100, Math.max(0, pct)) + '%';
    };
    window.addEventListener('scroll', tick, { passive: true });
    window.addEventListener('resize', tick);
    tick();
  }

  /* ---------- 4. TOC scrollspy ---------- */
  var tocLinks = Array.prototype.slice.call(document.querySelectorAll('.sidebar a[href^="#"]'));
  if (tocLinks.length && 'IntersectionObserver' in window) {
    var map = {};
    var targets = [];
    tocLinks.forEach(function (a) {
      var el = document.getElementById(a.getAttribute('href').slice(1));
      if (el) { map[el.id] = a; targets.push(el); }
    });
    var visible = new Set();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) visible.add(e.target.id); else visible.delete(e.target.id);
      });
      var first = targets.filter(function (t) { return visible.has(t.id); })[0];
      if (!first) return;
      tocLinks.forEach(function (a) { a.classList.remove('is-active'); });
      if (map[first.id]) map[first.id].classList.add('is-active');
    }, { rootMargin: '-15% 0px -70% 0px', threshold: 0 });
    targets.forEach(function (t) { io.observe(t); });
  }

  /* ---------- 5. Chapter progress on the home page ---------- */
  var progress = store.json('re.progress', {});
  window.RE.progress = progress;

  document.querySelectorAll('[data-progress-for]').forEach(function (slot) {
    var id = slot.dataset.progressFor;
    var rec = progress[id];
    if (!rec) return;
    var parts = [];
    if (rec.pre) parts.push('Pre ' + rec.pre.score + '/' + rec.pre.total);
    if (rec.post) parts.push('<span class="done">Post ' + rec.post.score + '/' + rec.post.total + '</span>');
    if (parts.length) slot.innerHTML = parts.join(' · ');
  });

  var summary = document.querySelector('[data-progress-summary]');
  if (summary) {
    var ids = Object.keys(progress);
    var donePost = ids.filter(function (k) { return progress[k] && progress[k].post; }).length;
    if (donePost > 0) {
      summary.hidden = false;
      summary.querySelectorAll('[data-count]').forEach(function (el) { el.textContent = donePost; });
    }
  }

  var resetBtn = document.querySelector('[data-progress-reset]');
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      var msg = doc.dataset.lang === 'th'
        ? 'ล้างผลการทำแบบทดสอบทั้งหมดในเครื่องนี้?'
        : 'Clear all quiz results stored on this device?';
      if (!window.confirm(msg)) return;
      store.set('re.progress', '{}');
      location.reload();
    });
  }
})();
