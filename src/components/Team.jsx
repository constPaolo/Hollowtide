'use client';

import { useRef } from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { team } from '@/data/studio';
import { prefersReducedMotion } from '@/lib/motion';
import Flicker from './Flicker';
import Reveal from './Reveal';
import styles from './Team.module.css';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/** The visible part of the circle the cards travel on: 72° around its top. */
const ARC = Math.PI * 0.4;
const ARC_START = Math.PI / 2 - ARC / 2;

/**
 * The team rides across the screen on the rim of a huge wheel while the
 * section holds still: cards come up from the right, pass over the title
 * and sink away to the left, tilting with the curve.
 */
export default function Team() {
  const ref = useRef(null);

  useGSAP(
    () => {
      const section = ref.current;
      if (prefersReducedMotion()) {
        section.dataset.still = '';
        return;
      }
      const cards = [...section.querySelectorAll(`.${styles.card}`)];
      const n = cards.length;

      const place = progress => {
        const vw = window.innerWidth;
        const radius = vw < 900 ? vw * 3 : vw * 1.1;
        // Even spacing along the rim, based on the card's actual width.
        const width = cards[0].offsetWidth;
        const gap = (width * 1.35) / (radius * ARC);
        const from = -gap * (n - 1);
        const along = from + progress * (1 - from);

        cards.forEach((card, i) => {
          const angle = ARC_START + ARC * ((n - 1 - i) * gap + along);
          gsap.set(card, {
            xPercent: -50,
            x: Math.cos(angle) * radius,
            y: radius - Math.sin(angle) * radius,
            rotation: (Math.PI / 2 - angle) * (180 / Math.PI),
          });
        });
      };

      let last = 0;
      ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: () => `+=${window.innerHeight * 3.5}`,
        pin: true,
        scrub: true,
        invalidateOnRefresh: true,
        onUpdate: self => place((last = self.progress)),
        onRefresh: () => place(last),
      });
      place(0);
    },
    { scope: ref },
  );

  return (
    <section ref={ref} className={styles.section} aria-labelledby="team-heading">
      <div className={styles.head}>
        <Flicker>
          <p className="mono">The dreamers</p>
        </Flicker>
        <Reveal>
          <h2 id="team-heading" className={`serif ${styles.title}`}>
            Behind the tide
          </h2>
        </Reveal>
      </div>

      <ul className={styles.cards}>
        {team.map(m => (
          <li key={m.name} className={styles.card}>
            <div className={styles.photo}>
              <Image src={m.photo} alt={m.name} fill sizes="(max-width: 1000px) 68vw, 400px" />
            </div>
            <div className={styles.meta}>
              <p className={styles.name}>{m.name}</p>
              <p className="mono dim">{m.role}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className={`wrap mono ${styles.foot}`}>
        <p>Still dreaming</p>
        <p>Awake: none</p>
      </div>
    </section>
  );
}
