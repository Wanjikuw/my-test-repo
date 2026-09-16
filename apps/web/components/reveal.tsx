'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Reveals a block as it enters the viewport, in whichever direction it entered from.
 *
 * Decisions that keep this from being the janky version:
 *
 * One IntersectionObserver is shared by every instance. A page of twenty reveals otherwise
 * builds twenty observers, and a scroll listener would be worse still — it fires far more
 * often than the compositor can use and forces layout reads on the main thread.
 *
 * Only `opacity` and `translate` animate. Both are composited, so the work happens off the
 * main thread and never triggers layout or paint. `translate` rather than `transform`
 * because Tailwind v4 emits the independent property, and transitioning `transform`
 * instead leaves the movement snapping while only the fade animates.
 *
 * Nothing is hidden until the observer has spoken. The server renders every block visible,
 * so a failed or disabled script leaves the page readable rather than blank — and the
 * first observation snaps rather than transitions, so blocks below the fold do not animate
 * themselves out on load.
 *
 * The origin is re-read on the way in, a frame before the block is revealed. Direction
 * recorded on the way out goes stale the moment anything moves the page without crossing
 * the element — an in-page anchor, scroll restoration, a flung scroll — and the block then
 * animates in from the side it left rather than the side it is arriving from.
 */
type Notify = (entry: IntersectionObserverEntry) => void;

let sharedObserver: IntersectionObserver | null = null;
const listeners = new Map<Element, Notify>();

function observerFor(): IntersectionObserver {
  sharedObserver ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) listeners.get(entry.target)?.(entry);
    },
    // Fires a little inside the edge so the movement reads as arrival, not as a correction.
    { rootMargin: '0px 0px -8% 0px', threshold: 0 },
  );
  return sharedObserver;
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
  const hasObserved = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let pending = 0;
    const observer = observerFor();

    listeners.set(element, (entry) => {
      const below = entry.boundingClientRect.top > 0;
      setFromBelow(below);

      if (!hasObserved.current) {
        hasObserved.current = true;
        setShown(entry.isIntersecting);
        // Two frames: let the snap paint before transitions are allowed to run.
        requestAnimationFrame(() => requestAnimationFrame(() => setArmed(true)));
        return;
      }

      cancelAnimationFrame(pending);
      if (entry.isIntersecting) {
        // Let the corrected origin paint, then travel from it.
        pending = requestAnimationFrame(() => setShown(true));
      } else {
        setShown(false);
      }
    });
    observer.observe(element);

    return () => {
      cancelAnimationFrame(pending);
      listeners.delete(element);
      observer.unobserve(element);
    };
  }, []);

  const motion = armed
    ? 'motion-safe:transition-[opacity,translate] motion-safe:duration-[380ms] motion-safe:ease-out'
    : '';
  const position = shown
    ? 'opacity-100 translate-y-0'
    : `opacity-0 ${fromBelow ? 'translate-y-5' : '-translate-y-5'}`;

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
