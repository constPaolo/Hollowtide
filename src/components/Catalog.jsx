'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { projects } from '@/data/projects';
import { prefersReducedMotion } from '@/lib/motion';
import { hideChars, scramble, unsplitChars } from '@/lib/scramble';
import styles from './Catalog.module.css';

gsap.registerPlugin(SplitText);

const VERTEX = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

// The next image dissolves in from the top through a ragged, noisy edge.
// Behind the edge the old picture keeps drifting closer; in front of it the
// new one settles from a slight zoom, and the edge itself bends the light.
const FRAGMENT = `
precision mediump float;
uniform sampler2D u_from;
uniform sampler2D u_to;
uniform float u_progress;
uniform vec2 u_cover;
varying vec2 v_uv;

float hash(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + 1.0), f.x), f.y);
}

void main() {
  vec2 p = (v_uv - 0.5) * u_cover + 0.5;
  float rough = noise(p * 4.0) * 0.6 + noise(p * 11.0) * 0.4;
  // 0 at the top of the frame, 1 at the bottom, roughened.
  float depth = (1.0 - p.y) * 0.65 + rough * 0.35;
  float front = u_progress * 1.5 - 0.25;
  float reveal = 1.0 - smoothstep(front - 0.08, front + 0.08, depth);
  float edge = reveal * (1.0 - reveal) * 4.0;

  vec2 bend = vec2(0.0, edge * 0.025);
  vec4 before = texture2D(u_from, (p - 0.5) * (1.0 - 0.18 * u_progress) + 0.5 + bend);
  vec4 after = texture2D(u_to, (p - 0.5) * (0.85 + 0.15 * u_progress) + 0.5 - bend);
  gl_FragColor = mix(before, after, reveal) + edge * 0.06;
}
`;

const yearOf = p => p.years.split(/[–-]/).pop().trim();

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
}

/** The two-texture zoom wipe. Returns { go(from, to), dispose } or null without WebGL. */
function createStage(canvas, srcs, onReady) {
  const gl = canvas.getContext('webgl', { antialias: false, depth: false });
  if (!gl) return null;
  const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const pos = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(pos);
  gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
  const uProgress = gl.getUniformLocation(program, 'u_progress');
  const uCover = gl.getUniformLocation(program, 'u_cover');
  gl.uniform1i(gl.getUniformLocation(program, 'u_from'), 0);
  gl.uniform1i(gl.getUniformLocation(program, 'u_to'), 1);

  const textures = [];
  let aspect = 1;
  let from = 0;
  let to = 0;
  const state = { progress: 0 };
  let disposed = false;

  const draw = () => {
    if (disposed || textures.length < srcs.length) return;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures[from]);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, textures[to]);
    gl.uniform1f(uProgress, state.progress);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    // Crop like object-fit: cover.
    const view = canvas.height / canvas.width;
    gl.uniform2f(uCover, view > aspect ? aspect / view : 1, view > aspect ? 1 : view / aspect);
    draw();
  };

  Promise.all(
    srcs.map(src => {
      // window.Image: plain <img>, not next/image's component of the same name.
      const img = new window.Image();
      img.src = `/_next/image?url=${encodeURIComponent(src)}&w=1920&q=75`;
      return img.decode().then(() => img);
    }),
  )
    .then(imgs => {
      if (disposed) return;
      aspect = imgs[0].naturalHeight / imgs[0].naturalWidth;
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      imgs.forEach(img => {
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        textures.push(tex);
      });
      resize();
      onReady();
    })
    .catch(() => {});

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  return {
    go(a, b, quick) {
      from = a;
      to = b;
      gsap.killTweensOf(state);
      gsap.fromTo(
        state,
        { progress: 0 },
        {
          progress: 1,
          duration: quick ? 0 : 1.5,
          ease: 'power2.out',
          onUpdate: draw,
          onComplete: () => {
            from = b;
            state.progress = 0;
            draw();
          },
        },
      );
    },
    dispose() {
      disposed = true;
      ro.disconnect();
      gsap.killTweensOf(state);
      textures.forEach(t => gl.deleteTexture(t));
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    },
  };
}

/** Masked line spans for the slide-up reveal (description and tags). */
function splitLines(els) {
  return [...els].map(el => SplitText.create(el, { type: 'lines', mask: 'lines' }));
}

/**
 * The catalogue as a full-screen slideshow: click anywhere (or the button)
 * for the next world. The picture zooms through to the next one while the
 * old text flickers and slides away and the new text comes in.
 */
