import React, { useState } from 'react';
import { Box, Divider, IconButton, Typography } from '@mui/material';
import {
  ArrowForward as ArrowIcon,
  Casino as CasinoIcon,
  ChevronLeft,
  ChevronRight,
  CircleOutlined as CircleIcon,
  Crop as CropIcon,
  CropSquare as RectIcon,
  Draw as DrawIcon,
  Highlight as HighlightIcon,
  HighlightAlt as LassoIcon,
  HorizontalRule as LineIcon,
  Save as SaveIcon,
  SaveAs as SaveAsIcon,
  Tag as TagIcon,
  Undo as UndoIcon,
  DeleteSweep as DeleteSweepIcon,
  SelfImprovement as QuietWorkIcon,
  MusicNote as MusicGameIcon,
  Close as CloseIcon,
  PhotoCamera as PhotoCameraIcon,
} from '@mui/icons-material';
import {
  MARKER_OPACITY_PRESETS,
  PEN_COLORS,
  PresentationDrawTool,
  lineWidthsForTool,
  toolUsesColor,
  toolUsesLineWidth,
} from '../../lib/presentationDrawTools';
import { JOHNNY_PRESENTATION, toHighlightFill } from '../../lib/presentationTheme';
import PresentationPresentZoomControls from './PresentationPresentZoomControls';
import { PresentationSoundSplitControl } from './PresentationSoundControls';
import {
  QuietWorkToolbarPanel,
  type QuietWorkController,
} from './PresentationQuietWorkOverlay';
import {
  MusicGameToolbarPanel,
  type MusicGameController,
} from './PresentationMusicGameOverlay';

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

const RANDOM_NUMBER_RANGES = [
  { max: 6, label: 'Würfel 1–6' },
  { max: 10, label: '1–10' },
  { max: 20, label: '1–20' },
  { max: 30, label: '1–30' },
  { max: 100, label: '1–100' },
] as const;

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
  round?: boolean;
  onClick: (e: React.MouseEvent<HTMLElement> | React.PointerEvent<HTMLElement>) => void;
  children: React.ReactNode;
};

/** Apple Pencil löst oft kein click aus — Pointer-Up zählt als Tippen. */
function stylusActivateHandlers(action: () => void, disabled?: boolean) {
  return {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType !== 'pen') return;
      e.preventDefault();
      e.stopPropagation();
    },
    onPointerUp: (e: React.PointerEvent) => {
      if (disabled || e.pointerType !== 'pen') return;
      e.preventDefault();
      e.stopPropagation();
      action();
    },
  };
}

