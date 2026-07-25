/* Cold Cart — landing page behaviour (shared by every locale).
   All user-visible strings live in the HTML (data-* attributes), never here. */
document.getElementById('yr').textContent = new Date().getFullYear();

// Header shadow on scroll
var header = document.getElementById('head');
function onScroll(){ header.classList.toggle('scrolled', window.scrollY > 8); }
onScroll(); window.addEventListener('scroll', onScroll, {passive:true});

// Reveal on scroll — only elements below the fold get hidden+animated;
// everything already in view stays visible immediately.
var prefersReduced = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
if(!prefersReduced && 'IntersectionObserver' in window){
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){ if(e.isIntersecting){ e.target.classList.remove('pre'); io.unobserve(e.target); } });
  }, {threshold:0.1, rootMargin:'0px 0px -40px 0px'});
  var fold = window.innerHeight * 0.82;
  document.querySelectorAll('.reveal').forEach(function(el){
    if(el.getBoundingClientRect().top > fold){ el.classList.add('pre'); io.observe(el); }
  });
}

// Mobile menu
var body = document.body, toggle = document.getElementById('menuToggle'), mobileNav = document.getElementById('mobileNav');
function closeMenu(){ body.classList.remove('menu-open'); toggle.setAttribute('aria-expanded','false'); }
toggle.addEventListener('click', function(){
  var open = body.classList.toggle('menu-open');
  toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
});
mobileNav.querySelectorAll('a').forEach(function(a){ a.addEventListener('click', closeMenu); });
window.addEventListener('resize', function(){ if(window.innerWidth > 880) closeMenu(); });

// Waitlist form — messages come from data-msg-* attributes so each locale supplies its own.
// data-endpoint accepts POST JSON {email, turnstileToken, locale, source} and answers
// 202 ok / 400 bad email / 403 turnstile / 429 rate limit / 5xx. Turnstile tokens are
// single-use, so the widget is reset after every attempt.
var form = document.getElementById('signup'), msg = document.getElementById('cta-msg');
form.addEventListener('submit', function(e){
  e.preventDefault();
  var email = document.getElementById('email').value.trim();
  var ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if(!ok){ msg.textContent = form.getAttribute('data-msg-invalid'); return; }
  var endpoint = form.getAttribute('data-endpoint');
  if(!endpoint){ msg.textContent = form.getAttribute('data-msg-ok'); form.reset(); return; }
  var tokenInput = form.querySelector('[name="cf-turnstile-response"]');
  var token = tokenInput ? tokenInput.value : '';
  if(!token){ msg.textContent = form.getAttribute('data-msg-error'); return; }
  var btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  fetch(endpoint, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({email: email, turnstileToken: token, locale: document.documentElement.lang, source: 'landing'})
  }).then(function(r){
    if(r.ok){ msg.textContent = form.getAttribute('data-msg-ok'); form.reset(); }
    else if(r.status === 400){ msg.textContent = form.getAttribute('data-msg-invalid'); }
    else { msg.textContent = form.getAttribute('data-msg-error'); }
  }).catch(function(){
    msg.textContent = form.getAttribute('data-msg-error');
  }).finally(function(){
    btn.disabled = false;
    if(window.turnstile) turnstile.reset();
  });
});
