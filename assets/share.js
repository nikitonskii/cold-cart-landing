/* Shared wishlist page. Reads /s/<token>, renders a read-only list, and lets
   visitors anonymously reserve items ("I'll gift this"). No build step. */
(function () {
  'use strict';

  // --- Config --------------------------------------------------------------
  // Points at production by default (this page ships to prod coldcart.win).
  // For pre-prod QA, temporarily set this to 'https://api-dev.coldcart.win'.
  var API_BASE = 'https://api.coldcart.win';
  var TURNSTILE_SITEKEY = '0x4AAAAAAD9eCBvhB93qxwYe'; // same public key as the waitlist widget
  // App is live; swap for the direct App Store link when available. The
  // homepage always resolves and carries the store badges.
  var APP_STORE_URL = 'https://apps.apple.com/us/app/cold-cart/id6794052314';

  // --- State ---------------------------------------------------------------
  var TOKEN = '';
  var listData = null; // { name, ownerName, items: [{id,title,image,price,currency,url,reserved}] }
  var pendingId = null; // item currently being reserved/released
  var errorById = {};

  var stateEl = document.getElementById('state');

  // --- Helpers -------------------------------------------------------------
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function secretKey(itemId) {
    return 'cc:res:' + TOKEN + ':' + itemId;
  }
  function getSecret(itemId) {
    try { return localStorage.getItem(secretKey(itemId)); } catch (e) { return null; }
  }
  function setSecret(itemId, secret) {
    try { localStorage.setItem(secretKey(itemId), secret); } catch (e) {}
  }
  function clearSecret(itemId) {
    try { localStorage.removeItem(secretKey(itemId)); } catch (e) {}
  }

  function formatPrice(price, currency) {
    if (price == null || price === '') return '';
    var n = parseFloat(price);
    if (!isNaN(n) && currency) {
      try {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency }).format(n);
      } catch (e) { /* invalid currency code → fall through */ }
    }
    return currency ? esc(price) + ' ' + esc(currency) : esc(price);
  }

  // --- Turnstile (one challenge per reserve) -------------------------------
  function whenTurnstileReady() {
    return new Promise(function (resolve, reject) {
      if (window.turnstile) return resolve();
      var waited = 0;
      var iv = setInterval(function () {
        if (window.turnstile) { clearInterval(iv); resolve(); }
        else if ((waited += 100) > 10000) { clearInterval(iv); reject(new Error('turnstile unavailable')); }
      }, 100);
    });
  }

  function getTurnstileToken() {
    return whenTurnstileReady().then(function () {
      var host = document.getElementById('turnstile-host');
      host.hidden = false;
      host.innerHTML = '';
      return new Promise(function (resolve, reject) {
        var settled = false;
        function cleanup() {
          try { window.turnstile.remove(widgetId); } catch (e) {}
          host.hidden = true;
          host.innerHTML = '';
        }
        var widgetId = window.turnstile.render(host, {
          sitekey: TURNSTILE_SITEKEY,
          callback: function (token) { if (!settled) { settled = true; cleanup(); resolve(token); } },
          'error-callback': function () { if (!settled) { settled = true; cleanup(); reject(new Error('verification failed')); } },
          'expired-callback': function () { if (!settled) { settled = true; cleanup(); reject(new Error('verification expired')); } },
        });
        host.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });
  }

  // --- API -----------------------------------------------------------------
  function apiUrl(path) { return API_BASE + path; }

  function loadList() {
    return fetch(apiUrl('/public/wishlists/' + encodeURIComponent(TOKEN))).then(function (res) {
      if (!res.ok) throw new Error('unavailable');
      return res.json();
    });
  }

  function reserveItem(itemId, turnstileToken) {
    return fetch(
      apiUrl('/public/wishlists/' + encodeURIComponent(TOKEN) + '/items/' + encodeURIComponent(itemId) + '/reserve'),
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ turnstileToken: turnstileToken }) }
    );
  }

  function releaseItem(itemId, releaseSecret) {
    return fetch(
      apiUrl('/public/wishlists/' + encodeURIComponent(TOKEN) + '/items/' + encodeURIComponent(itemId) + '/reserve'),
      { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ releaseSecret: releaseSecret }) }
    );
  }

  // --- Render --------------------------------------------------------------
  function renderMessage(title, body) {
    stateEl.className = 'state';
    stateEl.innerHTML = '<h1>' + esc(title) + '</h1>' + (body ? '<p>' + esc(body) + '</p>' : '');
  }

  function ctaHTML() {
    return (
      '<section class="cta">' +
      '<p>Make your own wishlist and share it with anyone.</p>' +
      '<a class="btn" href="' + esc(APP_STORE_URL) + '">Get Cold Cart</a>' +
      '</section>'
    );
  }

  function itemHTML(item) {
    var mine = !!getSecret(item.id);
    var busy = pendingId === item.id;
    var price = formatPrice(item.price, item.currency);
    var img = item.image
      ? '<img class="item-img" src="' + esc(item.image) + '" alt="" loading="lazy">'
      : '<div class="item-img placeholder" aria-hidden="true">🎁</div>';

    // Reserve controls only on gift lists (the server also gates reserve/release).
    var control = '';
    if (listData.reservationsEnabled) {
      if (item.reserved && mine) {
        control =
          '<span class="badge">✓ Reserved by you</span>' +
          '<button class="btn btn-ghost" data-action="release" data-item-id="' + esc(item.id) + '"' +
          (busy ? ' disabled' : '') + '>' + (busy ? 'Releasing…' : 'Release') + '</button>';
      } else if (item.reserved) {
        control = '<span class="badge">✓ Reserved</span>';
      } else {
        control =
          '<button class="btn" data-action="reserve" data-item-id="' + esc(item.id) + '"' +
          (busy ? ' disabled' : '') + '>' + (busy ? 'Reserving…' : "I'll gift this 🎁") + '</button>';
      }
    }

    var err = errorById[item.id] ? '<p class="error-text">' + esc(errorById[item.id]) + '</p>' : '';

    return (
      '<li class="item">' +
      img +
      '<div class="item-body">' +
      '<p class="item-title">' + esc(item.title) + '</p>' +
      (price ? '<p class="item-price">' + price + '</p>' : '') +
      '<div class="item-actions">' +
      (item.url ? '<a class="link" href="' + esc(item.url) + '" target="_blank" rel="noopener nofollow">View in store →</a>' : '') +
      control +
      '</div>' + err +
      '</div>' +
      '</li>'
    );
  }

  function render() {
    if (!listData) return;
    var count = listData.items.length;
    var head =
      '<header class="list-head">' +
      '<h1 class="list-title">' + esc(listData.name) + '</h1>' +
      '<p class="list-meta">Shared by ' + esc(listData.ownerName) + ' · ' + count + (count === 1 ? ' item' : ' items') + '</p>' +
      (listData.reservationsEnabled ? '<p class="gift-badge">🎁 Gift list</p>' : '') +
      '</header>';

    var body = count
      ? '<ul class="items">' + listData.items.map(itemHTML).join('') + '</ul>'
      : '<p class="list-meta" style="text-align:center">No items yet.</p>';

    stateEl.className = '';
    stateEl.innerHTML = head + body + ctaHTML();
  }

  function findItem(itemId) {
    for (var i = 0; i < listData.items.length; i++) {
      if (listData.items[i].id === itemId) return listData.items[i];
    }
    return null;
  }

  // --- Actions -------------------------------------------------------------
  function onReserve(itemId) {
    var item = findItem(itemId);
    if (!item || pendingId) return;
    delete errorById[itemId];
    pendingId = itemId;
    render();

    getTurnstileToken()
      .then(function (token) { return reserveItem(itemId, token); })
      .then(function (res) {
        if (res.status === 201) {
          return res.json().then(function (data) {
            setSecret(itemId, data.releaseSecret);
            item.reserved = true;
          });
        }
        if (res.status === 409) { item.reserved = true; return; } // someone else got it first
        throw new Error('reserve failed');
      })
      .catch(function () { errorById[itemId] = 'Could not reserve — please try again.'; })
      .then(function () { pendingId = null; render(); });
  }

  function onRelease(itemId) {
    var item = findItem(itemId);
    var secret = getSecret(itemId);
    if (!item || pendingId || !secret) return;
    delete errorById[itemId];
    pendingId = itemId;
    render();

    releaseItem(itemId, secret)
      .then(function (res) {
        if (res.status === 204) { clearSecret(itemId); item.reserved = false; return; }
        throw new Error('release failed');
      })
      .catch(function () { errorById[itemId] = 'Could not release — please try again.'; })
      .then(function () { pendingId = null; render(); });
  }

  // --- Wiring --------------------------------------------------------------
  document.getElementById('app').addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-action]');
    if (!btn) return;
    var itemId = btn.getAttribute('data-item-id');
    if (btn.getAttribute('data-action') === 'reserve') onReserve(itemId);
    else if (btn.getAttribute('data-action') === 'release') onRelease(itemId);
  });

  function parseToken() {
    // Token travels in the query (/s/?t=<token>): the browser fetches only the
    // real /s/ file, and the app receives it reliably via Universal Links.
    return new URLSearchParams(location.search).get('t') || '';
  }

  function init() {
    TOKEN = parseToken();
    if (!TOKEN) {
      renderMessage("This list isn't available", 'The link looks incomplete.');
      return;
    }
    loadList()
      .then(function (data) { listData = data; render(); })
      .catch(function () {
        renderMessage("This list isn't available", 'It may have been unshared or the link is wrong.');
      });
  }

  init();
})();
