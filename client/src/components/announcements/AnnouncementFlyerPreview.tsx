import React, { useEffect, useState } from 'react';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { OpenInNew as OpenInNewIcon, Print as PrintIcon } from '@mui/icons-material';
import { flyerApiUrl, flyerPageUrl } from '../../lib/announcementPaths';

type Props = {
  folderSlug: string;
  /** Kompakte eingebettete Vorschau (Lehrer-Ansicht) */
  embedded?: boolean;
  height?: number | string;
};

export function AnnouncementFlyerPreview({ folderSlug, embedded = false, height = 520 }: Props) {
  const [status, setStatus] = useState<'loading' | 'ok' | 'missing'>('loading');
  const src = flyerApiUrl(folderSlug);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    fetch(src)
      .then((res) => {
        if (!cancelled) setStatus(res.ok ? 'ok' : 'missing');
      })
      .catch(() => {
        if (!cancelled) setStatus('missing');
      });
    return () => {
      cancelled = true;
    };
  }, [src]);

  const handlePrint = () => {
    const frame = document.getElementById(
      embedded ? `flyer-preview-${folderSlug}` : 'announcement-flyer-frame',
    ) as HTMLIFrameElement | null;
    try {
      frame?.contentWindow?.print();
    } catch {
      window.print();
    }
  };

  if (status === 'loading') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: embedded ? 3 : 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (status === 'missing') {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: embedded ? 1 : 4, textAlign: 'center' }}>
        Kein Flyer (.html) im Ordner „{folderSlug}“ gefunden.
        <br />
        Lege z. B. <strong>Flyer.html</strong> im Ordner ab.
      </Typography>
    );
  }

  const frameId = embedded ? `flyer-preview-${folderSlug}` : 'announcement-flyer-frame';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: embedded ? undefined : 1, minHeight: 0 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: embedded ? 'flex-end' : 'center',
          gap: 1,
          py: embedded ? 0.75 : 0,
          px: embedded ? 0 : 0,
          flexShrink: 0,
        }}
      >
        <Button
          size="small"
          startIcon={<PrintIcon />}
          onClick={handlePrint}
          sx={{ textTransform: 'none' }}
        >
          Drucken / PDF
        </Button>
        {embedded && (
          <Button
            size="small"
            startIcon={<OpenInNewIcon />}
            href={flyerPageUrl(folderSlug)}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ textTransform: 'none' }}
          >
            Vollbild
          </Button>
        )}
      </Box>
      <Box
        sx={{
          flex: embedded ? undefined : 1,
          border: embedded ? '1px solid #e0e0e0' : 'none',
          borderRadius: embedded ? 1 : 0,
          overflow: 'hidden',
          bgcolor: '#e8e6e1',
          boxShadow: embedded ? 'none' : { sm: '0 8px 32px rgba(0,0,0,0.1)' },
        }}
      >
        <iframe
          id={frameId}
          title={`Flyer ${folderSlug}`}
          src={src}
          style={{
            width: '100%',
            height: embedded ? height : 'calc(100vh - 96px)',
            border: 'none',
            display: 'block',
            background: '#fff',
          }}
        />
      </Box>
    </Box>
  );
}
