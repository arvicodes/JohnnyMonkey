import React, { useEffect, useRef, useState } from 'react';
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
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      return;
    }
    if (!wasOpenRef.current) {
      setActiveSide('prompt');
    }
    wasOpenRef.current = true;
  }, [open, slideId]);

  return (
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
          bgcolor: '#fffde7',
          color: '#3e2723',
          py: 1,
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
              onClick={onSave}
              aria-label="Sichern"
              sx={{
                position: 'absolute',
                right: 44,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#5d4037',
                '&:hover': { bgcolor: 'rgba(251, 192, 45, 0.35)' },
              }}
            >
              <SaveIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
        ) : null}
        <DialogCloseIconButton
          onClose={onClose}
          sx={{ color: '#5d4037', '&:hover': { bgcolor: 'rgba(251, 192, 45, 0.35)' } }}
          iconSx={{ color: '#5d4037' }}
        />
      </DialogTitle>

      <DialogContent
        sx={{
          pt: 1.25,
          pb: 1,
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
            minHeight={240}
            editorFontSize={{ xs: '1.12rem', sm: '1.24rem' }}
            ink={ink}
            onInkChange={onInkChange}
            slideId={`${slideId}-prompt`}
            active={activeSide === 'prompt'}
            onFocus={() => setActiveSide('prompt')}
          />
          <EntryTicketCardZone
            tone="answer"
            value={solution}
            onChange={onSolutionChange}
            placeholder="Lösung eingeben…"
            flex={0.85}
            minHeight={200}
            editorFontSize={{ xs: '1.02rem', sm: '1.1rem' }}
            slideId={`${slideId}-answer`}
            active={activeSide === 'answer'}
            onFocus={() => setActiveSide('answer')}
          />
        </Box>

        <Typography
          sx={{
            flexShrink: 0,
            fontSize: '0.74rem',
            color: '#546e7a',
            lineHeight: 1.45,
            px: 0.25,
          }}
        >
          Wie bei Notizen: <strong>Tippen</strong> für Text und Formatierung · <strong>Stift</strong> zum
          Schreiben (Apple Pencil schreibt immer auf der Frage) · <strong>Radierer</strong> zum Wegradieren.
          Finger scrollen und tippen im Tippen-Modus.
        </Typography>
      </DialogContent>

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
  );
}
