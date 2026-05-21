import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  Typography,
  Box,
  Stack,
  Checkbox,
  Alert,
  LinearProgress,
  FormControlLabel,
} from '@mui/material';
import { DialogCloseIconButton, dialogCloseTitleSx } from '../ui/dialog-close-icon-button';
import { parseStoryPageDate, formatIsoDateDe } from '../../lib/storyPageDate';
import {
  scanPickedFilesForDay,
  revokeLocalPhotoPreviews,
  type LocalPhotoPick,
} from '../../lib/scanLocalPhotoFiles';
import { readCaptureDateISOFromFile, pickDominantCaptureDateISO } from '../../lib/photoCaptureDate';
import { importPhotoFilesUpload } from '../../lib/storySitePhotoImport';
import {
  collectImageFilesFromDataTransfer,
  pickFolderImageFilesViaDirectoryPicker,
  supportsDirectoryPicker,
} from '../../lib/pickFolderImageFiles';
import { isLikelyImageFile } from '../../lib/storyImageUtils';
import {
  fetchHeicPreviewUrl,
  HEIC_PREVIEW_PLACEHOLDER,
  isHeicFile,
} from '../../lib/heicPreview';

function PickPreviewImage({ file, previewUrl, alt }: { file: File; previewUrl: string; alt: string }) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [src, setSrc] = useState(previewUrl);

  useEffect(() => {
    if (!isHeicFile(file) || previewUrl !== HEIC_PREVIEW_PLACEHOLDER) {
      setSrc(previewUrl);
      return;
    }

    const el = imgRef.current;
    if (!el) return;

    let blobUrl: string | null = null;
    let cancelled = false;

    const load = () => {
      void fetchHeicPreviewUrl(file, 320).then((url) => {
        if (cancelled || !url) return;
        blobUrl = url;
        setSrc(url);
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        load();
      },
      { rootMargin: '120px' },
    );
    observer.observe(el);

    return () => {
      cancelled = true;
      observer.disconnect();
      if (blobUrl?.startsWith('blob:')) URL.revokeObjectURL(blobUrl);
    };
  }, [file, previewUrl]);

  return (
    <Box
      ref={imgRef}
      component="img"
      src={src}
      alt={alt}
      sx={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block', bgcolor: '#e8e4dc' }}
    />
  );
}

type DisplayImage = {
  key: string;
  fileName: string;
  previewUrl: string;
  dateISO: string | null;
  matchesDay: boolean;
  localFile?: File;
};

type Props = {
  open: boolean;
  onClose: () => void;
  siteId: string;
  pageDateStr: string;
  onImported: (galleryUrls: string[], captureDateISO?: string | null) => void;
  onPageDateFromExif: (captureDateISO: string) => void;
  /** Ordner per Galerie-Drop — wird beim Öffnen gescannt */
  pendingFolderFiles?: File[] | null;
  onPendingFolderFilesHandled?: () => void;
};

const folderInputVisuallyHiddenSx = {
  position: 'fixed' as const,
  left: -10000,
  top: 0,
  width: 1,
  height: 1,
  opacity: 0,
  overflow: 'hidden',
};

async function readFolderFilesFromInput(input: HTMLInputElement): Promise<File[]> {
  const snapshot = () =>
    input.files?.length ? Array.from(input.files).filter(isLikelyImageFile) : [];
  let files = snapshot();
  for (const waitMs of [0, 50, 100, 200, 400, 800, 1500, 2500]) {
    if (files.length) break;
    if (waitMs) await new Promise((r) => window.setTimeout(r, waitMs));
    files = snapshot();
  }
  return files;
}

export function ErasmusDayPhotoPickerDialog({
  open,
  onClose,
  siteId,
  pageDateStr,
  onImported,
  onPageDateFromExif,
  pendingFolderFiles,
  onPendingFolderFilesHandled,
}: Props) {
  const folderInputRef = useRef<HTMLInputElement>(null);
  const folderInputId = `erasmus-folder-input-${siteId}`;
  const processFolderRef = useRef(false);
  const [images, setImages] = useState<DisplayImage[]>([]);
  const [localPicks, setLocalPicks] = useState<LocalPhotoPick[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<{ done: number; total: number } | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanInfo, setScanInfo] = useState<string | null>(null);
  const [onlyMatchingDay, setOnlyMatchingDay] = useState(true);
  const [folderDragOver, setFolderDragOver] = useState(false);

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
    setError(null);
  }, []);

  const resetBusyState = useCallback(() => {
    setScanning(false);
    setImporting(false);
    processFolderRef.current = false;
  }, []);

  useEffect(() => {
    if (!open) {
      resetGallery();
      resetBusyState();
      return;
    }
    if (!pendingFolderFiles?.length) resetBusyState();
  }, [open, resetGallery, resetBusyState, pendingFolderFiles]);

  useEffect(() => {
    const el = folderInputRef.current;
    if (!el || !open) return;
    el.setAttribute('webkitdirectory', '');
    el.setAttribute('mozdirectory', '');
    el.removeAttribute('directory');
    el.removeAttribute('accept');
  }, [open]);

  const dayFilterIso = useMemo(() => parseStoryPageDate(pageDateStr) ?? null, [pageDateStr]);

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

  const applyLocalImages = useCallback((items: LocalPhotoPick[]) => {
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
  }, []);

  const applyExifPageDateIfEmpty = useCallback(
    (iso: string | null | undefined) => {
      if (!iso || parseStoryPageDate(pageDateStr)) return;
      onPageDateFromExif(iso);
    },
    [onPageDateFromExif, pageDateStr],
  );

  const loadFolderFiles = useCallback(
    async (picked: File[]) => {
      if (processFolderRef.current) return;
      const imageFiles = picked.filter(isLikelyImageFile);
      const files = imageFiles.length ? imageFiles : picked;
      if (!files.length) {
        setError('Keine Bilddateien im Ordner.');
        return;
      }

      processFolderRef.current = true;
      setError(null);
      setScanning(true);
      setScanProgress({ done: 0, total: files.length });
      setScanInfo(`${files.length} Bilder — lese Aufnahmedatum …`);
      revokeLocalPhotoPreviews(localPicksRef.current);
      localPicksRef.current = [];
      setLocalPicks([]);
      setImages([]);
      setSelected(new Set());

      try {
        const result = await scanPickedFilesForDay(files, pageDateStr, (done, total) => {
          setScanProgress({ done, total });
        });
        applyExifPageDateIfEmpty(result.suggestedCaptureDateISO);
        applyLocalImages(result.images);

        const pageIso = parseStoryPageDate(pageDateStr);
        const dateLabel =
          pageIso && targetLabel
            ? targetLabel
            : result.targetDate
              ? formatIsoDateDe(result.targetDate)
              : null;

        if (result.matchedCount > 0 && pageIso) {
          setOnlyMatchingDay(true);
          setScanInfo(
            `${result.total} Bilder · ${result.matchedCount} vom ${dateLabel} vorausgewählt — weitere markieren oder „Übernehmen“`,
          );
        } else if (result.exifCount === 0) {
          setOnlyMatchingDay(false);
          setError(`Von ${result.total} Bildern hat keines EXIF-Aufnahmedaten.`);
          setScanInfo(`${result.total} Bilder — bitte manuell auswählen.`);
        } else {
          setOnlyMatchingDay(false);
          setScanInfo(
            pageIso
              ? `${result.total} Bilder · keine vom ${dateLabel} — alle anzeigen, selbst wählen`
              : `${result.total} Bilder — Datum der Unterseite fehlt, EXIF-Vorschlag wurde gesetzt`,
          );
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ordner konnte nicht gelesen werden');
        setScanInfo(null);
      } finally {
        setScanning(false);
        setScanProgress(null);
        processFolderRef.current = false;
      }
    },
    [pageDateStr, targetLabel, applyExifPageDateIfEmpty, applyLocalImages],
  );

  const loadFolderFilesRef = useRef(loadFolderFiles);
  loadFolderFilesRef.current = loadFolderFiles;

  useEffect(() => {
    if (!open || !pendingFolderFiles?.length) return;
    const files = pendingFolderFiles;
    onPendingFolderFilesHandled?.();
    void loadFolderFilesRef.current(files);
  }, [open, pendingFolderFiles, onPendingFolderFilesHandled]);

  const importPicks = useCallback(
    async (picks: LocalPhotoPick[]) => {
      if (!picks.length) {
        setError('Bitte mindestens ein Bild auswählen.');
        return;
      }
      setImporting(true);
      setError(null);
      try {
        const files = picks.map((p) => p.file);
        const dates = await Promise.all(files.map((f) => readCaptureDateISOFromFile(f)));
        const captureDateISO =
          pickDominantCaptureDateISO(dates) ?? picks.find((p) => p.dateISO)?.dateISO ?? null;
        const urls = await importPhotoFilesUpload(siteId, pageDateStr, files);
        onImported(urls, captureDateISO);
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Import fehlgeschlagen');
      } finally {
        setImporting(false);
      }
    },
    [siteId, pageDateStr, onImported, onClose],
  );

  const onFolderDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setFolderDragOver(false);
      const picked = await collectImageFilesFromDataTransfer(e.dataTransfer);
      await loadFolderFiles(picked);
    },
    [loadFolderFiles],
  );

  const pickFolder = useCallback(async () => {
    setError(null);
    processFolderRef.current = false;
    setScanInfo('Ordner im Finder wählen …');

    if (supportsDirectoryPicker()) {
      try {
        const files = await pickFolderImageFilesViaDirectoryPicker();
        if (!files.length) {
          setScanInfo(null);
          setError('Keine Bilddateien in diesem Ordner.');
          return;
        }
        await loadFolderFiles(files);
        return;
      } catch (e) {
        const name = e instanceof DOMException ? e.name : e instanceof Error ? e.name : '';
        if (name === 'AbortError') {
          setScanInfo(null);
          return;
        }
      }
    }

    setScanInfo('Finder-Dialog …');
    const input = folderInputRef.current;
    if (!input) return;
    input.value = '';
    input.click();
  }, [loadFolderFiles]);

  const onFolderInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target;
      void (async () => {
        processFolderRef.current = false;
        const files = await readFolderFilesFromInput(input);
        input.value = '';
        if (!files.length) {
          setError('Keine Bilddateien — Ordner erneut wählen oder hierher ziehen.');
          setScanInfo(null);
          return;
        }
        await loadFolderFiles(files);
      })();
    },
    [loadFolderFiles],
  );

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const importSelected = () => {
    const picks = localPicks.filter((p) => selected.has(p.id));
    void importPicks(picks);
  };

  const selectAllVisible = () => setSelected(new Set(visibleImages.map((i) => i.key)));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      disableEnforceFocus
      disableRestoreFocus
    >
      <DialogTitle
        component="div"
        sx={{
          ...dialogCloseTitleSx,
          pr: 11,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          flexWrap: 'wrap',
        }}
      >
        <input
          ref={folderInputRef}
          id={folderInputId}
          type="file"
          multiple
          tabIndex={-1}
          aria-hidden
          onChange={onFolderInputChange}
          style={folderInputVisuallyHiddenSx}
        />
        <Typography variant="h6" component="span" sx={{ fontSize: '1rem', fontWeight: 700, mr: 'auto' }}>
          Fotos importieren
        </Typography>
        <Button
          variant="contained"
          size="small"
          onClick={() => void pickFolder()}
          sx={{
            textTransform: 'none',
            fontSize: '0.8rem',
            py: 0.35,
            flexShrink: 0,
            position: 'relative',
            zIndex: 2,
          }}
        >
          Ordner auswählen
        </Button>
        {images.length > 0 ? (
          <Button
            variant="outlined"
            size="small"
            disabled={scanning || importing || selected.size === 0}
            onClick={importSelected}
            sx={{ textTransform: 'none', fontSize: '0.8rem', py: 0.35, flexShrink: 0 }}
          >
            {importing ? 'Kopiere …' : `${selected.size} übernehmen`}
          </Button>
        ) : null}
        <DialogCloseIconButton onClose={onClose} />
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          {targetLabel ? (
            <Typography variant="body2" color="text.secondary">
              Unterseite: <strong>{targetLabel}</strong>
            </Typography>
          ) : null}

          <Box
            onDragEnter={(e) => {
              e.preventDefault();
              setFolderDragOver(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setFolderDragOver(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setFolderDragOver(false);
            }}
            onDrop={(e) => void onFolderDrop(e)}
            sx={{
              py: 2,
              px: 2,
              borderRadius: 1,
              border: '2px dashed',
              borderColor: folderDragOver ? 'primary.main' : 'divider',
              bgcolor: folderDragOver ? 'action.hover' : 'transparent',
              textAlign: 'center',
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Ordner aus dem Finder hierher ziehen
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              Ordner markieren → „Öffnen“ bestätigen. Bei Fotos/iCloud: in einen normalen Unterordner
              wechseln (z.&nbsp;B. „Erasmus 2026“). Oder Ordner hierher ziehen.
            </Typography>
          </Box>

          {scanning ? (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                {scanInfo ?? 'Verarbeite …'}
              </Typography>
              <LinearProgress
                variant={scanProgress?.total ? 'determinate' : 'indeterminate'}
                value={
                  scanProgress?.total ? (100 * scanProgress.done) / scanProgress.total : undefined
                }
              />
              {scanProgress?.total ? (
                <Typography variant="caption" color="text.secondary">
                  {scanProgress.done} / {scanProgress.total}
                </Typography>
              ) : null}
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
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: dayFilterIso ? 'repeat(3, minmax(0, 1fr))' : 'repeat(2, minmax(0, 1fr))',
                gap: 0.75,
                width: '100%',
              }}
            >
              <Button
                size="small"
                fullWidth
                onClick={selectAllVisible}
                sx={{ textTransform: 'none', fontSize: '0.72rem', py: 0.4, minWidth: 0 }}
              >
                Alle sichtbaren
              </Button>
              <Button
                size="small"
                fullWidth
                onClick={() => setSelected(new Set())}
                sx={{ textTransform: 'none', fontSize: '0.72rem', py: 0.4, minWidth: 0 }}
              >
                Keine
              </Button>
              {dayFilterIso ? (
                <Button
                  size="small"
                  fullWidth
                  onClick={() =>
                    setSelected(
                      new Set(images.filter((i) => i.dateISO === dayFilterIso).map((i) => i.key)),
                    )
                  }
                  sx={{ textTransform: 'none', fontSize: '0.72rem', py: 0.4, minWidth: 0 }}
                >
                  Nur {targetLabel ?? formatIsoDateDe(dayFilterIso)}
                </Button>
              ) : null}
            </Box>
          ) : null}

          {error ? <Alert severity="warning">{error}</Alert> : null}

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
                      outlineColor: checked ? 'primary.main' : 'divider',
                      overflow: 'hidden',
                    }}
                  >
                    {img.localFile ? (
                      <PickPreviewImage
                        file={img.localFile}
                        previewUrl={img.previewUrl}
                        alt={img.fileName}
                      />
                    ) : (
                      <Box
                        component="img"
                        src={img.previewUrl}
                        alt={img.fileName}
                        sx={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }}
                      />
                    )}
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
    </Dialog>
  );
}
