import React, { useEffect, useRef } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { renderAsync } from 'docx-preview';
import { announcementDocxPreviewSx, fitDocxPreviewPages } from './announcementDocxPreviewStyles';

type Props = {
  docxBlob: Blob | null;
  onRenderComplete?: () => void;
};

export const AnnouncementDocxPreview = React.forwardRef<HTMLDivElement, Props>(function AnnouncementDocxPreview(
  { docxBlob, onRenderComplete },
  ref,
) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [rendering, setRendering] = React.useState(false);

  useEffect(() => {
    const host = innerRef.current;
    if (!host || !docxBlob) {
      if (host) host.innerHTML = '';
      return;
    }

    let cancelled = false;
    setRendering(true);
    host.innerHTML = '';

    void (async () => {
      try {
        await renderAsync(docxBlob, host, undefined, {
          className: 'jm-docx-preview-page',
          inWrapper: true,
          ignoreWidth: true,
          ignoreHeight: true,
          breakPages: true,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          renderEndnotes: true,
          useBase64URL: true,
        });
        if (cancelled) return;
        fitDocxPreviewPages(host);
        onRenderComplete?.();
      } finally {
        if (!cancelled) setRendering(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [docxBlob, onRenderComplete]);

  useEffect(() => {
    const host = innerRef.current;
    if (!host || rendering) return;

    const resize = () => fitDocxPreviewPages(host);
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [docxBlob, rendering]);

  return (
    <Box ref={ref} sx={announcementDocxPreviewSx}>
      {rendering ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={28} />
        </Box>
      ) : null}
      <Box ref={innerRef} />
    </Box>
  );
});
