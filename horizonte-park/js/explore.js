/* Horizonte Park — modo "Explorar o bairro" no masterplan 3D
   Zonas clicáveis → câmera voa até a zona, painel com ficha e, em "Ver imagens", visualizador imersivo com abas. */
(() => {
  const $ = (s) => document.querySelector(s);
  const HP = (window.HP = window.HP || {});
  HP.mp = HP.mp || { progress: 0 };

  const ZONES = [
    {
      id: 'portal', n: 'Portal de entrada', k: 'Acesso', pos: [0, 4.6, 44.5],
      cam: { t: [0, 0, 41], r: 30, pol: 1.02, az: 0.55 },
      stats: [['Rotatória', 'de acesso'], ['Totem', 'já instalado'], ['Avenida', 'duplicada']],
      d: 'A chegada pelo eixo da Fernando Guilhon, com rotatória ajardinada e o totem que já marca a entrada do bairro.',
      list: ['Rotatória de acesso', 'Totem de identidade', 'Paisagismo com palmeiras', 'Conexão direta com a avenida'],
      imgs: [['img/portal.webp', 'Portal · projeto'], ['img/obra-totem.webp', 'Totem · foto real'], ['img/obra-2026-1.webp', 'Acesso pavimentado · foto real']],
    },
    {
      id: 'boulevard', n: 'Boulevard e ciclofaixa', k: 'Mobilidade', pos: [0, 1.2, -6],
      cam: { t: [0, 0, -2], r: 34, pol: 1.12, az: -0.35 },
      stats: [['2', 'ciclofaixas'], ['Central', 'arborizado'], ['100%', 'pavimentado']],
      d: 'O eixo estruturador do bairro: duas pistas, canteiro central verde e ciclofaixa vermelha nos dois sentidos.',
      list: ['Ciclofaixa nos dois sentidos', 'Canteiro central arborizado', 'Calçadas acessíveis', 'Iluminação pública'],
      imgs: [['img/rua-ciclofaixa.webp', 'Boulevard com ciclofaixa'], ['img/rua-ipes.webp', 'Rua residencial'], ['img/aerea-avenida.webp', 'Boulevard visto do alto']],
    },
    {
      id: 'praca', n: 'Praça dos pergolados', k: 'Convivência', pos: [0, 3.4, 12.5],
      cam: { t: [0, 0, 12.5], r: 26, pol: 0.98, az: 0.9 },
      stats: [['5', 'pergolados'], ['Café', 'na praça'], ['Wi-Fi', 'público']],
      d: 'O coração do bairro: deck de madeira, pergolados em forma de copa, playground, café e Wi-Fi nas áreas comuns.',
      list: ['Pergolados de sombra', 'Playground', 'Café com varanda', 'Praça do Arco', 'Wi-Fi público'],
      imgs: [['img/hero.webp', 'Praça central · vista aérea'], ['img/pergolados.webp', 'Pergolados'], ['img/praca-arco.webp', 'Praça do Arco'], ['img/cafe.webp', 'Café na praça']],
    },
    {
      id: 'lago', n: 'Lago e parque', k: 'Natureza', pos: [19, 1.4, 13],
      cam: { t: [19, 0, 13], r: 28, pol: 1.0, az: 1.6 },
      stats: [['Lago', 'urbano'], ['Parque', 'linear'], ['24 h', 'monitorado']],
      d: 'Espelho d’água cercado de verde, com áreas de estar, brinquedos e caminhos para pedalar e caminhar.',
      list: ['Espelho d’água', 'Parque infantil', 'Caminhos de pedestres', 'Videomonitoramento'],
      imgs: [['img/lazer-piscina.webp', 'Área de lazer'], ['img/playground-aerea.webp', 'Parque infantil e ciclovia'], ['img/aerea-bairro.webp', 'Lago e bairro vistos do alto']],
    },
    {
      id: 'quadras', n: 'Quadras e esportes', k: 'Esporte', pos: [31, 2, 26],
      cam: { t: [31, 0, 26], r: 24, pol: 0.95, az: 1.15 },
      stats: [['2', 'quadras'], ['Pista', 'de caminhada'], ['Academia', 'ao ar livre']],
      d: 'Quadras cercadas, pista de caminhada e academia ao ar livre para o esporte de todo dia.',
      list: ['Quadras poliesportivas', 'Pista de caminhada', 'Academia ao ar livre'],
      imgs: [['img/quadras.webp', 'Quadras esportivas'], ['img/pista.webp', 'Pista de caminhada']],
    },
    {
      id: 'comercial', n: 'Centro comercial', k: 'Comércio', pos: [-20, 3.8, 43],
      cam: { t: [-18, 0, 42], r: 32, pol: 1.05, az: -0.5 },
      stats: [['Frente', 'para a avenida'], ['Vagas', 'para visitantes'], ['Recarga', 'de elétricos']],
      d: 'Lojas, mercado e conveniências voltados para a Fernando Guilhon, com estacionamento e pontos de recarga para veículos elétricos.',
      list: ['Lojas e mercado', 'Lotes comerciais', 'Vagas para visitantes', 'Recarga de veículos elétricos'],
      imgs: [['img/centro-comercial.webp', 'Centro comercial'], ['img/cafe.webp', 'Café'], ['img/aerea-praca.webp', 'Praça junto à avenida']],
    },
    {
      id: 'reserva', n: 'Reserva verde', k: 'Sustentabilidade', pos: [-25, 4.5, -6],
      cam: { t: [-25, 0, -6], r: 42, pol: 0.9, az: -0.9 },
      stats: [['Mata', 'preservada'], ['Sombra', 'e clima'], ['Fauna', 'local']],
      d: 'Manchas de mata mantidas dentro do desenho urbano, para mais sombra, clima ameno e convivência com a natureza.',
      list: ['Bosques internos', 'Arborização viária', 'Integração com o parque'],
      imgs: [['img/aerea-avenida.webp', 'Reserva junto ao boulevard'], ['img/masterplan-rio.webp', 'Masterplan com o Tapajós ao fundo'], ['img/aerea-vertical.webp', 'Quadras entre a mata']],
    },
    {
      id: 'lotes', n: 'Lotes residenciais', k: 'Seu lote', pos: [22, 1.4, -18],
      cam: { t: [22, 0, -16], r: 30, pol: 0.85, az: 0.3 },
      stats: [['988', 'lotes · 1ª etapa'], ['242 m²', 'área mínima'], ['R$ 797', 'parcelas a partir de']],
      d: 'Quadras ordenadas com lotes a partir de 242 m², para a casa da família ou para investir na região que mais cresce em Santarém.',
      list: ['Lotes residenciais e comerciais', 'Ruas pavimentadas', 'Rede de água', 'Iluminação e Wi-Fi público'],
      imgs: [['img/rua-ipes.webp', 'Rua residencial'], ['img/aerea-bairro.webp', 'Quadras vistas do alto'], ['img/aerea-vertical.webp', 'Bairro entre a mata']],
      badge: 'Condições sob consulta',
    },
  ];
  HP.ZONES = ZONES;

  const panel = $('#zone'), mpPin = $('#mpPin');
  if (!panel || !mpPin) return;
  const state = { on: false, zone: -1 };
  HP.explore = state;

  const lockScroll = (lock) => {
    if (HP.lenis) lock ? HP.lenis.stop() : HP.lenis.start();
    document.documentElement.style.overflow = lock ? 'hidden' : '';
  };

  function enter() {
    if (state.on) return;
    state.on = true; state.zone = -1;
    mpPin.classList.add('is-exploring');
    document.body.classList.add('exploring');
    lockScroll(true);
    HP.mp.explore = true;
    HP.mp.focus = null;
  }
  function exit() {
    state.on = false; state.zone = -1;
    mpPin.classList.remove('is-exploring', 'has-zone');
    document.body.classList.remove('exploring');
    panel.setAttribute('aria-hidden', 'true');
    HP.mp.explore = false; HP.mp.focus = null;
    lockScroll(false);
    $('#mpExplore')?.focus();
  }
  function select(i) {
    if (!state.on) enter();
    i = (i + ZONES.length) % ZONES.length;
    const z = ZONES[i];
    state.zone = i;
    HP.mp.focus = z.cam;
    mpPin.classList.add('has-zone');
    panel.setAttribute('aria-hidden', 'false');
    $('#zEyebrow').textContent = `Zona ${String(i + 1).padStart(2, '0')} · ${z.k}`;
    $('#zBadge').textContent = z.badge || 'No masterplan';
    $('#zTitle').textContent = z.n;
    $('#zStats').innerHTML = z.stats.map(([a, b]) => `<div><b>${a}</b><span>${b}</span></div>`).join('');
    $('#zDesc').textContent = z.d;
    $('#zList').innerHTML = z.list.map((t) => `<li>${t}</li>`).join('');
    $('#zCount').textContent = `${i + 1} / ${ZONES.length}`;
    document.querySelectorAll('.mp__hot').forEach((h, k) => h.classList.toggle('sel', k === i));
    if (window.gsap && !HP.reduced) gsap.fromTo(panel.children, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.04, ease: 'expo.out', overwrite: true });
  }
  function overview() {
    state.zone = -1; HP.mp.focus = null;
    mpPin.classList.remove('has-zone');
    panel.setAttribute('aria-hidden', 'true');
    document.querySelectorAll('.mp__hot').forEach((h) => h.classList.remove('sel'));
  }
  HP.exploreApi = { enter, exit, select, overview };

  // Hotspots (posicionados pelo módulo 3D a cada quadro)
  const hots = $('#mpHots');
  ZONES.forEach((z, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mp__hot';
    b.innerHTML = `<span class="mp__hot-n">${i + 1}</span><span class="mp__hot-l">${z.n}</span>`;
    b.setAttribute('aria-label', `Zona ${i + 1}: ${z.n}`);
    b.addEventListener('click', () => select(i));
    hots.appendChild(b);
  });

  $('#mpExplore').addEventListener('click', enter);
  $('#mpExit').addEventListener('click', exit);
  $('#zBack').addEventListener('click', overview);
  $('#zPrev').addEventListener('click', () => select(state.zone - 1));
  $('#zNext').addEventListener('click', () => select(state.zone + 1));
  $('#zPhotos').addEventListener('click', () => openImm(state.zone));
  addEventListener('keydown', (e) => {
    if (!state.on || imm.classList.contains('open')) return;
    if (e.key === 'Escape') state.zone >= 0 ? overview() : exit();
    if (e.key === 'ArrowRight') select(state.zone + 1);
    if (e.key === 'ArrowLeft') select(state.zone - 1);
  });

  /* ---------- visualizador imersivo ---------- */
  const imm = $('#imm'), stage = $('#immStage'), tabs = $('#immTabs');
  let cur = 0, imgs = [], lastFocus = null;
  function show(k) {
    cur = (k + imgs.length) % imgs.length;
    const [src, cap] = imgs[cur];
    const layer = document.createElement('div');
    layer.className = 'imm__layer';
    layer.innerHTML = `<img src="${src}" alt="${cap}">`;
    stage.appendChild(layer);
    requestAnimationFrame(() => layer.classList.add('in'));
    [...stage.children].slice(0, -2).forEach((n) => n.remove());
    $('#immTitle').textContent = cap;
    [...tabs.children].forEach((t, j) => { t.classList.toggle('on', j === cur); t.setAttribute('aria-selected', String(j === cur)); });
  }
  function openImm(i) {
    if (i < 0) return;
    const z = ZONES[i];
    imgs = z.imgs; lastFocus = document.activeElement;
    $('#immEyebrow').textContent = `${z.k} · ${z.n}`;
    tabs.innerHTML = imgs.map(([, cap], j) => `<button type="button" role="tab">${String(j + 1).padStart(2, '0')} · ${cap}</button>`).join('');
    [...tabs.children].forEach((t, j) => t.addEventListener('click', () => show(j)));
    stage.innerHTML = '';
    imm.classList.add('open'); imm.setAttribute('aria-hidden', 'false');
    show(0);
    $('#immClose').focus();
  }
  function closeImm() {
    imm.classList.remove('open'); imm.setAttribute('aria-hidden', 'true');
    setTimeout(() => (stage.innerHTML = ''), 500);
    lastFocus?.focus();
  }
  $('#immClose').addEventListener('click', closeImm);
  addEventListener('keydown', (e) => {
    if (!imm.classList.contains('open')) return;
    if (e.key === 'Escape') closeImm();
    if (e.key === 'ArrowRight') show(cur + 1);
    if (e.key === 'ArrowLeft') show(cur - 1);
  });
  let sx = 0;
  imm.addEventListener('pointerdown', (e) => (sx = e.clientX));
  imm.addEventListener('pointerup', (e) => { const dx = e.clientX - sx; if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1)); });
})();
