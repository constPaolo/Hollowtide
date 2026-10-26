'use client';

import { useEffect, useRef } from 'react';
import { AURORA_SHADER } from './aurora-shader';
import styles from './Aurora.module.css';

const VERTEX = `
attribute vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`;

/** The shader renders at a fraction of the device resolution; it's soft anyway. */
const RES_SCALE = 0.35;
const MAX_DPR = 2;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  gl.deleteShader(shader);
  return null;
}

function buildProgram(gl) {
  const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
  // Some older mobile GPUs have no highp in fragment shaders: retry in mediump.
  const fs =
    compile(gl, gl.FRAGMENT_SHADER, AURORA_SHADER) ||
    compile(gl, gl.FRAGMENT_SHADER, AURORA_SHADER.replace('precision highp float;', 'precision mediump float;'));
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  return gl.getProgramParameter(program, gl.LINK_STATUS) ? program : null;
}

/**
 * Full-bleed aurora behind the hero. Pauses when off-screen or in a hidden
 * tab, draws one still frame for reduced motion, runs at 30fps on touch
 * devices to spare the battery, and falls back to a CSS gradient when
 * WebGL isn't available.
 */
export default function Aurora() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas.getContext('webgl', { alpha: false, depth: false, stencil: false, antialias: false, powerPreference: 'low-power' });
    if (!gl) return;
    const program = buildProgram(gl);
    if (!program) return;

    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const uResolution = gl.getUniformLocation(program, 'u_resolution');
    const uTime = gl.getUniformLocation(program, 'u_time');

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const frameGap = window.matchMedia('(hover: hover)').matches ? 0 : 33;

    let raf = 0;
    let last = 0;
    let inView = true;
    // Shader time only advances while it's actually running.
    let elapsed = 0;
    let prev = performance.now();

    const draw = () => {
      gl.uniform2f(uResolution, canvas.width, canvas.height);
      gl.uniform1f(uTime, elapsed / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

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

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr * RES_SCALE));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr * RES_SCALE));
      if (canvas.width === w && canvas.height === h) return;
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      draw();
    };

    const io = new IntersectionObserver(([entry]) => (inView = entry.isIntersecting));
    io.observe(canvas);
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    // ResizeObserver misses zoom and some post-rotation sizes on mobile.
    window.addEventListener('resize', resize);

    resize();
    draw();
    canvas.dataset.ready = '';
    if (!still) raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener('resize', resize);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, []);

  return (
    <div className={styles.aurora} aria-hidden>
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
}
