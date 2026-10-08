import React from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import GradeOutlinedIcon from '@mui/icons-material/GradeOutlined';
import { EPO_GREEN_ACTIVE_ICON_SX, epoJaFeatureGroupShellSx } from '../../lib/epoGroupJaFlags';
import { epoNotenCompactIconBtnSx } from './epoNotenUi';

type Props = {
  saving: boolean;
  completed: boolean;
  releasableCount: number;
  schemaIntegrated: boolean;
  onRelease: () => void;
  onSchema: () => void;
};

const iconBtnSx = {
  ...epoNotenCompactIconBtnSx,
  width: 28,
  height: 28,
  p: 0,
  borderRadius: 0.85,
};

export function EpoCourseGroupIconActions({
  saving,
  completed,
  releasableCount,
  schemaIntegrated,
  onRelease,
  onSchema,
}: Props) {
  return (
    <Box sx={{ ...epoJaFeatureGroupShellSx, gap: 0.2 }}>
      <Tooltip
        title={
          releasableCount > 0
            ? `${releasableCount} Bewertung(en) an SuS freigeben`
            : 'Keine fertigen Bewertungen zum Freigeben'
        }
      >
        <span>
          <IconButton
            size="small"
            disabled={saving || completed || releasableCount === 0}
            onClick={onRelease}
            sx={{
              ...iconBtnSx,
              ...(releasableCount > 0 ? EPO_GREEN_ACTIVE_ICON_SX : {}),
            }}
            aria-label="Bewertungen an SuS freigeben"
          >
            <LockOpenIcon sx={{ fontSize: '1rem' }} />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Ins Notenschema">
        <span>
          <IconButton
            size="small"
            disabled={saving}
            onClick={onSchema}
            sx={{
              ...iconBtnSx,
              ...(schemaIntegrated ? EPO_GREEN_ACTIVE_ICON_SX : {}),
            }}
            aria-label="Ins Notenschema"
          >
            <GradeOutlinedIcon sx={{ fontSize: '1rem' }} />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
}
