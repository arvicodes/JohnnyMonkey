import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import type { PresentationStroke } from '../../lib/presentationDeck';
import { SLIDE_REF_HEIGHT, SLIDE_REF_WIDTH } from '../../lib/presentationDeck';
import {
  DEFAULT_MARKER_COLOR,
  DEFAULT_MARKER_OPACITY,
  DEFAULT_PEN_COLOR,
  defaultColorForTool,
  defaultLineWidthForTool,
  lineWidthsForTool,
  toolUsesColor,
  type PresentationDrawTool,
} from '../../lib/presentationDrawTools';
import PresentationTabletToolbar from '../presentation/PresentationTabletToolbar';
import type { ConnectorDrawPoint } from '../presentation/PresentationConnectorDrawOverlay';
import { EntryTicketCardZone } from './EntryTicketCardZone';
import { DialogCloseIconButton, dialogCloseTitleSx } from '../ui/dialog-close-icon-button';

type Props = {
  open: boolean;
  title: string;
  prompt: string;
  solution: string;
  ink: PresentationStroke[];
  onPromptChange: (prompt: string) => void;
  onSolutionChange: (solution: string) => void;
  onInkChange: (strokes: PresentationStroke[]) => void;
  onClose: () => void;
  onSave?: () => void;
  slideId?: string;
};

