import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';

import HolographicMaterial from './HolographicMaterialVanilla.js';

// ── Scene ──────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0f);
scene.fog = new THREE.FogExp2(0x0a0a0f, 0.04);

// A separate scene for CSS3D objects (they don't live in the WebGL scene)
const cssScene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 1.9, -0.14);
camera.rotation.order = 'YXZ';

// ── WebGL Renderer ─────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.getElementById('canvas-container').appendChild(renderer.domElement);

// ── CSS3D Renderer ─────────────────────────────────────────────────────────
const cssRenderer = new CSS3DRenderer();
cssRenderer.setSize(window.innerWidth, window.innerHeight);
cssRenderer.domElement.style.position = 'fixed';
cssRenderer.domElement.style.top = '0';
cssRenderer.domElement.style.left = '0';
cssRenderer.domElement.style.pointerEvents = 'none'; // let WebGL handle raycasting; panels set their own pointer-events
document.body.appendChild(cssRenderer.domElement);

// ── Lighting ───────────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0x334466, 3));
const fillLight = new THREE.DirectionalLight(0x4477aa, 2.5);
fillLight.position.set(-4, 2, -3);
scene.add(fillLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
dirLight.position.set(5, 10, 5);
dirLight.castShadow = true;
scene.add(dirLight);

// ── Grid ───────────────────────────────────────────────────────────────────
scene.add(new THREE.GridHelper(20, 40, 0x1a2a4a, 0x0d1520));

// ── Resize ─────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  cssRenderer.setSize(window.innerWidth, window.innerHeight);
});

// ── Title Text ─────────────────────────────────────────────────────────────
const text_loader = new FontLoader();
const font = await text_loader.loadAsync('./fonts/Starjedi.json');
const title_geometry = new TextGeometry('ETHAN  MCKEEN', {
  font: font,
  size: 10,
  depth: 2,
  curveSegments: 12
});

const font_arial = await text_loader.loadAsync('fonts/Ubuntu.json');
const subtitle_geometry = new TextGeometry('Electrical & Computer Engineer | Machine Learning Specialist', {
  font: font_arial,
  size: 7,
  depth: 2,
  curveSegments: 12
});

const holographicMaterial = new HolographicMaterial();
const titleMesh = new THREE.Mesh(title_geometry, holographicMaterial);
titleMesh.scale.set(0.002, 0.002, 0.002);
titleMesh.position.set(0, 1.92, 0.08);
titleMesh.rotation.y = Math.PI;
title_geometry.center();

const subtitleMesh = new THREE.Mesh(subtitle_geometry, holographicMaterial);
subtitleMesh.scale.set(0.001, 0.001, 0.001);
subtitleMesh.position.set(0, 1.89, 0.08);
subtitleMesh.rotation.y = Math.PI;
subtitle_geometry.center();

scene.add(titleMesh);
scene.add(subtitleMesh);

// ── CSS3D Panel Setup ──────────────────────────────────────────────────────
// CSS3DObject positions are in CSS pixel units scaled by a factor.
// We use a scale of 1/500 to map CSS pixels → Three.js world units.
// A 300px-wide panel at scale 1/500 = 0.6 world units wide.
const CSS3D_SCALE = 1 / 500;

// Panel world-space transforms — position (x,y,z) and rotation (rx,ry,rz in radians)
// These put the panels floating in the environment around BT-1's cockpit area.
const PANEL_TRANSFORMS = {
  'panel-left': {
    position: new THREE.Vector3(0.5, 1.4, 1.5),
    rotation: new THREE.Euler(0, 1.05 * Math.PI, 0),
  },
  'panel-01': {
    position: new THREE.Vector3(-0.25, 1.72, 1.52),
    rotation: new THREE.Euler(0, Math.PI, 0),
  },
  'panel-02': {
    position: new THREE.Vector3(-0.7, 1.72, 1.5),
    rotation: new THREE.Euler(0, -1.05 * Math.PI, 0),
  },
  'panel-03': {
    position: new THREE.Vector3(-0.25, 1.1, 1.52),
    rotation: new THREE.Euler(0, Math.PI, 0),
  },
  'panel-04': {
    position: new THREE.Vector3(-0.7, 1.1, 1.5),
    rotation: new THREE.Euler(0, -1.05 * Math.PI, 0),
  },
};

