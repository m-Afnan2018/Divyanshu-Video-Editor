// Divyanshu portfolio — custom additions on top of the Rayo template:
// 1) a small Three.js 3D visual mounted in the hero
// 2) pointer-tracked 3D tilt on Reel / YouTube cards
// Both respect prefers-reduced-motion and pause when off-screen.

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// --------------------------------------------- //
// Shared Three.js loader — one network fetch, reused
// by every 3D visual on the page (dynamic import()
// caches by URL, but this keeps intent explicit and
// gives every call site the same try/catch fallback).
// --------------------------------------------- //
let threeModulePromise = null;
function loadThree() {
  if (!threeModulePromise) {
    threeModulePromise = import("https://unpkg.com/three@0.160.0/build/three.module.js");
  }
  return threeModulePromise;
}

// --------------------------------------------- //
// Hero 3D Visual (Three.js)
// --------------------------------------------- //
async function initHero3D() {
  const mount = document.getElementById("hero3d");
  if (!mount) return;

  let THREE;
  try {
    THREE = await loadThree();
  } catch (err) {
    // offline / blocked CDN — leave the CSS gradient fallback (see portfolio.css) in place
    return;
  }

  const accent = 0xddf160;
  const additional = 0x9f8be7;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 6);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  mount.appendChild(renderer.domElement);

  // faceted outer shell
  const coreGeo = new THREE.IcosahedronGeometry(1.6, 1);
  const coreMat = new THREE.MeshStandardMaterial({
    color: accent,
    flatShading: true,
    metalness: 0.25,
    roughness: 0.25,
    emissive: 0x1a1e08,
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  scene.add(core);

  // wireframe outer cage, slightly larger, opposite rotation
  const cageGeo = new THREE.IcosahedronGeometry(2.05, 1);
  const cageMat = new THREE.MeshBasicMaterial({ color: additional, wireframe: true, transparent: true, opacity: 0.5 });
  const cage = new THREE.Mesh(cageGeo, cageMat);
  scene.add(cage);

  // play-triangle cutout, floating at the core's center
  const playShape = new THREE.Shape();
  playShape.moveTo(-0.35, 0.5);
  playShape.lineTo(0.55, 0);
  playShape.lineTo(-0.35, -0.5);
  playShape.closePath();
  const playGeo = new THREE.ExtrudeGeometry(playShape, { depth: 0.12, bevelEnabled: false });
  playGeo.center();
  const playMat = new THREE.MeshStandardMaterial({ color: 0x161616, metalness: 0.1, roughness: 0.4 });
  const play = new THREE.Mesh(playGeo, playMat);
  play.position.z = 1.5;
  scene.add(play);

  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  const key = new THREE.PointLight(0xffffff, 1.4, 20);
  key.position.set(4, 3, 5);
  scene.add(key);
  const rim = new THREE.PointLight(additional, 1.1, 20);
  rim.position.set(-4, -2, -3);
  scene.add(rim);

  function sizeToMount() {
    const w = mount.clientWidth || 1;
    const h = mount.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  sizeToMount();
  new ResizeObserver(sizeToMount).observe(mount);

  // gentle mouse-parallax tilt
  let targetX = 0, targetY = 0, curX = 0, curY = 0;
  window.addEventListener("pointermove", (e) => {
    targetX = (e.clientX / window.innerWidth - 0.5) * 0.6;
    targetY = (e.clientY / window.innerHeight - 0.5) * 0.6;
  });

  let visible = true;
  new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
  }).observe(mount);

  let raf = null;
  function renderFrame() {
    core.rotation.x += 0.0035;
    core.rotation.y += 0.005;
    cage.rotation.x -= 0.002;
    cage.rotation.y -= 0.0032;
    play.rotation.y += 0.006;

    curX += (targetY - curX) * 0.05;
    curY += (targetX - curY) * 0.05;
    scene.rotation.x = curX;
    scene.rotation.y = curY;

    renderer.render(scene, camera);
    if (visible && !prefersReducedMotion) raf = requestAnimationFrame(renderFrame);
  }

  if (prefersReducedMotion) {
    renderer.render(scene, camera);
  } else {
    raf = requestAnimationFrame(renderFrame);
  }
}

