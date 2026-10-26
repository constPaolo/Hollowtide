'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import { prefersReducedMotion } from '@/lib/motion';

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

/**
 * Text that rises line by line from behind a mask, when it scrolls into
 * view or right away (`immediate`). With several text blocks inside, all
 * their lines go in one sequence. Lines are re-split on resize and once fonts load, so
 * wrapping stays correct on every screen.
 */
export default function Reveal({ as: Tag = 'div', children, className, delay = 0, immediate = false, start = 'top 80%' }) {
  const ref = useRef(null);

  useGSAP(
    () => {
      const root = ref.current;
      if (prefersReducedMotion()) {
        root.dataset.ready = '';
        return;
      }
      // The innermost text blocks, wherever they sit inside the wrapper.
      const blocks = [...root.querySelectorAll('h1, h2, h3, h4, p, li')].filter(el => !el.querySelector('h1, h2, h3, h4, p, li'));
      SplitText.create(blocks.length ? blocks : root, {
        type: 'lines',
        mask: 'lines',
        linesClass: 'reveal-line',
        autoSplit: true,
        // Returning the tween lets SplitText carry its progress over a re-split.
        onSplit: self => {
          root.dataset.ready = '';
          return gsap.from(self.lines, {
            yPercent: 110,
            duration: 0.75,
            ease: 'power3.out',
            stagger: 0.05,
            delay,
            scrollTrigger: immediate ? undefined : { trigger: root, start, once: true },
          });
        },
      });
    },
    { scope: ref },
  );

  return (
    <Tag ref={ref} className={className} data-reveal="">
      {children}
    </Tag>
  );
}
