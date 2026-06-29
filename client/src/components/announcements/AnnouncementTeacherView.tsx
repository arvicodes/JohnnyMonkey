import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  Checkbox,
  FormControlLabel,
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
  AutoAwesome as AutoAwesomeIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import { AnnouncementDesignPicker } from './AnnouncementDesignPicker';
import {
  AnnouncementDocumentHeaderActions,
  AnnouncementDocumentPreviewSection,
  AnnouncementDocumentPreviewToggleButton,
  AnnouncementDocumentProvider,
} from './AnnouncementDocumentPanel';
import { AnnouncementImageManager } from './AnnouncementImageManager';
import type { AnnouncementStudentDisplayItem } from './AnnouncementStudentDetailContent';
import { AnnouncementTypePicker } from './AnnouncementTypePicker';
import { findAnnouncementTemplate, isProtokollTemplate, usesVflLetterhead, type AnnouncementTextTemplate } from './announcementTextTemplates';
import { velProtokollDisplaySx } from './vereinProtokollStyles';
import { ensureVereinProtokollHeader } from './vereinProtokollAssets';
import type { AnnouncementKind, AnnouncementRealm } from './announcementKinds';
import {
  composeStoredBodyFromEditor,
  extractEditorHtmlFromStoredBody,
  extractLayoutIdFromStoredBody,
  htmlToPlainText,
} from './announcementLayouts';
import { apiDelete, apiGet, apiPost, apiPut } from '../../lib/api';
import { flyerPageUrl, flyerStudioUrl } from '../../lib/announcementPaths';
import { openAnnouncementStudentPreviewTab } from '../../lib/announcementStudentPreviewStorage';
import type { AnnouncementImage, AnnouncementLayoutId, AnnouncementLink, AnnouncementListItem } from '../../lib/announcementTypes';
import { formatAnnouncementDate } from '../../lib/announcementTypes';
import { DialogCloseIconButton, dialogCloseTitleSx } from '../ui/dialog-close-icon-button';
import { RichTextEditor, type RichTextEditorHandle } from '../ui/rich-text-editor';
import {
  announcementBtnDangerSx,
  announcementBtnDraftSx,
  announcementBtnPublishSx,
  announcementActionButtonGroupSx,
  announcementEditorTopButtonGroupSx,
  announcementEditorTopActionsSx,
  announcementEditorCardSx,
  announcementFieldSx,
  announcementHeaderPrimaryIconBtnSx,
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
  const [draftRealm, setDraftRealm] = useState<AnnouncementRealm>('verein');
  const [draftKind, setDraftKind] = useState<AnnouncementKind>('protokoll');
  const [withoutStandardText, setWithoutStandardText] = useState(false);

  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [editorSeedKey, setEditorSeedKey] = useState(0);
  const bodyEditorRef = useRef<RichTextEditorHandle>(null);

  const selected = announcements.find((a) => a.folderSlug === selectedFolderSlug) ?? null;
  const activeTemplate = findAnnouncementTemplate(draftRealm, draftKind);

  const getEditorHtml = () => {
    bodyEditorRef.current?.flush();
    return bodyEditorRef.current?.getHtml() ?? draftBody;
  };

  const buildStoredBody = () =>
    composeStoredBodyFromEditor({
      editorHtml: getEditorHtml(),
      layoutId: draftLayoutId,
      images: draftImages.map((img) => img.url).filter(Boolean),
    });

  const buildStudentPreviewItem = (): AnnouncementStudentDisplayItem | null => {
    if (!selected) return null;
    return {
      title: draftTitle,
      body: buildStoredBody(),
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

  const prepareProtokollEditorHtml = useCallback((html: string, template?: AnnouncementTextTemplate | null) => {
    if (!isProtokollTemplate(template ?? activeTemplate)) return html;
    return ensureVereinProtokollHeader(html);
  }, [activeTemplate]);

  const applyTextTemplate = useCallback(
    (template: AnnouncementTextTemplate, options?: { replaceTitle?: boolean }) => {
      if (options?.replaceTitle !== false) {
        setDraftTitle(template.suggestedTitle);
      }
      setDraftBody(
        isProtokollTemplate(template) ? ensureVereinProtokollHeader(template.bodyHtml) : template.bodyHtml,
      );
      if (template.suggestedLayoutId) setDraftLayoutId(template.suggestedLayoutId);
      setEditorSeedKey((key) => key + 1);
    },
    [],
  );

  const resetDraft = (
    item?: AnnouncementListItem | null,
    options?: { realm?: AnnouncementRealm; kind?: AnnouncementKind },
  ) => {
    const realm = options?.realm ?? draftRealm;
    const kind = options?.kind ?? draftKind;

    if (!item) {
      setDraftTitle('');
      setDraftBody('');
      setDraftImages([]);
      setDraftLayoutId(null);
      setDraftLinks([]);
      setEditorSeedKey((key) => key + 1);
      return;
    }

    const editorHtml = extractEditorHtmlFromStoredBody(item.body);
    const bodyEmpty = !htmlToPlainText(editorHtml).trim();
    const template = findAnnouncementTemplate(realm, kind);

    setDraftTitle(item.title);
    setDraftImages(item.images?.length ? [...item.images] : []);
    setDraftLayoutId(item.layoutId ?? extractLayoutIdFromStoredBody(item.body));
    setDraftLinks(item.links?.length ? [...item.links] : []);

    if (bodyEmpty && template && !withoutStandardText) {
      if (!item.title.trim()) setDraftTitle(template.suggestedTitle);
      setDraftBody(
        isProtokollTemplate(template) ? ensureVereinProtokollHeader(template.bodyHtml) : template.bodyHtml,
      );
    } else if (bodyEmpty && withoutStandardText) {
      setDraftBody('');
    } else {
      setDraftBody(prepareProtokollEditorHtml(editorHtml, template));
    }
    setEditorSeedKey((key) => key + 1);
  };

  const selectAnnouncement = (item: AnnouncementListItem) => {
    const realm: AnnouncementRealm = 'verein';
    const kind: AnnouncementKind = 'protokoll';
    setSelectedFolderSlug(item.folderSlug ?? null);
    setDraftRealm(realm);
    setDraftKind(kind);
    resetDraft(item, { realm, kind });
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
        setDraftRealm('verein');
        setDraftKind('protokoll');
        resetDraft(created, { realm: 'verein', kind: 'protokoll' });
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
        body: buildStoredBody().trim(),
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

  const removeLink = (index: number) => setDraftLinks((prev) => prev.filter((_, i) => i !== index));

  const applyAnnouncementKind = (realm: AnnouncementRealm, kind: AnnouncementKind) => {
    const template = findAnnouncementTemplate(realm, kind);
    const currentHtml = bodyEditorRef.current?.getHtml() ?? draftBody;
    const currentTitle = draftTitle.trim();
    const currentBody = htmlToPlainText(currentHtml).trim();
    const sameSelection = realm === draftRealm && kind === draftKind;

    if (sameSelection) {
      if (withoutStandardText || !template || currentBody) return;
      applyTextTemplate(template, { replaceTitle: !currentTitle });
      setSuccessMsg('Vorlage geladen.');
      return;
    }

    const hasContent = Boolean(currentTitle || currentBody);

    setDraftRealm(realm);
    setDraftKind(kind);

    if (withoutStandardText) {
      if (hasContent) setDraftTitle('');
      setDraftBody('');
      setEditorSeedKey((key) => key + 1);
      setSuccessMsg(null);
      return;
    }

    if (template) {
      applyTextTemplate(template);
      setSuccessMsg('Vorlage geladen.');
    } else {
      setSuccessMsg(null);
    }
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
          {(() => {
            const hasDocTemplate = Boolean(activeTemplate?.sourceDocxUrl);
            const editorAllowsInlineImages = withoutStandardText || !hasDocTemplate;
            const editorContent = (
              <CardContent sx={{ ...cardPaddingSx, py: { xs: 0.75, sm: 1 } }}>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', lg: 'row' },
                    alignItems: { xs: 'stretch', lg: 'flex-start' },
                    justifyContent: 'space-between',
                    gap: { xs: 0.75, sm: 1 },
                    mb: 0.75,
                    minWidth: 0,
                    overflow: 'visible',
                  }}
                >
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <AnnouncementTypePicker
                      realm={draftRealm}
                      kind={draftKind}
                      onSelect={applyAnnouncementKind}
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          size="small"
                          checked={withoutStandardText}
                          onChange={(e) => setWithoutStandardText(e.target.checked)}
                        />
                      }
                      label={
                        <Typography variant="caption" sx={{ fontSize: '0.72rem', lineHeight: 1.2 }}>
                          Ohne Standardtext
                        </Typography>
                      }
                      sx={{ mt: 0.35, ml: 0, mr: 0, alignItems: 'center' }}
                    />
                  </Box>

                  <Box sx={announcementEditorTopActionsSx}>
                    <Stack
                      direction="row"
                      spacing={0.5}
                      alignItems="center"
                      flexWrap="wrap"
                      useFlexGap
                      justifyContent={{ xs: 'flex-start', lg: 'flex-end' }}
                      sx={{ width: '100%' }}
                    >
                      <ButtonGroup size="small" sx={announcementEditorTopButtonGroupSx}>
                        <Button
                          onClick={handleSave}
                          disabled={saving || !draftTitle.trim()}
                          sx={announcementBtnDraftSx}
                        >
                          {saving ? '…' : 'Speichern'}
                        </Button>
                        <Button
                          onClick={handlePublish}
                          disabled={publishing || !draftTitle.trim()}
                          sx={{ ...announcementBtnPublishSx, boxShadow: 'none' }}
                        >
                          {publishing ? '…' : selected.isPublished ? 'Zurückziehen' : 'Veröffentlichen'}
                        </Button>
                        <Button onClick={handleDelete} sx={announcementBtnDangerSx}>
                          Löschen
                        </Button>
                      </ButtonGroup>

                      {hasDocTemplate ? (
                        <>
                          <AnnouncementDocumentHeaderActions />
                          <AnnouncementDocumentPreviewToggleButton />
                        </>
                      ) : null}

                      <Tooltip title="Schüler:innen-Vorschau (neuer Tab)">
                        <IconButton
                          onClick={openStudentPreviewTab}
                          aria-label="Schüler-Vorschau"
                          sx={announcementHeaderPrimaryIconBtnSx}
                        >
                          <OpenInNewIcon sx={compactIconSx} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Box>
                </Box>

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr',
                      md: 'minmax(200px, 280px) minmax(0, 1fr)',
                      xl: 'minmax(220px, 320px) minmax(0, 1fr)',
                    },
                    gap: { xs: 0.75, md: 1, lg: 1.25 },
                    alignItems: 'start',
                    width: '100%',
                  }}
                >
                  <Box
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1.5,
                      bgcolor: '#fafcfd',
                      p: 0.75,
                      order: { xs: 2, md: 1 },
                    }}
                  >
                    <AnnouncementImageManager
                      compact
                      images={draftImages}
                      onChange={setDraftImages}
                      onUpload={uploadImages}
                      uploading={uploadingImage}
                    />
                    <AnnouncementDesignPicker
                      compact
                      title={draftTitle}
                      bodyHtml={draftBody}
                      images={draftImages.map((i) => i.url)}
                      selectedLayoutId={draftLayoutId}
                      onSelectLayout={setDraftLayoutId}
                      onApplyLayout={(_html, layoutId) => {
                        setDraftLayoutId(layoutId);
                        setSuccessMsg(null);
                      }}
                    />
                    {draftKind === 'flyer' && selected.folderSlug ? (
                      <Box sx={{ display: 'flex', gap: 0.5, mt: 0.75, justifyContent: 'flex-end' }}>
                        <Tooltip title="Flyer Studio">
                          <IconButton
                            component="a"
                            href={flyerStudioUrl(selected.folderSlug, draftTitle || selected.title)}
                            aria-label="Flyer Studio"
                            sx={{
                              ...compactIconBtnSx,
                              width: 28,
                              height: 28,
                              minWidth: 28,
                              color: announcementPalette.primary,
                              bgcolor: 'rgba(0,131,143,0.08)',
                            }}
                          >
                            <AutoAwesomeIcon sx={{ fontSize: 17 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Flyer-Vorschau">
                          <IconButton
                            component="a"
                            href={flyerPageUrl(selected.folderSlug)}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Flyer-Vorschau"
                            sx={{
                              ...compactIconBtnSx,
                              width: 28,
                              height: 28,
                              minWidth: 28,
                              bgcolor: announcementPalette.primary,
                              color: '#fff',
                            }}
                          >
                            <OpenInNewIcon sx={{ fontSize: 17 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    ) : null}
                  </Box>

                  <Stack spacing={0.75} sx={{ order: { xs: 1, md: 2 }, minWidth: 0 }}>
                    <TextField
                      placeholder="Titel"
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      fullWidth
                      size="small"
                      hiddenLabel
                      sx={announcementFieldSx}
                    />
                    <Box sx={usesVflLetterhead(activeTemplate) ? velProtokollDisplaySx : undefined}>
                      <RichTextEditor
                        key={`${selected.folderSlug}-${editorSeedKey}`}
                        ref={bodyEditorRef}
                        value={draftBody}
                        onChange={setDraftBody}
                        placeholder="Text"
                        rows={8}
                        compact
                        allowPasteImages={editorAllowsInlineImages}
                        showImageToolbar={editorAllowsInlineImages}
                        imageStorage="dataUrl"
                        showLessonMarkup={false}
                        defaultTextAlign={isProtokollTemplate(activeTemplate) ? 'left' : 'justify'}
                      />
                    </Box>
                  </Stack>
                </Box>

                {hasDocTemplate ? <AnnouncementDocumentPreviewSection /> : null}

                {draftLinks.length > 0 ? (
                  <Stack spacing={0.5} sx={{ mt: 0.75 }}>
                    {draftLinks.map((link, index) => (
                      <Box
                        key={index}
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr auto',
                          gap: 0.5,
                          alignItems: 'center',
                        }}
                      >
                        <TextField
                          placeholder="Bezeichnung"
                          value={link.label}
                          onChange={(e) => updateLink(index, 'label', e.target.value)}
                          size="small"
                          hiddenLabel
                          sx={announcementFieldSx}
                        />
                        <TextField
                          placeholder="URL"
                          value={link.url}
                          onChange={(e) => updateLink(index, 'url', e.target.value)}
                          size="small"
                          hiddenLabel
                          sx={announcementFieldSx}
                        />
                        <IconButton
                          onClick={() => removeLink(index)}
                          aria-label="Entfernen"
                          sx={{ ...overlayIconBtnSx, color: 'error.main' }}
                        >
                          <DeleteIcon sx={overlayIconSx} />
                        </IconButton>
                      </Box>
                    ))}
                  </Stack>
                ) : null}

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.75 }}>
                  <ButtonGroup size="small" sx={announcementActionButtonGroupSx}>
                    <Button
                      onClick={handleSave}
                      disabled={saving || !draftTitle.trim()}
                      sx={announcementBtnDraftSx}
                    >
                      {saving ? '…' : 'Speichern'}
                    </Button>
                    <Button
                      onClick={handlePublish}
                      disabled={publishing || !draftTitle.trim()}
                      sx={{ ...announcementBtnPublishSx, boxShadow: 'none' }}
                    >
                      {publishing ? '…' : selected.isPublished ? 'Zurückziehen' : 'Veröffentlichen'}
                    </Button>
                    <Button onClick={handleDelete} sx={announcementBtnDangerSx}>
                      Löschen
                    </Button>
                  </ButtonGroup>
                </Box>
              </CardContent>
            );

            const wrapWithDocumentProvider = (content: React.ReactNode) => {
              if (!hasDocTemplate) return content;
              return (
                <AnnouncementDocumentProvider
                  key={selected.folderSlug}
                  title={draftTitle}
                  sourceDocxUrl={activeTemplate!.sourceDocxUrl!}
                  getBodyHtml={() => {
                    bodyEditorRef.current?.flush();
                    const html = bodyEditorRef.current?.getHtml() ?? draftBody;
                    return prepareProtokollEditorHtml(html, activeTemplate);
                  }}
                  disabled={!draftTitle.trim()}
                >
                  {content}
                </AnnouncementDocumentProvider>
              );
            };

            return wrapWithDocumentProvider(editorContent);
          })()}
        </Card>
      )}

      <Dialog open={newDialogOpen} onClose={() => setNewDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={dialogCloseTitleSx}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            Neue Ankündigung
          </Typography>
          <DialogCloseIconButton onClose={() => setNewDialogOpen(false)} />
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField
            autoFocus
            placeholder="Name für Downloads"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            fullWidth
            size="small"
            hiddenLabel
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
