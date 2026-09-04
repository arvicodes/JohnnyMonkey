import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Dialog, Typography } from '@mui/material';
import PresentationInteractiveExercisePlayer from './presentation/PresentationInteractiveExercisePlayer';
import {
  resolveInteractiveExercise,
  type SlideInteractiveExercise,
} from '../lib/presentationInteractiveExercise';
import { INTERACTIVE_EXERCISE_ACCENT } from '../lib/presentationInteractiveExercise';

type ExerciseBeacon = {
  groupId: string;
  groupName?: string;
  lessonPath?: string;
  slideId?: string;
  exerciseId: string;
  exerciseTitle?: string;
  exerciseJson: string;
  beaconId: string;
  updatedAt?: string;
};

const POLL_MS = 1500;

/**
 * Lehrer startet interaktive Übung → SuS bekommen ein nicht schließbares Vollbild-Overlay.
 */
export default function StudentLiveInteractiveExerciseAlert({ userId }: { userId: string }) {
  const [beacon, setBeacon] = useState<ExerciseBeacon | null>(null);

  const poll = useCallback(async () => {
    if (!userId) return;
    try {
      const loginCode = localStorage.getItem('loginCode')?.trim();
      if (!loginCode) return;
      const res = await fetch('/api/learning-groups/interactive-exercise-beacon/student-poll', {
        headers: { 'x-login-code': loginCode },
      });
      if (!res.ok) return;
      const data = (await res.json()) as { beacons?: ExerciseBeacon[] };
      const next = data.beacons?.[0] || null;
      setBeacon((prev) => {
        if (!next) return null;
        if (
          prev &&
          prev.beaconId === next.beaconId &&
          prev.exerciseId === next.exerciseId &&
          prev.groupId === next.groupId
        ) {
          return prev;
        }
        return next;
      });
    } catch {
      /* ignore */
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    void poll();
    const t = window.setInterval(() => void poll(), POLL_MS);
    return () => window.clearInterval(t);
  }, [userId, poll]);

  const exercise: SlideInteractiveExercise | null = useMemo(() => {
    if (!beacon?.exerciseJson) return null;
    try {
      const parsed = JSON.parse(beacon.exerciseJson) as SlideInteractiveExercise;
      return resolveInteractiveExercise(parsed) || parsed;
    } catch {
      return null;
    }
  }, [beacon?.exerciseJson, beacon?.beaconId]);

  const open = Boolean(beacon && exercise);
  const title = beacon?.exerciseTitle || exercise?.title || 'Interaktive Übung';

  return (
    <Dialog
      open={open}
      fullScreen
      disableEscapeKeyDown
      onClose={() => {
        /* vom Lehrer beenden — SuS können nicht schließen */
      }}
      PaperProps={{
        sx: {
          m: 0,
          bgcolor: '#1a1208',
          backgroundImage: 'none',
        },
      }}
    >
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: '#1a1208',
        }}
      >
        <Box
          sx={{
            flexShrink: 0,
            px: 1.5,
            py: 0.75,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            bgcolor: INTERACTIVE_EXERCISE_ACCENT,
            color: '#fff',
          }}
        >
          <Box
            component="span"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 22,
              height: 22,
              borderRadius: 0.75,
              bgcolor: 'rgba(255,255,255,0.2)',
              fontWeight: 900,
              fontSize: '0.8rem',
            }}
          >
            Ü
          </Box>
          <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', flex: 1, minWidth: 0 }} noWrap>
            {title}
            {beacon?.groupName ? ` · ${beacon.groupName}` : ''}
          </Typography>
          <Typography sx={{ fontSize: '0.7rem', opacity: 0.9, fontWeight: 600 }}>
            Gestartet — bitte üben
          </Typography>
        </Box>

        <Box sx={{ flex: 1, minHeight: 0, position: 'relative', bgcolor: '#fff' }}>
          {exercise ? (
            <PresentationInteractiveExercisePlayer
              exercise={exercise}
              interactive
              scale={1}
              lessonPath={beacon?.lessonPath || ''}
              groupId={beacon?.groupId || ''}
              studentId={userId}
            />
          ) : null}
        </Box>
      </Box>
    </Dialog>
  );
}
