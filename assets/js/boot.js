/* boot.js — runs synchronously in <head> so the page never flashes
   the wrong language or theme. Keep it tiny and dependency-free. */
(function () {
  var d = document.documentElement;
  var lang = 'th', theme = 'light';
  try {
    lang = localStorage.getItem('re.lang') || 'th';
    theme = localStorage.getItem('re.theme') ||
      (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  } catch (e) { /* private mode / file:// — fall back to defaults */ }
  if (lang !== 'th' && lang !== 'en') lang = 'th';
  if (theme !== 'light' && theme !== 'dark') theme = 'light';
  d.dataset.lang = lang;
  d.dataset.theme = theme;
  d.lang = lang;
})();
