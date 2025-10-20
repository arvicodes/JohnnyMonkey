import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useAnimation } from "framer-motion";

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function makeKeyframes(count = 8) {
  const w = typeof window !== "undefined" ? window.innerWidth : 1200;
  const h = typeof window !== "undefined" ? window.innerHeight : 800;
  
  // Erstelle mehr zufällige Punkte mit verschiedenen Bereichen
  const points = Array.from({ length: count }, (_, i) => {
    // Abwechselnde Bereiche für mehr Variation
    const area = i % 4;
    let x, y;
    
    switch (area) {
      case 0: // Oben links
        x = rand(0, w * 0.4);
        y = rand(0, h * 0.4);
        break;
      case 1: // Oben rechts
        x = rand(w * 0.6, w);
        y = rand(0, h * 0.4);
        break;
      case 2: // Unten links
        x = rand(0, w * 0.4);
        y = rand(h * 0.6, h);
        break;
      case 3: // Unten rechts
        x = rand(w * 0.6, w);
        y = rand(h * 0.6, h);
        break;
      default:
        x = rand(0, w);
        y = rand(0, h);
    }
    
    return { x, y };
  });
  
  // Start- und Endpunkt auch zufälliger machen
  const startPoint = { x: rand(w * 0.1, w * 0.3), y: rand(h * 0.1, h * 0.3) };
  const endPoint = { x: rand(w * 0.7, w * 0.9), y: rand(h * 0.1, h * 0.3) };
  
  return [startPoint, ...points, endPoint];
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

interface FlutterElfProps {
  isVisible?: boolean;
}

const FlutterElf: React.FC<FlutterElfProps> = ({ isVisible = true }) => {
  const controls = useAnimation();
  const [speed] = useState(() => rand(0.1, 0.8)); // Viel langsamere Geschwindigkeit
  const [size] = useState(() => rand(80, 150)); // Zufällige Größe
  const [hue] = useState(() => rand(0, 360)); // Zufällige Farbe
  // keyframes werden jetzt dynamisch in animateWithNewPath generiert
  const fairyRef = useRef<HTMLDivElement>(null);

  const beat = useMemo(() => {
    const d = 1.2 / Math.max(0.5, speed);
    return Math.min(1.4, Math.max(0.55, d));
  }, [speed]);

  const animateWithNewPath = useCallback(() => {
    const newKeyframes = makeKeyframes();
    const baseDuration = 45 / speed; // 3x länger als vorher
    const duration = baseDuration + rand(-10, 20); // ±10-20 Sekunden Variation
    
    // Zufällige Easing-Funktionen
    const easingOptions = ["easeInOut", "easeIn", "easeOut", "linear"] as const;
    const randomEasing = easingOptions[Math.floor(Math.random() * easingOptions.length)];
    
    controls.start({
      x: newKeyframes.map(p => p.x),
      y: newKeyframes.map(p => p.y),
      transition: {
        duration,
        times: newKeyframes.map((_, i) => i / (newKeyframes.length - 1)),
        ease: randomEasing,
        repeat: Infinity,
        repeatType: "reverse",
      },
    });
  }, [controls, speed]);

  useEffect(() => {
    animateWithNewPath();
    
    // Generiere alle 60-120 Sekunden einen neuen zufälligen Pfad (viel seltener)
    const interval = setInterval(() => {
      animateWithNewPath();
    }, rand(60000, 120000));
    
    return () => clearInterval(interval);
  }, [animateWithNewPath]);

  const sparkles = useMemo(() => Array.from({ length: 12 }, (_, i) => i), []);

  if (!isVisible) return null;

  return (
    <div 
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 1000,
        overflow: 'hidden'
      }}
    >
      <motion.div ref={fairyRef} animate={controls} initial={false} style={{ x: 0, y: 0 }}>
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
