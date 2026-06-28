import React, { useState } from 'react';
import { Box, Chip, Grid, Typography } from '@mui/material';
import {
  ANNOUNCEMENT_TEXT_TEMPLATE_CATEGORIES,
  ANNOUNCEMENT_TEXT_TEMPLATES,
  type AnnouncementTextTemplate,
  type AnnouncementTextTemplateCategory,
} from './announcementTextTemplates';
import { announcementPalette } from './announcementUi';

type Props = {
  onApply: (template: AnnouncementTextTemplate) => void;
};

export function AnnouncementTextTemplatePicker({ onApply }: Props) {
  const [category, setCategory] = useState<AnnouncementTextTemplateCategory>('schule');

  const templates = ANNOUNCEMENT_TEXT_TEMPLATES.filter((t) => t.category === category);

  return (
    <Box>
      <Typography variant="caption" sx={{ fontWeight: 700, color: announcementPalette.textPrimary, display: 'block', mb: 0.5 }}>
        Textvorlagen
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, lineHeight: 1.4 }}>
        Struktur aus Elternbriefen &amp; Vereinsprotokollen — Platzhalter in […] anpassen.
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.25 }}>
        {ANNOUNCEMENT_TEXT_TEMPLATE_CATEGORIES.map((entry) => (
          <Chip
            key={entry.id}
            label={entry.label}
            size="small"
            clickable
            color={category === entry.id ? 'primary' : 'default'}
            variant={category === entry.id ? 'filled' : 'outlined'}
            onClick={() => setCategory(entry.id)}
            sx={{
              fontWeight: 700,
              ...(category === entry.id
                ? { bgcolor: announcementPalette.primary, '&:hover': { bgcolor: announcementPalette.secondary } }
                : {}),
            }}
          />
        ))}
      </Box>

      <Grid container spacing={1}>
        {templates.map((template) => (
          <Grid item xs={12} sm={6} key={template.id}>
            <Box
              component="button"
              type="button"
              onClick={() => onApply(template)}
              sx={{
                width: '100%',
                textAlign: 'left',
                border: '1px solid',
                borderColor: 'rgba(0,131,143,0.22)',
                borderRadius: 2,
                bgcolor: '#fafcfd',
                p: 1.1,
                cursor: 'pointer',
                transition: 'border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease',
                '&:hover': {
                  borderColor: announcementPalette.primary,
                  bgcolor: 'rgba(0,131,143,0.05)',
                  boxShadow: '0 4px 14px rgba(0,131,143,0.12)',
                },
              }}
            >
              <Typography sx={{ fontWeight: 800, fontSize: '0.82rem', color: announcementPalette.heading, mb: 0.35 }}>
                {template.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.35 }}>
                {template.description}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
