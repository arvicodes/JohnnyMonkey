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
  Link,
  Typography,
} from '@mui/material';
import {
  htmlToPlain,
  sortSlides,
  type PresentationAnnotations,
  type PresentationDeck,
} from '../../lib/presentationDeck';
import type { PresentationPlayVariants } from '../../lib/presentationPlayVariants';
import {
  runPresentationDownload,
  type PresentationDownloadRequest,
  type PresentationDownloadProgress,
} from '../../lib/presentationDownloadExport';

export type PresentationDownloadDialogProps = {
  open: boolean;
  onClose: () => void;
  getDeck: () => PresentationDeck;
  getAnnotations: () => PresentationAnnotations;
  getPlayVariants?: () => PresentationPlayVariants | null;
  currentSlideId?: string;
  /** Vorauswahl aus Filmstreifen (Mehrfachauswahl). */
  prefillSlideIds?: string[];
};

function defaultContent(): PresentationDownloadRequest['content'] {
  return {
    fullReveal: true,
    includeImages: true,
    includeSpeakerNotes: true,
  };
}

function slideLabel(slide: { titleHtml?: string; title?: string }, index: number): string {
  const t =
    htmlToPlain(slide.titleHtml || '').trim() ||
    (slide.title || '').trim() ||
    `Folie ${index + 1}`;
  return t.length > 56 ? `${t.slice(0, 55)}…` : t;
}

export default function PresentationDownloadDialog({
  open,
  onClose,
  getDeck,
  getAnnotations,
  getPlayVariants,
  currentSlideId,
  prefillSlideIds,
}: PresentationDownloadDialogProps) {
  const deck = getDeck();
  const sortedSlides = useMemo(() => sortSlides(deck.slides || []), [deck.slides, open]);
  const allIds = useMemo(() => sortedSlides.map((s) => s.id), [sortedSlides]);

  const [pickedIds, setPickedIds] = useState<string[]>([]);
  const [formats, setFormats] = useState({ pdf: true, pptx: true });
  const [content, setContent] = useState(defaultContent);
  const [includeLessonStrokes, setIncludeLessonStrokes] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<PresentationDownloadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetOnOpen = () => {
    const freshDeck = getDeck();
    const ids = sortSlides(freshDeck.slides || []).map((s) => s.id);
    const validPrefill = (prefillSlideIds || []).filter((id) => ids.includes(id));
    if (validPrefill.length > 0) {
      setPickedIds(validPrefill);
    } else if (currentSlideId && ids.includes(currentSlideId)) {
      setPickedIds([currentSlideId]);
    } else {
      setPickedIds([...ids]);
    }
    setFormats({ pdf: true, pptx: true });
    setContent(defaultContent());
    setIncludeLessonStrokes(true);
    setError(null);
    setProgress(null);
  };

  const toggleSlide = (id: string) => {
    setPickedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleClose = () => {
    if (busy) return;
    onClose();
  };

  const startDownload = async () => {
    setBusy(true);
    setError(null);
    setProgress({ phase: 'Start…' });
    const liveDeck = getDeck();
    const ordered = sortSlides(liveDeck.slides || [])
      .filter((s) => pickedIds.includes(s.id))
      .map((s) => s.id);
    try {
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      await runPresentationDownload(
        liveDeck,
        getAnnotations(),
        {
          slideIds: ordered,
          formats,
          content,
          includeLessonStrokes,
        },
        setProgress,
        getPlayVariants?.() ?? null,
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
      <DialogTitle sx={{ pb: 0.5 }}>Download</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Exportiert genau die angehakten Folien aus dem Editor (nicht den SuS-Stand bis NOW).
          Dateiname enthält die Foliennummern, z.&nbsp;B. <em>_Folie-5.pdf</em>.
        </Typography>

        <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Folien ({pickedIds.length}/{sortedSlides.length})
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Link
              component="button"
              type="button"
              variant="caption"
              underline="hover"
              onClick={() => setPickedIds([...allIds])}
            >
              Alle
            </Link>
            {currentSlideId && allIds.includes(currentSlideId) ? (
              <Link
                component="button"
                type="button"
                variant="caption"
                underline="hover"
                onClick={() => setPickedIds([currentSlideId])}
              >
                Aktuelle
              </Link>
            ) : null}
            <Link
              component="button"
              type="button"
              variant="caption"
              underline="hover"
              onClick={() => setPickedIds([])}
            >
              Keine
            </Link>
          </Box>
        </Box>
        <Box
          sx={{
            maxHeight: 220,
            overflow: 'auto',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            px: 0.5,
            py: 0.25,
            mb: 2,
          }}
        >
          {sortedSlides.map((slide, idx) => (
            <FormControlLabel
              key={slide.id}
              sx={{ display: 'flex', mx: 0, py: 0.1 }}
              control={
                <Checkbox
                  size="small"
                  checked={pickedIds.includes(slide.id)}
                  onChange={() => toggleSlide(slide.id)}
                />
              }
              label={
                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                  {idx + 1}. {slideLabel(slide, idx)}
                </Typography>
              }
            />
          ))}
        </Box>

        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
          Formate
        </Typography>
        <FormGroup row sx={{ mb: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={formats.pdf}
                onChange={(e) => setFormats((f) => ({ ...f, pdf: e.target.checked }))}
              />
            }
            label="PDF"
          />
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={formats.pptx}
                onChange={(e) => setFormats((f) => ({ ...f, pptx: e.target.checked }))}
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
                checked={content.fullReveal}
                onChange={(e) => setContent((c) => ({ ...c, fullReveal: e.target.checked }))}
              />
            }
            label="Einblendungen vollständig (Endzustand)"
          />
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={content.includeImages}
                onChange={(e) => setContent((c) => ({ ...c, includeImages: e.target.checked }))}
              />
            }
            label="Bilder"
          />
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={content.includeSpeakerNotes}
                onChange={(e) =>
                  setContent((c) => ({ ...c, includeSpeakerNotes: e.target.checked }))
                }
              />
            }
            label="Sprechernotizen"
          />
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={includeLessonStrokes}
                onChange={(e) => setIncludeLessonStrokes(e.target.checked)}
              />
            }
            label="Stiftzeichnungen auf der Folie"
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
        <Button
          variant="contained"
          onClick={() => void startDownload()}
          disabled={busy || pickedIds.length === 0}
        >
          Herunterladen
        </Button>
      </DialogActions>
    </Dialog>
  );
}
