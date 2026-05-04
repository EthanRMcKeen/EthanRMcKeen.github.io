// ── Scene ──────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0f);
scene.fog = new THREE.FogExp2(0x0a0a0f, 0.04);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 1.9, -0.1);
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
scene.add(new THREE.AmbientLight(0x334466, 1.5));
const fillLight = new THREE.DirectionalLight(0x4477aa, 0.8);
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

// ── Panel Data ─────────────────────────────────────────────────────────────
const PANEL_DATA = {
  'panel-left': [
    { title: 'Item 01', body: 'Details about item 01. Add whatever content you want here.' },
    { title: 'Item 02', body: 'Details about item 02.' },
    { title: 'Item 03', body: 'Details about item 03.' },
    { title: 'Item 04', body: 'Details about item 04.' },
    { title: 'Item 05', body: 'Details about item 05.' },
    { title: 'Item 06', body: 'Details about item 06.' },
    { title: 'Item 07', body: 'Details about item 07.' },
  ],
  'panel-01': [
    { title: 'Alpha', body: 'Content for panel 01 - alpha entry.' },
    { title: 'Beta',  body: 'Content for panel 01 - beta entry.' },
  ],
  'panel-02': [
    { title: 'Report A', body: 'Panel 02 report A content.' },
    { title: 'Report B', body: 'Panel 02 report B content.' },
    { title: 'Report C', body: 'Panel 02 report C content.' },
  ],
  'panel-03': [
    { title: 'Log Entry 1', body: 'Panel 03 log entry 1.' },
    { title: 'Log Entry 2', body: 'Panel 03 log entry 2.' },
    { title: 'Log Entry 3', body: 'Panel 03 log entry 3.' },
    { title: 'Log Entry 4', body: 'Panel 03 log entry 4.' },
  ],
  'panel-04': [
    { title: 'Node A', body: 'Panel 04 node A.' },
    { title: 'Node B', body: 'Panel 04 node B.' },
  ],
};

// ── Camera States ──────────────────────────────────────────────────────────
const STATES = {
  DEFAULT: {
    position:  new THREE.Vector3(0, 1.9, -0.14),
    yawOffset: Math.PI,
  },
  COLLAPSE: {
    position:  new THREE.Vector3(0, 1.9, -0.14),
    yawOffset: Math.PI,
  },
  FOCUS: {
    position:  new THREE.Vector3(0.4, 1.5, 1.7),
    yawOffset: 0.1 * Math.PI,
  },
};

let currentState  = 'DEFAULT';
let camTarget     = STATES.DEFAULT.position.clone();
let yawTarget     = STATES.DEFAULT.yawOffset;
let activePanel   = null;
let collapseTimer = null;
let gltf = null;

let gltf2 = null;
let model2 = null;
let model2Timer = null;
let model2Loaded = false;

let mouseYaw = Math.PI, mousePitch = 0;
let currentYaw = Math.PI, currentPitch = 0;
const LOOK_RANGE = Math.PI / 6;
let mouseOffsetX = 0, mouseOffsetY = 0;

// ── Animation state flags ──────────────────────────────────────────────────
let isAnimating = false; // true only while the GLTF animation is playing
let mixer = null;

// ── State Machine ──────────────────────────────────────────────────────────
function transitionTo(stateName, panelId) {
  if (stateName === currentState) return;
  currentState = stateName;
  camTarget  = STATES[stateName].position.clone();
  yawTarget  = STATES[stateName].yawOffset;

  if (stateName === 'COLLAPSE') {
    activePanel = panelId;
    collapseHUD();

    if (mixer && gltf?.animations?.length) {
      const action = mixer.clipAction(gltf.animations[0]);
      action.reset();
      action.paused = false;
      action.play();
      isAnimating = true;

      // Stop ticking mixer once the clip ends
      mixer.addEventListener('finished', () => { isAnimating = false; }, { once: true });
    }

    collapseTimer = setTimeout(() => transitionTo('FOCUS'), 1200);
  }

  if (stateName === 'FOCUS') {
    showDetailHUD(activePanel);

    // Add model2 to scene lazily on first FOCUS (avoids per-frame cost until needed)
    if (model2Loaded && model2) {
      if (!model2.parent) scene.add(model2);
      model2Timer = setTimeout(() => { model2.visible = true; }, 100);
    }
  }

  if (stateName === 'DEFAULT') {
    clearTimeout(collapseTimer);
    clearTimeout(model2Timer);
    activePanel = null;
    if (model2) model2.visible = false;
    showMainHUD();
  }
}

// ── HUD Animations ─────────────────────────────────────────────────────────
function collapseHUD() {
  document.querySelectorAll('.panel').forEach((p, i) => {
    p.style.transition = `transform 0.3s ease ${i * 0.08}s, opacity 0.3s ease ${i * 0.08}s`;
    p.style.transform  = 'scaleY(0)';
    p.style.opacity    = '0';
  });
}

