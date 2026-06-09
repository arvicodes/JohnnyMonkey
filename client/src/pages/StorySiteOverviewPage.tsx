import React, { useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Button,
  CircularProgress,
  Stack,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import {
  loadSiteForPreview,
  STORY_SITES_UPDATED_EVENT,
  type StorySite,
} from '../lib/storySitesStorage';
import { StorySiteOverviewBody } from '../components/story-site/StorySiteOverviewBody';
import { StoryCompactToolbar, storyToolbarIconBtnSx } from '../components/story-site/StoryCompactToolbar';
import {
  storyPreviewViewportSx,
  STORY_BEIGE,
  STORIES_PAGE_OVERVIEW_PATH,
  rememberStoriesPreviewReturnTo,
  storySitePreviewPath,
} from '../lib/storyPageLayout';

export default function StorySiteOverviewPage() {
  const navigate = useNavigate();
  const { siteId } = useParams<{ siteId: string }>();
  const [site, setSite] = useState<StorySite | null | undefined>(undefined);

  const reload = async () => {
    if (!siteId) {
      setSite(null);
      return;
    }
    setSite(await loadSiteForPreview(siteId));
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!siteId) {
        if (!cancelled) setSite(null);
        return;
      }
      const loaded = await loadSiteForPreview(siteId);
      if (!cancelled) setSite(loaded);
    })();
    return () => {
      cancelled = true;
    };
  }, [siteId]);

  useEffect(() => {
    const onUpdated = () => void reload();
    window.addEventListener(STORY_SITES_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(STORY_SITES_UPDATED_EVENT, onUpdated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  const titleRestore = useRef<string | null>(null);
  useEffect(() => {
    if (site?.name) {
      if (titleRestore.current === null) titleRestore.current = document.title;
      document.title = `${site.name} · Übersicht`;
    }
    return () => {
      if (titleRestore.current !== null) document.title = titleRestore.current;
    };
  }, [site]);

  const openPagePreview = (pageId: string) => {
    if (!siteId) return;
    rememberStoriesPreviewReturnTo(STORIES_PAGE_OVERVIEW_PATH);
    navigate(storySitePreviewPath(siteId, pageId), {
      state: { returnTo: STORIES_PAGE_OVERVIEW_PATH },
    });
  };

  if (site === undefined) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: STORY_BEIGE.page }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!site || !siteId) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: STORY_BEIGE.page, px: 2 }}>
        <Stack spacing={2} alignItems="center">
          <Typography color="text.secondary">Website konnte nicht geladen werden.</Typography>
          <Button component={RouterLink} to={STORIES_PAGE_OVERVIEW_PATH} variant="contained" sx={{ textTransform: 'none' }}>
            Zur Übersicht
          </Button>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: STORY_BEIGE.page }}>
      <StoryCompactToolbar>
        <Tooltip title="Zurück zur Übersicht">
          <IconButton size="small" onClick={() => navigate(STORIES_PAGE_OVERVIEW_PATH)} sx={storyToolbarIconBtnSx}>
            <ArrowBackIcon />
          </IconButton>
        </Tooltip>
        <Typography noWrap sx={{ flex: 1, fontWeight: 700, fontSize: '0.8125rem', color: '#4e342e' }}>
          {site.name} · PAGE
        </Typography>
      </StoryCompactToolbar>
      <Box sx={{ py: { xs: 1, sm: 2 } }}>
        <Box sx={storyPreviewViewportSx}>
          <StorySiteOverviewBody site={site} onOpenPage={openPagePreview} />
        </Box>
      </Box>
    </Box>
  );
}
