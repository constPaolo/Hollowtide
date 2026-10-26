// Text that flickers through random glyphs before settling, one character
// after another. The text is wrapped in one span per character (grouped per
// word so lines still break between words).

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
const randomGlyph = () => GLYPHS[(Math.random() * GLYPHS.length) | 0];

/**
 * Wraps the element's text in per-character spans (once) and returns them.
 * Only text nodes are touched, so links and other elements inside survive,
 * and the original nodes are kept to be put back exactly as they were.
 */
export function splitChars(el) {
  if (el.__chars) return el.__chars;
  const chars = [];
  const swapped = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node => {
    const holder = document.createElement('span');
    node.textContent.split(/(\s+)/).forEach(part => {
      if (!part) return;
      if (/^\s+$/.test(part)) {
        holder.append(document.createTextNode(' '));
        return;
      }
      const word = document.createElement('span');
      word.style.whiteSpace = 'nowrap';
      for (const ch of part) {
        const span = document.createElement('span');
        span.textContent = ch;
        span.dataset.char = ch;
        word.append(span);
        chars.push(span);
      }
      holder.append(word);
    });
    node.replaceWith(holder);
    swapped.push([node, holder]);
  });
  el.__chars = chars;
  el.__swapped = swapped;
  return chars;
}

/** Puts the original text nodes back. */
export function unsplitChars(el) {
  if (!el.__chars) return;
  el.__swapped.forEach(([node, holder]) => holder.replaceWith(node));
  delete el.__chars;
  delete el.__swapped;
}

export function hideChars(el) {
  splitChars(el).forEach(c => (c.style.opacity = '0'));
}

/**
 * Scrambles an element's characters in sequence.
 * - `mode: 'in'`: each character appears, flickers, then settles.
 * - `mode: 'out'`: last to first, each flickers then disappears.
 * - `mode: 'shuffle'`: visible text flickers and settles (hover effect).
 * Returns a function that stops it and leaves the text readable.
 */
export function scramble(el, { mode = 'in', delay = 0, stagger = 25, tick = 50, cycles = 5 } = {}) {
  const chars = splitChars(el);
  const order = mode === 'out' ? [...chars].reverse() : chars;
  const life = cycles * tick;
  const start = performance.now() + delay * 1000;
  if (mode === 'in') chars.forEach(c => (c.style.opacity = '0'));

  let timer = 0;
  const step = () => {
    const t = performance.now() - start;
    let done = true;
    order.forEach((c, i) => {
      const local = t - i * stagger;
      if (local < 0) {
        done = false;
        return;
      }
      if (local < life) {
        done = false;
        c.style.opacity = '1';
        c.textContent = /\S/.test(c.dataset.char) ? randomGlyph() : c.dataset.char;
      } else {
        c.textContent = c.dataset.char;
        c.style.opacity = mode === 'out' ? '0' : '1';
      }
    });
    if (done) clearInterval(timer);
  };
  timer = setInterval(step, tick);

  return () => {
    clearInterval(timer);
    chars.forEach(c => {
      c.textContent = c.dataset.char;
      c.style.opacity = mode === 'out' ? '0' : '1';
    });
  };
}
