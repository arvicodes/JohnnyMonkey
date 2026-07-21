import React, { useState } from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  Checkbox,
  Divider,
  FormControlLabel,
  IconButton,
  Popover,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  ContentCut as CutIcon,
  ContentCopy as CopyIcon,
  ContentPaste as PasteIcon,
  Crop as CropIcon,
  ImageOutlined as ImageIcon,
  PaletteOutlined as PaletteIcon,
  SettingsOutlined as SettingsIcon,
  TextFields as TextIcon,
  FlipToFront as FrontIcon,
  FlipToBack as BackIcon,
  ArrowUpward as UpIcon,
  ArrowDownward as DownIcon,
  LayersOutlined as BackgroundLayerIcon,
  Layers as ForegroundLayerIcon,
  CategoryOutlined as ShapeIcon,
  TrendingFlat as ArrowShapeIcon,
  HorizontalRule as LineShapeIcon,
  CropSquare as RectShapeIcon,
  CircleOutlined as EllipseShapeIcon,
} from '@mui/icons-material';
import {
  PresentationShapeKind,
  PresentationSlide,
  SlideElement,
} from '../../lib/presentationDeck';
import {
  type ElementLayerAction,
  type ElementStackLayer,
  getElementStackLayer,
} from '../../lib/presentationElementLayers';
import { isHomeworkSlide } from '../../lib/presentationSlideTemplates';
import { isImageCropMode } from '../../lib/presentationImageUtils';
import { SLIDE_SHAPE_LABELS } from '../../lib/presentationSlideShapes';
import { JOHNNY_ACCENT_PRESETS } from '../../lib/presentationTheme';
import { PRES_EDITOR_UI } from '../../lib/presentationEditorUi';

const iconBtnSx = PRES_EDITOR_UI.toolbarIcon;

const miniBtnSx = {
  ...PRES_EDITOR_UI.toolbarChip,
  py: 0.15,
};

const toolGroupSx = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 0.15,
  border: `1px solid ${PRES_EDITOR_UI.barBorder}`,
  borderRadius: '7px',
  bgcolor: '#fff',
  px: 0.2,
  py: 0.1,
};

interface PresentationSlideToolsBarProps {
  slide: PresentationSlide | null;
  selectedElement: SlideElement | null;
  showLayoutImage: boolean;
  onApplyAccentColor: (color: string, allSlides: boolean) => void;
  onAddTextElement: () => void;
  onAddImageElement: () => void;
  onAddLayoutImage: () => void;
  onAddShapeElement: (kind: PresentationShapeKind) => void;
  onUpdateElement: (id: string, patch: Partial<SlideElement>) => void;
  onDeleteElement: (id: string) => void;
  onCutElement?: () => void;
  onCopyElement?: () => void;
  onPasteElement?: () => void;
  canPasteElement?: boolean;
  onReorderElementLayer: (id: string, action: ElementLayerAction) => void;
  onSetElementStackLayer: (id: string, layer: ElementStackLayer) => void;
  onUpdateSlide?: (patch: Partial<PresentationSlide>) => void;
}

