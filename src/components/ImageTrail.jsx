'use client';

import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '@/lib/motion';
import styles from './ImageTrail.module.css';

const SLICES = 10;
const SIZE = 175;
const LIFESPAN = 1000;
const OPEN_MS = 750;
const CLOSE_MS = 1000;
const OPEN_STAGGER = 100;
const CLOSE_STAGGER = 25;
const SLIDE_MS = 1000;
const EASE = 'cubic-bezier(0.87, 0, 0.13, 1)';
const SLIDE_EASE = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';

/** Small optimised version of a still, through Next's image endpoint. */
const thumb = src => `/_next/image?url=${encodeURIComponent(src)}&w=384&q=70`;

/** A horizontal band of the square, closed to a vertical line in the middle or fully open. */
const band = (i, open) => {
  const top = i * (100 / SLICES);
  const bottom = top + 100 / SLICES;
  return open ? `polygon(0% ${top}%, 100% ${top}%, 100% ${bottom}%, 0% ${bottom}%)` : `polygon(50% ${top}%, 50% ${top}%, 50% ${bottom}%, 50% ${bottom}%)`;
};

/**
 * Stills that open along the pointer's path, band by band from the middle
 * out, glide after it for a moment and close again. With a finger, they
 * follow your touch, and on touch screens they also surface on their own
 * now and then so the page is never empty.
 */
export default function ImageTrail({ images }) {
  const ref = useRef(null);

  useEffect(() => {
    const root = ref.current;
    const reduced = prefersReducedMotion();
    const touch = !window.matchMedia('(hover: hover)').matches;
    const threshold = touch ? 90 : 150;
    const live = [];
    const timers = new Set();
    const later = (fn, ms) => {
      const id = setTimeout(() => {
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
    };

    let next = 0;
    const pointer = { x: 0, y: 0 };
    const eased = { x: 0, y: 0 };
    let lastSpawn = null;

    const spawn = (fromX, fromY, toX, toY) => {
      const box = root.getBoundingClientRect();
      const el = document.createElement('div');
      el.className = styles.still;
      el.style.left = `${fromX - box.left - SIZE / 2}px`;
      el.style.top = `${fromY - box.top - SIZE / 2}px`;
      el.style.transition = `left ${SLIDE_MS}ms ${SLIDE_EASE}, top ${SLIDE_MS}ms ${SLIDE_EASE}`;
      const src = thumb(images[next]);
      next = (next + 1) % images.length;

      const slices = Array.from({ length: SLICES }, (_, i) => {
        const slice = document.createElement('div');
        slice.className = styles.slice;
        slice.style.clipPath = band(i, reduced);
        slice.style.transition = `clip-path ${OPEN_MS}ms ${EASE}`;
        const img = document.createElement('div');
        img.className = styles.image;
        img.style.backgroundImage = `url("${src}")`;
        slice.append(img);
        el.append(slice);
        return slice;
      });
      root.append(el);

      requestAnimationFrame(() => {
        el.style.left = `${toX - box.left - SIZE / 2}px`;
        el.style.top = `${toY - box.top - SIZE / 2}px`;
        // Bands open from the middle outwards.
        slices.forEach((s, i) => later(() => (s.style.clipPath = band(i, true)), Math.abs(i - 4.5) * OPEN_STAGGER));
      });
      live.push({ el, slices, closeAt: performance.now() + LIFESPAN });
    };

    const close = item => {
      // Outer bands close first, the middle last; the picture dims as it goes.
      item.slices.forEach((s, i) => {
        s.style.transition = `clip-path ${CLOSE_MS}ms ${EASE}`;
        s.firstChild.style.transition = `opacity ${CLOSE_MS}ms ${EASE}`;
        s.firstChild.style.opacity = '0.25';
        later(() => (s.style.clipPath = band(i, false)), (4.5 - Math.abs(i - 4.5)) * CLOSE_STAGGER);
      });
      later(() => item.el.remove(), CLOSE_MS + 120);
    };

    let raf = 0;
    const tick = now => {
      raf = requestAnimationFrame(tick);
      eased.x += (pointer.x - eased.x) * 0.1;
      eased.y += (pointer.y - eased.y) * 0.1;
      if (live.length && now >= live[0].closeAt) close(live.shift());
    };

    const onMove = e => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      if (!lastSpawn) {
        eased.x = pointer.x;
        eased.y = pointer.y;
        lastSpawn = { ...pointer };
        return;
      }
      if (Math.hypot(pointer.x - lastSpawn.x, pointer.y - lastSpawn.y) < threshold) return;
      const box = root.getBoundingClientRect();
      if (pointer.y < box.top || pointer.y > box.bottom) return;
      spawn(eased.x, eased.y, pointer.x, pointer.y);
      lastSpawn = { ...pointer };
    };

    document.addEventListener('pointermove', onMove, { passive: true });
    raf = requestAnimationFrame(tick);

    // Ambient mode for touch screens: a still now and then at a random spot.
    if (touch) {
      const ambient = () => {
        const box = root.getBoundingClientRect();
        const x = box.left + box.width * (0.2 + Math.random() * 0.6);
        const y = box.top + box.height * (0.25 + Math.random() * 0.5);
        spawn(x, y, x, y);
        later(ambient, 900 + Math.random() * 600);
      };
      later(ambient, 600);
    }

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('pointermove', onMove);
      timers.forEach(clearTimeout);
      live.forEach(item => item.el.remove());
    };
  }, [images]);

  return <div ref={ref} className={styles.trail} aria-hidden />;
}
