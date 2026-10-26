'use client';

import { useEffect, useRef } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import gsap from 'gsap';
import { prefersReducedMotion } from '@/lib/motion';
import { hideChars, scramble, unsplitChars } from '@/lib/scramble';

gsap.registerPlugin(ScrollTrigger);

/**
 * Short labels that flicker into place through random glyphs, when they
 * scroll into view or right away (`immediate`). Each direct text element
 * inside goes in turn.
 */
export default function Flicker({ as: Tag = 'div', children, className, delay = 0, immediate = false, gap = 0.1 }) {
  const ref = useRef(null);

  useEffect(() => {
    const root = ref.current;
    root.dataset.ready = '';
    if (prefersReducedMotion()) return;

    const targets = root.children.length ? [...root.children] : [root];
    targets.forEach(hideChars);
    const stops = [];
    const play = () => targets.forEach((el, i) => stops.push(scramble(el, { delay: delay + i * gap })));

    let trigger;
    if (immediate) play();
    else trigger = ScrollTrigger.create({ trigger: root, start: 'top 85%', once: true, onEnter: play });

    return () => {
      trigger?.kill();
      stops.forEach(stop => stop());
      targets.forEach(unsplitChars);
    };
  }, [delay, immediate, gap]);

  return (
    <Tag ref={ref} className={className} data-flicker="">
      {children}
    </Tag>
  );
}
