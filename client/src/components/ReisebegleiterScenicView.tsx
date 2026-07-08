import React, { useCallback, useEffect, useState } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { apiGet, apiPost } from '../lib/api';
import {
  ReisebegleiterDetailContent,
  type JourneyState,
} from './ReisebegleiterPanel';
import {
  glassCardSx,
  scenicFooterQuote,
  scenicFrameSx,
  scenicOverlaySx,
} from '../lib/reisebegleiterScenic';

type Props = {
  refreshKey?: number;
  compact?: boolean;
  showHeader?: boolean;
  title?: string;
  onJourneyUpdate?: () => void;
};

export default function ReisebegleiterScenicView({
  refreshKey = 0,
  compact = false,
  showHeader = true,
  title = 'Reisebegleiter',
  onJourneyUpdate,
}: Props) {
  const [state, setState] = useState<JourneyState | null>(null);
  const [loading, setLoading] = useState(true);
  const [careLoading, setCareLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet('/api/journey');
      if (res.ok) setState(await res.json());
      else setState(null);
    } catch {
      setState(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const handleCare = async () => {
    setCareLoading(true);
    try {
      const res = await apiPost('/api/journey/care');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Pflege nicht möglich');
      setState(data);
      onJourneyUpdate?.();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Pflege fehlgeschlagen');
    } finally {
      setCareLoading(false);
    }
  };

  return (
    <Box sx={scenicFrameSx(compact)}>
      <Box sx={scenicOverlaySx} />
      <Box sx={{ position: 'relative', zIndex: 1, p: compact ? 1.5 : 2 }}>
        {showHeader && (
          <Typography
            sx={{
              color: '#fff',
              fontWeight: 800,
              fontSize: compact ? '1rem' : '1.2rem',
              letterSpacing: '-0.02em',
              mb: 1.5,
              textShadow: '0 2px 8px rgba(0,0,0,0.35)',
            }}
          >
            {title}
          </Typography>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={32} sx={{ color: '#fff' }} />
          </Box>
        ) : state ? (
          <>
            <ReisebegleiterDetailContent
              state={state}
              careLoading={careLoading}
              onCare={handleCare}
              scenic
              compact={compact}
            />
            <Box sx={{ ...glassCardSx, mt: 1.5, py: 1.25, px: 1.5, textAlign: 'center' }}>
              <Typography
                sx={{
                  fontSize: compact ? '0.72rem' : '0.8rem',
                  color: 'rgba(51, 65, 85, 0.88)',
                  fontStyle: 'italic',
                  lineHeight: 1.45,
                  fontWeight: 500,
                }}
              >
                {scenicFooterQuote}
              </Typography>
            </Box>
          </>
        ) : (
          <Box sx={{ ...glassCardSx, p: 2, textAlign: 'center' }}>
            <Typography color="text.secondary" sx={{ fontSize: '0.85rem' }}>
              Reisebegleiter konnte nicht geladen werden.
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
