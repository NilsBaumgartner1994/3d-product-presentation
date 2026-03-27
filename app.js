/**
 * app.js – 3D Product Presentation
 * Renders an STL model on a table inside a realistic living-room scene.
 */

import * as THREE from 'three';
import { OrbitControls }  from 'three/addons/controls/OrbitControls.js';
import { STLLoader }      from 'three/addons/loaders/STLLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// ─── Renderer ────────────────────────────────────────────────────────────────
const canvas   = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled  = true;
renderer.shadowMap.type     = THREE.PCFSoftShadowMap;
renderer.toneMapping        = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.outputColorSpace   = THREE.SRGBColorSpace;

// ─── Scene & environment ─────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xd9cfc4);  // warm off-white fallback bg

const pmrem  = new THREE.PMREMGenerator(renderer);
pmrem.compileEquirectangularShader();
const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environment = envTexture;

// ─── Camera ──────────────────────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 100);
camera.position.set(0, 1.6, 3.2);

// ─── Orbit controls ──────────────────────────────────────────────────────────
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.75, 0);
controls.enableDamping   = true;
controls.dampingFactor   = 0.06;
controls.maxPolarAngle   = Math.PI / 2 - 0.02;
controls.minDistance     = 0.8;
controls.maxDistance     = 9;
controls.update();

// ═══════════════════════════════════════════════════════════════════════════════
//  ROOM  GEOMETRY
// ═══════════════════════════════════════════════════════════════════════════════

// ── Procedural wood-floor texture ──────────────────────────────────────────
function makeWoodTexture(w = 1024, h = 1024) {
  const cv  = document.createElement('canvas');
  cv.width  = w;
  cv.height = h;
  const ctx = cv.getContext('2d');

  // Base colour – warm honey oak
  ctx.fillStyle = '#b87c45';
  ctx.fillRect(0, 0, w, h);

  const plankH = Math.floor(h / 8);
  const rng    = mulberry32(42);

  for (let py = 0; py < h; py += plankH) {
    // Slight plank colour variation
    const lum = 0.85 + rng() * 0.3;
    ctx.fillStyle = `rgba(${Math.round(lum * 190)},${Math.round(lum * 120)},${Math.round(lum * 55)},0.45)`;
    ctx.fillRect(0, py, w, plankH - 2);

    // Grain lines
    for (let g = 0; g < 18; g++) {
      const gy = py + rng() * plankH;
      ctx.strokeStyle = `rgba(80,45,10,${0.06 + rng() * 0.08})`;
      ctx.lineWidth   = 0.7 + rng();
      ctx.beginPath();
      ctx.moveTo(0, gy);
      for (let sx = 64; sx <= w; sx += 64) {
        ctx.lineTo(sx, gy + (rng() - 0.5) * 3);
      }
      ctx.stroke();
    }

    // Plank joint
    ctx.fillStyle = 'rgba(50,25,5,0.35)';
    ctx.fillRect(0, py + plankH - 2, w, 2);
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Simple deterministic PRNG so the texture is reproducible */
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let z = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    z = z + Math.imul(z ^ (z >>> 7), 61 | z) ^ z;
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Floor ──────────────────────────────────────────────────────────────────
const floorMat = new THREE.MeshStandardMaterial({
  map:       makeWoodTexture(),
  roughness: 0.72,
  metalness: 0.02,
  envMapIntensity: 0.4,
});
const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// ── Wall material ─────────────────────────────────────────────────────────
const wallMat = new THREE.MeshStandardMaterial({ color: 0xf2ebe0, roughness: 0.95, metalness: 0 });

// Back wall
const backWall = new THREE.Mesh(new THREE.PlaneGeometry(10, 4), wallMat);
backWall.position.set(0, 2, -5);
backWall.receiveShadow = true;
scene.add(backWall);

// Left wall
const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(10, 4), wallMat.clone());
leftWall.position.set(-5, 2, 0);
leftWall.rotation.y = Math.PI / 2;
leftWall.receiveShadow = true;
scene.add(leftWall);

// Right wall
const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(10, 4), wallMat.clone());
rightWall.position.set(5, 2, 0);
rightWall.rotation.y = -Math.PI / 2;
rightWall.receiveShadow = true;
scene.add(rightWall);

// Ceiling
const ceiling = new THREE.Mesh(
  new THREE.PlaneGeometry(10, 10),
  new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }),
);
ceiling.rotation.x = Math.PI / 2;
ceiling.position.y = 4;
scene.add(ceiling);

// ── Baseboard (wall trim) ──────────────────────────────────────────────────
function addBaseboard(x, z, rotY) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(10, 0.12, 0.04),
    new THREE.MeshStandardMaterial({ color: 0xeee8dc, roughness: 0.8 }),
  );
  mesh.position.set(x, 0.06, z);
  mesh.rotation.y = rotY;
  mesh.receiveShadow = true;
  scene.add(mesh);
}
addBaseboard(0, -4.98, 0);
addBaseboard(-4.98, 0, Math.PI / 2);
addBaseboard(4.98, 0, Math.PI / 2);

