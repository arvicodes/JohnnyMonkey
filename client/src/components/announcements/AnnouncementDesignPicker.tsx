import React from 'react';
import { Box, Grid, IconButton, Tooltip, Typography } from '@mui/material';
import { Check as CheckIcon } from '@mui/icons-material';
import {
  ANNOUNCEMENT_LAYOUTS,
  bodyContentForLayout,
  buildAnnouncementLayoutHtml,
  htmlToPlainText,
  type AnnouncementLayoutId,
} from './announcementLayouts';
import { AnnouncementLayoutPreviewCard } from './AnnouncementLayoutPreviewCard';
import { announcementPalette, compactIconBtnSx, compactIconSx } from './announcementUi';

type Props = {
  title: string;
  bodyHtml: string;
  images: string[];
  selectedLayoutId: AnnouncementLayoutId | null;
  onSelectLayout: (id: AnnouncementLayoutId) => void;
  onApplyLayout: (html: string, layoutId: AnnouncementLayoutId) => void;
};

export function AnnouncementDesignPicker({
  title,
  bodyHtml,
  images,
  selectedLayoutId,
  onSelectLayout,
  onApplyLayout,
}: Props) {
  const textForLayout = htmlToPlainText(bodyHtml);
  const canSuggest = Boolean(title.trim() || textForLayout || images.length);

  const handleApply = () => {
    if (!selectedLayoutId) return;
    const content = bodyContentForLayout(bodyHtml);
    const html = buildAnnouncementLayoutHtml({
      layoutId: selectedLayoutId,
      title: title.trim() || 'Ankündigung',
      text: content.text,
      htmlBody: content.htmlBody,
      images,
    });
    onApplyLayout(html, selectedLayoutId);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, color: announcementPalette.textPrimary, flex: 1 }}>
          Bild-Anordnung
          {images.length > 0 ? ` · ${images.length} Bild${images.length === 1 ? '' : 'er'}` : ''}
        </Typography>
        <Tooltip title="Ausgewähltes Design übernehmen">
          <span>
            <IconButton
              onClick={handleApply}
              disabled={!selectedLayoutId}
              aria-label="Design übernehmen"
              sx={{
                ...compactIconBtnSx,
                bgcolor: selectedLayoutId ? announcementPalette.primary : '#e0e0e0',
                color: '#fff',
                '&:hover': { bgcolor: selectedLayoutId ? announcementPalette.secondary : '#e0e0e0' },
                '&.Mui-disabled': { color: 'rgba(255,255,255,0.8)' },
              }}
            >
              <CheckIcon sx={compactIconSx} />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, lineHeight: 1.4 }}>
        Layout für Bilder — Textformatierung bleibt erhalten. Reihenfolge der Bilder oben beachten.
      </Typography>

      {!canSuggest ? (
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', py: 1 }}>
          Titel, Text oder mindestens ein Bild eingeben — dann erscheinen Vorschläge.
        </Typography>
      ) : (
        <>
          <Grid container spacing={1.25} sx={{ mb: 1.25 }}>
            {ANNOUNCEMENT_LAYOUTS.map((layout) => (
              <Grid item xs={6} sm={4} md={3} key={layout.id}>
                <AnnouncementLayoutPreviewCard
                  layout={layout}
                  title={title}
                  text={textForLayout}
                  images={images}
                  selected={selectedLayoutId === layout.id}
                  onClick={() => onSelectLayout(layout.id)}
                />
              </Grid>
            ))}
          </Grid>
        </>
      )}
    </Box>
  );
}
