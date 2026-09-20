import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  LinearProgress,
  Radio,
  RadioGroup,
  Typography,
} from '@mui/material';
import type { PresentationAnnotations, PresentationDeck } from '../../lib/presentationDeck';
import {
  runPresentationDownload,
  type PresentationDownloadRequest,
  type PresentationDownloadProgress,
} from '../../lib/presentationDownloadExport';

export type PresentationDownloadDialogProps = {
  open: boolean;
  onClose: () => void;
  deck: PresentationDeck;
  annotations: PresentationAnnotations;
  currentSlideId?: string;
};

const defaultRequest = (): PresentationDownloadRequest => ({
  scope: 'all',
  formats: { pdf: true, pptx: true },
  content: {
    fullReveal: true,
    includeImages: true,
    includeSpeakerNotes: true,
  },
  includeLessonStrokes: true,
});

export default function PresentationDownloadDialog({
  open,
  onClose,
  deck,
  annotations,
  currentSlideId,
}: PresentationDownloadDialogProps) {
  const [request, setRequest] = useState<PresentationDownloadRequest>(defaultRequest);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<PresentationDownloadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const slideCount = useMemo(() => {
    if (request.scope === 'current' && currentSlideId) return 1;
    return deck.slides?.length ?? 0;
  }, [deck.slides, request.scope, currentSlideId]);

  const resetOnOpen = () => {
    setRequest({ ...defaultRequest(), currentSlideId });
    setError(null);
    setProgress(null);
  };

  const handleClose = () => {
    if (busy) return;
    onClose();
  };

  const startDownload = async () => {
    setBusy(true);
    setError(null);
    setProgress({ phase: 'Start…' });
    try {
      await runPresentationDownload(
        deck,
        annotations,
        { ...request, currentSlideId },
        setProgress,
      );
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download fehlgeschlagen');
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      TransitionProps={{ onEnter: resetOnOpen }}
    >
      <DialogTitle sx={{ pb: 0.5 }}>Download …</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Vollständiger Export inkl. erweiterter Folien (Pfeil nach unten), Bilder und Notizen.
          Einblendungen werden im gewählten Zustand exportiert.
        </Typography>

        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
          Umfang
        </Typography>
        <RadioGroup
          row
          value={request.scope}
          onChange={(e) =>
            setRequest((r) => ({ ...r, scope: e.target.value as 'all' | 'current' }))
          }
        >
          <FormControlLabel value="all" control={<Radio size="small" />} label="Alle Folien" />
          <FormControlLabel
            value="current"
            control={<Radio size="small" disabled={!currentSlideId} />}
            label="Nur aktuelle Folie"
          />
        </RadioGroup>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
          {slideCount} Folie{slideCount === 1 ? '' : 'n'} ausgewählt
        </Typography>

        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
          Formate
        </Typography>
        <FormGroup row sx={{ mb: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={request.formats.pdf}
                onChange={(e) =>
                  setRequest((r) => ({
                    ...r,
                    formats: { ...r.formats, pdf: e.target.checked },
                  }))
                }
              />
            }
            label="PDF"
          />
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={request.formats.pptx}
                onChange={(e) =>
                  setRequest((r) => ({
                    ...r,
                    formats: { ...r.formats, pptx: e.target.checked },
                  }))
                }
              />
            }
            label="PPTX"
          />
        </FormGroup>

        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
          Inhalt
        </Typography>
        <FormGroup>
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={request.content.fullReveal}
                onChange={(e) =>
                  setRequest((r) => ({
                    ...r,
                    content: { ...r.content, fullReveal: e.target.checked },
                  }))
                }
              />
            }
            label="Einblendungen vollständig (Endzustand)"
          />
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={request.content.includeImages}
                onChange={(e) =>
                  setRequest((r) => ({
                    ...r,
                    content: { ...r.content, includeImages: e.target.checked },
                  }))
                }
              />
            }
            label="Bilder"
          />
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={request.content.includeSpeakerNotes}
                onChange={(e) =>
                  setRequest((r) => ({
                    ...r,
                    content: { ...r.content, includeSpeakerNotes: e.target.checked },
                  }))
                }
              />
            }
            label="Sprechernotizen (PDF: eigene Seite · PPTX: Notizen)"
          />
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={request.includeLessonStrokes !== false}
                onChange={(e) =>
                  setRequest((r) => ({ ...r, includeLessonStrokes: e.target.checked }))
                }
              />
            }
            label="Unterrichts-Tinte (Annotationen)"
          />
        </FormGroup>

        {busy && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {progress?.phase}
              {progress?.current != null && progress.total
                ? ` (${progress.current}/${progress.total})`
                : ''}
            </Typography>
          </Box>
        )}
        {error && (
          <Typography variant="body2" color="error" sx={{ mt: 1.5 }}>
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={busy}>
          Abbrechen
        </Button>
        <Button variant="contained" onClick={() => void startDownload()} disabled={busy}>
          Herunterladen
        </Button>
      </DialogActions>
    </Dialog>
  );
}
