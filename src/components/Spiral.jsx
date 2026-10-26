'use client';

import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '@/lib/motion';
import Reveal from './Reveal';
import styles from './Spiral.module.css';

/** The helix: tiles per turn, turns, radius at the top and at the bottom. */
const PER_TURN = 15;
const TURNS = 5;
const R_TOP = 5;
const R_BOTTOM = 3.5;
const TILE_RATIO = 1.1;
const GAP = 0.35;
const SEGMENTS = 24;
const CAMERA_Z = 12;
const FOV = (75 * Math.PI) / 180;
/** Extra turn per pixel scrolled, and its cap per frame. */
const PUSH = 0.0012;
const MAX_PUSH = 0.03;

/** Atlas cells: every image is cropped into one, all in a single texture. */
const CELL_W = 384;
const CELL_H = Math.round(CELL_W * TILE_RATIO);
const ATLAS_COLS = 5;

const VERTEX = `
attribute vec3 a_position;
attribute vec3 a_normal;
attribute vec2 a_uv;
uniform mat4 u_projection;
uniform vec3 u_camera;
uniform float u_spin;
uniform float u_scale;
varying vec2 v_uv;
varying vec3 v_normal;
varying vec3 v_view;
void main() {
  float c = cos(u_spin), s = sin(u_spin);
  mat3 spin = mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c);
  vec3 world = spin * (a_position * u_scale);
  v_uv = a_uv;
  v_normal = spin * a_normal;
  v_view = u_camera - world;
  gl_Position = u_projection * vec4(world - u_camera, 1.0);
}
`;

// Tiles facing the camera are lit; the inside of the far side is dimmer.
const FRAGMENT = `
precision mediump float;
uniform sampler2D u_atlas;
varying vec2 v_uv;
varying vec3 v_normal;
varying vec3 v_view;
void main() {
  vec4 tex = texture2D(u_atlas, v_uv);
  float facing = max(dot(normalize(v_normal), normalize(v_view)), 0.0);
  float light = smoothstep(-0.2, 0.5, facing) * 0.45 + 0.42;
  gl_FragColor = vec4(mix(vec3(1.0), tex.rgb * light, 0.975) * 1.25, 1.0);
}
`;

/** Every tile of the helix as one mesh: positions, outward normals, atlas UVs. */
function buildHelix(imageCount) {
  const tiles = PER_TURN * TURNS;
  const edges = [0];
  const radius = i => R_TOP + (R_BOTTOM - R_TOP) * (i / tiles);
  const width = i => (2 * Math.PI * radius(i)) / PER_TURN;
  for (let i = 0; i < tiles; i++) edges.push(edges[i] - (width(i) * TILE_RATIO + GAP) / PER_TURN);

  const pos = [];
  const nor = [];
  const uv = [];
  const idx = [];
  const rows = Math.ceil(imageCount / ATLAS_COLS);
  for (let i = 0; i < tiles; i++) {
    const r = radius(i);
    const h = width(i) * TILE_RATIO;
    const span = width(i) / r + 0.005;
    const centerY = (edges[i] + edges[i + 1]) / 2;
    const slope = edges[i + 1] - edges[i];
    const cell = i % imageCount;
    const u0 = (cell % ATLAS_COLS) / ATLAS_COLS;
    const v0 = 1 - (Math.floor(cell / ATLAS_COLS) + 1) / rows;
    const base = pos.length / 3;
    for (let row = 0; row <= 1; row++) {
      for (let col = 0; col <= SEGMENTS; col++) {
        const t = col / SEGMENTS;
        const a = (t - 0.5) * span + (i * 2 * Math.PI) / PER_TURN;
        pos.push(Math.sin(a) * r, centerY + (row - 0.5) * h + (t - 0.5) * slope, Math.cos(a) * r);
        nor.push(Math.sin(a), 0, Math.cos(a));
        uv.push(u0 + t / ATLAS_COLS, v0 + row / rows);
      }
    }
    for (let col = 0; col < SEGMENTS; col++) {
      const a = base + col;
      const b = a + SEGMENTS + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  return { pos, nor, uv, idx, height: -edges[tiles] };
}

function perspective(aspect) {
  const f = 1 / Math.tan(FOV / 2);
  const near = 0.1;
  const far = 100;
  return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) / (near - far), -1, 0, 0, (2 * far * near) / (near - far), 0]);
}