// ── Window (bright emissive rectangle on left wall) ─────────────────────
function makeWindowTexture() {
  const cv = document.createElement('canvas');
  cv.width = 256; cv.height = 256;
  const ctx = cv.getContext('2d');
  const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 160);
  grad.addColorStop(0,   'rgba(255,248,220,1)');
  grad.addColorStop(0.6, 'rgba(220,210,180,0.9)');
  grad.addColorStop(1,   'rgba(180,170,150,0.4)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const windowMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(1.4, 2.0),
  new THREE.MeshStandardMaterial({
    map:           makeWindowTexture(),
    emissive:      new THREE.Color(0xfff4c0),
    emissiveIntensity: 0.9,
    roughness: 0.5,
    side: THREE.DoubleSide,
  }),
);
windowMesh.position.set(-4.96, 2.0, -1.5);
windowMesh.rotation.y = Math.PI / 2;
scene.add(windowMesh);

// Window frame
const frameMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
[[0, 1.0], [0, -1.0]].forEach(([, oy]) => {
  const b = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 0.06), frameMat);
  b.position.set(-4.97, 2.0 + oy, -1.5);
  b.rotation.y = Math.PI / 2;
  scene.add(b);
});
[[-0.72, 0], [0.72, 0]].forEach(([ox]) => {
  const b = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.1, 0.06), frameMat);
  b.position.set(-4.97, 2.0, -1.5 + ox);
  b.rotation.y = Math.PI / 2;
  scene.add(b);
});

// ── Skirting picture frame on back wall ──────────────────────────────────
function makePictureFrame() {
  const grp  = new THREE.Group();
  const fMat = new THREE.MeshStandardMaterial({ color: 0x6b5540, roughness: 0.5 });
  // canvas inside
  const imgMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.8, 0.55),
    new THREE.MeshStandardMaterial({ color: 0x8fa8c8, roughness: 0.8 }),
  );
  imgMesh.position.z = 0.01;
  grp.add(imgMesh);
  // frame borders
  const borders = [
    [0.8, 0.06, 0, 0.305],   // top
    [0.8, 0.06, 0, -0.305],  // bottom
    [0.06, 0.55, -0.43, 0],  // left
    [0.06, 0.55, 0.43, 0],   // right
  ];
  borders.forEach(([bw, bh, bx, by]) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.04), fMat);
    b.position.set(bx, by, 0);
    grp.add(b);
  });
  return grp;
}
const frame = makePictureFrame();
frame.position.set(1.8, 2.2, -4.97);
scene.add(frame);

// ─── SOFA ────────────────────────────────────────────────────────────────────
function makeSofa() {
  const grp      = new THREE.Group();
  const sofaMat  = new THREE.MeshStandardMaterial({ color: 0x7a6858, roughness: 0.85, metalness: 0 });
  const legMat   = new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 0.5 });

  // Seat
  const seat = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.22, 0.85), sofaMat);
  seat.position.set(0, 0.38, 0);
  seat.castShadow = seat.receiveShadow = true;
  grp.add(seat);

  // Back rest
  const back = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.55, 0.2), sofaMat);
  back.position.set(0, 0.71, -0.33);
  back.castShadow = back.receiveShadow = true;
  grp.add(back);

  // Arm rests
  [-1.0, 1.0].forEach(sx => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.38, 0.85), sofaMat);
    arm.position.set(sx, 0.56, 0);
    arm.castShadow = arm.receiveShadow = true;
    grp.add(arm);
  });

  // Cushions
  const cushMat = new THREE.MeshStandardMaterial({ color: 0x8d7b6a, roughness: 0.9 });
  [-0.55, 0, 0.55].forEach(cx => {
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.14, 0.78), cushMat);
    c.position.set(cx, 0.56, 0.02);
    c.castShadow = c.receiveShadow = true;
    grp.add(c);
  });

  // Legs
  const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.28, 8);
  [[-0.95, -0.38], [0.95, -0.38], [-0.95, 0.38], [0.95, 0.38]].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(lx, 0.14, lz);
    leg.castShadow = true;
    grp.add(leg);
  });

  return grp;
}
const sofa = makeSofa();
sofa.position.set(0, 0, -3.4);
sofa.rotation.y = 0; // faces camera
scene.add(sofa);