// Track CSS3DObjects so we can animate them
const css3dObjects = {};

// Detail containers also get CSS3D objects (hidden initially in world space)
const DETAIL_TRANSFORMS = {
  'detail-panel-left': {
    position: new THREE.Vector3(0, 1.86, 1.5),       
    rotation: new THREE.Euler(0, 0, 0),
  },
  'detail-panel-01': {
    position: new THREE.Vector3(-0.25, 1.41, 1.52),   
    rotation: new THREE.Euler(0, Math.PI, 0),
  },
  'detail-panel-02': {
    position: new THREE.Vector3(-0.7, 1.41, 1.5),     
    rotation: new THREE.Euler(0, -1.05 * Math.PI, 0),
  },
  'detail-panel-03': {
    position: new THREE.Vector3(-0.25, 1.41, 1.52),   
    rotation: new THREE.Euler(0, Math.PI, 0),
  },
  'detail-panel-04': {
    position: new THREE.Vector3(-0.7, 1.41, 1.5),
    rotation: new THREE.Euler(0, -1.05 * Math.PI, 0),
  },
};

// Remove the old flat HUD div from document flow — we'll drive all panels via CSS3D
// Keep the #hud div in the DOM but make it invisible (CSS3DObjects reference its children)
const hudEl = document.getElementById('hud');
//hudEl.style.display = 'none';

// Helper: wrap a DOM element in a CSS3DObject and add to cssScene
function makeCss3dPanel(el, transform) {
  el.style.display = 'block'; // ensure visible for CSS3DRenderer
  el.style.pointerEvents = 'auto';

  const obj = new CSS3DObject(el);
  obj.position.copy(transform.position);
  obj.rotation.copy(transform.rotation);
  obj.scale.setScalar(CSS3D_SCALE);

  cssScene.add(obj);
  return obj;
}

// Build CSS3D objects for all main panels
document.querySelectorAll('.panel[data-panel]').forEach(panel => {
  const id = panel.id;
  const transform = PANEL_TRANSFORMS[id];
  if (!transform) return;
  const obj = makeCss3dPanel(panel, transform);
  css3dObjects[id] = obj;
});

// Build CSS3D objects for all detail views (start them hidden)
document.querySelectorAll('.detail-container').forEach(detail => {
  const id = detail.id;
  const transform = DETAIL_TRANSFORMS[id];
  if (!transform) return;
  detail.style.display = 'flex';
  detail.style.opacity = '0';
  detail.style.pointerEvents = 'none';
  const obj = makeCss3dPanel(detail, transform);
  obj.visible = false;
  css3dObjects[id] = obj;
});

// ── Camera States ──────────────────────────────────────────────────────────
const STATES = {
  DEFAULT: {
    position:  new THREE.Vector3(0, 1.85, -0.14),
    yawOffset: Math.PI,
    pitchOffset: 0,
  },
  COLLAPSE: {
    position:  new THREE.Vector3(0, 1.85, -0.14),
    yawOffset: Math.PI,
    pitchOffset: 0,
  },
  'focus-panel-left': {
    position:  new THREE.Vector3(0.4, 1.55, 1.4),
    yawOffset: 0.12 * Math.PI,
    pitchOffset: 0.02 * Math.PI,
  },
  'focus-panel-01': {
    position:  new THREE.Vector3(0.4, 1.7, 0.45),
    yawOffset: -0.08 * Math.PI,
    pitchOffset: -0.04 * Math.PI,
  },
  'focus-panel-02': {
    position:  new THREE.Vector3(0.55, 1.45, 0.35),
    yawOffset: -0.1 * Math.PI,
    pitchOffset: 0.06 * Math.PI,
  },
  'focus-panel-03': {
    position:  new THREE.Vector3(0.4, 1.2, 0.5),
    yawOffset: -0.08 * Math.PI,
    pitchOffset: 0.14 * Math.PI,
  },
  'focus-panel-04': {
    position:  new THREE.Vector3(-0.4, 1.7, 0.45),
    yawOffset: 0.08 * Math.PI,
    pitchOffset: -0.04 * Math.PI,
  },
};

