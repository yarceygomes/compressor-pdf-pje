/* Horizonte Park — maquete 3D procedural (Three.js)
   Interpretação esquemática do masterplan: não é a planta aprovada.
   1 unidade = 10 m. Avenida Fernando Guilhon em z ≈ +50; boulevard central em x = 0. */
import * as THREE from 'three';

const canvas = document.getElementById('mpCanvas');
const HP = window.HP || { mp: { progress: 0 } };
const mobile = matchMedia('(max-width: 820px)').matches;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, powerPreference: 'high-performance' });
} catch (e) {
  document.documentElement.classList.add('no-webgl');
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = !mobile;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const DAY = new THREE.Color('#cfe2e0');
const NIGHT = new THREE.Color('#07121a');
scene.background = DAY.clone();
scene.fog = new THREE.Fog(DAY.clone(), 140, 330);

const camera = new THREE.PerspectiveCamera(mobile ? 50 : 38, 1, 0.5, 900);

/* ---------- utilidades ---------- */
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const rr = (a, b) => a + (b - a) * rnd();
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const inEllipse = (x, z, cx, cz, rx, rz) => ((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2 < 1;
const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3(), C = new THREE.Color();
const Y = new THREE.Vector3(0, 1, 0);

/* ---------- luzes ---------- */
const hemi = new THREE.HemisphereLight('#e8f6ff', '#3b5a34', 1.25);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff1d6', 2.4);
sun.position.set(-60, 90, 40);
sun.castShadow = !mobile;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 10, far: 260 });
sun.shadow.bias = -0.0004;
scene.add(sun);
const moon = new THREE.DirectionalLight('#8fb4ff', 0);
moon.position.set(50, 80, -40);
scene.add(moon);

/* ---------- zonas do masterplan ---------- */
const SITE = { x0: -46, x1: 46, z0: -46, z1: 36 };
const reserves = [
  { cx: -25, cz: -6, rx: 12, rz: 15 },
  { cx: 28, cz: -30, rx: 10, rz: 9 },
];
const lake = { cx: 19, cz: 13, rx: 6.5, rz: 4.2 };
const plaza = { x0: -11, x1: 11, z0: 6, z1: 19 };
const courts = { x0: 26, x1: 36, z0: 22, z1: 30 };
const excluded = (x, z, pad = 0) =>
  reserves.some((r) => inEllipse(x, z, r.cx, r.cz, r.rx + pad, r.rz + pad)) ||
  inEllipse(x, z, lake.cx, lake.cz, lake.rx + 3.2, lake.rz + 3.2) ||
  (x > plaza.x0 && x < plaza.x1 && z > plaza.z0 && z < plaza.z1) ||
  (x > courts.x0 && x < courts.x1 && z > courts.z0 && z < courts.z1);

/* ---------- terreno ---------- */
const groundMat = new THREE.MeshStandardMaterial({ color: '#36592f', roughness: 1 });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// rio Tapajós ao fundo (norte)
const riverMat = new THREE.MeshStandardMaterial({ color: '#3d78a8', roughness: 0.15, metalness: 0.35 });
const river = new THREE.Mesh(new THREE.PlaneGeometry(1200, 400), riverMat);
river.rotation.x = -Math.PI / 2;
river.position.set(0, 0.02, -330);
scene.add(river);

// base urbanizada (piso das ruas) — revelada a partir do portal
const baseMat = new THREE.MeshStandardMaterial({ color: '#d9d3c4', roughness: 0.95, transparent: true, opacity: 0 });
const base = new THREE.Mesh(new THREE.PlaneGeometry(SITE.x1 - SITE.x0 + 2, SITE.z1 - SITE.z0 + 12), baseMat);
base.rotation.x = -Math.PI / 2;
base.position.set(0, 0.03, (SITE.z0 + SITE.z1 + 10) / 2);
base.receiveShadow = true;
scene.add(base);

// reservas verdes (manchas mais escuras)
const resMat = new THREE.MeshStandardMaterial({ color: '#2a4d27', roughness: 1, transparent: true, opacity: 0 });
reserves.forEach((r) => {
  const m = new THREE.Mesh(new THREE.CircleGeometry(1, 48), resMat);
  m.scale.set(r.rx + 0.6, r.rz + 0.6, 1);
  m.rotation.x = -Math.PI / 2;
  m.position.set(r.cx, 0.06, r.cz);
  m.receiveShadow = true;
  scene.add(m);
});

/* ---------- avenida Fernando Guilhon (duplicada) ---------- */
const asphalt = new THREE.MeshStandardMaterial({ color: '#3b403d', roughness: 0.9 });
const AVE_Z = 50;
[-2.6, 2.6].forEach((dz) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(700, 3.6), asphalt);
  m.rotation.x = -Math.PI / 2;
  m.position.set(0, 0.05, AVE_Z + dz);
  m.receiveShadow = true;
  scene.add(m);
});
const median = new THREE.Mesh(new THREE.PlaneGeometry(700, 1.4), new THREE.MeshStandardMaterial({ color: '#5f8d4c' }));
median.rotation.x = -Math.PI / 2;
median.position.set(0, 0.06, AVE_Z);
scene.add(median);
// faixas tracejadas
{
  const g = new THREE.PlaneGeometry(1.6, 0.12);
  const dashes = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ color: '#f1efe6' }), 180);
  let k = 0;
  for (let x = -340; x < 340 && k < 180; x += 7.6) {
    [-2.6, 2.6].forEach((dz) => {
      if (k >= 180) return;
      Q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
      M.compose(P.set(x, 0.07, AVE_Z + dz), Q, S.set(1, 1, 1));
      dashes.setMatrixAt(k++, M);
    });
  }
  dashes.count = k;
  scene.add(dashes);
}

