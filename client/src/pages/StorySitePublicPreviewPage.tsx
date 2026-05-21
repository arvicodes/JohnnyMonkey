import React, { useEffect, useState, useRef } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { Box, Typography, CircularProgress, Button, Stack } from '@mui/material';
import {
  loadSiteForPreview,
  STORY_SITES_UPDATED_EVENT,
  type StorySite,
} from '../lib/storySitesStorage';
import { StorySitePreviewBody } from '../components/story-site/StorySitePreviewBody';
import { storyPreviewViewportSx, STORY_BEIGE } from '../lib/storyPageLayout';

export default function StorySitePublicPreviewPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const [site, setSite] = useState<StorySite | null | undefined>(undefined);
  const [loadError, setLoadError] = useState(false);

  const reload = async () => {
    if (!siteId) {
      setSite(null);
      return;
    }
    setLoadError(false);
    const loaded = await loadSiteForPreview(siteId);
    setSite(loaded);
    if (!loaded) setLoadError(true);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!siteId) {
        if (!cancelled) setSite(null);
        return;
      }
      const loaded = await loadSiteForPreview(siteId);
      if (cancelled) return;
      setSite(loaded);
      if (!loaded) setLoadError(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [siteId]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'johnnyMonkey_storySites_v1') void reload();
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') void reload();
    };
    const onUpdated = () => void reload();
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener(STORY_SITES_UPDATED_EVENT, onUpdated);
    return () => {
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener(STORY_SITES_UPDATED_EVENT, onUpdated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  const titleRestore = useRef<string | null>(null);
  useEffect(() => {
    if (site && site.name) {
      if (titleRestore.current === null) titleRestore.current = document.title;
      document.title = site.name;
    }
    return () => {
      if (titleRestore.current !== null) document.title = titleRestore.current;
    };
  }, [site]);

  if (site === undefined) {
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

  if (!site) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: STORY_BEIGE.page,
          px: 2,
        }}
      >
        <Stack spacing={2} alignItems="center" sx={{ maxWidth: 420, textAlign: 'center' }}>
          <Typography color="text.secondary">
            {loadError
              ? 'Diese Website konnte nicht geladen werden. Bitte im Builder speichern und die Vorschau erneut öffnen — oder zuerst „Website bearbeiten“ aufrufen.'
              : 'Keine Website-ID in der Adresse.'}
          </Typography>
          <Button component={RouterLink} to="/stories-tagebuecher" variant="contained" sx={{ textTransform: 'none' }}>
            Zur Übersicht
          </Button>
          {siteId ? (
            <Button component={RouterLink} to={`/stories-tagebuecher/site/${siteId}`} variant="outlined" sx={{ textTransform: 'none' }}>
              Website bearbeiten
            </Button>
          ) : null}
        </Stack>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: STORY_BEIGE.page,
        py: { xs: 1, sm: 2 },
        px: 0,
        width: '100%',
      }}
    >
      <Box sx={storyPreviewViewportSx}>
        <StorySitePreviewBody site={site} />
      </Box>
    </Box>
  );
}
