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
import {
  STORY_BEIGE,
  STORY_TIMELINE_MAX_WIDTH,
  STORIES_HUB_PATH,
  STORIES_PAGE_OVERVIEW_PATH,
  rememberStoriesPreviewReturnTo,
  storyTimelineShellSx,
} from '../lib/storyPageLayout';

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

  const visibleSites = useMemo(
    () => (sites ? filterSitesForDisplay(sites, urlaubUnlocked) : []),
    [sites, urlaubUnlocked],
  );

  const openSitePreview = async (siteId: string) => {
    const local = getSiteById(siteId);
    if (local) {
      writePreviewSnapshot(local);
      await persistSite(local);
    }
    rememberStoriesPreviewReturnTo(STORIES_PAGE_OVERVIEW_PATH);
    navigate(`/stories-tagebuecher/site/${siteId}/vorschau`, {
      state: { returnTo: STORIES_PAGE_OVERVIEW_PATH },
    });
  };

  if (sites === null) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: STORY_BEIGE.page }}>
        <CircularProgress />
      </Box>
    );
  }

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
          <Tooltip title="Zurück zur Verwaltung">
            <IconButton size="small" onClick={() => navigate(STORIES_HUB_PATH)} sx={storyToolbarIconBtnSx}>
              <ArrowBackIcon />
            </IconButton>
          </Tooltip>
          <WbSunnyIcon sx={{ fontSize: 20, color: '#f57f17' }} />
          <Typography noWrap sx={{ flex: '1 1 auto', minWidth: 0, fontWeight: 700, fontSize: '0.8125rem', color: '#4e342e' }}>
            Stories · PAGE
          </Typography>
          <Box sx={{ flex: '1 1 0', minWidth: 8 }} />
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

        <Box sx={{ px: { xs: 0.5, sm: 0.75 }, py: { xs: 1.25, sm: 1.5 } }}>
          <StoriesDiariesSeasonTimeline
            sites={visibleSites}
            onOpenSite={(id) => void openSitePreview(id)}
          />
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Button size="small" variant="outlined" onClick={() => navigate(STORIES_HUB_PATH)} sx={{ textTransform: 'none' }}>
              Zur Verwaltung
            </Button>
          </Box>
        </Box>
      </Box>

      <UrlaubUnlockDialog open={unlockOpen} onClose={() => setUnlockOpen(false)} onUnlocked={() => setUrlaubUnlocked(true)} />
    </Box>
  );
}
