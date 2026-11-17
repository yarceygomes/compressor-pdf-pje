/* Horizonte Park — interações (scroll, reveals, galeria, mapa) */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = () => matchMedia('(max-width: 820px)').matches;
  const HP = (window.HP = { reduced, mp: { progress: 0, active: false } });

  const hasGSAP = !!window.gsap && !!window.ScrollTrigger;
  if (hasGSAP) gsap.registerPlugin(ScrollTrigger);

  /* ---------- smooth scroll (Lenis) ---------- */
  let lenis = null;
  if (!reduced && window.Lenis && hasGSAP) {
    lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1, smoothWheel: true });
    HP.lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const scrollToEl = (el) => {
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: 0, duration: 1.6 });
    else el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  };
  $$('a[href^="#"]').forEach((a) =>
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const el = $(id);
      if (!el) return;
      e.preventDefault();
      document.body.classList.remove('menu-open');
      $('#burger')?.setAttribute('aria-expanded', 'false');
      scrollToEl(el);
      history.replaceState(null, '', id);
    })
  );

  /* ---------- nav ---------- */
  const nav = $('#nav');
  const prog = $('.progress');
  let lastY = 0;
  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle('is-solid', y > 40);
    nav.classList.toggle('is-hidden', y > 600 && y > lastY && !document.body.classList.contains('menu-open'));
    lastY = y;
    const h = document.documentElement.scrollHeight - innerHeight;
    prog.style.transform = `scaleX(${h > 0 ? y / h : 0})`;
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  $('#burger').addEventListener('click', (e) => {
    const open = document.body.classList.toggle('menu-open');
    e.currentTarget.setAttribute('aria-expanded', String(open));
  });
  // seção ativa
  const links = $$('.nav__links a');
  const io = new IntersectionObserver(
    (ents) =>
      ents.forEach((en) => {
        if (en.isIntersecting) links.forEach((l) => l.classList.toggle('is-active', l.getAttribute('href') === '#' + en.target.id));
      }),
    { rootMargin: '-45% 0px -50% 0px' }
  );
  links.forEach((l) => { const s = $(l.getAttribute('href')); if (s) io.observe(s); });

  /* ---------- botões: brilho segue o mouse ---------- */
  $$('.btn').forEach((b) =>
    b.addEventListener('pointermove', (e) => {
      const r = b.getBoundingClientRect();
      b.style.setProperty('--mx', e.clientX - r.left + 'px');
      b.style.setProperty('--my', e.clientY - r.top + 'px');
    })
  );

  /* ---------- manifesto: palavra por palavra ---------- */
  const man = $('#manifesto');
  if (man) {
    const words = man.textContent.trim().split(/\s+/);
    man.innerHTML = words.map((w) => `<span class="w">${w}</span>`).join(' ');
  }

  /* ---------- contadores ---------- */
  const fmt = new Intl.NumberFormat('pt-BR');
  const countUp = (el) => {
    const end = +el.dataset.count;
    if (reduced || !hasGSAP) { el.textContent = fmt.format(end); return; }
    const o = { v: 0 };
    gsap.to(o, { v: end, duration: 2.2, ease: 'power3.out', onUpdate: () => (el.textContent = fmt.format(Math.round(o.v))) });
  };

  /* ---------- vídeo (carrega o YouTube só no clique) ---------- */
  $('#video button')?.addEventListener('click', function () {
    const f = document.createElement('iframe');
    f.src = 'https://www.youtube-nocookie.com/embed/_ch_U9Vber8?autoplay=1&rel=0&modestbranding=1&playsinline=1';
    f.title = 'Vídeo de apresentação do Horizonte Park';
    f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    f.allowFullscreen = true;
    this.replaceWith(f);
  });

  /* ---------- lightbox ---------- */
  const lb = $('#lb'), lbImg = $('img', lb), lbCap = $('.lb__cap', lb);
  let group = [], gi = 0, lastFocus = null;
  const show = (i) => {
    gi = (i + group.length) % group.length;
    const it = group[gi];
    lbImg.src = it.src; lbImg.alt = it.alt; lbCap.textContent = it.cap || it.alt;
  };
  const openLB = (items, i) => {
    group = items; lastFocus = document.activeElement; show(i);
    lb.classList.add('open'); lb.setAttribute('aria-hidden', 'false');
    lenis?.stop(); $('.lb__close', lb).focus();
  };
  const closeLB = () => {
    lb.classList.remove('open'); lb.setAttribute('aria-hidden', 'true'); lenis?.start(); lastFocus?.focus();
  };
  $('.lb__close', lb).onclick = closeLB;
  $('.lb__prev', lb).onclick = () => show(gi - 1);
  $('.lb__next', lb).onclick = () => show(gi + 1);
  lb.addEventListener('click', (e) => { if (e.target === lb) closeLB(); });
  addEventListener('keydown', (e) => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') closeLB();
    if (e.key === 'ArrowRight') show(gi + 1);
    if (e.key === 'ArrowLeft') show(gi - 1);
  });
  const gcards = $$('.gcard');
  const gItems = gcards.map((f) => ({ src: f.dataset.full, alt: $('img', f).alt, cap: $('figcaption b', f).textContent + ' · ' + $('figcaption span', f).textContent }));
  gcards.forEach((f, i) => {
    f.tabIndex = 0; f.setAttribute('role', 'button'); f.setAttribute('aria-label', 'Ampliar: ' + gItems[i].alt);
    f.addEventListener('click', () => openLB(gItems, i));
    f.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLB(gItems, i); } });
  });
  $$('[data-lb-group]').forEach((g) => {
    const btns = $$('button', g);
    const items = btns.map((b) => ({ src: b.dataset.full, alt: $('img', b).alt }));
    btns.forEach((b, i) => b.addEventListener('click', () => openLB(items, i)));
  });
  $('#gTot').textContent = String(gcards.length).padStart(2, '0');

  /* ---------- telefone 3D (tilt) ---------- */
  const phone = $('#phone img');
  if (phone && !reduced) {
    $('#phone').addEventListener('pointermove', (e) => {
      const r = phone.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      phone.style.transform = `rotateY(${x * 18}deg) rotateX(${-y * 14}deg) translateZ(20px)`;
    });
    $('#phone').addEventListener('pointerleave', () => (phone.style.transform = ''));
  }

  /* ---------- mapa (Leaflet) ---------- */
  initMap();

  /* ---------- animações GSAP ---------- */
  if (!hasGSAP) {
    $$('[data-count]').forEach(countUp);
    $$('[data-reveal]').forEach((el) => { el.style.opacity = 1; el.style.transform = 'none'; });
    return;
  }

  if (reduced) {
    $$('[data-count]').forEach(countUp);
    ScrollTrigger.create({ trigger: '#masterplan', start: 'top top', end: 'bottom bottom', onUpdate: (s) => (HP.mp.progress = s.progress) });
    HP.mp.progress = 0.62;
    return;
  }

  // Hero: entrada
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.from('.hero h1 .line>span', { yPercent: 110, duration: 1.6, stagger: 0.12 }, 0.2)
    .to('.hero__media img', { scale: 1.06, duration: 2.6, ease: 'power2.out' }, 0)
    .from('.hero__kicker,.hero__row>*,.hero__meta', { y: 30, opacity: 0, duration: 1.2, stagger: 0.08 }, 0.7)
    .from('.nav', { yPercent: -100, duration: 1.2 }, 0.5);
  // Hero: parallax ao rolar
  gsap.to('.hero__media img', { yPercent: 14, scale: 1.14, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero__in', { yPercent: -18, opacity: 0.2, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'center center', end: 'bottom top', scrub: true } });

  // Reveals genéricos
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 88%',
    onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out', stagger: 0.08, overwrite: true }),
  });

  // Manifesto
  gsap.to('#manifesto .w', {
    opacity: 1, stagger: 0.04, ease: 'none',
    scrollTrigger: { trigger: '#manifesto', start: 'top 75%', end: 'bottom 45%', scrub: true },
  });
  // Contadores
  $$('[data-count]').forEach((el) => ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: () => countUp(el) }));

  // Parallax em imagens
  $$('[data-parallax]').forEach((img) =>
    gsap.fromTo(img, { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } })
  );

  /* Masterplan 3D: seção fixada; o progresso é lido pelo módulo Three.js */
  const steps = $$('.mp__step');
  const rail = $$('#mpRail b');
  const N = steps.length;
  gsap.set(steps[0], { autoAlpha: 1 });
  let cur = 0;
  const setStep = (i) => {
    if (i === cur) return;
    const prev = steps[cur], next = steps[i], dir = i > cur ? 1 : -1;
    gsap.to(prev, { autoAlpha: 0, y: -30 * dir, duration: 0.5, ease: 'power2.in', overwrite: true });
    gsap.fromTo(next, { autoAlpha: 0, y: 40 * dir }, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'expo.out', delay: 0.15, overwrite: true });
    cur = i;
  };
  ScrollTrigger.create({
    trigger: '#masterplan',
    start: 'top top',
    end: () => '+=' + innerHeight * (isMobile() ? 4.2 : 5),
    pin: '#mpPin',
    scrub: true,
    onToggle: (s) => (HP.mp.active = s.isActive),
    onUpdate: (s) => {
      HP.mp.progress = s.progress;
      const f = s.progress * N;
      setStep(Math.min(N - 1, Math.floor(f)));
      rail.forEach((b, k) => (b.style.transform = `scaleX(${Math.max(0, Math.min(1, f - k))})`));
    },
  });

  /* Galeria horizontal */
  const mm = gsap.matchMedia();
  mm.add('(min-width: 821px)', () => {
    const track = $('#galleryTrack');
    const dist = () => track.scrollWidth - innerWidth;
    const tw = gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: {
        trigger: '#galleryPin', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true,
        onUpdate: (s) => ($('#gIdx').textContent = String(Math.min(gcards.length, 1 + Math.floor(s.progress * gcards.length))).padStart(2, '0')),
      },
    });
    gcards.forEach((c) => {
      const img = $('img', c);
      gsap.fromTo(img, { xPercent: -6 }, { xPercent: 6, ease: 'none', scrollTrigger: { trigger: c, containerAnimation: tw, start: 'left right', end: 'right left', scrub: true } });
    });
  });

  // Linha do tempo
  gsap.to('#tlBar', { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '#timeline', start: 'top 70%', end: 'bottom 70%', scrub: true } });
  $$('.mosaic').forEach((m) =>
    gsap.from($$('button', m), { opacity: 0, y: 40, scale: 0.96, duration: 1, ease: 'expo.out', stagger: 0.06, scrollTrigger: { trigger: m, start: 'top 85%' } })
  );
  $$('.compare figure').forEach((f, i) =>
    gsap.from(f, { clipPath: 'inset(0 100% 0 0)', duration: 1.4, ease: 'expo.inOut', delay: i * 0.2, scrollTrigger: { trigger: f, start: 'top 85%' } })
  );
  // Telefone flutua
  gsap.fromTo('#phone', { y: 80 }, { y: -60, ease: 'none', scrollTrigger: { trigger: '#tecnologia', start: 'top bottom', end: 'bottom top', scrub: true } });

  addEventListener('load', () => ScrollTrigger.refresh());

  /* ===================== MAPA ===================== */
  function initMap() {
    if (!window.L) return;
    const el = $('#map');
    const HPpos = [-2.4427328, -54.792275];
    let map = null;
    const build = () => {
      map = L.map(el, { zoomControl: true, scrollWheelZoom: false, attributionControl: true }).setView(HPpos, 13);
      HP.map = map;
      const sat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19, attribution: 'Imagens © Esri, Maxar, Earthstar Geographics',
      });
      const labels = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19, attribution: 'Rótulos © Esri',
      });
      const street = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19, attribution: 'Mapa © Esri, HERE, Garmin, © OpenStreetMap',
      });
      const satGroup = L.layerGroup([sat, labels]).addTo(map);
      $$('.map__switch button').forEach((b) =>
        b.addEventListener('click', () => {
          $$('.map__switch button').forEach((x) => x.classList.toggle('on', x === b));
          if (b.dataset.layer === 'sat') { map.removeLayer(street); satGroup.addTo(map); }
          else { map.removeLayer(satGroup); street.addTo(map); }
        })
      );
      // área aproximada (círculo equivalente a 819 mil m²: r ≈ 510 m)
      L.circle(HPpos, { radius: 510, color: '#9ad89a', weight: 2, dashArray: '6 6', fillColor: '#3fae49', fillOpacity: 0.15 })
        .addTo(map)
        .bindTooltip('Área equivalente a 819 mil m² (ilustrativa)', { sticky: true, className: 'hp-tip' });

      const mainIcon = L.divIcon({ className: '', html: '<div class="pin"><i></i></div>', iconSize: [22, 22], iconAnchor: [11, 11] });
      const poiIcon = L.divIcon({ className: '', html: '<div class="pin pin--poi"><i></i></div>', iconSize: [22, 22], iconAnchor: [11, 11] });
      const main = L.marker(HPpos, { icon: mainIcon, zIndexOffset: 1000, title: 'Horizonte Park' }).addTo(map);
      main.bindPopup('<b>Horizonte Park</b><br>Av. Eng. Fernando Guilhon · Santarém/PA<br><a href="https://www.google.com/maps/dir/?api=1&destination=-2.4427328,-54.792275" target="_blank" rel="noopener">Traçar rota →</a>');
      main.bindTooltip('Horizonte Park', { permanent: true, direction: 'top', offset: [0, -14], className: 'hp-tip' });

      const pois = [
        { n: 'Aeroporto Internacional Maestro Wilson Fonseca', p: [-2.4242, -54.7931], t: '≈ 4 min' },
        { n: 'Rio Tapajós Shopping', p: [-2.4466102, -54.757359], t: '≈ 6 min' },
        { n: 'Lago do Juá', p: [-2.4421895, -54.7857328], t: 'vizinhança' },
        { n: 'Centro de Santarém', p: [-2.4174311, -54.7153808], t: '≈ 15 min' },
        { n: 'Alter do Chão', p: [-2.516084, -54.949739], t: 'praias do Tapajós' },
      ];
      pois.forEach((o) => {
        L.marker(o.p, { icon: poiIcon, title: o.n }).addTo(map).bindPopup(`<b>${o.n}</b><br>${o.t} do Horizonte Park`);
        L.polyline([HPpos, o.p], { color: '#ffffff', weight: 1.5, opacity: 0.55, dashArray: '2 8' }).addTo(map);
      });

      $$('.place').forEach((li) => {
        const go = () => {
          $$('.place').forEach((x) => x.classList.toggle('on', x === li));
          map.flyTo([+li.dataset.lat, +li.dataset.lng], +li.dataset.z, { duration: 1.6 });
        };
        li.addEventListener('click', go);
        li.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
      });
      // habilita zoom pela roda apenas após clicar no mapa
      map.on('click', () => map.scrollWheelZoom.enable());
      map.on('mouseout', () => map.scrollWheelZoom.disable());
      setTimeout(() => map.flyTo(HPpos, 14, { duration: 2.2 }), 400);
    };
    const mio = new IntersectionObserver((e) => { if (e[0].isIntersecting && !map) { build(); mio.disconnect(); } }, { rootMargin: '300px' });
    mio.observe(el);
  }
})();
