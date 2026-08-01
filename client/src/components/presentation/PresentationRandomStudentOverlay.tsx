import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { JOHNNY_PRESENTATION } from '../../lib/presentationTheme';

const HOLD_MS = 5000;

type Props = {
  /** SuS-Name oder Zufallszahl – 5 Sekunden groß und animiert */
  text: string | null;
  /** Erzwingt Neustart der Animation auch bei gleichem Text */
  nonce?: number;
  onDone: () => void;
};

/**
 * Zeigt Text (Name/Zahl) 5 Sekunden groß und animiert über der Folie.
 */
export default function PresentationRandomStudentOverlay({ text, nonce = 0, onDone }: Props) {
  const [phase, setPhase] = useState<'enter' | 'hold' | 'exit'>('enter');

  useEffect(() => {
    if (!text) return;
    setPhase('enter');
    const toHold = window.setTimeout(() => setPhase('hold'), 700);
    const toExit = window.setTimeout(() => setPhase('exit'), HOLD_MS - 450);
    const toDone = window.setTimeout(() => onDone(), HOLD_MS);
    return () => {
      window.clearTimeout(toHold);
      window.clearTimeout(toExit);
      window.clearTimeout(toDone);
    };
  }, [text, nonce, onDone]);

  if (!text) return null;

  return (
    <Box
      aria-live="polite"
      role="status"
      onClick={(e) => e.stopPropagation()}
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        bgcolor:
          phase === 'exit' ? 'rgba(0,0,0,0)' : 'rgba(8,10,14,0.42)',
        transition: 'background-color 0.4s ease',
        '@keyframes jmPickPop': {
          '0%': {
            opacity: 0,
            transform: 'scale(0.2) rotate(-18deg) translateY(40px)',
            filter: 'blur(8px)',
          },
          '55%': {
            opacity: 1,
            transform: 'scale(1.18) rotate(6deg) translateY(-8px)',
            filter: 'blur(0)',
          },
          '78%': {
            transform: 'scale(0.94) rotate(-3deg) translateY(4px)',
          },
          '100%': {
            opacity: 1,
            transform: 'scale(1) rotate(0deg) translateY(0)',
            filter: 'blur(0)',
          },
        },
        '@keyframes jmPickWiggle': {
          '0%, 100%': { transform: 'rotate(-2.5deg) scale(1)' },
          '25%': { transform: 'rotate(3deg) scale(1.04)' },
          '50%': { transform: 'rotate(-1.5deg) scale(0.98)' },
          '75%': { transform: 'rotate(2.2deg) scale(1.03)' },
        },
        '@keyframes jmPickExit': {
          '0%': { opacity: 1, transform: 'scale(1) rotate(0deg)' },
          '100%': {
            opacity: 0,
            transform: 'scale(1.35) rotate(8deg) translateY(-24px)',
            filter: 'blur(6px)',
          },
        },
        '@keyframes jmPickSpark': {
          '0%, 100%': { opacity: 0.35, transform: 'scale(0.9)' },
          '50%': { opacity: 0.85, transform: 'scale(1.08)' },
        },
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          width: 'min(88vw, 720px)',
          height: 'min(38vh, 280px)',
          borderRadius: '50%',
          background: `radial-gradient(ellipse at center, ${JOHNNY_PRESENTATION.warm}55 0%, transparent 68%)`,
          animation: 'jmPickSpark 1.1s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      />
      <Typography
        component="div"
        sx={{
          position: 'relative',
          px: { xs: 2, sm: 4 },
          py: { xs: 1.5, sm: 2 },
          maxWidth: '92vw',
          textAlign: 'center',
          fontFamily: '"Comic Sans MS", "Chalkboard SE", "Segoe Print", cursive, sans-serif',
          fontWeight: 900,
          fontSize: { xs: 'clamp(2.2rem, 11vw, 4.5rem)', sm: 'clamp(2.8rem, 8vw, 5.5rem)' },
          lineHeight: 1.1,
          letterSpacing: 0.5,
          color: '#fff',
          textShadow: `
            0 2px 0 ${JOHNNY_PRESENTATION.warm},
            0 4px 0 #e65100,
            0 8px 24px rgba(0,0,0,0.55),
            0 0 40px rgba(255,152,0,0.45)
          `,
          animation:
            phase === 'enter'
              ? 'jmPickPop 0.7s cubic-bezier(0.22, 1.4, 0.36, 1) both'
              : phase === 'exit'
                ? 'jmPickExit 0.45s ease-in forwards'
                : 'jmPickWiggle 0.85s ease-in-out infinite',
          userSelect: 'none',
        }}
      >
        {text}
      </Typography>
    </Box>
  );
}