export default function Catalog() {
  const sectionRef = useRef(null);
  const canvasRef = useRef(null);
  const contentRef = useRef(null);
  const stage = useRef(null);
  const busy = useRef(false);
  const entered = useRef(false);
  const [index, setIndex] = useState(0);
  const [glReady, setGlReady] = useState(false);
  const project = projects[index];

  useEffect(() => {
    stage.current = createStage(
      canvasRef.current,
      projects.map(p => p.cover),
      () => setGlReady(true),
    );
    return () => stage.current?.dispose();
  }, []);

  // Bring the current slide's text in: the first one with a line reveal,
  // later ones with the title flickering in.
  useLayoutEffect(() => {
    const root = contentRef.current;
    const title = root.querySelector(`.${styles.title}`);
    const lines = root.querySelectorAll(`.${styles.desc} > p, .${styles.tags} p`);
    const link = root.querySelector(`.${styles.link}`);
    const tags = [...root.querySelectorAll(`.${styles.tags} p`)];
    root.dataset.ready = '';
    if (prefersReducedMotion()) {
      busy.current = false;
      return;
    }

    const stops = [];
    let splits = [];
    let tl;
    const first = !entered.current;
    entered.current = true;

    if (first) {
      splits = splitLines([title, root.querySelector(`.${styles.desc} > p`)]);
      tags.forEach(hideChars);
      hideChars(link);
      const spans = splits.flatMap(s => s.lines);
      gsap.set(spans, { yPercent: 120 });
      tl = gsap.timeline({ delay: 0.85, onComplete: () => (busy.current = false) });
      tl.to(spans, { yPercent: 0, duration: 0.75, ease: 'power3.out', stagger: 0.05 });
      tags.forEach((tag, i) => tl.add(() => stops.push(scramble(tag)), 0.35 + i * 0.06));
      tl.add(() => stops.push(scramble(link)), 0.35 + tags.length * 0.06);
    } else {
      splits = splitLines(lines);
      const spans = splits.flatMap(s => s.lines);
      gsap.set(spans, { yPercent: 120 });
      hideChars(title);
      hideChars(link);
      tl = gsap.timeline({ onComplete: () => (busy.current = false) });
      tl.add(() => stops.push(scramble(title, { tick: 30, cycles: 4 })), 0);
      tl.to(spans, { yPercent: 0, duration: 0.6, stagger: 0.04, ease: 'power3.out' }, 0.2);
      tl.add(() => stops.push(scramble(link, { tick: 30, cycles: 4 })), 0.5);
    }

    return () => {
      tl.kill();
      stops.forEach(stop => stop());
      splits.forEach(s => s.revert());
      [title, link, ...tags].forEach(unsplitChars);
    };
  }, [index]);

  const next = () => {
    if (busy.current) return;
    busy.current = true;
    const to = (index + 1) % projects.length;
    const quick = prefersReducedMotion();
    stage.current?.go(index, to, quick);
    if (quick) {
      setIndex(to);
      return;
    }

    // Take the current text away, then switch.
    const root = contentRef.current;
    const title = root.querySelector(`.${styles.title}`);
    const link = root.querySelector(`.${styles.link}`);
    const splits = splitLines(root.querySelectorAll(`.${styles.desc} > p, .${styles.tags} p`));
    scramble(title, { mode: 'out', tick: 25, stagger: 20, cycles: 3 });
    scramble(link, { mode: 'out', delay: 0.05, tick: 10, stagger: 20, cycles: 2 });
    const lines = gsap.to(
      splits.flatMap(s => s.lines),
      { yPercent: -120, duration: 0.5, stagger: 0.025, ease: 'power3.in' },
    );
    Promise.all([lines.then(), new Promise(r => setTimeout(r, 400))]).then(() => {
      splits.forEach(s => s.revert());
      [title, link].forEach(unsplitChars);
      setIndex(to);
    });
  };

  return (
    <section
      ref={sectionRef}
      className={styles.slider}
      onClick={e => !e.target.closest('a, button') && next()}
    >
      <Image src={project.cover} alt="" fill sizes="100vw" priority className={styles.still} />
      <canvas ref={canvasRef} className={styles.canvas} data-ready={glReady ? '' : undefined} aria-hidden />

      <div ref={contentRef} key={index} className={styles.content}>
        <div className={styles.inner}>
          <h1 className={`serif ${styles.title}`}>{project.title}</h1>
          <div className={styles.desc}>
            <p>{project.teaser}</p>
            <div className={styles.tags}>
              <p className="mono">Type. {project.kind}</p>
              <p className="mono">Field. {project.theme}</p>
              <p className="mono">Date. {yearOf(project)}</p>
            </div>
            <a href={`/work/${project.slug}`} className={`mono ${styles.link}`} onMouseEnter={e => !prefersReducedMotion() && scramble(e.currentTarget, { mode: 'shuffle', tick: 25, stagger: 10 })}>
              [ View full brief ]
            </a>
          </div>
        </div>
      </div>

      <div className={`wrap mono ${styles.foot}`}>
        <p>Selected catalog</p>
        <button type="button" className="mono" onClick={next}>
          [ Click through ]
        </button>
      </div>
    </section>
  );
}