/* ---------- boulevard central + ciclofaixa ---------- */
const boulevard = new THREE.Group();
scene.add(boulevard);
{
  const len = AVE_Z - 2 - SITE.z0;
  const mid = (AVE_Z - 2 + SITE.z0) / 2;
  const lanes = new THREE.Mesh(new THREE.PlaneGeometry(4.4, len), new THREE.MeshStandardMaterial({ color: '#8f8b82', roughness: 0.9 }));
  lanes.rotation.x = -Math.PI / 2;
  lanes.position.set(0, 0.07, mid);
  lanes.receiveShadow = true;
  boulevard.add(lanes);
  const green = new THREE.Mesh(new THREE.PlaneGeometry(1.2, len), new THREE.MeshStandardMaterial({ color: '#5f9a52' }));
  green.rotation.x = -Math.PI / 2;
  green.position.set(0, 0.08, mid);
  boulevard.add(green);
}
const bikeMat = new THREE.MeshStandardMaterial({ color: '#b8452d', roughness: 0.8, emissive: '#b8452d', emissiveIntensity: 0 });
const bikeLanes = [];
const addBike = (x, z, w, l) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, l), bikeMat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.09, z);
  m.scale.y = 0.0001;
  m.userData.full = 1;
  scene.add(m);
  bikeLanes.push(m);
};
addBike(2.6, (AVE_Z - 2 + SITE.z0) / 2, 0.55, AVE_Z - 2 - SITE.z0);
addBike(-2.6, (AVE_Z - 2 + SITE.z0) / 2, 0.55, AVE_Z - 2 - SITE.z0);

/* ---------- portal + rotatória + totem ---------- */
const portal = new THREE.Group();
{
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 0.25, 48), new THREE.MeshStandardMaterial({ color: '#c9c2b2' }));
  ring.position.y = 0.12;
  const grass = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 0.32, 48), new THREE.MeshStandardMaterial({ color: '#6aa356' }));
  grass.position.y = 0.16;
  const totem = new THREE.Mesh(new THREE.BoxGeometry(0.7, 4.2, 0.35), new THREE.MeshStandardMaterial({ color: '#5a2523', roughness: 0.6 }));
  totem.position.y = 2.3;
  totem.castShadow = true;
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.06, 24), new THREE.MeshStandardMaterial({ color: '#f4f1ea', emissive: '#ffffff', emissiveIntensity: 0 }));
  disc.rotation.x = Math.PI / 2;
  disc.position.set(0, 3.6, 0.2);
  portal.add(ring, grass, totem, disc);
  portal.userData.disc = disc;
  portal.position.set(0, 0, AVE_Z - 5.5);
}
scene.add(portal);

/* ---------- malha de quadras e lotes ---------- */
const LOT_W = 1.0, LOT_D = 2.4, PER_SIDE = 12, STREET = 1.3;
const BLOCK_W = PER_SIDE * LOT_W, BLOCK_D = LOT_D * 2;
const lots = [];
const streetsX = new Set(), streetsZ = new Set();
for (let side of [-1, 1]) {
  for (let bx = 0; bx < 3; bx++) {
    const xStart = side > 0 ? 3.6 + bx * (BLOCK_W + STREET) : -3.6 - (bx + 1) * BLOCK_W - bx * STREET;
    if (Math.abs(xStart) > 46) continue;
    for (let bz = 0; ; bz++) {
      const zTop = SITE.z1 - bz * (BLOCK_D + STREET);
      if (zTop - BLOCK_D < SITE.z0) break;
      streetsZ.add(+(zTop + STREET / 2).toFixed(2));
      for (let row = 0; row < 2; row++) {
        for (let i = 0; i < PER_SIDE; i++) {
          const x = xStart + LOT_W / 2 + i * LOT_W;
          const z = zTop - LOT_D / 2 - row * LOT_D;
          if (excluded(x, z)) continue;
          lots.push({ x, z, row, d: Math.hypot(x, z - (AVE_Z - 5.5)) });
        }
      }
    }
    streetsX.add(+(side > 0 ? xStart + BLOCK_W + STREET / 2 : xStart - STREET / 2).toFixed(2));
  }
}
lots.sort((a, b) => a.d - b.d);
const ETAPA1 = Math.min(988, lots.length);
lots.forEach((l, i) => (l.e1 = i < ETAPA1));
HP.mp.lotsTotal = lots.length;

