'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Reveals a block as it enters the viewport, from whichever side it arrives.
 *
 * The distances are deliberately larger than a normal UI transition. A reveal competes
 * with the scroll that triggered it: a wheel flick moves the page a few hundred pixels
 * while the reveal runs, so a short drift is read as part of the scroll and not seen at
 * all. It has to out-travel the noise or there is no point animating.
 *
 * Two shared observers rather than one, because entering and leaving want different
 * lines. Revealing at the very bottom edge puts the movement in peripheral vision, so
 * `enter` is inset by a fifth at each end. Hiding on that same line would fade a block out
 * while a fifth of the screen still showed it, so `exit` uses the whole viewport and a
 * block only resets once it is genuinely gone. Both are module-level: seventeen blocks
 * share two observers, and no scroll listener exists.
 *
 * Only `opacity` and `translate` animate — both composited. `translate` rather than
 * `transform`: Tailwind v4 emits the independent property, so transitioning `transform`
 * leaves the movement snapping while only the fade runs.
 *
 * Nothing is hidden until an observer has spoken, so the page stays readable without
 * JavaScript, and the first observation snaps rather than transitions.
 *
 * The origin is re-read on the way in. Direction recorded on the way out goes stale the
 * moment the page moves without crossing the element — an anchor jump, scroll restoration
 * — and the block then arrives from the wrong side.
 */
type Notify = (entry: IntersectionObserverEntry) => void;

const enterListeners = new Map<Element, Notify>();
const exitListeners = new Map<Element, Notify>();

let enterObserver: IntersectionObserver | null = null;
let exitObserver: IntersectionObserver | null = null;

function observers(): { enter: IntersectionObserver; exit: IntersectionObserver } {
  const enter = (enterObserver ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) enterListeners.get(entry.target)?.(entry);
    },
    { rootMargin: '-20% 0px -20% 0px', threshold: 0 },
  ));
  const exit = (exitObserver ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) exitListeners.get(entry.target)?.(entry);
    },
    { threshold: 0 },
  ));
  return { enter, exit };
}

export function Reveal({
  children,
  className = '',
  delay = 0,
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  /** Small offsets only. A long stagger reads as lag rather than as sequence. */
  delay?: number;
  as?: 'div' | 'section' | 'li';
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(true);
  const [fromBelow, setFromBelow] = useState(true);
  const [armed, setArmed] = useState(false);
  const seen = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let pending = 0;
    const { enter, exit } = observers();

    enterListeners.set(element, (entry) => {
      if (!entry.isIntersecting) return;
      setFromBelow(entry.boundingClientRect.top > 0);
      cancelAnimationFrame(pending);
      // Let the corrected origin paint, then travel from it.
      pending = requestAnimationFrame(() => setShown(true));
    });

    exitListeners.set(element, (entry) => {
      if (!seen.current) {
        seen.current = true;
        // Two frames: let the first state paint before transitions are allowed to run.
        requestAnimationFrame(() => requestAnimationFrame(() => setArmed(true)));
      }
      if (entry.isIntersecting) return;
      cancelAnimationFrame(pending);
      setFromBelow(entry.boundingClientRect.top > 0);
      setShown(false);
    });

    enter.observe(element);
    exit.observe(element);

    return () => {
      cancelAnimationFrame(pending);
      enterListeners.delete(element);
      exitListeners.delete(element);
      enter.unobserve(element);
      exit.unobserve(element);
    };
  }, []);

  const motion = armed
    ? 'motion-safe:transition-[opacity,translate] motion-safe:duration-[620ms] motion-safe:ease-out'
    : '';
  const position = shown
    ? 'opacity-100 translate-y-0'
    : `opacity-0 ${fromBelow ? 'translate-y-10' : '-translate-y-10'}`;

  return (
    <Tag
      ref={ref as never}
      style={armed && delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={`${motion} ${position} ${className}`}
    >
      {children}
    </Tag>
  );
}