// ─── PLANT (corner decoration) ───────────────────────────────────────────────
function makePlant() {
  const grp = new THREE.Group();

  // Pot
  const potMat = new THREE.MeshStandardMaterial({ color: 0xa05c3b, roughness: 0.7 });
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.09, 0.22, 12), potMat);
  pot.position.y = 0.11;
  pot.castShadow = true;
  grp.add(pot);

  // Stem
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x4a6741, roughness: 0.8 });
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 6), stemMat);
  stem.position.y = 0.47;
  grp.add(stem);

  // Foliage – several spheres
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x3b7a43, roughness: 0.85 });
  [[0, 0.8, 0], [-0.12, 0.7, 0.08], [0.1, 0.72, -0.1], [0.05, 0.88, 0.06]].forEach(([fx, fy, fz]) => {
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), leafMat);
    f.position.set(fx, fy, fz);
    f.castShadow = true;
    grp.add(f);
  });

  return grp;
}
const plant = makePlant();
plant.position.set(-4.3, 0, -4.3);
scene.add(plant);

// ─── TABLE ───────────────────────────────────────────────────────────────────
const TABLE_TOP_Y = 0.75; // height of table surface

function makeTable() {
  const grp = new THREE.Group();

  const topMat = new THREE.MeshStandardMaterial({ color: 0x7a5233, roughness: 0.35, metalness: 0.05 });
  const legMat = new THREE.MeshStandardMaterial({ color: 0x5c3d23, roughness: 0.55, metalness: 0 });

  // Table top
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.05, 0.85), topMat);
  top.position.y = TABLE_TOP_Y;
  top.castShadow = top.receiveShadow = true;
  grp.add(top);

  // Legs
  const legGeo = new THREE.CylinderGeometry(0.04, 0.04, TABLE_TOP_Y - 0.025, 10);
  [[-0.6, -0.33], [0.6, -0.33], [-0.6, 0.33], [0.6, 0.33]].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(lx, (TABLE_TOP_Y - 0.025) / 2, lz);
    leg.castShadow = true;
    grp.add(leg);
  });

  return grp;
}
const table = makeTable();
scene.add(table);

// ─── RUG ─────────────────────────────────────────────────────────────────────
const rugMat = new THREE.MeshStandardMaterial({ color: 0x8c6b50, roughness: 0.98, metalness: 0 });
const rug = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.8), rugMat);
rug.rotation.x = -Math.PI / 2;
rug.position.y = 0.002;
rug.receiveShadow = true;
scene.add(rug);

// ═══════════════════════════════════════════════════════════════════════════════
//  LIGHTING
// ═══════════════════════════════════════════════════════════════════════════════

// Sky/hemisphere
const hemiLight = new THREE.HemisphereLight(0xfff6e8, 0x3a2e28, 0.6);
scene.add(hemiLight);

// Main window light (warm directional)
const sunLight = new THREE.DirectionalLight(0xfff4d6, 3.5);
sunLight.position.set(-4, 4.5, 1);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.near   = 0.5;
sunLight.shadow.camera.far    = 20;
sunLight.shadow.camera.left   = -5;
sunLight.shadow.camera.right  = 5;
sunLight.shadow.camera.top    = 5;
sunLight.shadow.camera.bottom = -5;
sunLight.shadow.bias          = -0.0008;
sunLight.shadow.normalBias    = 0.02;
scene.add(sunLight);

// Warm fill – ceiling lamp
const ceilLight = new THREE.PointLight(0xffe8c0, 1.2, 10);
ceilLight.position.set(0, 3.6, 0);
ceilLight.castShadow = false;
scene.add(ceilLight);

// Subtle back fill
const backFill = new THREE.DirectionalLight(0xd0c8ff, 0.4);
backFill.position.set(3, 2, -3);
scene.add(backFill);

// ═══════════════════════════════════════════════════════════════════════════════
//  MATERIAL  PRESETS
// ═══════════════════════════════════════════════════════════════════════════════

const PRESETS = {
  plastic: { roughness: 0.55, metalness: 0.0,  envMapIntensity: 0.6 },
  metal:   { roughness: 0.15, metalness: 0.95, envMapIntensity: 1.0 },
  matte:   { roughness: 0.95, metalness: 0.0,  envMapIntensity: 0.2 },
  glossy:  { roughness: 0.05, metalness: 0.05, envMapIntensity: 1.2 },
};

let currentPreset = 'plastic';
let currentColor  = new THREE.Color(0xffffff);