const lotGeo = new THREE.BoxGeometry(LOT_W * 0.9, 0.08, LOT_D * 0.94);
const lotMat = new THREE.MeshStandardMaterial({ roughness: 0.95 });
const lotMesh = new THREE.InstancedMesh(lotGeo, lotMat, lots.length);
lotMesh.receiveShadow = true;
const cE1 = new THREE.Color('#9acd7f'), cE1c = new THREE.Color('#e5cf98'), cE2 = new THREE.Color('#6f9461');
lots.forEach((l, i) => {
  const commercial = l.e1 && l.z > 28;
  lotMesh.setColorAt(i, commercial ? cE1c : l.e1 ? cE1.clone().offsetHSL(0, 0, rr(-0.03, 0.03)) : cE2);
});
scene.add(lotMesh);

// casas (corpo + laje) — construídas progressivamente em parte dos lotes da etapa 1
const houseLots = lots.filter((l) => l.e1 && rnd() < 0.58).map((l) => ({ ...l, h: rr(0.45, 0.95), w: rr(0.62, 0.8), dd: rr(1.0, 1.45), delay: rnd() }));
const houseGeo = new THREE.BoxGeometry(1, 1, 1);
houseGeo.translate(0, 0.5, 0);
const houseMat = new THREE.MeshStandardMaterial({ color: '#f4f1ea', roughness: 0.7 });
const roofMat = new THREE.MeshStandardMaterial({ color: '#a9a49a', roughness: 0.8 });
const winMat = new THREE.MeshStandardMaterial({ color: '#2b3a40', emissive: '#ffcf7a', emissiveIntensity: 0, roughness: 0.4 });
const houses = new THREE.InstancedMesh(houseGeo, houseMat, houseLots.length);
const roofs = new THREE.InstancedMesh(houseGeo, roofMat, houseLots.length);
const wins = new THREE.InstancedMesh(houseGeo, winMat, houseLots.length);
houses.castShadow = houses.receiveShadow = true;
roofs.castShadow = true;
houseLots.forEach((h, i) => {
  h.zf = h.z + (h.row === 0 ? -0.35 : 0.35); // recuo frontal
  houses.setColorAt(i, C.set('#f4f1ea').offsetHSL(0, 0, rr(-0.06, 0.02)));
});
scene.add(houses, roofs, wins);
const setHouses = (t) => {
  houseLots.forEach((h, i) => {
    const k = smooth(h.delay * 0.7, h.delay * 0.7 + 0.3, t);
    const sy = Math.max(0.0001, h.h * k);
    const sx = k > 0.01 ? 1 : 0.0001;
    M.compose(P.set(h.x, 0.08, h.zf), Q.identity(), S.set(h.w * sx, sy, h.dd * sx));
    houses.setMatrixAt(i, M);
    M.compose(P.set(h.x, 0.08 + sy, h.zf), Q, S.set((h.w + 0.12) * sx, k > 0.02 ? 0.08 : 0.0001, (h.dd + 0.12) * sx));
    roofs.setMatrixAt(i, M);
    M.compose(P.set(h.x, 0.08 + sy * 0.35, h.zf + (h.row === 0 ? h.dd / 2 : -h.dd / 2)), Q, S.set(h.w * 0.6 * sx, Math.max(0.0001, sy * 0.4), 0.04 * sx));
    wins.setMatrixAt(i, M);
  });
  houses.instanceMatrix.needsUpdate = roofs.instanceMatrix.needsUpdate = wins.instanceMatrix.needsUpdate = true;
};
const setLots = (t) => {
  lots.forEach((l, i) => {
    const local = smooth(l.d / 110, l.d / 110 + 0.25, t);
    const s = Math.max(0.0001, local);
    const sxz = s > 0.01 ? 0.35 + 0.65 * Math.min(1, s * 1.6) : 0.0001;
    M.compose(P.set(l.x, 0.04 + 0.04 * s, l.z), Q.identity(), S.set(sxz, s, sxz));
    lotMesh.setMatrixAt(i, M);
  });
  lotMesh.instanceMatrix.needsUpdate = true;
};

