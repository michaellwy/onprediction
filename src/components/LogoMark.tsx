"use client";

import { useEffect, useRef } from "react";

// Spin "modes" for the periodic easter egg. Each fire picks one at random and a
// duration within its range, so it never feels the same twice. Keyframes live in
// globals.css (logo-*). The hover rotation stays pure CSS (group-hover) so it
// still triggers from anywhere on the logo.
const MODES = [
  { name: "logo-spin", min: 0.7, max: 1.6, ease: "cubic-bezier(0.4,0,0.2,1)" },
  { name: "logo-spin-rev", min: 0.9, max: 2.0, ease: "ease-in-out" },
  { name: "logo-double", min: 1.3, max: 2.6, ease: "ease-out" },
  { name: "logo-wobble", min: 0.8, max: 1.4, ease: "ease-in-out" },
  { name: "logo-flip", min: 0.8, max: 1.5, ease: "ease-in-out" },
  { name: "logo-pop", min: 0.9, max: 1.7, ease: "ease-in-out" },
];

const rand = (min: number, max: number) => min + Math.random() * (max - min);

export function LogoMark() {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current;
    if (!el) return;
    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;

    const clear = () => { el.style.animation = ""; }; // back to idle (lets hover rotate work)
    const spin = () => {
      const m = MODES[Math.floor(rand(0, MODES.length))];
      el.style.animation = `${m.name} ${rand(m.min, m.max).toFixed(2)}s ${m.ease}`;
    };
    const schedule = () => {
      timer = setTimeout(() => {
        if (cancelled) return;
        spin();
        schedule();
      }, rand(15000, 27000));
    };

    el.addEventListener("animationend", clear);
    schedule();
    return () => { cancelled = true; clearTimeout(timer); el.removeEventListener("animationend", clear); };
  }, []);

  return (
    <svg
      ref={ref}
      viewBox="0 0 32 32"
      className="w-7 h-7 sm:w-10 sm:h-10 text-primary shrink-0 origin-center group-hover:rotate-180 transition-transform duration-500"
      aria-hidden="true"
    >
      <rect x="7.5" y="7.5" width="17" height="17" rx="4" transform="rotate(45 16 16)" fill="currentColor" />
    </svg>
  );
}
