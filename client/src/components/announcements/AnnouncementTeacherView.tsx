import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Campaign as CampaignIcon,
  Delete as DeleteIcon,
  Link as LinkIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { AnnouncementFlyerPreview } from './AnnouncementFlyerPreview';
import { flyerPageUrl } from '../../lib/announcementPaths';
import { apiDelete, apiGet, apiPost, apiPut } from '../../lib/api';
import type { AnnouncementLink, AnnouncementListItem } from '../../lib/announcementTypes';
import { formatAnnouncementDate } from '../../lib/announcementTypes';
import { DialogCloseIconButton, dialogCloseTitleSx } from '../ui/dialog-close-icon-button';
import {
  announcementActionBarSx,
  announcementBtnDangerSx,
  announcementBtnDraftSx,
  announcementBtnPublishSx,
  announcementEditorCardSx,
  announcementFieldSx,
  announcementPalette,
  announcementStatusChipSx,
  announcementTileGridSx,
  announcementTileSx,
} from './announcementUi';

const cardPaddingSx = { p: { xs: 1, sm: 1.25 }, '&:last-child': { pb: { xs: 1, sm: 1.25 } } };

const emptyLink = (): AnnouncementLink => ({ label: '', url: '' });

const enc = (slug: string) => encodeURIComponent(slug);

async function readApiError(response: Response, fallback: string): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };
    if (typeof data?.error === 'string' && data.error.trim()) return data.error.trim();
  } catch {
    /* ignore */
  }
  return fallback;
}