/* ---------- centro comercial ---------- */
const commerce = new THREE.Group();
{
  const mat = new THREE.MeshStandardMaterial({ color: '#f2efe8', roughness: 0.6 });
  const glass = new THREE.MeshStandardMaterial({ color: '#2d4652', emissive: '#ffd89a', emissiveIntensity: 0, roughness: 0.2, metalness: 0.4 });
  const defs = [
    [-12, 1.6, 9, 4.5], [-26, 2.4, 8, 4.5], [-38, 1.4, 6, 4.5], [12, 1.8, 9, 4.5], [25, 3.2, 7, 4.5], [37, 1.6, 7, 4.5],
  ];
  defs.forEach(([x, h, w, d]) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    b.position.set(x, h / 2, AVE_Z - 7);
    b.castShadow = b.receiveShadow = true;
    const g = new THREE.Mesh(new THREE.BoxGeometry(w * 0.86, h * 0.45, 0.06), glass);
    g.position.set(x, h * 0.32, AVE_Z - 7 + d / 2 + 0.03);
    commerce.add(b, g);
  });
  commerce.userData.glass = glass;
  // estacionamento + pontos de recarga
  const lot = new THREE.Mesh(new THREE.PlaneGeometry(14, 3), new THREE.MeshStandardMaterial({ color: '#6b6f6a' }));
  lot.rotation.x = -Math.PI / 2;
  lot.position.set(18, 0.08, AVE_Z - 3.2);
  commerce.add(lot);
}
scene.add(commerce);
const evMat = new THREE.MeshStandardMaterial({ color: '#1f4fa3', emissive: '#4fd1ff', emissiveIntensity: 0 });
for (let i = 0; i < 4; i++) {
  const ev = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.7, 0.25), evMat);
  ev.position.set(12.5 + i * 3.6, 0.35, AVE_Z - 4.5);
  scene.add(ev);
}

/* ---------- lago ---------- */
const lakeMat = new THREE.MeshStandardMaterial({ color: '#3a86bf', roughness: 0.08, metalness: 0.35, transparent: true, opacity: 0 });
const lakeMesh = new THREE.Mesh(new THREE.CircleGeometry(1, 64), lakeMat);
lakeMesh.scale.set(lake.rx, lake.rz, 1);
lakeMesh.rotation.x = -Math.PI / 2;
lakeMesh.position.set(lake.cx, 0.1, lake.cz);
scene.add(lakeMesh);
const lakeEdge = new THREE.Mesh(new THREE.RingGeometry(1, 1.08, 64), new THREE.MeshStandardMaterial({ color: '#efe6d4', transparent: true, opacity: 0 }));
lakeEdge.scale.set(lake.rx, lake.rz, 1);
lakeEdge.rotation.x = -Math.PI / 2;
lakeEdge.position.set(lake.cx, 0.11, lake.cz);
scene.add(lakeEdge);

/* ---------- praça central: pergolados, playground, quadras ---------- */
const leisure = new THREE.Group();
{
  const deck = new THREE.Mesh(new THREE.PlaneGeometry(plaza.x1 - plaza.x0, plaza.z1 - plaza.z0), new THREE.MeshStandardMaterial({ color: '#e9e1cf' }));
  deck.rotation.x = -Math.PI / 2;
  deck.position.set(0, 0.09, (plaza.z0 + plaza.z1) / 2);
  deck.receiveShadow = true;
  leisure.add(deck);
  const wood = new THREE.MeshStandardMaterial({ color: '#a8643a', roughness: 0.7 });
  const top = new THREE.MeshStandardMaterial({ color: '#e7d7c2', roughness: 0.6 });
  [[-5, 10, 1.9], [-1.5, 15, 2.4], [3.5, 9.5, 1.7], [6.5, 15.5, 2.1], [-7.5, 16, 1.5]].forEach(([x, z, r]) => {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.35, 2.2, 10), wood);
    stem.position.set(x, 1.1, z);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.92, 0.22, 40), top);
    cap.position.set(x, 2.3, z);
    stem.castShadow = cap.castShadow = true;
    leisure.add(stem, cap);
  });
  // playground
  const cols = ['#e94b3c', '#f6c33c', '#3fae49', '#2b77d6'];
  for (let i = 0; i < 7; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(rr(0.4, 0.8), rr(0.4, 1.3), rr(0.4, 0.8)), new THREE.MeshStandardMaterial({ color: cols[i % 4] }));
    b.position.set(rr(6, 9.5), 0.4, rr(7.5, 11));
    b.castShadow = true;
    leisure.add(b);
  }
  // quadras
  const courtMat = [new THREE.MeshStandardMaterial({ color: '#2f6fb8' }), new THREE.MeshStandardMaterial({ color: '#3d8f5a' })];
  [[28.5, 26], [33.5, 26]].forEach(([x, z], i) => {
    const c = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 7), courtMat[i]);
    c.rotation.x = -Math.PI / 2;
    c.position.set(x, 0.1, z);
    c.receiveShadow = true;
    const line = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.08), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
    line.rotation.x = -Math.PI / 2;
    line.position.set(x, 0.11, z);
    leisure.add(c, line);
  });
  const fence = new THREE.Mesh(new THREE.BoxGeometry(10, 1.2, 8), new THREE.MeshStandardMaterial({ color: '#cfe0ea', transparent: true, opacity: 0.18, depthWrite: false }));
  fence.position.set(31, 0.6, 26);
  leisure.add(fence);
}
leisure.scale.y = 0.0001;
scene.add(leisure);

