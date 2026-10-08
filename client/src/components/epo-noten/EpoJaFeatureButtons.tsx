import React from 'react';
import { Box, Button } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined';
import type { EpoJaFlags } from '../../lib/epoGroupJaFlags';
import { epoJaFeatureGroupShellSx } from '../../lib/epoGroupJaFlags';
import {
  epoNotenPalette,
  epoNotenToolbarOutlinedBtnCompactSx,
  epoNotenToolbarOutlinedBtnSx,
} from './epoNotenUi';

type Size = 'course' | 'student';

type AbsentProps = {
  active: boolean;
  disabled?: boolean;
  onToggle: () => void;
};

type Props = {
  size: Size;
  value: EpoJaFlags;
  disabled?: boolean;
  onChange: (next: EpoJaFlags) => void;
  absent?: AbsentProps;
};

const labelFor = (key: keyof EpoJaFlags): string => {
  if (key === 'goals') return 'Ziele';
  if (key === 'raster') return 'Lehrerraster';
  return 'Selbsteinschätzung';
};

function jaOnSx(isSelf: boolean) {
  return {
    bgcolor: isSelf ? 'rgba(46, 125, 50, 0.16)' : 'rgba(46, 125, 50, 0.12)',
    color: epoNotenPalette.fertigAccent,
    borderColor: epoNotenPalette.fertigBorder,
    '&:hover': {
      bgcolor: isSelf ? 'rgba(46, 125, 50, 0.24)' : 'rgba(46, 125, 50, 0.2)',
    },
  };
}

const jaOffSx = {
  color: 'text.secondary',
  borderColor: 'divider',
  bgcolor: '#fff',
};

export function EpoJaFeatureButtons({ size, value, disabled, onChange, absent }: Props) {
  const compact = size === 'student';
  const toggle = (key: keyof EpoJaFlags) => {
    const next = { ...value, [key]: !value[key] };
    if (!next.self && !next.raster) {
      next.goals = false;
    }
    onChange(next);
  };

  const btnSx = compact ? epoNotenToolbarOutlinedBtnCompactSx : epoNotenToolbarOutlinedBtnSx;

  return (
    <Box sx={{ ...epoJaFeatureGroupShellSx, gap: compact ? 0.2 : 0.25 }}>
      {absent ? (
        <Button
          size="small"
          variant="outlined"
          disabled={absent.disabled}
          onClick={() => absent.onToggle()}
          startIcon={<EventBusyOutlinedIcon sx={{ fontSize: compact ? 12 : 13 }} />}
          sx={{
            ...btnSx,
            ...(absent.active
              ? {
                  bgcolor: 'rgba(0, 0, 0, 0.07)',
                  color: 'text.primary',
                  borderColor: 'text.secondary',
                }
              : jaOffSx),
          }}
        >
          Länger abwesend
        </Button>
      ) : null}
      {(Object.keys(value) as (keyof EpoJaFlags)[]).map((key) => {
        const on = value[key];
        const isSelf = key === 'self';
        const text = `${labelFor(key)} ${on ? 'JA' : 'NEIN'}`;
        return (
          <Button
            key={key}
            size="small"
            variant="outlined"
            disabled={disabled}
            onClick={() => toggle(key)}
            startIcon={
              on ? (
                <CheckCircleIcon sx={{ fontSize: compact ? 12 : 13, color: epoNotenPalette.fertigAccent }} />
              ) : undefined
            }
            sx={{
              ...btnSx,
              ...(on ? jaOnSx(isSelf) : jaOffSx),
            }}
          >
            {text}
          </Button>
        );
      })}
    </Box>
  );
}