initHero3D();

// --------------------------------------------- //
// 3D Tilt-on-Hover for Reel / YouTube Cards
// --------------------------------------------- //
function initCardTilt() {
  if (prefersReducedMotion) return;

  const cards = document.querySelectorAll(".reel-card, .yt-card");
  const MAX_TILT = 10;

  cards.forEach((card) => {
    card.style.willChange = "transform";

    card.addEventListener("pointermove", (e) => {
      const rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      const rotY = (px - 0.5) * MAX_TILT * 2;
      const rotX = (0.5 - py) * MAX_TILT * 2;
      card.style.transition = "transform 0.05s linear";
      card.style.transform = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(1.03,1.03,1.03)`;
    });

    card.addEventListener("pointerleave", () => {
      card.style.transition = "transform 0.4s cubic-bezier(0.23, 1, 0.32, 1)";
      card.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)";
    });
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCardTilt);
} else {
  initCardTilt();
}

// --------------------------------------------- //
// Tools & Platforms — 3D wireframe backdrop (Three.js)
// --------------------------------------------- //
async function initToolsScene() {
  const canvas = document.querySelector("[data-tools-3d]");
  if (!canvas) return;

  const mount = canvas.parentElement;

  let THREE;
  try {
    THREE = await loadThree();
  } catch (err) {
    // offline / blocked CDN — cards still look complete without the backdrop
    return;
  }

  const palette = [0xddf160, 0x9f8be7];

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 14);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const group = new THREE.Group();
  scene.add(group);

  const shapeCount = window.matchMedia("(max-width: 768px)").matches ? 8 : 16;
  const shapes = [];
  for (let i = 0; i < shapeCount; i++) {
    const size = 0.4 + Math.random() * 1.1;
    const geo = new THREE.IcosahedronGeometry(size, 0);
    const edges = new THREE.EdgesGeometry(geo);
    const mat = new THREE.LineBasicMaterial({
      color: palette[i % palette.length],
      transparent: true,
      opacity: 0.25 + Math.random() * 0.35,
    });
    const mesh = new THREE.LineSegments(edges, mat);
    mesh.position.set((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    mesh.userData.spin = {
      x: (Math.random() - 0.5) * 0.006,
      y: (Math.random() - 0.5) * 0.006,
      z: (Math.random() - 0.5) * 0.004,
    };
    group.add(mesh);
    shapes.push(mesh);
  }

  function sizeToMount() {
    const w = mount.clientWidth || 1;
    const h = mount.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  sizeToMount();
  new ResizeObserver(sizeToMount).observe(mount);

  let targetX = 0, targetY = 0, curX = 0, curY = 0;
  if (!prefersReducedMotion) {
    window.addEventListener("pointermove", (e) => {
      targetX = (e.clientX / window.innerWidth - 0.5) * 0.4;
      targetY = (e.clientY / window.innerHeight - 0.5) * 0.3;
    });
  }

  let visible = true;
  new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
  }).observe(mount);

  let raf = null;
  function renderFrame() {
    shapes.forEach((mesh) => {
      mesh.rotation.x += mesh.userData.spin.x;
      mesh.rotation.y += mesh.userData.spin.y;
      mesh.rotation.z += mesh.userData.spin.z;
    });

    curX += (targetY - curX) * 0.04;
    curY += (targetX - curY) * 0.04;
    group.rotation.x = curX;
    group.rotation.y = curY;

    renderer.render(scene, camera);
    if (visible && !prefersReducedMotion) raf = requestAnimationFrame(renderFrame);
  }

  if (prefersReducedMotion) {
    renderer.render(scene, camera);
  } else {
    raf = requestAnimationFrame(renderFrame);
  }
}

initToolsScene();

// --------------------------------------------- //
// Statistics Cards — per-card 3D visuals (Three.js)
// A floating stack of clips, an orbiting system of the
// core editing tools, a studios/brands network, and a
// certification medal — each filling the decorative
// image slot the template reserved but never used.
// --------------------------------------------- //
async function initStatsScenes() {
  const canvases = document.querySelectorAll("[data-stats-scene]");
  if (!canvases.length) return;

  let THREE;
  try {
    THREE = await loadThree();
  } catch (err) {
    return; // offline / blocked CDN — cards still read fine as plain stat tiles
  }

  canvases.forEach((canvas) => buildStatsScene(THREE, canvas));
}

function buildStatsScene(THREE, canvas) {
  const variant = canvas.dataset.statsScene;
  const mount = canvas.parentElement;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  scene.add(new THREE.AmbientLight(0xffffff, 0.65));
  const key = new THREE.PointLight(0xffffff, 1.3, 30);
  key.position.set(4, 4, 7);
  scene.add(key);

  // pivot only ever carries the pointer-tracked tilt; each variant below
  // animates `group` (nested inside it) on its own clock, so the two
  // motions blend without fighting each other.
  const pivot = new THREE.Group();
  scene.add(pivot);
  const group = new THREE.Group();
  pivot.add(group);

  let animate = () => {};

  if (variant === "clips") {
    // a neatly fanned stack of dark, rounded "clip" cards floating over the accent panel
    const cardShape = new THREE.Shape();
    const cw = 3.2, ch = 1.9, cr = 0.16;
    const x0 = -cw / 2, y0 = -ch / 2;
    cardShape.moveTo(x0, y0 + cr);
    cardShape.lineTo(x0, y0 + ch - cr);
    cardShape.quadraticCurveTo(x0, y0 + ch, x0 + cr, y0 + ch);
    cardShape.lineTo(x0 + cw - cr, y0 + ch);
    cardShape.quadraticCurveTo(x0 + cw, y0 + ch, x0 + cw, y0 + ch - cr);
    cardShape.lineTo(x0 + cw, y0 + cr);
    cardShape.quadraticCurveTo(x0 + cw, y0, x0 + cw - cr, y0);
    cardShape.lineTo(x0 + cr, y0);
    cardShape.quadraticCurveTo(x0, y0, x0, y0 + cr);
    const cardGeo = new THREE.ExtrudeGeometry(cardShape, { depth: 0.14, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 });
    const cardEdges = new THREE.EdgesGeometry(cardGeo, 40);

    const shades = [0x121212, 0x181818, 0x0e0e0e, 0x151515, 0x1c1c1c];
    const clips = [];
    for (let i = 0; i < 5; i++) {
      const mat = new THREE.MeshStandardMaterial({ color: shades[i], roughness: 0.5, metalness: 0.2 });
      const mesh = new THREE.Mesh(cardGeo, mat);
      mesh.position.set(i * 0.1 - 0.2, i * -0.08 + 0.16, i * -0.32);
      mesh.rotation.z = (i - 2) * 0.032;
      const rim = new THREE.LineSegments(cardEdges, new THREE.LineBasicMaterial({ color: 0xf4f2ea, transparent: true, opacity: 0.14 }));
      mesh.add(rim);
      group.add(mesh);
      clips.push(mesh);
    }
    group.rotation.x = -0.12;
    group.rotation.y = 0.12;
    animate = (t) => {
      group.rotation.y = 0.12 + Math.sin(t * 0.35) * 0.12;
      group.position.y = Math.sin(t * 0.55) * 0.1;
    };
  } else if (variant === "orbit") {
    // core = the editor; three moons = Premiere / After Effects / CapCut
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.95, 1),
      new THREE.MeshStandardMaterial({ color: 0xddf160, emissive: 0x2b3009, flatShading: true, roughness: 0.35, metalness: 0.2 })
    );
    group.add(core);

    const orbiters = [
      { color: 0x9999ff, radius: 2.6, speed: 0.55, tilt: 0.32, size: 0.34 },
      { color: 0x7b6ff0, radius: 3.35, speed: -0.4, tilt: -0.22, size: 0.3 },
      { color: 0xddf160, radius: 4.0, speed: 0.3, tilt: 0.16, size: 0.26 },
    ];
    const orbitBodies = orbiters.map((o) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(o.radius, 0.006, 8, 64),
        new THREE.MeshBasicMaterial({ color: o.color, transparent: true, opacity: 0.22 })
      );
      ring.rotation.x = Math.PI / 2 + o.tilt;
      group.add(ring);

      const body = new THREE.Mesh(
        new THREE.IcosahedronGeometry(o.size, 0),
        new THREE.MeshStandardMaterial({ color: o.color, flatShading: true, roughness: 0.4 })
      );
      group.add(body);
      return { body, ...o, angle: Math.random() * Math.PI * 2 };
    });

    group.rotation.x = 0.18;
    animate = (t, dt) => {
      core.rotation.y += dt * 0.3;
      core.rotation.x += dt * 0.12;
      orbitBodies.forEach((o) => {
        o.angle += dt * o.speed;
        o.body.position.set(
          Math.cos(o.angle) * o.radius,
          Math.sin(o.angle) * o.radius * Math.sin(o.tilt),
          Math.sin(o.angle) * o.radius * Math.cos(o.tilt)
        );
      });
    };
  } else if (variant === "network") {
    // a loose constellation standing in for studio/brand collaborations
    const nodeColors = [0xddf160, 0x9999ff];
    const positions = [];
    for (let i = 0; i < 7; i++) {
      const p = new THREE.Vector3((Math.random() - 0.5) * 7.4, (Math.random() - 0.5) * 4.6, (Math.random() - 0.5) * 3.6);
      positions.push(p);
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 12, 12),
        new THREE.MeshBasicMaterial({ color: nodeColors[i % nodeColors.length] })
      );
      mesh.position.copy(p);
      group.add(mesh);
    }
    const lineMat = new THREE.LineBasicMaterial({ color: 0x9999ff, transparent: true, opacity: 0.28 });
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        if (positions[i].distanceTo(positions[j]) < 4.4) {
          const geo = new THREE.BufferGeometry().setFromPoints([positions[i], positions[j]]);
          group.add(new THREE.Line(geo, lineMat));
        }
      }
    }
    animate = (t) => {
      group.rotation.y = t * 0.14;
      group.rotation.x = Math.sin(t * 0.22) * 0.12;
    };
  } else if (variant === "medal") {
    // a rotating certification seal
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.1, 0.15, 24, 64),
      new THREE.MeshStandardMaterial({ color: 0xddf160, metalness: 0.4, roughness: 0.3, emissive: 0x22260a })
    );
    group.add(ring);
    const face = new THREE.Mesh(
      new THREE.CylinderGeometry(0.92, 0.92, 0.1, 48),
      new THREE.MeshStandardMaterial({ color: 0x161616, metalness: 0.3, roughness: 0.5 })
    );
    face.rotation.x = Math.PI / 2;
    group.add(face);
    const emblem = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.4, 0),
      new THREE.MeshStandardMaterial({ color: 0x9999ff, flatShading: true, emissive: 0x14113a })
    );
    emblem.position.z = 0.1;
    group.add(emblem);
    group.rotation.x = 0.4;
    animate = (t) => {
      group.rotation.y = t * 0.5;
      group.position.y = Math.sin(t * 0.8) * 0.1;
    };
  }

  function sizeToMount() {
    const w = mount.clientWidth || 1;
    const h = mount.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  sizeToMount();
  new ResizeObserver(sizeToMount).observe(mount);

  // pointer-tracked tilt — move anywhere over the card and the scene
  // leans toward the cursor; eases back to rest on pointerleave.
  const hasFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  let pointerX = 0, pointerY = 0, pointerActive = false;
  if (!prefersReducedMotion && hasFinePointer) {
    mount.addEventListener("pointermove", (e) => {
      const rect = mount.getBoundingClientRect();
      pointerX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerY = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      pointerActive = true;
    });
    mount.addEventListener("pointerleave", () => {
      pointerActive = false;
    });
  }

  let visible = true;
  let raf = null;
  new IntersectionObserver((entries) => {
    const wasVisible = visible;
    visible = entries[0].isIntersecting;
    if (visible && !wasVisible && !prefersReducedMotion) {
      raf = requestAnimationFrame(renderFrame);
    }
  }).observe(mount);

  const clock = new THREE.Clock();
  let tiltX = 0, tiltY = 0;
  function renderFrame() {
    animate(clock.getElapsedTime(), clock.getDelta());

    const targetTiltX = pointerActive ? pointerY * 0.35 : 0;
    const targetTiltY = pointerActive ? pointerX * 0.5 : 0;
    tiltX += (targetTiltX - tiltX) * 0.08;
    tiltY += (targetTiltY - tiltY) * 0.08;
    pivot.rotation.x = tiltX;
    pivot.rotation.y = tiltY;

    renderer.render(scene, camera);
    if (visible && !prefersReducedMotion) raf = requestAnimationFrame(renderFrame);
  }

  if (prefersReducedMotion) {
    renderer.render(scene, camera);
  } else {
    raf = requestAnimationFrame(renderFrame);
  }
}

initStatsScenes();

// --------------------------------------------- //
// Tools & Platforms — 3D Tilt-on-Hover Cards
// --------------------------------------------- //
function initToolCardTilt() {
  if (prefersReducedMotion) return;

  const cards = document.querySelectorAll("[data-tilt-card]");
  const MAX_TILT = 9;

  cards.forEach((card) => {
    const glow = card.querySelector("[data-tilt-glow]");
    const layers = card.querySelectorAll("[data-tilt-layer]");
    card.style.willChange = "transform";

    card.addEventListener("pointermove", (e) => {
      const rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      const rotY = (px - 0.5) * MAX_TILT * 2;
      const rotX = (0.5 - py) * MAX_TILT * 2;

      card.style.transition = "transform 0.05s linear";
      card.style.transform = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(1.02,1.02,1.02)`;

      if (glow) {
        glow.style.setProperty("--mx", `${px * 100}%`);
        glow.style.setProperty("--my", `${py * 100}%`);
      }
      layers.forEach((layer) => {
        const depth = parseFloat(layer.dataset.tiltLayer) || 0.5;
        const tx = (px - 0.5) * 12 * depth;
        const ty = (py - 0.5) * 12 * depth;
        layer.style.transition = "transform 0.05s linear";
        layer.style.transform = `translate3d(${tx}px, ${ty}px, ${depth * 30}px)`;
      });
    });

    card.addEventListener("pointerleave", () => {
      card.style.transition = "transform 0.4s cubic-bezier(0.23, 1, 0.32, 1)";
      card.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)";
      layers.forEach((layer) => {
        layer.style.transition = "transform 0.4s cubic-bezier(0.23, 1, 0.32, 1)";
        layer.style.transform = "translate3d(0, 0, 0)";
      });
    });
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initToolCardTilt);
} else {
  initToolCardTilt();
}

