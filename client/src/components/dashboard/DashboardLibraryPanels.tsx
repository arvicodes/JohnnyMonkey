import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  List,
  ListItemButton,
  ListItemText,
  Typography,
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import QuizIcon from '@mui/icons-material/Quiz';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import EditIcon from '@mui/icons-material/Edit';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import {
  examOpenUrl,
  exerciseEditorUrl,
  exercisePresentUrl,
  scanLibraryExams,
  scanLibraryInteractiveExercises,
  type LibraryExamItem,
  type LibraryExerciseItem,
} from '../lib/dashboardMaterialLibrary';

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
  hint,
  loading,
  empty,
  children,
  onReload,
}: {
  colors: Colors;
  title: string;
  icon: React.ReactNode;
  hint: string;
  loading: boolean;
  empty: boolean;
  children: React.ReactNode;
  onReload: () => void;
}) {
  return (
    <Box sx={{ p: 1.4 }}>
      <Card
        sx={{
          borderRadius: 2.8,
          boxShadow: '0 2.8px 8.4px rgba(0,0,0,0.07)',
          bgcolor: colors.cardBg,
          mb: 1.5,
          border: `1px solid ${colors.border}`,
        }}
      >
        <CardContent sx={{ pb: '12px !important' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Typography
              variant="body2"
              sx={{
                fontSize: '0.78rem',
                fontWeight: 600,
                color: colors.primary,
                display: 'flex',
                alignItems: 'center',
                gap: 0.4,
              }}
            >
              {icon}
              {title}
            </Typography>
            <Button size="small" onClick={onReload} disabled={loading} sx={{ fontSize: '0.65rem', textTransform: 'none' }}>
              Aktualisieren
            </Button>
          </Box>
          <Typography sx={{ mt: 0.75, fontSize: '0.68rem', color: 'text.secondary' }}>{hint}</Typography>
        </CardContent>
      </Card>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={28} />
        </Box>
      ) : empty ? (
        <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', px: 0.5 }}>
          Noch nichts gefunden — unter Arbeits-Reihen bzw. zugeordneten Ordnern suchen.
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
}> = ({ rootPaths, colors }) => {
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

  return (
    <LibraryShell
      colors={colors}
      title="Prüfungen"
      icon={<AssignmentIcon sx={{ fontSize: 15 }} />}
      hint="KA / KU / HÜ / QZ aus den Arbeits-Reihen und zugeordneten Stundenordnern"
      loading={loading}
      empty={!items.length}
      onReload={() => void load()}
    >
      <List dense disablePadding sx={{ bgcolor: colors.cardBg, borderRadius: 2, border: `1px solid ${colors.border}` }}>
        {items.map((item) => (
          <ListItemButton
            key={item.path}
            onClick={() => window.open(examOpenUrl(item.path), '_blank', 'noopener,noreferrer')}
            sx={{ alignItems: 'flex-start', py: 1 }}
          >
            <ListItemText
              primary={item.name}
              secondary={item.lessonLabel}
              primaryTypographyProps={{ fontSize: '0.82rem', fontWeight: 600 }}
              secondaryTypographyProps={{ fontSize: '0.68rem' }}
            />
            <OpenInNewIcon sx={{ fontSize: 16, color: 'text.secondary', mt: 0.5 }} />
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

  return (
    <LibraryShell
      colors={colors}
      title="Interaktive Übungen"
      icon={<QuizIcon sx={{ fontSize: 15 }} />}
      hint="Übungen aus den Präsentationen der Arbeits-Reihen und zugeordneten Ordner"
      loading={loading}
      empty={!items.length}
      onReload={() => void load()}
    >
      <List dense disablePadding sx={{ bgcolor: colors.cardBg, borderRadius: 2, border: `1px solid ${colors.border}` }}>
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
              Edit
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
              Play
            </Button>
          </ListItemButton>
        ))}
      </List>
    </LibraryShell>
  );
};
