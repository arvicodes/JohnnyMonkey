import React, { useState } from 'react';
import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Home as HomeIcon,
  SaveOutlined as SaveIcon,
} from '@mui/icons-material';
import {
  SLIDE_TEMPLATE_META,
  type SlideTemplateKind,
  type SlideTemplatesStore,
} from '../../lib/presentationSlideTemplates';
import { PRES_EDITOR_UI } from '../../lib/presentationEditorUi';

type Props = {
  disabled?: boolean;
  onInsert: (kind: SlideTemplateKind) => void;
  onSaveTemplate: (kind: SlideTemplateKind) => void;
  templates: SlideTemplatesStore;
};

const templateBtnSx = (accent: string) => ({
  width: 24,
  height: 24,
  p: 0,
  minWidth: 24,
  borderRadius: '6px',
  border: `1px solid ${PRES_EDITOR_UI.barBorder}`,
  bgcolor: '#fff',
  color: accent,
  fontSize: 11,
  fontWeight: 800,
  lineHeight: 1,
  '&:hover': { bgcolor: PRES_EDITOR_UI.accentSoft, borderColor: accent },
});

export default function PresentationSlideTemplateBar({
  disabled,
  onInsert,
  onSaveTemplate,
}: Props) {
  const [saveMenuAnchor, setSaveMenuAnchor] = useState<null | HTMLElement>(null);

  const renderIcon = (kind: SlideTemplateKind, shortLabel: string) => {
    if (kind === 'ha') {
      return <HomeIcon sx={{ fontSize: 14 }} />;
    }
    return (
      <Typography component="span" sx={{ fontSize: 11, fontWeight: 800, lineHeight: 1 }}>
        {shortLabel}
      </Typography>
    );
  };

  const accentFor = (kind: SlideTemplateKind) => {
    switch (kind) {
      case 'start':
        return '#2E7D32';
      case 'auftrag':
        return '#1565C0';
      case 'sicherung':
        return '#C62828';
      case 'ha':
        return '#EF6C00';
      default:
        return PRES_EDITOR_UI.accent;
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0 }}>
      {SLIDE_TEMPLATE_META.map((meta) => (
        <Tooltip key={meta.kind} title={`${meta.label} einfügen — ${meta.hint}`}>
          <span>
            <IconButton
              size="small"
              disabled={disabled}
              onClick={() => onInsert(meta.kind)}
              sx={templateBtnSx(accentFor(meta.kind))}
              aria-label={`${meta.label} einfügen`}
            >
              {renderIcon(meta.kind, meta.shortLabel)}
            </IconButton>
          </span>
        </Tooltip>
      ))}

      <Tooltip title="Aktuelle Folie als Vorlage speichern">
        <span>
          <IconButton
            size="small"
            disabled={disabled}
            onClick={(e) => setSaveMenuAnchor(e.currentTarget)}
            sx={{
              width: 22,
              height: 22,
              p: 0,
              ml: 0.15,
              color: PRES_EDITOR_UI.textMuted,
              '&:hover': { color: PRES_EDITOR_UI.accent },
            }}
            aria-label="Vorlage speichern"
          >
            <SaveIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </span>
      </Tooltip>

      <Menu
        anchorEl={saveMenuAnchor}
        open={Boolean(saveMenuAnchor)}
        onClose={() => setSaveMenuAnchor(null)}
        transformOrigin={{ horizontal: 'left', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
      >
        {SLIDE_TEMPLATE_META.map((meta) => (
          <MenuItem
            key={`save-${meta.kind}`}
            dense
            onClick={() => {
              setSaveMenuAnchor(null);
              onSaveTemplate(meta.kind);
            }}
          >
            <ListItemIcon sx={{ minWidth: 28 }}>{renderIcon(meta.kind, meta.shortLabel)}</ListItemIcon>
            <ListItemText
              primary={`Als ${meta.label}-Vorlage speichern`}
              primaryTypographyProps={{ fontSize: 12 }}
            />
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}
