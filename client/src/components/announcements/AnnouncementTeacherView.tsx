import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Campaign as CampaignIcon,
  Delete as DeleteIcon,
  Link as LinkIcon,
  AutoAwesome as AutoAwesomeIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import { AnnouncementDesignPicker } from './AnnouncementDesignPicker';
import { AnnouncementImageManager } from './AnnouncementImageManager';
import type { AnnouncementStudentDisplayItem } from './AnnouncementStudentDetailContent';
import { AnnouncementTextTemplatePicker } from './AnnouncementTextTemplatePicker';
import type { AnnouncementTextTemplate } from './announcementTextTemplates';
import { htmlToPlainText } from './announcementLayouts';
import { apiDelete, apiGet, apiPost, apiPut } from '../../lib/api';
import { flyerPageUrl, flyerStudioUrl } from '../../lib/announcementPaths';
import { openAnnouncementStudentPreviewTab } from '../../lib/announcementStudentPreviewStorage';
import type { AnnouncementImage, AnnouncementLayoutId, AnnouncementLink, AnnouncementListItem } from '../../lib/announcementTypes';
import { formatAnnouncementDate } from '../../lib/announcementTypes';
import { DialogCloseIconButton, dialogCloseTitleSx } from '../ui/dialog-close-icon-button';
import { RichTextEditor, type RichTextEditorHandle } from '../ui/rich-text-editor';
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
  compactIconBtnSx,
  compactIconSx,
  overlayIconBtnSx,
  overlayIconSx,
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
  const [draftImages, setDraftImages] = useState<AnnouncementImage[]>([]);
  const [draftLayoutId, setDraftLayoutId] = useState<AnnouncementLayoutId | null>(null);
  const [draftLinks, setDraftLinks] = useState<AnnouncementLink[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const bodyEditorRef = useRef<RichTextEditorHandle>(null);

  const selected = announcements.find((a) => a.folderSlug === selectedFolderSlug) ?? null;

  const buildStudentPreviewItem = (): AnnouncementStudentDisplayItem | null => {
    if (!selected) return null;
    bodyEditorRef.current?.flush();
    return {
      title: draftTitle,
      body: bodyEditorRef.current?.getHtml() ?? draftBody,
      images: draftImages,
      layoutId: draftLayoutId,
      links: draftLinks,
      folderSlug: selected.folderSlug,
      publishedAt: selected.publishedAt || selected.updatedAt,
    };
  };

  const openStudentPreviewTab = () => {
    const item = buildStudentPreviewItem();
    if (item) openAnnouncementStudentPreviewTab(item);
  };

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
      setDraftImages([]);
      setDraftLayoutId(null);
      setDraftLinks([]);
      return;
    }
    setDraftTitle(item.title);
    setDraftBody(item.body);
    setDraftImages(item.images?.length ? [...item.images] : []);
    setDraftLayoutId(item.layoutId ?? null);
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
    bodyEditorRef.current?.flush();
    const bodyHtml = bodyEditorRef.current?.getHtml() ?? draftBody;
    setSaving(true);
    setSuccessMsg(null);
    try {
      const payload = {
        title: draftTitle.trim(),
        body: bodyHtml.trim(),
        links: draftLinks.filter((l) => l.label.trim() && l.url.trim()),
        images: draftImages.filter((img) => img.url.trim()),
        layoutId: draftLayoutId,
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

  const applyTextTemplate = (template: AnnouncementTextTemplate) => {
    bodyEditorRef.current?.flush();
    const currentTitle = draftTitle.trim();
    const currentBody = htmlToPlainText(bodyEditorRef.current?.getHtml() ?? draftBody).trim();
    if (currentTitle || currentBody) {
      if (!window.confirm(`Vorlage „${template.name}“ übernehmen? Titel und Text werden ersetzt.`)) return;
    }
    setDraftTitle(template.suggestedTitle);
    setDraftBody(template.bodyHtml);
    if (template.suggestedLayoutId) setDraftLayoutId(template.suggestedLayoutId);
    setSuccessMsg(`Vorlage „${template.name}“ übernommen — Platzhalter anpassen und speichern.`);
  };

  const uploadImages = async (files: File[]) => {
    if (!selectedFolderSlug || files.length === 0) return;
    setUploadingImage(true);
    setLoadError(null);
    try {
      const loginCode = localStorage.getItem('loginCode');
      const added: AnnouncementImage[] = [];
      for (const file of files) {
        const form = new FormData();
        form.append('image', file);
        const res = await fetch(`/api/announcements/folder/${enc(selectedFolderSlug)}/image`, {
          method: 'POST',
          headers: loginCode ? { 'x-login-code': loginCode } : {},
          body: form,
        });
        if (!res.ok) throw new Error('Bild-Upload fehlgeschlagen');
        const data = await res.json();
        if (typeof data?.url === 'string') added.push({ url: data.url });
      }
      if (added.length) {
        setDraftImages((prev) => [...prev, ...added]);
        setSuccessMsg(`${added.length} Bild${added.length === 1 ? '' : 'er'} hinzugefügt`);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Bild-Upload fehlgeschlagen');
    } finally {
      setUploadingImage(false);
    }
  };

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
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 0.75, mb: 0.5 }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: announcementPalette.heading }}>
                  {selected.title}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  J-M-Reihen/{selected.folderPath ?? `Ankündigungen & Briefe/${selected.folderSlug}`}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                <Tooltip title="Schüler:innen-Vorschau in neuem Tab">
                  <IconButton
                    onClick={openStudentPreviewTab}
                    aria-label="Schüler:innen-Vorschau in neuem Tab"
                    sx={{
                      ...compactIconBtnSx,
                      bgcolor: announcementPalette.primary,
                      color: '#fff',
                      '&:hover': { bgcolor: announcementPalette.secondary },
                    }}
                  >
                    <OpenInNewIcon sx={compactIconSx} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            <Stack spacing={1.25}>
              <TextField
                label="Titel"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                fullWidth
                size="small"
                sx={announcementFieldSx}
              />
              <AnnouncementImageManager
                images={draftImages}
                onChange={setDraftImages}
                onUpload={uploadImages}
                uploading={uploadingImage}
              />

              <AnnouncementTextTemplatePicker onApply={applyTextTemplate} />

              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, color: announcementPalette.textPrimary, display: 'block', mb: 0.5 }}>
                  Text
                </Typography>
                <RichTextEditor
                  ref={bodyEditorRef}
                  value={draftBody}
                  onChange={setDraftBody}
                  placeholder="Ankündigungstext — wird in die Designvorschläge übernommen"
                  rows={4}
                  compact
                  allowPasteImages={true}
                  showImageToolbar={true}
                  imageStorage="dataUrl"
                  showLessonMarkup={false}
                />
              </Box>

              <AnnouncementDesignPicker
                title={draftTitle}
                bodyHtml={draftBody}
                images={draftImages.map((i) => i.url)}
                selectedLayoutId={draftLayoutId}
                onSelectLayout={setDraftLayoutId}
                onApplyLayout={(html, layoutId) => {
                  setDraftBody(html);
                  setDraftLayoutId(layoutId);
                  setSuccessMsg(`Design „${layoutId}“ übernommen — bitte speichern.`);
                }}
              />

              {selected.folderSlug && (
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5, gap: 0.75 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: announcementPalette.textPrimary, flex: 1 }}>
                      Optional: HTML-Flyer im Ordner
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                      <Tooltip title="Flyer Studio">
                        <IconButton
                          component="a"
                          href={flyerStudioUrl(selected.folderSlug, draftTitle || selected.title)}
                          aria-label="Flyer Studio"
                          sx={{
                            ...compactIconBtnSx,
                            color: announcementPalette.primary,
                            bgcolor: 'rgba(0,131,143,0.08)',
                            '&:hover': { bgcolor: 'rgba(0,131,143,0.16)' },
                          }}
                        >
                          <AutoAwesomeIcon sx={compactIconSx} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Flyer-Vorschau in neuem Tab">
                        <IconButton
                          component="a"
                          href={flyerPageUrl(selected.folderSlug)}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Flyer-Vorschau in neuem Tab"
                          sx={{
                            ...compactIconBtnSx,
                            bgcolor: announcementPalette.primary,
                            color: '#fff',
                            '&:hover': { bgcolor: announcementPalette.secondary },
                          }}
                        >
                          <OpenInNewIcon sx={compactIconSx} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Flyer.html im Ordner ablegen oder im Flyer Studio erstellen — Vorschau nur im neuen Tab.
                  </Typography>
                </Box>
              )}

              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5, gap: 0.75 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: announcementPalette.textPrimary, flex: 1 }}>
                    Vordrucke / Links
                  </Typography>
                  <Tooltip title="Link hinzufügen">
                    <IconButton
                      onClick={addLink}
                      aria-label="Link hinzufügen"
                      sx={{
                        ...compactIconBtnSx,
                        bgcolor: announcementPalette.primary,
                        color: '#fff',
                        '&:hover': { bgcolor: announcementPalette.secondary },
                      }}
                    >
                      <LinkIcon sx={compactIconSx} />
                    </IconButton>
                  </Tooltip>
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
                        <Tooltip title="Link entfernen">
                          <IconButton
                            onClick={() => removeLink(index)}
                            aria-label="Link entfernen"
                            sx={{
                              ...overlayIconBtnSx,
                              mt: 0.75,
                              color: 'error.main',
                              '&:hover': { bgcolor: 'rgba(211,47,47,0.08)' },
                            }}
                          >
                            <DeleteIcon sx={overlayIconSx} />
                          </IconButton>
                        </Tooltip>
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
