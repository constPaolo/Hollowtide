'use client';

import { useState } from 'react';
import Aurora from './Aurora';
import { heroTextDelay } from './Preloader';
import Reveal from './Reveal';
import styles from './Hero.module.css';

/**
 * The aurora with the logo in the middle. On the first visit everything
 * waits for the intro, then rises into place; the text follows.
 */
export default function Hero() {
  const [delay] = useState(heroTextDelay);

  return (
    <section className={styles.hero}>
      <div className={styles.sky} data-intro="">
        <Aurora />
      </div>

      <div className={styles.tagline} data-intro="">
        <Reveal className={`wrap ${styles.taglineRow}`} immediate delay={delay}>
          <p>Worlds that forget themselves</p>
          <p>And so will you</p>
        </Reveal>
      </div>

      <div className={styles.logo} data-intro="">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-type.png" alt="Hollowtide" width={488} height={419} fetchPriority="high" />
      </div>

      <div className={`wrap ${styles.foot}`} data-intro="">
        <Reveal immediate delay={delay}>
          <p>Hollowtide builds dreamlike games where memory erodes and nothing stays where you left it.</p>
        </Reveal>
      </div>
    </section>
  );
}
