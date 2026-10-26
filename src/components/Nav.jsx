'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { prefersReducedMotion } from '@/lib/motion';
import { hideChars, scramble, unsplitChars } from '@/lib/scramble';
import styles from './Nav.module.css';

const pages = [
  { href: '/', label: 'Index' },
  { href: '/studio', label: 'Studio' },
  { href: '/work', label: 'Catalog' },
  { href: '/contact', label: 'Connect' },
];

const elsewhere = [
  { href: 'https://github.com/constPaolo', label: 'GitHub' },
  { href: 'https://www.instagram.com/paolo__who/', label: 'Feed' },
  { href: 'https://www.linkedin.com/in/paolo-meccariello-6a65b6180/', label: 'LinkedIn' },
];

const FLICKER = { stagger: 25, tick: 50, cycles: 5 };

/**
 * The bar is see-through over the top of a page and turns into a frosted
 * strip, with the logo, once you've scrolled half a screen. "Menu" opens a
 * full-screen index whose links flicker into place one after another.
 */
export default function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [top, setTop] = useState(true);
  const sheetRef = useRef(null);

  // Close the menu whenever the route changes.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    const onScroll = () => setTop(window.scrollY < window.innerHeight * 0.5);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [pathname]);

  // Lock the page behind the open menu, let Escape close it, flicker the links in.
  useEffect(() => {
    if (!open) return;
    window.__lenis?.stop();
    document.documentElement.style.overflow = 'hidden';
    const onKey = e => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);

    const links = [...sheetRef.current.querySelectorAll('[data-scramble]')];
    const stops = [];
    if (!prefersReducedMotion()) {
      links.forEach(hideChars);
      links.forEach((el, i) => stops.push(scramble(el, { ...FLICKER, delay: i * 0.1 })));
    }

    return () => {
      window.__lenis?.start();
      document.documentElement.style.overflow = '';
      window.removeEventListener('keydown', onKey);
      stops.forEach(stop => stop());
      links.forEach(unsplitChars);
    };
  }, [open]);

  // With a mouse, links shuffle their letters on hover.
  const shuffle = event => {
    if (!open || !window.matchMedia('(hover: hover)').matches || prefersReducedMotion()) return;
    const el = event.currentTarget;
    if (el.__shuffling) return;
    el.__shuffling = true;
    scramble(el, { mode: 'shuffle', tick: 50, stagger: 25, cycles: 10 });
    setTimeout(() => (el.__shuffling = false), 250);
  };

  const isActive = href => (href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`));

  return (
    <>
      {/* The menu sits outside the bar: the bar's backdrop-filter would
          otherwise become the containing block of a fixed child. */}
      <header className={`${styles.nav} ${top || open ? styles.top : ''}`}>
        <div className={styles.bar}>
          <div className={styles.side}>
            <Link href="/contact" className={`mono ${styles.btn}`}>
              Connect
            </Link>
          </div>
          <Link href="/" className={styles.logo} aria-label="Hollowtide, home" tabIndex={top ? -1 : 0}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" width={664} height={381} />
          </Link>
          <div className={`${styles.side} ${styles.end}`}>
            <button
              className={`mono ${styles.btn} ${open ? styles.open : ''}`}
              aria-expanded={open}
              aria-controls="menu"
              onClick={() => setOpen(o => !o)}
            >
              {open ? 'Close' : 'Menu'}
              <span className={styles.burger} aria-hidden>
                <span />
                <span />
              </span>
            </button>
          </div>
        </div>
      </header>

      <div id="menu" ref={sheetRef} className={`${styles.sheet} ${open ? styles.sheetOpen : ''}`} inert={!open}>
        <nav className={styles.items} aria-label="Menu">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className={styles.sheetLogo} width={664} height={381} />
          {pages.map(p => (
            <Link
              key={p.href}
              href={p.href}
              data-scramble=""
              className={`${styles.item} ${isActive(p.href) ? styles.current : ''}`}
              aria-current={isActive(p.href) ? 'page' : undefined}
              onMouseEnter={shuffle}
              onClick={() => isActive(p.href) && setOpen(false)}
            >
              {p.label}
            </Link>
          ))}
        </nav>
        <div className={styles.foot}>
          <div className={styles.footGroup}>
            {elsewhere.map(l => (
              <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className="mono" data-scramble="" onMouseEnter={shuffle}>
                {l.label}
              </a>
            ))}
          </div>
          <div className={styles.footGroup}>
            <Link href="/contact" className="mono" data-scramble="" onMouseEnter={shuffle} onClick={() => isActive('/contact') && setOpen(false)}>
              Get in touch
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
