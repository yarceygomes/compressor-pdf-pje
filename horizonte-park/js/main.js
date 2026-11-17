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

  /* ---------- pontos de interesse: filtros, lista, rotas ---------- */
  const POIS = (window.HP_POIS || []).slice().sort((a, b) => a.min - b.min);
  const CATS = window.HP_CATS || {};
  const poiLayers = {};
  let routeLayer = null, curCat = 'all';
  const list = $('#places'), filters = $('#poiFilters');
  const fmtKm = (k) => String(k).replace('.', ',');
  if (list && POIS.length) {
    filters.innerHTML = [['all', 'Tudo', '#0a1c14'], ...Object.entries(CATS).map(([k, [n, c]]) => [k, n, c])]
      .map(([k, n, c]) => `<button type="button" data-cat="${k}" style="--pc:${c}" class="${k === 'all' ? 'on' : ''}">${n}</button>`).join('');
    list.innerHTML = POIS.map((o) => `
      <li class="place" tabindex="0" data-id="${o.id}" data-cat="${o.c}" style="--pc:${(CATS[o.c] || ['', '#5b8ee6'])[1]}">
        <span class="place__t">${o.min}<small>min</small></span>
        <div><b>${o.n}</b><span>${(CATS[o.c] || [''])[0]} · ${fmtKm(o.km)} km</span></div>
        <span class="place__go"><svg viewBox="0 0 24 24"><path d="M7 17L17 7M9 7h8v8"/></svg></span>
      </li>`).join('');
    filters.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      curCat = b.dataset.cat;
      $$('button', filters).forEach((x) => x.classList.toggle('on', x === b));
      $$('.place', list).forEach((li) => (li.hidden = curCat !== 'all' && li.dataset.cat !== curCat));
      POIS.forEach((o) => {
        const m = poiLayers[o.id]; if (!m || !HP.map) return;
        const show = curCat === 'all' || o.c === curCat;
        if (show) m.addTo(HP.map); else HP.map.removeLayer(m);
      });
      if (HP.map) {
        const pts = POIS.filter((o) => curCat === 'all' || o.c === curCat).map((o) => [o.lat, o.lng]);
        pts.push([-2.4427328, -54.792275]);
        HP.map.flyToBounds(pts, { padding: [50, 50], duration: 1.4, maxZoom: 14 });
      }
    });
    $$('.place', list).forEach((li) => {
      li.addEventListener('click', () => selectPOI(li.dataset.id, true));
      li.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectPOI(li.dataset.id, true); } });
    });
  }
  function selectPOI(id, fromList) {
    const o = POIS.find((x) => x.id === id); if (!o) return;
    $$('.place', list).forEach((li) => li.classList.toggle('on', li.dataset.id === id));
    if (!fromList) $(`.place[data-id="${id}"]`, list)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    const map = HP.map; if (!map) return;
    if (routeLayer) map.removeLayer(routeLayer);
    const col = (CATS[o.c] || ['', '#9ad89a'])[1];
    routeLayer = L.layerGroup([
      L.polyline(o.g, { color: '#0a1c14', weight: 8, opacity: 0.35, lineCap: 'round' }),
      L.polyline(o.g, { color: col, weight: 4.5, opacity: 1, lineCap: 'round', className: 'route-anim' }),
    ]).addTo(map);
    map.flyToBounds(L.latLngBounds(o.g), { padding: [60, 60], duration: 1.4, maxZoom: 15 });
    setTimeout(() => poiLayers[id] && poiLayers[id].openPopup(), 1450);
  }
  HP.selectPOI = selectPOI;

  /* ---------- radar: tempo x direção ---------- */
  (function radar() {
    const svg = $('#radar'); if (!svg || !POIS.length) return;
    const NS = 'http://www.w3.org/2000/svg', cx = 300, cy = 300, R = 240, MAX = 15;
    const o0 = [-2.4427328, -54.792275];
    const el = (n, a, parent = svg) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); parent.appendChild(e); return e; };
    const rings = el('g', { class: 'rd-rings' });
    [5, 10, 15].forEach((m) => {
      el('circle', { cx, cy, r: (m / MAX) * R, class: 'rd-ring' }, rings);
      el('text', { x: cx + 6, y: cy - (m / MAX) * R - 6, class: 'rd-rt' }, rings).textContent = `${m} min`;
    });
    ['N', 'L', 'S', 'O'].forEach((t, i) => {
      const a = (i * Math.PI) / 2;
      el('text', { x: cx + Math.sin(a) * (R + 26), y: cy - Math.cos(a) * (R + 26) + 4, class: 'rd-card', 'text-anchor': 'middle' }, rings).textContent = t;
    });
    const showLabel = new Set(['jua', 'jua-lago', 'aeroporto', 'assai', 'alter']);
    const cluster = [];
    const dots = el('g', { class: 'rd-dots' });
    POIS.forEach((o) => {
      const dy = o.lat - o0[0], dx = (o.lng - o0[1]) * Math.cos((o0[0] * Math.PI) / 180);
      const ang = Math.atan2(dx, dy);
      const far = o.min > MAX;
      const r = far ? R + 4 : (o.min / MAX) * R;
      const x = cx + Math.sin(ang) * r, y = cy - Math.cos(ang) * r;
      const col = (CATS[o.c] || ['', '#9ad89a'])[1];
      const g = el('g', { class: 'rd-pt', tabindex: 0, role: 'button', 'aria-label': `${o.n}, ${o.min} minutos` }, dots);
      el('line', { x1: cx, y1: cy, x2: x, y2: y, class: 'rd-ray', stroke: col }, g);
      el('circle', { cx: x, cy: y, r: far ? 7 : 6, fill: col, class: 'rd-dot' }, g);
      el('title', {}, g).textContent = `${o.n} · ${o.min} min`;
      if (showLabel.has(o.id)) {
        const ov = { jua: { right: false, dy: -6 }, assai: { dy: 14 }, 'jua-lago': { right: false, dy: -4 } }[o.id] || {};
        const right = ov.right ?? Math.sin(ang) >= 0;
        el('text', { x: x + (right ? 11 : -11), y: y + 4 + (ov.dy || 0), 'text-anchor': right ? 'start' : 'end', class: 'rd-lb' }, g).textContent = `${o.n.split(' · ')[0]}${far ? ` · ${o.min} min` : ''}`;
      }
      if (o.min >= 9 && !far) cluster.push([x, y]);
      const go = () => { selectPOI(o.id, false); $('#map') && $('#map').scrollIntoView({ behavior: 'smooth', block: 'center' }); };
      g.addEventListener('click', go);
      g.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    });
    if (cluster.length) {
      const mxc = cluster.reduce((t, p) => t + p[0], 0) / cluster.length, myc = Math.max(...cluster.map((p) => p[1]));
      const tx = el('text', { x: Math.min(mxc + 30, 590), y: myc + 34, 'text-anchor': 'end', class: 'rd-lb rd-cl' });
      const t1 = el('tspan', { x: Math.min(mxc + 30, 590), dy: 0 }, tx); t1.textContent = 'Centro da cidade · 9–13 min';
      const t2 = el('tspan', { x: Math.min(mxc + 30, 590), dy: 17, class: 'rd-sub' }, tx); t2.textContent = 'shopping, UFOPA, UEPA, hospitais, orla';
    }
    el('circle', { cx, cy, r: 9, class: 'rd-home' });
    el('text', { x: cx, y: cy + 28, 'text-anchor': 'middle', class: 'rd-hl' }).textContent = 'Horizonte Park';
    $('#radarLegend').innerHTML = Object.entries(CATS).map(([k, [n, c]]) => {
      const items = POIS.filter((o) => o.c === k);
      return `<li style="--pc:${c}"><b>${n}</b><span>${items.length} ${items.length > 1 ? 'pontos' : 'ponto'} · a partir de ${Math.min(...items.map((o) => o.min))} min</span></li>`;
    }).join('');
    if (window.gsap && window.ScrollTrigger && !reduced) {
      gsap.from('.rd-ring', { scale: 0, transformOrigin: '300px 300px', duration: 1.4, ease: 'expo.out', stagger: 0.15, scrollTrigger: { trigger: svg, start: 'top 80%' } });
      gsap.from('.rd-pt', { opacity: 0, duration: 0.8, ease: 'power2.out', stagger: 0.04, delay: 0.3, scrollTrigger: { trigger: svg, start: 'top 80%' } });
    }
  })();

  /* ---------- "Um dia": arrastar para rolar ---------- */
  (function dayDrag() {
    const t = $('#dayTrack'); if (!t) return;
    let down = false, sx = 0, sl = 0;
    t.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') return; down = true; sx = e.clientX; sl = t.scrollLeft; t.classList.add('drag'); });
    addEventListener('pointermove', (e) => { if (!down) return; t.scrollLeft = sl - (e.clientX - sx); });
    addEventListener('pointerup', () => { down = false; t.classList.remove('drag'); });
  })();

  /* ---------- agendar visita -> WhatsApp ---------- */
  const visit = $('#visit');
  if (visit) visit.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(visit);
    const nome = String(f.get('nome') || '').trim();
    const msg = `Olá! Meu nome é ${nome}. Gostaria de agendar uma visita ao Horizonte Park (interesse: ${f.get('interesse')}; melhor período: ${f.get('periodo')}).`;
    window.open('https://wa.me/5593991472330?text=' + encodeURIComponent(msg), '_blank', 'noopener');
  });

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

      // pontos de interesse com rota real
      const C = window.HP_CATS || {};
      (window.HP_POIS || []).forEach((o) => {
        const col = (C[o.c] || ['', '#5b8ee6'])[1];
        const icon = L.divIcon({ className: '', html: `<div class="pin pin--poi" style="--pc:${col}"><i></i></div>`, iconSize: [22, 22], iconAnchor: [11, 11] });
        const m = L.marker([o.lat, o.lng], { icon, title: o.n }).addTo(map);
        m.bindTooltip(`${o.n} · ${o.min} min`, { direction: 'top', offset: [0, -10], className: 'hp-tip' });
        m.bindPopup(`<b>${o.n}</b><br><span class="pop-min">${o.min} min</span> de carro · ${String(o.km).replace('.', ',')} km<br><small>${o.d}</small>`);
        m.on('click', () => selectPOI(o.id, false));
        poiLayers[o.id] = m;
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
