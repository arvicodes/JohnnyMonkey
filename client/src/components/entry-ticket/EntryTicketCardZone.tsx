import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  AutoFixOff as EraserIcon,
  ClearAll as ClearInkIcon,
  Edit as PenIcon,
  Keyboard as KeyboardIcon,
  Undo as UndoIcon,
} from '@mui/icons-material';
import type { PresentationStroke } from '../../lib/presentationDeck';
import { DEFAULT_PEN_COLOR } from '../../lib/presentationDrawTools';
import PresentationDrawOverlay from '../presentation/PresentationDrawOverlay';
import { EntryTicketRichField } from './EntryTicketRichField';

export type EntryTicketZoneMode = 'text' | 'pen' | 'eraser';

const INK_COLORS = [
  { label: 'Schwarz', value: '#111827' },
  { label: 'Blau', value: '#1565c0' },
  { label: 'Rot', value: '#c62828' },
  { label: 'Orange', value: '#ef6c00' },
  { label: 'Grün', value: '#2e7d32' },
  { label: 'Violett', value: '#6a1b9a' },
  { label: 'Grau', value: '#546e7a' },
] as const;

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
  ink?: PresentationStroke[];
  onInkChange?: (strokes: PresentationStroke[]) => void;
  slideId: string;
  active?: boolean;
  onFocus?: () => void;
};

