import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Refresh as RefreshIcon,
  RestartAlt as RestartAltIcon,
  OpenInNew as OpenInNewIcon,
  Close as CloseIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  MoreHoriz as MoreHorizIcon,
} from '@mui/icons-material';
import { WallOfFameBoard } from '../components/wall-of-fame/WallOfFameBoard';
import { WallOfFameCategoryBar } from '../components/wall-of-fame/WallOfFameCategoryBar';
import { WallOfFamePhoto } from '../components/wall-of-fame/WallOfFamePhoto';
import {
  buildViewKey,
  createDefaultSettings,
  fetchWallOfFameImages,
  getOrderedVisibleImages,
  loadSavedSettings,
  mergeSettings,
  orderCategories,
  saveSettings,
  wallOfFameImageUrl,
  type WallOfFameCategory,
  type WallOfFameImage,
  type WallOfFameSettings,
} from '../lib/wallOfFame';
import {
  wallCategoryChipSx,
  wallLightboxCloseBtnSx,
  wallLightboxCounterSx,
  wallLightboxNavStripSx,
  wallOfFamePalette,
  wallToolbarIconBtnSx,
} from '../lib/wallOfFameUi';

export default function WallOfFamePage() {
  const navigate = useNavigate();
  const [images, setImages] = useState<WallOfFameImage[]>([]);
  const [rawCategories, setRawCategories] = useState<WallOfFameCategory[]>([]);
  const [settings, setSettings] = useState<WallOfFameSettings>(createDefaultSettings([]));
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set());
  const [pinnedCategory, setPinnedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const categories = useMemo(
    () => orderCategories(rawCategories, settings),
    [rawCategories, settings],
  );

  const visibleImages = useMemo(
    () => getOrderedVisibleImages(images, activeCategories, pinnedCategory, settings),
    [images, activeCategories, pinnedCategory, settings],
  );

  const allActive = activeCategories.size === categories.length && categories.length > 0;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWallOfFameImages();
      setImages(data.images);
      setRawCategories(data.categories);
      const saved = loadSavedSettings();
      const merged = mergeSettings(data.categories, saved);
      setSettings(merged);
      setActiveCategories(new Set(merged.categoryOrder));
      setPinnedCategory(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Laden fehlgeschlagen.';
      setError(msg === 'Failed to fetch' ? 'Server nicht erreichbar — bitte App neu starten.' : msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleCategory = (name: string) => {
    if (pinnedCategory === name) setPinnedCategory(null);
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const focusCategory = (name: string) => {
    if (pinnedCategory === name) {
      setPinnedCategory(null);
      return;
    }
    if (!activeCategories.has(name)) {
      setActiveCategories((prev) => new Set(prev).add(name));
    }
    setPinnedCategory(name);
  };

  const resetImageOrder = () => {
    const viewKey = buildViewKey(activeCategories, pinnedCategory);
    const nextOrders = { ...settings.imageOrders };
    delete nextOrders[viewKey];
    const next = { ...settings, imageOrders: nextOrders };
    setSettings(next);
    saveSettings(next);
  };

  const resetAllSettings = () => {
    const next = createDefaultSettings(rawCategories);
    setSettings(next);
    saveSettings(next);
    setActiveCategories(new Set(next.categoryOrder));
    setPinnedCategory(null);
  };

  const openLightbox = (imageId: string) => {
    const idx = visibleImages.findIndex((img) => img.id === imageId);
    if (idx >= 0) setLightboxIndex(idx);
  };

  const lightboxImage = lightboxIndex !== null ? visibleImages[lightboxIndex] : null;
  const lightboxImageWithFullUrl = lightboxImage
    ? { ...lightboxImage, url: wallOfFameImageUrl(lightboxImage.path, 2000) }
    : null;

  const goLightboxPrev = useCallback(() => {
    if (lightboxIndex === null || visibleImages.length < 2) return;
    setLightboxIndex((lightboxIndex - 1 + visibleImages.length) % visibleImages.length);
  }, [lightboxIndex, visibleImages.length]);

  const goLightboxNext = useCallback(() => {
    if (lightboxIndex === null || visibleImages.length < 2) return;
    setLightboxIndex((lightboxIndex + 1) % visibleImages.length);
  }, [lightboxIndex, visibleImages.length]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowLeft') goLightboxPrev();
      if (e.key === 'ArrowRight') goLightboxNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIndex, goLightboxPrev, goLightboxNext]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        bgcolor: wallOfFamePalette.pageBg,
        m: 0,
        p: 0,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          px: 0.75,
          py: 0.25,
          minHeight: 32,
          bgcolor: wallOfFamePalette.toolbarBg,
          borderBottom: '1px solid',
          borderColor: wallOfFamePalette.border,
          flexShrink: 0,
        }}
      >
        <Tooltip title="Zurück">
          <IconButton size="small" onClick={() => navigate('/dashboard')} sx={wallToolbarIconBtnSx}>
            <ArrowBackIcon />
          </IconButton>
        </Tooltip>

        {categories.length > 0 && (
          <>
            <Chip
              label="Alle"
              size="small"
              onClick={() => {
                setPinnedCategory(null);
                setActiveCategories(
                  allActive ? new Set() : new Set(categories.map((c) => c.name)),
                );
              }}
              sx={{
                ...wallCategoryChipSx(allActive),
                height: 22,
                flexShrink: 0,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            />
            {pinnedCategory && (
              <Chip
                label="Übersicht"
                size="small"
                onClick={() => setPinnedCategory(null)}
                sx={{ ...wallCategoryChipSx(true), height: 22, flexShrink: 0, cursor: 'pointer' }}
              />
            )}
            <WallOfFameCategoryBar
              categories={categories}
              settings={settings}
              onSettingsChange={setSettings}
              activeCategories={activeCategories}
              pinnedCategory={pinnedCategory}
              onToggleCategory={toggleCategory}
              onFocusCategory={focusCategory}
            />
          </>
        )}

        {!loading && visibleImages.length > 0 && (
          <Typography
            sx={{
              fontSize: '0.65rem',
              color: wallOfFamePalette.textMuted,
              flexShrink: 0,
              whiteSpace: 'nowrap',
              px: 0.5,
            }}
          >
            {visibleImages.length} Fotos
          </Typography>
        )}

        <IconButton
          size="small"
          onClick={(e) => setMenuAnchor(e.currentTarget)}
          sx={wallToolbarIconBtnSx}
        >
          <MoreHorizIcon />
        </IconButton>
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={() => setMenuAnchor(null)}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <MenuItem
            disabled={loading}
            onClick={() => {
              setMenuAnchor(null);
              void load();
            }}
          >
            <ListItemIcon>
              <RefreshIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primaryTypographyProps={{ fontSize: '0.8rem' }}>Neu laden</ListItemText>
          </MenuItem>
          <MenuItem
            disabled={!visibleImages.length}
            onClick={() => {
              setMenuAnchor(null);
              resetImageOrder();
            }}
          >
            <ListItemIcon>
              <RestartAltIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primaryTypographyProps={{ fontSize: '0.8rem' }}>
              Bildanordnung zurücksetzen
            </ListItemText>
          </MenuItem>
          <MenuItem
            disabled={!categories.length}
            onClick={() => {
              setMenuAnchor(null);
              resetAllSettings();
            }}
          >
            <ListItemIcon>
              <RestartAltIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primaryTypographyProps={{ fontSize: '0.8rem' }}>
              Kategorien & Farben zurücksetzen
            </ListItemText>
          </MenuItem>
          <MenuItem
            onClick={() => {
              setMenuAnchor(null);
              window.open('/wall-of-fame', '_blank');
            }}
          >
            <ListItemIcon>
              <OpenInNewIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primaryTypographyProps={{ fontSize: '0.8rem' }}>Neuer Tab</ListItemText>
          </MenuItem>
        </Menu>
      </Box>

      {loading && (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress size={22} sx={{ color: wallOfFamePalette.accent }} />
        </Box>
      )}

      {!loading && error && (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', px: 2 }}>
          <Alert severity="error" sx={{ maxWidth: 480, borderRadius: 2 }}>
            {error}
          </Alert>
        </Box>
      )}

      {!loading && !error && images.length === 0 && (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="body2" sx={{ color: wallOfFamePalette.textMuted, fontSize: '0.85rem' }}>
            Noch keine Bilder in J-M-Reihen/Wall-of-fame/
          </Typography>
        </Box>
      )}

      {!loading && !error && images.length > 0 && (
        <WallOfFameBoard
          images={images}
          categories={categories}
          settings={settings}
          onSettingsChange={setSettings}
          activeCategories={activeCategories}
          pinnedCategory={pinnedCategory}
          onImageClick={openLightbox}
        />
      )}

      <Dialog
        open={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
        maxWidth={false}
        PaperProps={{
          sx: {
            bgcolor: '#ffffff',
            maxWidth: '100vw',
            maxHeight: '100vh',
            m: 0,
            borderRadius: 0,
            boxShadow: 'none',
          },
        }}
      >
        {lightboxImageWithFullUrl && lightboxIndex !== null && (
          <Box sx={{ position: 'relative', bgcolor: '#ffffff', minHeight: '100vh' }}>
            <IconButton
              onClick={() => setLightboxIndex(null)}
              aria-label="Schließen"
              size="small"
              sx={wallLightboxCloseBtnSx}
            >
              <CloseIcon />
            </IconButton>
            {visibleImages.length > 1 && (
              <>
                <Box
                  component="button"
                  type="button"
                  onClick={goLightboxPrev}
                  aria-label="Vorheriges Bild"
                  sx={{ ...wallLightboxNavStripSx, left: 0 }}
                >
                  <ChevronLeftIcon />
                </Box>
                <Box
                  component="button"
                  type="button"
                  onClick={goLightboxNext}
                  aria-label="Nächstes Bild"
                  sx={{ ...wallLightboxNavStripSx, right: 0 }}
                >
                  <ChevronRightIcon />
                </Box>
                <Box component="span" sx={wallLightboxCounterSx}>
                  {lightboxIndex + 1} / {visibleImages.length}
                </Box>
              </>
            )}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                px: 4,
                bgcolor: '#ffffff',
              }}
            >
              <WallOfFamePhoto
                image={lightboxImageWithFullUrl}
                isHovered={false}
                isDragging={false}
                size="full"
              />
            </Box>
          </Box>
        )}
      </Dialog>
    </Box>
  );
}
