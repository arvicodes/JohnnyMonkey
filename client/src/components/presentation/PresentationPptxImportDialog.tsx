import React, { useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Typography,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { DialogCloseIconButton, dialogCloseTitleSx } from '../ui/dialog-close-icon-button';
import type { SlideTemplatesStore } from '../../lib/presentationSlideTemplates';
import {
  isPptxFile,
  parsePptxFile,
  type ImportedPptxResult,
  type ImportedPptxSlide,
} from '../../lib/presentationPptxImport';

export type PptxImportSelection = {
  slide: ImportedPptxSlide;
};

type Props = {
  open: boolean;
  onClose: () => void;
  lessonPath: string;
  templates: SlideTemplatesStore;
  onImport: (items: PptxImportSelection[]) => Promise<void>;
};

export default function PresentationPptxImportDialog({
  open,
  onClose,
  lessonPath,
  templates: _templates,
  onImport,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ImportedPptxResult | null>(null);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [dragOver, setDragOver] = useState(false);

  const selectedCount = useMemo(
    () => Object.values(selected).filter(Boolean).length,
    [selected],
  );

  const reset = () => {
    setBusy(false);
    setImporting(false);
    setError(null);
    setParsed(null);
    setSelected({});
    setDragOver(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleClose = () => {
    if (importing || busy) return;
    reset();
    onClose();
  };

  const onPickFile = async (file: File | null) => {
    if (!file) return;
    if (!isPptxFile(file)) {
      setError('Bitte eine PPTX-Datei wählen (.pptx)');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const loginCode = localStorage.getItem('loginCode')?.trim() || '';
      const data = await parsePptxFile(file, loginCode);
      const sel: Record<number, boolean> = {};
      for (const s of data.slides) sel[s.index] = true;
      setParsed(data);
      setSelected(sel);
    } catch (e) {
      setParsed(null);
      setError(e instanceof Error ? e.message : 'Lesen fehlgeschlagen');
    } finally {
      setBusy(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (busy || importing) return;
    const file = e.dataTransfer.files?.[0] || null;
    void onPickFile(file);
  };

  const toggleAll = (on: boolean) => {
    if (!parsed) return;
    const next: Record<number, boolean> = {};
    for (const s of parsed.slides) next[s.index] = on;
    setSelected(next);
  };

  const runImport = async () => {
    if (!parsed || !lessonPath) return;
    const items: PptxImportSelection[] = parsed.slides
      .filter((s) => selected[s.index])
      .map((s) => ({ slide: s }));
    if (items.length === 0) {
      setError('Bitte mindestens eine Folie auswählen');
      return;
    }
    setImporting(true);
    setError(null);
    try {
      await onImport(items);
      reset();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import fehlgeschlagen');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ ...dialogCloseTitleSx, bgcolor: '#2E7D32', color: '#fff', py: 1.25 }}>
        PPTX importieren
        <DialogCloseIconButton
          onClose={handleClose}
          disabled={importing || busy}
          sx={{ color: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' } }}
          iconSx={{ color: '#fff' }}
        />
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, mt: 0.5 }}>
          Text, Bilder und Formen werden als editierbare Elemente übernommen. Textfelder sind
          direkt tippbar (Klick → Auswahl, nochmal Klick oder Doppelklick → schreiben).
        </Typography>

        <input
          ref={fileRef}
          type="file"
          accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
          hidden
          onChange={(e) => void onPickFile(e.target.files?.[0] || null)}
        />

        <Box
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!busy && !importing) setDragOver(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!busy && !importing) setDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragOver(false);
          }}
          onDrop={onDrop}
          onClick={() => !busy && !importing && fileRef.current?.click()}
          sx={{
            mb: 1.5,
            px: 2,
            py: 2.5,
            borderRadius: 1.5,
            border: dragOver ? '2px solid #2E7D32' : '2px dashed #bdbdbd',
            bgcolor: dragOver ? 'rgba(46,125,50,0.08)' : '#fafafa',
            cursor: busy || importing ? 'default' : 'pointer',
            textAlign: 'center',
            transition: 'border-color 0.15s, background 0.15s',
            '&:hover': busy || importing ? undefined : { borderColor: '#2E7D32', bgcolor: '#f3faf3' },
          }}
        >
          {busy ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
              <CircularProgress size={18} />
              <Typography variant="body2">PPTX wird gelesen…</Typography>
            </Box>
          ) : (
            <>
              <UploadFileIcon sx={{ fontSize: 28, color: '#2E7D32', mb: 0.5 }} />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                PPTX hierher ziehen
              </Typography>
              <Typography variant="caption" color="text.secondary">
                oder klicken zum Auswählen
              </Typography>
            </>
          )}
        </Box>

        {parsed && !busy && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            {parsed.fileName} · {parsed.slideCount} Folien
          </Typography>
        )}

        {error && (
          <Typography variant="body2" color="error" sx={{ mb: 1 }}>
            {error}
          </Typography>
        )}

        {parsed && (
          <>
            <Box sx={{ display: 'flex', gap: 1, mb: 1.25 }}>
              <Button size="small" onClick={() => toggleAll(true)} disabled={importing}>
                Alle
              </Button>
              <Button size="small" onClick={() => toggleAll(false)} disabled={importing}>
                Keine
              </Button>
            </Box>

            <Box
              sx={{
                maxHeight: 400,
                overflow: 'auto',
                border: '1px solid #e0e0e0',
                borderRadius: 1,
                px: 1,
                py: 0.5,
              }}
            >
              {parsed.slides.map((s) => {
                const boxCount = s.boxes?.length ?? 0;
                const textN = s.boxes?.filter((b) => b.kind === 'text').length ?? 0;
                const imgN = s.boxes?.filter((b) => b.kind === 'image').length ?? s.images.length;
                const shapeN = s.boxes?.filter((b) => b.kind === 'shape').length ?? 0;
                return (
                  <Box
                    key={s.index}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'auto 1fr',
                      gap: 1,
                      alignItems: 'center',
                      py: 0.75,
                      borderBottom: '1px solid #f0f0f0',
                      opacity: selected[s.index] ? 1 : 0.55,
                    }}
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          size="small"
                          checked={Boolean(selected[s.index])}
                          disabled={importing}
                          onChange={(e) =>
                            setSelected((prev) => ({ ...prev, [s.index]: e.target.checked }))
                          }
                        />
                      }
                      label={
                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, minWidth: 28 }}>
                          {s.index + 1}
                        </Typography>
                      }
                      sx={{ m: 0 }}
                    />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        sx={{
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {s.title || '(ohne Titel)'}
                      </Typography>
                      <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                        {boxCount
                          ? `${boxCount} Boxen · ${textN} Text · ${imgN} Bild · ${shapeN} Form`
                          : s.bodyLines.slice(0, 2).join(' · ') || '—'}
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 2, pb: 1.5 }}>
        <Button onClick={handleClose} disabled={importing || busy}>
          Abbrechen
        </Button>
        <Button
          variant="contained"
          disabled={!parsed || selectedCount === 0 || importing || busy}
          onClick={() => void runImport()}
          sx={{ bgcolor: '#2E7D32', '&:hover': { bgcolor: '#1b5e20' } }}
        >
          {importing ? 'Importiere…' : `${selectedCount} Folie(n) als Elemente einfügen`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
