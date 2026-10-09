import React from 'react';
import { Typography } from '@mui/material';
import {
  EXAM_STATUS_COLOR,
  EXAM_STATUS_LABEL,
  type ExamCorrectionListStatus,
} from '../../lib/examCorrectionListStatus';

/** Mittiger Status-Text in einer Prüfungszeile (Dashboard-Liste). */
export default function ExamListStatusBadge({ status }: { status: ExamCorrectionListStatus }) {
  const color = EXAM_STATUS_COLOR[status];
  return (
    <Typography
      component="span"
      sx={{
        fontWeight: 800,
        fontSize: status === 'vorbereitung' ? '0.72rem' : '0.78rem',
        color,
        textAlign: 'center',
        lineHeight: 1.15,
        whiteSpace: 'nowrap',
        textShadow: '0 0 6px rgba(255,255,255,0.85)',
        animation: status === 'aktiv' ? 'examListStatusBlink 1.1s ease-in-out infinite' : undefined,
        '@keyframes examListStatusBlink': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.28 },
        },
      }}
    >
      {EXAM_STATUS_LABEL[status]}
    </Typography>
  );
}
