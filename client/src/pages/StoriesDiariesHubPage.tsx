import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Card,
  CardActionArea,
  CardContent,
  Stack,
  Button,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  FormControl,
  Select,
  MenuItem,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  WbSunny as WbSunnyIcon,
  Add as AddIcon,
  DeleteOutline as DeleteOutlineIcon,
  Article as ArticleIcon,
  OpenInNew as OpenInNewIcon,
  LockOpen as LockOpenIcon,
  Timeline as TimelineIcon,
  ViewList as ViewListIcon,
} from '@mui/icons-material';
import {
  createEmptySite,
  loadSites,
  deleteSiteById,
  persistSite,
  getSiteById,
  ensureStorySitesStorageReady,
  writePreviewSnapshot,
  syncSitesFromServer,
  STORY_SITES_UPDATED_EVENT,
  type StorySite,
} from '../lib/storySitesStorage';
import type { StorySiteCategoryId } from '../lib/storySiteCategories';
import {
  STORY_SITE_CATEGORIES,
  filterSitesForDisplay,
  resolveStorySiteCategory,
  getStorySiteCategoryDef,
  isUrlaubCategoryUnlocked,
  lockUrlaubCategory,
} from '../lib/storySiteCategories';
import {
  StoryCompactToolbar,
  StoryToolbarDivider,
  storyToolbarIconBtnSx,
  storyToolbarToggleGroupSx,
} from '../components/story-site/StoryCompactToolbar';
import { StoriesDiariesSeasonTimeline } from '../components/story-site/StoriesDiariesSeasonTimeline';
import { UrlaubUnlockDialog } from '../components/story-site/UrlaubUnlockDialog';
import { STORY_BEIGE, STORY_TIMELINE_MAX_WIDTH, storyTimelineShellSx } from '../lib/storyPageLayout';

type ViewMode = 'timeline' | 'list';

