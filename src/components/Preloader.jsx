'use client';

import { useRef, useState } from 'react';
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import { prefersReducedMotion } from '@/lib/motion';
import styles from './Preloader.module.css';

gsap.registerPlugin(SplitText, useGSAP);

// The intro plays the first time the home page shows up after the site loads.
let firstLoad = true;

/** Seconds the hero's text should wait before it starts to appear. */
export const heroTextDelay = () => (firstLoad ? 4.85 : 0.75);

const HERO_RISE_AT = 4.5;

/** A counter that stumbles up to 100 in uneven jumps, like something loading for real. */
function runCounter(el, { startIn, duration }) {
  let value = 0;
  let timer = 0;
  let begun = 0;
  const step = () => {
    const elapsed = performance.now() - begun;
    if (elapsed >= duration * 1000) {
      el.textContent = '100';
      return;
    }
    const ceiling = Math.floor((elapsed / (duration * 1000)) * 100);
    value = Math.min(value + 5 + Math.floor(Math.random() * 25), ceiling, 100);
    el.textContent = String(value).padStart(2, '0');
    timer = setTimeout(step, 200 + Math.random() * 100);
  };
  timer = setTimeout(() => {
    begun = performance.now();
    step();
  }, startIn * 1000);
  return () => clearTimeout(timer);
}

/**
 * Two lines of copy rise in while a counter runs to 100 and a slate panel
 * grows from the centre in steps, until it overflows the screen. The whole
 * cover then lifts away like a blind and the hero rises into place.
 */
export default function Preloader() {
  const ref = useRef(null);
  const [show, setShow] = useState(firstLoad);

  useGSAP(
    () => {
      if (!show) return;
      const root = ref.current;
      const finish = () => {
        firstLoad = false;
        delete document.documentElement.dataset.intro;
        window.__lenis?.start();
        setShow(false);
      };

      const hero = [...document.querySelectorAll('[data-intro]')];
      if (prefersReducedMotion()) {
        finish();
        return;
      }

      document.documentElement.dataset.intro = '';
      requestAnimationFrame(() => window.__lenis?.stop());

      const lines = SplitText.create(root.querySelectorAll('p'), { type: 'lines', mask: 'lines' }).lines;
      gsap.set(lines, { yPercent: 100 });
      gsap.set(hero, { y: 300 });
      root.dataset.ready = '';

      const stopCounter = runCounter(root.querySelector(`.${styles.counter}`), { startIn: 2, duration: 4.5 });
      const panel = root.querySelector(`.${styles.panel}`);
      gsap.set(panel, { xPercent: -50, yPercent: -50, scale: 0 });

      const tl = gsap.timeline({ onComplete: () => setTimeout(finish, 100) });
      tl.to(lines, { yPercent: 0, duration: 1, stagger: 0.11, ease: 'power2.out', delay: 1 })
        .to(panel, { scale: 0.1, duration: 0.75, ease: 'sine.out' }, '<')
        .to(panel, { scale: 0.25, duration: 1, ease: 'sine.inOut' })
        .to(panel, { scale: 0.5, duration: 0.75, ease: 'sine.inOut' })
        .to(panel, { scale: 0.75, duration: 0.5, ease: 'sine.inOut' })
        .to(panel, { scale: 1.8, duration: 1, ease: 'sine.inOut' })
        .to(root, { clipPath: 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)', duration: 1.15, ease: 'power2.inOut' }, '-=1')
        .to(hero, { y: 0, duration: 1.15, ease: 'power2.out' }, HERO_RISE_AT);

      return () => {
        stopCounter();
        gsap.set(hero, { clearProps: 'transform' });
      };
    },
    { scope: ref, dependencies: [show] },
  );

  if (!show) return null;

  return (
    <div ref={ref} className={styles.cover} aria-hidden>
      <div className={styles.panel} />
      <div className={styles.copy}>
        <div className={styles.col}>
          <p>Worlds half-remembered, drifting at the edge of sleep, where every corridor forgets where it was leading.</p>
        </div>
        <div className={styles.col}>
          <p>Games built to linger like a dream you can’t quite reconstruct in the morning.</p>
        </div>
      </div>
      <div className={styles.count}>
        <p className={styles.counter}>00</p>
      </div>
    </div>
  );
}
