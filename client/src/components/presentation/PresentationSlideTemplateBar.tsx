import React, { useState } from 'react';
import {
  Box,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddTemplateIcon,
  Home as HomeIcon,
  Link as LinkIcon,
  OpenInNew as ReferenzIcon,
  DashboardCustomize as LeinwandIcon,
  SaveOutlined as SaveIcon,
  SportsEsports as UebungIcon,
} from '@mui/icons-material';
import {
  SLIDE_TEMPLATE_META,
  type CustomSlideTemplate,
  type SlideTemplateKind,
  type SlideTemplatesStore,
} from '../../lib/presentationSlideTemplates';
import { PRES_EDITOR_UI } from '../../lib/presentationEditorUi';

type Props = {
  disabled?: boolean;
  onInsert: (kind: SlideTemplateKind) => void;
  onInsertCustom: (customId: string) => void;
  onSaveTemplate: (kind: SlideTemplateKind) => void;
  onSaveNewTemplate: () => void;
  onUpdateCustomTemplate?: (customId: string) => void;
  templates: SlideTemplatesStore;
};

const templateBtnSx = (accent: string, dashed = false) => ({
  width: 24,
  height: 24,
  p: 0,
  minWidth: 24,
  borderRadius: '6px',
  border: dashed ? `1px dashed ${accent}` : `1px solid ${PRES_EDITOR_UI.barBorder}`,
  bgcolor: '#fff',
  color: accent,
  fontSize: 11,
  fontWeight: 800,
  lineHeight: 1,
  '&:hover': { bgcolor: PRES_EDITOR_UI.accentSoft, borderColor: accent },
});

const CUSTOM_ACCENTS = ['#5D4037', '#4527A0', '#00695C', '#AD1457', '#283593'];

export default function PresentationSlideTemplateBar({
  disabled,
  onInsert,
  onInsertCustom,
  onSaveTemplate,
  onSaveNewTemplate,
  onUpdateCustomTemplate,
  templates,
}: Props) {
  const [saveMenuAnchor, setSaveMenuAnchor] = useState<null | HTMLElement>(null);
  const customTemplates = templates.custom ?? [];

  const renderIcon = (kind: SlideTemplateKind, shortLabel: string) => {
    if (kind === 'ha') {
      return <HomeIcon sx={{ fontSize: 14 }} />;
    }
    if (kind === 'uebung') {
      return <UebungIcon sx={{ fontSize: 14 }} />;
    }
    if (kind === 'link') {
      return <LinkIcon sx={{ fontSize: 14 }} />;
    }
    if (kind === 'referenz') {
      return <ReferenzIcon sx={{ fontSize: 14 }} />;
    }
    if (kind === 'leinwand') {
      return <LeinwandIcon sx={{ fontSize: 14 }} />;
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
      case 'bild':
        return '#455A64';
      case 'ha':
        return '#EF6C00';
      case 'uebung':
        return '#FBC02D';
      case 'ende':
        return '#2E7D32';
      case 'link':
        return '#6A1B9A';
      case 'referenz':
        return '#00838F';
      case 'leinwand':
        return '#2E7D32';
      default:
        return PRES_EDITOR_UI.accent;
    }
  };

  const customAccent = (index: number) => CUSTOM_ACCENTS[index % CUSTOM_ACCENTS.length];

  const renderCustomIcon = (entry: CustomSlideTemplate) => (
    <Typography component="span" sx={{ fontSize: 10, fontWeight: 800, lineHeight: 1 }}>
      {entry.shortLabel}
    </Typography>
  );

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

      {customTemplates.map((entry, index) => (
        <Tooltip
          key={entry.id}
          title={`${entry.label} einfügen${entry.hint ? ` — ${entry.hint}` : ''}`}
        >
          <span>
            <IconButton
              size="small"
              disabled={disabled}
              onClick={() => onInsertCustom(entry.id)}
              sx={templateBtnSx(customAccent(index), true)}
              aria-label={`${entry.label} einfügen`}
            >
              {renderCustomIcon(entry)}
            </IconButton>
          </span>
        </Tooltip>
      ))}

      <Tooltip title="Vorlage speichern">
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
        <MenuItem
          dense
          onClick={() => {
            setSaveMenuAnchor(null);
            onSaveNewTemplate();
          }}
        >
          <ListItemIcon sx={{ minWidth: 28 }}>
            <AddTemplateIcon sx={{ fontSize: 16, color: PRES_EDITOR_UI.accent }} />
          </ListItemIcon>
          <ListItemText
            primary="Als neue Vorlage speichern…"
            secondary="Eigener Name, erscheint als zusätzlicher Button"
            primaryTypographyProps={{ fontSize: 12, fontWeight: 600 }}
            secondaryTypographyProps={{ fontSize: 10 }}
          />
        </MenuItem>
        <Divider sx={{ my: 0.5 }} />
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
        {customTemplates.length > 0 && onUpdateCustomTemplate && (
          <>
            <Divider sx={{ my: 0.5 }} />
            {customTemplates.map((entry) => (
              <MenuItem
                key={`update-custom-${entry.id}`}
                dense
                onClick={() => {
                  setSaveMenuAnchor(null);
                  onUpdateCustomTemplate(entry.id);
                }}
              >
                <ListItemIcon sx={{ minWidth: 28 }}>{renderCustomIcon(entry)}</ListItemIcon>
                <ListItemText
                  primary={`„${entry.label}“ aktualisieren`}
                  primaryTypographyProps={{ fontSize: 12 }}
                />
              </MenuItem>
            ))}
          </>
        )}
      </Menu>
    </Box>
  );
}
