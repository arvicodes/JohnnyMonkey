import React from 'react';
import { Box, Button, TextField, Tooltip, Typography } from '@mui/material';
import CropIcon from '@mui/icons-material/Crop';
import RotateLeftIcon from '@mui/icons-material/RotateLeft';
import RotateRightIcon from '@mui/icons-material/RotateRight';
import EnhanceIcon from '@mui/icons-material/AutoAwesome';
import RemoveBgIcon from '@mui/icons-material/AutoFixHigh';
import type { SlideElement } from '../../lib/presentationDeck';
import {
  ensureWindowCropLock,
  isImageCropMode,
  isWindowCropMode,
  rotateElementByDegrees,
} from '../../lib/presentationImageUtils';
import {
  IMAGE_FRAME_COLORS,
  IMAGE_FRAME_DASHES,
  IMAGE_FRAME_PRESET_LABELS,
  IMAGE_FRAME_PRESET_ORDER,
  IMAGE_FRAME_PRESETS,
  IMAGE_FRAME_WIDTHS,
  imageFrameIsActive,
  imageFrameParts,
  withImageFrameColor,
  withImageFrameDash,
  withImageFrameWidth,
} from '../../lib/presentationImageFrames';
import { JOHNNY_ACCENT_PRESETS } from '../../lib/presentationTheme';
import { PRES_EDITOR_UI } from '../../lib/presentationEditorUi';

const miniBtnSx = {
  ...PRES_EDITOR_UI.toolbarChip,
  py: 0.15,
};

interface PresentationImageToolsPanelProps {
  element: SlideElement;
  accentColor: string;
  showGeometry?: boolean;
  cropHint?: string;
  onUpdate: (patch: Partial<SlideElement>) => void;
  onEnhance?: () => void;
  onRemoveBackground?: () => void;
  enhancing?: boolean;
  removingBackground?: boolean;
}

