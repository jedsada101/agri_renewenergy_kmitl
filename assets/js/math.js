/* ============================================================
   math.js — LaTeX typesetting via KaTeX

   Equations are written in the HTML as LaTeX:
     display   \[ E = P \times t \]
     inline    \( \mathrm{CF} = 16.1\% \)

   Keep Thai text OUT of the math: KaTeX's fonts carry no Thai
   glyphs, so \text{} with Thai characters renders as boxes.
   Put the prose outside the delimiters and only units inside.
   ============================================================ */
(function () {
  'use strict';

  var OPTIONS = {
    delimiters: [
      { left: '\\[', right: '\\]', display: true },
      { left: '\\(', right: '\\)', display: false }
    ],
    throwOnError: false,
    errorColor: '#b0261a',
    ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'option']
  };

  function render(el) {
    if (typeof window.renderMathInElement !== 'function') return;
    try { window.renderMathInElement(el || document.body, OPTIONS); }
    catch (e) { console.warn('[math] render failed', e); }
  }

  /* Exposed so content built after page load — quiz feedback, for
     instance — can be typeset when it appears. */
  window.RE = window.RE || {};
  window.RE.renderMath = render;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { render(); });
  } else {
    render();
  }
})();
