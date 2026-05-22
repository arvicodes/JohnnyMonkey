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
  ListItem,
  ListItemButton,
  ListItemText,
  ListSubheader,
  Divider,
  useMediaQuery,
  useTheme,
  Paper,
  Chip,
  FormControlLabel,
  Checkbox,
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
  DragIndicator as DragIndicatorIcon,
} from '@mui/icons-material';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { RichTextEditor, type RichTextEditorHandle } from '../components/ui/rich-text-editor';
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
import { fileToStoryImageDataUrl } from '../lib/storyImageUtils';
import { isLikelyStoryMediaFile, isLikelyVideoFile, isStoryVideoSrc } from '../lib/storyMediaUtils';
import { rotateStoryGalleryImage90 } from '../lib/storyImageEnhance';
import { importPhotoFilesUpload } from '../lib/storySitePhotoImport';
import {
  formatIsoDateDe,
  formatStoryPageDateWithWeekday,
  parseStoryPageDate,
  commitStoryPageDateInput,
} from '../lib/storyPageDate';
import { normalizeStoryBodyHtml } from '../lib/storyBodyHtml';
import { STORY_BEIGE, STORY_THEMATIC_ROW_BG, STORY_THEMATIC_ROW_BG_HOVER } from '../lib/storyPageLayout';
import {
  type StorySite,
  type StoryPage,
  getSiteById,
  upsertSite,
  persistSite,
  deleteSiteById,
  ensureStorySitesStorageReady,
  writePreviewSnapshot,
  fetchSiteHydratedFromServer,
  mergeSiteForEditor,
  clearPreviewSnapshot,
  addPageToSite,
  removePageFromSite,
  movePage,
  reorderPagesInGroup,
  normalizeStoryPageOrder,
  partitionStoryPages,
  isStoryDayPageTitle,
  updatePage,
} from '../lib/storySitesStorage';

type SortableStoryPageItemProps = {
  page: StoryPage;
  index: number;
  selected: boolean;
  thematic: boolean;
  secondary: React.ReactNode;
  onSelect: () => void;
};

