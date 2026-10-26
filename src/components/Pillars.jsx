'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { principles } from '@/data/studio';
import { prefersReducedMotion } from '@/lib/motion';
import Flicker from './Flicker';
import Reveal from './Reveal';
import styles from './Pillars.module.css';

gsap.registerPlugin(SplitText);

const OPEN = 52;
const SHUT = 16;
const FIRST = 1;

/**
 * Four tall panels side by side. The one under the pointer (or keyboard
 * focus) widens and its text writes itself in word by word, while the
 * others narrow and let theirs go. On narrow screens they stack, all open.
 */
export default function Pillars() {
  const ref = useRef(null);
  const [stacked, setStacked] = useState(false);
  const active = useRef(FIRST);
  const splits = useRef([]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 999px)');
    const sync = () => setStacked(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  // Side by side: size the panels and hide the words of the closed ones.
  useEffect(() => {
    const panels = [...ref.current.querySelectorAll(`.${styles.panel}`)];
    if (stacked) {
      panels.forEach(p => (p.style.flexGrow = ''));
      return;
    }
    splits.current = panels.map(p => SplitText.create(p.querySelector(`.${styles.desc}`), { type: 'words' }));
    panels.forEach((p, i) => {
      const on = i === active.current;
      p.style.flexGrow = on ? OPEN : SHUT;
      gsap.set(splits.current[i].words, { opacity: on ? 1 : 0, y: on ? 0 : 6 });
    });
    return () => {
      splits.current.forEach(s => s.revert());
      splits.current = [];
    };
  }, [stacked]);

  const open = index => {
    if (stacked || index === active.current) return;
    const before = active.current;
    active.current = index;
    const panels = [...ref.current.querySelectorAll(`.${styles.panel}`)];
    const quick = prefersReducedMotion();
    panels.forEach((p, i) =>
      gsap.to(p, { flexGrow: i === index ? OPEN : SHUT, duration: quick ? 0 : 0.6, ease: 'power3.out' }),
    );
    gsap.to(splits.current[before].words, { opacity: 0, y: 6, duration: quick ? 0 : 0.2, ease: 'power2.in', overwrite: true });
    gsap.to(splits.current[index].words, {
      opacity: 1,
      y: 0,
      duration: quick ? 0 : 0.35,
      stagger: quick ? 0 : 0.015,
      delay: quick ? 0 : 0.2,
      ease: 'power2.out',
      overwrite: true,
    });
  };

  return (
    <section className={`${styles.section} ${stacked ? styles.stacked : ''}`}>
      <div className={`wrap ${styles.head}`}>
        <Flicker>
          <p className="mono">Design pillars</p>
        </Flicker>
        <Reveal>
          <h2 className={`serif ${styles.title}`}>Four currents that pull every world under</h2>
        </Reveal>
      </div>

      <div ref={ref} className={`wrap ${styles.panels}`}>
        {principles.map((p, i) => (
          <article
            key={p.title}
            className={styles.panel}
            tabIndex={stacked ? undefined : 0}
            onMouseEnter={() => open(i)}
            onFocus={() => open(i)}
          >
            <div className={styles.media}>
              <Image src={p.image} alt="" fill sizes="(max-width: 999px) 100vw, 55vw" />
            </div>
            <div className={styles.label}>
              <span className={`mono ${styles.number}`}>{String(i + 1).padStart(2, '0')}</span>
              <h3 className={styles.name}>{p.title}</h3>
            </div>
            <div className={styles.descWrap}>
              <p className={styles.desc}>{p.text}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