const PresentationSlideToolsBar: React.FC<PresentationSlideToolsBarProps> = ({
  slide,
  selectedElement,
  showLayoutImage,
  onApplyAccentColor,
  onAddTextElement,
  onAddImageElement,
  onAddLayoutImage,
  onAddShapeElement,
  onUpdateElement,
  onDeleteElement,
  onCutElement,
  onCopyElement,
  onPasteElement,
  canPasteElement = false,
  onReorderElementLayer,
  onSetElementStackLayer,
  onUpdateSlide,
}) => {
  const [elementAnchor, setElementAnchor] = useState<HTMLElement | null>(null);
  const [accentAnchor, setAccentAnchor] = useState<HTMLElement | null>(null);
  const [shapeAnchor, setShapeAnchor] = useState<HTMLElement | null>(null);
  const [accentForAll, setAccentForAll] = useState(false);

  const accentColor = slide?.accentColor || JOHNNY_ACCENT_PRESETS[0];
  const stackLayer = selectedElement ? getElementStackLayer(selectedElement) : 'foreground';
  const showHomeworkSubmissionToggle = Boolean(slide && isHomeworkSlide(slide) && onUpdateSlide);

  const layerIconGroup = selectedElement ? (
    <ButtonGroup size="small" variant="outlined" sx={{ '& .MuiButton-root': { ...miniBtnSx, minWidth: 26, px: 0.35 } }}>
      {(
        [
          ['backward', <DownIcon key="d" sx={{ fontSize: 14 }} />, 'Schritt hinten'],
          ['forward', <UpIcon key="u" sx={{ fontSize: 14 }} />, 'Schritt vorne'],
        ] as const
      ).map(([action, icon, title]) => (
        <Tooltip key={action} title={title}>
          <Button onClick={() => onReorderElementLayer(selectedElement.id, action)}>{icon}</Button>
        </Tooltip>
      ))}
    </ButtonGroup>
  ) : null;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.35, flexShrink: 0 }}>
      {showHomeworkSubmissionToggle && (
        <>
          <FormControlLabel
            sx={{
              m: 0,
              mr: 0.15,
              ml: 0.1,
              gap: 0.1,
              userSelect: 'none',
              '& .MuiFormControlLabel-label': {
                fontSize: '0.68rem',
                fontWeight: 700,
                color: PRES_EDITOR_UI.textMuted,
                whiteSpace: 'nowrap',
              },
            }}
            control={
              <Checkbox
                size="small"
                checked={slide?.homeworkSubmissionRequired !== false}
                onChange={(e) =>
                  onUpdateSlide?.({ homeworkSubmissionRequired: e.target.checked })
                }
                sx={{
                  p: 0.35,
                  color: PRES_EDITOR_UI.textMuted,
                  '&.Mui-checked': { color: PRES_EDITOR_UI.accent },
                }}
              />
            }
            label="Abgabe nötig"
          />
          <Divider
            orientation="vertical"
            flexItem
            sx={{ borderColor: PRES_EDITOR_UI.barBorder, mx: 0.1, height: 20 }}
          />
        </>
      )}
      <Box sx={toolGroupSx}>
        <Tooltip title="Textfeld">
          <IconButton size="small" onClick={onAddTextElement} sx={iconBtnSx}>
            <TextIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Bild">
          <IconButton size="small" onClick={onAddImageElement} sx={iconBtnSx}>
            <ImageIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>
        {showLayoutImage && (
          <Tooltip title="Layout-Bild">
            <IconButton size="small" onClick={onAddLayoutImage} sx={iconBtnSx}>
              <ImageIcon sx={{ fontSize: 14, opacity: 0.75 }} />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="Form / Pfeil">
          <IconButton
            size="small"
            onClick={(e) => setShapeAnchor(e.currentTarget)}
            sx={iconBtnSx}
            aria-label="Form einfügen"
          >
            <ShapeIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>
        {canPasteElement && (
          <Tooltip title="Bild/Form einfügen (⌘V)">
            <IconButton size="small" onClick={() => onPasteElement?.()} sx={iconBtnSx}>
              <PasteIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        )}
        <Popover
          open={Boolean(shapeAnchor)}
          anchorEl={shapeAnchor}
          onClose={() => setShapeAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        >
          <Box sx={{ p: 1, display: 'flex', flexDirection: 'column', gap: 0.35, minWidth: 160 }}>
            <Typography sx={{ fontSize: 9, fontWeight: 700, color: PRES_EDITOR_UI.textMuted, px: 0.5 }}>
              Form einfügen
            </Typography>
            {(
              [
                ['arrow', <ArrowShapeIcon key="a" sx={{ fontSize: 18 }} />],
                ['line', <LineShapeIcon key="l" sx={{ fontSize: 18 }} />],
                ['rect', <RectShapeIcon key="r" sx={{ fontSize: 18 }} />],
                ['ellipse', <EllipseShapeIcon key="e" sx={{ fontSize: 18 }} />],
              ] as const
            ).map(([kind, icon]) => (
              <Button
                key={kind}
                size="small"
                startIcon={icon}
                onClick={() => {
                  onAddShapeElement(kind);
                  setShapeAnchor(null);
                }}
                sx={{
                  ...miniBtnSx,
                  justifyContent: 'flex-start',
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                {SLIDE_SHAPE_LABELS[kind]}
              </Button>
            ))}
            <Typography sx={{ fontSize: 9, color: PRES_EDITOR_UI.textMuted, px: 0.5, pt: 0.35 }}>
              Im Text: <code>--&gt;</code> → · <code>==&gt;</code> ⇒
            </Typography>
          </Box>
        </Popover>
      </Box>

      {selectedElement && (
        <>
          {(selectedElement.type === 'image' || selectedElement.type === 'shape') && (
            <Box sx={toolGroupSx}>
              <Tooltip title="Ausschneiden (⌘X) — dann andere Folie → Einfügen">
                <IconButton size="small" onClick={() => onCutElement?.()} sx={iconBtnSx}>
                  <CutIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Kopieren (⌘C)">
                <IconButton size="small" onClick={() => onCopyElement?.()} sx={iconBtnSx}>
                  <CopyIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Einfügen (⌘V)">
                <span>
                  <IconButton
                    size="small"
                    disabled={!canPasteElement}
                    onClick={() => onPasteElement?.()}
                    sx={iconBtnSx}
                  >
                    <PasteIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          )}
          {layerIconGroup}
          <Tooltip title="Einstellungen">
                <IconButton
                  size="small"
                  onClick={(e) => setElementAnchor(e.currentTarget)}
                  sx={{ ...iconBtnSx, color: PRES_EDITOR_UI.accent }}
                >
                  <SettingsIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
              <Popover
                open={Boolean(elementAnchor)}
                anchorEl={elementAnchor}
                onClose={() => setElementAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              >
                <Box sx={{ p: 1, width: 248 }}>
                  <Typography sx={{ fontSize: 9, fontWeight: 700, color: PRES_EDITOR_UI.textMuted, mb: 0.5 }}>
                    Ebene
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.35, mb: 0.75 }}>
                    <ButtonGroup size="small" variant="outlined" sx={{ flex: 1, '& .MuiButton-root': miniBtnSx }}>
                      <Button
                        variant={stackLayer === 'background' ? 'contained' : 'outlined'}
                        onClick={() => onSetElementStackLayer(selectedElement.id, 'background')}
                        startIcon={<BackgroundLayerIcon sx={{ fontSize: 13 }} />}
                      >
                        Hg.
                      </Button>
                      <Button
                        variant={stackLayer === 'foreground' ? 'contained' : 'outlined'}
                        onClick={() => onSetElementStackLayer(selectedElement.id, 'foreground')}
                        startIcon={<ForegroundLayerIcon sx={{ fontSize: 13 }} />}
                      >
                        Vg.
                      </Button>
                    </ButtonGroup>
                  </Box>
                  <ButtonGroup
                    size="small"
                    variant="outlined"
                    fullWidth
                    sx={{ mb: 0.75, '& .MuiButton-root': { ...miniBtnSx, flex: 1, px: 0.25 } }}
                  >
                    <Tooltip title="Ganz hinten">
                      <Button onClick={() => onReorderElementLayer(selectedElement.id, 'back')}>
                        <BackIcon sx={{ fontSize: 14 }} />
                      </Button>
                    </Tooltip>
                    <Tooltip title="Schritt hinten">
                      <Button onClick={() => onReorderElementLayer(selectedElement.id, 'backward')}>
                        <DownIcon sx={{ fontSize: 14 }} />
                      </Button>
                    </Tooltip>
                    <Tooltip title="Schritt vorne">
                      <Button onClick={() => onReorderElementLayer(selectedElement.id, 'forward')}>
                        <UpIcon sx={{ fontSize: 14 }} />
                      </Button>
                    </Tooltip>
                    <Tooltip title="Ganz vorne">
                      <Button onClick={() => onReorderElementLayer(selectedElement.id, 'front')}>
                        <FrontIcon sx={{ fontSize: 14 }} />
                      </Button>
                    </Tooltip>
                  </ButtonGroup>

                  {selectedElement.type === 'image' && (
                    <>
                      <Typography sx={{ fontSize: 9, fontWeight: 700, color: PRES_EDITOR_UI.textMuted, mb: 0.5 }}>
                        Bild
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.35, mb: 0.35 }}>
                        <Button
                          size="small"
                          sx={{ ...miniBtnSx, flex: 1 }}
                          variant={selectedElement.imageFit === 'contain' ? 'contained' : 'outlined'}
                          onClick={() =>
                            onUpdateElement(selectedElement.id, { imageFit: 'contain' })
                          }
                        >
                          Einpassen
                        </Button>
                        <Button
                          size="small"
                          sx={{ ...miniBtnSx, flex: 1 }}
                          variant={isImageCropMode(selectedElement) ? 'contained' : 'outlined'}
                          startIcon={<CropIcon sx={{ fontSize: 14 }} />}
                          onClick={() =>
                            onUpdateElement(selectedElement.id, {
                              imageFit: 'cover',
                              imageObjectPosition: selectedElement.imageObjectPosition || '50% 50%',
                            })
                          }
                        >
                          Füllen
                        </Button>
                      </Box>
                      {isImageCropMode(selectedElement) && (
                        <Button
                          size="small"
                          fullWidth
                          variant="outlined"
                          onClick={() =>
                            onUpdateElement(selectedElement.id, { imageObjectPosition: '50% 50%' })
                          }
                          sx={{ ...miniBtnSx, mb: 0.35 }}
                        >
                          Ausschnitt zentrieren
                        </Button>
                      )}
                      <Typography sx={{ fontSize: 9, color: PRES_EDITOR_UI.textMuted, lineHeight: 1.35, mb: 0.75 }}>
                        Ziehen: Bild verschieben · Alt+Ziehen: Ausschnitt (bei Füllen)
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.35, mb: 0.5 }}>
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
                              '& .MuiInputBase-root': { fontSize: 10, height: 28 },
                              '& .MuiInputLabel-root': { fontSize: 9 },
                            }}
                          />
                        ))}
                      </Box>
                    </>
                  )}

                  {selectedElement.type === 'shape' && (
                    <>
                      <Typography sx={{ fontSize: 9, fontWeight: 700, color: PRES_EDITOR_UI.textMuted, mb: 0.5 }}>
                        Form · {SLIDE_SHAPE_LABELS[selectedElement.shapeKind || 'arrow']}
                      </Typography>
                      <Typography sx={{ fontSize: 9, color: PRES_EDITOR_UI.textMuted, mb: 0.35 }}>
                        Farbe
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.35, mb: 0.5 }}>
                        {JOHNNY_ACCENT_PRESETS.slice(0, 8).map((c) => (
                          <Box
                            key={c}
                            onClick={() =>
                              onUpdateElement(selectedElement.id, {
                                strokeColor: c,
                                fillColor:
                                  selectedElement.shapeKind === 'rect' ||
                                  selectedElement.shapeKind === 'ellipse'
                                    ? `${c}33`
                                    : selectedElement.fillColor,
                              })
                            }
                            sx={{
                              width: 18,
                              height: 18,
                              borderRadius: '4px',
                              bgcolor: c,
                              cursor: 'pointer',
                              border:
                                selectedElement.strokeColor === c
                                  ? '2px solid #222'
                                  : '1px solid #ccc',
                            }}
                          />
                        ))}
                      </Box>
                      <TextField
                        size="small"
                        type="number"
                        label="Linienstärke"
                        value={selectedElement.strokeWidth ?? 3}
                        onChange={(e) =>
                          onUpdateElement(selectedElement.id, {
                            strokeWidth: Math.max(1, Math.min(16, Number(e.target.value) || 3)),
                          })
                        }
                        sx={{
                          mb: 0.5,
                          width: '100%',
                          '& .MuiInputBase-root': { fontSize: 10, height: 28 },
                          '& .MuiInputLabel-root': { fontSize: 9 },
                        }}
                      />
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.35, mb: 0.5 }}>
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
                              '& .MuiInputBase-root': { fontSize: 10, height: 28 },
                              '& .MuiInputLabel-root': { fontSize: 9 },
                            }}
                          />
                        ))}
                      </Box>
                    </>
                  )}

                  {(selectedElement.type === 'video' || selectedElement.type === 'embed') && (
                    <TextField
                      size="small"
                      fullWidth
                      label={selectedElement.type === 'video' ? 'Video' : 'URL'}
                      value={selectedElement.src ?? ''}
                      onChange={(e) => onUpdateElement(selectedElement.id, { src: e.target.value })}
                      sx={{
                        mb: 0.5,
                        '& .MuiInputBase-root': { fontSize: 10 },
                        '& .MuiInputLabel-root': { fontSize: 10 },
                      }}
                    />
                  )}

                  {(selectedElement.type === 'video' ||
                    selectedElement.type === 'embed' ||
                    selectedElement.type === 'text') && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.35, mb: 0.5 }}>
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
                          '& .MuiInputBase-root': { fontSize: 10, height: 28 },
                          '& .MuiInputLabel-root': { fontSize: 9 },
                        }}
                      />
                    ))}
                  </Box>
                  )}
                  <Button
                    size="small"
                    color="error"
                    fullWidth
                    onClick={() => {
                      onDeleteElement(selectedElement.id);
                      setElementAnchor(null);
                    }}
                    sx={{ ...miniBtnSx, mt: 0.25 }}
                  >
                    Löschen
                  </Button>
                </Box>
              </Popover>
        </>
      )}

      <Divider orientation="vertical" flexItem sx={{ borderColor: PRES_EDITOR_UI.barBorder, mx: 0.1, height: 20 }} />

      <Tooltip title="Akzentfarbe">
        <IconButton
          size="small"
          onClick={(e) => setAccentAnchor(e.currentTarget)}
          sx={{ ...iconBtnSx, width: 28, gap: 0.25, borderRadius: '7px', px: 0.35 }}
        >
          <PaletteIcon sx={{ fontSize: 14 }} />
          <Box
            sx={{
              width: 11,
              height: 11,
              borderRadius: '50%',
              bgcolor: accentColor,
              border: '1px solid rgba(0,0,0,0.15)',
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
        <Box sx={{ p: 1, width: 200 }}>
          <FormControlLabel
            sx={{ m: 0, mb: 0.5, gap: 0.35 }}
            control={
              <Switch size="small" checked={accentForAll} onChange={(e) => setAccentForAll(e.target.checked)} />
            }
            label={<Typography sx={{ fontSize: 10 }}>Alle Folien</Typography>}
          />
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {JOHNNY_ACCENT_PRESETS.map((c) => (
              <Box
                key={c}
                onClick={() => {
                  onApplyAccentColor(c, accentForAll);
                  setAccentAnchor(null);
                }}
                sx={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  bgcolor: c,
                  cursor: 'pointer',
                  border: accentColor === c ? `2px solid ${PRES_EDITOR_UI.accent}` : '1px solid rgba(0,0,0,0.12)',
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
