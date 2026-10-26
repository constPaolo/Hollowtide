'use client';

import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '@/lib/motion';
import Flicker from './Flicker';
import Reveal from './Reveal';
import { SMOKE_FRAGMENT, SMOKE_VERTEX } from './smoke-shader';
import styles from './Footer.module.css';

const BACKGROUND = [11 / 255, 13 / 255, 12 / 255];
const TINT = [0.82, 0.95, 0.9];
/** How far the camera leans towards the pointer, and how quickly it follows. */
const LOOK = { x: 0.58, y: 0.42, follow: 0.065 };

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  gl.deleteShader(shader);
  return null;
}

/** Random values in red, the same values shifted by (37, 17) in green: see the shader's noise(). */
function noiseTexture(gl) {
  const size = 256;
  const red = new Uint8Array(size * size);
  for (let i = 0; i < red.length; i++) red[i] = (Math.random() * 256) | 0;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      data[i] = red[y * size + x];
      data[i + 1] = red[((y - 17 + size) % size) * size + ((x - 37 + size) % size)];
    }
  }
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return tex;
}

/**
 * Starts the smoke when the footer is about a screen away, so it's already
 * moving when it comes into view, and stops it again once it's gone.
 */
function useSmoke(footerRef, canvasRef) {
  useEffect(() => {
    const footer = footerRef.current;
    const canvas = canvasRef.current;
    const touch = !window.matchMedia('(hover: hover)').matches;
    const still = prefersReducedMotion();
    const scale = touch ? 0.35 : 0.5;
    const steps = touch ? 32 : 48;

    let gl = null;
    let cleanupGL = () => {};
    let raf = 0;
    let visible = false;
    let elapsed = 0;
    let prev = 0;
    let last = 0;
    const look = { x: 0, y: 0, tx: 0, ty: 0 };
    let u = {};

    const init = () => {
      gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, powerPreference: 'low-power' });
      if (!gl) return false;
      const vs = compile(gl, gl.VERTEX_SHADER, SMOKE_VERTEX);
      const fs = compile(gl, gl.FRAGMENT_SHADER, `#define STEPS ${steps}\n${SMOKE_FRAGMENT}`);
      if (!vs || !fs) return false;
      const program = gl.createProgram();
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return false;
      gl.useProgram(program);
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const pos = gl.getAttribLocation(program, 'a_position');
      gl.enableVertexAttribArray(pos);
      gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
      const tex = noiseTexture(gl);
      for (const name of ['u_resolution', 'u_time', 'u_look', 'u_noise', 'u_background', 'u_tint']) u[name] = gl.getUniformLocation(program, name);
      gl.uniform1i(u.u_noise, 0);
      gl.uniform3fv(u.u_background, BACKGROUND);
      gl.uniform3fv(u.u_tint, TINT);
      cleanupGL = () => {
        gl.deleteTexture(tex);
        gl.deleteBuffer(buffer);
        gl.deleteProgram(program);
      };
      resize();
      canvas.dataset.ready = '';
      return true;
    };

    const resize = () => {
      if (!gl) return;
      const w = Math.max(1, Math.round(canvas.clientWidth * scale));
      const h = Math.max(1, Math.round(canvas.clientHeight * scale));
      if (canvas.width === w && canvas.height === h) return;
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      draw();
    };

    const draw = () => {
      gl.uniform2f(u.u_resolution, canvas.width, canvas.height);
      gl.uniform1f(u.u_time, elapsed / 1000);
      gl.uniform2f(u.u_look, look.x, look.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const loop = now => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(now - prev, 100);
      prev = now;
      if (!visible || document.hidden) return;
      elapsed += dt;
      const k = 1 - Math.exp(-LOOK.follow * (dt / 16.67));
      look.x += (look.tx - look.x) * k;
      look.y += (look.ty - look.y) * k;
      if (touch && now - last < 33) return;
      last = now;
      draw();
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (!visible || gl) return;
        if (!init()) {
          io.disconnect();
          return;
        }
        if (still) draw();
        else {
          prev = performance.now();
          raf = requestAnimationFrame(loop);
        }
      },
      { rootMargin: '0px 0px 100% 0px' },
    );
    io.observe(canvas);

    const onPointer = e => {
      const r = footer.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      look.tx = inside ? (((e.clientX - r.left) / r.width) * 2 - 1) * LOOK.x : 0;
      look.ty = inside ? -(((e.clientY - r.top) / r.height) * 2 - 1) * LOOK.y : 0;
    };
    if (!touch) document.addEventListener('pointermove', onPointer, { passive: true });

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('pointermove', onPointer);
      if (gl) cleanupGL();
    };
  }, [footerRef, canvasRef]);
}

/** A slow cloud of smoke behind the last words of every page. */
export default function Footer() {
  const footerRef = useRef(null);
  const canvasRef = useRef(null);
  useSmoke(footerRef, canvasRef);

  return (
    <footer ref={footerRef} className={styles.footer}>
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden />

      <div className={`wrap ${styles.content}`}>
        <Flicker>
          <p className="mono">Establish contact</p>
        </Flicker>
        <Reveal className={styles.headingWrap}>
          <h2 className={`serif ${styles.heading}`}>Let’s make something they can’t quite wake up from</h2>
        </Reveal>
      </div>

      <div className={`wrap mono ${styles.bar}`}>
        <p>© 2026 Hollowtide</p>
        <p>
          Developed by{' '}
          <a href="https://www.paolomeccariello.dev/" target="_blank" rel="noopener noreferrer">
            Paolo Meccariello
          </a>
        </p>
      </div>
    </footer>
  );
}
