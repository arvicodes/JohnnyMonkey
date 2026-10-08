import React from 'react';
import { Chip, Tooltip } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import EditNoteIcon from '@mui/icons-material/EditNote';
import {
  epoNotenBitteAusfuellenChipSx,
  epoNotenFertigChipSx,
  epoNotenRoundIconChipSx,
  epoNotenTeacherListStatusChipSx,
  epoNotenTeacherListStatusIconSx,
} from './epoNotenUi';

const teacherListChipSx = { ...epoNotenRoundIconChipSx, ...epoNotenTeacherListStatusChipSx };
const teacherListIconSx = epoNotenTeacherListStatusIconSx;
const roundListIconSx = { fontSize: 15 };

type TeacherListProps = {
  passive: boolean;
  withoutSelfAssessment?: boolean;
  teacherGradeOnly?: boolean;
  pendingKind: 'self' | 'goals' | null;
  studentSubmittedAt?: string | null;
};

/** Lehrer-SuS-Liste: runde Status-Chips mit Icon */
export function EpoNotenTeacherStudentStatusChip({
  passive,
  withoutSelfAssessment,
  teacherGradeOnly,
  pendingKind,
  studentSubmittedAt,
}: TeacherListProps) {
  if (passive) {
    return (
      <Chip
        size="small"
        variant="outlined"
        label="Abwesend"
        sx={{ height: 18, fontSize: '0.52rem', fontWeight: 700, '& .MuiChip-label': { px: 0.35 } }}
      />
    );
  }

  if (teacherGradeOnly || withoutSelfAssessment) {
    return null;
  }

  if (pendingKind) {
    const detail = pendingKind === 'self' ? 'Selbsteinschätzung' : 'Ziele';
    return (
      <Tooltip title={`Bitte ausfüllen — ${detail}`}>
        <Chip
          size="small"
          color="warning"
          variant="filled"
          icon={<EditNoteIcon sx={teacherListIconSx} />}
          label=" "
          aria-label="Bitte ausfüllen"
          sx={{
            ...teacherListChipSx,
            ...epoNotenBitteAusfuellenChipSx,
            '& .MuiChip-icon': { margin: 0, color: '#fff' },
          }}
        />
      </Tooltip>
    );
  }

  if (studentSubmittedAt) {
    return (
      <Tooltip title="Abgegeben">
        <Chip
          size="small"
          variant="filled"
          icon={<CheckIcon sx={teacherListIconSx} />}
          label=" "
          aria-label="Abgegeben"
          sx={{
            ...teacherListChipSx,
            ...epoNotenFertigChipSx,
            '& .MuiChip-icon': { margin: 0 },
          }}
        />
      </Tooltip>
    );
  }

  return (
    <Chip
      size="small"
      variant="outlined"
      label="—"
      sx={{
        ...teacherListChipSx,
        '& .MuiChip-label': { display: 'flex', p: 0, fontSize: '0.58rem' },
      }}
    />
  );
}

/** SuS-Rundenliste: „Bitte ausfüllen“ als runder Icon-Chip */
export function EpoNotenPendingRoundChip({ title }: { title?: string }) {
  return (
    <Tooltip title={title ?? 'Bitte ausfüllen'}>
      <Chip
        size="small"
        color="warning"
        variant="filled"
        icon={<EditNoteIcon sx={roundListIconSx} />}
        label=" "
        aria-label="Bitte ausfüllen"
        sx={{
          ...epoNotenRoundIconChipSx,
          ...epoNotenBitteAusfuellenChipSx,
          '& .MuiChip-icon': { margin: 0, color: '#fff' },
        }}
      />
    </Tooltip>
  );
}
