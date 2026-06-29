import React from 'react';
import { Box, Grid, IconButton, Tooltip } from '@mui/material';
import { Check as CheckIcon } from '@mui/icons-material';
import {
  ANNOUNCEMENT_LAYOUTS,
  bodyContentForLayout,
  buildAnnouncementLayoutHtml,
  htmlToPlainText,
  type AnnouncementLayoutId,
} from './announcementLayouts';
import { AnnouncementLayoutPreviewCard } from './AnnouncementLayoutPreviewCard';
import { announcementPalette, compactIconBtnSx } from './announcementUi';

type Props = {
  title: string;
  bodyHtml: string;
  images: string[];
  selectedLayoutId: AnnouncementLayoutId | null;
  onSelectLayout: (id: AnnouncementLayoutId) => void;
  onApplyLayout: (html: string, layoutId: AnnouncementLayoutId) => void;
  compact?: boolean;
};

export function AnnouncementDesignPicker({
  title,
  bodyHtml,
  images,
  selectedLayoutId,
  onSelectLayout,
  onApplyLayout,
  compact,
}: Props) {
  const textForLayout = htmlToPlainText(bodyHtml);
  const previewTitle = 'Titel';
  const previewText = textForLayout || 'Dein Text …';

  const handleApply = () => {
    if (!selectedLayoutId) return;
    const content = bodyContentForLayout(bodyHtml);
    const html = buildAnnouncementLayoutHtml({
      layoutId: selectedLayoutId,
      text: content.text,
      htmlBody: content.htmlBody,
      images,
    });
    onApplyLayout(html, selectedLayoutId);
  };

  return (
    <Box sx={{ mt: compact ? 0.75 : 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5, mb: compact ? 0.5 : 0.75 }}>
        <Tooltip title="Layout übernehmen">
          <span>
            <IconButton
              onClick={handleApply}
              disabled={!selectedLayoutId}
              aria-label="Layout übernehmen"
              sx={{
                ...compactIconBtnSx,
                width: compact ? 28 : 32,
                height: compact ? 28 : 32,
                minWidth: compact ? 28 : 32,
                bgcolor: selectedLayoutId ? announcementPalette.primary : '#e0e0e0',
                color: '#fff',
                '&:hover': { bgcolor: selectedLayoutId ? announcementPalette.secondary : '#e0e0e0' },
                '&.Mui-disabled': { color: 'rgba(255,255,255,0.8)' },
              }}
            >
              <CheckIcon sx={{ fontSize: compact ? 17 : 20 }} />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      <Grid container spacing={compact ? 0.5 : 1.25}>
        {ANNOUNCEMENT_LAYOUTS.map((layout) => (
          <Grid item xs={compact ? 6 : 6} sm={compact ? 6 : 4} md={compact ? 6 : 3} key={layout.id}>
            <AnnouncementLayoutPreviewCard
              layout={layout}
              title={previewTitle}
              text={previewText}
              images={images}
              selected={selectedLayoutId === layout.id}
              onClick={() => onSelectLayout(layout.id)}
              compact={compact}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
