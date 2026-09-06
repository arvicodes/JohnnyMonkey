import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Tooltip,
  Typography,
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import QuizIcon from '@mui/icons-material/Quiz';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import EditIcon from '@mui/icons-material/Edit';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  examOpenUrl,
  exerciseEditorUrl,
  exercisePresentUrl,
  scanLibraryExams,
  scanLibraryInteractiveExercises,
  type LibraryExamItem,
  type LibraryExerciseItem,
} from '../../lib/dashboardMaterialLibrary';

type Colors = {
  cardBg: string;
  primary: string;
  border: string;
  textSecondary?: string;
};

function LibraryShell({
  colors,
  title,
  icon,
  loading,
  empty,
  emptyHint,
  children,
  onReload,
}: {
  colors: Colors;
  title: string;
  icon: React.ReactNode;
  loading: boolean;
  empty: boolean;
  emptyHint: string;
  children: React.ReactNode;
  onReload: () => void;
}) {
  return (
    <Box sx={{ p: 1.4, position: 'relative' }}>
      <Tooltip title="Aktualisieren">
        <span>
          <IconButton
            size="small"
            aria-label="Aktualisieren"
            onClick={onReload}
            disabled={loading}
            sx={{
              position: 'absolute',
              top: 6,
              right: 6,
              zIndex: 2,
              color: colors.primary,
              bgcolor: 'rgba(255,255,255,0.92)',
              border: `1px solid ${colors.border}`,
              width: 30,
              height: 30,
              '&:hover': { bgcolor: '#fff' },
            }}
          >
            <RefreshIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </span>
      </Tooltip>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1, pr: 4.5 }}>
        <Box sx={{ color: colors.primary, display: 'flex' }}>{icon}</Box>
        <Typography
          variant="body2"
          sx={{ fontSize: '0.82rem', fontWeight: 600, color: colors.primary }}
        >
          {title}
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={28} />
        </Box>
      ) : empty ? (
        <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', px: 0.5 }}>
          {emptyHint}
        </Typography>
      ) : (
        children
      )}
    </Box>
  );
}

export const DashboardExamsPanel: React.FC<{
  rootPaths: string[];
  colors: Colors;
  onEditExam?: (item: LibraryExamItem) => void;
}> = ({ rootPaths, colors, onEditExam }) => {
  const [items, setItems] = useState<LibraryExamItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await scanLibraryExams(rootPaths));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [rootPaths]);

  useEffect(() => {
    void load();
  }, [load]);

  const emptyHint =
    rootPaths.length === 0
      ? 'Noch keine Arbeits-Reihe gewählt — im Tab „Reihen“ eine Reihe auswählen, dann erscheinen hier die Prüfungen.'
      : 'Noch keine Prüfung gefunden unter den gewählten Reihen / zugeordneten Ordnern.';

  return (
    <LibraryShell
      colors={colors}
      title="Prüfungen"
      icon={<AssignmentIcon sx={{ fontSize: 17 }} />}
      loading={loading}
      empty={!items.length}
      emptyHint={emptyHint}
      onReload={() => void load()}
    >
      <List
        dense
        disablePadding
        sx={{ bgcolor: colors.cardBg, borderRadius: 2, border: `1px solid ${colors.border}` }}
      >
        {items.map((item) => (
          <ListItemButton key={item.path} sx={{ alignItems: 'flex-start', py: 1, gap: 0.5 }}>
            <ListItemText
              primary={item.name}
              secondary={item.lessonLabel}
              primaryTypographyProps={{ fontSize: '0.82rem', fontWeight: 600 }}
              secondaryTypographyProps={{ fontSize: '0.68rem' }}
              onClick={() => window.open(examOpenUrl(item.path), '_blank', 'noopener,noreferrer')}
            />
            {onEditExam ? (
              <Button
                size="small"
                startIcon={<EditIcon sx={{ fontSize: 14 }} />}
                onClick={(e) => {
                  e.stopPropagation();
                  onEditExam(item);
                }}
                sx={{ fontSize: '0.62rem', textTransform: 'none', minWidth: 0, flexShrink: 0 }}
              >
                Bearbeiten
              </Button>
            ) : null}
            <OpenInNewIcon
              sx={{ fontSize: 16, color: 'text.secondary', mt: 0.5, flexShrink: 0, cursor: 'pointer' }}
              onClick={() => window.open(examOpenUrl(item.path), '_blank', 'noopener,noreferrer')}
            />
          </ListItemButton>
        ))}
      </List>
    </LibraryShell>
  );
};

export const DashboardInteractiveExercisesPanel: React.FC<{
  rootPaths: string[];
  colors: Colors;
  groupId?: string;
}> = ({ rootPaths, colors, groupId }) => {
  const [items, setItems] = useState<LibraryExerciseItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await scanLibraryInteractiveExercises(rootPaths));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [rootPaths]);

  useEffect(() => {
    void load();
  }, [load]);

  const emptyHint =
    rootPaths.length === 0
      ? 'Noch keine Arbeits-Reihe gewählt — im Tab „Reihen“ eine Reihe auswählen, dann erscheinen hier die Übungen.'
      : 'Noch keine interaktive Übung gefunden unter den gewählten Reihen / zugeordneten Ordnern.';

  return (
    <LibraryShell
      colors={colors}
      title="Interaktive Übungen"
      icon={<QuizIcon sx={{ fontSize: 17 }} />}
      loading={loading}
      empty={!items.length}
      emptyHint={emptyHint}
      onReload={() => void load()}
    >
      <List
        dense
        disablePadding
        sx={{ bgcolor: colors.cardBg, borderRadius: 2, border: `1px solid ${colors.border}` }}
      >
        {items.map((item) => (
          <ListItemButton
            key={`${item.lessonPath}:${item.slideId || item.slideIndex}`}
            sx={{ alignItems: 'flex-start', py: 1, gap: 0.5 }}
          >
            <ListItemText
              primary={item.title}
              secondary={`${item.lessonLabel} · Folie ${item.slideIndex}`}
              primaryTypographyProps={{ fontSize: '0.82rem', fontWeight: 600 }}
              secondaryTypographyProps={{ fontSize: '0.68rem' }}
              onClick={() => {
                window.location.href = exercisePresentUrl(item.lessonPath, item.slideId, groupId);
              }}
            />
            <Button
              size="small"
              startIcon={<EditIcon sx={{ fontSize: 14 }} />}
              onClick={(e) => {
                e.stopPropagation();
                window.location.href = exerciseEditorUrl(item.lessonPath, item.slideId, groupId);
              }}
              sx={{ fontSize: '0.62rem', textTransform: 'none', minWidth: 0, flexShrink: 0 }}
            >
              Bearbeiten
            </Button>
            <Button
              size="small"
              startIcon={<PlayArrowIcon sx={{ fontSize: 14 }} />}
              onClick={(e) => {
                e.stopPropagation();
                window.location.href = exercisePresentUrl(item.lessonPath, item.slideId, groupId);
              }}
              sx={{ fontSize: '0.62rem', textTransform: 'none', minWidth: 0, flexShrink: 0 }}
            >
              Spielen
            </Button>
          </ListItemButton>
        ))}
      </List>
    </LibraryShell>
  );
};
