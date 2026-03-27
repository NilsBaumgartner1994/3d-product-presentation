/**
 * app.js – 3D Product Presentation
 * Renders an STL model inside a real HDR skybox environment.
 */

import * as THREE from 'three';
import { OrbitControls }  from 'three/addons/controls/OrbitControls.js';
import { STLLoader }      from 'three/addons/loaders/STLLoader.js';
import { RGBELoader }     from 'three/addons/loaders/RGBELoader.js';
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

// ─── Scene ───────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);  // sky-blue fallback while HDR loads

const pmrem = new THREE.PMREMGenerator(renderer);
pmrem.compileEquirectangularShader();

// ─── Camera ──────────────────────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 1000);
camera.position.set(0, 0.8, 2.5);

// ─── Orbit controls ──────────────────────────────────────────────────────────
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.2, 0);
controls.enableDamping   = true;
controls.dampingFactor   = 0.06;
controls.maxPolarAngle   = Math.PI / 2 - 0.01;
controls.minDistance     = 0.5;
controls.maxDistance     = 15;
controls.update();

// ═══════════════════════════════════════════════════════════════════════════════
//  HDR  ENVIRONMENTS
// ═══════════════════════════════════════════════════════════════════════════════

const HDR_ENVS = [
  {
    label: 'Venice Sunset',
    url: 'https://threejs.org/examples/textures/equirectangular/venice_sunset_1k.hdr',
    sunDir: new THREE.Vector3(-1.5, 1.0, 0.5).normalize(),
    sunColor: 0xffb060,
    sunIntensity: 2.0,
    hemiSky: 0xffd0a0,
    hemiGnd: 0x806040,
    hemiIntensity: 0.3,
    exposure: 1.0,
  },
  {
    label: 'Royal Esplanade',
    url: 'https://threejs.org/examples/textures/equirectangular/royal_esplanade_1k.hdr',
    sunDir: new THREE.Vector3(1, 2, 1).normalize(),
    sunColor: 0xfff4d6,
    sunIntensity: 2.5,
    hemiSky: 0xcce4ff,
    hemiGnd: 0x404030,
    hemiIntensity: 0.4,
    exposure: 0.9,
  },
  {
    label: 'Moonless Golf',
    url: 'https://threejs.org/examples/textures/equirectangular/moonless_golf_1k.hdr',
    sunDir: new THREE.Vector3(0.5, 1.0, 1.0).normalize(),
    sunColor: 0x8899ff,
    sunIntensity: 0.5,
    hemiSky: 0x203060,
    hemiGnd: 0x102010,
    hemiIntensity: 0.2,
    exposure: 1.3,
  },
  {
    label: 'Quarry',
    url: 'https://threejs.org/examples/textures/equirectangular/quarry_01_1k.hdr',
    sunDir: new THREE.Vector3(2, 3, 1).normalize(),
    sunColor: 0xffffff,
    sunIntensity: 2.2,
    hemiSky: 0xc0d8f0,
    hemiGnd: 0x506040,
    hemiIntensity: 0.35,
    exposure: 1.0,
  },
  {
    label: 'Living Room',
    url: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/residential_living_room_1k.hdr',
    sunDir: new THREE.Vector3(1, 1.5, 0.5).normalize(),
    sunColor: 0xfff5e0,
    sunIntensity: 1.2,
    hemiSky: 0xfff0d8,
    hemiGnd: 0x604838,
    hemiIntensity: 0.5,
    exposure: 1.2,
  },
  {
    label: 'Dining Room',
    url: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/dining_room_1k.hdr',
    sunDir: new THREE.Vector3(-1, 1.5, 1).normalize(),
    sunColor: 0xffe8c0,
    sunIntensity: 1.0,
    hemiSky: 0xffe4c8,
    hemiGnd: 0x503828,
    hemiIntensity: 0.45,
    exposure: 1.1,
  },
  {
    label: 'Kitchen',
    url: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/kitchen_1k.hdr',
    sunDir: new THREE.Vector3(0.5, 2, 1).normalize(),
    sunColor: 0xffffff,
    sunIntensity: 1.5,
    hemiSky: 0xf0f4ff,
    hemiGnd: 0x484848,
    hemiIntensity: 0.5,
    exposure: 1.0,
  },
];

