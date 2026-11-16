'use client';

import { useEffect, useRef } from 'react';

import { useI18n } from '@/features/i18n/I18nProvider';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * The wind over the threshing floor, behind the front page's headline
 * (ADR-045).
 *
 * Chaff drifts with the wind towards the end of the line, the way the
 * threshing section later throws the costs; grain falls. The visitor's
 * pointer is a gust: moving it pushes the chaff aside in the direction it
 * moved, so the first thing the page does in answer to a hand is the thing
 * the product is named after.
 *
 * DECORATION, AND KEPT QUIET. Faint enough never to compete with the
 * headline, hidden from assistive technology, and absent for a reader who
 * asked for less motion. It stops drawing when the hero is off screen or the
 * tab is hidden, and draws at no more than twice the CSS pixel density, so
 * it costs nothing while nobody is looking.
 */
const RADIUS = 150;

function particle(width, height, wind, kind, anywhere = true) {
  if (kind === 'grain') {
    return {
      kind,
      x: Math.random() * width,
      y: anywhere ? Math.random() * height : -10,
      vx: wind * (0.05 + Math.random() * 0.15),
      vy: 0.25 + Math.random() * 0.45,
      size: 1 + Math.random() * 1.4,
      alpha: 0.35 + Math.random() * 0.45,
      angle: 0,
      spin: 0,
    };
  }

  const base = wind * (0.35 + Math.random() * 0.9);

  return {
    kind,
    base,
    x: anywhere ? Math.random() * width : wind > 0 ? -20 : width + 20,
    y: Math.random() * height,
    vx: base,
    vy: (Math.random() - 0.5) * 0.2,
    size: 5 + Math.random() * 10,
    alpha: 0.12 + Math.random() * 0.28,
    angle: Math.random() * Math.PI,
    spin: (Math.random() - 0.5) * 0.03,
  };
}

export function WindField({ className }) {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const { dir } = useI18n();

  useEffect(() => {
    if (reduced) return undefined;

    const canvas = ref.current;
    const context = canvas?.getContext('2d');

    if (!canvas || !context) return undefined;

    const css = getComputedStyle(document.documentElement);
    const chaffColour = css.getPropertyValue('--on-brand-line').trim();
    const grainColour = css.getPropertyValue('--accent-on-brand').trim();
    const wind = dir === 'rtl' ? -1 : 1;

    let width = 0;
    let height = 0;
    let particles = [];
    let frame = 0;
    let visible = true;
    const pointer = { x: -9999, y: -9999, vx: 0, vy: 0, last: 0 };

    const resize = () => {
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      const count = width < 768 ? 45 : 110;
      particles = Array.from({ length: count }, (_, index) =>
        particle(width, height, wind, index % 4 === 0 ? 'grain' : 'chaff'),
      );
    };

    const onPointer = (event) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      if (pointer.last) {
        pointer.vx = x - pointer.x;
        pointer.vy = y - pointer.y;
      }

      pointer.x = x;
      pointer.y = y;
      pointer.last = performance.now();
    };

    const draw = () => {
      frame = 0;

      if (!visible || document.hidden) return;

      context.clearRect(0, 0, width, height);

      // A gust fades a moment after the pointer stops.
      const gust = performance.now() - pointer.last < 120 ? 1 : 0;

      for (let index = 0; index < particles.length; index += 1) {
        const p = particles[index];
        const dx = p.x - pointer.x;
        const dy = p.y - pointer.y;
        const distance = Math.hypot(dx, dy);

        if (gust && distance < RADIUS) {
          const force = (1 - distance / RADIUS) * 0.12;
          p.vx += pointer.vx * force + (dx / (distance || 1)) * force * 6;
          p.vy += pointer.vy * force + (dy / (distance || 1)) * force * 6;
        }

        if (p.kind === 'chaff') {
          p.vx += (p.base - p.vx) * 0.02;
          p.vy += (Math.sin((p.x + p.y) * 0.01) * 0.15 - p.vy) * 0.02;
          p.angle += p.spin + p.vx * 0.01;
        } else {
          p.vx *= 0.98;
          p.vy += (0.45 - p.vy) * 0.02;
        }

        p.x += p.vx;
        p.y += p.vy;

        const gone =
          p.kind === 'grain'
            ? p.y > height + 10
            : p.x < -30 || p.x > width + 30 || p.y < -30 || p.y > height + 30;

        if (gone) {
          particles[index] = particle(width, height, wind, p.kind, false);
          continue;
        }

        context.globalAlpha = p.alpha;

        if (p.kind === 'grain') {
          context.fillStyle = grainColour;
          context.beginPath();
          context.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          context.fill();
        } else {
          const cos = Math.cos(p.angle) * p.size * 0.5;
          const sin = Math.sin(p.angle) * p.size * 0.5;
          context.strokeStyle = chaffColour;
          context.lineWidth = 1.4;
          context.lineCap = 'round';
          context.beginPath();
          context.moveTo(p.x - cos, p.y - sin);
          context.lineTo(p.x + cos, p.y + sin);
          context.stroke();
        }
      }

      context.globalAlpha = 1;
      pointer.vx *= 0.85;
      pointer.vy *= 0.85;
      frame = requestAnimationFrame(draw);
    };

    const start = () => {
      if (!frame && visible && !document.hidden) frame = requestAnimationFrame(draw);
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      start();
    });

    resize();
    observer.observe(canvas);
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onPointer, { passive: true });
    document.addEventListener('visibilitychange', start);
    start();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('visibilitychange', start);
    };
  }, [reduced, dir]);

  return <canvas ref={ref} aria-hidden="true" className={className} />;
}