function SortableStoryPageItem({
  page,
  index,
  selected,
  thematic,
  secondary,
  onSelect,
}: SortableStoryPageItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: page.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <ListItem
      ref={setNodeRef}
      style={style}
      disablePadding
      dense
      sx={{
        display: 'flex',
        alignItems: 'stretch',
        bgcolor: isDragging
          ? 'action.hover'
          : thematic
            ? STORY_THEMATIC_ROW_BG
            : 'transparent',
        boxShadow: isDragging ? 2 : 'none',
        position: 'relative',
        zIndex: isDragging ? 1 : 0,
      }}
    >
      <Tooltip title="Reihenfolge ändern">
        <Box
          component="span"
          {...attributes}
          {...listeners}
          aria-label={`Tag ${index + 1} verschieben`}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            alignSelf: 'stretch',
            px: 0.5,
            color: 'text.disabled',
            cursor: 'grab',
            touchAction: 'none',
            '&:active': { cursor: 'grabbing' },
            '&:hover': { color: 'text.secondary' },
          }}
        >
          <DragIndicatorIcon sx={{ fontSize: 18 }} />
        </Box>
      </Tooltip>
      <ListItemButton
        selected={selected}
        onClick={onSelect}
        sx={{
          flex: 1,
          minWidth: 0,
          py: 0.85,
          px: 1,
          borderRadius: 0,
          alignItems: 'flex-start',
          ...(thematic && {
            '&:hover': { bgcolor: STORY_THEMATIC_ROW_BG_HOVER },
          }),
        }}
      >
        <ListItemText
          primary={page.title || `Seite ${index + 1}`}
          secondary={secondary}
          primaryTypographyProps={{ fontWeight: 700 }}
          secondaryTypographyProps={{ component: 'div', sx: { mt: 0.25 } }}
          sx={{ m: 0 }}
        />
      </ListItemButton>
    </ListItem>
  );
}

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
  const [galleryRotatingIndex, setGalleryRotatingIndex] = useState<number | null>(null);
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
      const loaded = server ? mergeSiteForEditor(local, server) : local;
      if (server) clearPreviewSnapshot(siteId);
      try {
        await upsertSite(loaded);
      } catch {
        /* Anzeige trotzdem mit Server-Daten */
      }
      setSite(normalizeStoryPageOrder(loaded));
      setActivePageId((prev) => {
        if (prev && loaded.pages.some((p) => p.id === prev)) return prev;
        return loaded.pages[0]?.id ?? null;
      });
      if (!server && !cancelled) {
        setToastSeverity('warning');
        setToast('Server nicht erreichbar — Galerie evtl. nur lokal. npm run dev starten.');
      }
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
      const normalized = normalizeStoryPageOrder(next);
      setSite(normalized);
      scheduleSave(normalized);
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

  const activeThematicPage = useMemo(
    () => (activePage && !isStoryDayPageTitle(activePage.title) ? activePage : null),
    [activePage],
  );

  const activePageFullWidth = !!activeThematicPage?.fullWidth;

  const pagePartitions = useMemo(
    () => (site ? partitionStoryPages(site.pages) : { thematic: [] as StoryPage[], days: [] as StoryPage[] }),
    [site],
  );

  const activePageMove = useMemo(() => {
    if (!activePageId) return { canUp: false, canDown: false };
    const inThematic = pagePartitions.thematic.some((p) => p.id === activePageId);
    const list = inThematic ? pagePartitions.thematic : pagePartitions.days;
    const idx = list.findIndex((p) => p.id === activePageId);
    return { canUp: idx > 0, canDown: idx >= 0 && idx < list.length - 1 };
  }, [activePageId, pagePartitions]);

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
    return updatePage(site, activePageId, { bodyHtml: normalizeStoryBodyHtml(liveHtml) });
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
      const files = Array.from(fileList).filter(isLikelyStoryMediaFile);
      if (!files.length) {
        setToast('Keine gültigen Bild- oder Videodateien erkannt.');
        return;
      }
      void (async () => {
        setGalleryBusy(true);
        const added: string[] = [];
        const current = siteRef.current;
        const page = current?.pages.find((p) => p.id === activePageId);
        const pageDateStr = page?.dateStr ?? '';
        const siteId = current?.id;
        for (const file of files) {
          try {
            if (siteId) {
              const urls = await importPhotoFilesUpload(siteId, pageDateStr, [file]);
              if (urls[0]) {
                added.push(urls[0]);
                continue;
              }
            }
            if (!isLikelyVideoFile(file)) {
              const url = await fileToStoryImageDataUrl(file);
              if (url) added.push(url);
            }
          } catch {
            /* einzelne Datei überspringen */
          }
        }
        setGalleryBusy(false);
        if (!added.length) {
          setToast(
            'Medien konnten nicht verarbeitet werden (Bilder/HEIC/MOV — ggf. erneut versuchen oder Website speichern).',
          );
          return;
        }
        if (!current) return;
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

  const moveGalleryImage = (index: number, direction: -1 | 1) => {
    if (!activePage) return;
    const list = activePage.galleryImages ?? [];
    const next = index + direction;
    if (next < 0 || next >= list.length) return;
    const galleryImages = [...list];
    [galleryImages[index], galleryImages[next]] = [galleryImages[next], galleryImages[index]];
    updateActivePage({ galleryImages, heroImage: galleryImages[0] ?? '' });
  };

  const rotateGalleryImage = useCallback(
    (index: number) => {
      if (!site || !activePageId) return;
      const raw = activePage?.galleryImages?.[index];
      const src = raw?.split('?')[0]?.trim() ?? '';
      if (!src) return;
      if (isStoryVideoSrc(src)) {
        showToast('Videos können nicht gedreht werden.', 'warning');
        return;
      }
      void (async () => {
        setGalleryRotatingIndex(index);
        try {
          const newSrc = await rotateStoryGalleryImage90(site.id, src);
          const current = siteRef.current;
          const page = current?.pages.find((p) => p.id === activePageId);
          if (!current || !page) return;
          const galleryImages = [...page.galleryImages];
          galleryImages[index] = newSrc;
          patchSite(
            updatePage(current, activePageId, {
              galleryImages,
              heroImage: galleryImages[0] ?? '',
            }),
          );
        } catch (e) {
          showToast(e instanceof Error ? e.message : 'Drehen fehlgeschlagen', 'warning');
        } finally {
          setGalleryRotatingIndex(null);
        }
      })();
    },
    [site, activePageId, activePage?.galleryImages, patchSite, showToast],
  );

  const pageImageCount = useMemo(() => {
    if (!activePage) return 0;
    const liveHtml = bodyEditorRef.current?.getHtml();
    const bodyHtml =
      liveHtml != null && liveHtml !== activePage.bodyHtml ? liveHtml : activePage.bodyHtml;
    return collectPageImages(normalizePageForPreview({ ...activePage, bodyHtml })).length;
  }, [activePage]);

  const pageListMetaLine = (p: StoryPage, idx: number) => {
    const parts: string[] = [];
    if (p.dateStr?.trim()) {
      const withWeekday = formatStoryPageDateWithWeekday(p.dateStr);
      parts.push(withWeekday || p.dateStr.trim());
    }
    if (p.location?.trim()) parts.push(p.location.trim());
    return parts.length ? parts.join(' · ') : `${idx + 1}. Unterseite`;
  };

  const pageListDetailSx = {
    display: 'block',
    fontSize: '0.6rem',
    lineHeight: 1.35,
    fontStyle: 'italic' as const,
    whiteSpace: 'normal' as const,
    wordBreak: 'break-word' as const,
  };

  const pageListSecondary = (p: StoryPage, idx: number) => {
    const meta = pageListMetaLine(p, idx);
    const subtitle = p.subtitle?.trim();
    return (
      <Box component="span" sx={{ display: 'block', lineHeight: 1.28, minWidth: 0, mt: 0.15 }}>
        {subtitle ? (
          <Box
            component="span"
            sx={{
              ...pageListDetailSx,
              fontSize: '0.72rem',
              color: '#1565c0',
              mb: 0.1,
            }}
          >
            {subtitle}
          </Box>
        ) : null}
        <Box
          component="span"
          sx={{
            ...pageListDetailSx,
            color: '#8d6e63',
          }}
        >
          {meta}
        </Box>
      </Box>
    );
  };

  const pageChipLabel = (p: StoryPage, idx: number) => {
    const title = p.title?.trim() || `Seite ${idx + 1}`;
    const meta = pageListMetaLine(p, idx);
    const extras: string[] = [];
    if (p.subtitle?.trim()) extras.push(p.subtitle.trim());
    if (meta !== `${idx + 1}. Unterseite`) extras.push(meta);
    if (!extras.length) return title;
    return `${title} — ${extras.join(' · ')}`;
  };

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

  const pageSortSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handlePageDragEnd = (event: DragEndEvent) => {
    if (!site) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const { thematic, days } = partitionStoryPages(site.pages);
    const thematicIds = new Set(thematic.map((p) => p.id));
    const activeId = String(active.id);
    const overId = String(over.id);
    const group: 'thematic' | 'days' = thematicIds.has(activeId) ? 'thematic' : 'days';
    if (group === 'thematic' && !thematicIds.has(overId)) return;
    if (group === 'days' && thematicIds.has(overId)) return;
    patchSite(reorderPagesInGroup(site, group, activeId, overId));
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
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: STORY_BEIGE.page,
        }}
      >
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
        position: isMd ? 'sticky' : 'static',
        top: isMd ? 88 : undefined,
      }}
    >
      <Box
        sx={{
          px: 1.5,
          py: 1,
          bgcolor: STORY_BEIGE.panel,
          borderBottom: '1px solid',
          borderColor: 'rgba(141, 110, 99, 0.25)',
        }}
      >
        <Typography variant="caption" fontWeight={800} color="text.secondary">
          Unterseiten
        </Typography>
      </Box>
      <DndContext sensors={pageSortSensors} collisionDetection={closestCenter} onDragEnd={handlePageDragEnd}>
        <List dense disablePadding>
          {pagePartitions.thematic.length > 0 ? (
            <SortableContext
              items={pagePartitions.thematic.map((p) => p.id)}
              strategy={verticalListSortingStrategy}
            >
              {pagePartitions.thematic.map((p, idx) => (
                <SortableStoryPageItem
                  key={p.id}
                  page={p}
                  index={idx}
                  thematic
                  selected={p.id === activePageId}
                  secondary={pageListSecondary(p, idx)}
                  onSelect={() => {
                    setActivePageId(p.id);
                    setMobileNavOpen(false);
                  }}
                />
              ))}
            </SortableContext>
          ) : null}
          {pagePartitions.thematic.length > 0 && pagePartitions.days.length > 0 ? (
            <ListSubheader
              component="div"
              disableSticky
              sx={{
                lineHeight: 1.3,
                py: 1,
                mt: 0.5,
                bgcolor: STORY_BEIGE.panel,
                borderTop: '1px solid rgba(141, 110, 99, 0.28)',
                color: '#8d6e63',
                fontWeight: 800,
                fontSize: '0.68rem',
              }}
            >
              Tage
            </ListSubheader>
          ) : null}
          {pagePartitions.days.length > 0 ? (
            <SortableContext items={pagePartitions.days.map((p) => p.id)} strategy={verticalListSortingStrategy}>
              {pagePartitions.days.map((p, idx) => (
                <SortableStoryPageItem
                  key={p.id}
                  page={p}
                  index={idx}
                  thematic={false}
                  selected={p.id === activePageId}
                  secondary={pageListSecondary(p, idx)}
                  onSelect={() => {
                    setActivePageId(p.id);
                    setMobileNavOpen(false);
                  }}
                />
              ))}
            </SortableContext>
          ) : null}
        </List>
      </DndContext>
      <Divider />
      <Box sx={{ p: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Button size="small" startIcon={<AddIcon />} onClick={handleAddPage} fullWidth variant="outlined">
          Unterseite hinzufügen
        </Button>
        <Stack direction="row" spacing={0.5} justifyContent="center">
          <Tooltip title="Nach oben">
            <span>
              <IconButton size="small" onClick={() => handleMove(-1)} disabled={!activePageMove.canUp}>
                <KeyboardArrowUpIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Nach unten">
            <span>
              <IconButton
                size="small"
                onClick={() => handleMove(1)}
                disabled={!activePageMove.canDown}
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
    <Box sx={{ minHeight: '100vh', bgcolor: STORY_BEIGE.page }}>
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
        {!activePageFullWidth ? (
          <Tooltip title="Galerie">
            <IconButton
              size="small"
              onClick={() => galleryRef.current?.pickFiles()}
              aria-label="Galerie"
              sx={storyToolbarIconBtnSx}
            >
              <ImageIcon />
            </IconButton>
          </Tooltip>
        ) : null}
        {!activePageFullWidth && (activePage.galleryImages?.length ?? 0) > 0 ? (
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
            <Stack
              direction="row"
              spacing={0.75}
              useFlexGap
              sx={{ flexWrap: 'wrap', width: '100%', maxWidth: '100%' }}
            >
              {pagePartitions.thematic.map((p, idx) => (
                <Chip
                  key={p.id}
                  size="small"
                  label={pageChipLabel(p, idx)}
                  onClick={() => setActivePageId(p.id)}
                  color={p.id === activePageId ? 'primary' : 'default'}
                  variant={p.id === activePageId ? 'filled' : 'outlined'}
                  sx={{
                    fontWeight: 700,
                    bgcolor: p.id === activePageId ? undefined : STORY_THEMATIC_ROW_BG,
                    borderColor: 'rgba(92, 107, 192, 0.35)',
                  }}
                />
              ))}
              {pagePartitions.thematic.length > 0 && pagePartitions.days.length > 0 ? (
                <Box sx={{ flexBasis: '100%', width: 0, height: 0 }} aria-hidden />
              ) : null}
              {pagePartitions.days.map((p, idx) => (
                <Chip
                  key={p.id}
                  size="small"
                  label={pageChipLabel(p, idx)}
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
                bgcolor: STORY_BEIGE.cream,
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
                  onChange={(e) => {
                    const title = e.target.value;
                    const patch: Partial<StoryPage> = { title };
                    if (isStoryDayPageTitle(title)) patch.fullWidth = false;
                    updateActivePage(patch);
                  }}
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
                    value={
                      activePage.dateStr?.trim() && parseStoryPageDate(activePage.dateStr)
                        ? formatStoryPageDateWithWeekday(activePage.dateStr)
                        : activePage.dateStr
                    }
                    onChange={(e) =>
                      updateActivePage({ dateStr: commitStoryPageDateInput(e.target.value) })
                    }
                    placeholder="z. B. Mo., 4. Mai 2026"
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
              {activeThematicPage ? (
                <FormControlLabel
                  sx={{ mb: 1.5, ml: 0, alignItems: 'flex-start' }}
                  control={
                    <Checkbox
                      size="small"
                      checked={!!activeThematicPage.fullWidth}
                      onChange={(e) => updateActivePage({ fullWidth: e.target.checked })}
                      sx={{ pt: 0.35 }}
                    />
                  }
                  label={
                    <Typography variant="body2" component="span" sx={{ color: '#5d4037' }}>
                      Volle Breite (keine Bilder rechts in der Vorschau)
                    </Typography>
                  }
                />
              ) : null}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: activePageFullWidth
                    ? '1fr'
                    : { xs: '1fr', md: 'minmax(0, 1fr) minmax(200px, 280px)' },
                  gap: 1.5,
                  alignItems: 'stretch',
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                    Text (Strg+V aus Word — nur Text, keine Bilder). Farbige Kästchen: Schnipsel einfügen; Zettel im Text ziehen zum Verschieben.
                  </Typography>
                  <RichTextEditor
                    key={activePageId}
                    ref={bodyEditorRef}
                    value={activePage.bodyHtml}
                    onChange={(html) => updateActivePage({ bodyHtml: normalizeStoryBodyHtml(html) })}
                    placeholder="Dein Bericht …"
                    rows={14}
                    imageStorage="dataUrl"
                    allowPasteImages={false}
                    showImageToolbar={false}
                    defaultTextAlign="justify"
                    enableStorySnippets
                    showLessonMarkup={false}
                  />
                </Box>
                {!activePageFullWidth ? (
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 1.25,
                      bgcolor: STORY_BEIGE.panel,
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
                      onMoveAt={moveGalleryImage}
                      onRotateAt={rotateGalleryImage}
                      rotatingIndex={galleryRotatingIndex}
                      onClear={clearGalleryImages}
                      processing={galleryBusy || galleryRotatingIndex !== null}
                      onPickFromFolder={() => setPhotoPickerOpen(true)}
                      onImportFolder={handleImportFolderFiles}
                    />
                  </Paper>
                ) : null}
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Änderungen werden automatisch gespeichert · Speichern-Button oben oder Strg+S für sofortiges Speichern
                {!activePageFullWidth ? (
                  <>
                    {' · '}
                    {pageImageCount} Bild{pageImageCount === 1 ? '' : 'er'} auf dieser Seite
                  </>
                ) : null}
              </Typography>
            </Paper>
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
