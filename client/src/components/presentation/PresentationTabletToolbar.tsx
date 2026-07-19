import React from 'react';
import { Box, Divider, IconButton, Tooltip, Typography } from '@mui/material';
import {
  ArrowForward as ArrowIcon,
  ChevronLeft,
  ChevronRight,
  CircleOutlined as CircleIcon,
  CropSquare as RectIcon,
  Draw as DrawIcon,
  Highlight as HighlightIcon,
  HorizontalRule as LineIcon,
  OpenWith as SelectIcon,
  Save as SaveIcon,
  SaveAs as SaveAsIcon,
  Undo as UndoIcon,
} from '@mui/icons-material';
import {
  PEN_COLORS,
  PresentationDrawTool,
  lineWidthsForTool,
  toolUsesColor,
  toolUsesLineWidth,
} from '../../lib/presentationDrawTools';
import { JOHNNY_PRESENTATION } from '../../lib/presentationTheme';

const MICRO_SX = {
  width: 24,
  height: 24,
  minWidth: 24,
  p: 0,
  borderRadius: 1.25,
  color: 'rgba(255,255,255,0.88)',
  '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
  '&.Mui-disabled': { color: 'rgba(255,255,255,0.22)' },
} as const;

const TOOL_ACTIVE = {
  bgcolor: 'rgba(255,152,0,0.32)',
  color: JOHNNY_PRESENTATION.warm,
  boxShadow: 'inset 0 0 0 1px rgba(255,152,0,0.45)',
} as const;

const PANEL_SX = {
  bgcolor: 'rgba(22,24,28,0.94)',
  border: '1px solid rgba(255,255,255,0.08)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  boxShadow: '0 6px 22px rgba(0,0,0,0.38)',
} as const;

function EraserIcon() {
  return (
    <Box
      component="span"
      sx={{
        width: 13,
        height: 13,
        borderRadius: 0.75,
        bgcolor: 'rgba(255,255,255,0.75)',
        display: 'block',
        transform: 'rotate(-18deg)',
        boxShadow: '0 0 0 1px rgba(0,0,0,0.2)',
      }}
    />
  );
}

type ToolBtnProps = {
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
};

function ToolBtn({ title, active, disabled, onClick, children }: ToolBtnProps) {
  return (
    <Tooltip title={title} enterDelay={500}>
      <span>
        <IconButton
          size="small"
          disabled={disabled}
          onClick={onClick}
          sx={{ ...MICRO_SX, ...(active ? TOOL_ACTIVE : {}) }}
        >
          {children}
        </IconButton>
      </span>
    </Tooltip>
  );
}

interface PresentationTabletToolbarProps {
  drawActive: boolean;
  activeTool: PresentationDrawTool;
  strokeColor: string;
  lineWidth: number;
  canGoPrev: boolean;
  canGoNext: boolean;
  canUndo: boolean;
  saving?: boolean;
  onGoPrev: () => void;
  onGoNext: () => void;
  onToggleDraw: () => void;
  onSelectTool: (tool: PresentationDrawTool) => void;
  onSelectColor: (color: string) => void;
  onSelectLineWidth: (width: number) => void;
  onUndo: () => void;
  onSave?: () => void;
  onSaveNamed?: () => void;
  /** docked = im Layout unten (Tablet-Präsentieren); fixed = schwebend */
  placement?: 'fixed' | 'docked';
  /** Original-Ansicht: nur Navigation, kein Zeichnen/Speichern */
  readOnly?: boolean;
}

