/* ═══════════════════════════════════════════════════════════════
   SENEXPORT — ANIMATIONS.JS v4 (refactorisé)
   Sons · Splash · Transitions · Vol panier · Reveal · Menu mobile
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ─── CONFIG ─── */
  const CFG = {
    splashKey: 'se_sp_v4',
    splashDur: 3400,
    fadeDur:   260,
  };

  /* ─────────────────────────────────────────────────────────
     AUDIO — Web Audio API, activé au premier geste
  ───────────────────────────────────────────────────────── */
  let _ctx = null;
  let _ready = false;

  function ctx() {
    if (!_ctx) {
      try { _ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { return null; }
    }
    if (_ctx.state === 'suspended') _ctx.resume();
    return _ctx;
  }

  function tone(freq, dur = .08, vol = .04, type = 'sine', delay = 0) {
    const c = ctx();
    if (!c) return;
    try {
      const o = c.createOscillator(), g = c.createGain();
      o.connect(g); g.connect(c.destination);
      o.type = type;
      o.frequency.setValueAtTime(freq, c.currentTime + delay);
      g.gain.setValueAtTime(0, c.currentTime + delay);
      g.gain.linearRampToValueAtTime(vol, c.currentTime + delay + .012);
      g.gain.exponentialRampToValueAtTime(.0001, c.currentTime + delay + dur);
      o.start(c.currentTime + delay);
      o.stop(c.currentTime + delay + dur + .02);
    } catch (e) {}
  }

  const SOUNDS = {
    arrive:   () => { tone(261.6, .8, .025, 'sine', .4); tone(329.6, .7, .02, 'sine', .6); tone(392, .6, .018, 'sine', .8); tone(523.3, .5, .015, 'sine', 1); },
    trait:    () => { tone(880, .06, .018, 'sine'); tone(1108, .08, .015, 'sine', .05); tone(1318, .12, .012, 'sine', .1); },
    hover:    () => tone(900, .04, .02, 'sine'),
    click:    () => tone(440, .05, .02, 'sine'),
    atc:      () => { tone(523.3, .13, .05, 'sine'); tone(659.3, .11, .04, 'sine', .07); },
    order:    () => { tone(523.3, .18, .06, 'sine'); tone(659.3, .16, .05, 'sine', .14); tone(784, .16, .05, 'sine', .28); tone(1046.5, .3, .06, 'sine', .44); },
    confetti: () => { tone(659.3, .1, .045, 'sine'); tone(783.9, .1, .04, 'sine', .06); tone(1046.5, .15, .045, 'sine', .12); tone(1318.5, .2, .04, 'sine', .2); },
    mode:     () => { tone(392, .15, .03, 'sine'); tone(493.9, .2, .035, 'sine', .1); tone(587.3, .25, .04, 'sine', .2); tone(784, .3, .03, 'sine', .32); },
    /* ── Nouveaux sons spécifiques aux animations ── */
    rideau:   () => {
      /* Glissement sourd — deux tonalités descendantes */
      tone(220, .55, .035, 'sine', 0);
      tone(196, .45, .025, 'sine', .15);
      tone(174.6, .35, .02, 'sine', .3);
    },
    coffre:   () => {
      /* Ouverture — tonalité montante puis révélation */
      tone(130.8, .3, .04, 'sine', 0);
      tone(164.8, .25, .035, 'sine', .2);
      tone(261.6, .4, .045, 'sine', .45);
      tone(329.6, .35, .03, 'sine', .65);
    },
    reveal:   () => {
      /* Fondu doux au reveal des sections */
      tone(523.3, .2, .018, 'sine', 0);
      tone(659.3, .25, .015, 'sine', .1);
    },
    wish:     () => { tone(880, .12, .025, 'sine'); tone(1108, .1, .02, 'sine', .07); },
    unwish:   () => { tone(440, .08, .02, 'sine'); tone(329.6, .1, .015, 'sine', .06); },
  };

  function play(type) { if (_ready && SOUNDS[type]) SOUNDS[type](); }

  // Activer après premier geste
  ['click', 'touchstart'].forEach(ev =>
    document.addEventListener(ev, () => { _ready = true; ctx(); }, { once: true })
  );

  window.SE_Sound = { play };

  /* ─────────────────────────────────────────────────────────
     SPLASH — une fois par session
  ───────────────────────────────────────────────────────── */
  function initSplash() {
    const skip = ['patron', 'scan'].some(p => location.pathname.includes(p));
    if (skip || sessionStorage.getItem(CFG.splashKey)) return;
    sessionStorage.setItem(CFG.splashKey, '1');

    document.documentElement.style.overflow = 'hidden';

    const el = document.createElement('div');
    el.id = 'se-splash';
    el.innerHTML = `
      <canvas id="sp-canvas"></canvas>
      <div class="sp-center">
        <div class="sp-logo">Sen<span>·</span>Export</div>
        <div class="sp-sub">Boutique</div>
        <div class="sp-line"></div>
        <div class="sp-tag">Le monde dans votre panier.</div>
      </div>`;

    const css = document.createElement('style');
    css.textContent = `
      #se-splash{position:fixed;inset:0;z-index:99999;background:#08090E;
        display:flex;align-items:center;justify-content:center;
        transition:opacity .7s cubic-bezier(.16,1,.3,1)}
      #se-splash.out{opacity:0;pointer-events:none}
      #sp-canvas{position:absolute;inset:0;width:100%;height:100%}
      .sp-center{position:relative;z-index:1;text-align:center;
        animation:spIn .9s cubic-bezier(.16,1,.3,1) .1s both}
      @keyframes spIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
      .sp-logo{font-family:'Cormorant Garamond',Georgia,serif;
        font-size:clamp(3rem,12vw,6rem);font-weight:300;color:#FAFAF7;letter-spacing:-.01em}
      .sp-logo span{color:#D4AF37}
      .sp-sub{font-family:'DM Sans',sans-serif;font-size:clamp(.65rem,2vw,.85rem);
        font-weight:500;letter-spacing:.35em;text-transform:uppercase;
        color:rgba(212,175,55,.6);margin-top:.6rem;
        animation:spIn .9s cubic-bezier(.16,1,.3,1) .25s both}
      .sp-line{width:0;height:1px;background:linear-gradient(90deg,transparent,#D4AF37,transparent);
        margin:1.5rem auto;animation:spLine 1.3s cubic-bezier(.16,1,.3,1) .45s forwards}
      @keyframes spLine{from{width:0;opacity:.2}to{width:clamp(160px,35vw,260px);opacity:1}}
      .sp-tag{font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;
        font-size:clamp(.85rem,2.5vw,1.1rem);color:rgba(250,250,247,.28);
        letter-spacing:.04em;animation:spIn .9s cubic-bezier(.16,1,.3,1) .65s both}`;

    document.head.appendChild(css);
    document.body.prepend(el);
    runParticles(document.getElementById('sp-canvas'));

    setTimeout(() => play('arrive'), 300);
    setTimeout(() => play('trait'), 680);
    setTimeout(() => {
      el.classList.add('out');
      document.documentElement.style.overflow = '';
      setTimeout(() => { el.remove(); css.remove(); }, 750);
    }, CFG.splashDur);
  }

  function runParticles(canvas) {
    if (!canvas) return;
    const c = canvas.getContext('2d');
    const W = canvas.width = window.innerWidth;
    const H = canvas.height = window.innerHeight;
    const N = Math.min(55, Math.floor(W * H / 14000));
    const pts = Array.from({ length: N }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.4 + .25,
      vx: (Math.random() - .5) * .32, vy: -(Math.random() * .42 + .08),
      a: Math.random() * .4 + .05, phi: Math.random() * Math.PI * 2,
    }));
    let running = true;
    function frame() {
      if (!running) return;
      c.clearRect(0, 0, W, H);
      for (const p of pts) {
        p.phi += .019;
        const alpha = Math.max(0, Math.min(.5, p.a + Math.sin(p.phi) * .14));
        c.beginPath(); c.arc(p.x, p.y, p.r, 0, 6.283);
        c.fillStyle = `rgba(212,175,55,${alpha.toFixed(2)})`; c.fill();
        p.x += p.vx; p.y += p.vy;
        if (p.y < -5) { p.y = H + 4; p.x = Math.random() * W; }
        if (p.x < -4 || p.x > W + 4) { p.x = Math.random() * W; p.y = H + 4; }
      }
      requestAnimationFrame(frame);
    }
    frame();
    setTimeout(() => { running = false; }, CFG.splashDur + 900);
  }

  /* ─────────────────────────────────────────────────────────
     VOL PANIER — image qui vole vers l'icône panier
  ───────────────────────────────────────────────────────── */
  function flyToCart(imgEl) {
    const cartEl = document.querySelector('.nav-badge')?.closest('a')
                || document.querySelector('a[href*="panier"]');
    if (!cartEl || !imgEl) { play('atc'); return; }

    const ir = imgEl.getBoundingClientRect();
    const cr = cartEl.getBoundingClientRect();
    const clone = document.createElement('img');
    clone.src = imgEl.src || imgEl.querySelector?.('img')?.src || '';
    clone.style.cssText = `position:fixed;left:${ir.left}px;top:${ir.top}px;
      width:${ir.width}px;height:${ir.height}px;object-fit:cover;
      border-radius:6px;z-index:9998;pointer-events:none`;
    document.body.appendChild(clone);

    const dx = cr.left + cr.width / 2 - ir.left - ir.width / 2;
    const dy = cr.top + cr.height / 2 - ir.top - ir.height / 2;

    clone.animate([
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: `translate(${dx * .3}px,${Math.min(dy, -60)}px) scale(.65)`, opacity: .9, offset: .42 },
      { transform: `translate(${dx}px,${dy}px) scale(.1)`, opacity: 0 },
    ], { duration: 580, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' })
    .onfinish = () => {
      clone.remove();
      cartEl.animate([
        { transform: 'scale(1)' }, { transform: 'scale(1.4)' },
        { transform: 'scale(.9)' }, { transform: 'scale(1.1)' }, { transform: 'scale(1)' },
      ], { duration: 400, easing: 'cubic-bezier(.16,1,.3,1)' });
      play('atc');
      setTimeout(() => {
        const n = window.SE?.Cart?.count?.() ?? 0;
        document.querySelectorAll('.nav-badge').forEach(b => {
          b.textContent = n || '';
          b.classList.toggle('show', n > 0);
        });
      }, 60);
    };
  }

  function initCartFly() {
    document.addEventListener('click', e => {
      const btn = e.target.closest('.btn-primary[data-atc], .p-action, .art-btn-panier, [data-atc]');
      if (!btn) return;
      const card = btn.closest('.p-card, .pcard, .art-card, .c-card');
      if (!card) { play('atc'); return; }
      flyToCart(card.querySelector('img'));
    });
  }

  window.SE_Anim = { flyToCart, play };

  /* ─────────────────────────────────────────────────────────
     HEADER — opacité au scroll
  ───────────────────────────────────────────────────────── */
  function initHeader() {
    const nav = document.querySelector('.nav, #nav, header');
    if (!nav) return;
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          nav.classList.toggle('scrolled', window.scrollY > 10);
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  /* ─────────────────────────────────────────────────────────
     SON ENTRÉE MODE
  ───────────────────────────────────────────────────────── */
  function initModeSound() {
    if (!location.pathname.includes('mode')) return;
    setTimeout(() => play('mode'), 700);
  }

  /* ─────────────────────────────────────────────────────────
     SONS BOUTONS — hover
  ───────────────────────────────────────────────────────── */
  function initButtonSounds() {
    document.addEventListener('mouseover', e => {
      if (!_ready) return;
      if (e.target.closest('.btn-primary, .btn-or, .sec-col-btn--or')) play('hover');
    });
  }

  /* ─────────────────────────────────────────────────────────
     TRANSITIONS PAGES — fade out/in
  ───────────────────────────────────────────────────────── */
  function initTransitions() {
    document.addEventListener('click', e => {
      const link = e.target.closest('a[href]');
      if (!link) return;
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('http') ||
          href.startsWith('mailto') || href.startsWith('tel') ||
          href.startsWith('javascript') || link.target === '_blank' ||
          e.ctrlKey || e.metaKey || e.shiftKey) return;
      e.preventDefault();
      play('click');
      document.body.style.transition = `opacity ${CFG.fadeDur}ms ease`;
      document.body.style.opacity = '0';
      setTimeout(() => { window.location.href = href; }, CFG.fadeDur);
    });
  }

  /* ─────────────────────────────────────────────────────────
     REVEAL AU SCROLL — IntersectionObserver
  ───────────────────────────────────────────────────────── */
  function initReveal() {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('vis'); io.unobserve(e.target); }
      });
    }, { threshold: .08, rootMargin: '0px 0px -25px 0px' });

    function observe() {
      document.querySelectorAll('.reveal:not(.vis)').forEach(el => io.observe(el));
    }
    observe();
    window.addEventListener('content:loaded', observe);
    setTimeout(observe, 800);
    setTimeout(observe, 2000);
  }

  /* ─────────────────────────────────────────────────────────
     MENU MOBILE
  ───────────────────────────────────────────────────────── */
  function initMobile() {
    const burger   = document.querySelector('.burger');
    const menu     = document.querySelector('.mobile-menu');
    const backdrop = document.querySelector('.mobile-backdrop');
    if (!burger || !menu) return;
    const open  = () => { menu.classList.add('open'); backdrop?.classList.add('open'); document.body.style.overflow = 'hidden'; };
    const close = () => { menu.classList.remove('open'); backdrop?.classList.remove('open'); document.body.style.overflow = ''; };
    burger.addEventListener('click', open);
    menu.querySelector('.close-btn')?.addEventListener('click', close);
    backdrop?.addEventListener('click', close);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  }

  /* ─────────────────────────────────────────────────────────
     FADE IN PAGE
  ───────────────────────────────────────────────────────── */
  function fadeIn() {
    document.body.style.opacity = '0';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.body.style.transition = 'opacity .38s ease';
      document.body.style.opacity = '1';
    }));
  }

  /* ─────────────────────────────────────────────────────────
     INIT
  ───────────────────────────────────────────────────────── */
  function init() {
    initSplash();
    document.documentElement.style.visibility = '';
    fadeIn();
    initHeader();
    initCartFly();
    initButtonSounds();
    initTransitions();
    initReveal();
    initMobile();
    initModeSound();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();
