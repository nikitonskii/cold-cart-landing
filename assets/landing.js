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
var form = document.getElementById('signup'), msg = document.getElementById('cta-msg');
form.addEventListener('submit', function(e){
  e.preventDefault();
  var email = document.getElementById('email').value.trim();
  var ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if(!ok){ msg.textContent = form.getAttribute('data-msg-invalid'); return; }
  msg.textContent = form.getAttribute('data-msg-ok');
  form.reset();
});