const PresentationImageToolsPanel: React.FC<PresentationImageToolsPanelProps> = ({
  element,
  accentColor,
  showGeometry = true,
  cropHint,
  onUpdate,
  onEnhance,
  onRemoveBackground,
  enhancing = false,
  removingBackground = false,
}) => {
  const windowCrop = isWindowCropMode(element);
  const cropMode = isImageCropMode(element);
  const hint =
    cropHint ||
    (windowCrop
      ? 'Ecken ziehen = Größe · Kanten ziehen = Ausschnitt · Ziehen verschiebt das Bild'
      : cropMode
        ? 'Ecken ziehen = Größe · Kanten = Ausschnitt · Ziehen verschiebt den Ausschnitt'
        : 'Ziehen verschiebt das Bild · Zuschneiden für Ausschnitt · Ecken = Größe');

  return (
    <>
      <Typography sx={{ fontSize: 9, fontWeight: 700, color: PRES_EDITOR_UI.textMuted, mb: 0.5 }}>
        Bild
      </Typography>
      <Box sx={{ display: 'flex', gap: 0.35, mb: 0.35 }}>
        <Button
          size="small"
          sx={{ ...miniBtnSx, flex: 1 }}
          variant={element.imageFit !== 'cover' && !windowCrop ? 'contained' : 'outlined'}
          onClick={() =>
            onUpdate({
              imageFit: 'contain',
              imageSourceRect: undefined,
              imageObjectPosition: undefined,
            })
          }
        >
          Einpassen
        </Button>
        <Button
          size="small"
          sx={{ ...miniBtnSx, flex: 1 }}
          variant={cropMode ? 'contained' : 'outlined'}
          startIcon={<CropIcon sx={{ fontSize: 14 }} />}
          onClick={() => onUpdate(ensureWindowCropLock(element))}
        >
          Zuschneiden
        </Button>
      </Box>
      <Box sx={{ display: 'flex', gap: 0.35, mb: 0.35 }}>
        <Button
          size="small"
          sx={{ ...miniBtnSx, flex: 1 }}
          startIcon={<RotateLeftIcon sx={{ fontSize: 14 }} />}
          onClick={() => onUpdate(rotateElementByDegrees(element, -90))}
        >
          90° links
        </Button>
        <Button
          size="small"
          sx={{ ...miniBtnSx, flex: 1 }}
          startIcon={<RotateRightIcon sx={{ fontSize: 14 }} />}
          onClick={() => onUpdate(rotateElementByDegrees(element, 90))}
        >
          90° rechts
        </Button>
      </Box>
      {windowCrop && element.imageSourceRect ? (
        <Button
          size="small"
          fullWidth
          variant="outlined"
          onClick={() =>
            onUpdate({
              x: element.imageSourceRect!.x,
              y: element.imageSourceRect!.y,
              w: element.imageSourceRect!.w,
              h: element.imageSourceRect!.h,
            })
          }
          sx={{ ...miniBtnSx, mb: 0.35 }}
        >
          Zuschnitt zurücksetzen
        </Button>
      ) : cropMode ? (
        <Button
          size="small"
          fullWidth
          variant="outlined"
          onClick={() => onUpdate({ imageObjectPosition: '50% 50%' })}
          sx={{ ...miniBtnSx, mb: 0.35 }}
        >
          Ausschnitt zentrieren
        </Button>
      ) : null}
      <Typography sx={{ fontSize: 9, color: PRES_EDITOR_UI.textMuted, lineHeight: 1.35, mb: 0.75 }}>
        {hint}
      </Typography>
      <Typography sx={{ fontSize: 9, fontWeight: 700, color: PRES_EDITOR_UI.textMuted, mb: 0.4 }}>
        Rahmen
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.4, mb: 0.55 }}>
        {IMAGE_FRAME_PRESET_ORDER.map((id) => {
          const preview = imageFrameParts(IMAGE_FRAME_PRESETS[id], 0.28, accentColor);
          const current = element.imageFrame?.preset || 'none';
          const selected = id === 'none' ? !imageFrameIsActive(element.imageFrame) : current === id;
          return (
            <Tooltip key={id} title={IMAGE_FRAME_PRESET_LABELS[id]} placement="top">
              <Box
                onClick={() =>
                  onUpdate({
                    imageFrame:
                      id === 'none'
                        ? undefined
                        : {
                            ...IMAGE_FRAME_PRESETS[id],
                            color:
                              IMAGE_FRAME_PRESETS[id].color === 'accent'
                                ? accentColor
                                : IMAGE_FRAME_PRESETS[id].color,
                          },
                  })
                }
                sx={{
                  width: 34,
                  height: 26,
                  cursor: 'pointer',
                  bgcolor: '#eceff1',
                  p: '3px',
                  boxSizing: 'border-box',
                  outline: selected ? `2px solid ${PRES_EDITOR_UI.accent}` : '1px solid #cfd8dc',
                  outlineOffset: 0,
                  '&:hover': { outlineColor: PRES_EDITOR_UI.accent },
                }}
              >
                <Box
                  sx={{
                    width: '100%',
                    height: '100%',
                    ...preview.wrap,
                    boxShadow: preview.wrap.boxShadow || 'none',
                  }}
                >
                  <Box
                    sx={{
                      width: '100%',
                      height: '100%',
                      ...preview.inner,
                      background:
                        preview.inner.background ||
                        'linear-gradient(135deg, #90caf9 0%, #42a5f5 100%)',
                    }}
                  />
                </Box>
              </Box>
            </Tooltip>
          );
        })}
      </Box>
      {imageFrameIsActive(element.imageFrame) && (
        <>
          <Typography sx={{ fontSize: 9, color: PRES_EDITOR_UI.textMuted, mb: 0.3 }}>
            Farbe
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.3, mb: 0.45 }}>
            {[accentColor, ...IMAGE_FRAME_COLORS, ...JOHNNY_ACCENT_PRESETS.slice(0, 8)]
              .filter((c, i, arr) => arr.indexOf(c) === i)
              .map((c) => (
                <Box
                  key={c}
                  onClick={() => onUpdate({ imageFrame: withImageFrameColor(element.imageFrame, c) })}
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: '3px',
                    bgcolor: c,
                    border:
                      (element.imageFrame?.color || '') === c
                        ? `2px solid ${PRES_EDITOR_UI.accent}`
                        : c === '#ffffff'
                          ? '1px solid #bdbdbd'
                          : '1px solid rgba(0,0,0,0.15)',
                    cursor: 'pointer',
                  }}
                />
              ))}
          </Box>
          <Typography sx={{ fontSize: 9, color: PRES_EDITOR_UI.textMuted, mb: 0.3 }}>
            Stärke
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.3, mb: 0.45 }}>
            {IMAGE_FRAME_WIDTHS.map((w) => (
              <Button
                key={w}
                size="small"
                variant={(element.imageFrame?.width || 0) === w ? 'contained' : 'outlined'}
                onClick={() => onUpdate({ imageFrame: withImageFrameWidth(element.imageFrame, w) })}
                sx={{ ...miniBtnSx, minWidth: 28, px: 0.4 }}
              >
                {w}
              </Button>
            ))}
          </Box>
          <Typography sx={{ fontSize: 9, color: PRES_EDITOR_UI.textMuted, mb: 0.3 }}>
            Strich
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.3, mb: 0.75 }}>
            {IMAGE_FRAME_DASHES.map((d) => (
              <Button
                key={d.id}
                size="small"
                variant={(element.imageFrame?.dash || 'solid') === d.id ? 'contained' : 'outlined'}
                onClick={() => onUpdate({ imageFrame: withImageFrameDash(element.imageFrame, d.id) })}
                sx={{ ...miniBtnSx, px: 0.45 }}
              >
                {d.label}
              </Button>
            ))}
          </Box>
        </>
      )}
      {onEnhance && element.src?.trim() && (
        <Button
          size="small"
          fullWidth
          variant="outlined"
          disabled={enhancing}
          startIcon={<EnhanceIcon sx={{ fontSize: 14 }} />}
          onClick={onEnhance}
          sx={{ ...miniBtnSx, mb: 0.35 }}
        >
          {enhancing ? 'Verbessern…' : 'Foto verbessern'}
        </Button>
      )}
      {onRemoveBackground && element.src?.trim() && (
        <Button
          size="small"
          fullWidth
          variant="outlined"
          disabled={removingBackground}
          startIcon={<RemoveBgIcon sx={{ fontSize: 14 }} />}
          onClick={onRemoveBackground}
          sx={{ ...miniBtnSx, mb: 0.75 }}
        >
          {removingBackground ? 'Hintergrund…' : 'Weißen Hintergrund weg'}
        </Button>
      )}
      {showGeometry && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.35, mb: 0.5 }}>
          {(['x', 'y', 'w', 'h'] as const).map((key) => (
            <TextField
              key={key}
              size="small"
              type="number"
              label={key.toUpperCase()}
              value={element[key]}
              onChange={(e) => onUpdate({ [key]: Number(e.target.value) })}
              sx={{
                width: '48%',
                '& .MuiInputBase-root': { fontSize: 10, height: 28 },
                '& .MuiInputLabel-root': { fontSize: 9 },
              }}
            />
          ))}
        </Box>
      )}
    </>
  );
};

export default PresentationImageToolsPanel;
