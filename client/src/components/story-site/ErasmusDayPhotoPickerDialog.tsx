import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Stack,
  Checkbox,
  CircularProgress,
  Alert,
  LinearProgress,
  FormControlLabel,
} from '@mui/material';
import { DialogCloseIconButton, dialogCloseTitleSx } from '../ui/dialog-close-icon-button';
import { parseStoryPageDate, formatIsoDateDe } from '../../lib/storyPageDate';
import { normalizeFolderPathInput } from '../../lib/normalizeFolderPath';
import {
  scanPickedFilesForDay,
  revokeLocalPhotoPreviews,
  type LocalPhotoPick,
} from '../../lib/scanLocalPhotoFiles';
import { readCaptureDateISOFromFile, pickDominantCaptureDateISO } from '../../lib/photoCaptureDate';
import {
  scanPhotosForDay,
  importSelectedPhotos,
  importPhotoFilesUpload,
  type ScannedPhotoItem,
} from '../../lib/storySitePhotoImport';

type DisplayImage = {
  key: string;
  fileName: string;
  previewUrl: string;
  dateISO: string | null;
  matchesDay: boolean;
  serverRel?: string;
  localFile?: File;
};

type Props = {
  open: boolean;
  onClose: () => void;
  siteId: string;
  pageDateStr: string;
  imageSourceFolder: string;
  onImageSourceFolderChange: (path: string) => void;
  onImported: (galleryUrls: string[], captureDateISO?: string | null) => void;
  /** Unterseiten-Datum aus EXIF-Aufnahmedatum setzen */
  onPageDateFromExif: (captureDateISO: string) => void;
  erasmusBilderHint?: string;
};