export function AnnouncementTeacherView() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [announcements, setAnnouncements] = useState<AnnouncementListItem[]>([]);
  const [selectedFolderSlug, setSelectedFolderSlug] = useState<string | null>(null);

  const [draftTitle, setDraftTitle] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [draftLinks, setDraftLinks] = useState<AnnouncementLink[]>([]);

  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const selected = announcements.find((a) => a.folderSlug === selectedFolderSlug) ?? null;

  const loadList = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await apiGet('/api/announcements/list');
      if (!response.ok) {
        throw new Error(await readApiError(response, 'Laden fehlgeschlagen'));
      }
      const data = await response.json();
      setAnnouncements(Array.isArray(data?.announcements) ? data.announcements : []);
      setLoadError(null);
    } catch {
      if (!silent) setLoadError('Ankündigungen konnten nicht geladen werden.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList(false);
  }, [loadList]);

  const resetDraft = (item?: AnnouncementListItem | null) => {
    if (!item) {
      setDraftTitle('');
      setDraftBody('');
      setDraftLinks([]);
      return;
    }
    setDraftTitle(item.title);
    setDraftBody(item.body);
    setDraftLinks(item.links?.length ? [...item.links] : []);
  };

  const selectAnnouncement = (item: AnnouncementListItem) => {
    setSelectedFolderSlug(item.folderSlug ?? null);
    resetDraft(item);
    setSuccessMsg(null);
  };

  const handleCreateFolder = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    setLoadError(null);
    setSuccessMsg(null);
    try {
      const response = await apiPost('/api/announcements/folder/create', {
        title: newTitle.trim(),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, 'Anlegen fehlgeschlagen'));
      }
      const data = await response.json();
      const created = data?.announcement as AnnouncementListItem | undefined;
      await loadList(true);
      setNewDialogOpen(false);
      setNewTitle('');
      if (created?.folderSlug) {
        setSelectedFolderSlug(created.folderSlug);
        resetDraft(created);
      }
      setSuccessMsg('Ordner angelegt — Material kann jetzt hinein.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Neue Ankündigung konnte nicht angelegt werden.';
      setLoadError(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleSave = async () => {
    if (!selectedFolderSlug || !draftTitle.trim()) return;
    setSaving(true);
    setSuccessMsg(null);
    try {
      const payload = {
        title: draftTitle.trim(),
        body: draftBody.trim(),
        links: draftLinks.filter((l) => l.label.trim() && l.url.trim()),
      };
      const response = await apiPut(`/api/announcements/folder/${enc(selectedFolderSlug)}`, payload);
      if (!response.ok) throw new Error('Speichern fehlgeschlagen');
      await loadList(true);
      setSuccessMsg('Gespeichert.');
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!selectedFolderSlug) return;
    setPublishing(true);
    setLoadError(null);
    setSuccessMsg(null);
    try {
      const unpublish = Boolean(selected?.isPublished);
      const response = await apiPost(`/api/announcements/folder/${enc(selectedFolderSlug)}/publish`, {
        unpublish,
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, 'Freigabe fehlgeschlagen'));
      }
      await loadList(true);
      setSuccessMsg(unpublish ? 'Zurückgezogen.' : 'Veröffentlicht.');
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Freigabe fehlgeschlagen.');
    } finally {
      setPublishing(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedFolderSlug) return;
    if (!window.confirm('Ankündigung und Ordner wirklich löschen?')) return;
    setLoadError(null);
    try {
      const response = await apiDelete(`/api/announcements/folder/${enc(selectedFolderSlug)}`);
      if (!response.ok) {
        throw new Error(await readApiError(response, 'Löschen fehlgeschlagen'));
      }
      setSelectedFolderSlug(null);
      resetDraft(null);
      await loadList(true);
      setSuccessMsg('Gelöscht.');
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Löschen fehlgeschlagen.');
    }
  };

  const updateLink = (index: number, field: keyof AnnouncementLink, value: string) => {
    setDraftLinks((prev) => prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)));
  };

  const addLink = () => setDraftLinks((prev) => [...prev, emptyLink()]);
  const removeLink = (index: number) => setDraftLinks((prev) => prev.filter((_, i) => i !== index));

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Stack spacing={1.5}>
      {loadError && (
        <Typography variant="body2" color="error" sx={{ textAlign: 'center' }}>
          {loadError}
        </Typography>
      )}
      {successMsg && (
        <Typography variant="body2" color="success.main" sx={{ textAlign: 'center' }}>
          {successMsg}
        </Typography>
      )}

      <Box sx={announcementTileGridSx}>
        <Box
          onClick={() => setNewDialogOpen(true)}
          sx={announcementTileSx(false, true)}
          role="button"
          aria-label="Neue Ankündigung anlegen"
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
            <AddIcon sx={{ fontSize: 36, color: announcementPalette.primary }} />
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 800, textAlign: 'center', color: announcementPalette.primary }}>
            Neue Ankündigung
          </Typography>
        </Box>

        {announcements.map((item) => (
          <Box
            key={item.folderSlug ?? item.id}
            onClick={() => selectAnnouncement(item)}
            sx={announcementTileSx(selectedFolderSlug === item.folderSlug)}
            role="button"
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 0.5 }}>
              <CampaignIcon sx={{ fontSize: 22, color: announcementPalette.primary, mt: 0.25 }} />
              <Chip
                size="small"
                label={item.isPublished ? 'Live' : 'Entwurf'}
                sx={announcementStatusChipSx(item.isPublished)}
              />
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 800, lineHeight: 1.3, flex: 1 }}>
              {item.title}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatAnnouncementDate(item.updatedAt)}
            </Typography>
          </Box>
        ))}
      </Box>

      {selected && (
        <Card elevation={0} sx={announcementEditorCardSx}>
          <CardContent sx={cardPaddingSx}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: announcementPalette.heading, mb: 0.5 }}>
              {selected.title}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              J-M-Reihen/{selected.folderPath ?? `Ankündigungen & Briefe/${selected.folderSlug}`}
            </Typography>

            <Stack spacing={1.25}>
              <TextField
                label="Titel"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                fullWidth
                size="small"
                sx={announcementFieldSx}
              />
              <TextField
                label="Inhalt / Hinweis"
                value={draftBody}
                onChange={(e) => setDraftBody(e.target.value)}
                fullWidth
                multiline
                minRows={4}
                size="small"
                sx={announcementFieldSx}
              />

              {selected.folderSlug && (
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: announcementPalette.textPrimary }}>
                      Flyer-Vorschau
                    </Typography>
                    <Button
                      size="small"
                      startIcon={<VisibilityIcon sx={{ fontSize: 16 }} />}
                      href={flyerPageUrl(selected.folderSlug)}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ textTransform: 'none', fontSize: '0.72rem', minHeight: 28 }}
                    >
                      Vollbild öffnen
                    </Button>
                  </Box>
                  <AnnouncementFlyerPreview folderSlug={selected.folderSlug} embedded height={480} />
                </Box>
              )}

              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: announcementPalette.textPrimary }}>
                    Vordrucke / Links
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<LinkIcon sx={{ fontSize: 16 }} />}
                    onClick={addLink}
                    sx={{ textTransform: 'none', fontSize: '0.72rem', minHeight: 28 }}
                  >
                    Link hinzufügen
                  </Button>
                </Box>
                {draftLinks.length === 0 ? (
                  <Typography variant="caption" color="text.secondary">
                    Dateien im Ordner ablegen und hier verlinken (z. B. Flyer.html)
                  </Typography>
                ) : (
                  <Stack spacing={0.75}>
                    {draftLinks.map((link, index) => (
                      <Box
                        key={index}
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr auto',
                          gap: 0.5,
                          alignItems: 'start',
                        }}
                      >
                        <TextField
                          label="Bezeichnung"
                          value={link.label}
                          onChange={(e) => updateLink(index, 'label', e.target.value)}
                          size="small"
                          sx={announcementFieldSx}
                        />
                        <TextField
                          label="URL"
                          value={link.url}
                          onChange={(e) => updateLink(index, 'url', e.target.value)}
                          size="small"
                          sx={announcementFieldSx}
                        />
                        <IconButton size="small" onClick={() => removeLink(index)} aria-label="Link entfernen">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Box>

              <Box sx={announcementActionBarSx}>
                <Button onClick={handleSave} disabled={saving || !draftTitle.trim()} sx={announcementBtnDraftSx}>
                  {saving ? '…' : 'Speichern'}
                </Button>
                <Button
                  onClick={handlePublish}
                  disabled={publishing || !draftTitle.trim()}
                  sx={announcementBtnPublishSx}
                >
                  {publishing ? '…' : selected.isPublished ? 'Zurückziehen' : 'Veröffentlichen'}
                </Button>
                <Button onClick={handleDelete} sx={announcementBtnDangerSx}>
                  Löschen
                </Button>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}

      <Dialog open={newDialogOpen} onClose={() => setNewDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={dialogCloseTitleSx}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            Neue Ankündigung
          </Typography>
          <DialogCloseIconButton onClose={() => setNewDialogOpen(false)} />
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Es wird ein neuer Ordner unter „Ankündigungen &amp; Briefe“ angelegt. Flyer, PDFs und andere Dateien
            legst du dort ab.
          </Typography>
          <TextField
            autoFocus
            label="Titel der Ankündigung"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            fullWidth
            size="small"
            sx={announcementFieldSx}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newTitle.trim()) void handleCreateFolder();
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button onClick={() => setNewDialogOpen(false)} sx={{ textTransform: 'none' }}>
            Abbrechen
          </Button>
          <Button
            variant="contained"
            disabled={creating || !newTitle.trim()}
            onClick={() => void handleCreateFolder()}
            sx={{ textTransform: 'none', bgcolor: announcementPalette.primary }}
          >
            {creating ? 'Wird angelegt…' : 'Ordner anlegen'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