export default function PresentationTabletToolbar({
  drawActive,
  activeTool,
  strokeColor,
  lineWidth,
  canGoPrev,
  canGoNext,
  canUndo,
  saving = false,
  onGoPrev,
  onGoNext,
  onToggleDraw,
  onSelectTool,
  onSelectColor,
  onSelectLineWidth,
  onUndo,
  onSave,
  onSaveNamed,
  placement = 'fixed',
  readOnly = false,
}: PresentationTabletToolbarProps) {
  const showColors = !readOnly && drawActive && toolUsesColor(activeTool);
  const showLineWidths = !readOnly && drawActive && toolUsesLineWidth(activeTool);
  const widthOptions = lineWidthsForTool(activeTool);
  const docked = placement === 'docked';

  return (
    <Box
      sx={{
        ...(docked
          ? {
              position: 'relative',
              flexShrink: 0,
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0.4,
              px: 1,
              pt: 0.5,
              pb: 'max(10px, env(safe-area-inset-bottom))',
              bgcolor: 'rgba(0,0,0,0.92)',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              zIndex: 20,
            }
          : {
              position: 'fixed',
              bottom: 12,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 20,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0.4,
              maxWidth: 'calc(100vw - 16px)',
            }),
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {showLineWidths && (
        <Box
          sx={{
            ...PANEL_SX,
            display: 'flex',
            alignItems: 'center',
            gap: 0.45,
            borderRadius: 2,
            px: 0.65,
            py: 0.35,
          }}
        >
          {widthOptions.map((w) => (
            <Box
              key={w}
              role="button"
              tabIndex={0}
              aria-label={`Stärke ${w}`}
              onClick={() => onSelectLineWidth(w)}
              sx={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                border:
                  lineWidth === w
                    ? `2px solid ${JOHNNY_PRESENTATION.warm}`
                    : '1px solid rgba(255,255,255,0.18)',
                bgcolor: lineWidth === w ? 'rgba(255,152,0,0.14)' : 'transparent',
              }}
            >
              <Box
                sx={{
                  width: Math.min(12, Math.max(3, w * (activeTool === 'marker' ? 0.45 : 1.2))),
                  height: Math.min(12, Math.max(3, w * (activeTool === 'marker' ? 0.45 : 1.2))),
                  borderRadius: '50%',
                  bgcolor: 'rgba(255,255,255,0.88)',
                }}
              />
            </Box>
          ))}
        </Box>
      )}

      {showColors && (
        <Box
          sx={{
            ...PANEL_SX,
            display: 'flex',
            alignItems: 'center',
            gap: 0.35,
            borderRadius: 2,
            px: 0.55,
            py: 0.35,
          }}
        >
          {PEN_COLORS.map((c) => (
            <Box
              key={c}
              role="button"
              tabIndex={0}
              aria-label={`Farbe ${c}`}
              onClick={() => onSelectColor(c)}
              sx={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                bgcolor: c,
                flexShrink: 0,
                cursor: 'pointer',
                border:
                  strokeColor === c
                    ? `2px solid ${JOHNNY_PRESENTATION.warm}`
                    : c === '#FFFFFF'
                      ? '1px solid rgba(255,255,255,0.35)'
                      : '1px solid rgba(0,0,0,0.15)',
                transition: 'transform 0.12s ease',
                '&:hover': { transform: 'scale(1.12)' },
              }}
            />
          ))}
        </Box>
      )}

      <Box
        sx={{
          ...PANEL_SX,
          display: 'flex',
          alignItems: 'center',
          gap: 0.25,
          borderRadius: 2.5,
          px: 0.45,
          py: 0.3,
        }}
      >
        <ToolBtn title="Zurück" disabled={!canGoPrev} onClick={onGoPrev}>
          <ChevronLeft sx={{ fontSize: 17 }} />
        </ToolBtn>

        <Divider
          orientation="vertical"
          flexItem
          sx={{ mx: 0.15, borderColor: 'rgba(255,255,255,0.1)', height: 18, alignSelf: 'center' }}
        />

        {readOnly ? (
          <Typography
            sx={{
              px: 1,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.4,
              color: JOHNNY_PRESENTATION.warm,
              whiteSpace: 'nowrap',
            }}
          >
            Original
          </Typography>
        ) : (
          <ToolBtn
            title={drawActive ? 'Werkzeuge aus' : 'Stift & Werkzeuge'}
            active={drawActive}
            onClick={onToggleDraw}
          >
            <DrawIcon sx={{ fontSize: 15 }} />
          </ToolBtn>
        )}

        {!readOnly && drawActive && (
          <>
            <ToolBtn
              title="Auswählen (Formen bewegen, drehen, skalieren)"
              active={activeTool === 'select'}
              onClick={() => onSelectTool('select')}
            >
              <SelectIcon sx={{ fontSize: 15 }} />
            </ToolBtn>

            <Divider
              orientation="vertical"
              flexItem
              sx={{ mx: 0.1, borderColor: 'rgba(255,255,255,0.1)', height: 18, alignSelf: 'center' }}
            />

            <ToolBtn
              title="Stift"
              active={activeTool === 'pen'}
              onClick={() => onSelectTool('pen')}
            >
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, lineHeight: 1 }}>✎</Typography>
            </ToolBtn>
            <ToolBtn
              title="Marker"
              active={activeTool === 'marker'}
              onClick={() => onSelectTool('marker')}
            >
              <HighlightIcon sx={{ fontSize: 15 }} />
            </ToolBtn>
            <ToolBtn
              title="Radierer"
              active={activeTool === 'eraser'}
              onClick={() => onSelectTool('eraser')}
            >
              <EraserIcon />
            </ToolBtn>

            <Divider
              orientation="vertical"
              flexItem
              sx={{ mx: 0.1, borderColor: 'rgba(255,255,255,0.1)', height: 18, alignSelf: 'center' }}
            />

            <ToolBtn
              title="Linie"
              active={activeTool === 'shape-line'}
              onClick={() => onSelectTool('shape-line')}
            >
              <LineIcon sx={{ fontSize: 15 }} />
            </ToolBtn>
            <ToolBtn
              title="Rechteck"
              active={activeTool === 'shape-rect'}
              onClick={() => onSelectTool('shape-rect')}
            >
              <RectIcon sx={{ fontSize: 14 }} />
            </ToolBtn>
            <ToolBtn
              title="Kreis"
              active={activeTool === 'shape-ellipse'}
              onClick={() => onSelectTool('shape-ellipse')}
            >
              <CircleIcon sx={{ fontSize: 14 }} />
            </ToolBtn>
            <ToolBtn
              title="Pfeil"
              active={activeTool === 'shape-arrow'}
              onClick={() => onSelectTool('shape-arrow')}
            >
              <ArrowIcon sx={{ fontSize: 14 }} />
            </ToolBtn>

            <Divider
              orientation="vertical"
              flexItem
              sx={{ mx: 0.1, borderColor: 'rgba(255,255,255,0.1)', height: 18, alignSelf: 'center' }}
            />

            <ToolBtn title="Rückgängig" disabled={!canUndo} onClick={onUndo}>
              <UndoIcon sx={{ fontSize: 15 }} />
            </ToolBtn>
          </>
        )}

        <Divider
          orientation="vertical"
          flexItem
          sx={{ mx: 0.15, borderColor: 'rgba(255,255,255,0.1)', height: 18, alignSelf: 'center' }}
        />

        {!readOnly && onSave && (
          <ToolBtn
            title="Speichern: Original bleibt (Erstell-Stand) + Bearbeitet (mit Strichen) für SuS"
            disabled={saving}
            onClick={onSave}
          >
            <SaveIcon sx={{ fontSize: 15 }} />
          </ToolBtn>
        )}
        {!readOnly && onSaveNamed && (
          <ToolBtn
            title="Als benannte Version speichern (z. B. Praesentation_Klasse5.pdf)"
            disabled={saving}
            onClick={onSaveNamed}
          >
            <SaveAsIcon sx={{ fontSize: 15 }} />
          </ToolBtn>
        )}

        <ToolBtn title="Weiter" disabled={!canGoNext} onClick={onGoNext}>
          <ChevronRight sx={{ fontSize: 17 }} />
        </ToolBtn>
      </Box>
    </Box>
  );
}
