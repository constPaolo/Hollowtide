'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { prefersReducedMotion } from '@/lib/motion';
import styles from './WordLight.module.css';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const HIGHLIGHT = '60, 60, 60';
/** Share of the scroll spent writing the words in; the rest takes them away. */
const WRITE = 0.7;
/** How many words are in motion at once, writing in and taking away. */
const WAVE_IN = 15;
const WAVE_OUT = 5;

/** 0 → 1 for word `i` of `n`, as a wave `width` words wide passes through. */
function wave(t, i, n, width) {
  const scale = 1 / Math.max(1, (n - 1) / n + width / n);
  const start = (i / n) * scale;
  const end = start + (width / n) * scale;
  return Math.min(Math.max((t - start) / (end - start), 0), 1);
}

/**
 * The manifesto, held on screen while you scroll: each word first shows up
 * as a grey block, then the block melts into the word. Past the end the
 * words go back into blocks and fade.
 */
export default function WordLight({ paragraphs }) {
  const ref = useRef(null);

  useGSAP(
    () => {
      const section = ref.current;
      if (prefersReducedMotion()) {
        section.dataset.still = '';
        return;
      }
      // The text has to fit on one screen while it's held there: shrink it if it doesn't.
      const text = section.querySelector(`.${styles.text}`);
      const fit = () => {
        text.style.fontSize = '';
        const pad = getComputedStyle(section);
        const room = (section.clientHeight - parseFloat(pad.paddingTop) - parseFloat(pad.paddingBottom)) * 0.95;
        let size = parseFloat(getComputedStyle(text).fontSize);
        // Lines rewrap as the size changes, so step down until it fits.
        for (let i = 0; i < 12 && text.offsetHeight > room; i++) {
          size *= 0.92;
          text.style.fontSize = `${size}px`;
        }
      };
      fit();

      const words = [...section.querySelectorAll(`.${styles.word}`)];
      const texts = words.map(w => w.firstElementChild);
      const n = words.length;

      const paint = p => {
        words.forEach((word, i) => {
          const text = texts[i];
          if (p <= WRITE) {
            const w = wave(p / WRITE, i, n, WAVE_IN);
            const settle = w >= 0.9 ? (w - 0.9) / 0.1 : 0;
            word.style.opacity = w;
            word.style.backgroundColor = `rgba(${HIGHLIGHT}, ${1 - settle})`;
            text.style.opacity = Math.sqrt(settle);
          } else {
            const w = wave((p - WRITE) / (1 - WRITE), i, n, WAVE_OUT);
            word.style.opacity = 1;
            word.style.backgroundColor = `rgba(${HIGHLIGHT}, ${w})`;
            text.style.opacity = 1 - w;
          }
        });
      };

      ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: () => `+=${window.innerHeight * 4}`,
        pin: true,
        onRefreshInit: fit,
        onUpdate: self => paint(self.progress),
      });
      paint(0);
    },
    { scope: ref },
  );

  return (
    <section ref={ref} className={styles.section}>
      <div className={styles.text}>
        {paragraphs.map((para, p) => (
          <p key={p}>
            {para.split(/\s+/).map((word, i) => (
              <span key={i} className={styles.word}>
                <span>{word}</span>
              </span>
            ))}
          </p>
        ))}
      </div>
    </section>
  );
}
