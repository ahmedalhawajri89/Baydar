'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * A call to action that leans towards the pointer as it comes near
 * (ADR-045).
 *
 * The page's main actions answer the hand before it arrives, which says
 * "this is the thing to press" without a louder colour. A small pull, a
 * third of the distance, and only with a fine pointer: on a touch screen
 * there is no hand hovering, and for a reader who asked for less motion it
 * does nothing at all. The link inside stays a plain link, keyboard included.
 */
export function Magnetic({ children, strength = 0.3 }) {
  const ref = useRef(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const element = ref.current;

    if (reduced || !element || !window.matchMedia('(pointer: fine)').matches) return undefined;

    const toX = gsap.quickTo(element, 'x', { duration: 0.5, ease: 'power3.out' });
    const toY = gsap.quickTo(element, 'y', { duration: 0.5, ease: 'power3.out' });

    const move = (event) => {
      const rect = element.getBoundingClientRect();
      toX((event.clientX - (rect.left + rect.width / 2)) * strength);
      toY((event.clientY - (rect.top + rect.height / 2)) * strength);
    };

    const leave = () => {
      gsap.to(element, { x: 0, y: 0, duration: 0.8, ease: 'elastic.out(1, 0.4)' });
    };

    element.addEventListener('pointermove', move);
    element.addEventListener('pointerleave', leave);

    return () => {
      element.removeEventListener('pointermove', move);
      element.removeEventListener('pointerleave', leave);
      gsap.set(element, { clearProps: 'transform' });
    };
  }, [reduced, strength]);

  return (
    <span ref={ref} className="inline-block p-3 -m-3">
      {children}
    </span>
  );
}