function showMainHUD() {
  document.getElementById('hud').innerHTML = buildMainHUD();
  requestAnimationFrame(() => {
    document.querySelectorAll('.panel').forEach((p, i) => {
      p.style.transition = `transform 0.4s ease ${i * 0.08}s, opacity 0.4s ease ${i * 0.08}s`;
      p.style.transform  = 'scaleY(0)';
      p.style.opacity    = '0';
      requestAnimationFrame(() => {
        p.style.transform = 'scaleY(1)';
        p.style.opacity   = '1';
      });
    });
    attachPanelListeners();
  });
}

function showDetailHUD(panelId) {
  const items = PANEL_DATA[panelId] || [];
  const hud   = document.getElementById('hud');

  hud.innerHTML = `
    <div class="detail-container">
      <div class="detail-header">
        <span class="detail-back" id="back-btn">← BACK</span>
        <span class="detail-title">// ${panelId.replace('-', ' ').toUpperCase()}</span>
      </div>
      <div class="detail-scroll">
        ${items.map((item, i) => `
          <div class="detail-item" style="animation-delay:${i * 0.08 + 0.2}s">
            <div class="detail-item-title">${item.title}</div>
            <div class="detail-item-body">${item.body}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  document.getElementById('back-btn').addEventListener('click', () => {
    transitionTo('DEFAULT');
  });
}

// ── Build Main HUD HTML ────────────────────────────────────────────────────
function buildMainHUD() {
  return `
    <div class="panel" id="panel-left">
      <div class="panel-title">// System Log</div>
      <div class="panel-content">
        <p>Model loaded successfully.</p><br>
        <p>W/A/S/D — Move</p>
        <p>E/Q — Up / Down</p>
        <p>Mouse — Look</p>
      </div>
    </div>
    <div id="panels-right">
      <div class="panel" id="panel-01">
        <div class="panel-title">// Panel 01</div>
        <div class="panel-content"><div class="panel-img">[ IMAGE ]</div><p>Click to expand.</p></div>
      </div>
      <div class="panel" id="panel-02">
        <div class="panel-title">// Panel 02</div>
        <div class="panel-content"><div class="panel-img">[ IMAGE ]</div><p>Click to expand.</p></div>
      </div>
      <div class="panel" id="panel-03">
        <div class="panel-title">// Panel 03</div>
        <div class="panel-content"><div class="panel-img">[ IMAGE ]</div><p>Click to expand.</p></div>
      </div>
      <div class="panel" id="panel-04">
        <div class="panel-title">// Panel 04</div>
        <div class="panel-content"><div class="panel-img">[ IMAGE ]</div><p>Click to expand.</p></div>
      </div>
    </div>
  `;
}

function attachPanelListeners() {
  document.querySelectorAll('.panel').forEach(panel => {
    panel.addEventListener('click', () => {
      if (currentState === 'DEFAULT') transitionTo('COLLAPSE', panel.id);
    });
  });
}

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

// ── Update camera (lerp position) ─────────────────────────────────────────
const LERP_POS = 0.02;
const LERP_ROT = 0.03;

function updateCamera() {
  camera.position.lerp(camTarget, LERP_POS);

  mouseYaw   = yawTarget + mouseOffsetX;
  mousePitch = mouseOffsetY;

  currentYaw   += (mouseYaw   - currentYaw)   * LERP_ROT;
  currentPitch += (mousePitch - currentPitch) * LERP_ROT;

  camera.rotation.y = currentYaw;
  camera.rotation.x = currentPitch;
}

// ── Shared GLTF Loader ─────────────────────────────────────────────────────
const loader = new THREE.GLTFLoader();
const clock  = new THREE.Clock();

loader.load(
  './models/bt/bt.gltf',
  loadedGltf => {
    gltf = loadedGltf;
    const model = gltf.scene;

    model.scale.setScalar(1);
    model.position.set(0, 0, 0);

    const box = new THREE.Box3().setFromObject(model);
    model.position.y -= box.min.y;

    model.traverse(node => {
      if (!node.isMesh) return;
      node.castShadow    = false;
      node.receiveShadow = true;
      node.frustumCulled = false;
    });

    scene.add(model);

    if (gltf.animations?.length) {
      mixer = new THREE.AnimationMixer(model);
      const action = mixer.clipAction(gltf.animations[0]);
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;

      // Pose on frame 0 then pause
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

// ── Animate ────────────────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  if (mixer && isAnimating) mixer.update(delta);

  updateCamera();
  renderer.render(scene, camera);
}
animate();



// ── Init ───────────────────────────────────────────────────────────────────
document.getElementById('hud').innerHTML = buildMainHUD();
attachPanelListeners();