/* ═══════════════════════════════════════════════════
   scroll-fx.js — scroll-linked animation engine.
   Zero dependencies, zero build step. Add data-scroll-fx="<effect>"
   to any element; the hero uses its own layered module below.

   Effects reverse as an element exits back out through the top of the
   viewport — a genuine appear → hold → disappear lifecycle, not a
   one-time reveal that then sticks forever.

     parallax      drifts vertically at a rate of its own. Continuous,
                   never settles. Rate in px via data-fx-rate.
     tilt3d        3D rotateX settle in and out.
     scale-in      0.86 → 1 with opacity, symmetric.
     clip-reveal   clip-path inset wipe, bottom to top.
     split-lines   direct child <span>s slide up with a stagger.
     blur-stagger  blur(10px) → 0 with opacity.
   ═══════════════════════════════════════════════════ */

(function () {
  // Parallax and scroll-linked motion can trigger genuine motion sickness for
  // people with vestibular disorders. This is an accessibility requirement,
  // not a preference — skip the engine entirely and let the plain CSS stand.
  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  var items = [];

  function smoothstep(t) { return t * t * (3 - 2 * t); }

  // Linear 0→1 as an element crosses the viewport. Parallax only — it should
  // keep drifting rather than settle once centred.
  function enterProgress(el) {
    var r = el.getBoundingClientRect();
    var vh = window.innerHeight || document.documentElement.clientHeight;
    return Math.max(0, Math.min(1, (vh - r.top) / (vh + r.height)));
  }

  // Symmetric 0 → 1 → 0: rises on entry, peaks near the viewport centre,
  // falls again on exit. This is what gives every reveal a real lifecycle.
  //
  // The catch: an element in the first or last screenful can never be brought
  // to the centre — there is no scroll left to give. Measured raw, the footer
  // mark rested forever at 50% opacity and 17 degrees of tilt. So the distance
  // is discounted by the closest the element could *possibly* get, which is
  // zero mid-page and grows smoothly as you run out of scroll.
  function lifecycleProgress(el) {
    var r = el.getBoundingClientRect();
    var doc = document.documentElement;
    var vh = window.innerHeight || doc.clientHeight;
    var span = (vh + r.height) / 2 || 1;

    var delta = (r.top + r.height / 2) - vh / 2;
    var scrolled = window.pageYOffset || doc.scrollTop || 0;
    var remaining = Math.max(0, (doc.scrollHeight - vh) - scrolled);

    var unreachable = delta > 0
      ? Math.max(0, delta - remaining)   // too far down to ever centre
      : Math.max(0, -delta - scrolled);  // too far up to ever centre
    var dist = Math.max(0, Math.abs(delta) - unreachable);

    return smoothstep(Math.max(0, Math.min(1, 1 - Math.min(1, dist / span))));
  }

  function applyOne(item) {
    var el = item.el, fx = item.fx;

    if (fx === 'parallax') {
      var rate = parseFloat(el.dataset.fxRate) || 44;
      el.style.transform = 'translateY(' + ((enterProgress(el) - 0.5) * -rate) + 'px)';
      return;
    }

    var eased = lifecycleProgress(el);

    switch (fx) {
      case 'tilt3d':
        el.style.transform = 'perspective(900px) rotateX(' + ((1 - eased) * 26) + 'deg)';
        el.style.opacity = String(0.25 + eased * 0.75);
        break;

      case 'scale-in':
        el.style.transform = 'scale(' + (0.9 + eased * 0.1) + ')';
        el.style.opacity = String(0.15 + eased * 0.85);
        break;

      case 'clip-reveal':
        el.style.clipPath = 'inset(0 0 ' + ((1 - eased) * 100) + '% 0)';
        break;

      case 'split-lines':
        var lines = el.querySelectorAll(':scope > span');
        Array.prototype.forEach.call(lines, function (line, i) {
          var delay = i * 0.16;
          var p = Math.max(0, Math.min(1, (eased - delay) / (1 - delay || 1)));
          line.style.transform = 'translateY(' + ((1 - p) * 60) + '%)';
          line.style.opacity = String(p);
        });
        break;

      case 'blur-stagger':
        el.style.filter = 'blur(' + ((1 - eased) * 10) + 'px)';
        el.style.opacity = String(eased);
        break;
    }
  }

  var needsUpdate = true;
  function flag() { needsUpdate = true; }

  // Scroll fires far more often than the display refreshes, so the handler
  // only raises a flag; the actual layout reads happen once per frame.
  function loop() {
    if (needsUpdate) { items.forEach(applyOne); needsUpdate = false; }
    requestAnimationFrame(loop);
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-scroll-fx]').forEach(function (el) {
      items.push({ el: el, fx: el.dataset.scrollFx });
      if (el.dataset.scrollFx === 'split-lines') {
        el.querySelectorAll(':scope > span').forEach(function (line) {
          line.style.display = 'inline-block';
          line.style.willChange = 'transform, opacity';
        });
      } else {
        el.style.willChange = 'transform, opacity, filter, clip-path';
      }
    });
    if (!items.length) return;
    window.addEventListener('scroll', flag, { passive: true });
    window.addEventListener('resize', flag, { passive: true });
    requestAnimationFrame(loop);
  });
})();


/* ═══════════════════════════════════════════════════
   Hero — layered parallax and exit.

   Three layers leave at different rates as the hero scrolls away: the
   aura drifts furthest, the watermark cross less, the lockup least. That
   difference in rate is the whole illusion of depth. On top of the drift
   the lockup fades, scales down and blurs, so the section departs rather
   than simply scrolling off.
   ═══════════════════════════════════════════════════ */

(function () {
  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  var hero, layers, inner, needsUpdate = true;

  function flag() { needsUpdate = true; }

  function apply() {
    var h = hero.offsetHeight || 1;
    // 0 at rest, 1 once the hero has fully scrolled away
    var p = Math.max(0, Math.min(1, (window.pageYOffset || document.documentElement.scrollTop) / h));

    layers.forEach(function (layer) {
      var rate = parseFloat(layer.dataset.heroRate) || 0;
      layer.style.transform = 'translate3d(0,' + (p * rate) + 'px,0)';
    });

    if (inner) {
      // fade out faster than the drift so the text is gone before the
      // black section arrives, rather than colliding with it
      inner.style.opacity = String(Math.max(0, 1 - p * 1.35));
      inner.style.filter = 'blur(' + (p * 6).toFixed(2) + 'px)';
    }
  }

  function loop() {
    if (needsUpdate) { apply(); needsUpdate = false; }
    requestAnimationFrame(loop);
  }

  document.addEventListener('DOMContentLoaded', function () {
    hero = document.querySelector('[data-hero]');
    if (!hero) return;
    layers = Array.prototype.slice.call(hero.querySelectorAll('[data-hero-layer]'));
    inner = hero.querySelector('.hero__inner');
    if (!layers.length) return;

    layers.forEach(function (l) { l.style.willChange = 'transform'; });
    if (inner) inner.style.willChange = 'transform, opacity, filter';

    window.addEventListener('scroll', flag, { passive: true });
    window.addEventListener('resize', flag, { passive: true });
    requestAnimationFrame(loop);
  });
})();