let currentState  = 'DEFAULT';
let camTarget     = STATES.DEFAULT.position.clone();
let yawTarget     = STATES.DEFAULT.yawOffset;
let pitchTarget   = STATES.DEFAULT.pitchOffset;
let activePanel   = null;
let collapseTimer = null;

let mouseYaw    = Math.PI, mousePitch   = 0;
let currentYaw  = Math.PI, currentPitch = 0;
const LOOK_RANGE = Math.PI / 6;
let mouseOffsetX = 0, mouseOffsetY = 0;

// ── Animation state flags ──────────────────────────────────────────────────
let isAnimating = false;
let mixer = null;
let gltf  = null;

let gltf2 = null;
let model2 = null;
let model2Timer = null;
let model2Loaded = false;

// ── Panel visibility helpers ───────────────────────────────────────────────
function showMainPanels(visible) {
  document.querySelectorAll('.panel[data-panel]').forEach(panel => {
    const obj = css3dObjects[panel.id];
    if (!obj) return;
    obj.visible = visible;
    panel.style.opacity = visible ? '1' : '0';
    panel.style.pointerEvents = visible ? 'auto' : 'none';
  });
}

function showDetailPanel(panelId, visible) {
  const detailId = 'detail-' + panelId;
  const obj = css3dObjects[detailId];
  const el  = document.getElementById(detailId);
  if (!obj || !el) return;
  obj.visible = visible;
  el.style.opacity = visible ? '1' : '0';
  el.style.pointerEvents = visible ? 'auto' : 'none';

  if (visible) {
    el.querySelectorAll('.detail-item').forEach(item => {
      item.classList.remove('item-visible');
      void item.offsetWidth;
      item.classList.add('item-visible');
    });
  }
}

// ── State Machine ──────────────────────────────────────────────────────────
function transitionTo(stateName, panelId) {
  if (stateName === currentState) return;
  currentState = stateName;

  const state = STATES[stateName];
  camTarget    = state.position.clone();
  yawTarget    = state.yawOffset;
  pitchTarget  = state.pitchOffset;

  if (stateName === 'COLLAPSE') {
    activePanel = panelId;

    // Animate panels collapsing
    document.querySelectorAll('.panel[data-panel]').forEach(p => p.classList.add('collapsing'));

    if (mixer && gltf?.animations?.length) {
      const action = mixer.clipAction(gltf.animations[0]);
      action.reset();
      action.paused = false;
      action.play();
      isAnimating = true;
      mixer.addEventListener('finished', () => { isAnimating = false; }, { once: true });
    }

    collapseTimer = setTimeout(() => transitionTo('focus-' + panelId), 1200);
  }

  if (stateName.startsWith('focus-')) {
    showMainPanels(false);
    showDetailPanel(activePanel, true);

    if (model2Loaded && model2) {
      if (!model2.parent) scene.add(model2);
      model2Timer = setTimeout(() => { model2.visible = true; }, 100);
    }

    scene.remove(titleMesh);
    scene.remove(subtitleMesh);
  }

  if (stateName === 'DEFAULT') {
    clearTimeout(collapseTimer);
    clearTimeout(model2Timer);

    // Hide any open detail
    if (activePanel) showDetailPanel(activePanel, false);
    activePanel = null;

    if (model2) model2.visible = false;

    // Restore main panels
    document.querySelectorAll('.panel[data-panel]').forEach(p => p.classList.remove('collapsing'));
    showMainPanels(true);

    scene.add(titleMesh);
    scene.add(subtitleMesh);
  }
}