export function ErasmusDayPhotoPickerDialog({
  open,
  onClose,
  siteId,
  pageDateStr,
  imageSourceFolder,
  onImageSourceFolderChange,
  onImported,
  onPageDateFromExif,
  erasmusBilderHint,
}: Props) {
  const folderInputRef = useRef<HTMLInputElement>(null);
  const folderInputId = `erasmus-folder-input-${siteId}`;
  const processFolderRef = useRef(false);
  const [folderInput, setFolderInput] = useState(imageSourceFolder);
  const [images, setImages] = useState<DisplayImage[]>([]);
  const [importMode, setImportMode] = useState<'path' | 'files'>('files');
  const [localPicks, setLocalPicks] = useState<LocalPhotoPick[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<{ done: number; total: number } | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanInfo, setScanInfo] = useState<string | null>(null);
  const [onlyMatchingDay, setOnlyMatchingDay] = useState(true);

  const targetIso = useMemo(() => parseStoryPageDate(pageDateStr), [pageDateStr]);
  const targetLabel = targetIso ? formatIsoDateDe(targetIso) : null;

  const localPicksRef = useRef<LocalPhotoPick[]>([]);
  useEffect(() => {
    localPicksRef.current = localPicks;
  }, [localPicks]);

  const resetGallery = useCallback(() => {
    revokeLocalPhotoPreviews(localPicksRef.current);
    localPicksRef.current = [];
    setLocalPicks([]);
    setImages([]);
    setSelected(new Set());
    setScanInfo(null);
    setScanProgress(null);
  }, []);

  useEffect(() => {
    if (open) setFolderInput(imageSourceFolder);
  }, [open, imageSourceFolder]);

  useEffect(() => {
    const el = folderInputRef.current;
    if (!el) return;
    el.setAttribute('webkitdirectory', 'true');
    el.setAttribute('directory', 'true');
    el.removeAttribute('accept');
  }, [open]);

  useEffect(() => {
    if (!open) resetGallery();
  }, [open, resetGallery]);

  const dayFilterIso = useMemo(
    () => parseStoryPageDate(pageDateStr) ?? null,
    [pageDateStr],
  );

  const visibleImages = useMemo(() => {
    if (!onlyMatchingDay) return images;
    if (!dayFilterIso) return images.filter((img) => img.matchesDay);
    return images.filter((img) => img.dateISO === dayFilterIso);
  }, [images, onlyMatchingDay, dayFilterIso]);

  useEffect(() => {
    if (!dayFilterIso || images.length === 0) return;
    setImages((prev) =>
      prev.map((img) => ({
        ...img,
        matchesDay: img.dateISO === dayFilterIso,
      })),
    );
    setLocalPicks((prev) =>
      prev.map((p) => ({
        ...p,
        matchesDay: p.dateISO === dayFilterIso,
      })),
    );
  }, [dayFilterIso]);

  const applyServerImages = (items: ScannedPhotoItem[], filterIso: string | null) => {
    setImportMode('path');
    const display = items.map((img) => ({
      key: img.relativePath,
      fileName: img.fileName,
      previewUrl: img.previewUrl,
      dateISO: img.dateISO ?? null,
      matchesDay: filterIso ? img.dateISO === filterIso : true,
      serverRel: img.relativePath,
    }));
    setImages(display);
    setSelected(
      new Set(display.filter((i) => (filterIso ? i.dateISO === filterIso : true)).map((i) => i.key)),
    );
  };

  const applyLocalImages = (items: LocalPhotoPick[]) => {
    setImportMode('files');
    setLocalPicks(items);
    const display = items.map((img) => ({
      key: img.id,
      fileName: img.fileName,
      previewUrl: img.previewUrl,
      dateISO: img.dateISO,
      matchesDay: img.matchesDay,
      localFile: img.file,
    }));
    setImages(display);
    setSelected(new Set(items.filter((i) => i.matchesDay).map((i) => i.id)));
  };

  const applyExifPageDateIfEmpty = useCallback(
    (iso: string | null | undefined) => {
      if (!iso || parseStoryPageDate(pageDateStr)) return;
      onPageDateFromExif(iso);
    },
    [onPageDateFromExif, pageDateStr],
  );

  const handleScanPath = useCallback(async () => {
    const path = normalizeFolderPathInput(folderInput);
    if (!path) {
      setError('Bitte einen Ordnerpfad auf deinem Mac angeben.');
      return;
    }
    setError(null);
    setScanning(true);
    resetGallery();
    try {
      onImageSourceFolderChange(path);
      setFolderInput(path);
      const result = await scanPhotosForDay(siteId, path, pageDateStr);
      applyExifPageDateIfEmpty(result.suggestedCaptureDateISO);
      const filterIso = targetIso ?? result.suggestedCaptureDateISO;
      applyServerImages(result.images, filterIso);
      const dayLabel = filterIso ? formatIsoDateDe(filterIso) : targetLabel;
      setScanInfo(
        `${result.matchedCount} Foto${result.matchedCount === 1 ? '' : 's'} vom ${dayLabel} (EXIF, ${result.exifCount} mit Aufnahmedatum, ${result.totalScanned} gesamt)`,
      );
      setOnlyMatchingDay(result.matchedCount > 0);
      if (!result.matchedCount) {
        setError(
          result.exifCount === 0
            ? 'Keine Aufnahmedaten (EXIF) in den Bildern — anderes Format oder zuerst aus Fotos.app exportieren.'
            : 'Keine Fotos für das erkannte Haupt-Aufnahmedatum.',
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Scan fehlgeschlagen');
      setScanInfo(null);
    } finally {
      setScanning(false);
    }
  }, [folderInput, targetLabel, siteId, pageDateStr, targetIso, onImageSourceFolderChange, resetGallery, applyExifPageDateIfEmpty]);

  const collectFilesFromInput = (input: HTMLInputElement | null): File[] => {
    if (!input?.files?.length) return [];
    return Array.from(input.files);
  };

  const onFolderPicked = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (processFolderRef.current) return;

      const input = e.target;
      // Sofort kopieren — value-Reset oder Dialog-Fokus kann FileList leeren (Safari/Chrome + MUI)
      let picked = collectFilesFromInput(input);
      if (!picked.length) {
        await new Promise((r) => window.setTimeout(r, 100));
        picked = collectFilesFromInput(folderInputRef.current);
      }
      if (!picked.length) {
        setError(
          'Der Browser hat keine Dateien übergeben. Bitte erneut „Ordner auswählen“ klicken (nicht nur den Dialog schließen).',
        );
        setScanInfo(null);
        return;
      }

      processFolderRef.current = true;
      const list = picked;

      const imageCount = list.filter(
        (f) => f.type.startsWith('image/') || /\.(jpe?g|png|heic|heif|webp|gif|tif|tiff)$/i.test(f.name),
      ).length;

      if (!imageCount) {
        setError(`Ordner enthält ${list.length} Datei(en), aber keine erkennbaren Bilder (JPG, PNG, HEIC …).`);
        setScanInfo(null);
        processFolderRef.current = false;
        input.value = '';
        return;
      }

      setError(null);
      setScanning(true);
      setScanProgress({ done: 0, total: imageCount });
      setScanInfo(`${imageCount} Bilder gefunden — lese Aufnahmedatum …`);
      resetGallery();

      try {
        const result = await scanPickedFilesForDay(picked, pageDateStr, (done, total) => {
          setScanProgress({ done, total });
        });

        applyExifPageDateIfEmpty(result.suggestedCaptureDateISO);

        applyLocalImages(result.images);
        setOnlyMatchingDay(result.matchedCount > 0);

        const filterIso = targetIso ?? result.suggestedCaptureDateISO;
        const dayLabel = filterIso ? formatIsoDateDe(filterIso) : targetLabel;

        if (result.matchedCount > 0) {
          setScanInfo(
            `Unterseiten-Datum: ${dayLabel} (aus EXIF). ${result.matchedCount} Foto${result.matchedCount === 1 ? '' : 's'} von diesem Tag — vorausgewählt.`,
          );
          setOnlyMatchingDay(true);
          setError(null);
        } else if (result.exifCount === 0) {
          setError(
            `Von ${result.total} Bildern hat keines EXIF-Aufnahmedaten. Bitte Original-JPG/HEIC aus der Kamera oder Fotos.app verwenden.`,
          );
        } else if (result.total > 0) {
          setOnlyMatchingDay(false);
          setScanInfo(
            `${result.exifCount} Bilder mit EXIF, aber kein gemeinsames Aufnahmedatum. Alle mit Datum werden angezeigt.`,
          );
          setError(null);
        } else {
          setError('Keine Bilddateien im gewählten Ordner.');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Auswahl fehlgeschlagen');
        setScanInfo(null);
      } finally {
        setScanning(false);
        setScanProgress(null);
        processFolderRef.current = false;
        if (folderInputRef.current) folderInputRef.current.value = '';
        else input.value = '';
      }
    },
    [pageDateStr, targetLabel, targetIso, resetGallery, applyExifPageDateIfEmpty],
  );

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleImport = async () => {
    const keys = [...selected];
    if (!keys.length) {
      setError('Bitte mindestens ein Bild auswählen.');
      return;
    }
    setImporting(true);
    setError(null);
    try {
      let urls: string[];
      let captureDateISO: string | null = null;
      if (importMode === 'files') {
        const files = localPicks.filter((p) => keys.includes(p.id)).map((p) => p.file);
        const dates = await Promise.all(files.map((f) => readCaptureDateISOFromFile(f)));
        captureDateISO =
          pickDominantCaptureDateISO(dates) ??
          localPicks.find((p) => keys.includes(p.id))?.dateISO ??
          null;
        urls = await importPhotoFilesUpload(siteId, pageDateStr, files);
      } else {
        const path = normalizeFolderPathInput(folderInput);
        urls = await importSelectedPhotos(siteId, path, pageDateStr, keys);
        const picked = images.filter((i) => keys.includes(i.key) && i.dateISO);
        captureDateISO = pickDominantCaptureDateISO(picked.map((i) => i.dateISO));
      }
      onImported(urls, captureDateISO);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import fehlgeschlagen');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      disableEnforceFocus
      disableRestoreFocus
    >
      <DialogTitle sx={dialogCloseTitleSx}>
        <Typography variant="h6" component="span" sx={{ fontSize: '1rem', fontWeight: 700 }}>
          Fotos nach Tagesdatum
        </Typography>
        <DialogCloseIconButton onClose={onClose} />
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Alert severity="success" sx={{ fontSize: '0.8rem' }}>
            <strong>Ordner auswählen (Finder)</strong> — nach der Auswahl erscheint unten eine Fortschrittsanzeige und
            die Vorschaubilder.
          </Alert>
          {!targetIso ? (
            <Alert severity="warning" sx={{ fontSize: '0.8rem' }}>
              Bitte zuerst bei der Unterseite ein <strong>Datum</strong> eintragen (z. B. „21. Mai 2026“), damit passende
              Fotos vorausgewählt werden.
            </Alert>
          ) : (
            <Alert severity="info" sx={{ fontSize: '0.8rem' }}>
              Unterseiten-Datum: <strong>{targetLabel}</strong> — passende Fotos werden automatisch angehakt.
            </Alert>
          )}

          {/* Kein accept — sonst liefert webkitdirectory oft 0 Dateien. Label = zuverlässiger Klick. */}
          <input
            id={folderInputId}
            ref={folderInputRef}
            type="file"
            multiple
            onChange={(e) => void onFolderPicked(e)}
            style={{
              position: 'absolute',
              width: 1,
              height: 1,
              padding: 0,
              margin: -1,
              overflow: 'hidden',
              clip: 'rect(0,0,0,0)',
              whiteSpace: 'nowrap',
              border: 0,
            }}
            {...({ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
          />

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button
              component="label"
              htmlFor={folderInputId}
              variant="contained"
              size="small"
              disabled={scanning || importing}
              sx={{ textTransform: 'none', cursor: scanning || importing ? 'default' : 'pointer' }}
            >
              Ordner auswählen (Finder)
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => void handleScanPath()}
              disabled={scanning || importing || !targetIso}
              sx={{ textTransform: 'none' }}
            >
              {scanning ? 'Scanne …' : 'Pfad scannen'}
            </Button>
          </Stack>

          <TextField
            label="Oder: absoluter Ordnerpfad"
            size="small"
            fullWidth
            value={folderInput}
            onChange={(e) => setFolderInput(e.target.value)}
            placeholder="/Users/verachrist/Downloads/Erasmus"
            helperText="Im Finder: Ordner → Rechtsklick → ⌥ „Pfadname kopieren“"
          />

          {scanning && scanProgress ? (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                {scanInfo ?? 'Verarbeite …'}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={scanProgress.total ? (100 * scanProgress.done) / scanProgress.total : 0}
              />
              <Typography variant="caption" color="text.secondary">
                {scanProgress.done} / {scanProgress.total}
              </Typography>
            </Box>
          ) : scanInfo ? (
            <Typography variant="body2" color="text.secondary">
              {scanInfo}
            </Typography>
          ) : null}

          {images.length > 0 ? (
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={onlyMatchingDay}
                  onChange={(e) => setOnlyMatchingDay(e.target.checked)}
                />
              }
              label={`Nur Fotos vom ${targetLabel ?? (dayFilterIso ? formatIsoDateDe(dayFilterIso) : 'Unterseiten-Datum')} anzeigen`}
              sx={{ m: 0, '& .MuiFormControlLabel-label': { fontSize: '0.8rem' } }}
            />
          ) : null}

          {visibleImages.length > 0 ? (
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                onClick={() => setSelected(new Set(visibleImages.map((i) => i.key)))}
                sx={{ textTransform: 'none' }}
              >
                Alle markieren
              </Button>
              <Button size="small" onClick={() => setSelected(new Set())} sx={{ textTransform: 'none' }}>
                Keine
              </Button>
            </Stack>
          ) : null}

          {erasmusBilderHint ? (
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
              Ziel: {erasmusBilderHint}
            </Typography>
          ) : null}

          {error ? <Alert severity="warning">{error}</Alert> : null}

          {scanning && !scanProgress ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={32} />
            </Box>
          ) : null}

          {!scanning && visibleImages.length > 0 ? (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                gap: 1.5,
                maxHeight: 360,
                overflowY: 'auto',
              }}
            >
              {visibleImages.map((img) => {
                const checked = selected.has(img.key);
                return (
                  <Box
                    key={img.key}
                    onClick={() => toggle(img.key)}
                    sx={{
                      position: 'relative',
                      cursor: 'pointer',
                      borderRadius: 1,
                      outline: checked ? '3px solid' : '1px solid',
                      outlineColor: checked ? 'primary.main' : img.matchesDay ? 'success.light' : 'divider',
                      overflow: 'hidden',
                      opacity: img.matchesDay ? 1 : 0.85,
                    }}
                  >
                    <Box
                      component="img"
                      src={img.previewUrl}
                      alt={img.fileName}
                      sx={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }}
                    />
                    <Checkbox
                      checked={checked}
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: 2,
                        left: 2,
                        p: 0.25,
                        bgcolor: 'rgba(255,255,255,0.85)',
                        borderRadius: 0.5,
                      }}
                      tabIndex={-1}
                    />
                    <Typography
                      variant="caption"
                      noWrap
                      sx={{
                        display: 'block',
                        px: 0.5,
                        py: 0.25,
                        bgcolor: 'rgba(0,0,0,0.55)',
                        color: '#fff',
                        fontSize: '0.65rem',
                        lineHeight: 1.2,
                      }}
                    >
                      {img.fileName}
                      {img.dateISO ? ` · ${img.dateISO}` : ''}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>
          Abbrechen
        </Button>
        <Button
          variant="contained"
          onClick={() => void handleImport()}
          disabled={importing || selected.size === 0}
          sx={{ textTransform: 'none' }}
        >
          {importing ? 'Kopiere …' : `${selected.size} Bild${selected.size === 1 ? '' : 'er'} übernehmen`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
