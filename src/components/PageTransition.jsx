'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import gsap from 'gsap';
import { prefersReducedMotion } from '@/lib/motion';
import styles from './PageTransition.module.css';

const COLS = 5;
const STAGGER = { each: 0.1, grid: [2, COLS], axis: 'x', from: 'start' };

/** An internal link worth animating to: same site, other page, plain left click. */
function internalTarget(event) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
  const link = event.target.closest('a[href]');
  if (!link || link.target || link.hasAttribute('download')) return null;
  const url = new URL(link.href, location.href);
  if (url.origin !== location.origin || url.pathname === location.pathname) return null;
  return url.pathname + url.search + url.hash;
}

/**
 * Between pages, two rows of blocks close over the screen from the top and
 * bottom edges, the next page loads behind them, and they open again.
 */
export default function PageTransition() {
  const ref = useRef(null);
  const router = useRouter();
  const pathname = usePathname();
  const pending = useRef(false);

  useEffect(() => {
    const blocks = ref.current.querySelectorAll(`.${styles.block}`);

    const onClick = event => {
      const href = internalTarget(event);
      if (!href) return;
      event.preventDefault();
      if (pending.current) return;
      if (prefersReducedMotion()) {
        router.push(href);
        return;
      }
      pending.current = true;
      ref.current.dataset.busy = '';
      router.prefetch(href);
      gsap.fromTo(
        blocks,
        { scaleY: 0, visibility: 'visible' },
        { scaleY: 1, duration: 1, ease: 'power4.inOut', stagger: STAGGER, onComplete: () => router.push(href) },
      );
    };

    // Capture phase, so this runs before next/link's own handler (which then
    // sees the event already handled and stays out of the way).
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [router]);

  // The new page is in place behind the blocks: open them.
  useEffect(() => {
    if (!pending.current) return;
    const blocks = ref.current.querySelectorAll(`.${styles.block}`);
    const tween = gsap.to(blocks, {
      scaleY: 0,
      duration: 1,
      ease: 'power4.inOut',
      stagger: STAGGER,
      delay: 0.05,
      onComplete: () => {
        gsap.set(blocks, { visibility: 'hidden' });
        delete ref.current.dataset.busy;
        pending.current = false;
      },
    });
    return () => tween.kill();
  }, [pathname]);

  return (
    <div ref={ref} className={styles.grid} aria-hidden>
      {[0, 1].map(row => (
        <div key={row} className={styles.row}>
          {Array.from({ length: COLS }, (_, i) => (
            <div key={i} className={styles.block} />
          ))}
        </div>
      ))}
    </div>
  );
}
