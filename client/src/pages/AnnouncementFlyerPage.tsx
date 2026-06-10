import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Button, CircularProgress, IconButton, Tooltip, Typography } from '@mui/material';
import { ArrowBack as ArrowBackIcon, Print as PrintIcon } from '@mui/icons-material';
import { gitInternPathForBriefeFile, staticAssetBaseForFolder } from '../lib/announcementPaths';

const FLYER_NAMES = ['Calisthenics-Flyer.html', 'Flyer.html', 'flyer.html'];

export default function AnnouncementFlyerPage() {
  const navigate = useNavigate();
  const { folderSlug: rawSlug } = useParams<{ folderSlug: string }>();
  const folderSlug = rawSlug ? decodeURIComponent(rawSlug) : '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [html, setHtml] = useState('');

  const iframeSrcDoc = useMemo(() => {
    if (!html || !folderSlug) return '';
    const baseHref = `${window.location.origin}${staticAssetBaseForFolder(folderSlug)}`;
    const withBase = html.includes('<base ')
      ? html
      : html.replace(/<head([^>]*)>/i, `<head$1><base href="${baseHref}">`);
    return withBase;
  }, [html, folderSlug]);

  useEffect(() => {
    if (!folderSlug) {
      setError('Kein Ordner angegeben.');
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      for (const name of FLYER_NAMES) {
        const rel = `Ankündigungen & Briefe/${folderSlug}/${name}`;
        const gitPath = gitInternPathForBriefeFile(rel);
        try {
          const res = await fetch(`/api/file-system-paths/read-html?filePath=${encodeURIComponent(gitPath)}`);
          if (!res.ok) continue;
          const text = await res.text();
          if (!text.includes('<html') && !text.includes('<!DOCTYPE')) continue;
          if (!cancelled) {
            setHtml(text);
            setLoading(false);
          }
          return;
        } catch {
          /* try next */
        }
      }
      if (!cancelled) {
        setError(`Kein Flyer in „${folderSlug}“ gefunden.`);
        setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [folderSlug]);

  const handlePrint = () => {
    const frame = document.getElementById('announcement-flyer-frame') as HTMLIFrameElement | null;
    try {
      frame?.contentWindow?.print();
    } catch {
      window.print();
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#e8e6e1', display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
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
        <Tooltip title="Zurück">
          <IconButton onClick={() => navigate(-1)} aria-label="Zurück" size="small">
            <ArrowBackIcon />
          </IconButton>
        </Tooltip>
        <Typography variant="subtitle2" sx={{ flex: 1, fontWeight: 700 }}>
          Flyer — {folderSlug || '…'}
        </Typography>
        {!loading && !error && (
          <Button size="small" startIcon={<PrintIcon />} onClick={handlePrint} sx={{ textTransform: 'none' }}>
            Drucken / PDF
          </Button>
        )}
      </Box>

      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: { xs: 0, sm: 2 } }}>
        {loading && <CircularProgress />}
        {error && (
          <Box sx={{ textAlign: 'center', px: 2 }}>
            <Typography color="error" sx={{ mb: 1 }}>
              {error}
            </Typography>
            <Button variant="outlined" onClick={() => navigate('/ankuendigungen')} sx={{ textTransform: 'none' }}>
              Zurück zu Ankündigungen
            </Button>
          </Box>
        )}
        {!loading && !error && iframeSrcDoc && (
          <Box
            component="iframe"
            id="announcement-flyer-frame"
            title={`Flyer ${folderSlug}`}
            srcDoc={iframeSrcDoc}
            sx={{
              width: '100%',
              maxWidth: 900,
              height: { xs: 'calc(100vh - 56px)', sm: 'calc(100vh - 72px)' },
              border: 'none',
              bgcolor: '#fff',
              boxShadow: { sm: '0 8px 32px rgba(0,0,0,0.1)' },
            }}
          />
        )}
      </Box>
    </Box>
  );
}
