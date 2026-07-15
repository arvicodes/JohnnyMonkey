import React, { useCallback, useRef, useState } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import {
  Add as ZoomInIcon,
  Remove as ZoomOutIcon,
  RestartAlt as ResetZoomIcon,
} from '@mui/icons-material';
import { resolveMediaEmbed, type MediaRenderMode } from '../../lib/presentationMediaEmbed';

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.15;

interface PresentationMediaFrameProps {
  mode: MediaRenderMode;
  src: string;
  scale: number;
  allowZoom?: boolean;
  allowInteract?: boolean;
  initialZoom?: number;
  placeholder?: string;
}

const PresentationMediaFrame: React.FC<PresentationMediaFrameProps> = ({
  mode,
  src,
  scale,
  allowZoom = false,
  allowInteract = false,
  initialZoom = 1,
  placeholder = 'Link im Element einstellen (⚙)',
}) => {
  const [zoom, setZoom] = useState(initialZoom);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));

  const onPanStart = (e: React.PointerEvent) => {
    if (!allowZoom || zoom <= 1) return;
    e.stopPropagation();
    panRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPanMove = (e: React.PointerEvent) => {
    const p = panRef.current;
    if (!p) return;
    setPan({
      x: p.panX + (e.clientX - p.x),
      y: p.panY + (e.clientY - p.y),
    });
  };

  const onPanEnd = () => {
    panRef.current = null;
  };

  const changeZoom = useCallback((delta: number) => {
    setZoom((z) => {
      const next = clampZoom(Number((z + delta).toFixed(2)));
      if (next <= 1) setPan({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const resetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const resolved = resolveMediaEmbed(src);

  if (!resolved?.src) {
    return (
      <Box
        sx={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#111',
          color: 'rgba(255,255,255,0.55)',
          fontSize: `${16 * scale}px`,
          textAlign: 'center',
          px: `${12 * scale}px`,
        }}
      >
        {placeholder}
      </Box>
    );
  }

  const mediaNode =
    resolved.mode === 'video' ? (
      <Box
        component="video"
        src={resolved.src}
        controls={allowInteract}
        playsInline
        sx={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          bgcolor: '#000',
          pointerEvents: allowInteract ? 'auto' : 'none',
        }}
      />
    ) : (
      <Box
        component="iframe"
        src={resolved.src}
        title="Eingebettete Referenz"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        sx={{
          width: '100%',
          height: '100%',
          border: 0,
          bgcolor: '#fff',
          pointerEvents: allowInteract ? 'auto' : 'none',
        }}
      />
    );

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        bgcolor: '#000',
      }}
      onPointerDown={onPanStart}
      onPointerMove={onPanMove}
      onPointerUp={onPanEnd}
      onPointerCancel={onPanEnd}
    >
      <Box
        sx={{
          width: '100%',
          height: '100%',
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          transition: panRef.current ? 'none' : 'transform 0.15s ease',
        }}
      >
        {mediaNode}
      </Box>

      {allowZoom && (
        <Box
          sx={{
            position: 'absolute',
            right: `${8 * scale}px`,
            bottom: `${8 * scale}px`,
            display: 'flex',
            alignItems: 'center',
            gap: `${4 * scale}px`,
            bgcolor: 'rgba(22,24,28,0.88)',
            borderRadius: `${8 * scale}px`,
            px: `${4 * scale}px`,
            py: `${2 * scale}px`,
            border: '1px solid rgba(255,255,255,0.12)',
            pointerEvents: 'auto',
            zIndex: 3,
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <IconButton
            size="small"
            onClick={() => changeZoom(-ZOOM_STEP)}
            sx={{ color: '#fff', p: 0.4 }}
            aria-label="Verkleinern"
          >
            <ZoomOutIcon sx={{ fontSize: `${18 * scale}px` }} />
          </IconButton>
          <Typography sx={{ fontSize: `${11 * scale}px`, color: 'rgba(255,255,255,0.85)', minWidth: 36, textAlign: 'center' }}>
            {Math.round(zoom * 100)}%
          </Typography>
          <IconButton
            size="small"
            onClick={() => changeZoom(ZOOM_STEP)}
            sx={{ color: '#fff', p: 0.4 }}
            aria-label="Vergrößern"
          >
            <ZoomInIcon sx={{ fontSize: `${18 * scale}px` }} />
          </IconButton>
          <IconButton
            size="small"
            onClick={resetZoom}
            sx={{ color: '#fff', p: 0.4 }}
            aria-label="Zoom zurücksetzen"
          >
            <ResetZoomIcon sx={{ fontSize: `${16 * scale}px` }} />
          </IconButton>
        </Box>
      )}
    </Box>
  );
};

export default PresentationMediaFrame;
