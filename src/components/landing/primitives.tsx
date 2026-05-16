import { ReactNode, useEffect, useRef, useState, MouseEvent } from "react";
import { motion, useInView, useMotionValue, useSpring, useScroll, useTransform, animate } from "framer-motion";
import { cn } from "@/lib/utils";

/* ----------------------------- Reveal ----------------------------- */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
  once = true,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  once?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* --------------------------- MagneticButton --------------------------- */
export function Magnetic({ children, strength = 0.35, className }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useSpring(0, { stiffness: 180, damping: 14 });
  const y = useSpring(0, { stiffness: 180, damping: 14 });

  function onMove(e: MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const mx = e.clientX - (rect.left + rect.width / 2);
    const my = e.clientY - (rect.top + rect.height / 2);
    x.set(mx * strength);
    y.set(my * strength);
  }
  function reset() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={reset}
      style={{ x, y }}
      className={cn("inline-block", className)}
    >
      {children}
    </motion.div>
  );
}

/* --------------------------- SpotlightCursor --------------------------- */
export function SpotlightCursor({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(-200);
  const my = useMotionValue(-200);
  const x = useSpring(mx, { stiffness: 120, damping: 20 });
  const y = useSpring(my, { stiffness: 120, damping: 20 });

  useEffect(() => {
    const el = ref.current?.parentElement;
    if (!el) return;
    function handle(e: globalThis.MouseEvent) {
      const rect = el!.getBoundingClientRect();
      mx.set(e.clientX - rect.left);
      my.set(e.clientY - rect.top);
    }
    el.addEventListener("mousemove", handle);
    return () => el.removeEventListener("mousemove", handle);
  }, [mx, my]);

  return (
    <motion.div
      ref={ref}
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 z-0 hidden md:block", className)}
      style={{
        background: useTransform([x, y], ([px, py]) =>
          `radial-gradient(420px circle at ${px}px ${py}px, hsl(189 94% 50% / 0.18), transparent 65%)`
        ),
      }}
    />
  );
}

/* --------------------------- ScrollProgress --------------------------- */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scale = useSpring(scrollYProgress, { stiffness: 100, damping: 20 });
  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[2px] z-[100] origin-left bg-gradient-to-r from-cyan-400 via-cyan-300 to-teal-300"
      style={{ scaleX: scale }}
    />
  );
}

/* --------------------------- CountUp --------------------------- */
export function CountUp({ to, duration = 2, suffix = "", prefix = "" }: { to: number; duration?: number; suffix?: string; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, to, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate(v) {
        setVal(v);
      },
    });
    return () => controls.stop();
  }, [inView, to, duration]);

  const formatted = to >= 100 ? Math.round(val).toLocaleString() : val.toFixed(to < 10 ? 1 : 0);
  return <span ref={ref}>{prefix}{formatted}{suffix}</span>;
}

/* --------------------------- TiltCard --------------------------- */
export function Tilt({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const rx = useSpring(0, { stiffness: 150, damping: 15 });
  const ry = useSpring(0, { stiffness: 150, damping: 15 });

  function onMove(e: MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    ry.set(px * 8);
    rx.set(-py * 8);
  }
  function reset() {
    rx.set(0);
    ry.set(0);
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={reset}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900, transformStyle: "preserve-3d" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
