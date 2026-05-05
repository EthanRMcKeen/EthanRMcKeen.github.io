import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';

import HolographicMaterial from './HolographicMaterialVanilla.js';

// ── Scene ──────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0f);
scene.fog = new THREE.FogExp2(0x0a0a0f, 0.04);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 1.9, -0.14);
camera.rotation.order = 'YXZ';

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.getElementById('canvas-container').appendChild(renderer.domElement);

// ── Lighting ───────────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0x334466, 3));
const fillLight = new THREE.DirectionalLight(0x4477aa, 2.5);
fillLight.position.set(-4, 2, -3);
scene.add(fillLight);

// ── Grid ───────────────────────────────────────────────────────────────────
scene.add(new THREE.GridHelper(20, 40, 0x1a2a4a, 0x0d1520));

// ── Resize ─────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/// ── Title Text ─────────────────────────────────────────
const text_loader = new FontLoader();
const font = await text_loader.loadAsync( './fonts/Starjedi.json' );
const title_geometry = new TextGeometry( 'ETHAN  MCKEEN', {
	font: font,
	size: 10,
	depth: 2,
	curveSegments: 12
} );

const font_arial = await text_loader.loadAsync( 'fonts/Ubuntu.json' );
const subtitle_geometry = new TextGeometry( 'Electrical & Computer Engineer | Machine Learning Specialist', {
  font: font_arial,
  size: 7,
  depth: 2,
  curveSegments: 12
} );

const holographicMaterial = new HolographicMaterial();
const titleMesh = new THREE.Mesh( title_geometry, holographicMaterial );
titleMesh.scale.set(0.002, 0.002, 0.002);
titleMesh.position.set(0, 1.92, 0.08);
titleMesh.rotation.y = Math.PI;
title_geometry.center();

const subtitleMesh = new THREE.Mesh( subtitle_geometry, holographicMaterial );
subtitleMesh.scale.set(0.001, 0.001, 0.001);
subtitleMesh.position.set(0, 1.89, 0.08);
subtitleMesh.rotation.y = Math.PI;
subtitle_geometry.center();

scene.add( titleMesh );
scene.add( subtitleMesh );


// ── Camera States ──────────────────────────────────────────────────────────
const STATES = {
  DEFAULT: {
    position:  new THREE.Vector3(0, 1.85, -0.14),
    yawOffset: Math.PI,
    pitchOffset: 0,
  },
  // Transient collapse state shared by all panels
  COLLAPSE: {
    position:  new THREE.Vector3(0, 1.85, -0.14), //0,1.9, -0.14
    yawOffset: Math.PI,
    pitchOffset: 0,
  },
  // Per-panel focus states — tweak position/yawOffset for each panel
  'focus-panel-left': {
    position:  new THREE.Vector3(0.4, 1.5, 1.7),
    yawOffset: 0.1 * Math.PI,
    pitchOffset: 0.02 * Math.PI,
  },
  'focus-panel-01': {
    position:  new THREE.Vector3(0.6, 2, 1.5),
    yawOffset: 0.15 * Math.PI,
    pitchOffset: -0.1 * Math.PI,
  },
  'focus-panel-02': {
    position:  new THREE.Vector3(-0.2, 1.5, 1.3),
    yawOffset: -0.06 * Math.PI,
    pitchOffset: 0.12 * Math.PI,
  },
  'focus-panel-03': {
    position:  new THREE.Vector3(0.8, 1, 1),
    yawOffset: 0.3 * Math.PI,
    pitchOffset: 0.18 * Math.PI,
  },
  'focus-panel-04': {
    position:  new THREE.Vector3(-0.8, 2.3, -0.8),
    yawOffset: -0.8 * Math.PI,
    pitchOffset: -0.13 * Math.PI,
  },
};

let currentState  = 'DEFAULT';
let camTarget     = STATES.DEFAULT.position.clone();
let yawTarget     = STATES.DEFAULT.yawOffset;
let pitchTarget   = STATES.DEFAULT.pitchOffset;
let activePanel   = null;   // e.g. 'panel-01'
let collapseTimer = null;

let mouseYaw   = Math.PI, mousePitch  = 0;
let currentYaw = Math.PI, currentPitch = 0;
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

// ── State Machine ──────────────────────────────────────────────────────────
function transitionTo(stateName, panelId) {
  if (stateName === currentState) return;
  currentState = stateName;

  const state = STATES[stateName];
  camTarget = state.position.clone();
  yawTarget = state.yawOffset;
  pitchTarget = state.pitchOffset;

  if (stateName === 'COLLAPSE') {
    activePanel = panelId;
    collapseMainView();

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
    showDetailView(activePanel);

    // show pilot
    if (model2Loaded && model2) {
      if (!model2.parent) scene.add(model2);
      model2Timer = setTimeout(() => { model2.visible = true; }, 100);
    }

    //hide title and subtitle
    scene.remove(titleMesh);
    scene.remove(subtitleMesh);
  }

  if (stateName === 'DEFAULT') {
    clearTimeout(collapseTimer);
    clearTimeout(model2Timer);
    activePanel = null;
    if (model2) model2.visible = false;
    showMainView();
  }
}

// ── View helpers (class toggling only, no innerHTML) ───────────────────────
function setViewVisible(id) {
  // Hide all views, then show the requested one
  document.querySelectorAll('.hud-view').forEach(v => {
    v.classList.remove('hud-visible');
    v.classList.add('hud-hidden');
  });
  const el = document.getElementById(id);
  if (el) {
    el.classList.remove('hud-hidden');
    el.classList.add('hud-visible');
  }
}

function collapseMainView() {
  document.querySelectorAll('#view-main .panel').forEach((p, i) => {
    p.style.transitionDelay = `${i * 0.08}s`;
    p.classList.add('collapsing');
  });
}

function showMainView() {
  setViewVisible('view-main');
  // Animate panels back in
  requestAnimationFrame(() => {
    document.querySelectorAll('#view-main .panel').forEach((p, i) => {
      p.classList.remove('collapsing');
      p.style.transitionDelay = `${i * 0.08}s`;
    });
  });
}

function showDetailView(panelId) {
  const detailId = 'detail-' + panelId;
  setViewVisible(detailId);

  // Re-trigger item animations by toggling the class
  const detail = document.getElementById(detailId);
  if (!detail) return;
  detail.querySelectorAll('.detail-item').forEach(item => {
    item.classList.remove('item-visible');
    // Force reflow so removing + re-adding the class restarts the animation
    void item.offsetWidth;
    item.classList.add('item-visible');
  });
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

    const box = new THREE.Box3().setFromObject(model);
    //model.position.y -= box.min.y;

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

// ── Render loop ────────────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  if (mixer && isAnimating) mixer.update(delta);
  updateCamera();
  renderer.render(scene, camera);

  const tick = () => {
    holographicMaterial.update() // Update the holographic material time uniform
    window.requestAnimationFrame(tick)
  }

  tick();
}
animate();