/** Draws every image, cropped like object-fit: cover, into one atlas canvas. */
async function buildAtlas(srcs) {
  const rows = Math.ceil(srcs.length / ATLAS_COLS);
  const canvas = document.createElement('canvas');
  canvas.width = CELL_W * ATLAS_COLS;
  canvas.height = CELL_H * rows;
  const ctx = canvas.getContext('2d');
  await Promise.all(
    srcs.map(async (src, i) => {
      const img = new Image();
      img.src = `/_next/image?url=${encodeURIComponent(src)}&w=640&q=70`;
      await img.decode();
      const scale = Math.max(CELL_W / img.naturalWidth, CELL_H / img.naturalHeight);
      const w = CELL_W / scale;
      const h = CELL_H / scale;
      ctx.drawImage(img, (img.naturalWidth - w) / 2, (img.naturalHeight - h) / 2, w, h, (i % ATLAS_COLS) * CELL_W, Math.floor(i / ATLAS_COLS) * CELL_H, CELL_W, CELL_H);
    }),
  );
  return canvas;
}

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
}

/**
 * The studio's stills wound into a helix that turns slowly by itself and
 * spins faster when you scroll, while the camera sinks down along it.
 */
export default function Spiral({ images, heading }) {
  const sectionRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    const gl = canvas.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: false });
    if (!gl) return;
    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    if (!vs || !fs) return;
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const helix = buildHelix(images.length);
    const buffers = [];
    const attribute = (name, data, size) => {
      const buf = gl.createBuffer();
      buffers.push(buf);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(program, name);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    };
    attribute('a_position', helix.pos, 3);
    attribute('a_normal', helix.nor, 3);
    attribute('a_uv', helix.uv, 2);
    const indexBuffer = gl.createBuffer();
    buffers.push(indexBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(helix.idx), gl.STATIC_DRAW);

    const u = name => gl.getUniformLocation(program, name);
    const uProjection = u('u_projection');
    const uCamera = u('u_camera');
    const uSpin = u('u_spin');
    const uScale = u('u_scale');
    gl.uniform1i(u('u_atlas'), 0);
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0, 0, 0, 0);

    const texture = gl.createTexture();
    let ready = false;
    let cancelled = false;
    buildAtlas(images)
      .then(atlas => {
        if (cancelled) return;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        ready = true;
        canvas.dataset.ready = '';
      })
      .catch(() => {});

    const still = prefersReducedMotion();
    let spin = 0;
    let velocity = 0;
    let cameraY = 0;
    let lastScroll = window.scrollY;
    let inView = true;
    let raf = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniformMatrix4fv(uProjection, false, perspective(canvas.width / canvas.height));
      gl.uniform1f(uScale, Math.max(0.78, Math.min(1, section.clientWidth / 1400)));
    };

    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (!inView || !ready) return;
      const y = window.scrollY;
      // Scrolling gives the turn a push that fades away on its own.
      const delta = y - lastScroll;
      lastScroll = y;
      if (delta) velocity = Math.max(-MAX_PUSH, Math.min(MAX_PUSH, delta * PUSH));
      if (!still) {
        spin += 0.001 + velocity;
        velocity *= 0.9;
      }
      const progress = Math.min(y / (window.innerHeight * 1.25), 1);
      cameraY += (-progress * helix.height * 0.2 - cameraY) * (still ? 1 : 0.075);
      gl.uniform1f(uSpin, spin);
      gl.uniform3f(uCamera, 0, cameraY, CAMERA_Z);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.drawElements(gl.TRIANGLES, helix.idx.length, gl.UNSIGNED_SHORT, 0);
    };

    const io = new IntersectionObserver(([entry]) => (inView = entry.isIntersecting));
    io.observe(canvas);
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();
    raf = requestAnimationFrame(frame);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      buffers.forEach(b => gl.deleteBuffer(b));
      gl.deleteTexture(texture);
      gl.deleteProgram(program);
    };
  }, [images]);

  return (
    <section ref={sectionRef} className={styles.section}>
      <div className={`wrap ${styles.header}`}>
        <Reveal immediate delay={0.65}>
          <h1 className={`serif ${styles.heading}`}>{heading}</h1>
        </Reveal>
      </div>
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden />
    </section>
  );
}
