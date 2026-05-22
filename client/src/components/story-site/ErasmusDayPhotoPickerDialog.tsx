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
  Divider,
  Chip,
} from '@mui/material';
import { Videocam as VideocamIcon } from '@mui/icons-material';
import { DialogCloseIconButton, dialogCloseTitleSx } from '../ui/dialog-close-icon-button';
import { parseStoryPageDate, formatIsoDateDe } from '../../lib/storyPageDate';
import { displayStoryImageSrc } from '../../lib/storyPageLayout';
import {
  scanPickedFilesForDay,
  revokeLocalPhotoPreviews,
  type LocalPhotoPick,
} from '../../lib/scanLocalPhotoFiles';
import { readCaptureDateISOFromFile, pickDominantCaptureDateISO } from '../../lib/photoCaptureDate';
import { importPhotoFilesUpload, importSelectedPhotos } from '../../lib/storySitePhotoImport';
import { isStoryVideoSrc } from '../../lib/storyMediaUtils';
import {
  collectImageFilesFromDataTransfer,
  pickFolderImageFilesViaDirectoryPicker,
  supportsDirectoryPicker,
} from '../../lib/pickFolderImageFiles';
import { isLikelyStoryMediaFile, isLikelyVideoFile } from '../../lib/storyMediaUtils';
import { storyPhotoDisplaySx } from '../../lib/storyImageEnhance';
import {
  fetchHeicPreviewUrl,
  HEIC_PREVIEW_PLACEHOLDER,
  isHeicFile,
} from '../../lib/heicPreview';

