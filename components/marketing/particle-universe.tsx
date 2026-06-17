"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export function ParticleUniverse() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const W = mount.clientWidth;
    const H = mount.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, W / H, 0.1, 2000);
    camera.position.z = 500;

    // ── Starfield (deep background) ──────────────────────────────────────────
    const starCount = 3000;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i++) {
      starPos[i] = (Math.random() - 0.5) * 3000;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.6, transparent: true, opacity: 0.5 });
    scene.add(new THREE.Points(starGeo, starMat));

    // ── Neon particle field (midground) ──────────────────────────────────────
    const count = 1800;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    // AdHunter accent + neon cyans/purples
    const palette = [
      new THREE.Color(0xe8390e), // ember
      new THREE.Color(0x00d4ff), // neon cyan
      new THREE.Color(0x7b2fff), // electric violet
      new THREE.Color(0xff2d78), // neon magenta
      new THREE.Color(0x00ff9d), // matrix green
    ];

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3]     = (Math.random() - 0.5) * 1400;
      positions[i3 + 1] = (Math.random() - 0.5) * 900;
      positions[i3 + 2] = (Math.random() - 0.5) * 600;

      velocities[i3]     = (Math.random() - 0.5) * 0.08;
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.08;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.04;

      const c = palette[Math.floor(Math.random() * palette.length)];
      colors[i3]     = c.r;
      colors[i3 + 1] = c.g;
      colors[i3 + 2] = c.b;
    }

    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 2.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true,
    });
    const particles = new THREE.Points(geo, mat);
    scene.add(particles);

    // ── Nebula mesh (background blobs) ───────────────────────────────────────
    const nebulaMeshes: THREE.Mesh[] = [];
    const nebulaColors = [0x1a0533, 0x0d1a33, 0x1a0d00];
    for (let i = 0; i < 3; i++) {
      const ng = new THREE.SphereGeometry(180 + i * 60, 8, 8);
      const nm = new THREE.MeshBasicMaterial({
        color: nebulaColors[i],
        transparent: true,
        opacity: 0.18,
        wireframe: false,
      });
      const mesh = new THREE.Mesh(ng, nm);
      mesh.position.set((i - 1) * 350, (Math.random() - 0.5) * 200, -300 - i * 100);
      scene.add(mesh);
      nebulaMeshes.push(mesh);
    }

    // ── Mouse parallax ────────────────────────────────────────────────────────
    const mouse = { x: 0, y: 0 };
    const onMouseMove = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.y = -(e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMouseMove);

    // ── Resize ────────────────────────────────────────────────────────────────
    const onResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    let frame = 0;
    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      frame++;

      const pos = geo.attributes.position as THREE.BufferAttribute;
      const vel = velocities;

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        pos.array[i3]     += vel[i3];
        pos.array[i3 + 1] += vel[i3 + 1];
        pos.array[i3 + 2] += vel[i3 + 2];

        // wrap
        if (Math.abs(pos.array[i3])     > 700) vel[i3]     *= -1;
        if (Math.abs(pos.array[i3 + 1]) > 450) vel[i3 + 1] *= -1;
        if (Math.abs(pos.array[i3 + 2]) > 300) vel[i3 + 2] *= -1;
      }
      pos.needsUpdate = true;

      // Slow camera parallax from mouse
      camera.position.x += (mouse.x * 30 - camera.position.x) * 0.02;
      camera.position.y += (mouse.y * 20 - camera.position.y) * 0.02;

      // Slowly rotate the whole particle cloud
      particles.rotation.y = frame * 0.0003;
      particles.rotation.x = frame * 0.0001;

      // Nebula pulse
      nebulaMeshes.forEach((m, i) => {
        const nm = m.material as THREE.MeshBasicMaterial;
        nm.opacity = 0.12 + 0.07 * Math.sin(frame * 0.008 + i * 2);
      });

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      geo.dispose();
      mat.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        background: "radial-gradient(ellipse at 20% 50%, #0d0520 0%, #000005 40%, #000000 100%)",
      }}
    />
  );
}