// ── Back buttons ───────────────────────────────────────────────────────────
document.querySelectorAll('[data-back]').forEach(btn => {
  btn.addEventListener('click', () => transitionTo('DEFAULT'));
});

// ── Panel click listeners ──────────────────────────────────────────────────
document.querySelectorAll('.panel[data-panel]').forEach(panel => {
  panel.addEventListener('click', () => {
    if (currentState === 'DEFAULT') {
      transitionTo('COLLAPSE', panel.dataset.panel);
    }
  });
});

// ── Mouse look ─────────────────────────────────────────────────────────────
let mouseDirty = false;
window.addEventListener('mousemove', e => {
  if (mouseDirty) return;
  mouseDirty = true;
  requestAnimationFrame(() => {
    const nx = (e.clientX / window.innerWidth)  * 2 - 1;
    const ny = (e.clientY / window.innerHeight) * 2 - 1;
    mouseOffsetX = -nx * LOOK_RANGE;
    mouseOffsetY = -ny * (LOOK_RANGE * 0.6);
    mouseDirty = false;
  });
});

// ── Camera lerp ───────────────────────────────────────────────────────────
const LERP_POS = 0.02;
const LERP_ROT = 0.03;

function updateCamera() {
  camera.position.lerp(camTarget, LERP_POS);

  mouseYaw   = yawTarget + mouseOffsetX;
  mousePitch = pitchTarget + mouseOffsetY;

  currentYaw   += (mouseYaw   - currentYaw)   * LERP_ROT;
  currentPitch += (mousePitch - currentPitch) * LERP_ROT;

  camera.rotation.y = currentYaw;
  camera.rotation.x = currentPitch;
}

// ── GLTF Loaders ──────────────────────────────────────────────────────────
const loader = new GLTFLoader();
const clock  = new THREE.Clock();

loader.load(
  './models/bt/bt.gltf',
  loadedGltf => {
    gltf = loadedGltf;
    const model = gltf.scene;
    model.scale.setScalar(1);
    model.position.set(0, 0, 0);
    model.traverse(node => {
      if (!node.isMesh) return;
      node.castShadow    = false;
      node.receiveShadow = true;
    });
    scene.add(model);

    if (gltf.animations?.length) {
      mixer = new THREE.AnimationMixer(model);
      const action = mixer.clipAction(gltf.animations[0]);
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      action.play();
      action.paused = true;
      mixer.update(0);
    }
  },
  xhr => console.log((xhr.loaded / xhr.total * 100).toFixed(1) + '% loaded'),
  err => console.error('Error loading model 1:', err)
);

loader.load(
  './models/pilot/scene.gltf',
  loadedGltf => {
    gltf2 = loadedGltf;
    const model = gltf2.scene;
    model.scale.setScalar(0.1);
    model.position.set(-0.25, 1, 0.7);
    model.rotation.y = -0.15 * Math.PI;
    model.traverse(node => {
      if (!node.isMesh) return;
      node.castShadow    = false;
      node.receiveShadow = true;
    });
    model2 = model;
    model2Loaded = true;
  },
  xhr => console.log('Model 2: ' + (xhr.loaded / xhr.total * 100).toFixed(1) + '% loaded'),
  err => console.error('Error loading model 2:', err)
);

// ── Initial panel state ────────────────────────────────────────────────────
// Main panels visible, detail panels hidden
showMainPanels(true);
document.querySelectorAll('.detail-container').forEach(el => {
  const obj = css3dObjects[el.id];
  if (obj) obj.visible = false;
});

// ── Render loop ────────────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  if (mixer && isAnimating) mixer.update(delta);
  updateCamera();
  holographicMaterial.update();
  renderer.render(scene, camera);
  cssRenderer.render(cssScene, camera);
}
animate();