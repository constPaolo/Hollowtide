'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useFinePointer, useReducedMotion } from '@/lib/motion';
import Nav from './Nav';
import PageTransition from './PageTransition';

gsap.registerPlugin(ScrollTrigger);

/**
 * Smooth scrolling only with a mouse or trackpad. Touch devices keep their
 * native scroll, which is faster and what people expect there.
 */
function useSmoothScroll(enabled) {
  const pathname = usePathname();

  useEffect(() => {
    if (!enabled) return;
    const lenis = new Lenis({ lerp: 0.1 });
    lenis.on('scroll', ScrollTrigger.update);
    const tick = time => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    window.__lenis = lenis;
    // The intro may already be running and holding the page still.
    if ('intro' in document.documentElement.dataset) lenis.stop();
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      delete window.__lenis;
    };
  }, [enabled]);

  useEffect(() => {
    if (window.__lenis) window.__lenis.scrollTo(0, { immediate: true });
    else window.scrollTo(0, 0);
    // New page, new layout: let triggers measure again once it has painted.
    const id = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(id);
  }, [pathname]);
}

export default function SiteShell({ children }) {
  const pathname = usePathname();
  const fine = useFinePointer();
  const reduced = useReducedMotion();
  useSmoothScroll(fine && !reduced);

  return (
    <>
      <Nav />
      <div key={pathname}>{children}</div>
      <PageTransition />
    </>
  );
}
