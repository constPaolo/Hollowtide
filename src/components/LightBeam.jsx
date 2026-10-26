'use client';

import { useEffect, useRef } from 'react';
import { MARK_H, MARK_PATH, MARK_W } from './Logo';
import styles from './LightMark.module.css';

const VERTEX = `
attribute vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`;

// A soft, flickering light that only shows through the shape of the mark,
// smeared outwards from the light's position into beams.
const FRAGMENT = `
precision highp float;
uniform sampler2D u_mask;
uniform vec2 u_resolution;
uniform vec2 u_light;
uniform float u_radius;
uniform float u_time;
uniform float u_rays;

float hash(vec2 p) {
  p = fract(p * vec2(0.1031, 0.1030));
  p += dot(p, p.yx + 33.33);
  return fract((p.x + p.y) * p.x);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + 1.0), f.x), f.y);
}

float source(vec2 uv) {
  float aspect = u_resolution.x / u_resolution.y;
  vec2 d = (uv - u_light) * vec2(aspect, 1.0) / u_radius;
  float f = pow(smoothstep(1.0, 0.0, length(d)), 4.0);
  float n = noise(d * 3.5 + vec2(u_time * 0.7, -u_time * 0.5));
  n = mix(n, noise(d * 7.0 - u_time * 0.9), 0.35) * 0.5 + 0.5;
  return f * n * texture2D(u_mask, uv).a;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float light = source(uv);

  vec2 step = (uv - u_light) * DENSITY / float(SAMPLES);
  vec2 p = uv;
  float decay = 1.0;
  float beams = 0.0;
  for (int i = 0; i < SAMPLES; i++) {
    p -= step;
    beams += source(p) * decay;
    decay *= DECAY;
  }

  float v = clamp(light + beams * u_rays, 0.0, 1.0);
  gl_FragColor = vec4(vec3(0.93, 0.92, 0.906) * v, v);
}
`;

const MAX_DPR = 2;
const RES_SCALE = 0.5;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  gl.deleteShader(shader);
  return null;
}

function buildProgram(gl, defines) {
  const source = defines + FRAGMENT;
  const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fs =
    compile(gl, gl.FRAGMENT_SHADER, source) ||
    compile(gl, gl.FRAGMENT_SHADER, source.replace('precision highp float;', 'precision mediump float;'));
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  return gl.getProgramParameter(program, gl.LINK_STATUS) ? program : null;
}

/**
 * The light behind the mark. `progress` (0 → 1, from the pinned scroll)
 * moves the light from the bottom of the mark to the top: the beams build
 * up over the first quarter and die out over the last one. The mark's
 * position is read from `markRef`, so the CSS layout decides where it sits.
 */
export default function LightBeam({ markRef, progress, onReady }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const mark = markRef.current;
    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, depth: false, stencil: false, antialias: false });
    if (!gl || !mark) return;

    const touch = !window.matchMedia('(hover: hover)').matches;
    const program = buildProgram(
      gl,
      `#define SAMPLES ${touch ? 28 : 48}\n#define DENSITY 0.9\n#define DECAY ${touch ? '0.93' : '0.95'}\n`,
    );
    if (!program) return;

    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const u = name => gl.getUniformLocation(program, name);
    const uResolution = u('u_resolution');
    const uLight = u('u_light');
    const uRadius = u('u_radius');
    const uTime = u('u_time');
    const uRays = u('u_rays');
    gl.uniform1i(u('u_mask'), 0);

    // The mark's silhouette, drawn with the same path as the SVG.
    const maskCanvas = document.createElement('canvas');
    const maskCtx = maskCanvas.getContext('2d');
    const markPath = new Path2D(MARK_PATH);
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    let box = null;
    let scale = 1;

    const updateMask = () => {
      const c = canvas.getBoundingClientRect();
      const m = mark.getBoundingClientRect();
      const next = { x: m.left - c.left, y: m.top - c.top, w: m.width, h: m.height };
      if (box && Math.abs(next.x - box.x) < 0.5 && Math.abs(next.y - box.y) < 0.5 && Math.abs(next.w - box.w) < 0.5) return;
      box = next;
      maskCanvas.width = canvas.width;
      maskCanvas.height = canvas.height;
      maskCtx.setTransform(1, 0, 0, 1, 0, 0);
      maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
      maskCtx.setTransform(
        (box.w / MARK_W) * scale,
        0,
        0,
        (box.h / MARK_H) * scale,
        box.x * scale,
        box.y * scale,
      );
      maskCtx.fill(markPath);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, maskCanvas);
    };

    let elapsed = 0;

    const draw = () => {
      updateMask();
      const p = progress.current;
      const build = Math.min(p / 0.25, 1);
      const drop = Math.min(Math.max((p - 0.25) / 0.5, 0), 1);
      const fade = Math.max((p - 0.75) / 0.25, 0);
      const t = elapsed / 1000;

      const cssW = canvas.width / scale;
      const cssH = canvas.height / scale;
      const x = box.x + box.w / 2 + Math.cos(t * 0.7) * box.w * 0.046;
      const y = box.y + box.h - box.h * drop;

      gl.uniform2f(uResolution, canvas.width, canvas.height);
      gl.uniform2f(uLight, x / cssW, 1 - y / cssH);
      gl.uniform1f(uRadius, (box.h * 3.3) / cssH);
      gl.uniform1f(uTime, t);
      gl.uniform1f(uRays, 0.065 * build * (1 - fade));
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const resize = () => {
      scale = Math.min(window.devicePixelRatio || 1, MAX_DPR) * RES_SCALE;
      const w = Math.max(1, Math.round(canvas.clientWidth * scale));
      const h = Math.max(1, Math.round(canvas.clientHeight * scale));
      if (canvas.width === w && canvas.height === h) return;
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      box = null;
      draw();
    };

    const frameGap = touch ? 33 : 0;
    let raf = 0;
    let last = 0;
    let prev = performance.now();
    let inView = false;

    const loop = now => {
      raf = requestAnimationFrame(loop);
      const dt = now - prev;
      prev = now;
      if (!inView || document.hidden) return;
      elapsed += Math.min(dt, 100);
      if (now - last < frameGap) return;
      last = now;
      draw();
    };

    const io = new IntersectionObserver(([entry]) => (inView = entry.isIntersecting));
    io.observe(canvas);
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    window.addEventListener('resize', resize);

    resize();
    draw();
    onReady?.();
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener('resize', resize);
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, [markRef, progress, onReady]);

  return <canvas ref={canvasRef} className={styles.beam} aria-hidden />;
}