function PickPreviewMedia({
  file,
  previewUrl,
  alt,
  isVideoFile,
}: {
  file?: File;
  previewUrl: string;
  alt: string;
  isVideoFile?: boolean;
}) {
  const isVideo = file ? isLikelyVideoFile(file) : !!isVideoFile;
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [src, setSrc] = useState(previewUrl);

  useEffect(() => {
    if (isVideo) {
      setSrc(previewUrl);
      return;
    }
    if (!file || !isHeicFile(file) || previewUrl !== HEIC_PREVIEW_PLACEHOLDER) {
      setSrc(previewUrl);
      return;
    }

    const el = imgRef.current;
    if (!el) return;

    let blobUrl: string | null = null;
    let cancelled = false;

    const load = () => {
      void fetchHeicPreviewUrl(file, 480).then((url) => {
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
  }, [file, previewUrl, isVideo]);

  const mediaSx = {
    width: '100%',
    aspectRatio: '4 / 3',
    objectFit: 'cover' as const,
    display: 'block',
    bgcolor: '#e8e4dc',
    minHeight: 140,
    ...storyPhotoDisplaySx,
  };

  if (isVideo) {
    return (
      <Box sx={{ position: 'relative' }}>
        <Box
          component="video"
          src={src}
          muted
          playsInline
          preload="metadata"
          aria-label={alt}
          sx={mediaSx}
        />
        <Chip
          label="Video"
          size="small"
          icon={<VideocamIcon sx={{ fontSize: 14 }} />}
          sx={{
            position: 'absolute',
            top: 6,
            right: 6,
            height: 22,
            fontSize: '0.65rem',
            bgcolor: 'rgba(0,0,0,0.65)',
            color: '#fff',
            '& .MuiChip-icon': { color: '#fff' },
          }}
        />
      </Box>
    );
  }

  return (
    <Box ref={imgRef} component="img" src={src} alt={alt} sx={mediaSx} />
  );
}

type DisplayImage = {
  key: string;
  fileName: string;
  previewUrl: string;
  dateISO: string | null;
  matchesDay: boolean;
  localFile?: File;
  relativePath?: string;
  sourcePath?: string;
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
    input.files?.length ? Array.from(input.files).filter(isLikelyStoryMediaFile) : [];
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
  const [videoImages, setVideoImages] = useState<DisplayImage[]>([]);
  const [localPicks, setLocalPicks] = useState<LocalPhotoPick[]>([]);
  const [localVideoPicks, setLocalVideoPicks] = useState<LocalPhotoPick[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
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
  const localVideoPicksRef = useRef<LocalPhotoPick[]>([]);
  useEffect(() => {
    localPicksRef.current = localPicks;
  }, [localPicks]);
  useEffect(() => {
    localVideoPicksRef.current = localVideoPicks;
  }, [localVideoPicks]);

  const resetGallery = useCallback(() => {
    revokeLocalPhotoPreviews(localPicksRef.current);
    revokeLocalPhotoPreviews(localVideoPicksRef.current);
    localPicksRef.current = [];
    localVideoPicksRef.current = [];
    setLocalPicks([]);
    setLocalVideoPicks([]);
    setImages([]);
    setVideoImages([]);
    setSelected(new Set());
    setSelectedVideos(new Set());
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

  /** Videos immer alle anzeigen (MOV hat oft kein EXIF — sonst unsichtbar). */
  const visibleVideos = videoImages;

  const videosMatchingDay = useMemo(() => {
    if (!dayFilterIso) return videoImages.filter((v) => v.matchesDay);
    return videoImages.filter((v) => v.dateISO === dayFilterIso);
  }, [videoImages, dayFilterIso]);

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
    setLocalVideoPicks((prev) =>
      prev.map((p) => ({
        ...p,
        matchesDay: p.dateISO === dayFilterIso,
      })),
    );
  }, [dayFilterIso]);

  const picksToDisplay = (items: LocalPhotoPick[]): DisplayImage[] =>
    items.map((img) => ({
      key: img.id,
      fileName: img.fileName,
      previewUrl: img.previewUrl,
      dateISO: img.dateISO,
      matchesDay: img.matchesDay,
      localFile: img.file,
      relativePath: img.relativePath,
      sourcePath: img.sourcePath,
    }));

  const applyLocalScan = useCallback((photos: LocalPhotoPick[], videos: LocalPhotoPick[]) => {
    setLocalPicks(photos);
    setLocalVideoPicks(videos);
    setImages(picksToDisplay(photos));
    setVideoImages(picksToDisplay(videos));
    setSelected(new Set());
    setSelectedVideos(new Set());
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
      const mediaFiles = picked.filter(isLikelyStoryMediaFile);
      const files = mediaFiles.length ? mediaFiles : picked;
      if (!files.length) {
        setError('Keine Bild- oder Videodateien im Ordner.');
        return;
      }

      processFolderRef.current = true;
      setError(null);
      setScanning(true);
      setScanProgress({ done: 0, total: files.length });
      setScanInfo(`${files.length} Dateien — lese Aufnahmedatum …`);
      revokeLocalPhotoPreviews(localPicksRef.current);
      revokeLocalPhotoPreviews(localVideoPicksRef.current);
      localPicksRef.current = [];
      localVideoPicksRef.current = [];
      setLocalPicks([]);
      setLocalVideoPicks([]);
      setImages([]);
      setVideoImages([]);
      setSelected(new Set());
      setSelectedVideos(new Set());

      try {
        const result = await scanPickedFilesForDay(files, pageDateStr, (done, total) => {
          setScanProgress({ done, total });
        });
        applyExifPageDateIfEmpty(result.suggestedCaptureDateISO);
        applyLocalScan(result.images, result.videos);

        const pageIso = parseStoryPageDate(pageDateStr);
        const dateLabel =
          pageIso && targetLabel
            ? targetLabel
            : result.targetDate
              ? formatIsoDateDe(result.targetDate)
              : null;

        const mediaSummary =
          result.videoCount > 0
            ? `${result.photoCount} Fotos, ${result.videoCount} Video${result.videoCount === 1 ? '' : 's'} (MOV/MP4)`
            : `${result.photoCount} Fotos`;

        if (result.matchedCount > 0 && pageIso) {
          setOnlyMatchingDay(true);
          const videoHint =
            result.videoCount > 0
              ? ` · ${result.videoMatchedCount} Video(s) vom ${dateLabel} unten separat`
              : '';
          setScanInfo(
            `${mediaSummary} · ${result.matchedCount} Foto(s) vom ${dateLabel}${videoHint} — auswählen und übernehmen`,
          );
        } else if (result.exifCount === 0) {
          setOnlyMatchingDay(false);
          setError(`Von ${result.total} Dateien hat keine EXIF-Aufnahmedaten.`);
          setScanInfo(`${mediaSummary} — bitte manuell auswählen.`);
        } else {
          setOnlyMatchingDay(false);
          const videoHint =
            result.videoCount > 0
              ? ` · ${result.videoCount} Video(s) siehe Abschnitt unten`
              : '';
          setScanInfo(
            pageIso
              ? `${mediaSummary} · keine Fotos vom ${dateLabel}${videoHint}`
              : `${mediaSummary} — Datum der Unterseite fehlt, EXIF-Vorschlag wurde gesetzt`,
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
    [pageDateStr, targetLabel, applyExifPageDateIfEmpty, applyLocalScan],
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
        setError('Bitte mindestens eine Datei auswählen.');
        return;
      }
      setImporting(true);
      setError(null);
      try {
        const captureDateISO =
          pickDominantCaptureDateISO(picks.map((p) => p.dateISO)) ??
          picks.find((p) => p.dateISO)?.dateISO ??
          null;
        const urls: string[] = [];
        const local = picks.filter((p) => p.file);
        const server = picks.filter((p) => p.relativePath && p.sourcePath);
        if (local.length) {
          const files = local.map((p) => p.file as File);
          urls.push(...(await importPhotoFilesUpload(siteId, pageDateStr, files)));
        }
        if (server.length) {
          const root = server[0].sourcePath as string;
          const paths = server.map((p) => p.relativePath as string);
          urls.push(...(await importSelectedPhotos(siteId, root, pageDateStr, paths)));
        }
        if (!urls.length) throw new Error('Import fehlgeschlagen');
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
          setError('Keine Bild- oder Videodateien in diesem Ordner.');
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
          setError('Keine Bild- oder Videodateien — Ordner erneut wählen oder hierher ziehen.');
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

  const toggleVideo = (key: string) => {
    setSelectedVideos((prev) => {
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

  const importSelectedVideos = () => {
    const picks = localVideoPicks.filter((p) => selectedVideos.has(p.id));
    void importPicks(picks);
  };

  const selectAllVisible = () => setSelected(new Set(visibleImages.map((i) => i.key)));
  const selectAllVisibleVideos = () =>
    setSelectedVideos(new Set(visibleVideos.map((i) => i.key)));

  const renderMediaGrid = (
    items: DisplayImage[],
    checkedSet: Set<string>,
    onToggle: (key: string) => void,
  ) => (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(2, minmax(0, 1fr))',
          sm: 'repeat(3, minmax(0, 1fr))',
          md: 'repeat(4, minmax(0, 1fr))',
        },
        gap: 2,
        maxHeight: { xs: 360, sm: 420 },
        overflowY: 'auto',
        pr: 0.5,
      }}
    >
      {items.map((img) => {
        const checked = checkedSet.has(img.key);
        return (
          <Box
            key={img.key}
            onClick={() => onToggle(img.key)}
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
              <PickPreviewMedia
                file={img.localFile}
                previewUrl={img.previewUrl}
                alt={img.fileName}
              />
            ) : (
              <PickPreviewMedia
                previewUrl={displayStoryImageSrc(img.previewUrl)}
                alt={img.fileName}
                isVideoFile={isStoryVideoSrc(img.fileName)}
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
                fontSize: '0.7rem',
                lineHeight: 1.2,
              }}
            >
                      {img.fileName}
                      {img.dateISO ? ` · ${img.dateISO}` : ' · Datum unbekannt'}
                      {dayFilterIso && img.dateISO === dayFilterIso ? ' · passt' : ''}
                    </Typography>
          </Box>
        );
      })}
    </Box>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{ sx: { width: '100%', maxWidth: 960 } }}
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
          disabled={scanning || importing}
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
            {importing ? 'Kopiere …' : `${selected.size} Foto${selected.size === 1 ? '' : 's'}`}
          </Button>
        ) : null}
        {videoImages.length > 0 ? (
          <Button
            variant="outlined"
            size="small"
            color="secondary"
            disabled={scanning || importing || selectedVideos.size === 0}
            onClick={importSelectedVideos}
            sx={{ textTransform: 'none', fontSize: '0.8rem', py: 0.35, flexShrink: 0 }}
          >
            {importing
              ? 'Kopiere …'
              : `${selectedVideos.size} Video${selectedVideos.size === 1 ? '' : 's'}`}
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

          {images.length > 0 || videoImages.length > 0 ? (
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={onlyMatchingDay}
                  onChange={(e) => setOnlyMatchingDay(e.target.checked)}
                />
              }
              label={`Nur Fotos vom ${targetLabel ?? (dayFilterIso ? formatIsoDateDe(dayFilterIso) : 'Unterseiten-Datum')} anzeigen (Videos immer alle)`}
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
            <>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.85rem' }}>
                Fotos
              </Typography>
              {renderMediaGrid(visibleImages, selected, toggle)}
            </>
          ) : null}

          {!scanning && videoImages.length > 0 ? (
            <>
              <Divider sx={{ my: 0.5 }} />
              <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                <VideocamIcon color="secondary" fontSize="small" />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.85rem' }}>
                  Videos (MOV / MP4)
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  — separat auswählen und in die Galerie einfügen
                  {dayFilterIso
                    ? ` · ${videosMatchingDay.length} von ${videoImages.length} passen zu ${targetLabel ?? formatIsoDateDe(dayFilterIso)}`
                    : ` · ${videoImages.length} gefunden`}
                </Typography>
              </Stack>
              {visibleVideos.length > 0 ? (
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
                    onClick={selectAllVisibleVideos}
                    sx={{ textTransform: 'none', fontSize: '0.72rem', py: 0.4, minWidth: 0 }}
                  >
                    Alle Videos
                  </Button>
                  <Button
                    size="small"
                    fullWidth
                    onClick={() => setSelectedVideos(new Set())}
                    sx={{ textTransform: 'none', fontSize: '0.72rem', py: 0.4, minWidth: 0 }}
                  >
                    Keine
                  </Button>
                  {dayFilterIso ? (
                    <Button
                      size="small"
                      fullWidth
                      onClick={() =>
                        setSelectedVideos(
                          new Set(
                            videoImages.filter((i) => i.dateISO === dayFilterIso).map((i) => i.key),
                          ),
                        )
                      }
                      sx={{ textTransform: 'none', fontSize: '0.72rem', py: 0.4, minWidth: 0 }}
                    >
                      Nur {targetLabel ?? formatIsoDateDe(dayFilterIso)}
                    </Button>
                  ) : null}
                </Box>
              ) : null}
              {visibleVideos.length > 0
                ? renderMediaGrid(visibleVideos, selectedVideos, toggleVideo)
                : null}
            </>
          ) : null}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
