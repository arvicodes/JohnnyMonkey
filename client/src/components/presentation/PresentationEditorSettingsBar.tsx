import React, { useState } from 'react';
import {
  Box,
  Button,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Popover,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  ImageOutlined as ImageIcon,
  SettingsOutlined as SettingsIcon,
  TextFields as TextIcon,
  VisibilityOutlined as RevealIcon,
} from '@mui/icons-material';
import { SLIDE_LAYOUTS } from '../../lib/presentationLayouts';
import {
  PresentationDeck,
  PresentationSlide,
  SlideElement,
  SlideLayout,
  SLIDE_TRANSITIONS,
} from '../../lib/presentationDeck';
import { JOHNNY_ACCENT_PRESETS } from '../../lib/presentationTheme';
import { PRES_EDITOR_UI } from '../../lib/presentationEditorUi';
import type { SlideTransition } from '../../lib/presentationTransitions';

const compactSelectSx = {
  minWidth: 0,
  '& .MuiInputBase-root': {
    fontSize: 11,
    height: 28,
    bgcolor: '#fafafa',
    color: PRES_EDITOR_UI.text,
  },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: PRES_EDITOR_UI.barBorder },
  '& .MuiSelect-select': { py: 0.5 },
};

const iconBtnSx = {
  width: 28,
  height: 28,
  color: PRES_EDITOR_UI.textMuted,
  '&:hover': { bgcolor: PRES_EDITOR_UI.accentSoft, color: PRES_EDITOR_UI.accent },
};

interface PresentationEditorSettingsBarProps {
  deck: PresentationDeck;
  slide: PresentationSlide | null;
  selectedElement: SlideElement | null;
  selectedElementId: string | null;
  showLayoutImage: boolean;
  onDeckTitleChange: (title: string) => void;
  onApplyLayout: (layout: SlideLayout) => void;
  onUpdateSlide: (patch: Partial<PresentationSlide>) => void;
  onDeckTransitionChange: (t: SlideTransition) => void;
  onAssignReveal: () => void;
  onStripReveal: () => void;
  onAddTextElement: () => void;
  onAddImageElement: () => void;
  onAddLayoutImage: () => void;
  onSelectElement: (id: string) => void;
  onUpdateElement: (id: string, patch: Partial<SlideElement>) => void;
  onDeleteElement: (id: string) => void;
}

