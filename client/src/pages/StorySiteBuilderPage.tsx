import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  TextField,
  Button,
  Stack,
  Snackbar,
  Alert,
  CircularProgress,
  List,
  ListItemButton,
  ListItemText,
  Divider,
  useMediaQuery,
  useTheme,
  Paper,
  Chip,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Image as ImageIcon,
  DeleteOutline as DeleteOutlineIcon,
  Add as AddIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  OpenInNew as OpenInNewIcon,
  Menu as MenuIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { RichTextEditor, type RichTextEditorHandle } from '../components/ui/rich-text-editor';
import { StorySitePageBlock } from '../components/story-site/StorySitePreviewBody';
import {
  StoryCompactToolbar,
  StoryToolbarDivider,
  storyToolbarFieldSx,
  storyToolbarIconBtnSx,
} from '../components/story-site/StoryCompactToolbar';
import {
  StoryPageGalleryPanel,
  type StoryPageGalleryPanelHandle,
} from '../components/story-site/StoryPageGalleryPanel';
import { ErasmusDayPhotoPickerDialog } from '../components/story-site/ErasmusDayPhotoPickerDialog';
import { collectPageImages, normalizePageForPreview } from '../lib/storyPageLayout';
import { fileToStoryImageDataUrl, isLikelyImageFile } from '../lib/storyImageUtils';
import { formatIsoDateDe } from '../lib/storyPageDate';
import {
  type StorySite,
  type StoryPage,
  getSiteById,
  persistSite,
  deleteSiteById,
  ensureStorySitesStorageReady,
  writePreviewSnapshot,
  fetchSiteHydratedFromServer,
  mergeSitesForPreview,
  addPageToSite,
  removePageFromSite,
  movePage,
  updatePage,
} from '../lib/storySitesStorage';

