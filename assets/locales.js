/* Cold Cart — locale registry & language switcher.
   To add a language:
     1) Copy index.html, privacy.html, support.html, terms.html into /<code>/ and translate them.
     2) Add ONE entry to the list below — the switcher on every page updates automatically.
     3) Add the matching hreflang <link> to the <head> of each page (see README).
*/
window.COLD_CART_LOCALES = [
  { code: 'en', label: 'English',    path: ''   },
  { code: 'pl', label: 'Polski',     path: 'pl' },
  { code: 'uk', label: 'Українська', path: 'uk' }
];

(function () {
  var el = document.getElementById('langSwitch');
  if (!el) return;
  var locales = window.COLD_CART_LOCALES;
  var parts = location.pathname.split('/').filter(Boolean);
  var current = 'en';
  if (parts.length && locales.some(function (l) { return l.path === parts[0]; })) {
    current = parts[0];
    parts.shift();
  }
  var page = parts.length ? parts[parts.length - 1] : '';
  if (page === 'index.html') page = '';
  locales.forEach(function (l) {
    var a = document.createElement('a');
    a.href = (l.path ? '/' + l.path + '/' : '/') + page;
    a.textContent = l.label;
    a.lang = l.code;
    a.setAttribute('hreflang', l.code);
    if (l.code === current) a.className = 'active';
    el.appendChild(a);
  });
})();
