import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  Box,
  CircularProgress,
  Collapse,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Description as WordIcon,
  PictureAsPdf as PdfIcon,
  Visibility as PreviewIcon,
  VisibilityOff as PreviewOffIcon,
} from '@mui/icons-material';
import {
  buildAnnouncementDocxBlob,
  exportAnnouncementDocx,
  exportAnnouncementPdfFromDocxBlob,
} from '../../lib/announcementDocumentExport';
import { AnnouncementDocxPreview } from './AnnouncementDocxPreview';
import {
  announcementHeaderIconBtnSx,
  announcementHeaderPrimaryIconBtnSx,
  announcementPalette,
  compactIconSx,
} from './announcementUi';

type ExportKind = 'word' | 'pdf';

type ProviderProps = {
  title: string;
  sourceDocxUrl: string;
  getBodyHtml: () => string;
  disabled?: boolean;
  children: React.ReactNode;
};

type ExportContextValue = {
  disabled: boolean;
  busy: boolean;
  exporting: ExportKind | null;
  previewLoading: boolean;
  previewOpen: boolean;
  docxBlob: Blob | null;
  status: { type: 'error' | 'success' | 'info'; message: string } | null;
  handleWordExport: () => Promise<void>;
  handlePdfExport: () => Promise<void>;
  handlePreviewToggle: () => Promise<void>;
};

const AnnouncementDocumentExportContext = createContext<ExportContextValue | null>(null);

function useAnnouncementDocumentExport({
  title,
  sourceDocxUrl,
  getBodyHtml,
  disabled = false,
}: Omit<ProviderProps, 'children'>): ExportContextValue {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [exporting, setExporting] = useState<ExportKind | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [docxBlob, setDocxBlob] = useState<Blob | null>(null);
  const [status, setStatus] = useState<{ type: 'error' | 'success' | 'info'; message: string } | null>(
    null,
  );

  const fileBaseName = title.trim() || 'Dokument';
  const busy = exporting !== null || previewLoading;

  useEffect(() => {
    setPreviewOpen(false);
    setDocxBlob(null);
    setStatus(null);
  }, [sourceDocxUrl]);

  const readBodyHtml = useCallback(() => {
    const html = getBodyHtml().trim();
    if (!html) throw new Error('Bitte zuerst Text eingeben.');
    return html;
  }, [getBodyHtml]);

  const loadDocxBlob = useCallback(async (): Promise<Blob> => {
    return buildAnnouncementDocxBlob({
      sourceDocxUrl,
      bodyHtml: readBodyHtml(),
    });
  }, [readBodyHtml, sourceDocxUrl]);

  const handleWordExport = useCallback(async () => {
    setExporting('word');
    setStatus({ type: 'info', message: 'Word-Datei wird erstellt …' });
    try {
      await exportAnnouncementDocx({
        sourceDocxUrl,
        bodyHtml: readBodyHtml(),
        fileName: fileBaseName,
      });
      setStatus({ type: 'success', message: 'Word-Datei wurde heruntergeladen.' });
    } catch (err) {
      setStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Word-Export fehlgeschlagen.',
      });
    } finally {
      setExporting(null);
    }
  }, [fileBaseName, readBodyHtml, sourceDocxUrl]);

  const handlePdfExport = useCallback(async () => {
    setExporting('pdf');
    setStatus({ type: 'info', message: 'PDF wird erstellt …' });
    try {
      const blob = await loadDocxBlob();
      await exportAnnouncementPdfFromDocxBlob(blob, fileBaseName);
      setStatus({ type: 'success', message: 'PDF wurde heruntergeladen.' });
      if (previewOpen) setDocxBlob(blob);
    } catch (err) {
      setStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'PDF-Export fehlgeschlagen.',
      });
    } finally {
      setExporting(null);
    }
  }, [fileBaseName, loadDocxBlob]);

  const handlePreviewToggle = useCallback(async () => {
    if (previewOpen) {
      setPreviewOpen(false);
      return;
    }

    setPreviewLoading(true);
    setStatus({ type: 'info', message: 'Vorschau wird geladen …' });
    setPreviewOpen(true);
    try {
      const blob = await loadDocxBlob();
      setDocxBlob(blob);
      setStatus(null);
    } catch (err) {
      setPreviewOpen(false);
      setDocxBlob(null);
      setStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Vorschau fehlgeschlagen.',
      });
    } finally {
      setPreviewLoading(false);
    }
  }, [loadDocxBlob, previewOpen]);

  return useMemo(
    () => ({
      disabled,
      busy,
      exporting,
      previewLoading,
      previewOpen,
      docxBlob,
      status,
      handleWordExport,
      handlePdfExport,
      handlePreviewToggle,
    }),
    [
      busy,
      disabled,
      docxBlob,
      exporting,
      handlePdfExport,
      handlePreviewToggle,
      handleWordExport,
      previewLoading,
      previewOpen,
      status,
    ],
  );
}

