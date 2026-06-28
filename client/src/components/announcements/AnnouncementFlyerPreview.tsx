import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Fullscreen as FullscreenIcon,
  OpenInNew as OpenInNewIcon,
  Print as PrintIcon,
} from '@mui/icons-material';
import { flyerApiUrl, flyerPageUrl, type FlyerPreviewMode } from '../../lib/announcementPaths';
import { folderHasFlyerHtml } from '../../lib/announcementFlyerUtils';
import { DialogCloseIconButton, dialogCloseTitleSx } from '../ui/dialog-close-icon-button';

type Props = {
  folderSlug: string;
  embedded?: boolean;
  height?: number | string;
  showFullscreenControl?: boolean;
};

export function AnnouncementFlyerPreview({
  folderSlug,
  embedded = false,
  height = 520,
  showFullscreenControl = true,
}: Props) {
  const [status, setStatus] = useState<'loading' | 'ok' | 'missing'>('loading');
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const previewMode: FlyerPreviewMode = embedded ? 'embed' : 'fullscreen';
  const src = flyerApiUrl(folderSlug, previewMode);
  const fullscreenSrc = flyerApiUrl(folderSlug, 'fullscreen');

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    void folderHasFlyerHtml(folderSlug).then((ok) => {
      if (!cancelled) setStatus(ok ? 'ok' : 'missing');
    });
    return () => {
      cancelled = true;
    };
  }, [src]);

  const frameId = embedded ? `flyer-preview-${folderSlug}` : 'announcement-flyer-frame';

  const handlePrint = (id = frameId) => {
    const frame = document.getElementById(id) as HTMLIFrameElement | null;
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
        Lege z. B. <strong>Flyer.html</strong> ab oder speichere im Flyer Studio.
      </Typography>
    );
  }

  const toolbar = (opts?: { onFullscreen?: () => void; frameId?: string; compact?: boolean }) => (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: opts?.compact ? 'flex-end' : 'center',
        flexWrap: 'wrap',
        gap: 0.75,
        py: opts?.compact ? 0.75 : 1,
        px: opts?.compact ? 0 : 1,
        flexShrink: 0,
      }}
    >
      <Button size="small" startIcon={<PrintIcon />} onClick={() => handlePrint(opts?.frameId)} sx={{ textTransform: 'none' }}>
        Drucken / PDF
      </Button>
      {opts?.onFullscreen && showFullscreenControl && (
        <Button size="small" startIcon={<FullscreenIcon />} onClick={opts.onFullscreen} sx={{ textTransform: 'none' }}>
          Vollbild
        </Button>
      )}
      {embedded && (
        <Button
          size="small"
          startIcon={<OpenInNewIcon />}
          href={flyerPageUrl(folderSlug)}
          target="_blank"
          rel="noopener noreferrer"
          sx={{ textTransform: 'none' }}
        >
          Neuer Tab
        </Button>
      )}
    </Box>
  );

  const frameBox = (frameHeight: number | string, id: string, frameSrc: string) => (
    <Box
      sx={{
        flex: embedded ? undefined : 1,
        border: embedded ? '1px solid #e0e0e0' : 'none',
        borderRadius: embedded ? 1.5 : 0,
        overflow: 'hidden',
        bgcolor: '#e8e6e1',
        boxShadow: embedded ? 'none' : { sm: '0 8px 32px rgba(0,0,0,0.1)' },
        minHeight: embedded ? frameHeight : 0,
      }}
    >
      <iframe
        id={id}
        title={`Flyer ${folderSlug}`}
        src={frameSrc}
        style={{
          width: '100%',
          height: frameHeight,
          border: 'none',
          display: 'block',
          background: '#e8e6e1',
        }}
      />
    </Box>
  );

  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'column', flex: embedded ? undefined : 1, minHeight: 0, height: '100%' }}>
        {toolbar({
          compact: embedded,
          onFullscreen: () => setFullscreenOpen(true),
          frameId,
        })}
        {frameBox(embedded ? height : 'calc(100vh - 120px)', frameId, src)}
      </Box>

      <Dialog
        fullScreen
        open={fullscreenOpen}
        onClose={() => setFullscreenOpen(false)}
        PaperProps={{ sx: { bgcolor: '#e8e6e1', display: 'flex', flexDirection: 'column' } }}
      >
        <Box
          sx={{
            ...dialogCloseTitleSx,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 1.5,
            py: 1,
            bgcolor: '#fff',
            borderBottom: '1px solid #e0e0e0',
            flexShrink: 0,
          }}
        >
          <Typography variant="subtitle2" sx={{ flex: 1, fontWeight: 700 }}>
            Flyer — {folderSlug}
          </Typography>
          <Button size="small" startIcon={<PrintIcon />} onClick={() => handlePrint('announcement-flyer-fullscreen')} sx={{ textTransform: 'none' }}>
            Drucken
          </Button>
          <Tooltip title="In neuem Tab öffnen">
            <IconButton
              component="a"
              href={flyerPageUrl(folderSlug)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="In neuem Tab öffnen"
              size="small"
            >
              <OpenInNewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <DialogCloseIconButton onClose={() => setFullscreenOpen(false)} />
        </Box>
        <DialogContent sx={{ p: 0, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          {frameBox('100%', 'announcement-flyer-fullscreen', fullscreenSrc)}
        </DialogContent>
      </Dialog>
    </>
  );
}
