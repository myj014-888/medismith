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

  /* ── scroll reveal ─────────────────────────────── */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
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

  cards.forEach(function (card) {
    var media = card.querySelector('.card__media');
    var initials = card.querySelector('.card__initials');

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