/* ---------- árvores ---------- */
const treeGeo = new THREE.IcosahedronGeometry(1, 0);
const treeMat = new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true });
const trees = [];
// floresta ao redor do terreno
for (let i = 0; i < (mobile ? 3600 : 7000); i++) {
  const x = rr(-190, 190), z = rr(-200, 120);
  if (x > SITE.x0 - 2 && x < SITE.x1 + 2 && z > SITE.z0 - 2 && z < AVE_Z + 5) continue;
  if (Math.abs(z - AVE_Z) < 6) continue;
  if (z > AVE_Z + 6 && rnd() < 0.55) continue; // outro lado da avenida, mais aberto
  trees.push({ x, z, s: rr(0.9, 1.9), inner: false });
}
// reservas internas
reserves.forEach((r) => {
  for (let i = 0; i < r.rx * r.rz * 3; i++) {
    const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd());
    trees.push({ x: r.cx + Math.cos(a) * r.rx * d, z: r.cz + Math.sin(a) * r.rz * d, s: rr(0.8, 1.5), inner: true });
  }
});
// arborização do boulevard e das ruas
for (let z = SITE.z0 + 1; z < AVE_Z - 9; z += 2.4) {
  trees.push({ x: -1.6, z, s: 0.6, inner: true, street: true });
  trees.push({ x: 1.6, z: z + 1.2, s: 0.6, inner: true, street: true });
}
streetsZ.forEach((z) => {
  for (let x = SITE.x0 + 2; x < SITE.x1 - 2; x += 4.5) if (!excluded(x, z, 1) && Math.abs(x) > 3.5 && rnd() < 0.7) trees.push({ x, z: z + 0.45, s: 0.5, inner: true, street: true });
});
// entorno do lago e da praça
for (let i = 0; i < 40; i++) {
  const a = rnd() * Math.PI * 2;
  trees.push({ x: lake.cx + Math.cos(a) * (lake.rx + rr(1, 2.6)), z: lake.cz + Math.sin(a) * (lake.rz + rr(1, 2.6)), s: rr(0.5, 0.9), inner: true });
}
for (let i = 0; i < 18; i++) trees.push({ x: rr(plaza.x0 + 1, plaza.x1 - 1), z: rr(plaza.z0 + 0.5, plaza.z0 + 2.5) + (rnd() < 0.5 ? 0 : plaza.z1 - plaza.z0 - 3), s: rr(0.5, 0.8), inner: true });
// canteiro da avenida
for (let x = -300; x < 300; x += 6) trees.push({ x: x + rr(-1, 1), z: AVE_Z, s: 0.55, inner: false, palm: true });

const treeMesh = new THREE.InstancedMesh(treeGeo, treeMat, trees.length);
treeMesh.castShadow = !mobile;
treeMesh.receiveShadow = true;
const greens = ['#2f6b34', '#3c7d3b', '#4a8c41', '#2a5e30', '#5a9a4a', '#3b7445'];
trees.forEach((t, i) => {
  t.c = C.set(greens[(i * 7) % greens.length]).offsetHSL(rr(-0.02, 0.02), 0, rr(-0.04, 0.04)).clone();
  t.ry = rnd() * Math.PI;
  t.sy = rr(0.8, 1.25);
  treeMesh.setColorAt(i, t.c);
});
scene.add(treeMesh);
const setTrees = (t) => {
  trees.forEach((tr, i) => {
    const k = tr.inner ? smooth(0, 1, t * 1.4 - (tr.street ? 0.35 : 0)) : 1;
    const s = Math.max(0.0001, tr.s * k);
    Q.setFromAxisAngle(Y, tr.ry);
    M.compose(P.set(tr.x, s * tr.sy * 0.85, tr.z), Q, S.set(s, s * tr.sy, s));
    treeMesh.setMatrixAt(i, M);
  });
  treeMesh.instanceMatrix.needsUpdate = true;
};
setTrees(0);

/* ---------- linhas da malha (desenho progressivo) ---------- */
const linePts = [];
streetsZ.forEach((z) => linePts.push([SITE.x0, z, SITE.x1, z]));
streetsX.forEach((x) => linePts.push([x, SITE.z0, x, SITE.z1 + 1.5]));
linePts.push([0, SITE.z0, 0, AVE_Z - 3]);
const lineGeo = new THREE.BufferGeometry();
{
  const arr = new Float32Array(linePts.length * 6);
  linePts.forEach(([x0, z0, x1, z1], i) => arr.set([x0, 0.2, z0, x1, 0.2, z1], i * 6));
  lineGeo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
}
const lineMat = new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0 });
const grid = new THREE.LineSegments(lineGeo, lineMat);
scene.add(grid);

