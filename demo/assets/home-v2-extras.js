/* Baobab — Home v2 extras:
 *   1. Scroll reveals (fade + rise on enter)
 *   2. Hover tilt on bento cards
 *   3. Second three.js scene: "Schedule constellation"
 *      — 12 orbiting nodes, connected by force lines, palette-aware
 *   4. Rotating word in hero subtitle
 */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cssVar = (name, fallback) => {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  };

  // ── 1. SCROLL REVEALS ─────────────────────────────────────────
  // Add data-reveal to any element you want to animate in.
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          observer.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    document.querySelectorAll('[data-reveal]').forEach(el => observer.observe(el));
  } else {
    document.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('is-in'));
  }

  // ── 2. CARD TILT ──────────────────────────────────────────────
  if (!reduceMotion) {
    document.querySelectorAll('[data-tilt]').forEach(card => {
      let raf;
      card.addEventListener('mousemove', (e) => {
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          const r = card.getBoundingClientRect();
          const dx = (e.clientX - r.left) / r.width - 0.5;
          const dy = (e.clientY - r.top) / r.height - 0.5;
          const rotX = -dy * 4;   // degrees
          const rotY = dx * 4;
          card.style.transform = `perspective(800px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) translateZ(0)`;
        });
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }

  // ── 3. CONSTELLATION (three.js) ───────────────────────────────
  const canvas = document.getElementById('constellation-canvas');
  if (canvas && typeof THREE !== 'undefined') {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
    camera.position.set(0, 0, 18);

    // 12 schedule labels
    const LABELS = ['Assumptions','Dashboard','Income','Tax','Expenses','Cashflow',
                    'Debt','Rentals','Goals & Super','Summary','A & L','Terms'];

    // Distribute on a Fibonacci sphere
    const N = LABELS.length;
    const R = 5.5;
    const nodes = [];
    const phi = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const radius = Math.sqrt(1 - y * y);
      const theta = phi * i;
      const x = Math.cos(theta) * radius;
      const z = Math.sin(theta) * radius;
      nodes.push({
        base: new THREE.Vector3(x * R, y * R, z * R),
        pos:  new THREE.Vector3(x * R, y * R, z * R),
        i,
      });
    }

    // ── Node spheres
    const nodeGeom = new THREE.SphereGeometry(0.16, 14, 14);
    const nodeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const accentMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const meshes = nodes.map((n, i) => {
      const isHighlight = (i % 3 === 0);
      const m = new THREE.Mesh(nodeGeom, isHighlight ? accentMat : nodeMat);
      m.position.copy(n.pos);
      scene.add(m);
      return m;
    });

    // ── Halo rings (subtle)
    const ringGeom = new THREE.RingGeometry(0.34, 0.36, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, side: THREE.DoubleSide });
    const rings = nodes.map((n, i) => {
      if (i % 3 !== 0) return null;
      const r = new THREE.Mesh(ringGeom, ringMat);
      r.position.copy(n.pos);
      scene.add(r);
      return r;
    });

    // ── Edge lines (connect each node to its nearest 3 neighbours)
    const lineGeo = new THREE.BufferGeometry();
    const edges = [];
    for (let i = 0; i < N; i++) {
      const distances = [];
      for (let j = 0; j < N; j++) {
        if (i === j) continue;
        distances.push({ j, d: nodes[i].base.distanceTo(nodes[j].base) });
      }
      distances.sort((a, b) => a.d - b.d);
      for (let k = 0; k < 3; k++) {
        const j = distances[k].j;
        if (i < j) edges.push([i, j]);
      }
    }
    const edgePositions = new Float32Array(edges.length * 2 * 3);
    function updateEdgePositions() {
      let p = 0;
      for (const [a, b] of edges) {
        edgePositions[p++] = nodes[a].pos.x;
        edgePositions[p++] = nodes[a].pos.y;
        edgePositions[p++] = nodes[a].pos.z;
        edgePositions[p++] = nodes[b].pos.x;
        edgePositions[p++] = nodes[b].pos.y;
        edgePositions[p++] = nodes[b].pos.z;
      }
      lineGeo.attributes.position.needsUpdate = true;
    }
    lineGeo.setAttribute('position', new THREE.BufferAttribute(edgePositions, 3));
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.30 });
    const lines = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(lines);

    // ── Particle ring orbiting outside the sphere
    const PCOUNT = 90;
    const pGeom = new THREE.BufferGeometry();
    const pPos = new Float32Array(PCOUNT * 3);
    for (let i = 0; i < PCOUNT; i++) {
      const a = (i / PCOUNT) * Math.PI * 2;
      const wobble = Math.sin(i * 0.7) * 0.4;
      const ringR = 7.5 + wobble;
      pPos[i * 3 + 0] = Math.cos(a) * ringR;
      pPos[i * 3 + 1] = Math.sin(i * 1.3) * 1.6;
      pPos[i * 3 + 2] = Math.sin(a) * ringR;
    }
    pGeom.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({ size: 0.07, color: 0xffffff, transparent: true, opacity: 0.65, sizeAttenuation: true });
    const particles = new THREE.Points(pGeom, pMat);
    scene.add(particles);

    // ── Theme sync
    function syncTheme() {
      const ink     = cssVar('--ink',    '#1a1a1a');
      const accent  = cssVar('--accent', '#C7522A');
      const surface = cssVar('--bg',     '#F5F1E8');
      try {
        nodeMat.color.set(ink);
        accentMat.color.set(accent);
        lineMat.color.set(ink);
        ringMat.color.set(accent);
        pMat.color.set(ink);
        scene.fog = new THREE.Fog(surface, 14, 30);
      } catch (e) {}
      const isDark = new THREE.Color(surface).r * 0.299 + new THREE.Color(surface).g * 0.587 + new THREE.Color(surface).b * 0.114 < 0.4;
      lineMat.opacity = isDark ? 0.22 : 0.32;
      pMat.opacity = isDark ? 0.55 : 0.7;
      ringMat.opacity = isDark ? 0.30 : 0.40;
    }
    syncTheme();
    new MutationObserver(syncTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-palette','data-theme','class'] });

    // ── Resize
    function resize() {
      const r = canvas.getBoundingClientRect();
      const w = Math.max(1, r.width);
      const h = Math.max(1, r.height);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    new ResizeObserver(resize).observe(canvas);

    // ── Mouse parallax
    let mx = 0, my = 0;
    canvas.parentElement.addEventListener('mousemove', e => {
      const r = canvas.getBoundingClientRect();
      mx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      my = ((e.clientY - r.top) / r.height - 0.5) * 2;
    });

    // ── Animate
    const t0 = performance.now();
    let raf;
    function frame(now) {
      const t = (now - t0) / 1000;

      // Rotate the entire system slowly + parallax tilt from mouse
      const rotY = t * 0.18 + mx * 0.5;
      const rotX = Math.sin(t * 0.12) * 0.15 - my * 0.3;
      const c = Math.cos(rotY), s = Math.sin(rotY);
      const cX = Math.cos(rotX), sX = Math.sin(rotX);

      for (let i = 0; i < nodes.length; i++) {
        const b = nodes[i].base;
        // node "breathing" along its radial direction
        const breath = 1 + Math.sin(t * 0.8 + i * 0.7) * 0.04;
        let x = b.x * breath, y = b.y * breath, z = b.z * breath;
        // rotate Y
        let x2 = x * c + z * s;
        let z2 = -x * s + z * c;
        // rotate X
        let y2 = y * cX - z2 * sX;
        let z3 = y * sX + z2 * cX;
        nodes[i].pos.set(x2, y2, z3);
        meshes[i].position.copy(nodes[i].pos);
        const r = rings[i];
        if (r) {
          r.position.copy(nodes[i].pos);
          // face camera
          r.lookAt(camera.position);
          r.scale.setScalar(0.9 + Math.sin(t * 1.6 + i) * 0.15);
        }
      }
      updateEdgePositions();

      // Particle ring slow rotation
      particles.rotation.y = t * -0.06;
      particles.rotation.x = Math.sin(t * 0.05) * 0.1;

      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    }

    if (reduceMotion) {
      updateEdgePositions();
      renderer.render(scene, camera);
    } else {
      raf = requestAnimationFrame(frame);
    }

    // Pause when offscreen
    const io = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (e.isIntersecting && !raf && !reduceMotion) raf = requestAnimationFrame(frame);
        else if (!e.isIntersecting && raf) { cancelAnimationFrame(raf); raf = null; }
      }
    }, { rootMargin: '120px' });
    io.observe(canvas);
  }

  // ── 4. ROTATING HEADLINE WORD ─────────────────────────────────
  const rot = document.getElementById('rot-word');
  if (rot && !reduceMotion) {
    const words = JSON.parse(rot.dataset.words || '["modelled","forecast","compounded","stress-tested"]');
    let idx = 0;
    setInterval(() => {
      idx = (idx + 1) % words.length;
      rot.style.animation = 'none';
      // re-trigger animation
      void rot.offsetWidth;
      rot.textContent = words[idx];
      rot.style.animation = 'rot-in 0.45s ease';
    }, 2400);
  }
})();
