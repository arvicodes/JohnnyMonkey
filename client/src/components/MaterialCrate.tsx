/**
 * Holzkiste für Druck-/Stundenmaterial — gleicher Stil auf Stundenseite und Folien-Editor.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
  Button,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import DescriptionIcon from '@mui/icons-material/Description';
import FolderIcon from '@mui/icons-material/Folder';
import PrintIcon from '@mui/icons-material/Print';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import type { SlidePrintMaterial } from '../lib/presentationDeck';
import {
  defaultBrowseStartPath,
  fetchFolderBrowseListing,
  fetchLessonFolderLinkableFiles,
  lessonFileDisplayLabel,
  parentFolderPath,
  PRESENTATION_FILE_BROWSER_ROOT,
  presentationLessonFileHref,
  type LessonFolderFsItem,
} from '../lib/presentationLessonFileLink';
import {
  isLessonPresentationSystemFile,
  isPptxImportExtractedAssetFile,
} from '../lib/presentationLessonAssets';
import { DialogCloseIconButton, dialogCloseTitleSx } from './ui/dialog-close-icon-button';

export const MATERIAL_CRATE_BROWN = '#6d4c41';

function CrateSkullIcon() {
  return (
    <Box
      component="svg"
      viewBox="0 0 24 24"
      sx={{ width: 15, height: 15, display: 'block', opacity: 0.9 }}
      aria-hidden
    >
      <g fill="#efebe9">
        <ellipse cx="12" cy="8.2" rx="5.2" ry="4.6" />
        <path d="M8.6 11.2c.7 1.6 1.9 2.5 3.4 2.5s2.7-.9 3.4-2.5H8.6z" />
        <circle cx="9.7" cy="7.8" r="1.15" fill="#4e342e" />
        <circle cx="14.3" cy="7.8" r="1.15" fill="#4e342e" />
        <path d="M11.2 10.1h1.6v1.35c0 .35-.25.55-.8.55s-.8-.2-.8-.55V10.1z" fill="#4e342e" />
        <rect x="10.2" y="13.5" width="1.15" height="2.1" rx="0.35" />
        <rect x="12.65" y="13.5" width="1.15" height="2.1" rx="0.35" />
        <g transform="rotate(-38 12 18)">
          <rect x="3.2" y="17.15" width="17.6" height="1.7" rx="0.85" />
          <circle cx="3.5" cy="18" r="1.55" />
          <circle cx="20.5" cy="18" r="1.55" />
        </g>
        <g transform="rotate(38 12 18)">
          <rect x="3.2" y="17.15" width="17.6" height="1.7" rx="0.85" />
          <circle cx="3.5" cy="18" r="1.55" />
          <circle cx="20.5" cy="18" r="1.55" />
        </g>
      </g>
    </Box>
  );
}

function isPrintableLessonFile(name: string): boolean {
  const n = (name || '').trim();
  if (!n || n.startsWith('~$')) return false;
  if (isLessonPresentationSystemFile(n)) return false;
  if (isPptxImportExtractedAssetFile(n)) return false;
  return true;
}

async function printMaterialFile(entry: SlidePrintMaterial): Promise<boolean> {
  try {
    const res = await fetch(
      `/api/file-system-paths/download?filePath=${encodeURIComponent(entry.path)}`,
    );
    if (!res.ok) return false;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank');
    if (!w) {
      URL.revokeObjectURL(url);
      const href = presentationLessonFileHref(entry.path, entry.name);
      if (href) window.open(href, '_blank');
      return true;
    }
    const tryPrint = () => {
      try {
        w.focus();
        w.print();
      } catch {
        /* Browser blockiert print ggf. bis PDF geladen ist */
      }
    };
    w.addEventListener('load', tryPrint);
    window.setTimeout(tryPrint, 600);
    window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
    return true;
  } catch {
    return false;
  }
}

function openMaterialFile(entry: SlidePrintMaterial) {
  const href = presentationLessonFileHref(entry.path, entry.name);
  if (href) window.open(href, '_blank', 'noopener,noreferrer');
}

type MaterialCrateProps = {
  files: SlidePrintMaterial[];
  lessonPath?: string;
  onChange: (next: SlidePrintMaterial[]) => void;
  onMessage?: (text: string) => void;
  title?: string;
  compact?: boolean;
};

