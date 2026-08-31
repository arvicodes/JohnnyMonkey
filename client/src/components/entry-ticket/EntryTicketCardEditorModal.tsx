import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import type { PresentationStroke } from '../../lib/presentationDeck';
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
import PresentationDrawOverlay from '../presentation/PresentationDrawOverlay';
import PresentationTabletToolbar from '../presentation/PresentationTabletToolbar';
import { DialogCloseIconButton, dialogCloseTitleSx } from '../ui/dialog-close-icon-button';
import { EntryTicketRichField } from './EntryTicketRichField';

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
  const [drawActive, setDrawActive] = useState(false);
  const [activeInkTool, setActiveInkTool] = useState<PresentationDrawTool>('pen');
  const [strokeColor, setStrokeColor] = useState(DEFAULT_PEN_COLOR);
  const [lineWidth, setLineWidth] = useState(() => defaultLineWidthForTool('pen'));
  const [markerOpacity, setMarkerOpacity] = useState(DEFAULT_MARKER_OPACITY);
  const [selectedStrokeIds, setSelectedStrokeIds] = useState<string[]>([]);
  const [clearInkOpen, setClearInkOpen] = useState(false);
  const penColorRef = useRef(DEFAULT_PEN_COLOR);
  const markerColorRef = useRef(DEFAULT_MARKER_COLOR);

  useEffect(() => {
    if (!open) return;
    setDrawActive(false);
    setActiveInkTool('pen');
    setStrokeColor(penColorRef.current);
    setLineWidth(defaultLineWidthForTool('pen'));
    setSelectedStrokeIds([]);
    setClearInkOpen(false);
  }, [open, slideId]);

  const handleToggleDraw = () => {
    setDrawActive((v) => {
      if (!v) {
        setActiveInkTool('pen');
        setStrokeColor(penColorRef.current);
      }
      return !v;
    });
  };

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

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth={false}
        PaperProps={{
          sx: {
            width: 'min(1040px, 96vw)',
            maxWidth: '96vw',
            height: 'min(88vh, 900px)',
            maxHeight: '92vh',
            m: { xs: 0.75, sm: 1.5 },
            display: 'flex',
            flexDirection: 'column',
            bgcolor: '#eceff1',
            overflow: 'hidden',
          },
        }}
      >
        <DialogTitle sx={{ ...dialogCloseTitleSx, bgcolor: '#455a64', color: '#fff', py: 1.1 }}>
          {title}
          <DialogCloseIconButton
            onClose={onClose}
            sx={{ color: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' } }}
            iconSx={{ color: '#fff' }}
          />
        </DialogTitle>
        <DialogContent
          sx={{
            pt: 1.5,
            pb: 0,
            px: { xs: 1.25, sm: 1.75 },
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            overflow: 'hidden',
          }}
        >
          <Typography sx={{ mt: 0.75, fontSize: '0.78rem', color: '#546e7a', flexShrink: 0 }}>
            Zeichnen: unten Stift einschalten (Lasso, Marker, Formen). Tippen: Stift wieder aus.
          </Typography>
          <Box
            sx={{
              position: 'relative',
              flex: 1,
              minHeight: 220,
              display: 'flex',
              flexDirection: 'column',
              touchAction: drawActive ? 'none' : 'manipulation',
            }}
          >
            <Box sx={{ flex: 1, minHeight: 0 }}>
              <EntryTicketRichField
                value={prompt}
                onChange={onPromptChange}
                placeholder="Frage"
                tone="prompt"
                minHeight={220}
                playSurface
                fillParent
                editorFontSize={{ xs: '1.15rem', sm: '1.28rem' }}
              />
            </Box>
            <PresentationDrawOverlay
              fillContainer
              strokes={ink}
              onStrokesChange={onInkChange}
              enabled={drawActive}
              slideId={slideId}
              tool={activeInkTool}
              strokeColor={strokeColor}
              lineWidth={lineWidth}
              markerOpacity={markerOpacity}
              selectedStrokeIds={selectedStrokeIds}
              onSelectedStrokeIdsChange={setSelectedStrokeIds}
              scale={1}
            />
          </Box>
          <Box sx={{ flexShrink: 0 }}>
            <EntryTicketRichField
              value={solution}
              onChange={onSolutionChange}
              placeholder="Lösung"
              tone="answer"
              minHeight={110}
              playSurface
              editorFontSize={{ xs: '1.05rem', sm: '1.12rem' }}
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
          />
        </Box>
        <DialogActions sx={{ px: 2, py: 1, bgcolor: '#eceff1' }}>
          <Button
            variant="contained"
            onClick={onClose}
            sx={{ bgcolor: '#455a64', '&:hover': { bgcolor: '#37474f' } }}
          >
            Fertig
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={clearInkOpen} onClose={() => setClearInkOpen(false)} maxWidth="xs" fullWidth sx={{ zIndex: 1400 }}>
        <DialogTitle sx={{ ...dialogCloseTitleSx }}>
          Alle Stiftstriche löschen?
          <DialogCloseIconButton onClose={() => setClearInkOpen(false)} />
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '0.9rem', color: '#546e7a' }}>
            Alle Stift-, Marker- und Formzeichnungen auf dieser Karte werden entfernt.
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
