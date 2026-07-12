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
  PaletteOutlined as PaletteIcon,
  SettingsOutlined as SettingsIcon,
  TextFields as TextIcon,
} from '@mui/icons-material';
import {
  PresentationSlide,
  SlideElement,
} from '../../lib/presentationDeck';
import { JOHNNY_ACCENT_PRESETS } from '../../lib/presentationTheme';
import { PRES_EDITOR_UI } from '../../lib/presentationEditorUi';

const compactSelectSx = {
  minWidth: 0,
  '& .MuiInputBase-root': {
    fontSize: 11,
    height: 28,
    bgcolor: '#fff',
    color: PRES_EDITOR_UI.text,
  },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: PRES_EDITOR_UI.barBorder },
  '& .MuiSelect-select': { py: 0.5 },
};

const iconBtnSx = {
  width: 28,
  height: 28,
  color: PRES_EDITOR_UI.textMuted,
  '&:hover': { bgcolor: '#fff', color: PRES_EDITOR_UI.accent },
};

interface PresentationSlideToolsBarProps {
  slide: PresentationSlide | null;
  selectedElement: SlideElement | null;
  selectedElementId: string | null;
  showLayoutImage: boolean;
  onApplyAccentColor: (color: string, allSlides: boolean) => void;
  onAddTextElement: () => void;
  onAddImageElement: () => void;
  onAddLayoutImage: () => void;
  onSelectElement: (id: string) => void;
  onUpdateElement: (id: string, patch: Partial<SlideElement>) => void;
  onDeleteElement: (id: string) => void;
}

const PresentationSlideToolsBar: React.FC<PresentationSlideToolsBarProps> = ({
  slide,
  selectedElement,
  selectedElementId,
  showLayoutImage,
  onApplyAccentColor,
  onAddTextElement,
  onAddImageElement,
  onAddLayoutImage,
  onSelectElement,
  onUpdateElement,
  onDeleteElement,
}) => {
  const [elementAnchor, setElementAnchor] = useState<HTMLElement | null>(null);
  const [accentAnchor, setAccentAnchor] = useState<HTMLElement | null>(null);
  const [accentForAll, setAccentForAll] = useState(false);

  const accentColor = slide?.accentColor || JOHNNY_ACCENT_PRESETS[0];

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        flexShrink: 0,
      }}
    >
      <Tooltip title="Textfeld einfügen">
        <IconButton size="small" onClick={onAddTextElement} sx={iconBtnSx}>
          <TextIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>
      <Tooltip title="Bild-Element einfügen">
        <IconButton size="small" onClick={onAddImageElement} sx={iconBtnSx}>
          <ImageIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>
      {showLayoutImage && (
        <Tooltip title="Layout-Bild">
          <IconButton size="small" onClick={onAddLayoutImage} sx={iconBtnSx}>
            <ImageIcon sx={{ fontSize: 15, opacity: 0.85 }} />
          </IconButton>
        </Tooltip>
      )}

      {(slide?.elements || []).length > 0 && (
        <>
          <Divider orientation="vertical" flexItem sx={{ borderColor: PRES_EDITOR_UI.barBorder, mx: 0.15 }} />
          <TextField
            select
            size="small"
            value={selectedElementId || ''}
            onChange={(e) => onSelectElement(e.target.value)}
            sx={{ width: 92, flexShrink: 0, ...compactSelectSx }}
            SelectProps={{
              displayEmpty: true,
              renderValue: (v) => {
                if (!v) return 'Element';
                const el = slide?.elements?.find((e) => e.id === v);
                return el?.type === 'image' ? 'Bild' : 'Text';
              },
            }}
          >
            <MenuItem value="" disabled dense sx={{ fontSize: 11 }}>
              Element wählen
            </MenuItem>
            {(slide?.elements || []).map((el) => (
              <MenuItem key={el.id} value={el.id} dense sx={{ fontSize: 11 }}>
                {el.type === 'image' ? 'Bild' : 'Text'}
              </MenuItem>
            ))}
          </TextField>
        </>
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
                bgcolor: '#fff',
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
              <Button
                size="small"
                color="error"
                fullWidth
                onClick={() => {
                  onDeleteElement(selectedElement.id);
                  setElementAnchor(null);
                }}
                sx={{ fontSize: 11, textTransform: 'none', mt: 0.5 }}
              >
                Löschen
              </Button>
            </Box>
          </Popover>
        </>
      )}

      <Divider orientation="vertical" flexItem sx={{ borderColor: PRES_EDITOR_UI.barBorder, mx: 0.15 }} />

      <Tooltip title="Akzentfarbe">
        <IconButton
          size="small"
          onClick={(e) => setAccentAnchor(e.currentTarget)}
          sx={{
            ...iconBtnSx,
            width: 30,
            gap: 0.35,
            borderRadius: 1,
            px: 0.5,
          }}
        >
          <PaletteIcon sx={{ fontSize: 15 }} />
          <Box
            sx={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              bgcolor: accentColor,
              border: '1px solid rgba(0,0,0,0.15)',
              flexShrink: 0,
            }}
          />
        </IconButton>
      </Tooltip>
      <Popover
        open={Boolean(accentAnchor)}
        anchorEl={accentAnchor}
        onClose={() => setAccentAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box sx={{ p: 1.25, width: 220 }}>
          <Typography sx={{ fontSize: 10, fontWeight: 700, color: PRES_EDITOR_UI.textMuted, mb: 0.75 }}>
            Akzentfarbe
          </Typography>
          <FormControlLabel
            sx={{ m: 0, mb: 0.75, gap: 0.5, alignItems: 'center' }}
            control={
              <Switch
                size="small"
                checked={accentForAll}
                onChange={(e) => setAccentForAll(e.target.checked)}
              />
            }
            label={
              <Typography sx={{ fontSize: 11, color: PRES_EDITOR_UI.text }}>
                Für alle Folien
              </Typography>
            }
          />
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {JOHNNY_ACCENT_PRESETS.map((c) => (
              <Box
                key={c}
                onClick={() => {
                  onApplyAccentColor(c, accentForAll);
                  setAccentAnchor(null);
                }}
                title={c}
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  bgcolor: c,
                  cursor: 'pointer',
                  border:
                    accentColor === c
                      ? `2px solid ${PRES_EDITOR_UI.accent}`
                      : '1px solid rgba(0,0,0,0.12)',
                  '&:hover': { transform: 'scale(1.08)' },
                }}
              />
            ))}
          </Box>
        </Box>
      </Popover>
    </Box>
  );
};

export default PresentationSlideToolsBar;