// --------------------------------------------- //
// Freelance Reel Cycle — Services Stack card
// Plays each freelance clip in sequence (muted preview),
// advancing on 'ended'; pauses off-screen and respects
// prefers-reduced-motion. Click opens the full clip with
// sound via the existing video-modal popup.
// --------------------------------------------- //
function initFreelanceReel() {
  const wrap = document.getElementById("freelance-reel-wrap");
  if (!wrap) return;

  const clips = [
    { src: "https://pub-aa7f6a3355d840f8941db46e9de19ca9.r2.dev/videos/Freelance/freelance-cafe.mp4", poster: "img/reels/freelance-cafe.jpg", title: "Café Brand — Freelance" },
    { src: "https://pub-aa7f6a3355d840f8941db46e9de19ca9.r2.dev/videos/Freelance/freelance-chaat-culture.mp4", poster: "img/reels/freelance-chaat-culture.jpg", title: "Chaat Culture — Freelance" },
    { src: "https://pub-aa7f6a3355d840f8941db46e9de19ca9.r2.dev/videos/Freelance/freelance-dandruff-oiling.mp4", poster: "img/reels/freelance-dandruff-oiling.jpg", title: "Haircare Clinic — Freelance" },
    { src: "https://pub-aa7f6a3355d840f8941db46e9de19ca9.r2.dev/videos/Freelance/freelance-vrinda-health-trend.mp4", poster: "img/reels/freelance-vrinda-health-trend.jpg", title: "Vrinda Health — Freelance" },
    { src: "https://pub-aa7f6a3355d840f8941db46e9de19ca9.r2.dev/videos/Freelance/freelance-spiritual-reel.mp4", poster: "img/reels/freelance-spiritual-reel.jpg", title: "Spiritual Page — Freelance" },
  ];

  const videoS = document.getElementById("freelance-reel-video-s");
  const videoM = document.getElementById("freelance-reel-video-m");
  const link = document.getElementById("freelance-reel-link");
  const control = document.getElementById("freelance-reel-control");
  const desktopQuery = window.matchMedia("(min-width: 992px)");

  let index = 0;
  let visible = false;

  function activeVideo() {
    return desktopQuery.matches ? videoM : videoS;
  }

  function setTriggerData(clip) {
    [link, control].forEach((el) => {
      if (!el) return;
      el.dataset.videoSrc = clip.src;
      el.dataset.videoPoster = clip.poster;
      el.dataset.videoTitle = clip.title;
    });
  }

  function loadClip(i) {
    const clip = clips[i];
    [videoS, videoM].forEach((v) => {
      if (!v) return;
      v.pause();
      v.poster = clip.poster;
      v.src = clip.src;
      v.load();
    });
    setTriggerData(clip);
  }

  function playActive() {
    if (prefersReducedMotion || !visible) return;
    const v = activeVideo();
    if (v) v.play().catch(() => {});
  }

  function pauseAll() {
    [videoS, videoM].forEach((v) => v && v.pause());
  }

  function advance() {
    index = (index + 1) % clips.length;
    loadClip(index);
    playActive();
  }

  if (!videoS || !videoM) return;

  loadClip(index);
  [videoS, videoM].forEach((v) => v.addEventListener("ended", advance));

  desktopQuery.addEventListener("change", () => {
    pauseAll();
    playActive();
  });

  new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    if (visible) {
      playActive();
    } else {
      pauseAll();
    }
  }, { threshold: 0.25 }).observe(wrap);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initFreelanceReel);
} else {
  initFreelanceReel();
}

// --------------------------------------------- //
// Hero title marquee — swap GSAP's scroll for a
// plain seamless CSS loop. app.js's shared
// initMarquee() already doubles this track's
// content (needed either way); it also drives it
// with a `+=50%` (rightward) tween that — for this
// one small pill, unlike the page's other, much
// wider marquees reusing the same class — walks the
// fixed-size viewport off the front of the (single-
// direction) duplicated content once per loop,
// flashing empty. Killing that one tween and looping
// via @keyframes instead (see portfolio.css) is
// seamless by construction: translating the already-
// doubled track by exactly -50% of its own width
// always lands the second copy exactly where the
// first one started.
// --------------------------------------------- //
function fixHeroMarquee() {
  const track = document.querySelector(".mxd-hero-01__marquee .marquee__toright");
  if (!track) return;
  if (window.gsap) window.gsap.killTweensOf(track);
  track.style.transform = "";
  track.classList.add("hero-marquee-fixed");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", fixHeroMarquee);
} else {
  fixHeroMarquee();
}
