import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, useAnimation } from "framer-motion";

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function makeKeyframes(count = 6) {
  const w = typeof window !== "undefined" ? window.innerWidth : 1200;
  const h = typeof window !== "undefined" ? window.innerHeight : 800;
  const points = Array.from({ length: count }, () => ({ x: rand(0, w), y: rand(0, h) }));
  return [{ x: w * 0.2, y: h * 0.3 }, ...points, { x: w * 0.8, y: h * 0.2 }];
}

const Sparkle: React.FC<{ delay: number }> = ({ delay }) => {
  const size = rand(2, 5);
  return (
    <motion.span
      className="absolute rounded-full opacity-80"
      style={{ width: size, height: size, boxShadow: "0 0 6px 2px currentColor" }}
      initial={{ scale: 0, opacity: 0.8 }}
      animate={{ scale: [0.2, 1, 0], opacity: [0.8, 0.6, 0] }}
      transition={{ duration: rand(0.8, 1.6), delay, repeat: Infinity, ease: "easeOut" }}
    />
  );
};

const FairySVG: React.FC<{ size: number; hue: number; beat: number }> = ({ size, hue, beat }) => {
  const glow = `hsl(${hue} 90% 62%)`;
  const auraPurple = "#b054ff";
  const wingLight = `hsl(${hue} 70% 90%)`;
  const wingDark = `hsl(${hue} 40% 50%)`;
  const wingHighlight = `hsl(${hue + 30} 85% 97%)`;
  const auraOpacity = [0.15, 0.25, 0.2, 0.3, 0.18];
  const corePulse = [26, 29, 27.5, 30, 26.5];
  const swing = Math.max(0.5, beat);

  return (
    <svg width={size * 1.8} height={size * 1.8} viewBox="0 0 200 200" className="drop-shadow" style={{ color: glow }}>
      <defs>
        <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="50%" stopColor={glow} stopOpacity="0.9" />
          <stop offset="100%" stopColor={glow} stopOpacity="0.25" />
        </radialGradient>
        <radialGradient id="wingGradient" cx="50%" cy="50%" r="80%">
          <stop offset="0%" stopColor={wingHighlight} stopOpacity="0.85" />
          <stop offset="40%" stopColor={wingLight} stopOpacity="0.9" />
          <stop offset="100%" stopColor={wingDark} stopOpacity="0.2" />
        </radialGradient>
        <radialGradient id="purpleAura" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={auraPurple} stopOpacity="0.25" />
          <stop offset="70%" stopColor={auraPurple} stopOpacity="0.1" />
          <stop offset="100%" stopColor={auraPurple} stopOpacity="0.03" />
        </radialGradient>
      </defs>

      {/* Feinere, elegantere Flügel mit zarten Linien */}
      <g style={{ transformOrigin: 'center', zIndex: 0 }}>
        <motion.path
          d="M100 100 C 135 20, 195 70, 150 130 C 120 170, 110 130, 100 100"
          fill="url(#wingGradient)"
          stroke={wingHighlight}
          strokeWidth={1.2}
          strokeOpacity="0.7"
          animate={{
            d: [
              "M100 100 C 135 20, 195 70, 150 130 C 120 170, 110 130, 100 100",
              "M100 100 C 140 45, 190 90, 150 140 C 120 170, 110 130, 100 100",
              "M100 100 C 135 20, 195 70, 150 130 C 120 170, 110 130, 100 100"
            ],
            opacity: [0.85, 1, 0.9, 1]
          }}
          transition={{ duration: swing, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.path
          d="M100 100 C 65 20, 5 70, 50 130 C 80 170, 90 130, 100 100"
          fill="url(#wingGradient)"
          stroke={wingHighlight}
          strokeWidth={1.2}
          strokeOpacity="0.7"
          animate={{
            d: [
              "M100 100 C 65 20, 5 70, 50 130 C 80 170, 90 130, 100 100",
              "M100 100 C 55 45, 10 90, 55 150 C 80 170, 90 130, 100 100",
              "M100 100 C 65 20, 5 70, 50 130 C 80 170, 90 130, 100 100"
            ],
            opacity: [0.85, 1, 0.9, 1]
          }}
          transition={{ duration: swing, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
        />

        {/* Zarte Flügeladern */}
        {Array.from({ length: 6 }).map((_, i) => (
          <path
            key={i}
            d={`M100 100 C ${90 + i * 10} ${50 + i * 5}, ${130 + i * 5} ${90 + i * 10}, 150 ${140 - i * 2}`}
            stroke={wingHighlight}
            strokeWidth={0.6}
            strokeOpacity={0.3}
            fill="none"
          />
        ))}
      </g>

      {/* Aura und Körper */}
      <motion.circle cx="100" cy="100" r={80} fill="url(#purpleAura)" animate={{ opacity: auraOpacity }} transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }} />
      <motion.circle cx="100" cy="100" r={30} fill="url(#coreGlow)" animate={{ r: corePulse, opacity: [0.95, 1, 0.96, 1, 0.95] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }} />

      {Array.from({ length: 10 }).map((_, i) => (
        <circle key={i} cx={100 + Math.cos((i / 10) * Math.PI * 2) * 50 + rand(-3, 3)} cy={100 + Math.sin((i / 10) * Math.PI * 2) * 50 + rand(-3, 3)} r={rand(1, 2.5)} fill={glow} opacity={0.5} />
      ))}
    </svg>
  );
};

const FlutterElf: React.FC = () => {
  const controls = useAnimation();
  const [speed] = useState(1);
  const [size] = useState(120);
  const [hue] = useState(90);
  const [keyframes] = useState(makeKeyframes());
  const fairyRef = useRef<HTMLDivElement>(null);

  const beat = useMemo(() => {
    const d = 1.2 / Math.max(0.5, speed);
    return Math.min(1.4, Math.max(0.55, d));
  }, [speed]);

  useEffect(() => {
    const duration = 18 / speed;
    controls.start({
      x: keyframes.map(p => p.x),
      y: keyframes.map(p => p.y),
      transition: {
        duration,
        times: keyframes.map((_, i) => i / (keyframes.length - 1)),
        ease: "easeInOut",
        repeat: Infinity,
        repeatType: "reverse",
      },
    });
  }, [controls, keyframes, speed]);

  const sparkles = useMemo(() => Array.from({ length: 12 }, (_, i) => i), []);

  return (
    <div className="fixed inset-0 pointer-events-none">
      <motion.div ref={fairyRef} className="absolute z-40" animate={controls} initial={false} style={{ x: 0, y: 0 }}>
        <div className="relative" style={{ width: size, height: size }}>
          <div className="absolute inset-0 -z-10" style={{ color: `hsl(${hue} 90% 60%)` }}>
            {sparkles.map(i => (
              <Sparkle key={i} delay={i * 0.08} />
            ))}
          </div>
          <FairySVG size={size} hue={hue} beat={beat} />
        </div>
      </motion.div>
    </div>
  );
};

export default FlutterElf;
