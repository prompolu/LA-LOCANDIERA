(() => {
  document.documentElement.classList.remove('no-js');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- header state ---------- */
  const header = $('.header');
  const onScroll = () => header.classList.toggle('scrolled', scrollY > 30);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- fullscreen menu (reveal starts from the button) ---------- */
  const btn = $('.menu-btn');
  const overlay = $('#overlay');
  const links = $$('a', overlay);
  let lastFocus = null;

  const setOrigin = () => {
    const r = btn.getBoundingClientRect();
    overlay.style.setProperty('--ox', `${r.left + r.width / 2}px`);
    overlay.style.setProperty('--oy', `${r.top + r.height / 2}px`);
  };
  const open = () => {
    lastFocus = document.activeElement;
    setOrigin();
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    btn.setAttribute('aria-expanded', 'true');
    btn.setAttribute('aria-label', 'Fermer le menu');
    document.body.classList.add('locked');
    setTimeout(() => links[0]?.focus({ preventScroll: true }), 250);
  };
  const close = (restore = true) => {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Ouvrir le menu');
    document.body.classList.remove('locked');
    if (restore) (lastFocus || btn).focus({ preventScroll: true });
  };
  btn.addEventListener('click', () => (overlay.classList.contains('open') ? close() : open()));
  links.forEach(a => a.addEventListener('click', () => close(false)));
  document.addEventListener('keydown', e => {
    if (!overlay.classList.contains('open')) return;
    if (e.key === 'Escape') return close();
    if (e.key !== 'Tab') return;
    // keep focus inside the menu + its toggle
    const f = [btn, ...links];
    const i = f.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
  });

  /* ---------- scroll reveals ---------- */
  const reveals = $$('.reveal');
  if (reduce || !('IntersectionObserver' in window)) {
    reveals.forEach(el => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(el => {
      const sibs = [...el.parentElement.children].filter(c => c.classList.contains('reveal'));
      el.style.transitionDelay = `${Math.min(sibs.indexOf(el), 4) * 80}ms`;
      io.observe(el);
    });
  }

  /* ---------- signature card tilt (fine pointers only) ---------- */
  if (!reduce && matchMedia('(hover:hover) and (pointer:fine)').matches) {
    $$('.dish').forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        card.style.setProperty('--ry', `${x * 5}deg`);
        card.style.setProperty('--rx', `${-y * 5}deg`);
      });
      card.addEventListener('pointerleave', () => {
        card.style.setProperty('--ry', '0deg');
        card.style.setProperty('--rx', '0deg');
      });
    });
  }

  /* ---------- wood-fire embers in the hero ---------- */
  const canvas = $('.embers');
  if (canvas && !reduce) {
    const ctx = canvas.getContext('2d');
    const hero = $('.hero');
    let w, h, dpr, parts = [], running = false, last = 0, raf;

    const spawn = (anywhere) => ({
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : h + 10,
      r: 0.6 + Math.random() * 1.8,
      vy: 18 + Math.random() * 38,          // px per second
      sway: 10 + Math.random() * 24,
      phase: Math.random() * Math.PI * 2,
      life: 0,
      max: 5 + Math.random() * 7,
      hue: 28 + Math.random() * 18
    });
    const resize = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(70, w / 22));
      parts = Array.from({ length: n }, () => spawn(true));
    };
    const tick = t => {
      const dt = Math.min((t - last) / 1000 || 0, 0.05);   // elapsed time, not frame count
      last = t;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        p.life += dt;
        p.y -= p.vy * dt;
        const x = p.x + Math.sin(p.phase + p.life * 1.3) * p.sway;
        const fade = Math.sin(Math.min(p.life / p.max, 1) * Math.PI);
        if (p.life > p.max || p.y < -20) { parts[i] = spawn(false); continue; }
        const g = ctx.createRadialGradient(x, p.y, 0, x, p.y, p.r * 5);
        g.addColorStop(0, `hsla(${p.hue},95%,68%,${0.85 * fade})`);
        g.addColorStop(1, `hsla(${p.hue},95%,50%,0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, p.y, p.r * 5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      raf = requestAnimationFrame(tick);
    };
    const start = () => { if (!running && !document.hidden) { running = true; last = performance.now(); raf = requestAnimationFrame(tick); } };
    const stop = () => { running = false; cancelAnimationFrame(raf); };

    resize();
    addEventListener('resize', resize);
    new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop())).observe(hero);
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  }

  /* ---------- desktop: phone links copy the number ---------- */
  // tel: links do nothing useful on most computers, so copy the number and say so
  const toast = $('.toast');
  let toastTimer;
  const notify = (before, num, after = '') => {
    const b = document.createElement('b');
    b.textContent = num;
    toast.replaceChildren(before, b, after);
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
  };
  if (matchMedia('(hover:hover) and (pointer:fine)').matches) {
    $$('a[href^="tel:"]').forEach(a => a.addEventListener('click', async e => {
      e.preventDefault();
      const num = a.getAttribute('href').replace('tel:+212', '0').replace(/(\d{2})(?=\d)/g, '$1 ');
      try {
        await navigator.clipboard.writeText(num);
        notify('Numéro copié : ', num, ' — appelez-nous pour commander');
      } catch {
        notify('Appelez-nous pour commander : ', num);
      }
    }));
  }

  /* ---------- footer year ---------- */
  $('#year').textContent = new Date().getFullYear();
})();