export default function StoriesDiariesHubPage() {
  const navigate = useNavigate();
  const [sites, setSites] = useState<StorySite[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [urlaubUnlocked, setUrlaubUnlocked] = useState(isUrlaubCategoryUnlocked());
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = () => setSites(loadSites());

  useEffect(() => {
    let cancelled = false;
    void ensureStorySitesStorageReady().then(async () => {
      await syncSitesFromServer();
      if (!cancelled) {
        setSites(loadSites());
        setLoading(false);
      }
    });
    const onUpdated = () => refresh();
    window.addEventListener(STORY_SITES_UPDATED_EVENT, onUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener(STORY_SITES_UPDATED_EVENT, onUpdated);
    };
  }, []);

  const hiddenUrlaubCount = useMemo(() => {
    if (urlaubUnlocked) return 0;
    return sites.filter((s) => resolveStorySiteCategory(s) === 'urlaub').length;
  }, [sites, urlaubUnlocked]);

  const visibleSites = useMemo(
    () => filterSitesForDisplay(sites, urlaubUnlocked),
    [sites, urlaubUnlocked],
  );

  const sorted = useMemo(
    () => [...visibleSites].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)),
    [visibleSites],
  );

  const handleNewSite = async () => {
    const site = createEmptySite();
    await persistSite(site);
    refresh();
    navigate(`/stories-tagebuecher/site/${site.id}`);
  };

  const openSite = (id: string) => navigate(`/stories-tagebuecher/site/${id}`);

  const openPreview = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    const local = getSiteById(id);
    if (local) {
      writePreviewSnapshot(local);
      await persistSite(local);
    }
    window.open(`/stories-tagebuecher/site/${id}/vorschau`, '_blank', 'noopener,noreferrer');
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    if (!window.confirm('Diese Website und alle Unterseiten löschen?')) return;
    await deleteSiteById(id);
    try {
      await fetch(`/api/story-sites/${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch {
      /* ignore */
    }
    refresh();
  };

  const handleCategoryChange = async (siteId: string, category: StorySiteCategoryId) => {
    const site = getSiteById(siteId);
    if (!site) return;
    await persistSite({ ...site, category });
    refresh();
  };

  const openPageOverview = () => {
    if (visibleSites.length === 0 && hiddenUrlaubCount === 0) return;
    navigate('/stories-tagebuecher/page');
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return iso;
    }
  };

  const pageButtonSx = {
    flexShrink: 0,
    minWidth: 52,
    height: 28,
    px: 1.25,
    fontSize: '0.6875rem',
    fontWeight: 800,
    letterSpacing: '0.06em',
    textTransform: 'none' as const,
    borderRadius: 1,
    borderColor: 'rgba(230, 81, 0, 0.45)',
    color: '#e65100',
    bgcolor: 'rgba(255,255,255,0.65)',
    '&:hover': {
      borderColor: 'rgba(230, 81, 0, 0.65)',
      bgcolor: 'rgba(255,255,255,0.9)',
    },
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: STORY_BEIGE.page,
        py: { xs: 1.5, sm: 2 },
        px: { xs: 0.75, sm: 1 },
      }}
    >
      <Box sx={{ maxWidth: STORY_TIMELINE_MAX_WIDTH, mx: 'auto', width: '100%', ...storyTimelineShellSx }}>
        <StoryCompactToolbar embedded>
        <Tooltip title="Dashboard">
          <IconButton size="small" onClick={() => navigate('/dashboard')} sx={storyToolbarIconBtnSx}>
            <ArrowBackIcon />
          </IconButton>
        </Tooltip>
        <WbSunnyIcon sx={{ fontSize: 20, color: '#f57f17', flexShrink: 0 }} />
        <Typography noWrap sx={{ flex: '1 1 auto', minWidth: 0, fontWeight: 700, fontSize: '0.8125rem', color: '#4e342e' }}>
          Stories & Tagebücher
        </Typography>
        <Box sx={{ flex: '1 1 0', minWidth: 8 }} />
        <StoryToolbarDivider />
        {!urlaubUnlocked ? (
          <Tooltip title="Urlaub anzeigen">
            <IconButton size="small" onClick={() => setUnlockOpen(true)} sx={{ ...(storyToolbarIconBtnSx as object), color: '#00897b' }}>
              <LockOpenIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        ) : (
          <Tooltip title="Urlaub ausblenden">
            <IconButton
              size="small"
              onClick={() => {
                lockUrlaubCategory();
                setUrlaubUnlocked(false);
              }}
              sx={storyToolbarIconBtnSx}
            >
              <LockOpenIcon sx={{ fontSize: 16, color: '#00897b' }} />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="Neue Website">
          <IconButton size="small" onClick={() => void handleNewSite()} sx={{ ...(storyToolbarIconBtnSx as object), color: '#e65100' }}>
            <AddIcon />
          </IconButton>
        </Tooltip>
        <ToggleButtonGroup
          size="small"
          value={viewMode}
          exclusive
          onChange={(_, v: ViewMode | null) => v && setViewMode(v)}
          sx={storyToolbarToggleGroupSx}
        >
          <ToggleButton value="timeline" aria-label="Zeitstrahl">
            <TimelineIcon sx={{ fontSize: 16 }} />
          </ToggleButton>
          <ToggleButton value="list" aria-label="Liste">
            <ViewListIcon sx={{ fontSize: 16 }} />
          </ToggleButton>
        </ToggleButtonGroup>
        <Tooltip title="Übersichtsseite (PAGE)">
          <span>
            <Button size="small" variant="outlined" onClick={() => void openPageOverview()} disabled={sites.length === 0} sx={pageButtonSx}>
              PAGE
            </Button>
          </span>
        </Tooltip>
        </StoryCompactToolbar>

        <Box sx={{ px: { xs: 0.5, sm: 0.75 }, py: { xs: 1.25, sm: 1.5 } }}>
        {loading ? (
          <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            Websites werden geladen…
          </Typography>
        ) : sites.length === 0 ? (
          <Card elevation={0} sx={{ borderRadius: 3, border: '1px dashed', borderColor: 'divider', bgcolor: 'rgba(255,255,255,0.7)' }}>
            <CardContent sx={{ py: 4, textAlign: 'center' }}>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Noch keine Website. Tippe oben auf + für eine neue Website.
              </Typography>
              <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={() => void handleNewSite()} sx={{ textTransform: 'none' }}>
                Neue Website
              </Button>
            </CardContent>
          </Card>
        ) : viewMode === 'timeline' ? (
            <StoriesDiariesSeasonTimeline
              sites={visibleSites}
              editable
              onOpenSite={openSite}
              onOpenPreview={(id, e) => void openPreview(id, e)}
              onOpenEditor={openSite}
              onDeleteSite={(id, e) => void handleDelete(id, e)}
              onCategoryChange={(id, cat) => void handleCategoryChange(id, cat)}
            />
        ) : (
          <Stack spacing={1.5}>
            {sorted.map((site) => {
              const cat = getStorySiteCategoryDef(resolveStorySiteCategory(site));
              return (
                <Card
                  key={site.id}
                  elevation={0}
                  sx={{
                    borderRadius: 3,
                    border: '2px solid',
                    borderColor: cat.border,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'row',
                    bgcolor: cat.bg,
                  }}
                >
                  <Box sx={{ width: 5, bgcolor: cat.color, flexShrink: 0 }} />
                  <CardActionArea onClick={() => openSite(site.id)} sx={{ flex: 1 }}>
                    <CardContent sx={{ py: 2 }}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: cat.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                          <ArticleIcon />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 800, fontSize: '1.05rem' }} noWrap>
                            {site.name}
                          </Typography>
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                            <Chip size="small" label={cat.shortLabel} sx={{ height: 20, fontSize: '0.65rem', bgcolor: cat.color, color: '#fff' }} />
                            <Chip size="small" label={`${site.pages.length} Unterseiten`} />
                            <Typography variant="caption" color="text.secondary">
                              {formatDate(site.updatedAt)}
                            </Typography>
                          </Stack>
                        </Box>
                      </Stack>
                    </CardContent>
                  </CardActionArea>
                  <Stack direction="column" spacing={0.5} sx={{ px: 1, py: 1, borderLeft: '1px solid', borderColor: 'divider', bgcolor: 'rgba(255,255,255,0.5)' }}>
                    <FormControl size="small" sx={{ minWidth: 120 }} onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={site.category ?? resolveStorySiteCategory(site)}
                        onChange={(e) => void handleCategoryChange(site.id, e.target.value as StorySiteCategoryId)}
                        sx={{ height: 28, fontSize: '0.72rem' }}
                      >
                        {STORY_SITE_CATEGORIES.map((c) => (
                          <MenuItem key={c.id} value={c.id} sx={{ fontSize: '0.78rem' }}>
                            {c.shortLabel}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <Stack direction="row" spacing={0.25}>
                      <IconButton size="small" onClick={(e) => void openPreview(site.id, e)}>
                        <OpenInNewIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={(e) => void handleDelete(site.id, e)}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Stack>
                </Card>
              );
            })}
          </Stack>
        )}
        </Box>
      </Box>

      <UrlaubUnlockDialog open={unlockOpen} onClose={() => setUnlockOpen(false)} onUnlocked={() => setUrlaubUnlocked(true)} />
    </Box>
  );
}
