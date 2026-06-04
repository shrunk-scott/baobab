/* Baobab — Hero "wealth horizon" three.js scene
 * A wireframe topographic plane that gently undulates,
 * coloured from the live CSS palette tokens.
 */
(function () {
  if (typeof THREE === 'undefined') return;
  const canvas = document.getElementById('horizon-canvas');
  if (!canvas) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Read CSS custom properties from <html> (palette-aware).
  const cssVar = (name, fallback) => {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  };

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();

  // Camera — looking down the surface at a low angle.
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
  camera.position.set(0, 6.2, 14);
  camera.lookAt(0, 0.4, -2);

  // Wireframe plane.
  const W = 28, H = 18;
  const SEG_X = 70, SEG_Y = 44;
  const geom = new THREE.PlaneGeometry(W, H, SEG_X, SEG_Y);
  geom.rotateX(-Math.PI / 2);

  // Cache the original positions for displacement on each frame.
  const basePositions = geom.attributes.position.array.slice();

  // Wireframe (line segments derived from geometry edges).
  const wireGeom = new THREE.WireframeGeometry(geom);
  const wireMat = new THREE.LineBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.55,
  });
  const wireframe = new THREE.LineSegments(wireGeom, wireMat);
  scene.add(wireframe);

  // A subtle filled mesh underneath, for depth.
  const fillMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.05,
    side: THREE.DoubleSide,
  });
  const fillMesh = new THREE.Mesh(geom, fillMat);
  scene.add(fillMesh);

  // Floating accent points — like sampled data on the surface.
  const POINTS_N = 36;
  const pointsGeom = new THREE.BufferGeometry();
  const ppos = new Float32Array(POINTS_N * 3);
  for (let i = 0; i < POINTS_N; i++) {
    ppos[i * 3 + 0] = (Math.random() - 0.5) * (W - 2);
    ppos[i * 3 + 1] = 0;
    ppos[i * 3 + 2] = (Math.random() - 0.5) * (H - 2);
  }
  pointsGeom.setAttribute('position', new THREE.BufferAttribute(ppos, 3));
  const pointsMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.14,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.9,
  });
  const points = new THREE.Points(pointsGeom, pointsMat);
  scene.add(points);

  // Fog gives the edges a soft fade.
  scene.fog = new THREE.Fog(0x000000, 14, 28);

  // ── Theme sync ─────────────────────────────────────────────────────
  function syncTheme() {
    const ink     = cssVar('--ink',     '#1a1a1a');
    const accent  = cssVar('--accent',  '#C7522A');
    const surface = cssVar('--bg',      '#F5F1E8');
    try {
      wireMat.color.set(ink);
      fillMat.color.set(ink);
      pointsMat.color.set(accent);
      scene.fog.color.set(surface);
    } catch (e) { /* invalid colour string mid-transition — ignore */ }
    // Adjust opacities for dark palettes (mineral) vs. light.
    const isDark = matchesDark(surface);
    wireMat.opacity = isDark ? 0.35 : 0.55;
    fillMat.opacity = isDark ? 0.04 : 0.05;
    pointsMat.opacity = isDark ? 0.95 : 0.85;
  }
  function matchesDark(hex) {
    // crude luminance check
    const c = new THREE.Color(hex);
    return (c.r * 0.299 + c.g * 0.587 + c.b * 0.114) < 0.4;
  }
  syncTheme();

  // Watch palette / theme attribute changes on <html>.
  const mo = new MutationObserver(syncTheme);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-palette', 'data-theme', 'class', 'style'] });

  // ── Resize ─────────────────────────────────────────────────────────
  function resize() {
    const r = canvas.getBoundingClientRect();
    const w = Math.max(1, r.width);
    const h = Math.max(1, r.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  // ── Animate ────────────────────────────────────────────────────────
  const wirePos = wireGeom.attributes.position;
  const wirePosBase = wirePos.array.slice();
  const fillPos = geom.attributes.position;

  // For each wireframe vertex, find its matching plane (x,z) so we can
  // displace it identically to the underlying mesh each frame.
  function displace(time) {
    // Update underlying plane geometry first.
    const arr = fillPos.array;
    for (let i = 0; i < arr.length; i += 3) {
      const x = basePositions[i + 0];
      const z = basePositions[i + 2];
      // Two-wave sum + a slow drift toward +x (depicts a rising trajectory).
      const wave =
        Math.sin(x * 0.42 + time * 0.6) * 0.55 +
        Math.cos(z * 0.55 - time * 0.45) * 0.55 +
        Math.sin((x + z) * 0.18 + time * 0.3) * 0.35 +
        x * 0.04; // upward tilt towards the right (growth feel)
      arr[i + 1] = wave;
    }
    fillPos.needsUpdate = true;

    // Recompute wireframe — easiest: rebuild from the mesh's vertex Y.
    // (Cheaper: we know wireframe shares ordered edge pairs from the same plane;
    // but PlaneGeometry's wireframe order isn't trivially stable, so rebuild.)
    const newWire = new THREE.WireframeGeometry(geom);
    wireframe.geometry.dispose();
    wireframe.geometry = newWire;

    // Update floating points to ride the surface.
    const pa = pointsGeom.attributes.position.array;
    for (let i = 0; i < POINTS_N; i++) {
      const x = pa[i * 3 + 0];
      const z = pa[i * 3 + 2];
      const wave =
        Math.sin(x * 0.42 + time * 0.6) * 0.55 +
        Math.cos(z * 0.55 - time * 0.45) * 0.55 +
        Math.sin((x + z) * 0.18 + time * 0.3) * 0.35 +
        x * 0.04;
      pa[i * 3 + 1] = wave + 0.18;
    }
    pointsGeom.attributes.position.needsUpdate = true;
  }

  let t0 = performance.now();
  let raf;
  function frame(now) {
    const t = (now - t0) / 1000;
    displace(t);
    // Gentle camera sway.
    camera.position.x = Math.sin(t * 0.08) * 1.2;
    camera.position.z = 14 + Math.cos(t * 0.06) * 0.6;
    camera.lookAt(0, 0.4, -2);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }

  if (reduceMotion) {
    displace(0);
    renderer.render(scene, camera);
  } else {
    raf = requestAnimationFrame(frame);
  }

  // Pause when offscreen for perf.
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        if (!raf && !reduceMotion) {
          t0 = performance.now() - (t0 ? performance.now() - t0 : 0);
          raf = requestAnimationFrame(frame);
        }
      } else {
        if (raf) { cancelAnimationFrame(raf); raf = null; }
      }
    }
  }, { rootMargin: '200px' });
  io.observe(canvas);
})();
