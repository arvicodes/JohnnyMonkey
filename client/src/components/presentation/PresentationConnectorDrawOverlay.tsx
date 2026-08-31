import React from 'react';
import { Box } from '@mui/material';
import { SLIDE_REF_HEIGHT, SLIDE_REF_WIDTH } from '../../lib/presentationDeck';

export type ConnectorDrawPoint = { x: number; y: number };

interface PresentationConnectorDrawOverlayProps {
  active: boolean;
  points: ConnectorDrawPoint[];
  accentColor?: string;
  onAddPoint: (point: ConnectorDrawPoint) => void;
  onFinish: () => void;
}

const PresentationConnectorDrawOverlay: React.FC<PresentationConnectorDrawOverlayProps> = ({
  active,
  points,
  accentColor = '#1565C0',
  onAddPoint,
  onFinish,
}) => {
  if (!active) return null;

  const toPx = (p: ConnectorDrawPoint) => ({
    x: (p.x / 100) * SLIDE_REF_WIDTH,
    y: (p.y / 100) * SLIDE_REF_HEIGHT,
  });

  const pathD =
    points.length >= 2
      ? points
          .map((p, i) => {
            const { x, y } = toPx(p);
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
          })
          .join(' ')
      : '';

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const slide = (e.currentTarget.parentElement?.querySelector('[data-pres-slide]') ??
      e.currentTarget.closest('[data-pres-slide]')) as HTMLElement | null;
    if (!slide) return;
    const rect = slide.getBoundingClientRect();
    if (rect.width < 8 || rect.height < 8) return;
    onAddPoint({
      x: Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)),
    });
  };

  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        zIndex: 5500,
        cursor: 'crosshair',
        touchAction: 'none',
      }}
      onPointerDown={handlePointerDown}
      onDoubleClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onFinish();
      }}
    >
      <svg
        width={SLIDE_REF_WIDTH}
        height={SLIDE_REF_HEIGHT}
        viewBox={`0 0 ${SLIDE_REF_WIDTH} ${SLIDE_REF_HEIGHT}`}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
        aria-hidden
      >
        {pathD ? (
          <path
            d={pathD}
            fill="none"
            stroke={accentColor}
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="8 6"
            opacity={0.85}
          />
        ) : null}
        {points.map((p, i) => {
          const { x, y } = toPx(p);
          return (
            <circle
              key={`${i}-${p.x}-${p.y}`}
              cx={x}
              cy={y}
              r={7}
              fill="#fff"
              stroke={accentColor}
              strokeWidth={3}
            />
          );
        })}
      </svg>
      <Box
        sx={{
          position: 'absolute',
          bottom: 10,
          left: 10,
          fontSize: 10,
          fontWeight: 600,
          bgcolor: 'rgba(33,33,33,0.82)',
          color: '#fff',
          px: 1,
          py: 0.4,
          borderRadius: 1,
          pointerEvents: 'none',
          lineHeight: 1.35,
        }}
      >
        Ecke klicken · Doppelklick oder Enter = fertig · Esc = abbrechen
      </Box>
    </Box>
  );
};

export default PresentationConnectorDrawOverlay;