/* ---------- postes de luz e brilho noturno ---------- */
const lamps = [];
streetsZ.forEach((z) => { for (let x = SITE.x0 + 1; x < SITE.x1; x += 5) if (!excluded(x, z, 0.5)) lamps.push([x, z - 0.6]); });
for (let z = SITE.z0 + 1; z < AVE_Z - 3; z += 4) { lamps.push([-2.3, z]); lamps.push([2.3, z + 2]); }
for (let x = -150; x < 150; x += 5) { lamps.push([x, AVE_Z - 0.4]); }
const poleMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.04, 0.05, 1.4, 5), new THREE.MeshStandardMaterial({ color: '#5a5f5c' }), lamps.length);
lamps.forEach(([x, z], i) => { M.compose(P.set(x, 0.7, z), Q.identity(), S.set(1, 1, 1)); poleMesh.setMatrixAt(i, M); });
scene.add(poleMesh);
const glowTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,240,200,1)'); gr.addColorStop(0.25, 'rgba(255,214,140,.55)'); gr.addColorStop(1, 'rgba(255,200,120,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const glowGeo = new THREE.BufferGeometry();
glowGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(lamps.flatMap(([x, z]) => [x, 1.45, z])), 3));
const glowMat = new THREE.PointsMaterial({ map: glowTex, size: 4.6, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
scene.add(new THREE.Points(glowGeo, glowMat));

/* ---------- carros na avenida ---------- */
const cars = [];
const carMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1.1, 0.42, 0.55), new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.3 }), 44);
const carCols = ['#f2f2f2', '#c9cdd2', '#1d1f22', '#a32d2d', '#2c5aa0', '#d9d9d9', '#6c7378'];
for (let i = 0; i < 44; i++) {
  const dir = i % 2 ? 1 : -1;
  cars.push({ x: rr(-200, 200), lane: AVE_Z + (dir > 0 ? 3.4 : -3.4) + (rnd() < 0.5 ? 0.9 : -0.9) * 0.5, v: rr(7, 12) * dir });
  carMesh.setColorAt(i, C.set(carCols[i % carCols.length]));
}
carMesh.castShadow = !mobile;
scene.add(carMesh);
const headGeo = new THREE.BufferGeometry();
headGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(44 * 3), 3));
const headMat = new THREE.PointsMaterial({ map: glowTex, size: 2.2, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
scene.add(new THREE.Points(headGeo, headMat));

/* ---------- anéis de Wi-Fi ---------- */
const wifiSpots = [[0, 4.2, 12.5], [lake.cx, 3.2, lake.cz], [-20, 4.5, AVE_Z - 7], [31, 3, 26]];
const wifiMat = new THREE.MeshBasicMaterial({ color: '#9ad89a', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
const wifi = [];
wifiSpots.forEach(([x, y, z], si) => {
  for (let k = 0; k < 3; k++) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 48), wifiMat.clone());
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    m.userData = { off: k / 3 + si * 0.13 };
    scene.add(m);
    wifi.push(m);
  }
  const node = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), new THREE.MeshBasicMaterial({ color: '#c9ffd0', transparent: true, opacity: 0 }));
  node.position.set(x, y, z);
  scene.add(node);
  wifi.push(node);
});

/* ---------- câmera: keyframes ligados à rolagem ---------- */
const KF = [
  { p: 0.0, t: [0, 0, 8], r: mobile ? 210 : 165, pol: 0.92, az: 0.55 },
  { p: 0.24, t: [0, 0, 4], r: mobile ? 150 : 108, pol: 0.38, az: 0.05 },
  { p: 0.47, t: [6, 0, 22], r: mobile ? 92 : 64, pol: 0.92, az: -0.55 },
  { p: 0.68, t: [8, 0, 8], r: mobile ? 85 : 58, pol: 1.08, az: 0.85 },
  { p: 0.92, t: [0, 0, 18], r: mobile ? 125 : 92, pol: 1.0, az: 1.75 },
];
const camState = { t: new THREE.Vector3(), r: 0, pol: 0, az: 0 };
const sampleCam = (p) => {
  let i = 0;
  while (i < KF.length - 2 && p > KF[i + 1].p) i++;
  const a = KF[i], b = KF[i + 1];
  const k = smooth(a.p, b.p, p);
  camState.t.set(lerp(a.t[0], b.t[0], k), lerp(a.t[1], b.t[1], k), lerp(a.t[2], b.t[2], k));
  camState.r = lerp(a.r, b.r, k);
  camState.pol = lerp(a.pol, b.pol, k);
  camState.az = lerp(a.az, b.az, k);
};