function ToolBtn({ title, active, disabled, round, onClick, children }: ToolBtnProps) {
  return (
    <Tooltip title={title} enterDelay={500}>
      <span>
        <IconButton
          size="small"
          disabled={disabled}
          onClick={onClick}
          {...stylusActivateHandlers(() => onClick({} as React.MouseEvent<HTMLElement>), disabled)}
          sx={{
            ...MICRO_SX,
            ...(round
              ? {
                  borderRadius: '50%',
                  bgcolor: 'rgba(255,255,255,0.12)',
                  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.18)',
                }
              : {}),
            ...(active ? TOOL_ACTIVE : {}),
          }}
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
  nextButtonTitle?: string;
  onToggleDraw: () => void;
  onSelectTool: (tool: PresentationDrawTool) => void;
  onSelectColor: (color: string) => void;
  onSelectLineWidth: (width: number) => void;
  markerOpacity?: number;
  onSelectMarkerOpacity?: (opacity: number) => void;
  selectedCount?: number;
  selectionIsMarker?: boolean;
  onUndo: () => void;
  /** Alle Stiftstriche der aktuellen Folie löschen (nach Bestätigung in der Seite). */
  onClearAllInk?: () => void;
  onSave?: () => void;
  onSaveNamed?: () => void;
  /** Zufälligen SuS aus der Lerngruppe anzeigen (Würfel) */
  onPickRandomStudent?: () => void;
  canPickRandomStudent?: boolean;
  /** Zufallszahl 1…max anzeigen */
  onPickRandomNumber?: (max: number) => void;
  /** Entry Ticket dieser Stunde öffnen (TABLET-Play) */
  onOpenEntryTicket?: () => void;
  /** Tablet-Kamera: Foto direkt als Folienbild */
  onCaptureImage?: () => void;
  captureBusy?: boolean;
  /** Ausgewähltes Folienbild zuschneiden / Einpassen */
  imageCropAvailable?: boolean;
  imageCropActive?: boolean;
  onToggleImageCrop?: () => void;
  /** Sofort zum Dashboard (wie Taste D) */
  onExitToDashboard?: () => void;
  /** overlay = absolut in der Present-Bühne (Safari iPad); fixed = Viewport; docked = Layout unten */
  placement?: 'fixed' | 'docked' | 'overlay';
  /** Original-Ansicht: nur Navigation, kein Zeichnen/Speichern */
  readOnly?: boolean;
  /** Zoom über Fit-Scale (1 = passend, bis 3) */
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  quietWork?: QuietWorkController;
  musicGame?: MusicGameController;
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
  nextButtonTitle = 'Weiter',
  onToggleDraw,
  onSelectTool,
  onSelectColor,
  onSelectLineWidth,
  markerOpacity,
  onSelectMarkerOpacity,
  selectedCount = 0,
  selectionIsMarker = false,
  onUndo,
  onClearAllInk,
  onSave,
  onSaveNamed,
  onPickRandomStudent,
  canPickRandomStudent = false,
  onPickRandomNumber,
  onOpenEntryTicket,
  onCaptureImage,
  captureBusy = false,
  imageCropAvailable = false,
  imageCropActive = false,
  onToggleImageCrop,
  onExitToDashboard,
  placement = 'fixed',
  readOnly = false,
  zoom,
  onZoomChange,
  quietWork,
  musicGame,
}: PresentationTabletToolbarProps) {
  const showColors =
    !readOnly &&
    drawActive &&
    (toolUsesColor(activeTool) || (activeTool === 'select' && selectedCount > 0));
  const showLineWidths =
    !readOnly &&
    drawActive &&
    (toolUsesLineWidth(activeTool) || (activeTool === 'select' && selectedCount > 0));
  const showMarkerOpacity =
    !readOnly &&
    drawActive &&
    typeof onSelectMarkerOpacity === 'function' &&
    (activeTool === 'marker' || (activeTool === 'select' && selectionIsMarker));
  const widthOptions = lineWidthsForTool(
    activeTool === 'select' ? (selectionIsMarker ? 'marker' : 'pen') : activeTool
  );
  const docked = placement === 'docked';
  const overlay = placement === 'overlay';
  const [showNumberRanges, setShowNumberRanges] = useState(false);

  return (
    <Box
      data-pres-toolbar=""
      sx={{
        ...(docked
          ? {
              position: 'relative',
              flexShrink: 0,
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 0.4,
              px: 1,
              pt: 0.5,
              pb: 'max(10px, env(safe-area-inset-bottom))',
              bgcolor: 'rgba(0,0,0,0.92)',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              zIndex: 80,
            }
          : {
              position: overlay ? 'absolute' : 'fixed',
              bottom: overlay ? 'max(8px, env(safe-area-inset-bottom))' : 12,
              left: overlay
                ? 'max(8px, env(safe-area-inset-left))'
                : 'max(12px, env(safe-area-inset-left))',
              zIndex: 80,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 0.35,
              maxWidth: overlay ? 'calc(100% - 16px)' : 'calc(100vw - 16px)',
              touchAction: 'manipulation',
              pointerEvents: 'auto',
            }),
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {musicGame?.pickerOpen && <MusicGameToolbarPanel musicGame={musicGame} />}
      {quietWork?.pickerOpen && <QuietWorkToolbarPanel quietWork={quietWork} />}

      {showNumberRanges && onPickRandomNumber && (
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
          {RANDOM_NUMBER_RANGES.map((r) => (
            <Box
              key={r.max}
              role="button"
              tabIndex={0}
              aria-label={r.label}
              onClick={() => {
                setShowNumberRanges(false);
                onPickRandomNumber(r.max);
              }}
              {...stylusActivateHandlers(() => {
                setShowNumberRanges(false);
                onPickRandomNumber(r.max);
              })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setShowNumberRanges(false);
                  onPickRandomNumber(r.max);
                }
              }}
              sx={{
                px: 0.75,
                py: 0.35,
                borderRadius: 1.25,
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.9)',
                border: '1px solid rgba(255,255,255,0.16)',
                whiteSpace: 'nowrap',
                userSelect: 'none',
                '&:hover': {
                  bgcolor: 'rgba(255,152,0,0.18)',
                  borderColor: 'rgba(255,152,0,0.45)',
                  color: JOHNNY_PRESENTATION.warm,
                },
              }}
            >
              {r.label}
            </Box>
          ))}
        </Box>
      )}

      {(showColors || showLineWidths || showMarkerOpacity) && (
        <Box
          sx={{
            ...PANEL_SX,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            flexWrap: 'nowrap',
            gap: 0.4,
            borderRadius: 2,
            px: 0.55,
            py: 0.3,
          }}
        >
          {showColors &&
            PEN_COLORS.map((c) => (
              <Box
                key={c}
                data-pres-swatch=""
                role="button"
                tabIndex={0}
                aria-label={`Farbe ${c}`}
                onClick={() => onSelectColor(c)}
                {...stylusActivateHandlers(() => onSelectColor(c))}
                sx={{
                  position: 'relative',
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  bgcolor: c,
                  flexShrink: 0,
                  cursor: 'pointer',
                  touchAction: 'manipulation',
                  border:
                    strokeColor === c
                      ? `2px solid ${JOHNNY_PRESENTATION.warm}`
                      : c === '#FFFFFF'
                        ? '1px solid rgba(255,255,255,0.35)'
                        : '1px solid rgba(0,0,0,0.15)',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    inset: -6,
                  },
                }}
              />
            ))}
          {showColors && (showLineWidths || showMarkerOpacity) && (
            <Divider
              orientation="vertical"
              flexItem
              sx={{ mx: 0.15, borderColor: 'rgba(255,255,255,0.16)', height: 16, alignSelf: 'center' }}
            />
          )}
          {showLineWidths &&
            widthOptions.map((w) => (
              <Box
                key={w}
                data-pres-swatch=""
                role="button"
                tabIndex={0}
                aria-label={`Stärke ${w}`}
                onClick={() => onSelectLineWidth(w)}
                {...stylusActivateHandlers(() => onSelectLineWidth(w))}
                sx={{
                  position: 'relative',
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                  touchAction: 'manipulation',
                  border:
                    lineWidth === w
                      ? `2px solid ${JOHNNY_PRESENTATION.warm}`
                      : '1px solid rgba(255,255,255,0.18)',
                  bgcolor: lineWidth === w ? 'rgba(255,152,0,0.14)' : 'transparent',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    inset: -5,
                  },
                }}
              >
                <Box
                  sx={{
                    width: Math.min(12, Math.max(3, w * (activeTool === 'marker' ? 0.45 : 1.2))),
                    height: Math.min(12, Math.max(3, w * (activeTool === 'marker' ? 0.45 : 1.2))),
                    borderRadius: '50%',
                    bgcolor: 'rgba(255,255,255,0.88)',
                    pointerEvents: 'none',
                  }}
                />
              </Box>
            ))}
          {showLineWidths && showMarkerOpacity && (
            <Divider
              orientation="vertical"
              flexItem
              sx={{ mx: 0.15, borderColor: 'rgba(255,255,255,0.16)', height: 16, alignSelf: 'center' }}
            />
          )}
          {showMarkerOpacity &&
            MARKER_OPACITY_PRESETS.map((a) => {
              const selected = Math.abs((markerOpacity ?? 0.14) - a) < 0.02;
              return (
                <Box
                  key={a}
                  data-pres-swatch=""
                  role="button"
                  tabIndex={0}
                  aria-label={`Deckkraft ${Math.round(a * 100)} Prozent`}
                  title={`${Math.round(a * 100)} %`}
                  onClick={() => onSelectMarkerOpacity?.(a)}
                  {...stylusActivateHandlers(() => onSelectMarkerOpacity?.(a))}
                  sx={{
                    position: 'relative',
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                    touchAction: 'manipulation',
                    bgcolor: '#eceff1',
                    border: selected
                      ? `2px solid ${JOHNNY_PRESENTATION.warm}`
                      : '1px solid rgba(255,255,255,0.22)',
                    boxShadow: selected ? `0 0 0 1px ${JOHNNY_PRESENTATION.warm}` : 'none',
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      inset: -5,
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      bgcolor: toHighlightFill(strokeColor, a),
                      pointerEvents: 'none',
                    }}
                  />
                </Box>
              );
            })}
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

        {typeof zoom === 'number' && onZoomChange && (
          <>
            <Divider
              orientation="vertical"
              flexItem
              sx={{ mx: 0.15, borderColor: 'rgba(255,255,255,0.1)', height: 18, alignSelf: 'center' }}
            />
            <PresentationPresentZoomControls zoom={zoom} onZoomChange={onZoomChange} variant="dark" />
          </>
        )}

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
            Version
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

        {!readOnly && onCaptureImage && (
          <ToolBtn
            title="Foto aufnehmen und auf die Folie setzen"
            disabled={captureBusy}
            round
            onClick={onCaptureImage}
          >
            <PhotoCameraIcon sx={{ fontSize: 15 }} />
          </ToolBtn>
        )}

        {!readOnly && imageCropAvailable && onToggleImageCrop && (
          <ToolBtn
            title={
              imageCropActive
                ? 'Zuschneiden aus — Bild wieder einpassen'
                : 'Bild zuschneiden (ziehen = Ausschnitt)'
            }
            active={imageCropActive}
            onClick={onToggleImageCrop}
          >
            <CropIcon sx={{ fontSize: 15 }} />
          </ToolBtn>
        )}

        {!readOnly && onOpenEntryTicket && (
          <ToolBtn title="Entry Ticket" onClick={onOpenEntryTicket}>
            <Box
              component="span"
              sx={{
                width: 15,
                height: 15,
                borderRadius: '4px',
                bgcolor: '#1e88e5',
                color: '#fff',
                fontSize: 10,
                fontWeight: 800,
                lineHeight: '15px',
                textAlign: 'center',
                display: 'block',
              }}
            >
              E
            </Box>
          </ToolBtn>
        )}

        {!readOnly && onPickRandomStudent && (
          <ToolBtn
            title={
              canPickRandomStudent
                ? 'Zufälligen Schüler wählen'
                : 'Keine Schüler in der Lerngruppe'
            }
            disabled={!canPickRandomStudent}
            onClick={onPickRandomStudent}
          >
            <CasinoIcon sx={{ fontSize: 15 }} />
          </ToolBtn>
        )}

        {!readOnly && onPickRandomNumber && (
          <ToolBtn
            title="Zufallszahl"
            active={showNumberRanges}
            onClick={() => setShowNumberRanges((v) => !v)}
          >
            <TagIcon sx={{ fontSize: 15 }} />
          </ToolBtn>
        )}

        <PresentationSoundSplitControl variant="tablet" />

        {quietWork && (
          <ToolBtn
            title={
              quietWork.running || quietWork.finished
                ? 'Stillarbeit beenden'
                : 'Stillarbeit mit Timer'
            }
            active={quietWork.running || quietWork.pickerOpen || quietWork.finished}
            onClick={quietWork.togglePicker}
          >
            <QuietWorkIcon sx={{ fontSize: 16 }} />
          </ToolBtn>
        )}

        {musicGame && (
          <ToolBtn
            title={musicGame.running ? 'Musikspiel beenden' : 'Musikspiel'}
            active={musicGame.running || musicGame.pickerOpen}
            onClick={musicGame.togglePicker}
          >
            <MusicGameIcon sx={{ fontSize: 16 }} />
          </ToolBtn>
        )}

        {!readOnly && drawActive && (
          <>
            <ToolBtn
              title="Lasso: Schrift umfahren, dann verschieben und Größe ändern"
              active={activeTool === 'select'}
              onClick={() => onSelectTool('select')}
            >
              <LassoIcon sx={{ fontSize: 15 }} />
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
            {onClearAllInk && (
              <ToolBtn
                title="Alle Stiftstriche auf dieser Folie löschen"
                disabled={!canUndo}
                onClick={onClearAllInk}
              >
                <DeleteSweepIcon sx={{ fontSize: 15 }} />
              </ToolBtn>
            )}
          </>
        )}

        <Divider
          orientation="vertical"
          flexItem
          sx={{ mx: 0.15, borderColor: 'rgba(255,255,255,0.1)', height: 18, alignSelf: 'center' }}
        />

        {!readOnly && onSave && (
          <ToolBtn
            title="Sichern: aktuelle Version aktualisieren"
            disabled={saving}
            onClick={onSave}
          >
            <SaveIcon sx={{ fontSize: 15 }} />
          </ToolBtn>
        )}
        {!readOnly && onSaveNamed && (
          <ToolBtn
            title="Speichern als…: neue Version anlegen, aktuelle bleibt unverändert"
            disabled={saving}
            onClick={onSaveNamed}
          >
            <SaveAsIcon sx={{ fontSize: 15 }} />
          </ToolBtn>
        )}

        <ToolBtn title={nextButtonTitle} disabled={!canGoNext} onClick={onGoNext}>
          <ChevronRight sx={{ fontSize: 17 }} />
        </ToolBtn>

        {onExitToDashboard && (
          <>
            <Divider
              orientation="vertical"
              flexItem
              sx={{ mx: 0.15, borderColor: 'rgba(255,255,255,0.1)', height: 18, alignSelf: 'center' }}
            />
            <ToolBtn title="Zum Dashboard (D)" onClick={onExitToDashboard}>
              <CloseIcon sx={{ fontSize: 16 }} />
            </ToolBtn>
          </>
        )}
      </Box>
    </Box>
  );
}
