/**
 * Interaktive Übung an einer Folie: START/STOP für SuS-Vollbild (wie Prüfung).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  INTERACTIVE_EXERCISE_ACCENT,
  resolveInteractiveExercise,
  type SlideInteractiveExercise,
} from '../../lib/presentationInteractiveExercise';
import {
  fetchLessonInteractiveExerciseBeacon,
  startLessonInteractiveExercise,
  stopLessonInteractiveExercise,
  teacherIdFromStorage,
} from '../../lib/lessonInteractiveExerciseBeacon';
import { DialogCloseIconButton, dialogCloseTitleSx } from '../ui/dialog-close-icon-button';
import PresentationInteractiveExercisePlayer from './PresentationInteractiveExercisePlayer';

const ACCENT = INTERACTIVE_EXERCISE_ACCENT;

type Props = {
  exercise?: SlideInteractiveExercise | null;
  slideId?: string;
  lessonPath?: string;
  groupId?: string;
  onMessage?: (text: string) => void;
  compact?: boolean;
};

const headerBtnSx = {
  minWidth: 0,
  height: 24,
  px: 0.85,
  py: 0,
  fontSize: '0.62rem',
  fontWeight: 800,
  lineHeight: 1,
  textTransform: 'none' as const,
  color: '#fff',
  borderColor: 'rgba(255,255,255,0.35)',
  '&:hover': { bgcolor: 'rgba(255,255,255,0.14)', borderColor: 'rgba(255,255,255,0.55)' },
  '&.Mui-disabled': { color: 'rgba(255,255,255,0.45)', borderColor: 'rgba(255,255,255,0.18)' },
};

const PresentationSlideExerciseBox: React.FC<Props> = ({
  exercise: rawExercise,
  slideId = '',
  lessonPath = '',
  groupId,
  onMessage,
  compact = true,
}) => {
  const exercise = useMemo(() => resolveInteractiveExercise(rawExercise), [rawExercise]);
  const [busy, setBusy] = useState(false);
  const [runningKey, setRunningKey] = useState<string | null>(null);
  const [pickedGroupId, setPickedGroupId] = useState('');
  const [groupPickOpen, setGroupPickOpen] = useState(false);
  const [groups, setGroups] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const gid = (pickedGroupId || groupId || '').trim();
  const exerciseKey = `${slideId || ''}|${exercise?.id || ''}`;
  const isRunning = Boolean(runningKey && exerciseKey && runningKey === exerciseKey);

  const loadGroups = useCallback(async () => {
    setLoadingGroups(true);
    try {
      const loginCode = localStorage.getItem('loginCode') || '';
      const res = await fetch('/api/learning-groups', {
        headers: { 'Content-Type': 'application/json', 'x-login-code': loginCode },
      });
      if (!res.ok) {
        setGroups([]);
        return;
      }
      const data = (await res.json()) as Array<{ id?: string; name?: string }>;
      setGroups(
        (Array.isArray(data) ? data : [])
          .filter((g) => g.id)
          .map((g) => ({ id: String(g.id), name: g.name || 'Lerngruppe' })),
      );
    } catch {
      setGroups([]);
    } finally {
      setLoadingGroups(false);
    }
  }, []);

  useEffect(() => {
    if (!gid) {
      setRunningKey(null);
      return undefined;
    }
    let cancelled = false;
    const poll = async () => {
      try {
        const status = await fetchLessonInteractiveExerciseBeacon(gid);
        if (cancelled) return;
        if (status.active && status.exerciseId) {
          setRunningKey(`${status.slideId || ''}|${status.exerciseId}`);
        } else {
          setRunningKey(null);
        }
      } catch {
        /* ignore */
      }
    };
    void poll();
    const t = window.setInterval(() => void poll(), 2000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [gid]);

  const startForGroup = async (groupIdToUse: string) => {
    if (!exercise) return;
    const teacherId = teacherIdFromStorage();
    if (!teacherId) {
      onMessage?.('Bitte zuerst anmelden.');
      return;
    }
    const useGid = groupIdToUse.trim();
    if (!useGid) {
      await loadGroups();
      setGroupPickOpen(true);
      return;
    }
    setBusy(true);
    try {
      if (isRunning && gid === useGid) {
        await stopLessonInteractiveExercise({ teacherId, groupId: useGid });
        setRunningKey(null);
        onMessage?.('Interaktive Übung beendet');
      } else {
        const resolved = resolveInteractiveExercise(exercise) || exercise;
        const started = await startLessonInteractiveExercise({
          teacherId,
          groupId: useGid,
          lessonPath,
          slideId,
          exerciseId: resolved.id,
          exerciseTitle: resolved.title,
          exerciseJson: JSON.stringify(resolved),
        });
        setPickedGroupId(useGid);
        setRunningKey(`${slideId}|${started.exerciseId || resolved.id}`);
        onMessage?.('Übung gestartet — SuS der Lerngruppe sehen Vollbild');
      }
    } catch (e) {
      onMessage?.(e instanceof Error ? e.message : 'Übung Start/Stop fehlgeschlagen');
    } finally {
      setBusy(false);
    }
  };

  const toggleRun = async () => {
    await startForGroup(gid);
  };

  if (!exercise) return null;

  return (
    <Box
      data-pres-exercise-box="1"
      sx={{
        flexShrink: 0,
        borderRadius: compact ? 1.5 : 2,
        overflow: 'hidden',
        border: `1px solid ${alpha(ACCENT, 0.45)}`,
        background: `linear-gradient(180deg, ${alpha('#FFB74D', 0.28)} 0%, ${alpha('#FFF8E1', 0.96)} 38%, #fffaf0 100%)`,
        mx: compact ? 0.85 : 0,
        mt: compact ? 0.15 : 0,
        mb: compact ? 0.35 : 0,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          px: 0.7,
          py: 0.45,
          bgcolor: alpha(ACCENT, 0.95),
          color: '#fff',
        }}
      >
        <Box
          sx={{
            width: 16,
            height: 16,
            borderRadius: 0.4,
            bgcolor: 'rgba(255,255,255,0.22)',
            fontSize: 9,
            fontWeight: 900,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          Ü
        </Box>
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.3 }}>
          <ButtonGroup
            size="small"
            variant="outlined"
            sx={{
              width: '100%',
              '& .MuiButtonGroup-grouped': { minWidth: 0, flex: 1 },
            }}
          >
            <Button
              disabled={busy}
              onClick={() => void toggleRun()}
              title={
                isRunning
                  ? 'Übung beenden'
                  : 'Übung starten (Vollbild bei SuS)'
              }
              sx={{
                ...headerBtnSx,
                ...(isRunning
                  ? { bgcolor: 'rgba(0,0,0,0.22)', borderColor: 'rgba(255,255,255,0.5)' }
                  : {}),
              }}
            >
              {busy ? <CircularProgress size={11} color="inherit" /> : isRunning ? 'STOP' : 'START'}
            </Button>
            <Button onClick={() => setPreviewOpen(true)} sx={headerBtnSx}>
              Öffnen
            </Button>
          </ButtonGroup>
        </Box>
      </Box>

      <Box sx={{ px: 0.85, py: 0.5 }}>
        <Typography
          sx={{ fontSize: '0.68rem', fontWeight: 700, color: '#5d4037', lineHeight: 1.25 }}
          noWrap
          title={exercise.title}
        >
          {exercise.title}
        </Typography>
        <Typography sx={{ fontSize: '0.58rem', color: alpha('#5d4037', 0.75), mt: 0.15 }}>
          Interaktive Übung · {exercise.topics.length} Themen
        </Typography>
      </Box>

      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { height: '85vh' } }}
      >
        <DialogTitle sx={{ ...dialogCloseTitleSx, bgcolor: ACCENT, color: '#fff' }}>
          {exercise.title}
          <DialogCloseIconButton
            onClose={() => setPreviewOpen(false)}
            sx={{ color: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' } }}
            iconSx={{ color: '#fff' }}
          />
        </DialogTitle>
        <DialogContent sx={{ p: 0, height: '100%', bgcolor: '#fff' }}>
          <Box sx={{ height: '100%', minHeight: 420 }}>
            <PresentationInteractiveExercisePlayer
              exercise={exercise}
              interactive
              scale={1}
              lessonPath={lessonPath}
              groupId={gid}
            />
          </Box>
        </DialogContent>
      </Dialog>

      <Dialog open={groupPickOpen} onClose={() => setGroupPickOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={dialogCloseTitleSx}>
          Lerngruppe
          <DialogCloseIconButton onClose={() => setGroupPickOpen(false)} />
        </DialogTitle>
        <DialogContent sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {loadingGroups ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 2 }}>
              <CircularProgress size={18} />
            </Box>
          ) : groups.length === 0 ? (
            <Typography variant="body2">Keine Lerngruppe gefunden.</Typography>
          ) : (
            groups.map((g) => (
              <Button
                key={g.id}
                variant="outlined"
                onClick={() => {
                  setGroupPickOpen(false);
                  void startForGroup(g.id);
                }}
                sx={{ justifyContent: 'flex-start', textTransform: 'none', fontWeight: 700 }}
              >
                {g.name}
              </Button>
            ))
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default PresentationSlideExerciseBox;
