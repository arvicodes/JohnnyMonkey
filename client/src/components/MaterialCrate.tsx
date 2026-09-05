/**
 * Holzkiste für Druck-/Stundenmaterial — gleicher Stil auf Stundenseite und Folien-Editor.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import UploadFileIcon from '@mui/icons-material/UploadFile';
import PrintIcon from '@mui/icons-material/Print';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import { lessonFolderPath, type SlidePrintMaterial } from '../lib/presentationDeck';
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

function isPrintableLessonFile(name: string): boolean {
  const n = (name || '').trim();
  if (!n || n.startsWith('~$')) return false;
  if (isLessonPresentationSystemFile(n)) return false;
  if (isPptxImportExtractedAssetFile(n)) return false;
  return true;
}

function collectDroppedFiles(dt: DataTransfer | null): File[] {
  if (!dt) return [];
  const fromFiles = Array.from(dt.files || []);
  if (fromFiles.length) return fromFiles.filter((f) => f && f.size >= 0 && f.name);
  const out: File[] = [];
  for (const item of Array.from(dt.items || [])) {
    if (item.kind !== 'file') continue;
    const f = item.getAsFile();
    if (f && f.name) out.push(f);
  }
  return out;
}

async function uploadFileToLessonFolder(
  file: File,
  lessonPath: string,
): Promise<{ path: string; name: string } | null> {
  const folder = lessonFolderPath(lessonPath);
  if (!folder) return null;
  const safeBase = (file.name || 'datei').replace(/[^\w.\-äöüÄÖÜß ()+-]+/gi, '_');
  const named = new File([file], safeBase, { type: file.type || 'application/octet-stream' });
  const formData = new FormData();
  formData.append('file', named);
  formData.append('targetPath', folder);
  const res = await fetch('/api/file-system-paths/save-file', {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      typeof (err as { error?: string }).error === 'string'
        ? (err as { error: string }).error
        : 'Upload fehlgeschlagen',
    );
  }
  const data = (await res.json()) as { path?: string; filename?: string };
  if (data.path && typeof data.path === 'string' && data.path.trim()) {
    const path = data.path.replace(/\\/g, '/');
    return { path, name: path.split('/').pop() || named.name };
  }
  const name = (data.filename || named.name || 'datei').replace(/\\/g, '/');
  return { path: `${folder}/${name.split('/').pop()}`, name: name.split('/').pop() || named.name };
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
  title: _unusedTitle = 'Druckmaterial',
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
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);

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

  const addFile = (path: string, nameHint?: string, skipNotePrompt = false) => {
    const norm = path.replace(/\\/g, '/');
    if (!norm) return;
    if (files.some((f) => (f.path || '').replace(/\\/g, '/') === norm)) {
      onMessage?.('Datei ist bereits in der Kiste.');
      return;
    }
    const name = (nameHint || path.split('/').pop() || 'Datei').trim();
    let note = '';
    if (!skipNotePrompt) {
      const noteRaw = window.prompt(
        `Angabe zu „${name}“ (z. B. 50 × A4 gedruckt) — leer lassen für nur Dateiname:`,
        '',
      );
      if (noteRaw === null) return;
      note = noteRaw.trim();
    }
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

  const uploadComputerFiles = useCallback(
    async (incoming: File[]) => {
      if (!lessonPath) {
        onMessage?.('Kein Stundenordner — Speichern der Stunde prüfen.');
        return;
      }
      const usable = incoming.filter((f) => f && f.name && !f.name.startsWith('.'));
      if (!usable.length) {
        onMessage?.('Keine Dateien erkannt.');
        return;
      }
      setUploading(true);
      onMessage?.(
        usable.length === 1
          ? `„${usable[0].name}“ wird hochgeladen…`
          : `${usable.length} Dateien werden hochgeladen…`,
      );
      try {
        const added: SlidePrintMaterial[] = [];
        const existing = new Set(files.map((f) => (f.path || '').replace(/\\/g, '/')));
        for (const file of usable) {
          const saved = await uploadFileToLessonFolder(file, lessonPath);
          if (!saved) continue;
          const norm = saved.path.replace(/\\/g, '/');
          if (existing.has(norm) || added.some((a) => a.path === norm)) continue;
          existing.add(norm);
          added.push({
            id: `pm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            path: norm,
            name: saved.name,
          });
        }
        if (!added.length) {
          onMessage?.('Datei(en) bereits in der Kiste oder Upload leer.');
          return;
        }
        onChange([...files, ...added]);
        onMessage?.(
          added.length === 1
            ? `„${added[0].name}“ in die Materialkiste gelegt`
            : `${added.length} Dateien in die Materialkiste gelegt`,
        );
      } catch (e) {
        onMessage?.(e instanceof Error ? e.message : 'Upload fehlgeschlagen');
      } finally {
        setUploading(false);
      }
    },
    [files, lessonPath, onChange, onMessage],
  );

  const availableToAdd = lessonFiles.filter(
    (f) =>
      !files.some((m) => (m.path || '').replace(/\\/g, '/') === (f.path || '').replace(/\\/g, '/')),
  );
  const browseParent = parentFolderPath(browsePath);
  const hasFiles = files.length > 0;

  return (
    <Box
      onDragEnter={(e) => {
        if (![...e.dataTransfer.types].includes('Files')) return;
        e.preventDefault();
        e.stopPropagation();
        dragDepthRef.current += 1;
        setDragOver(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
        if (dragDepthRef.current === 0) setDragOver(false);
      }}
      onDragOver={(e) => {
        if (![...e.dataTransfer.types].includes('Files')) return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        dragDepthRef.current = 0;
        setDragOver(false);
        const dropped = collectDroppedFiles(e.dataTransfer);
        if (dropped.length) void uploadComputerFiles(dropped);
      }}
      sx={{
        flexShrink: 0,
        borderRadius: compact ? 1.25 : 2,
        overflow: 'hidden',
        border: `1px solid ${
          dragOver ? alpha('#ffcc80', 0.85) : alpha('#8d6e63', 0.35)
        }`,
        outline: dragOver ? `2px solid ${alpha('#ffb74d', 0.95)}` : 'none',
        outlineOffset: 1,
        background: `linear-gradient(165deg, #faf8f5 0%, #f3efe8 55%, #ebe4da 100%)`,
        boxShadow: `inset 0 1px 0 ${alpha('#fff', 0.7)}`,
        mx: compact ? 0.85 : 0,
        mt: compact ? 0.35 : 0,
        mb: compact ? 0.25 : 0,
        position: 'relative',
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          const list = Array.from(e.target.files || []);
          e.target.value = '';
          if (list.length) void uploadComputerFiles(list);
        }}
      />
      {(dragOver || uploading) && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha('#3e2723', dragOver ? 0.72 : 0.55),
            pointerEvents: 'none',
            px: 1.5,
          }}
        >
          {uploading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={18} sx={{ color: '#ffe0b2' }} />
              <Typography sx={{ color: '#ffe0b2', fontSize: '0.78rem', fontWeight: 700 }}>
                Wird hochgeladen…
              </Typography>
            </Box>
          ) : (
            <Typography sx={{ color: '#ffe0b2', fontSize: '0.8rem', fontWeight: 800, textAlign: 'center' }}>
              Dateien hier ablegen
            </Typography>
          )}
        </Box>
      )}
      <Box sx={{ position: 'absolute', top: 4, right: 4, zIndex: 2 }}>
        <Tooltip title="Druckmaterial hinzufügen">
          <IconButton
            size="small"
            onClick={(e) => setAddAnchor(e.currentTarget)}
            disabled={uploading}
            sx={{
              p: 0,
              minWidth: 20,
              width: 20,
              height: 20,
              borderRadius: 0.6,
              bgcolor: alpha('#5d4037', 0.12),
              color: '#5d4037',
              fontSize: '0.78rem',
              fontWeight: 800,
              lineHeight: 1,
              border: `1px solid ${alpha('#5d4037', 0.28)}`,
              '&:hover': { bgcolor: alpha('#5d4037', 0.22), color: '#3e2723' },
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
              fileInputRef.current?.click();
            }}
            sx={{ fontSize: '0.75rem', py: 0.7, fontWeight: 700, color: '#2e7d32' }}
          >
            <UploadFileIcon sx={{ fontSize: 15, color: '#2e7d32', mr: 0.75, flexShrink: 0 }} />
            Vom Computer…
          </MenuItem>
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

      <Box
        sx={{
          px: 0.85,
          pt: 0.55,
          pb: 0.55,
          pr: 3.2,
          minHeight: compact ? 44 : 96,
          maxHeight: compact ? 140 : 280,
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
              Noch leer — Dateien hierher ziehen oder „+“ (PDF, Arbeitsblatt…)
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
