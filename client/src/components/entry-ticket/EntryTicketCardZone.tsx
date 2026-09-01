import React, { useCallback, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import type { PresentationStroke } from '../../lib/presentationDeck';
import { isInkDrawCaptureTool, type PresentationDrawTool } from '../../lib/presentationDrawTools';
import PresentationDrawOverlay from '../presentation/PresentationDrawOverlay';
import { EntryTicketRichField } from './EntryTicketRichField';

const ZONE_THEMES = {
  prompt: {
    panelBg: '#fffde7',
    headerBg: '#fff9c4',
    border: '#ffe082',
    accent: '#f57f17',
    accentSoft: 'rgba(245, 127, 23, 0.14)',
    label: 'Frage',
    badgeBg: '#fbc02d',
    badgeColor: '#3e2723',
  },
  answer: {
    panelBg: '#f1f8e9',
    headerBg: '#dcedc8',
    border: '#aed581',
    accent: '#33691e',
    accentSoft: 'rgba(51, 105, 30, 0.12)',
    label: 'Lösung',
    badgeBg: '#8bc34a',
    badgeColor: '#1b5e20',
  },
} as const;

type ZoneTone = keyof typeof ZONE_THEMES;

type Props = {
  tone: ZoneTone;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  flex?: number | string;
  minHeight?: number;
  editorFontSize?: string | Record<string, string>;
  slideId: string;
  active?: boolean;
  onFocus?: () => void;
  /** Stift auf der Frage */
  ink?: PresentationStroke[];
  onInkChange?: (strokes: PresentationStroke[]) => void;
  drawActive?: boolean;
  activeInkTool?: PresentationDrawTool;
  strokeColor?: string;
  lineWidth?: number;
  markerOpacity?: number;
  selectedStrokeIds?: string[];
  onSelectedStrokeIdsChange?: (ids: string[]) => void;
  onInkStart?: () => void;
};

export function EntryTicketCardZone({
  tone,
  value,
  onChange,
  placeholder,
  flex = 1,
  minHeight = 180,
  editorFontSize,
  slideId,
  active = false,
  onFocus,
  ink = [],
  onInkChange,
  drawActive = false,
  activeInkTool = 'select',
  strokeColor = '#1565c0',
  lineWidth = 3,
  markerOpacity = 0.14,
  selectedStrokeIds = [],
  onSelectedStrokeIdsChange,
  onInkStart,
}: Props) {
  const theme = ZONE_THEMES[tone];
  const inkEnabled = typeof onInkChange === 'function';
  const hostRef = useRef<HTMLDivElement>(null);
  const textEditing = !drawActive;

  const inkCapture =
    drawActive && (isInkDrawCaptureTool(activeInkTool) || activeInkTool === 'select');

  const handleHostPointerDownCapture = useCallback(
    (e: React.PointerEvent) => {
      if (!inkEnabled || drawActive) return;
      if (e.pointerType !== 'pen') return;
      e.preventDefault();
      e.stopPropagation();
      onInkStart?.();
    },
    [drawActive, inkEnabled, onInkStart],
  );

  const overlay =
    inkEnabled && onInkChange ? (
      <PresentationDrawOverlay
        fillContainer
        strokes={ink}
        onStrokesChange={onInkChange}
        enabled
        interactive={inkCapture}
        passThroughNonPen={!drawActive}
        onInkStart={onInkStart}
        slideId={slideId}
        tool={activeInkTool}
        strokeColor={strokeColor}
        lineWidth={lineWidth}
        markerOpacity={markerOpacity}
        selectedStrokeIds={selectedStrokeIds}
        onSelectedStrokeIdsChange={onSelectedStrokeIdsChange}
        scale={1}
      />
    ) : null;

  return (
    <Box
      sx={{
        position: 'relative',
        flex,
        minHeight,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: theme.panelBg,
        border: '1px solid',
        borderColor: active ? theme.accent : theme.border,
        borderRadius: 1.5,
        overflow: 'hidden',
        boxShadow: active ? `0 0 0 2px ${theme.accentSoft}` : '0 1px 4px rgba(0,0,0,0.06)',
      }}
      onFocusCapture={() => onFocus?.()}
    >
      <Box
        sx={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 0.65,
          px: 1,
          py: 0.55,
          bgcolor: theme.headerBg,
          borderBottom: `1px solid ${theme.border}`,
        }}
      >
        <Box
          sx={{
            px: 0.75,
            py: 0.15,
            borderRadius: 999,
            bgcolor: theme.badgeBg,
            color: theme.badgeColor,
            fontSize: '0.62rem',
            fontWeight: 800,
            letterSpacing: 0.4,
            textTransform: 'uppercase',
          }}
        >
          {theme.label}
        </Box>
        <Typography sx={{ fontSize: '0.72rem', color: theme.accent, fontWeight: 600, opacity: 0.85 }}>
          {drawActive && inkEnabled
            ? 'Stift-Werkzeuge unten'
            : 'Tippen · Farben · Bilder · Format'}
        </Typography>
      </Box>

      <Box
        ref={hostRef}
        onPointerDownCapture={handleHostPointerDownCapture}
        sx={{
          position: 'relative',
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          touchAction: drawActive ? 'none' : 'auto',
        }}
      >
        <EntryTicketRichField
          value={value}
          onChange={onChange}
          placeholder={placeholder ?? theme.label}
          tone={tone}
          playSurface
          fillParent
          notesSurface
          textEditing={textEditing}
          editorFontSize={editorFontSize}
          overlay={overlay}
        />
      </Box>
    </Box>
  );
}