function useDocumentExportContext(): ExportContextValue {
  const ctx = useContext(AnnouncementDocumentExportContext);
  if (!ctx) {
    throw new Error('AnnouncementDocument-Komponenten müssen in AnnouncementDocumentProvider stehen.');
  }
  return ctx;
}

export function AnnouncementDocumentProvider({
  title,
  sourceDocxUrl,
  getBodyHtml,
  disabled = false,
  children,
}: ProviderProps) {
  const value = useAnnouncementDocumentExport({ title, sourceDocxUrl, getBodyHtml, disabled });
  return (
    <AnnouncementDocumentExportContext.Provider value={value}>{children}</AnnouncementDocumentExportContext.Provider>
  );
}

export function AnnouncementDocumentHeaderActions() {
  const { disabled, busy, exporting, handleWordExport, handlePdfExport } = useDocumentExportContext();

  return (
    <>
      <Tooltip title="Als Word herunterladen">
        <span>
          <IconButton
            onClick={() => void handleWordExport()}
            disabled={disabled || busy}
            aria-label="Word exportieren"
            sx={announcementHeaderIconBtnSx}
          >
            {exporting === 'word' ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              <WordIcon sx={compactIconSx} />
            )}
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Als PDF herunterladen">
        <span>
          <IconButton
            onClick={() => void handlePdfExport()}
            disabled={disabled || busy}
            aria-label="PDF exportieren"
            sx={announcementHeaderIconBtnSx}
          >
            {exporting === 'pdf' ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              <PdfIcon sx={compactIconSx} />
            )}
          </IconButton>
        </span>
      </Tooltip>
    </>
  );
}

export function AnnouncementDocumentPreviewToggleButton() {
  const { disabled, exporting, previewLoading, previewOpen, handlePreviewToggle } = useDocumentExportContext();

  return (
    <Tooltip title={previewOpen ? 'Word-Vorschau schließen' : 'Word-Vorschau anzeigen'}>
      <span>
        <IconButton
          onClick={() => void handlePreviewToggle()}
          disabled={disabled || exporting !== null}
          aria-label={previewOpen ? 'Vorschau schließen' : 'Vorschau öffnen'}
          sx={{
            ...(previewOpen ? announcementHeaderPrimaryIconBtnSx : announcementHeaderIconBtnSx),
          }}
        >
          {previewLoading ? (
            <CircularProgress size={18} color="inherit" />
          ) : previewOpen ? (
            <PreviewOffIcon sx={compactIconSx} />
          ) : (
            <PreviewIcon sx={compactIconSx} />
          )}
        </IconButton>
      </span>
    </Tooltip>
  );
}

export function AnnouncementDocumentPreviewSection() {
  const { previewOpen, previewLoading, docxBlob, status } = useDocumentExportContext();

  const statusColor =
    status?.type === 'error' ? 'error.main' : status?.type === 'success' ? 'success.main' : 'text.secondary';

  return (
    <>
      {status ? (
        <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: statusColor, lineHeight: 1.35 }}>
          {status.message}
        </Typography>
      ) : null}

      <Collapse in={previewOpen}>
        <Box
          sx={{
            mt: 0.75,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1.5,
            overflow: 'auto',
            maxHeight: { xs: '55vh', md: 640 },
            bgcolor: '#fff',
          }}
        >
          {previewLoading && !docxBlob ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          ) : docxBlob ? (
            <AnnouncementDocxPreview docxBlob={docxBlob} />
          ) : null}
        </Box>
      </Collapse>
    </>
  );
}
