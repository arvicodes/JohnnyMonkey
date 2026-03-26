import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';

export type ExerciseAnimId =
  | 'jumping-jacks'
  | 'wall-sit'
  | 'push-up'
  | 'crunch'
  | 'step-up'
  | 'squat'
  | 'triceps-dip'
  | 'plank'
  | 'lunge'
  | 'side-plank-left'
  | 'side-plank-right'
  | 'high-knees';

type ImageMeta = {
  src: string;
  alt: string;
};

const THUMB_WIDTH = 220;
const PLACEHOLDER_HEIGHT = 192;

function toWikimediaThumb(src: string, width: number): string {
  try {
    const u = new URL(src);
    // Erwartet: /wikipedia/commons/<h1>/<h2>/<filename>
    const parts = u.pathname.split('/').filter(Boolean);
    const commonsIdx = parts.indexOf('commons');
    if (commonsIdx === -1 || parts.length < commonsIdx + 4) return src;

    const h1 = parts[commonsIdx + 1];
    const h2 = parts[commonsIdx + 2];
    const filename = parts[commonsIdx + 3];
    const thumbPath = `/wikipedia/commons/thumb/${h1}/${h2}/${filename}/${width}px-${filename}`;

    return `${u.origin}${thumbPath}`;
  } catch {
    return src;
  }
}

export const EXERCISE_IMAGES: Record<ExerciseAnimId, ImageMeta> = {
  'jumping-jacks': {
    src: 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Vitruvian_jumping_jacks.gif',
    alt: 'Hampelmänner: zwei Posen',
  },
  'wall-sit': {
    src: 'https://upload.wikimedia.org/wikipedia/commons/1/1c/1924RuthWallsit.jpg',
    alt: 'Wandsitzen an einer Wand',
  },
  'push-up': {
    src: 'https://upload.wikimedia.org/wikipedia/commons/f/fe/Personal_training_push-ups_preparation.jpg',
    alt: 'Liegestütz, Vorbereitung',
  },
  crunch: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/4/4b/An_illustration_of_sit_up_abdominal_exercise.jpg',
    alt: 'Bauchübung / Sit-up, Illustration',
  },
  'step-up': {
    src: 'https://upload.wikimedia.org/wikipedia/commons/b/b9/Step_aerobics_demonstration.jpg',
    alt: 'Step-Aerobic auf der Stepbank',
  },
  squat: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/d/df/Bodyweight_Squats.gif',
    alt: 'Kniebeugen mit eigenem Körpergewicht',
  },
  'triceps-dip': {
    src: 'https://upload.wikimedia.org/wikipedia/commons/4/42/Tricep_Dip_Exercise.jpg',
    alt: 'Trizeps-Dips an einer Bank',
  },
  plank: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/f/fc/Fitness_enthusiast_performs_plank_exercise_at_home_on_yoga_mat.jpg',
    alt: 'Unterarmstütz auf der Matte',
  },
  lunge: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/2/29/Airman_performing_lunge.jpg',
    alt: 'Ausfallschritt (Lunge)',
  },
  'side-plank-left': {
    src: 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Side-plank-1.png',
    alt: 'Seitenstütz, Variante 1',
  },
  'side-plank-right': {
    src: 'https://upload.wikimedia.org/wikipedia/commons/0/0a/Side-plank-2.png',
    alt: 'Seitenstütz, Variante 2',
  },
  'high-knees': {
    src: 'https://upload.wikimedia.org/wikipedia/commons/d/dc/Aerobic_exercise_-_public_demonstration06.jpg',
    alt: 'Aerobic / Knie hoch',
  },
};

const FAILED_CACHE = new Set<ExerciseAnimId>();

function exerciseEmoji(exerciseId: ExerciseAnimId): string {
  switch (exerciseId) {
    case 'jumping-jacks':
      return '🤸';
    case 'wall-sit':
      return '🧱';
    case 'push-up':
      return '💪';
    case 'crunch':
      return '🔄';
    case 'step-up':
      return '🪜';
    case 'squat':
      return '🦵';
    case 'triceps-dip':
      return '🪑';
    case 'plank':
      return '🧘';
    case 'lunge':
      return '🦶';
    case 'side-plank-left':
      return '↙️';
    case 'side-plank-right':
      return '↘️';
    case 'high-knees':
      return '🏃';
    default:
      return '🏋️';
  }
}

export function ExerciseAnimation({ exerciseId }: { exerciseId: ExerciseAnimId }) {
  const meta = EXERCISE_IMAGES[exerciseId];
  const thumbSrc = toWikimediaThumb(meta.src, THUMB_WIDTH);
  const [failed, setFailed] = useState(FAILED_CACHE.has(exerciseId));

  useEffect(() => {
    setFailed(FAILED_CACHE.has(exerciseId));
  }, [exerciseId]);

  if (failed) {
    return (
      <Box sx={{ width: '100%', maxWidth: 520, mx: 'auto' }}>
        <Box
          sx={{
            height: PLACEHOLDER_HEIGHT,
            width: '100%',
            borderRadius: 2,
            bgcolor: 'grey.100',
            border: '1px solid',
            borderColor: 'grey.300',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography component="div" sx={{ fontSize: 72, lineHeight: 1 }}>
            {exerciseEmoji(exerciseId)}
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', maxWidth: 520, mx: 'auto' }}>
      <Box
        sx={{
          width: '100%',
          height: PLACEHOLDER_HEIGHT,
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: 'grey.100',
          border: '1px solid',
          borderColor: 'grey.300',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box
          component="img"
          src={thumbSrc}
          alt={meta.alt}
          loading="lazy"
          decoding="async"
          onError={() => {
            FAILED_CACHE.add(exerciseId);
            setFailed(true);
          }}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            objectPosition: 'center',
            display: 'block',
          }}
        />
      </Box>
    </Box>
  );
}
