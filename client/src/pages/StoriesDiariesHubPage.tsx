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
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  WbSunny as WbSunnyIcon,
  Add as AddIcon,
  DeleteOutline as DeleteOutlineIcon,
  Article as ArticleIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import {
  createEmptySite,
  loadSites,
  deleteSiteById,
  persistSite,
  getSiteById,
  ensureStorySitesStorageReady,
  writePreviewSnapshot,
  STORY_SITES_UPDATED_EVENT,
  type StorySite,
} from '../lib/storySitesStorage';
import {
  StoryCompactToolbar,
  StoryToolbarDivider,
  storyToolbarIconBtnSx,
} from '../components/story-site/StoryCompactToolbar';

export default function StoriesDiariesHubPage() {
  const navigate = useNavigate();
  const [sites, setSites] = useState<StorySite[]>([]);

  const refresh = () => setSites(loadSites());

  useEffect(() => {
    let cancelled = false;
    void ensureStorySitesStorageReady().then(() => {
      if (!cancelled) {
        setSites(loadSites());
      }
    });
    const onUpdated = () => refresh();
    window.addEventListener(STORY_SITES_UPDATED_EVENT, onUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener(STORY_SITES_UPDATED_EVENT, onUpdated);
    };
  }, []);

  const handleNewSite = async () => {
    const site = createEmptySite();
    await persistSite(site);
    refresh();
    navigate(`/stories-tagebuecher/site/${site.id}`);
  };

  const openSite = (id: string) => {
    navigate(`/stories-tagebuecher/site/${id}`);
  };

  const openPreview = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const local = getSiteById(id);
    if (local) {
      writePreviewSnapshot(local);
      await persistSite(local);
    }
    window.open(`/stories-tagebuecher/site/${id}/vorschau`, '_blank', 'noopener,noreferrer');
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!window.confirm('Diese Website und alle Unterseiten löschen?')) return;
    await deleteSiteById(id);
    try {
      await fetch(`/api/story-sites/${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch {
      /* ignore */
    }
    refresh();
  };

  const sorted = useMemo(
    () => [...sites].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)),
    [sites]
  );

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return iso;
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#faf7f2' }}>
      <StoryCompactToolbar>
        <Tooltip title="Dashboard">
          <IconButton
            size="small"
            onClick={() => navigate('/dashboard')}
            aria-label="Zurück"
            sx={storyToolbarIconBtnSx}
          >
            <ArrowBackIcon />
          </IconButton>
        </Tooltip>
        <WbSunnyIcon sx={{ fontSize: 20, color: '#f57f17', flexShrink: 0 }} />
        <Typography
          component="h1"
          noWrap
          sx={{
            flex: '1 1 auto',
            minWidth: 0,
            fontWeight: 700,
            fontSize: '0.8125rem',
            color: '#4e342e',
            lineHeight: 1.2,
          }}
        >
          Stories & Websites
        </Typography>
        <StoryToolbarDivider />
        <Tooltip title="Neue Website">
          <IconButton
            size="small"
            onClick={() => void handleNewSite()}
            aria-label="Neu"
            sx={{ ...(storyToolbarIconBtnSx as object), color: '#e65100', borderColor: 'rgba(230,81,0,0.4)' }}
          >
            <AddIcon />
          </IconButton>
        </Tooltip>
      </StoryCompactToolbar>

      <Box sx={{ width: '100%', px: { xs: 1, sm: 1.5, md: 2 }, py: { xs: 1.5, sm: 2 } }}>
        {sorted.length === 0 ? (
          <Card elevation={0} sx={{ borderRadius: 3, border: '1px dashed', borderColor: 'divider', bgcolor: 'rgba(255,255,255,0.7)' }}>
            <CardContent sx={{ py: 4, textAlign: 'center' }}>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Noch keine Website. Tippe oben auf + für eine neue Website.
              </Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => void handleNewSite()}
                sx={{ textTransform: 'none' }}
              >
                Neue Website
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Stack spacing={1.5}>
            {sorted.map((site) => (
              <Card
                key={site.id}
                elevation={0}
                sx={{
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'stretch',
                  transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
                  '&:hover': {
                    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                    borderColor: 'rgba(255, 152, 0, 0.45)',
                  },
                }}
              >
                <CardActionArea onClick={() => openSite(site.id)} sx={{ flex: 1, display: 'flex', alignItems: 'stretch' }}>
                  <CardContent sx={{ py: 2, flex: 1, '&:last-child': { pb: 2 } }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 2,
                          background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 55%, #e65100 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          flexShrink: 0,
                        }}
                      >
                        <ArticleIcon />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                        <Typography sx={{ fontWeight: 800, fontSize: '1.05rem' }} noWrap>
                          {site.name}
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                          <Chip size="small" label={`${site.pages.length} Unterseite${site.pages.length === 1 ? '' : 'n'}`} />
                          <Typography variant="caption" color="text.secondary">
                            Zuletzt: {formatDate(site.updatedAt)}
                          </Typography>
                        </Stack>
                      </Box>
                    </Stack>
                  </CardContent>
                </CardActionArea>
                <Stack
                  direction="row"
                  spacing={0.25}
                  alignItems="center"
                  sx={{
                    flexShrink: 0,
                    px: 1,
                    borderLeft: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'rgba(0,0,0,0.02)',
                  }}
                >
                  <Tooltip title="Vorschau im neuen Tab">
                    <IconButton
                      size="small"
                      onClick={(e) => void openPreview(site.id, e)}
                      aria-label="Vorschau im neuen Tab"
                    >
                      <OpenInNewIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Website löschen">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={(e) => void handleDelete(site.id, e)}
                      aria-label="Website löschen"
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Card>
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );
}
