'use client';

import { useCallback, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { prefersReducedMotion, useReducedMotion } from '@/lib/motion';
import { Mark } from './Logo';
import LightBeam from './LightBeam';
import Reveal from './Reveal';
import styles from './LightMark.module.css';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * The section holds still while you scroll through it: a light rises behind
 * the mark, shines through its shape and throws beams across the room,
 * while the fan of rays behind keeps turning. Without WebGL, or with
 * reduced motion, the mark simply stands lit.
 */
export default function LightMark() {
  const ref = useRef(null);
  const markRef = useRef(null);
  const progress = useRef(0);
  const reduced = useReducedMotion();
  const [lit, setLit] = useState(false);
  const onReady = useCallback(() => setLit(true), []);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const touch = !window.matchMedia('(hover: hover)').matches;
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: ref.current,
          start: 'top top',
          end: touch ? '+=200%' : '+=300%',
          pin: true,
          scrub: 1.5,
          onUpdate: self => (progress.current = self.progress),
        },
      });
      tl.fromTo(`.${styles.rays}`, { opacity: 0.15, scale: 0.7, rotate: -8 }, { opacity: 1, scale: 1.15, rotate: 6, ease: 'none' }, 0).fromTo(
        `.${styles.glow}`,
        { opacity: 0.2 },
        { opacity: 1, ease: 'none' },
        0,
      );
    },
    { scope: ref },
  );

  return (
    <section ref={ref} className={styles.section} data-lit={lit ? '' : undefined}>
      <div className={styles.rays} aria-hidden />
      <div className={styles.glow} aria-hidden />
      {!reduced && <LightBeam markRef={markRef} progress={progress} onReady={onReady} />}

      <div className={`wrap ${styles.copy}`}>
        <p className="mono dim">Operational since 2024</p>
        <Reveal as="h2" className={`serif ${styles.title}`}>
          We build worlds that refuse to let you go
        </Reveal>
      </div>
      <div className={styles.stage} aria-hidden>
        <div ref={markRef} className={styles.mark}>
          <Mark height={280} />
        </div>
      </div>
      <div className={`wrap mono dim ${styles.foot}`}>
        <span>Signal intercepted</span>
        <span>Location unknown</span>
      </div>
    </section>
  );
}