/* ---------- interação: arrastar para girar ---------- */
let dragAz = 0, dragVel = 0, dragging = false, lastX = 0, mx = 0, my = 0;
canvas.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', (e) => {
  const r = canvas.getBoundingClientRect();
  mx = (e.clientX - r.left) / r.width - 0.5; my = (e.clientY - r.top) / r.height - 0.5;
  if (!dragging) return;
  const dx = e.clientX - lastX; lastX = e.clientX;
  dragVel = dx * 0.006; dragAz += dragVel;
});
const endDrag = () => (dragging = false);
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

/* ---------- rótulos HTML projetados ---------- */
const LABELS = [
  { t: '← Aeroporto · 4 min', p: [-62, 1, AVE_Z], r: [0, 0.22] },
  { t: 'Centro · 15 min →', p: [62, 1, AVE_Z], r: [0, 0.22] },
  { t: 'Av. Eng. Fernando Guilhon', p: [0, 1, AVE_Z + 3], r: [0.0, 0.2], c: '#f6c33c' },
  { t: 'Portal de entrada', p: [0, 4.6, AVE_Z - 5.5], r: [0.2, 0.42], c: '#c4623a' },
  { t: 'Boulevard + ciclofaixa', p: [0, 0.6, -12], r: [0.24, 0.42], c: '#c4623a' },
  { t: 'Etapa 1 · 988 lotes', p: [24, 0.8, 34], r: [0.44, 0.62], c: '#9acd7f' },
  { t: 'Etapa 2', p: [-34, 0.8, -40], r: [0.46, 0.62], c: '#6f9461' },
  { t: 'Comercial', p: [-26, 3.2, AVE_Z - 7], r: [0.44, 0.62], c: '#e5cf98' },
  { t: 'Lago', p: [lake.cx, 0.8, lake.cz], r: [0.62, 0.8], c: '#5b8ee6' },
  { t: 'Praça dos pergolados', p: [0, 3, 12.5], r: [0.62, 0.8], c: '#e7d7c2' },
  { t: 'Reserva verde', p: [-25, 4, -6], r: [0.62, 0.8], c: '#3fae49' },
  { t: 'Quadras esportivas', p: [31, 1.6, 26], r: [0.62, 0.8], c: '#2f6fb8' },
  { t: 'Wi-Fi público', p: [0, 5.2, 12.5], r: [0.84, 1.01], c: '#9ad89a' },
  { t: 'Videomonitoramento 24 h', p: [lake.cx, 4.2, lake.cz], r: [0.84, 1.01], c: '#9ad89a' },
  { t: 'Recarga de veículos elétricos', p: [17, 1.6, AVE_Z - 4.5], r: [0.84, 1.01], c: '#4fd1ff' },
];
const labelWrap = document.getElementById('mpLabels');
LABELS.forEach((l) => {
  const d = document.createElement('div');
  d.className = 'mp__label';
  d.textContent = l.t;
  if (l.c) d.style.setProperty('--c', l.c);
  labelWrap.appendChild(d);
  l.el = d;
  l.v = new THREE.Vector3(...l.p);
});

/* ---------- loop ---------- */
let W = 0, H = 0;
const resize = () => {
  const r = canvas.parentElement.getBoundingClientRect();
  W = r.width; H = r.height;
  renderer.setSize(W, H, false);
  camera.aspect = W / H;
  camera.updateProjectionMatrix();
};
resize();
addEventListener('resize', resize);

let visible = true;
new IntersectionObserver((e) => (visible = e[0].isIntersecting), { rootMargin: '200px' }).observe(canvas);