export function EntryTicketCardEditorModal({
  open,
  title,
  prompt,
  solution,
  ink,
  onPromptChange,
  onSolutionChange,
  onInkChange,
  onClose,
  onSave,
  slideId = 'et-card-editor',
}: Props) {
  const [activeSide, setActiveSide] = useState<'prompt' | 'answer'>('prompt');
  const [drawActive, setDrawActive] = useState(false);
  const [activeInkTool, setActiveInkTool] = useState<PresentationDrawTool>('select');
  const [strokeColor, setStrokeColor] = useState(DEFAULT_PEN_COLOR);
  const [lineWidth, setLineWidth] = useState(() => defaultLineWidthForTool('pen'));
  const [markerOpacity, setMarkerOpacity] = useState(DEFAULT_MARKER_OPACITY);
  const [selectedStrokeIds, setSelectedStrokeIds] = useState<string[]>([]);
  const [clearInkOpen, setClearInkOpen] = useState(false);
  const [connectorDrawActive, setConnectorDrawActive] = useState(false);
  const [connectorDrawPoints, setConnectorDrawPoints] = useState<ConnectorDrawPoint[]>([]);
  const penColorRef = useRef(DEFAULT_PEN_COLOR);
  const markerColorRef = useRef(DEFAULT_MARKER_COLOR);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      return;
    }
    const justOpened = !wasOpenRef.current;
    wasOpenRef.current = true;
    if (justOpened) {
      setDrawActive(false);
      setActiveInkTool('select');
      setActiveSide('prompt');
      setStrokeColor(penColorRef.current);
      setLineWidth(defaultLineWidthForTool('pen'));
      setClearInkOpen(false);
      setConnectorDrawActive(false);
      setConnectorDrawPoints([]);
    }
    setSelectedStrokeIds([]);
  }, [open, slideId]);

  const handleToggleDraw = () => {
    setDrawActive((v) => {
      if (!v) {
        setActiveInkTool('pen');
        setStrokeColor(penColorRef.current);
      } else {
        setConnectorDrawActive(false);
        setConnectorDrawPoints([]);
      }
      return !v;
    });
  };

  const finishConnectorDraw = useCallback(() => {
    if (connectorDrawPoints.length < 2) {
      setConnectorDrawActive(false);
      setConnectorDrawPoints([]);
      return;
    }
    const absPoints = connectorDrawPoints.map((p) => ({
      x: (p.x / 100) * SLIDE_REF_WIDTH,
      y: (p.y / 100) * SLIDE_REF_HEIGHT,
    }));
    const stroke: PresentationStroke = {
      id: `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      points: absPoints,
      color: strokeColor,
      lineWidth,
      shape: 'connector',
      arrowHeadSize: 22,
    };
    onInkChange([...ink, stroke]);
    setConnectorDrawActive(false);
    setConnectorDrawPoints([]);
    setDrawActive(true);
  }, [connectorDrawPoints, ink, lineWidth, onInkChange, strokeColor]);

  const startConnectorDraw = useCallback(() => {
    setConnectorDrawActive(true);
    setConnectorDrawPoints([]);
    setDrawActive(true);
    setActiveSide('prompt');
  }, []);

  useEffect(() => {
    if (!connectorDrawActive) return undefined;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setConnectorDrawActive(false);
        setConnectorDrawPoints([]);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        finishConnectorDraw();
      } else if (e.key === 'Backspace' && connectorDrawPoints.length > 0) {
        e.preventDefault();
        setConnectorDrawPoints((pts) => pts.slice(0, -1));
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [connectorDrawActive, connectorDrawPoints.length, finishConnectorDraw]);

  const handleInkStart = () => {
    setDrawActive(true);
    if (activeInkTool === 'select') setActiveInkTool('pen');
  };

  useEffect(() => {
    if (!drawActive) return;
    const el = document.activeElement;
    if (
      el instanceof HTMLElement &&
      (el.isContentEditable ||
        el.closest('[data-et-play-edit], [data-pres-rich-zone], [contenteditable="true"]'))
    ) {
      el.blur();
    }
  }, [drawActive, activeInkTool]);

  const handleSelectInkTool = (tool: PresentationDrawTool) => {
    setDrawActive(true);
    setActiveInkTool(tool);
    const options = lineWidthsForTool(tool);
    if (!options.some((w) => Math.abs(w - lineWidth) < 0.01)) {
      setLineWidth(defaultLineWidthForTool(tool));
    }
    if (tool === 'marker') {
      setStrokeColor(markerColorRef.current || defaultColorForTool(tool));
    } else if (toolUsesColor(tool)) {
      setStrokeColor(penColorRef.current || defaultColorForTool(tool));
    }
  };

  const handleSelectInkColor = (color: string) => {
    setStrokeColor(color);
    if (activeInkTool === 'marker') markerColorRef.current = color;
    else if (toolUsesColor(activeInkTool)) penColorRef.current = color;
  };

  const selectedStroke =
    selectedStrokeIds.length === 1 ? ink.find((s) => s.id === selectedStrokeIds[0]) : undefined;

  const patchSelectedStroke = (patch: Partial<PresentationStroke>) => {
    if (!selectedStroke) return;
    onInkChange(ink.map((s) => (s.id === selectedStroke.id ? { ...s, ...patch } : s)));
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth={false}
        PaperProps={{
          sx: {
            width: 'min(1180px, 98vw)',
            maxWidth: '98vw',
            height: 'min(92vh, 960px)',
            maxHeight: '96vh',
            m: { xs: 0.75, sm: 1.5 },
            display: 'flex',
            flexDirection: 'column',
            bgcolor: '#eceff1',
            overflow: 'hidden',
          },
        }}
      >
        <DialogTitle
          sx={{
            ...dialogCloseTitleSx,
            pr: 9,
            flexShrink: 0,
            minHeight: 44,
            maxHeight: 48,
            bgcolor: '#fffde7',
            color: '#3e2723',
            py: 0.75,
            borderBottom: '1px solid #ffe082',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0, pr: 4 }}>
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: 1,
                bgcolor: '#fbc02d',
                color: '#3e2723',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 900,
                fontSize: '0.95rem',
                flexShrink: 0,
              }}
            >
              K
            </Box>
            <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: '#3e2723' }} noWrap>
              {title}
            </Typography>
          </Box>
          {onSave ? (
            <Tooltip title="Sichern (Arbeitsstand + Backup)">
              <IconButton
                size="small"
                onClick={onSave}
                aria-label="Sichern"
                sx={{
                  position: 'absolute',
                  right: 36,
                  top: 6,
                  zIndex: 2,
                  color: '#5d4037',
                  width: 28,
                  height: 28,
                  minWidth: 28,
                  p: 0.25,
                  '&:hover': { bgcolor: 'rgba(251, 192, 45, 0.35)' },
                }}
              >
                <SaveIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          ) : null}
          <DialogCloseIconButton
            onClose={onClose}
            sx={{ color: '#5d4037', top: 6, transform: 'none', '&:hover': { bgcolor: 'rgba(251, 192, 45, 0.35)' } }}
            iconSx={{ color: '#5d4037' }}
          />
        </DialogTitle>

        <DialogContent
          sx={{
            pt: 1.25,
            pb: 0,
            px: { xs: 1.25, sm: 1.75 },
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            overflow: 'hidden',
            bgcolor: '#eceff1',
          }}
        >
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              gap: 1.25,
            }}
          >
            <EntryTicketCardZone
              tone="prompt"
              value={prompt}
              onChange={onPromptChange}
              placeholder="Frage eingeben…"
              flex={1.15}
              minHeight={220}
              editorFontSize={{ xs: '1.12rem', sm: '1.24rem' }}
              slideId={`${slideId}-prompt`}
              active={activeSide === 'prompt'}
              onFocus={() => setActiveSide('prompt')}
              ink={ink}
              onInkChange={onInkChange}
              drawActive={drawActive}
              activeInkTool={activeInkTool}
              strokeColor={strokeColor}
              lineWidth={lineWidth}
              markerOpacity={markerOpacity}
              selectedStrokeIds={selectedStrokeIds}
              onSelectedStrokeIdsChange={setSelectedStrokeIds}
              onInkStart={handleInkStart}
              connectorDrawActive={connectorDrawActive}
              connectorDrawPoints={connectorDrawPoints}
              onConnectorAddPoint={(p) => setConnectorDrawPoints((pts) => [...pts, p])}
              onConnectorFinish={finishConnectorDraw}
            />
            <EntryTicketCardZone
              tone="answer"
              value={solution}
              onChange={onSolutionChange}
              placeholder="Lösung eingeben…"
              flex={0.85}
              minHeight={180}
              editorFontSize={{ xs: '1.02rem', sm: '1.1rem' }}
              slideId={`${slideId}-answer`}
              active={activeSide === 'answer'}
              onFocus={() => setActiveSide('answer')}
            />
          </Box>
        </DialogContent>

        <Box sx={{ flexShrink: 0 }}>
          <PresentationTabletToolbar
            variant="ink"
            placement="docked"
            drawActive={drawActive}
            activeTool={activeInkTool}
            strokeColor={strokeColor}
            lineWidth={lineWidth}
            canGoPrev={false}
            canGoNext={false}
            canUndo={ink.length > 0}
            onGoPrev={() => {}}
            onGoNext={() => {}}
            onToggleDraw={handleToggleDraw}
            onSelectTool={handleSelectInkTool}
            onSelectColor={handleSelectInkColor}
            onSelectLineWidth={setLineWidth}
            markerOpacity={markerOpacity}
            onSelectMarkerOpacity={setMarkerOpacity}
            selectedCount={selectedStrokeIds.length}
            selectionIsMarker={
              selectedStrokeIds.length > 0 &&
              ink.filter((s) => selectedStrokeIds.includes(s.id)).every((s) => s.mode === 'marker')
            }
            onUndo={() => onInkChange(ink.slice(0, -1))}
            onClearAllInk={() => setClearInkOpen(true)}
            onSave={onSave}
            selectedArrowStroke={
              selectedStroke?.shape === 'arrow' || selectedStroke?.shape === 'curved-arrow'
                ? selectedStroke
                : null
            }
            onPatchSelectedStroke={patchSelectedStroke}
            onStartConnectorDraw={startConnectorDraw}
            connectorDrawActive={connectorDrawActive}
          />
        </Box>

        <DialogActions sx={{ px: 2, py: 1, bgcolor: '#eceff1', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            onClick={onClose}
            sx={{ bgcolor: '#455a64', '&:hover': { bgcolor: '#37474f' }, minWidth: 120 }}
          >
            Fertig
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={clearInkOpen}
        onClose={() => setClearInkOpen(false)}
        maxWidth="xs"
        fullWidth
        sx={{ zIndex: 1400 }}
      >
        <DialogTitle sx={{ ...dialogCloseTitleSx }}>
          Alle Stiftstriche löschen?
          <DialogCloseIconButton onClose={() => setClearInkOpen(false)} />
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '0.9rem', color: '#546e7a' }}>
            Alle Stift-, Marker- und Formzeichnungen auf der Frage werden entfernt.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearInkOpen(false)}>Abbrechen</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              onInkChange([]);
              setSelectedStrokeIds([]);
              setClearInkOpen(false);
            }}
          >
            Löschen
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
