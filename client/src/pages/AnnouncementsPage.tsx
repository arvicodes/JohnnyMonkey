import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Campaign as CampaignIcon } from '@mui/icons-material';
import { apiGetSafe, apiPost } from '../lib/api';
import type { AnnouncementFeedItem } from '../lib/announcementTypes';
import { AnnouncementStudentDetail, AnnouncementStudentList } from '../components/announcements/AnnouncementStudentView';
import { AnnouncementTeacherView } from '../components/announcements/AnnouncementTeacherView';
import {
  announcementPageBgSx,
  announcementPalette,
  compactIconBtnSx,
  compactIconSx,
  pageShellSx,
  studentPageShellSx,
} from '../components/announcements/announcementUi';

const cardPaddingSx = { p: { xs: 1.25, sm: 1.5 }, '&:last-child': { pb: { xs: 1.25, sm: 1.5 } } };

function detectIsTeacher(): boolean {
  const teacherId = localStorage.getItem('teacherId');
  const studentId = localStorage.getItem('studentId');
  if (teacherId && !studentId) return true;
  if (studentId && !teacherId) return false;
  return Boolean(teacherId);
}

function feedKey(item: AnnouncementFeedItem): string {
  return `${item.authorId}::${item.id}`;
}

export default function AnnouncementsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isTeacher = useMemo(() => detectIsTeacher(), []);

  const [loading, setLoading] = useState(!isTeacher);
  const [announcements, setAnnouncements] = useState<AnnouncementFeedItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const selectedKey = searchParams.get('id') || '';

  const selectedItem = useMemo(
    () => announcements.find((a) => feedKey(a) === selectedKey) ?? null,
    [announcements, selectedKey],
  );

  const loadFeed = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await apiGetSafe('/api/announcements/current');
      if (!response?.ok) {
        if (!silent) setLoadError('Ankündigungen konnten nicht geladen werden.');
        return;
      }
      const data = await response.json();
      const raw = Array.isArray(data?.announcements) ? data.announcements : [];
      const items = raw.filter(
        (a: unknown): a is AnnouncementFeedItem =>
          Boolean(a) &&
          typeof a === 'object' &&
          typeof (a as AnnouncementFeedItem).id === 'string' &&
          typeof (a as AnnouncementFeedItem).authorId === 'string',
      );
      setAnnouncements(items);
      setLoadError(null);
    } catch {
      if (!silent) setLoadError('Ankündigungen konnten nicht geladen werden.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isTeacher) return;
    void loadFeed(false);
  }, [isTeacher, loadFeed]);

  const selectItem = useCallback(
    async (id: string, authorId: string) => {
      const key = `${authorId}::${id}`;
      setSearchParams({ id: key });
      try {
        const item = announcements.find((a) => a.id === id && a.authorId === authorId);
        await apiPost('/api/announcements/read', {
          announcementId: id,
          teacherId: authorId,
          ...(item?.folderSlug ? { folderSlug: item.folderSlug } : {}),
        });
        setAnnouncements((prev) =>
          prev.map((a) => (a.id === id && a.authorId === authorId ? { ...a, isRead: true } : a)),
        );
      } catch {
        /* ignore */
      }
    },
    [setSearchParams],
  );

  if (!isTeacher && loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: announcementPalette.background }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={announcementPageBgSx}>
      <Box sx={{ ...(isTeacher ? pageShellSx : studentPageShellSx), py: { xs: 1.25, sm: 1.5 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, width: '100%' }}>
          <Tooltip title="Dashboard">
            <IconButton
              onClick={() => navigate('/dashboard')}
              aria-label="Zurück"
              sx={{ ...compactIconBtnSx, bgcolor: 'white', border: '1px solid', borderColor: 'divider' }}
            >
              <ArrowBackIcon sx={compactIconSx} />
            </IconButton>
          </Tooltip>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 800,
              color: announcementPalette.heading,
              textAlign: 'center',
              flex: 1,
              px: 1,
              fontSize: { xs: '0.9rem', sm: '1rem' },
              lineHeight: 1.25,
            }}
          >
            {isTeacher ? 'Ankündigungen & Vordrucke' : 'Aktuelle Ankündigungen'}
          </Typography>
          <Box sx={{ width: 32, flexShrink: 0 }} />
        </Box>

        {loadError && (
          <Typography variant="body2" color="warning.main" sx={{ mb: 2, textAlign: 'center' }}>
            {loadError}
          </Typography>
        )}

        {isTeacher ? (
          <AnnouncementTeacherView />
        ) : announcements.length === 0 ? (
          <Card elevation={0} sx={{ borderRadius: 3, border: '1px dashed', borderColor: 'divider' }}>
            <CardContent sx={{ ...cardPaddingSx, py: 6, textAlign: 'center' }}>
              <CampaignIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, color: announcementPalette.heading }}>
                Noch keine Ankündigungen
              </Typography>
              <Typography color="text.secondary" sx={{ maxWidth: 420, mx: 'auto' }}>
                Sobald eine Lehrkraft etwas veröffentlicht, erscheint es hier für alle.
              </Typography>
              <Button variant="outlined" onClick={() => navigate('/dashboard')} sx={{ mt: 3, textTransform: 'none' }}>
                Zurück zum Dashboard
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Stack spacing={2}>
            <AnnouncementStudentList
              announcements={announcements}
              selectedId={selectedKey}
              onSelect={selectItem}
            />
            {!selectedItem ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 1 }}>
                Wähle eine Ankündigung aus der Liste.
              </Typography>
            ) : (
              <AnnouncementStudentDetail item={selectedItem} />
            )}
          </Stack>
        )}
      </Box>
    </Box>
  );
}
