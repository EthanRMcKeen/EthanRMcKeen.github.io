// ── Scene ──────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0f);
scene.fog = new THREE.FogExp2(0x0a0a0f, 0.04);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.001, 1000);
camera.position.set(0, 1.9, -0.1);
camera.rotation.order = 'YXZ';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.getElementById('canvas-container').appendChild(renderer.domElement);

// ── Lighting ───────────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0x334466, 1.5));
const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
keyLight.position.set(5, 8, 5);
keyLight.castShadow = true;
//scene.add(keyLight);
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

let mouseYaw = Math.PI, mousePitch = 0;
let currentYaw = Math.PI, currentPitch = 0;
const LOOK_RANGE = Math.PI / 6;
let mouseOffsetX = 0, mouseOffsetY = 0;

// ── State Machine ──────────────────────────────────────────────────────────
function transitionTo(stateName, panelId) {
  if (stateName === currentState) return;
  currentState = stateName;
  camTarget  = STATES[stateName].position.clone();
  yawTarget  = STATES[stateName].yawOffset;

  if (stateName === 'COLLAPSE') {
    activePanel = panelId;
    collapseHUD();

    // Play animation once
    if (mixer) {
      const action = mixer.clipAction(gltf.animations[0]);
      action.reset();
      action.play();
    }

    collapseTimer = setTimeout(() => transitionTo('FOCUS'), 1200);
  }

  if (stateName === 'FOCUS') {
    showDetailHUD(activePanel);

    // Show model2 after x seconds
    model2Timer = setTimeout(() => {
      if (model2) model2.visible = true;
    }, 100); // x = 0.5 seconds, change to taste
  }

  if (stateName === 'DEFAULT') {
    clearTimeout(collapseTimer);
    clearTimeout(model2Timer);  // cancel if back is pressed before it appears
    activePanel = null;
    if (model2) model2.visible = false; // hide again when returning to default
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
  // Rebuild main panels if needed
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

// ── Mouse look (no movement, just look) ───────────────────────────────────
window.addEventListener('mousemove', e => {
  const nx = (e.clientX / window.innerWidth)  * 2 - 1;
  const ny = (e.clientY / window.innerHeight) * 2 - 1;
  mouseOffsetX = -nx * LOOK_RANGE;
  mouseOffsetY = -ny * (LOOK_RANGE * 0.6);
});

// ── Update camera (lerp position) ─────────────────────────────────────────
function updateCamera() {
  // Lerp position
  camera.position.lerp(camTarget, 0.02);

  // Recalculate mouse target every frame using current yawTarget
  mouseYaw   = yawTarget + mouseOffsetX;
  mousePitch = mouseOffsetY;

  // Lerp rotation
  currentYaw   += (mouseYaw   - currentYaw)   * 0.03;
  currentPitch += (mousePitch - currentPitch) * 0.03;

  camera.rotation.order = 'YXZ';
  camera.rotation.y = currentYaw;
  camera.rotation.x = currentPitch;
}

// ── GLTF Loader ────────────────────────────────────────────────────────────
let mixer = null;
const clock = new THREE.Clock();
const loader = new THREE.GLTFLoader();

loader.load(
  './models/bt/bt.gltf',  // <-- replace with your model path
  loadedGltf => {
    gltf = loadedGltf;
    const model = gltf.scene;
    const box    = new THREE.Box3().setFromObject(model);
    const size   = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const scale  = 1;
    model.scale.setScalar(scale);
    model.position.set(0,0,0);
    const box2 = new THREE.Box3().setFromObject(model);
    model.position.y -= box2.min.y;
    model.traverse(node => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
        node.frustumCulled = false;
      }
    });
    scene.add(model);
    if (gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(model);
      const action = mixer.clipAction(gltf.animations[0]);
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;

      // Pose on frame 0 then pause
      action.play();
      action.paused = true;
      mixer.update(0);  // evaluate at t=0 to apply the first frame pose
    }
  },
  xhr => console.log((xhr.loaded / xhr.total * 100).toFixed(1) + '% loaded'),
  err => console.error('Error loading model:', err)
);

const loader2 = new THREE.GLTFLoader();
loader2.load(
  './models/pilot/scene.gltf',  // <-- replace with your second model path
  loadedGltf => {
    gltf2 = loadedGltf;
    const model = gltf2.scene;
    model.scale.setScalar(0.1);
    model.position.set(-0.25, 1, 0.7);
    model.rotation.y = -0.15 * Math.PI;
    const box = new THREE.Box3().setFromObject(model);
    model.traverse(node => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
        node.frustumCulled = false;
      }
    });
    model2 = model;
    scene.add(model2);
    model2.visible = false; // hidden by default
  },
  xhr => console.log('Model 2: ' + (xhr.loaded / xhr.total * 100).toFixed(1) + '% loaded'),
  err => console.error('Error loading model 2:', err)
);

// ── Animate ────────────────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);
  updateCamera();
  renderer.render(scene, camera);
}
animate();

// ── Init ───────────────────────────────────────────────────────────────────
document.getElementById('hud').innerHTML = buildMainHUD();
attachPanelListeners();