export default function StorySiteBuilderPage() {
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up('md'));
  const navigate = useNavigate();
  const { siteId } = useParams<{ siteId: string }>();

  const [site, setSite] = useState<StorySite | null>(null);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [toastSeverity, setToastSeverity] = useState<'success' | 'info' | 'warning' | 'error'>('info');
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bodyEditorRef = useRef<RichTextEditorHandle>(null);
  const galleryRef = useRef<StoryPageGalleryPanelHandle>(null);
  const siteRef = useRef(site);
  siteRef.current = site;
  const [galleryBusy, setGalleryBusy] = useState(false);
  const [photoPickerOpen, setPhotoPickerOpen] = useState(false);
  const [pendingFolderFiles, setPendingFolderFiles] = useState<File[] | null>(null);

  useEffect(() => {
    if (!siteId) {
      navigate('/stories-tagebuecher', { replace: true });
      return;
    }
    let cancelled = false;
    void (async () => {
      await ensureStorySitesStorageReady();
      if (cancelled) return;
      const local = getSiteById(siteId);
      if (!local) {
        navigate('/stories-tagebuecher', { replace: true });
        return;
      }
      const server = await fetchSiteHydratedFromServer(siteId);
      const loaded = server ? mergeSitesForPreview(local, server) : local;
      setSite(loaded);
      setActivePageId((prev) => {
        if (prev && loaded.pages.some((p) => p.id === prev)) return prev;
        return loaded.pages[0]?.id ?? null;
      });
      void persistSite(loaded);
    })();
    return () => {
      cancelled = true;
    };
  }, [siteId, navigate]);

  const showToast = useCallback((message: string, severity: 'success' | 'info' | 'warning' | 'error' = 'info') => {
    setToastSeverity(severity);
    setToast(message);
  }, []);

  const flushPersist = useCallback(async (s: StorySite) => {
    const { localOk, serverOk, serverError, site: saved } = await persistSite(s);
    if (saved) setSite(saved);
    if (!localOk) showToast('Lokal speichern fehlgeschlagen — bitte Seite neu laden.', 'error');
    else if (!serverOk) {
      showToast(
        serverError
          ? `Server-Speichern: ${serverError}`
          : 'Server-Speichern fehlgeschlagen — Vorschau im neuen Tab evtl. unvollständig.',
        'warning',
      );
    }
    return { localOk, serverOk };
  }, [showToast]);

  const scheduleSave = useCallback(
    (s: StorySite) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void flushPersist(s);
      }, 450);
    },
    [flushPersist]
  );

  const patchSite = useCallback(
    (next: StorySite) => {
      setSite(next);
      scheduleSave(next);
    },
    [scheduleSave]
  );

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const activePage = useMemo(
    () => site?.pages.find((p) => p.id === activePageId) ?? null,
    [site, activePageId]
  );

  const updateActivePage = (patch: Partial<StoryPage>) => {
    if (!site || !activePageId) return;
    patchSite(updatePage(site, activePageId, patch));
  };

  /** Editor-DOM kann neuer sein als React-State (z. B. direkt nach Bildeinfügen). */
  const siteWithLiveBodyHtml = useCallback((): StorySite | null => {
    if (!site || !activePageId) return site;
    const liveHtml = bodyEditorRef.current?.getHtml();
    if (liveHtml == null) return site;
    const page = site.pages.find((p) => p.id === activePageId);
    if (!page || liveHtml === page.bodyHtml) return site;
    return updatePage(site, activePageId, { bodyHtml: liveHtml });
  }, [site, activePageId]);

  const handleSaveNow = useCallback(async () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    bodyEditorRef.current?.flush();
    const latest = siteWithLiveBodyHtml();
    if (!latest) return;
    if (latest !== site) setSite(latest);
    setSaving(true);
    const { localOk, serverOk } = await flushPersist(latest);
    setSaving(false);
    if (localOk && serverOk) showToast('Gespeichert', 'success');
  }, [site, siteWithLiveBodyHtml, flushPersist, showToast]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        void handleSaveNow();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSaveNow]);

  const addGalleryFiles = useCallback(
    (fileList: FileList | File[]) => {
      if (!activePageId) return;
      const files = Array.from(fileList).filter(isLikelyImageFile);
      if (!files.length) {
        setToast('Keine gültigen Bilddateien erkannt.');
        return;
      }
      void (async () => {
        setGalleryBusy(true);
        const added: string[] = [];
        for (const file of files) {
          try {
            const url = await fileToStoryImageDataUrl(file);
            if (url) added.push(url);
          } catch {
            /* einzelnes Bild überspringen */
          }
        }
        setGalleryBusy(false);
        if (!added.length) {
          setToast('Bilder konnten nicht verarbeitet werden (auch HEIC wird unterstützt — ggf. erneut versuchen).');
          return;
        }
        const current = siteRef.current;
        if (!current) return;
        const page = current.pages.find((p) => p.id === activePageId);
        const galleryImages = [...(page?.galleryImages ?? []), ...added];
        patchSite(updatePage(current, activePageId, { galleryImages, heroImage: galleryImages[0] ?? '' }));
      })();
    },
    [activePageId, patchSite],
  );

  const removeGalleryImage = (index: number) => {
    if (!activePage) return;
    const galleryImages = activePage.galleryImages.filter((_, i) => i !== index);
    updateActivePage({ galleryImages, heroImage: galleryImages[0] ?? '' });
  };

  const clearGalleryImages = () => {
    updateActivePage({ galleryImages: [], heroImage: '' });
  };

  const previewPage = useMemo(() => {
    if (!activePage) return null;
    const liveHtml = bodyEditorRef.current?.getHtml();
    const bodyHtml =
      liveHtml != null && liveHtml !== activePage.bodyHtml ? liveHtml : activePage.bodyHtml;
    return normalizePageForPreview({ ...activePage, bodyHtml });
  }, [activePage]);

  const previewImageCount = useMemo(() => {
    if (!previewPage) return 0;
    return collectPageImages(previewPage).length;
  }, [previewPage]);

  const handleAddPage = () => {
    if (!site) return;
    const next = addPageToSite(site);
    patchSite(next);
    const last = next.pages[next.pages.length - 1];
    if (last) setActivePageId(last.id);
    setMobileNavOpen(false);
  };

  const handleRemovePage = () => {
    if (!site || !activePageId || site.pages.length <= 1) return;
    if (!window.confirm('Diese Unterseite wirklich löschen?')) return;
    const next = removePageFromSite(site, activePageId);
    patchSite(next);
    setActivePageId(next.pages[0]?.id ?? null);
  };

  const handleMove = (dir: -1 | 1) => {
    if (!site || !activePageId) return;
    patchSite(movePage(site, activePageId, dir));
  };

  const renameSite = (name: string) => {
    if (!site) return;
    patchSite({ ...site, name });
  };

  const updateCountry = (country: string) => {
    if (!site) return;
    patchSite({ ...site, country });
  };

  const handleImportedGalleryUrls = (urls: string[], captureDateISO?: string | null) => {
    if (!site || !activePageId || !urls.length) return;
    const page = site.pages.find((p) => p.id === activePageId);
    const galleryImages = [...(page?.galleryImages ?? []), ...urls];
    const patch: Partial<StoryPage> = { galleryImages, heroImage: galleryImages[0] ?? '' };
    if (captureDateISO) {
      patch.dateStr = formatIsoDateDe(captureDateISO);
    }
    updateActivePage(patch);
    const dateHint = captureDateISO ? ` · Datum: ${formatIsoDateDe(captureDateISO)} (EXIF)` : '';
    showToast(
      `${urls.length} Bild${urls.length === 1 ? '' : 'er'} übernommen${dateHint}`,
      'success',
    );
  };

  const handleImportFolderFiles = useCallback((files: File[]) => {
    if (!files.length) return;
    setPendingFolderFiles(files);
    setPhotoPickerOpen(true);
  }, []);

  const clearPendingFolderFiles = useCallback(() => setPendingFolderFiles(null), []);

  const openPublicPreview = async () => {
    const latest = siteWithLiveBodyHtml();
    if (!latest) return;
    bodyEditorRef.current?.flush();
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    if (latest !== site) setSite(latest);
    writePreviewSnapshot(latest);
    const path = `/stories-tagebuecher/site/${latest.id}/vorschau`;
    window.open(path, '_blank', 'noopener,noreferrer');
    const { serverOk } = await flushPersist(latest);
    if (serverOk) {
      const refreshed = getSiteById(latest.id);
      if (refreshed) setSite(refreshed);
    } else {
      showToast('Vorschau geöffnet — Server-Speichern fehlgeschlagen, Bilder nur lokal.', 'warning');
    }
  };

  const handleDeleteSite = async () => {
    if (!site) return;
    if (!window.confirm(`Website „${site.name}“ und alle Unterseiten wirklich löschen?`)) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const id = site.id;
    await deleteSiteById(id);
    try {
      await fetch(`/api/story-sites/${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch {
      /* ignore */
    }
    navigate('/stories-tagebuecher');
  };

  if (!site || !activePage || !activePageId) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#eceff1' }}>
        <CircularProgress />
      </Box>
    );
  }

  const sidebar = (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        overflow: 'hidden',
        maxHeight: isMd ? 'calc(100vh - 140px)' : 'none',
        position: isMd ? 'sticky' : 'static',
        top: isMd ? 88 : undefined,
      }}
    >
      <Box sx={{ px: 1.5, py: 1, bgcolor: 'grey.50', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="caption" fontWeight={800} color="text.secondary">
          Unterseiten
        </Typography>
      </Box>
      <List dense disablePadding sx={{ maxHeight: isMd ? 360 : 'none', overflow: isMd ? 'auto' : 'visible' }}>
        {site.pages.map((p, idx) => (
          <ListItemButton
            key={p.id}
            selected={p.id === activePageId}
            onClick={() => {
              setActivePageId(p.id);
              setMobileNavOpen(false);
            }}
          >
            <ListItemText
              primary={p.title || `Seite ${idx + 1}`}
              secondary={`${idx + 1}. Unterseite`}
              primaryTypographyProps={{ fontWeight: 700, noWrap: true }}
              secondaryTypographyProps={{ fontSize: '0.7rem' }}
            />
          </ListItemButton>
        ))}
      </List>
      <Divider />
      <Box sx={{ p: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Button size="small" startIcon={<AddIcon />} onClick={handleAddPage} fullWidth variant="outlined">
          Unterseite hinzufügen
        </Button>
        <Stack direction="row" spacing={0.5} justifyContent="center">
          <Tooltip title="Nach oben">
            <span>
              <IconButton size="small" onClick={() => handleMove(-1)} disabled={site.pages.findIndex((p) => p.id === activePageId) <= 0}>
                <KeyboardArrowUpIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Nach unten">
            <span>
              <IconButton
                size="small"
                onClick={() => handleMove(1)}
                disabled={site.pages.findIndex((p) => p.id === activePageId) >= site.pages.length - 1}
              >
                <KeyboardArrowDownIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Unterseite löschen">
            <span>
              <IconButton size="small" onClick={handleRemovePage} disabled={site.pages.length <= 1} color="error">
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Box>
    </Paper>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#eceff1' }}>
      <StoryCompactToolbar className="no-print">
        <Tooltip title="Zur Übersicht">
          <IconButton
            size="small"
            onClick={() => navigate('/stories-tagebuecher')}
            aria-label="Zurück"
            sx={storyToolbarIconBtnSx}
          >
            <ArrowBackIcon />
          </IconButton>
        </Tooltip>
        {!isMd && (
          <Tooltip title="Unterseiten">
            <IconButton
              size="small"
              onClick={() => setMobileNavOpen((v) => !v)}
              aria-label="Unterseiten"
              sx={storyToolbarIconBtnSx}
            >
              <MenuIcon />
            </IconButton>
          </Tooltip>
        )}
        <TextField
          size="small"
          placeholder="Website-Titel"
          value={site.name}
          onChange={(e) => renameSite(e.target.value)}
          sx={storyToolbarFieldSx}
        />
        <TextField
          size="small"
          placeholder="Land"
          value={site.country ?? ''}
          onChange={(e) => updateCountry(e.target.value)}
          sx={{ ...storyToolbarFieldSx, maxWidth: { xs: 100, sm: 140 } }}
        />
        <StoryToolbarDivider />
        <Tooltip title="Jetzt speichern (Strg+S)">
          <span>
            <IconButton
              size="small"
              onClick={() => void handleSaveNow()}
              disabled={saving}
              aria-label="Speichern"
              sx={{
                ...(storyToolbarIconBtnSx as object),
                color: 'primary.main',
                borderColor: 'primary.light',
              }}
            >
              {saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
            </IconButton>
          </span>
        </Tooltip>
        <StoryToolbarDivider />
        <Tooltip title="Vorschau">
          <IconButton
            size="small"
            onClick={() => void openPublicPreview()}
            aria-label="Vorschau"
            sx={storyToolbarIconBtnSx}
          >
            <OpenInNewIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Galerie (rechts in der Vorschau)">
          <IconButton
            size="small"
            onClick={() => galleryRef.current?.pickFiles()}
            aria-label="Galerie"
            sx={storyToolbarIconBtnSx}
          >
            <ImageIcon />
          </IconButton>
        </Tooltip>
        {(activePage.galleryImages?.length ?? 0) > 0 ? (
          <Tooltip title="Galerie leeren">
            <IconButton
              size="small"
              onClick={clearGalleryImages}
              aria-label="Galerie leeren"
              sx={storyToolbarIconBtnSx}
            >
              <DeleteOutlineIcon />
            </IconButton>
          </Tooltip>
        ) : null}
        <Tooltip title="Löschen">
          <IconButton
            size="small"
            color="error"
            onClick={() => void handleDeleteSite()}
            aria-label="Website löschen"
            sx={{ ...(storyToolbarIconBtnSx as object), borderColor: 'error.light' }}
          >
            <DeleteOutlineIcon />
          </IconButton>
        </Tooltip>
      </StoryCompactToolbar>

      <Box sx={{ width: '100%', maxWidth: '100%', px: { xs: 0.5, sm: 1.5, md: 2 }, py: { xs: 2, sm: 3 } }}>
        {!isMd && (
          <Box sx={{ mb: 1.5, overflowX: 'auto', pb: 0.5 }} className="no-print">
            <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'nowrap', width: 'max-content', maxWidth: '100%' }}>
              {site.pages.map((p, idx) => (
                <Chip
                  key={p.id}
                  size="small"
                  label={p.title?.trim() || `Seite ${idx + 1}`}
                  onClick={() => setActivePageId(p.id)}
                  color={p.id === activePageId ? 'primary' : 'default'}
                  variant={p.id === activePageId ? 'filled' : 'outlined'}
                  sx={{ fontWeight: 700 }}
                />
              ))}
            </Stack>
          </Box>
        )}
        {!isMd && mobileNavOpen && (
          <Box sx={{ mb: 2 }} className="no-print">
            {sidebar}
          </Box>
        )}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '260px minmax(0, 1fr)' },
            gap: 2,
            alignItems: 'start',
          }}
        >
          {isMd && <Box className="no-print">{sidebar}</Box>}

          <Box className="no-print">
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2, sm: 2.5 },
                mb: 2,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: '#fffef9',
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5, color: '#5d4037' }}>
                Unterseite bearbeiten
              </Typography>
              {site.erasmusFolder ? (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mb: 1.5, fontFamily: 'monospace', fontSize: '0.7rem' }}
                >
                  J-M-Reihen/{site.erasmusFolder}/Bilder
                </Typography>
              ) : (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                  Beim Speichern wird unter J-M-Reihen/Erasmus ein Ordner angelegt (Jahr - Monat - Land - Titel/Bilder).
                </Typography>
              )}
              <Stack spacing={1.5} sx={{ mb: 2 }}>
                <TextField
                  label="Titel"
                  size="small"
                  fullWidth
                  value={activePage.title}
                  onChange={(e) => updateActivePage({ title: e.target.value })}
                />
                <TextField
                  label="Untertitel"
                  size="small"
                  fullWidth
                  value={activePage.subtitle}
                  onChange={(e) => updateActivePage({ subtitle: e.target.value })}
                />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <TextField
                    label="Datum"
                    size="small"
                    fullWidth
                    value={activePage.dateStr}
                    onChange={(e) => updateActivePage({ dateStr: e.target.value })}
                  />
                  <TextField
                    label="Ort"
                    size="small"
                    fullWidth
                    value={activePage.location}
                    onChange={(e) => updateActivePage({ location: e.target.value })}
                  />
                </Stack>
              </Stack>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) minmax(200px, 280px)' },
                  gap: 1.5,
                  alignItems: 'stretch',
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                    Text (Strg+V aus Word — nur Text, keine Bilder)
                  </Typography>
                  <RichTextEditor
                    ref={bodyEditorRef}
                    value={activePage.bodyHtml}
                    onChange={(html) => updateActivePage({ bodyHtml: html })}
                    placeholder="Dein Bericht …"
                    rows={14}
                    imageStorage="dataUrl"
                    allowPasteImages={false}
                    showImageToolbar={false}
                  />
                </Box>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.25,
                    bgcolor: '#faf6ee',
                    borderColor: 'rgba(141, 110, 99, 0.35)',
                    minHeight: { xs: 220, md: 'auto' },
                  }}
                >
                  <StoryPageGalleryPanel
                    ref={galleryRef}
                    images={activePage.galleryImages ?? []}
                    onAddFiles={addGalleryFiles}
                    onReject={(msg) => showToast(msg, 'warning')}
                    onRemoveAt={removeGalleryImage}
                    onClear={clearGalleryImages}
                    processing={galleryBusy}
                    onPickFromFolder={() => setPhotoPickerOpen(true)}
                    onImportFolder={handleImportFolderFiles}
                  />
                </Paper>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Änderungen werden automatisch gespeichert · Speichern-Button oben oder Strg+S für sofortiges Speichern
                {' · '}
                {previewImageCount} Bild{previewImageCount === 1 ? '' : 'er'} in der Vorschau
              </Typography>
            </Paper>

            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, color: '#5d4037' }}>
              So sieht die Unterseite aus (Scrapbook-Layout)
            </Typography>
            <Box sx={{ width: '100%', maxWidth: '100%' }}>
              <StorySitePageBlock page={previewPage ?? activePage} />
            </Box>
          </Box>
        </Box>
      </Box>

      {site && activePage ? (
        <ErasmusDayPhotoPickerDialog
          open={photoPickerOpen}
          onClose={() => {
            setPhotoPickerOpen(false);
            setPendingFolderFiles(null);
          }}
          siteId={site.id}
          pageDateStr={activePage.dateStr}
          pendingFolderFiles={pendingFolderFiles}
          onPendingFolderFilesHandled={clearPendingFolderFiles}
          onImported={handleImportedGalleryUrls}
          onPageDateFromExif={(iso) => {
            if (!site || !activePageId) return;
            updateActivePage({ dateStr: formatIsoDateDe(iso) });
          }}
        />
      ) : null}

      <Snackbar open={!!toast} autoHideDuration={3200} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={toastSeverity} onClose={() => setToast(null)} sx={{ width: '100%' }}>
          {toast}
        </Alert>
      </Snackbar>

      <style>{`
        @media print {
          .no-print { display: none !important; }
        }
      `}</style>
    </Box>
  );
}
