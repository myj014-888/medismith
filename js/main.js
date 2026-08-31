/* ═══════════════════════════════════════════════════
   MediSmith — interactions
   ═══════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── year ──────────────────────────────────────── */
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  /* ── sticky nav ────────────────────────────────── */
  var nav = document.getElementById('nav');
  var onScroll = function () {
    nav.classList.toggle('stuck', window.scrollY > 40);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ── mobile menu ───────────────────────────────── */
  var toggle = document.getElementById('navToggle');
  var navLinks = document.getElementById('navLinks');
  var mobileNav = window.matchMedia('(max-width: 768px)');

  function setMenu(open) {
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    navLinks.classList.toggle('open', open);
    nav.classList.toggle('menu-open', open);
  }
  function menuOpen() { return toggle.getAttribute('aria-expanded') === 'true'; }

  toggle.addEventListener('click', function () { setMenu(!menuOpen()); });

  // a tap on any menu item closes the panel behind it
  navLinks.addEventListener('click', function (e) {
    if (e.target.closest('a')) setMenu(false);
  });

  document.addEventListener('click', function (e) {
    if (menuOpen() && !nav.contains(e.target)) setMenu(false);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menuOpen()) { setMenu(false); toggle.focus(); }
  });

  // Leaving mobile width with the panel open would strand it as a floating
  // box. matchMedia is the cheap signal, but it does not fire everywhere, so
  // a plain resize check backs it up.
  function closeIfDesktop() { if (!mobileNav.matches && menuOpen()) setMenu(false); }
  if (mobileNav.addEventListener) mobileNav.addEventListener('change', closeIfDesktop);
  else if (mobileNav.addListener) mobileNav.addListener(closeIfDesktop);
  window.addEventListener('resize', closeIfDesktop, { passive: true });
  window.addEventListener('orientationchange', closeIfDesktop);

  /* ── scroll reveal ─────────────────────────────── */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          var el = e.target;
          el.classList.add('in');
          io.unobserve(el);
          // drop the stagger once it has played, or it would also delay
          // the hover transitions on the same element
          if (el.style.transitionDelay) {
            setTimeout(function () { el.style.transitionDelay = ''; }, 1400);
          }
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* ── micro-interactions (section 1) ────────────────
     Pointer-driven only, and skipped entirely on touch or when the
     visitor has asked for reduced motion. */
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var calmMotion  = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var wantsMotion = finePointer && !calmMotion;

  var team = document.getElementById('team');

  if (wantsMotion && team) {
    // gold spotlight follows the cursor across the grid
    var raf = null, mx = 0, my = 0;
    team.addEventListener('pointerenter', function () { team.classList.add('is-live'); });
    team.addEventListener('pointerleave', function () { team.classList.remove('is-live'); });
    team.addEventListener('pointermove', function (e) {
      var r = team.getBoundingClientRect();
      mx = ((e.clientX - r.left) / r.width) * 100;
      my = ((e.clientY - r.top) / r.height) * 100;
      if (raf) return;
      raf = requestAnimationFrame(function () {
        team.style.setProperty('--mx', mx.toFixed(2) + '%');
        team.style.setProperty('--my', my.toFixed(2) + '%');
        raf = null;
      });
    });
  }

  // each card leans a few degrees toward the pointer
  function addTilt(card) {
    var frame = null;
    card.addEventListener('pointerenter', function () { card.classList.add('is-tilt'); });
    card.addEventListener('pointermove', function (e) {
      if (frame) return;
      frame = requestAnimationFrame(function () {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        card.style.setProperty('--ry', (px * 6).toFixed(2) + 'deg');
        card.style.setProperty('--rx', (-py * 6).toFixed(2) + 'deg');
        frame = null;
      });
    });
    card.addEventListener('pointerleave', function () {
      card.classList.remove('is-tilt');
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  }

  /* ── helpers ───────────────────────────────────── */

  // 0721234567 -> 27721234567  (South African MSISDN for wa.me)
  function waNumber(tel) {
    var d = String(tel || '').replace(/\D/g, '');
    if (d.indexOf('27') === 0) return d;
    if (d.charAt(0) === '0') return '27' + d.slice(1);
    return '27' + d;
  }

  function prettyTel(tel) {
    var d = String(tel || '').replace(/\D/g, '');
    if (d.length === 10) return d.slice(0, 3) + ' ' + d.slice(3, 6) + ' ' + d.slice(6);
    if (d.length === 9) return d.slice(0, 3) + ' ' + d.slice(3, 6) + ' ' + d.slice(6);
    return d;
  }

  // Load a portrait only if the file actually exists; otherwise keep the
  // monogram placeholder. Lets the site ship before photos are supplied.
  function mountPhoto(container, src, alt) {
    if (!src) return;
    var probe = new Image();
    probe.onload = function () {
      var img = new Image();
      img.src = src;
      img.alt = alt;
      img.loading = 'lazy';
      img.decoding = 'async';
      container.insertBefore(img, container.firstChild);
      container.classList.add('has-img');
    };
    probe.src = src;
  }

  /* ── hero logo swap ────────────────────────────── */
  var logo = document.querySelector('.hero__logoimg');
  var logoFallback = document.querySelector('.hero__logofallback');
  if (logo) {
    var useLogo = function () {
      logo.classList.add('ok');
      if (logoFallback) logoFallback.classList.add('hide');
    };
    var dropLogo = function () { logo.remove(); };

    // the image may already have settled before this script ran
    if (logo.complete) {
      if (logo.naturalWidth) { useLogo(); } else { dropLogo(); }
    } else {
      logo.addEventListener('load', useLogo);
      logo.addEventListener('error', dropLogo);
    }
  }

  /* ── cards ─────────────────────────────────────── */
  var cards = Array.prototype.slice.call(document.querySelectorAll('.card'));

  cards.forEach(function (card, i) {
    var media = card.querySelector('.card__media');
    var initials = card.querySelector('.card__initials');

    // stagger the entrance so the grid resolves row by row
    if (!calmMotion) card.style.transitionDelay = (Math.min(i, 11) * 0.055).toFixed(3) + 's';
    if (wantsMotion) addTilt(card);

    // derive monogram from the name
    if (initials && !initials.textContent.trim()) {
      initials.textContent = card.dataset.name
        .replace(/^(Dr|Mr|Mrs|Ms)\.?\s+/i, '')
        .split(/\s+/).slice(0, 2)
        .map(function (w) { return w.charAt(0); }).join('').toUpperCase();
    }

    mountPhoto(media, card.dataset.img, card.dataset.name + ' — ' + card.dataset.role);

    card.addEventListener('click', function () { openModal(card); });
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(card); }
    });
  });

  /* ── modal ─────────────────────────────────────── */
  var modal    = document.getElementById('modal');
  var mMedia   = modal.querySelector('.modal__media');
  var mInits   = modal.querySelector('.modal__initials');
  var mRole    = document.getElementById('modalRole');
  var mName    = document.getElementById('modalName');
  var mPract   = document.getElementById('modalPractice');
  var mBio     = document.getElementById('modalBio');
  var mTel     = document.getElementById('modalTel');
  var mEmail   = document.getElementById('modalEmail');
  var mWa      = document.getElementById('modalWa');
  var mWeb     = document.getElementById('modalWeb');
  var mNote    = modal.querySelector('.modal__note');
  var lastFocus = null;

  function openModal(card) {
    var d = card.dataset;

    mRole.textContent  = d.role;
    mName.textContent  = d.name;
    mPract.textContent = d.practice || 'MediSmith Medical & Therapy Centre';
    mBio.textContent   = d.bio;

    // A practitioner without a number yet still gets a card — the phone line
    // and WhatsApp button simply stand down until one is supplied.
    var hasTel = String(d.tel || '').replace(/\D/g, '').length > 0;
    if (hasTel) {
      mTel.hidden = false;
      mTel.textContent = prettyTel(d.tel);
      mTel.href = 'tel:+' + waNumber(d.tel);
      mWa.href = 'https://wa.me/' + waNumber(d.tel) + '?text=' +
        encodeURIComponent('Hi ' + d.name + ', I found you via the MediSmith website and would like to book an appointment.');
      mWa.target = '_blank';
      mWa.removeAttribute('aria-disabled');
    } else {
      mTel.hidden = true;
      mWa.href = '#';
      mWa.removeAttribute('target');
      mWa.setAttribute('aria-disabled', 'true');
    }

    // Email is optional per practitioner, same as the phone.
    var hasEmail = !!(d.email && d.email.trim());
    if (hasEmail) {
      mEmail.hidden = false;
      mEmail.textContent = d.email.trim();
      mEmail.href = 'mailto:' + d.email.trim();
    } else {
      mEmail.hidden = true;
      mEmail.removeAttribute('href');
    }

    // Website buttons are placeholders until each practice supplies a URL.
    var hasWeb = !!d.web;
    if (hasWeb) {
      mWeb.href = d.web;
      mWeb.target = '_blank';
      mWeb.rel = 'noopener';
      mWeb.removeAttribute('aria-disabled');
    } else {
      mWeb.href = '#';
      mWeb.removeAttribute('target');
      mWeb.setAttribute('aria-disabled', 'true');
    }

    if (!hasTel && !hasWeb)      mNote.textContent = 'Contact number and website coming soon.';
    else if (!hasTel)            mNote.textContent = 'Contact number coming soon.';
    else                         mNote.textContent = 'Website link coming soon.';
    mNote.hidden = hasTel && hasWeb;

    // portrait
    var old = mMedia.querySelector('img');
    if (old) old.remove();
    mMedia.classList.remove('has-img');
    mInits.textContent = card.querySelector('.card__initials').textContent;
    mountPhoto(mMedia, d.img, d.name + ' — ' + d.role);

    lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.classList.add('locked');
    void modal.offsetHeight; // force reflow so the transition runs
    modal.classList.add('open');
    modal.querySelector('.modal__close').focus();
  }

  function closeModal() {
    modal.classList.remove('open');
    document.body.classList.remove('locked');
    setTimeout(function () { modal.hidden = true; }, 400);
    if (lastFocus) lastFocus.focus();
  }

  modal.querySelectorAll('[data-close]').forEach(function (el) {
    el.addEventListener('click', closeModal);
  });

  document.addEventListener('keydown', function (e) {
    if (modal.hidden) return;
    if (e.key === 'Escape') { closeModal(); return; }
    if (e.key !== 'Tab') return;

    // keep focus inside the dialog
    var f = modal.querySelectorAll('a[href], button:not([disabled])');
    f = Array.prototype.filter.call(f, function (el) {
      return el.getAttribute('aria-disabled') !== 'true' && el.offsetParent !== null;
    });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
})();
