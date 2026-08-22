import React from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import {
  Add as ZoomInIcon,
  Remove as ZoomOutIcon,
  CenterFocusStrong as ZoomResetIcon,
} from '@mui/icons-material';
import {
  PRESENT_ZOOM_MAX,
  PRESENT_ZOOM_MIN,
  presentZoomIn,
  presentZoomLabel,
  presentZoomOut,
} from '../../lib/presentationPresentZoom';

type Variant = 'dark' | 'light';

interface PresentationPresentZoomControlsProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  variant?: Variant;
  /** Kompakte Anzeige ohne %-Text */
  compact?: boolean;
}

const BTN_DARK = {
  width: 26,
  height: 26,
  minWidth: 26,
  p: 0,
  borderRadius: 1.25,
  color: 'rgba(255,255,255,0.9)',
  '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' },
  '&.Mui-disabled': { color: 'rgba(255,255,255,0.25)' },
} as const;

const BTN_LIGHT = {
  width: 26,
  height: 26,
  minWidth: 26,
  p: 0,
  borderRadius: 1.25,
  color: '#424242',
  '&:hover': { bgcolor: 'rgba(0,0,0,0.06)' },
  '&.Mui-disabled': { color: 'rgba(0,0,0,0.22)' },
} as const;

/** Zoom + / − / 100% für Präsentieren (Play, TABLET, Laptop). */
const PresentationPresentZoomControls: React.FC<PresentationPresentZoomControlsProps> = ({
  zoom,
  onZoomChange,
  variant = 'dark',
  compact = false,
}) => {
  const btnSx = variant === 'dark' ? BTN_DARK : BTN_LIGHT;
  const labelColor = variant === 'dark' ? 'rgba(255,255,255,0.75)' : '#616161';

  return (
    <Box
      data-pres-zoom-controls
      sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.15, flexShrink: 0 }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
        <span>
          <IconButton
            size="small"
            disabled={zoom <= PRESENT_ZOOM_MIN}
            onClick={() => onZoomChange(presentZoomOut(zoom))}
            onPointerDown={(e) => {
              if (e.pointerType === 'pen') {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
            onPointerUp={(e) => {
              if (e.pointerType !== 'pen' || zoom <= PRESENT_ZOOM_MIN) return;
              e.preventDefault();
              e.stopPropagation();
              onZoomChange(presentZoomOut(zoom));
            }}
            sx={btnSx}
            aria-label="Herauszoomen"
          >
            <ZoomOutIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </span>
      {!compact && (
        <Typography
          component="span"
          sx={{
            fontSize: 10,
            fontWeight: 700,
            color: labelColor,
            minWidth: 34,
            textAlign: 'center',
            userSelect: 'none',
            px: 0.25,
          }}
        >
          {presentZoomLabel(zoom)}
        </Typography>
      )}
        <span>
          <IconButton
            size="small"
            disabled={zoom >= PRESENT_ZOOM_MAX}
            onClick={() => onZoomChange(presentZoomIn(zoom))}
            onPointerDown={(e) => {
              if (e.pointerType === 'pen') {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
            onPointerUp={(e) => {
              if (e.pointerType !== 'pen' || zoom >= PRESENT_ZOOM_MAX) return;
              e.preventDefault();
              e.stopPropagation();
              onZoomChange(presentZoomIn(zoom));
            }}
            sx={btnSx}
            aria-label="Hineinzoomen"
          >
            <ZoomInIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </span>
        <span>
          <IconButton
            size="small"
            disabled={zoom === 1}
            onClick={() => onZoomChange(1)}
            onPointerDown={(e) => {
              if (e.pointerType === 'pen') {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
            onPointerUp={(e) => {
              if (e.pointerType !== 'pen' || zoom === 1) return;
              e.preventDefault();
              e.stopPropagation();
              onZoomChange(1);
            }}
            sx={btnSx}
            aria-label="Zoom zurücksetzen"
          >
            <ZoomResetIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </span>
    </Box>
  );
};

export default PresentationPresentZoomControls;
