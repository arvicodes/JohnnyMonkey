import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, IconButton, Tooltip, Button, CircularProgress } from '@mui/material';
import { ArrowBack as ArrowBackIcon, WbSunny as WbSunnyIcon, LockOpen as LockOpenIcon } from '@mui/icons-material';
import {
  loadSites,
  ensureStorySitesStorageReady,
  writePreviewSnapshot,
  persistSite,
  getSiteById,
  deleteSiteById,
  syncSitesFromServer,
  STORY_SITES_UPDATED_EVENT,
  type StorySite,
} from '../lib/storySitesStorage';
import {
  filterSitesForDisplay,
  isUrlaubCategoryUnlocked,
  lockUrlaubCategory,
} from '../lib/storySiteCategories';
import { StoryCompactToolbar, storyToolbarIconBtnSx } from '../components/story-site/StoryCompactToolbar';
import { StoriesDiariesSeasonTimeline } from '../components/story-site/StoriesDiariesSeasonTimeline';
import { UrlaubUnlockDialog } from '../components/story-site/UrlaubUnlockDialog';
import { STORY_BEIGE, STORY_SCRAPBOOK_BG } from '../lib/storyPageLayout';

export default function StoriesDiariesOverviewPage() {
  const navigate = useNavigate();
  const [sites, setSites] = useState<StorySite[] | null>(null);
  const [urlaubUnlocked, setUrlaubUnlocked] = useState(isUrlaubCategoryUnlocked());
  const [unlockOpen, setUnlockOpen] = useState(false);

  const refresh = () => setSites(loadSites());

  useEffect(() => {
    let cancelled = false;
    void ensureStorySitesStorageReady().then(async () => {
      await syncSitesFromServer();
      if (!cancelled) refresh();
    });
    const onUpdated = () => refresh();
    window.addEventListener(STORY_SITES_UPDATED_EVENT, onUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener(STORY_SITES_UPDATED_EVENT, onUpdated);
    };
  }, []);

  const hiddenUrlaubCount = useMemo(() => {
    if (!sites || urlaubUnlocked) return 0;
    return sites.filter((s) => s.category === 'urlaub').length;
  }, [sites, urlaubUnlocked]);

  const visibleSites = useMemo(
    () => (sites ? filterSitesForDisplay(sites, urlaubUnlocked) : []),
    [sites, urlaubUnlocked],
  );

  const openSiteOverview = async (siteId: string) => {
    const local = getSiteById(siteId);
    if (local) {
      writePreviewSnapshot(local);
      await persistSite(local);
    }
    navigate(`/stories-tagebuecher/site/${siteId}/page`);
  };

  const handleDeleteSite = async (siteId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    const site = getSiteById(siteId);
    if (!site) return;
    if (!window.confirm(`Website „${site.name}“ und alle Unterseiten wirklich löschen?`)) return;
    await deleteSiteById(siteId);
    try {
      await fetch(`/api/story-sites/${encodeURIComponent(siteId)}`, { method: 'DELETE' });
    } catch {
      /* ignore */
    }
    refresh();
  };

  const openPreview = async (siteId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    const local = getSiteById(siteId);
    if (local) {
      writePreviewSnapshot(local);
      await persistSite(local);
    }
    window.open(`/stories-tagebuecher/site/${siteId}/vorschau`, '_blank', 'noopener,noreferrer');
  };

  if (sites === null) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: STORY_BEIGE.page }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: STORY_BEIGE.page }}>
      <StoryCompactToolbar>
        <Tooltip title="Zurück">
          <IconButton size="small" onClick={() => navigate('/stories-tagebuecher')} sx={storyToolbarIconBtnSx}>
            <ArrowBackIcon />
          </IconButton>
        </Tooltip>
        <WbSunnyIcon sx={{ fontSize: 20, color: '#f57f17' }} />
        <Typography noWrap sx={{ flex: 1, fontWeight: 700, fontSize: '0.8125rem', color: '#4e342e' }}>
          Stories · PAGE
        </Typography>
        {!urlaubUnlocked ? (
          <IconButton size="small" onClick={() => setUnlockOpen(true)} sx={{ ...(storyToolbarIconBtnSx as object), color: '#00897b' }}>
            <LockOpenIcon sx={{ fontSize: 16 }} />
          </IconButton>
        ) : (
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
        )}
      </StoryCompactToolbar>

      <Box sx={{ width: '100%', py: 2 }}>
        <Box
          sx={{
            width: '100vw',
            maxWidth: '100vw',
            ml: 'calc(50% - 50vw)',
            background: STORY_SCRAPBOOK_BG,
            borderTop: '1px solid rgba(93, 64, 55, 0.08)',
            borderBottom: '1px solid rgba(93, 64, 55, 0.08)',
            py: { xs: 1.5, sm: 2 },
            boxShadow: '0 16px 40px rgba(93, 64, 55, 0.1)',
          }}
        >
          <StoriesDiariesSeasonTimeline
            sites={visibleSites}
            editable
            urlaubUnlocked={urlaubUnlocked}
            hiddenUrlaubCount={hiddenUrlaubCount}
            onOpenSite={(id) => void openSiteOverview(id)}
            onOpenPreview={(id, e) => void openPreview(id, e)}
            onOpenEditor={(id) => navigate(`/stories-tagebuecher/site/${id}`)}
            onDeleteSite={(id, e) => void handleDeleteSite(id, e)}
            onRequestUrlaubUnlock={() => setUnlockOpen(true)}
          />
          <Box sx={{ textAlign: 'center', mt: 2, px: 2 }}>
            <Button size="small" variant="outlined" onClick={() => navigate('/stories-tagebuecher')} sx={{ textTransform: 'none' }}>
              Zur Verwaltung
            </Button>
          </Box>
        </Box>
      </Box>

      <UrlaubUnlockDialog open={unlockOpen} onClose={() => setUnlockOpen(false)} onUnlocked={() => setUrlaubUnlocked(true)} />
    </Box>
  );
}