const MaterialCrate: React.FC<MaterialCrateProps> = ({
  files,
  lessonPath,
  onChange,
  onMessage,
  title = 'Druckmaterial',
  compact = true,
}) => {
  const [addAnchor, setAddAnchor] = useState<null | HTMLElement>(null);
  const [lessonFiles, setLessonFiles] = useState<LessonFolderFsItem[]>([]);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [browsePath, setBrowsePath] = useState(PRESENTATION_FILE_BROWSER_ROOT);
  const [browseFolders, setBrowseFolders] = useState<LessonFolderFsItem[]>([]);
  const [browseFiles, setBrowseFiles] = useState<LessonFolderFsItem[]>([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseError, setBrowseError] = useState<string | null>(null);

  const loadLessonFiles = useCallback(async () => {
    if (!lessonPath) {
      setLessonFiles([]);
      return;
    }
    try {
      const all = await fetchLessonFolderLinkableFiles(lessonPath);
      setLessonFiles(all.filter((f) => isPrintableLessonFile(f.name)));
    } catch {
      setLessonFiles([]);
    }
  }, [lessonPath]);

  useEffect(() => {
    if (addAnchor) void loadLessonFiles();
  }, [addAnchor, loadLessonFiles]);

  useEffect(() => {
    if (!browseOpen) return undefined;
    let cancelled = false;
    setBrowseLoading(true);
    setBrowseError(null);
    void fetchFolderBrowseListing(browsePath)
      .then((listing) => {
        if (cancelled) return;
        setBrowseFolders(listing.folders);
        setBrowseFiles(listing.files.filter((f) => isPrintableLessonFile(f.name)));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setBrowseFolders([]);
        setBrowseFiles([]);
        setBrowseError(err instanceof Error ? err.message : 'Ordner konnte nicht geladen werden.');
      })
      .finally(() => {
        if (!cancelled) setBrowseLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [browseOpen, browsePath]);

  const addFile = (path: string, nameHint?: string) => {
    const norm = path.replace(/\\/g, '/');
    if (!norm) return;
    if (files.some((f) => (f.path || '').replace(/\\/g, '/') === norm)) {
      onMessage?.('Datei ist bereits in der Kiste.');
      return;
    }
    const name = (nameHint || path.split('/').pop() || 'Datei').trim();
    const noteRaw = window.prompt(
      `Angabe zu „${name}“ (z. B. 50 × A4 gedruckt) — leer lassen für nur Dateiname:`,
      '',
    );
    if (noteRaw === null) return;
    const note = noteRaw.trim();
    onChange([
      ...files,
      {
        id: `pm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        path: norm,
        name,
        ...(note ? { note } : {}),
      },
    ]);
  };

  const availableToAdd = lessonFiles.filter(
    (f) =>
      !files.some((m) => (m.path || '').replace(/\\/g, '/') === (f.path || '').replace(/\\/g, '/')),
  );
  const browseParent = parentFolderPath(browsePath);
  const hasFiles = files.length > 0;

  return (
    <Box
      sx={{
        flexShrink: 0,
        borderRadius: compact ? 1.5 : 2,
        overflow: 'hidden',
        border: `1px solid ${alpha('#5d4037', 0.45)}`,
        background: `linear-gradient(180deg, ${alpha('#8d6e63', 0.92)} 0%, #6d4c41 28%, #5d4037 100%)`,
        boxShadow: `0 4px 16px ${alpha('#3e2723', 0.14)}`,
        mx: compact ? 0.85 : 0,
        mt: compact ? 0.7 : 0,
        mb: compact ? 0.35 : 0,
      }}
    >
      <Box
        sx={{
          position: 'relative',
          px: 1.2,
          pt: 0.85,
          pb: 0.75,
          background: `linear-gradient(180deg, ${alpha('#a1887f', 0.95)} 0%, #8d6e63 100%)`,
          borderBottom: `1px solid ${alpha('#3e2723', 0.35)}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, pr: 4.5 }}>
          <Box
            sx={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: alpha('#3e2723', 0.55),
              border: `1px solid ${alpha('#d7ccc8', 0.35)}`,
              flexShrink: 0,
            }}
          >
            <CrateSkullIcon />
          </Box>
          <Typography
            component="div"
            sx={{
              fontSize: '0.68rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: alpha('#efebe9', 0.95),
              lineHeight: 1.1,
            }}
          >
            {title}
          </Typography>
        </Box>
        <Box sx={{ position: 'absolute', top: 6, right: 6, zIndex: 2 }}>
          <Tooltip title="Druckmaterial hinzufügen">
            <IconButton
              size="small"
              onClick={(e) => setAddAnchor(e.currentTarget)}
              sx={{
                p: 0,
                minWidth: 22,
                width: 22,
                height: 22,
                borderRadius: 0.7,
                bgcolor: alpha('#3e2723', 0.45),
                color: alpha('#efebe9', 0.95),
                fontSize: '0.82rem',
                fontWeight: 800,
                lineHeight: 1,
                border: `1px solid ${alpha('#d7ccc8', 0.35)}`,
                '&:hover': { bgcolor: alpha('#3e2723', 0.7), color: '#fff' },
              }}
              aria-label="Druckmaterial hinzufügen"
            >
              +
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={addAnchor}
            open={Boolean(addAnchor)}
            onClose={() => setAddAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            PaperProps={{ sx: { maxHeight: 360, minWidth: 240, maxWidth: 380, mt: 0.5 } }}
          >
            <MenuItem
              onClick={() => {
                setAddAnchor(null);
                setBrowsePath(defaultBrowseStartPath(lessonPath));
                setBrowseOpen(true);
              }}
              sx={{ fontSize: '0.75rem', py: 0.7, fontWeight: 700, color: '#ef6c00' }}
            >
              <FolderIcon sx={{ fontSize: 15, color: '#ef6c00', mr: 0.75, flexShrink: 0 }} />
              Anderer Ordner…
            </MenuItem>
            <MenuItem disabled sx={{ fontSize: '0.68rem', opacity: 1, fontWeight: 700, color: '#90a4ae' }}>
              Stundenordner
            </MenuItem>
            {availableToAdd.length === 0 ? (
              <MenuItem disabled sx={{ fontSize: '0.72rem' }}>
                {lessonPath ? 'Keine weiteren Dateien' : 'Kein Stundenordner'}
              </MenuItem>
            ) : (
              availableToAdd.map((f) => (
                <MenuItem
                  key={f.path}
                  onClick={() => {
                    setAddAnchor(null);
                    addFile(f.path, f.name);
                  }}
                  sx={{ fontSize: '0.75rem', py: 0.55 }}
                >
                  {f.name}
                </MenuItem>
              ))
            )}
          </Menu>
        </Box>
      </Box>

      <Box
        sx={{
          mx: 1,
          mt: 1,
          mb: 1,
          px: 1,
          py: 0.9,
          borderRadius: 1.5,
          border: `1px solid ${alpha('#5d4037', 0.18)}`,
          background: `linear-gradient(165deg, #faf8f5 0%, #f3efe8 55%, #ebe4da 100%)`,
          boxShadow: `inset 0 1px 0 ${alpha('#fff', 0.7)}`,
          minHeight: compact ? 72 : 128,
          maxHeight: compact ? 168 : 280,
          overflow: 'auto',
        }}
      >
        {hasFiles ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4 }}>
            {files.map((entry) => {
              const isPdf = /\.pdf$/i.test(entry.name);
              return (
                <Box
                  key={entry.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.4,
                    px: 0.6,
                    py: 0.35,
                    borderRadius: 1.1,
                    bgcolor: alpha('#fff', 0.72),
                    border: `1px solid ${alpha('#8d6e63', 0.22)}`,
                  }}
                >
                  <DescriptionIcon sx={{ fontSize: 14, color: '#6d4c41', flexShrink: 0 }} />
                  <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 0.45, overflow: 'hidden' }}>
                    <Typography
                      component="button"
                      type="button"
                      onClick={() => openMaterialFile(entry)}
                      title="Datei öffnen"
                      sx={{
                        all: 'unset',
                        cursor: 'pointer',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        color: '#4e342e',
                        textDecoration: 'underline',
                        textUnderlineOffset: '2px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        minWidth: 0,
                        '&:hover': { color: '#3e2723' },
                      }}
                    >
                      {entry.name}
                    </Typography>
                    {entry.note ? (
                      <Typography
                        component="span"
                        sx={{
                          fontSize: '0.65rem',
                          color: '#78909c',
                          fontWeight: 500,
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        ({entry.note})
                      </Typography>
                    ) : null}
                  </Box>
                  <Tooltip title="Öffnen">
                    <IconButton
                      size="small"
                      onClick={() => openMaterialFile(entry)}
                      sx={{ p: 0.2, width: 22, height: 22, color: '#6d4c41' }}
                    >
                      <VisibilityIcon sx={{ fontSize: 13 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={isPdf ? 'Drucken' : 'Öffnen & drucken'}>
                    <IconButton
                      size="small"
                      onClick={() => {
                        void printMaterialFile(entry).then((ok) => {
                          if (!ok) onMessage?.('Datei konnte nicht gedruckt werden.');
                        });
                      }}
                      sx={{ p: 0.2, width: 22, height: 22, color: '#6d4c41' }}
                    >
                      <PrintIcon sx={{ fontSize: 13 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Aus der Kiste nehmen">
                    <IconButton
                      size="small"
                      onClick={() => onChange(files.filter((x) => x.id !== entry.id))}
                      sx={{ p: 0.2, width: 22, height: 22, color: '#c62828' }}
                    >
                      <DeleteIcon sx={{ fontSize: 13 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              );
            })}
          </Box>
        ) : (
          <Box
            sx={{
              borderRadius: 1.25,
              border: `1px dashed ${alpha('#5d4037', 0.28)}`,
              px: 1,
              py: 0.85,
              bgcolor: alpha('#fff', 0.45),
              textAlign: 'center',
            }}
          >
            <Typography
              sx={{
                color: alpha('#5d4037', 0.8),
                fontSize: '0.7rem',
                fontStyle: 'italic',
                lineHeight: 1.35,
              }}
            >
              Noch leer — „+“ zum Laden (PDF, Arbeitsblatt…)
            </Typography>
          </Box>
        )}
      </Box>

      <Dialog open={browseOpen} onClose={() => setBrowseOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ ...dialogCloseTitleSx, fontSize: 16 }}>
          Datei aus Ordner
          <DialogCloseIconButton onClose={() => setBrowseOpen(false)} />
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
            <Tooltip title="Überordner">
              <span>
                <IconButton
                  size="small"
                  disabled={!browseParent}
                  onClick={() => browseParent && setBrowsePath(browseParent)}
                >
                  <ArrowUpwardIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </span>
            </Tooltip>
            {lessonPath ? (
              <Button
                size="small"
                onClick={() => setBrowsePath(lessonPath)}
                sx={{ textTransform: 'none', fontSize: 12 }}
              >
                Stundenordner
              </Button>
            ) : null}
            <Typography sx={{ fontSize: 12, color: '#546e7a' }} noWrap>
              {lessonFileDisplayLabel(browsePath, PRESENTATION_FILE_BROWSER_ROOT) ||
                PRESENTATION_FILE_BROWSER_ROOT}
            </Typography>
          </Box>
          {browseLoading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 2 }}>
              <CircularProgress size={18} />
              <Typography sx={{ fontSize: 13 }}>Ordner wird geladen…</Typography>
            </Box>
          ) : browseError ? (
            <Typography sx={{ fontSize: 13, color: '#c62828' }}>{browseError}</Typography>
          ) : (
            <Box sx={{ maxHeight: 320, overflow: 'auto' }}>
              {browseFolders.map((folder) => (
                <MenuItem
                  key={folder.path}
                  onClick={() => setBrowsePath(folder.path)}
                  sx={{ fontSize: 13, py: 0.6 }}
                >
                  <FolderIcon sx={{ fontSize: 16, color: '#ef6c00', mr: 1 }} />
                  {folder.name}
                </MenuItem>
              ))}
              {browseFiles.map((file) => (
                <MenuItem
                  key={file.path}
                  onClick={() => {
                    setBrowseOpen(false);
                    addFile(file.path, file.name);
                  }}
                  sx={{ fontSize: 13, py: 0.6 }}
                >
                  <DescriptionIcon sx={{ fontSize: 16, color: '#6d4c41', mr: 1 }} />
                  {file.name}
                </MenuItem>
              ))}
              {browseFolders.length === 0 && browseFiles.length === 0 ? (
                <Typography sx={{ fontSize: 13, color: '#90a4ae', px: 1, py: 1.5 }}>
                  Keine Dateien in diesem Ordner.
                </Typography>
              ) : null}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBrowseOpen(false)}>Abbrechen</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MaterialCrate;