function buildMaterial() {
  const p = PRESETS[currentPreset];
  return new THREE.MeshStandardMaterial({
    color:            currentColor.clone(),
    roughness:        p.roughness,
    metalness:        p.metalness,
    envMapIntensity:  p.envMapIntensity,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  STL  LOADING
// ═══════════════════════════════════════════════════════════════════════════════

let loadedMesh = null;
let userScale  = 1.0;   // multiplier from slider

function placeModel(geometry) {
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();

  const box    = geometry.boundingBox;
  const center = new THREE.Vector3();
  box.getCenter(center);
  const size = new THREE.Vector3();
  box.getSize(size);

  // Centre XZ, sit bottom on origin
  geometry.translate(-center.x, -box.min.y, -center.z);

  // Auto-scale so largest dimension fits within 0.35 m
  const maxDim = Math.max(size.x, size.y, size.z);
  const autoScale = 0.35 / maxDim;

  const mesh = new THREE.Mesh(geometry, buildMaterial());
  mesh.scale.setScalar(autoScale * userScale);
  mesh.castShadow    = true;
  mesh.receiveShadow = true;

  // Sit on table surface
  mesh.position.set(0, TABLE_TOP_Y + 0.025 + 0.001, 0);

  return mesh;
}

function removeModel() {
  if (!loadedMesh) return;
  scene.remove(loadedMesh);
  loadedMesh.geometry.dispose();
  loadedMesh.material.dispose();
  loadedMesh = null;
}

function loadSTL(buffer) {
  const loader   = new STLLoader();
  const geometry = loader.parse(buffer);

  removeModel();
  loadedMesh = placeModel(geometry);
  scene.add(loadedMesh);

  // UI
  document.getElementById('drop-overlay').style.display = 'none';
  document.getElementById('reset-btn').style.display    = 'inline-block';
  document.getElementById('info-badge').style.display   = 'block';
  document.getElementById('scale-slider').value         = '1.0';
  document.getElementById('scale-value').textContent    = '1.0×';
  userScale = 1.0;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  DRAG  &  DROP
// ═══════════════════════════════════════════════════════════════════════════════

const dragHL = document.getElementById('drag-highlight');

let dragCounter = 0;

window.addEventListener('dragenter', (e) => {
  e.preventDefault();
  dragCounter++;
  dragHL.classList.add('active');
});

window.addEventListener('dragleave', () => {
  dragCounter--;
  if (dragCounter <= 0) {
    dragCounter = 0;
    dragHL.classList.remove('active');
  }
});

window.addEventListener('dragover', (e) => { e.preventDefault(); });

window.addEventListener('drop', (e) => {
  e.preventDefault();
  dragCounter = 0;
  dragHL.classList.remove('active');

  const file = e.dataTransfer?.files[0];
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.stl')) {
    showError('Please drop an STL (.stl) file.');
    return;
  }
  readFile(file);
});

// File input (browse button)
document.getElementById('file-input').addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (file) readFile(file);
  e.target.value = '';
});

function readFile(file) {
  const reader = new FileReader();
  reader.onload  = (ev) => loadSTL(ev.target.result);
  reader.onerror = ()  => showError('Could not read the file.');
  reader.readAsArrayBuffer(file);
}

function showError(msg) {
  const el = document.createElement('div');
  el.style.cssText = `
    position:fixed;bottom:90px;left:50%;transform:translateX(-50%);
    background:#c0392b;color:#fff;padding:10px 20px;border-radius:8px;
    font-size:.88rem;z-index:50;pointer-events:none;`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CONTROLS  PANEL
// ═══════════════════════════════════════════════════════════════════════════════

// Material buttons
document.querySelectorAll('.mat-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentPreset = btn.dataset.material;
    if (loadedMesh) {
      loadedMesh.material.dispose();
      loadedMesh.material = buildMaterial();
    }
  });
});

// Color picker
document.getElementById('color-picker').addEventListener('input', (e) => {
  currentColor.set(e.target.value);
  if (loadedMesh) loadedMesh.material.color.set(currentColor);
});

// Scale slider
document.getElementById('scale-slider').addEventListener('input', (e) => {
  userScale = parseFloat(e.target.value);
  document.getElementById('scale-value').textContent = userScale.toFixed(2) + '×';
  if (loadedMesh) {
    const geo = loadedMesh.geometry;
    geo.computeBoundingBox();
    const size = new THREE.Vector3();
    geo.boundingBox.getSize(size);
    const maxDim  = Math.max(size.x, size.y, size.z);
    const autoScale = 0.35 / maxDim;
    loadedMesh.scale.setScalar(autoScale * userScale);
  }
});

// Reset button
document.getElementById('reset-btn').addEventListener('click', () => {
  removeModel();
  document.getElementById('drop-overlay').style.display = 'flex';
  document.getElementById('reset-btn').style.display    = 'none';
  document.getElementById('info-badge').style.display   = 'none';
});

// Screenshot button
document.getElementById('screenshot-btn').addEventListener('click', () => {
  // Render once more to ensure drawing buffer is current
  renderer.render(scene, camera);
  const link      = document.createElement('a');
  link.href       = renderer.domElement.toDataURL('image/png');
  link.download   = 'product-render.png';
  link.click();
});

// ═══════════════════════════════════════════════════════════════════════════════
//  ANIMATION  LOOP
// ═══════════════════════════════════════════════════════════════════════════════

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

// ─── Resize ──────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
