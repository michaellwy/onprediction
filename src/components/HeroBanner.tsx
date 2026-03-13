"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "framer-motion";
import { X, ArrowRight } from "lucide-react";

function FloatingDiamond({
  size,
  x,
  y,
  delay,
  duration,
  rotate,
  parallaxX,
  parallaxY,
}: {
  size: number;
  x: string;
  y: string;
  delay: number;
  duration: number;
  rotate?: number;
  parallaxX: ReturnType<typeof useSpring>;
  parallaxY: ReturnType<typeof useSpring>;
}) {
  // Each diamond moves at a different rate based on size (larger = more movement)
  const factor = size / 20;
  const mx = useTransform(parallaxX, (v: number) => v * factor);
  const my = useTransform(parallaxY, (v: number) => v * factor);

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ left: x, top: y, x: mx, y: my }}
      initial={{ opacity: 0, scale: 0, rotate: rotate ?? 45 }}
      animate={{
        opacity: [0, 0.9, 0.7, 0.9],
        scale: [0, 1, 1.1, 1],
        rotate: [(rotate ?? 45), (rotate ?? 45) + 12, (rotate ?? 45) + 6, (rotate ?? 45) + 12],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        repeatType: "reverse",
        ease: "easeInOut",
      }}
    >
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <rect
          x="7.5"
          y="7.5"
          width="17"
          height="17"
          rx="4"
          transform="rotate(45 16 16)"
          fill="currentColor"
        />
      </svg>
    </motion.div>
  );
}

export function HeroBanner() {
  const [visible, setVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Mouse tracking
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 50, damping: 20 });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      // Normalize to -1..1 from center
      const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      mouseX.set(nx * 12);
      mouseY.set(ny * 8);
    },
    [mouseX, mouseY]
  );

  const handleMouseLeave = useCallback(() => {
    mouseX.set(0);
    mouseY.set(0);
  }, [mouseX, mouseY]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          className="overflow-hidden mb-5"
        >
          <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="relative rounded-xl border border-border/50 bg-gradient-to-br from-accent/70 via-background to-accent/30 overflow-hidden"
          >
            {/* Decorative diamonds — parallax layers */}
            <div className="absolute inset-0 text-primary/[0.10] overflow-hidden">
              {/* Left side — sparse */}
              <FloatingDiamond size={36} x="3%" y="12%" delay={0.3} duration={7} rotate={50} parallaxX={springX} parallaxY={springY} />
              <FloatingDiamond size={18} x="20%" y="60%" delay={1} duration={7.5} parallaxX={springX} parallaxY={springY} />

              {/* Center — light scatter */}
              <FloatingDiamond size={24} x="42%" y="-5%" delay={0.8} duration={6} rotate={40} parallaxX={springX} parallaxY={springY} />
              <FloatingDiamond size={14} x="48%" y="75%" delay={2} duration={5.5} rotate={60} parallaxX={springX} parallaxY={springY} />

              {/* Right side — dense cluster */}
              <FloatingDiamond size={72} x="68%" y="10%" delay={0} duration={9} parallaxX={springX} parallaxY={springY} />
              <FloatingDiamond size={44} x="82%" y="45%" delay={0.5} duration={7} rotate={52} parallaxX={springX} parallaxY={springY} />
              <FloatingDiamond size={32} x="58%" y="55%" delay={1.2} duration={6} rotate={38} parallaxX={springX} parallaxY={springY} />
              <FloatingDiamond size={52} x="90%" y="5%" delay={0.8} duration={8} rotate={48} parallaxX={springX} parallaxY={springY} />
              <FloatingDiamond size={20} x="75%" y="65%" delay={1.8} duration={5.5} rotate={55} parallaxX={springX} parallaxY={springY} />
              <FloatingDiamond size={16} x="62%" y="30%" delay={2.2} duration={5} rotate={42} parallaxX={springX} parallaxY={springY} />
              <FloatingDiamond size={26} x="88%" y="70%" delay={0.4} duration={6.5} rotate={35} parallaxX={springX} parallaxY={springY} />
              <FloatingDiamond size={38} x="78%" y="20%" delay={1.5} duration={7.5} rotate={58} parallaxX={springX} parallaxY={springY} />
            </div>

            {/* Diamond ring outlines — right side accent */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <motion.svg
                width="120" height="120" viewBox="0 0 32 32"
                className="absolute text-primary/[0.05]"
                style={{ right: "15%", top: "10%" }}
                initial={{ opacity: 0, scale: 0.5, rotate: 45 }}
                animate={{ opacity: [0, 1, 0.6, 1], scale: [0.5, 1, 1.05, 1], rotate: [45, 50, 47, 50] }}
                transition={{ duration: 10, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
              >
                <rect x="7.5" y="7.5" width="17" height="17" rx="4" transform="rotate(45 16 16)" fill="none" stroke="currentColor" strokeWidth="0.5" />
              </motion.svg>
              <motion.svg
                width="80" height="80" viewBox="0 0 32 32"
                className="absolute text-primary/[0.04]"
                style={{ right: "8%", bottom: "15%" }}
                initial={{ opacity: 0, scale: 0.5, rotate: 40 }}
                animate={{ opacity: [0, 1, 0.7, 1], scale: [0.5, 1, 1.08, 1], rotate: [40, 46, 43, 46] }}
                transition={{ duration: 8, delay: 1, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
              >
                <rect x="7.5" y="7.5" width="17" height="17" rx="4" transform="rotate(45 16 16)" fill="none" stroke="currentColor" strokeWidth="0.7" />
              </motion.svg>
            </div>

            {/* Close button */}
            <button
              onClick={() => setVisible(false)}
              className="absolute top-2.5 right-2.5 z-10 flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground/40 hover:text-foreground hover:bg-accent/60 transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>

            {/* Content */}
            <div className="relative z-[1] px-5 sm:px-7 py-5 sm:py-7">
              <div className="max-w-lg">
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                  className="font-display text-xl sm:text-2xl font-bold text-foreground leading-snug tracking-tight"
                >
                  The best thinking on{" "}
                  <span className="text-primary">prediction markets</span>
                  , in one place.
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  className="text-sm text-muted-foreground mt-2 leading-relaxed"
                >
                  Curated articles, research, and analysis for builders, investors, and researchers.
                  Filter by topic, discuss in the forum, and track what matters.
                </motion.p>

                {/* CTAs */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.35 }}
                  className="flex flex-wrap items-center gap-2.5 mt-4"
                >
                  <Link
                    href="/forum"
                    className="group h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors inline-flex items-center gap-1.5"
                  >
                    Join the Forum
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  <button
                    onClick={() => setVisible(false)}
                    className="h-9 px-4 rounded-lg border border-border bg-background/80 hover:bg-accent/50 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Browse Articles
                  </button>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