const PresentationEditorSettingsBar: React.FC<PresentationEditorSettingsBarProps> = ({
  deck,
  slide,
  selectedElement,
  selectedElementId,
  showLayoutImage,
  onDeckTitleChange,
  onApplyLayout,
  onUpdateSlide,
  onDeckTransitionChange,
  onAssignReveal,
  onStripReveal,
  onAddTextElement,
  onAddImageElement,
  onAddLayoutImage,
  onSelectElement,
  onUpdateElement,
  onDeleteElement,
}) => {
  const [elementAnchor, setElementAnchor] = useState<HTMLElement | null>(null);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        flex: 1,
        minWidth: 0,
        overflowX: 'auto',
        overflowY: 'hidden',
        scrollbarWidth: 'thin',
        '&::-webkit-scrollbar': { height: 4 },
      }}
    >
      <TextField
        size="small"
        placeholder="Titel"
        value={deck.title}
        onChange={(e) => onDeckTitleChange(e.target.value)}
        sx={{
          width: 118,
          flexShrink: 0,
          ...compactSelectSx,
        }}
      />

      <Divider orientation="vertical" flexItem sx={{ borderColor: PRES_EDITOR_UI.barBorder, mx: 0.15 }} />

      <TextField
        select
        size="small"
        value={slide?.layout || 'title-content'}
        onChange={(e) => onApplyLayout(e.target.value as SlideLayout)}
        sx={{ width: 108, flexShrink: 0, ...compactSelectSx }}
      >
        {SLIDE_LAYOUTS.map((l) => (
          <MenuItem key={l.id} value={l.id} dense sx={{ fontSize: 12 }}>
            {l.label}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        size="small"
        value={slide?.transition || 'fade'}
        onChange={(e) => onUpdateSlide({ transition: e.target.value as SlideTransition })}
        sx={{ width: 72, flexShrink: 0, ...compactSelectSx }}
        SelectProps={{ displayEmpty: true, renderValue: (v) => `↪ ${SLIDE_TRANSITIONS.find((t) => t.id === v)?.label?.slice(0, 4) || 'Fade'}` }}
      >
        {SLIDE_TRANSITIONS.map((t) => (
          <MenuItem key={t.id} value={t.id} dense sx={{ fontSize: 12 }}>
            Folie: {t.label}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        size="small"
        value={deck.defaultTransition || 'fade'}
        onChange={(e) => onDeckTransitionChange(e.target.value as SlideTransition)}
        sx={{ width: 72, flexShrink: 0, ...compactSelectSx }}
        SelectProps={{ renderValue: (v) => `★ ${SLIDE_TRANSITIONS.find((t) => t.id === v)?.label?.slice(0, 4) || 'Fade'}` }}
      >
        {SLIDE_TRANSITIONS.map((t) => (
          <MenuItem key={t.id} value={t.id} dense sx={{ fontSize: 12 }}>
            Standard: {t.label}
          </MenuItem>
        ))}
      </TextField>

      <Divider orientation="vertical" flexItem sx={{ borderColor: PRES_EDITOR_UI.barBorder, mx: 0.15 }} />

      <FormControlLabel
        sx={{ m: 0, flexShrink: 0, gap: 0.25 }}
        control={
          <Switch
            size="small"
            checked={slide?.revealEnabled !== false}
            onChange={(e) => onUpdateSlide({ revealEnabled: e.target.checked })}
          />
        }
        label={
          <Typography sx={{ fontSize: 10, color: PRES_EDITOR_UI.textMuted, whiteSpace: 'nowrap' }}>
            Einblenden
          </Typography>
        }
      />

      <Tooltip title="Absätze auto-nummerieren">
        <IconButton size="small" onClick={onAssignReveal} sx={iconBtnSx}>
          <RevealIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>
      <Tooltip title="Schritte entfernen">
        <IconButton size="small" onClick={onStripReveal} sx={iconBtnSx}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, lineHeight: 1 }}>×</Typography>
        </IconButton>
      </Tooltip>
      <Divider orientation="vertical" flexItem sx={{ borderColor: PRES_EDITOR_UI.barBorder, mx: 0.15 }} />

      <Tooltip title="Textfeld">
        <IconButton size="small" onClick={onAddTextElement} sx={iconBtnSx}>
          <TextIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>
      <Tooltip title="Bild-Element">
        <IconButton size="small" onClick={onAddImageElement} sx={iconBtnSx}>
          <ImageIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>

      {(slide?.elements || []).length > 0 && (
        <TextField
          select
          size="small"
          value={selectedElementId || ''}
          onChange={(e) => onSelectElement(e.target.value)}
          sx={{ width: 88, flexShrink: 0, ...compactSelectSx }}
          SelectProps={{
            displayEmpty: true,
            renderValue: (v) => {
              if (!v) return 'Element';
              const el = slide?.elements?.find((e) => e.id === v);
              return el?.type === 'image' ? '🖼 Bild' : 'Text';
            },
          }}
        >
          <MenuItem value="" disabled dense sx={{ fontSize: 11 }}>
            Element wählen
          </MenuItem>
          {(slide?.elements || []).map((el) => (
            <MenuItem key={el.id} value={el.id} dense sx={{ fontSize: 11 }}>
              {el.type === 'image' ? '🖼' : 'T'} · S{el.revealStep ?? 0}
            </MenuItem>
          ))}
        </TextField>
      )}

      {selectedElement && (
        <>
          <Tooltip title="Element-Einstellungen">
            <IconButton
              size="small"
              onClick={(e) => setElementAnchor(e.currentTarget)}
              sx={{
                ...iconBtnSx,
                color: PRES_EDITOR_UI.accent,
                bgcolor: PRES_EDITOR_UI.accentSoft,
              }}
            >
              <SettingsIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
          <Popover
            open={Boolean(elementAnchor)}
            anchorEl={elementAnchor}
            onClose={() => setElementAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          >
            <Box sx={{ p: 1.25, width: 200 }}>
              <Typography sx={{ fontSize: 10, fontWeight: 700, color: PRES_EDITOR_UI.textMuted, mb: 0.75 }}>
                Element
              </Typography>
              {(['x', 'y', 'w', 'h'] as const).map((key) => (
                <TextField
                  key={key}
                  size="small"
                  type="number"
                  label={key.toUpperCase()}
                  value={selectedElement[key]}
                  onChange={(e) =>
                    onUpdateElement(selectedElement.id, { [key]: Number(e.target.value) })
                  }
                  sx={{
                    width: '48%',
                    mr: key === 'x' || key === 'w' ? '4%' : 0,
                    mb: 0.5,
                    '& .MuiInputBase-root': { fontSize: 11 },
                    '& .MuiInputLabel-root': { fontSize: 10 },
                  }}
                />
              ))}
              <TextField
                size="small"
                type="number"
                fullWidth
                label="Einblend-Schritt"
                value={selectedElement.revealStep ?? 0}
                onChange={(e) =>
                  onUpdateElement(selectedElement.id, { revealStep: Number(e.target.value) })
                }
                sx={{ mb: 0.75, '& .MuiInputBase-root': { fontSize: 11 } }}
              />
              <Button
                size="small"
                color="error"
                fullWidth
                onClick={() => {
                  onDeleteElement(selectedElement.id);
                  setElementAnchor(null);
                }}
                sx={{ fontSize: 11, textTransform: 'none' }}
              >
                Löschen
              </Button>
            </Box>
          </Popover>
        </>
      )}

      {showLayoutImage && (
        <Tooltip title="Bild für Layout">
          <IconButton size="small" onClick={onAddLayoutImage} sx={iconBtnSx}>
            <ImageIcon sx={{ fontSize: 15, opacity: 0.85 }} />
          </IconButton>
        </Tooltip>
      )}

      <Divider orientation="vertical" flexItem sx={{ borderColor: PRES_EDITOR_UI.barBorder, mx: 0.15 }} />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, flexShrink: 0 }}>
        {JOHNNY_ACCENT_PRESETS.map((c) => (
          <Box
            key={c}
            onClick={() => onUpdateSlide({ accentColor: c })}
            title="Akzentfarbe"
            sx={{
              width: 16,
              height: 16,
              borderRadius: '50%',
              bgcolor: c,
              cursor: 'pointer',
              border:
                slide?.accentColor === c
                  ? `2px solid ${PRES_EDITOR_UI.accent}`
                  : '1px solid rgba(0,0,0,0.12)',
              flexShrink: 0,
              '&:hover': { transform: 'scale(1.1)' },
            }}
          />
        ))}
      </Box>
    </Box>
  );
};

export default PresentationEditorSettingsBar;