export function EntryTicketCardZone({
  tone,
  value,
  onChange,
  placeholder,
  flex = 1,
  minHeight = 180,
  editorFontSize,
  ink = [],
  onInkChange,
  slideId,
  active = false,
  onFocus,
}: Props) {
  const theme = ZONE_THEMES[tone];
  const inkEnabled = typeof onInkChange === 'function';
  const [inkMode, setInkMode] = useState<EntryTicketZoneMode>('text');
  const [inkColor, setInkColor] = useState(DEFAULT_PEN_COLOR);
  const [selectedStrokeIds, setSelectedStrokeIds] = useState<string[]>([]);
  const [clearInkOpen, setClearInkOpen] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedStrokeIds([]);
    setInkMode('text');
  }, [slideId]);

  const handleInkStart = useCallback(() => {
    setInkMode('pen');
    setInkColor((c) => c || DEFAULT_PEN_COLOR);
  }, []);

  const overlayTool = inkMode === 'eraser' ? 'eraser' : 'pen';

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
          justifyContent: 'space-between',
          gap: 0.75,
          px: 1,
          py: 0.55,
          bgcolor: theme.headerBg,
          borderBottom: `1px solid ${theme.border}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.65, minWidth: 0 }}>
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
              flexShrink: 0,
            }}
          >
            {theme.label}
          </Box>
          <Typography sx={{ fontSize: '0.72rem', color: theme.accent, fontWeight: 600, opacity: 0.85 }}>
            {inkMode === 'text'
              ? 'Tippen · Bilder · Format'
              : inkMode === 'pen'
                ? 'Stift'
                : 'Radierer'}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.15, flexShrink: 0 }}>
          <Tooltip title="Tippen und Text formatieren">
            <IconButton
              size="small"
              aria-label="Tippen"
              onClick={() => {
                setInkMode('text');
                setSelectedStrokeIds([]);
                window.requestAnimationFrame(() => {
                  const el = hostRef.current?.querySelector('[contenteditable="true"]') as HTMLElement | null;
                  el?.focus({ preventScroll: true });
                });
              }}
              sx={{
                width: 28,
                height: 28,
                color: inkMode === 'text' ? theme.accent : 'rgba(0,0,0,0.45)',
                bgcolor: inkMode === 'text' ? theme.accentSoft : 'transparent',
              }}
            >
              <KeyboardIcon sx={{ fontSize: 17 }} />
            </IconButton>
          </Tooltip>

          {inkEnabled ? (
            <>
              <Tooltip title="Stift — auch mit Apple Pencil (schreibt immer)">
                <IconButton
                  size="small"
                  aria-label="Stift"
                  onClick={() => {
                    setInkMode('pen');
                    setSelectedStrokeIds([]);
                    const el = document.activeElement;
                    if (el instanceof HTMLElement && el.isContentEditable) el.blur();
                  }}
                  sx={{
                    width: 28,
                    height: 28,
                    color: inkMode === 'pen' ? theme.accent : 'rgba(0,0,0,0.45)',
                    bgcolor: inkMode === 'pen' ? theme.accentSoft : 'transparent',
                  }}
                >
                  <PenIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Radierer">
                <IconButton
                  size="small"
                  aria-label="Radierer"
                  onClick={() => {
                    setInkMode('eraser');
                    setSelectedStrokeIds([]);
                    const el = document.activeElement;
                    if (el instanceof HTMLElement && el.isContentEditable) el.blur();
                  }}
                  sx={{
                    width: 28,
                    height: 28,
                    color: inkMode === 'eraser' ? theme.accent : 'rgba(0,0,0,0.45)',
                    bgcolor: inkMode === 'eraser' ? theme.accentSoft : 'transparent',
                  }}
                >
                  <EraserIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              {ink.length > 0 ? (
                <Tooltip title="Letzten Strich rückgängig">
                  <IconButton
                    size="small"
                    aria-label="Rückgängig"
                    onClick={() => onInkChange?.(ink.slice(0, -1))}
                    sx={{ width: 28, height: 28, color: 'rgba(0,0,0,0.5)' }}
                  >
                    <UndoIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              ) : null}
              <Tooltip title="Alle Stiftstriche löschen">
                <span>
                  <IconButton
                    size="small"
                    aria-label="Tinte löschen"
                    disabled={ink.length === 0}
                    onClick={() => setClearInkOpen(true)}
                    sx={{ width: 28, height: 28, color: ink.length ? '#c62828' : 'rgba(0,0,0,0.25)' }}
                  >
                    <ClearInkIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </span>
              </Tooltip>
            </>
          ) : null}
        </Box>
      </Box>

      {inkEnabled && inkMode !== 'text' ? (
        <Box
          sx={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 0.45,
            px: 1,
            py: 0.4,
            borderBottom: `1px solid ${theme.border}`,
            bgcolor: 'rgba(255,255,255,0.45)',
          }}
        >
          {INK_COLORS.map((c) => (
            <Tooltip key={c.value} title={c.label}>
              <Box
                role="button"
                tabIndex={0}
                aria-label={c.label}
                onClick={() => setInkColor(c.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setInkColor(c.value);
                  }
                }}
                sx={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  bgcolor: c.value,
                  cursor: 'pointer',
                  flexShrink: 0,
                  border:
                    inkColor.toLowerCase() === c.value.toLowerCase()
                      ? `2px solid ${theme.accent}`
                      : '1px solid rgba(0,0,0,0.18)',
                  boxShadow:
                    inkColor.toLowerCase() === c.value.toLowerCase()
                      ? `0 0 0 1px ${theme.accent}`
                      : 'none',
                }}
              />
            </Tooltip>
          ))}
        </Box>
      ) : null}

      <Box
        ref={hostRef}
        sx={{
          position: 'relative',
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          touchAction: inkMode === 'text' ? 'auto' : 'none',
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
          inkMode={inkMode}
          editorFontSize={editorFontSize}
        />
        {inkEnabled ? (
          <PresentationDrawOverlay
            fillContainer
            strokes={ink}
            onStrokesChange={onInkChange!}
            enabled
            interactive
            passThroughNonPen={inkMode === 'text'}
            onInkStart={handleInkStart}
            slideId={slideId}
            tool={overlayTool}
            strokeColor={inkColor}
            lineWidth={3}
            selectedStrokeIds={selectedStrokeIds}
            onSelectedStrokeIdsChange={setSelectedStrokeIds}
            scale={1}
          />
        ) : null}
      </Box>

      {clearInkOpen ? (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 20,
            bgcolor: 'rgba(0,0,0,0.35)',
            display: 'grid',
            placeItems: 'center',
            p: 2,
          }}
          onClick={() => setClearInkOpen(false)}
        >
          <Box
            onClick={(e) => e.stopPropagation()}
            sx={{
              bgcolor: '#fff',
              borderRadius: 1.5,
              p: 2,
              maxWidth: 320,
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            }}
          >
            <Typography sx={{ fontWeight: 700, mb: 0.75 }}>Alle Stiftstriche löschen?</Typography>
            <Typography sx={{ fontSize: '0.85rem', color: '#546e7a', mb: 1.5 }}>
              Stift- und Radierstriche auf dieser Seite werden entfernt. Der Text bleibt erhalten.
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.75 }}>
              <IconButton size="small" onClick={() => setClearInkOpen(false)} sx={{ fontSize: '0.8rem' }}>
                Abbrechen
              </IconButton>
              <Box
                component="button"
                onClick={() => {
                  onInkChange?.([]);
                  setSelectedStrokeIds([]);
                  setClearInkOpen(false);
                }}
                sx={{
                  border: 'none',
                  borderRadius: 1,
                  px: 1.25,
                  py: 0.5,
                  bgcolor: '#c62828',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                Löschen
              </Box>
            </Box>
          </Box>
        </Box>
      ) : null}
    </Box>
  );
}