let currentEnvRenderTarget = null;
let currentHdrTexture = null;

function loadEnvironment(envIndex) {
  const env = HDR_ENVS[envIndex];
  new RGBELoader().load(
    env.url,
    (hdrTexture) => {
      hdrTexture.mapping = THREE.EquirectangularReflectionMapping;

      // Dispose old resources before replacing
      if (currentHdrTexture) currentHdrTexture.dispose();
      if (currentEnvRenderTarget) currentEnvRenderTarget.dispose();

      currentHdrTexture      = hdrTexture;
      scene.background       = hdrTexture;
      currentEnvRenderTarget = pmrem.fromEquirectangular(hdrTexture);
      scene.environment      = currentEnvRenderTarget.texture;

      // Match lighting to the chosen environment
      renderer.toneMappingExposure = env.exposure;
      sunLight.color.set(env.sunColor);
      sunLight.intensity = env.sunIntensity;
      sunLight.position.copy(env.sunDir).multiplyScalar(8);
      hemiLight.color.set(env.hemiSky);
      hemiLight.groundColor.set(env.hemiGnd);
      hemiLight.intensity = env.hemiIntensity;
    },
    undefined,
    () => {
      // Fallback: procedural room environment if CDN is unavailable
      const fallback = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = fallback;
      scene.background  = new THREE.Color(0x87ceeb);
    },
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GROUND  (shadow catcher – transparent plane that only shows cast shadows)
// ═══════════════════════════════════════════════════════════════════════════════

const shadowGround = new THREE.Mesh(
  new THREE.CircleGeometry(4, 64),
  new THREE.ShadowMaterial({ opacity: 0.45 }),
);
shadowGround.rotation.x = -Math.PI / 2;
shadowGround.position.y = 0;
shadowGround.receiveShadow = true;
scene.add(shadowGround);

// ═══════════════════════════════════════════════════════════════════════════════
//  LIGHTING  (key + ambient; detailed colour updated per environment by loadEnvironment)
// ═══════════════════════════════════════════════════════════════════════════════

// Hemisphere – sky/ground ambient
const hemiLight = new THREE.HemisphereLight(0xffd0a0, 0x806040, 0.3);
scene.add(hemiLight);

// Key/sun directional light – casts shadows; position and colour set by loadEnvironment
const sunLight = new THREE.DirectionalLight(0xffb060, 2.0);
sunLight.position.set(-6, 8, 4);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.near   = 0.1;
sunLight.shadow.camera.far    = 30;
sunLight.shadow.camera.left   = -3;
sunLight.shadow.camera.right  = 3;
sunLight.shadow.camera.top    = 3;
sunLight.shadow.camera.bottom = -3;
sunLight.shadow.bias          = -0.001;
sunLight.shadow.normalBias    = 0.02;
scene.add(sunLight);

// Load the default environment (Venice Sunset)
loadEnvironment(0);

// ═══════════════════════════════════════════════════════════════════════════════
//  MATERIAL  PRESETS
// ═══════════════════════════════════════════════════════════════════════════════

const PRESETS = {
  plastic: { roughness: 0.55, metalness: 0.0,  envMapIntensity: 1.0 },
  metal:   { roughness: 0.15, metalness: 0.95, envMapIntensity: 1.2 },
  matte:   { roughness: 0.95, metalness: 0.0,  envMapIntensity: 0.4 },
  glossy:  { roughness: 0.05, metalness: 0.05, envMapIntensity: 1.5 },
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

  // Sit on ground
  mesh.position.set(0, 0.001, 0);

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

// Environment selector
document.getElementById('env-select').addEventListener('change', (e) => {
  loadEnvironment(parseInt(e.target.value, 10));
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
