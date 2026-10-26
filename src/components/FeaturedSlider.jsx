'use client';

import { useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { projects } from '@/data/projects';
import { prefersReducedMotion, useReducedMotion } from '@/lib/motion';
import styles from './FeaturedSlider.module.css';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const STRIPS = 20;
const STRIP = 100 / STRIPS;
/** Scroll per image change, plus a pause before the first and after the last. */
const PER_SLIDE = 1.2;
const HOLD = 0.3;
/** How far into a change the title switches over. */
const TITLE_AT = 0.3;

/**
 * A mask of horizontal strips. Strips start one after another from the
 * bottom of the image, and each one fills from its lower edge up.
 */
function stripMask(t) {
  const stops = [];
  for (let k = 0; k < STRIPS; k++) {
    const fromBottom = STRIPS - 1 - k;
    const fill = Math.min(Math.max((t - (fromBottom / STRIPS) * 0.5) * 2, 0), 1);
    const top = k * STRIP;
    const bottom = top + STRIP;
    // Fully open strips overlap their neighbour a touch so no hairlines show.
    const edge = fill >= 1 ? Math.max(top - 0.1, 0) : bottom - fill * STRIP;
    stops.push(`transparent ${top}%`, `transparent ${edge}%`, `#000 ${edge}%`, `#000 ${bottom}%`);
  }
  return `linear-gradient(to bottom, ${stops.join(', ')})`;
}

const setMask = (el, value) => {
  el.style.maskImage = value;
  el.style.webkitMaskImage = value;
};

/**
 * The featured worlds, one after another while the section holds still:
 * each next image comes in through horizontal strips, the image underneath
 * settles from a slight zoom, and the title rolls over to the new name.
 */
export default function FeaturedSlider() {
  const ref = useRef(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const section = ref.current;
      const layers = [...section.querySelectorAll(`.${styles.layer}`)];
      const title = section.querySelector(`.${styles.titleText}`);
      const link = section.querySelector(`.${styles.link}`);
      const changes = layers.length - 1;
      const total = changes * PER_SLIDE + HOLD * 2;

      layers.slice(1).forEach(l => setMask(l, stripMask(0)));

      // Title roll: out one way, swap, in from the other. Changes that come
      // in while it's moving wait their turn.
      let shown = 0;
      let wanted = 0;
      let rolling = false;
      const roll = () => {
        if (rolling || wanted === shown) return;
        rolling = true;
        const down = wanted > shown;
        const next = wanted;
        gsap.to(title, {
          yPercent: down ? -120 : 120,
          duration: 0.3,
          ease: 'power2.out',
          onComplete: () => {
            title.textContent = projects[next].title;
            link.href = `/work/${projects[next].slug}`;
            gsap.fromTo(
              title,
              { yPercent: down ? 120 : -120 },
              {
                yPercent: 0,
                duration: 0.3,
                ease: 'power2.out',
                onComplete: () => {
                  shown = next;
                  rolling = false;
                  roll();
                },
              },
            );
          },
        });
      };

      const update = progress => {
        // 0 → number of changes, through the scroll between the two holds.
        const pos = Math.min(Math.max((progress * total - HOLD) / PER_SLIDE, 0), changes);
        const current = Math.floor(pos);
        const t = pos - current;

        layers.forEach((layer, i) => {
          // Each image eases from 1.25 to 1 over the two changes after it appears.
          const since = pos - (i - 1);
          const img = layer.firstElementChild;
          img.style.transform = `scale(${since <= 0 ? 1.25 : since >= 2 ? 1 : 1.25 - 0.125 * since})`;
          if (i === 0) return;
          if (i - 1 < current) setMask(layer, 'none');
          else if (i - 1 === current) setMask(layer, stripMask(t));
          else setMask(layer, stripMask(0));
        });

        const index = Math.min(t >= TITLE_AT ? current + 1 : current, layers.length - 1);
        if (index !== wanted) {
          wanted = index;
          roll();
        }
      };

      ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: () => `+=${window.innerHeight * total}`,
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
        onUpdate: self => update(self.progress),
      });
      update(0);
    },
    { scope: ref },
  );

  if (reduced) {
    return (
      <section className={styles.list}>
        {projects.map(p => (
          <Link key={p.slug} href={`/work/${p.slug}`} className={styles.listItem}>
            <Image src={p.cover} alt="" fill sizes="100vw" />
            <span className={styles.listTitle}>{p.title}</span>
          </Link>
        ))}
      </section>
    );
  }

  return (
    <section ref={ref} className={styles.slider}>
      {projects.map((p, i) => (
        <div key={p.slug} className={styles.layer}>
          <Image src={p.cover} alt="" fill sizes="100vw" className={styles.img} priority={i === 0} />
        </div>
      ))}

      <div className={styles.info}>
        <div className={`wrap ${styles.row}`}>
          <p className={styles.prefix}>Featured</p>
          <div className={styles.title}>
            <p className={styles.titleText}>{projects[0].title}</p>
          </div>
          {/* A plain anchor: its href changes with the slide. */}
          <a href={`/work/${projects[0].slug}`} className={styles.link}>
            Explore
          </a>
        </div>
      </div>
    </section>
  );
}