let shownP = 0, lastLots = -1, lastHouses = -1, lastTrees = -1;
const clock = new THREE.Clock();
const proj = new THREE.Vector3();
const tmpCol = new THREE.Color();

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (!visible) return;
  const time = clock.elapsedTime;
  const target = HP.reduced ? HP.mp.progress : HP.mp.progress;
  shownP += (target - shownP) * Math.min(1, dt * 4);
  const p = shownP;

  // estágios
  const sBase = smooth(0.1, 0.28, p);
  const sGrid = smooth(0.16, 0.38, p);
  const sBike = smooth(0.24, 0.42, p);
  const sLots = smooth(0.36, 0.52, p);
  const sHouse = smooth(0.46, 0.64, p);
  const sGreen = smooth(0.58, 0.74, p);
  const sNight = smooth(0.8, 0.9, p);
  const sWifi = smooth(0.84, 0.94, p);

  baseMat.opacity = sBase;
  resMat.opacity = sBase;
  lineMat.opacity = sGrid * (1 - smooth(0.42, 0.5, p)) * 0.9;
  lineGeo.setDrawRange(0, Math.floor(linePts.length * 2 * sGrid / 2) * 2);
  bikeLanes.forEach((m) => (m.scale.y = Math.max(0.0001, sBike)));
  bikeMat.emissiveIntensity = 0.15 * sBike + 0.5 * sNight;

  const qLots = Math.round(sLots * 200);
  if (qLots !== lastLots) { setLots(sLots); lastLots = qLots; }
  const qH = Math.round(sHouse * 200);
  if (qH !== lastHouses) { setHouses(sHouse); lastHouses = qH; }
  const qT = Math.round(sGreen * 120);
  if (qT !== lastTrees) { setTrees(sGreen); lastTrees = qT; }

  lakeMat.opacity = sGreen; lakeEdge.material.opacity = sGreen;
  lakeMat.emissive.setRGB(0.05, 0.12, 0.2).multiplyScalar(0.4 + 0.2 * Math.sin(time * 1.6));
  leisure.scale.y = Math.max(0.0001, sGreen);
  leisure.visible = sGreen > 0.01;
  lakeMesh.visible = lakeEdge.visible = sGreen > 0.01;

  // dia → noite
  tmpCol.copy(DAY).lerp(NIGHT, sNight);
  scene.background.copy(tmpCol);
  scene.fog.color.copy(tmpCol);
  hemi.intensity = lerp(1.25, 0.1, sNight);
  const dim = lerp(1, 0.55, sNight);
  lotMat.color.setScalar(dim); houseMat.color.setScalar(lerp(1, 0.55, sNight)); roofMat.color.set('#a9a49a').multiplyScalar(dim); treeMat.color.setScalar(lerp(1, 0.5, sNight));
  sun.intensity = lerp(2.4, 0.0, sNight);
  moon.intensity = lerp(0, 0.22, sNight);
  renderer.toneMappingExposure = lerp(1.05, 1.0, sNight);
  baseMat.color.set('#d9d3c4').lerp(C.set('#59595a'), sNight);
  lakeMat.color.set('#3a86bf').lerp(C.set('#0f2a44'), sNight);
  glowMat.opacity = sNight;
  headMat.opacity = sNight;
  winMat.emissiveIntensity = sNight * 1.4;
  commerce.userData.glass.emissiveIntensity = sNight * 1.6;
  evMat.emissiveIntensity = 0.3 + sNight * 2.2;
  portal.userData.disc.material.emissiveIntensity = sNight * 2;
  groundMat.color.set('#36592f').lerp(C.set('#0e1d17'), sNight * 0.6);
  riverMat.color.set('#3d78a8').lerp(C.set('#0b2033'), sNight);

  // Wi-Fi
  wifi.forEach((m) => {
    if (m.geometry.type === 'SphereGeometry') { m.material.opacity = sWifi; return; }
    const ph = (time * 0.45 + m.userData.off) % 1;
    const s = 0.6 + ph * 5.5;
    m.scale.set(s, s, s);
    m.material.opacity = sWifi * (1 - ph) * 0.9;
  });

  // carros
  const hp = headGeo.attributes.position.array;
  cars.forEach((c, i) => {
    c.x += c.v * dt;
    if (c.x > 220) c.x = -220; if (c.x < -220) c.x = 220;
    M.compose(P.set(c.x, 0.3, c.lane), Q.identity(), S.set(1, 1, 1));
    carMesh.setMatrixAt(i, M);
    hp[i * 3] = c.x + Math.sign(c.v) * 0.7; hp[i * 3 + 1] = 0.35; hp[i * 3 + 2] = c.lane;
  });
  carMesh.instanceMatrix.needsUpdate = true;
  headGeo.attributes.position.needsUpdate = true;

  // câmera
  sampleCam(p);
  if (!dragging) { dragVel *= 0.94; dragAz += dragVel; }
  const idle = HP.reduced ? 0 : Math.sin(time * 0.08) * 0.06;
  const az = camState.az + dragAz + idle + mx * 0.08;
  const pol = Math.min(1.35, camState.pol + my * 0.04);
  camera.position.set(
    camState.t.x + camState.r * Math.sin(pol) * Math.sin(az),
    camState.t.y + camState.r * Math.cos(pol),
    camState.t.z + camState.r * Math.sin(pol) * Math.cos(az)
  );
  camera.lookAt(camState.t);

  // rótulos
  LABELS.forEach((l) => {
    const on = p >= l.r[0] && p < l.r[1];
    proj.copy(l.v).project(camera);
    const behind = proj.z > 1;
    const x = (proj.x * 0.5 + 0.5) * W, y = (-proj.y * 0.5 + 0.5) * H;
    const inView = x > 40 && x < W - 40 && y > 60 && y < H - 30;
    l.el.classList.toggle('on', on && !behind && inView);
    l.el.style.transform = `translate(${x}px, ${y - 22}px) translate(-50%, -100%)`;
  });

  renderer.render(scene, camera);
}
setLots(0);
setHouses(0);
frame();
