import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, CircularProgress, Dialog, Typography } from '@mui/material';

type ExamBeacon = {
  groupId: string;
  groupName?: string;
  filePath: string;
  lessonPath?: string;
  beaconId: string;
  updatedAt?: string;
};

const POLL_MS = 1500;

/**
 * Lehrer startet Prüfung → SuS bekommen ein nicht schließbares Vollbild-Overlay
 * mit der Prüfungs-HTML (überdeckt alles andere).
 */
export default function StudentLiveExamAlert({ userId }: { userId: string }) {
  const [beacon, setBeacon] = useState<ExamBeacon | null>(null);
  const [htmlUrl, setHtmlUrl] = useState<string | null>(null);
  const [loadingHtml, setLoadingHtml] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const poll = useCallback(async () => {
    if (!userId) return;
    try {
      const loginCode = localStorage.getItem('loginCode')?.trim();
      if (!loginCode) return;
      const res = await fetch('/api/learning-groups/exam-beacon/student-poll', {
        headers: { 'x-login-code': loginCode },
      });
      if (!res.ok) return;
      const data = (await res.json()) as { beacons?: ExamBeacon[] };
      const next = data.beacons?.[0] || null;
      setBeacon((prev) => {
        if (!next) return null;
        if (
          prev &&
          prev.beaconId === next.beaconId &&
          prev.filePath === next.filePath &&
          prev.groupId === next.groupId
        ) {
          return prev;
        }
        return next;
      });
    } catch {
      /* ignore */
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    void poll();
    const t = window.setInterval(() => void poll(), POLL_MS);
    return () => window.clearInterval(t);
  }, [userId, poll]);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    const load = async () => {
      if (!beacon?.filePath) {
        setHtmlUrl(null);
        setLoadError(null);
        return;
      }
      setLoadingHtml(true);
      setLoadError(null);
      try {
        const res = await fetch(
          `/api/file-system-paths/read-html?filePath=${encodeURIComponent(beacon.filePath)}`
        );
        if (!res.ok) {
          throw new Error('Prüfungsdatei konnte nicht geladen werden');
        }
        const html = await res.text();
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setHtmlUrl(objectUrl);
      } catch (e) {
        if (!cancelled) {
          setHtmlUrl(null);
          setLoadError(e instanceof Error ? e.message : 'Laden fehlgeschlagen');
        }
      } finally {
        if (!cancelled) setLoadingHtml(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [beacon?.filePath, beacon?.beaconId]);

  const open = Boolean(beacon);
  const title = useMemo(() => {
    const name = beacon?.filePath?.split('/').pop()?.replace(/\.(html|htm)$/i, '') || 'Prüfung';
    return name;
  }, [beacon?.filePath]);

  return (
    <Dialog
      open={open}
      fullScreen
      disableEscapeKeyDown
      onClose={() => {
        /* vom Lehrer beenden — SuS können nicht schließen */
      }}
      PaperProps={{
        sx: {
          m: 0,
          bgcolor: '#0d1117',
          backgroundImage: 'none',
        },
      }}
    >
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: '#0d1117',
        }}
      >
        <Box
          sx={{
            flexShrink: 0,
            px: 1.5,
            py: 0.75,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            bgcolor: '#b71c1c',
            color: '#fff',
          }}
        >
          <Box
            component="span"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 22,
              height: 22,
              borderRadius: 0.75,
              bgcolor: 'rgba(255,255,255,0.2)',
              fontWeight: 900,
              fontSize: '0.8rem',
            }}
          >
            P
          </Box>
          <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', flex: 1, minWidth: 0 }} noWrap>
            {title}
            {beacon?.groupName ? ` · ${beacon.groupName}` : ''}
          </Typography>
          <Typography sx={{ fontSize: '0.7rem', opacity: 0.9, fontWeight: 600 }}>
            Gestartet — bitte bearbeiten und abgeben
          </Typography>
        </Box>

        <Box sx={{ flex: 1, minHeight: 0, position: 'relative', bgcolor: '#fff' }}>
          {loadingHtml && (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                bgcolor: '#fff',
                zIndex: 2,
              }}
            >
              <CircularProgress size={28} />
              <Typography color="text.secondary">Prüfung wird geladen…</Typography>
            </Box>
          )}
          {loadError && (
            <Box sx={{ p: 3 }}>
              <Typography color="error">{loadError}</Typography>
            </Box>
          )}
          {htmlUrl && !loadError && (
            <Box
              component="iframe"
              title={title}
              src={htmlUrl}
              sx={{
                border: 0,
                width: '100%',
                height: '100%',
                display: 'block',
              }}
            />
          )}
        </Box>
      </Box>
    </Dialog>
  );
}
