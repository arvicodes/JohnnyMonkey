import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  Checkbox,
  Divider,
  FormControlLabel,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
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
  ContentPasteGo as PasteGoIcon,
  Gesture as InkIcon,
  Draw as DrawIcon,
  HighlightAlt as LassoIcon,
  Highlight as MarkerIcon,
  Undo as UndoIcon,
  DeleteSweep as ClearInkIcon,
  Crop as CropIcon,
  RotateLeft as RotateLeftIcon,
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
  RotateRight as RotateRightIcon,
  TrendingFlat as ArrowShapeIcon,
  Timeline as CurvedArrowShapeIcon,
  HorizontalRule as LineShapeIcon,
  CropSquare as RectShapeIcon,
  Square as FilledRectShapeIcon,
  CircleOutlined as EllipseShapeIcon,
  Circle as FilledEllipseShapeIcon,
  AutoFixHigh as RemoveBgIcon,
  AutoAwesome as EnhanceIcon,
  AlignHorizontalLeft as AlignLeftIcon,
  AlignHorizontalCenter as AlignCenterHIcon,
  AlignHorizontalRight as AlignRightIcon,
  AlignVerticalTop as AlignTopIcon,
  AlignVerticalCenter as AlignCenterVIcon,
  AlignVerticalBottom as AlignBottomIcon,
  WidthWide as MatchWidthIcon,
  Height as MatchHeightIcon,
  ViewAgendaOutlined as CardIcon,
  ViewColumnOutlined as CardPairIcon,
  TableChartOutlined as TableIcon,
  Polyline as ConnectorDrawIcon,
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
import {
  alignElementToSlide,
  alignElementToTarget,
  elementAlignLabel,
  elementToRect,
  findNearestElement,
  matchElementSize,
  type AlignKind,
} from '../../lib/presentationElementSnap';
import { CARD_ACCENT_PRESETS, cardHeaderFill } from '../../lib/presentationSlideCards';
import {
  applyCellBackground,
  applyTableMutation,
  applyTableTheme,
  applyZebraStriping,
  getCellFromSelection,
  parseTabularPlainText,
  readTableDimensions,
  TABLE_CELL_BG_PRESETS,
  TABLE_COLOR_THEMES,
  tableAddColumn,
  tableAddRow,
  tableDeleteColumn,
  tableDeleteLastColumn,
  tableDeleteLastRow,
  tableDeleteRow,
  tableTranspose,
  distributeColumnsEvenly,
  distributeRowsEvenly,
  type CreateTableOptions,
} from '../../lib/presentationSlideTables';
import { isHomeworkSlide } from '../../lib/presentationSlideTemplates';
import { ensureWindowCropLock, isImageCropMode, isWindowCropMode, rotateElementByDegrees } from '../../lib/presentationImageUtils';
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
import { SLIDE_SHAPE_LABELS, SHAPE_FILL_PRESETS, shapeFillIsNone } from '../../lib/presentationSlideShapes';
import { JOHNNY_ACCENT_PRESETS } from '../../lib/presentationTheme';
import { PRES_EDITOR_UI } from '../../lib/presentationEditorUi';
import { sanitizePresentationHtml } from '../../lib/presentationRichText';
import { setFormatBarInteracting } from '../../lib/presentationFormatBarGuard';
import {
  PEN_COLORS,
  MARKER_OPACITY_PRESETS,
  isBoxShapeTool,
  lineWidthsForTool,
  toolUsesColor,
  toolUsesLineWidth,
  type PresentationDrawTool,
} from '../../lib/presentationDrawTools';

const iconBtnSx = PRES_EDITOR_UI.toolbarIcon;

const miniBtnSx = {
  ...PRES_EDITOR_UI.toolbarChip,
  py: 0.15,
};

const toolGroupSx = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 0,
  border: `1px solid ${PRES_EDITOR_UI.barBorder}`,
  borderRadius: '6px',
  bgcolor: '#fff',
  px: 0.1,
  py: 0,
};

interface PresentationSlideToolsBarProps {
  slide: PresentationSlide | null;
  selectedElement: SlideElement | null;
  showLayoutImage: boolean;
  onApplyAccentColor: (color: string, allSlides: boolean) => void;
  onAddTextElement: () => void;
  onAddImageElement: () => void;
  onPasteFromClipboard?: (mode: 'image' | 'ink') => void;
  inkEditActive?: boolean;
  inkTool?: PresentationDrawTool;
  inkColor?: string;
  inkLineWidth?: number;
  inkMarkerOpacity?: number;
  canUndoInk?: boolean;
  inkSelectionIsMarker?: boolean;
  onToggleInkEdit?: () => void;
  onSelectInkTool?: (tool: PresentationDrawTool) => void;
  onSelectInkColor?: (color: string) => void;
  onSelectInkLineWidth?: (width: number) => void;
  onSelectInkMarkerOpacity?: (opacity: number) => void;
  onUndoInk?: () => void;
  onClearAllInk?: () => void;
  onAddLayoutImage: () => void;
  onAddShapeElement: (kind: PresentationShapeKind, opts?: { filled?: boolean }) => void;
  onStartConnectorDraw?: () => void;
  connectorDrawActive?: boolean;
  onAddCardElement?: (mode?: 'single' | 'pair') => void;
  onAddTableElement?: (opts?: CreateTableOptions) => void;
  /** Live-Editor der aktuellen Tabelle (Zellen-Format). */
  activeEditor?: HTMLElement | null;
  onUpdateElement: (id: string, patch: Partial<SlideElement>) => void;
  onDeleteElement: (id: string) => void;
  onRemoveImageBackground?: (id: string) => void;
  removingImageBackground?: boolean;
  onEnhanceImage?: (id: string) => void;
  enhancingImage?: boolean;
  inkShapeFillActive?: boolean;
  onToggleInkShapeFill?: () => void;
  onCutElement?: () => void;
  onCopyElement?: () => void;
  onPasteElement?: () => void;
  canPasteElement?: boolean;
  onReorderElementLayer: (id: string, action: ElementLayerAction) => void;
  onSetElementStackLayer: (id: string, layer: ElementStackLayer) => void;
  onUpdateSlide?: (patch: Partial<PresentationSlide>) => void;
}

const SLIDE_ALIGN_ACTIONS: { kind: AlignKind; title: string; icon: React.ReactNode }[] = [
  { kind: 'left', title: 'Links an Folie', icon: <AlignLeftIcon sx={{ fontSize: 14 }} /> },
  { kind: 'center-h', title: 'Horizontal zentrieren (Folie)', icon: <AlignCenterHIcon sx={{ fontSize: 14 }} /> },
  { kind: 'right', title: 'Rechts an Folie', icon: <AlignRightIcon sx={{ fontSize: 14 }} /> },
  { kind: 'top', title: 'Oben an Folie', icon: <AlignTopIcon sx={{ fontSize: 14 }} /> },
  { kind: 'center-v', title: 'Vertikal zentrieren (Folie)', icon: <AlignCenterVIcon sx={{ fontSize: 14 }} /> },
  { kind: 'bottom', title: 'Unten an Folie', icon: <AlignBottomIcon sx={{ fontSize: 14 }} /> },
];

const PresentationSlideToolsBar: React.FC<PresentationSlideToolsBarProps> = ({
  slide,
  selectedElement,
  showLayoutImage,
  onApplyAccentColor,
  onAddTextElement,
  onAddImageElement,
  onPasteFromClipboard,
  inkEditActive = false,
  inkTool = 'select',
  inkColor = '#1565c0',
  inkLineWidth = 3,
  inkMarkerOpacity = 0.14,
  canUndoInk = false,
  inkSelectionIsMarker = false,
  onToggleInkEdit,
  onSelectInkTool,
  onSelectInkColor,
  onSelectInkLineWidth,
  onSelectInkMarkerOpacity,
  onUndoInk,
  onClearAllInk,
  onAddLayoutImage,
  onAddShapeElement,
  onStartConnectorDraw,
  connectorDrawActive = false,
  onAddCardElement,
  onAddTableElement,
  activeEditor = null,
  onUpdateElement,
  onDeleteElement,
  onRemoveImageBackground,
  removingImageBackground = false,
  onEnhanceImage,
  enhancingImage = false,
  inkShapeFillActive = false,
  onToggleInkShapeFill,
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
  const [goodNotesAnchor, setGoodNotesAnchor] = useState<HTMLElement | null>(null);
  const [tableAnchor, setTableAnchor] = useState<HTMLElement | null>(null);
  const [tableEditAnchor, setTableEditAnchor] = useState<HTMLElement | null>(null);
  const [tableRows, setTableRows] = useState(4);
  const [tableCols, setTableCols] = useState(4);
  const [tableThemeId, setTableThemeId] = useState<string>('gelb');
  const [alignAnchor, setAlignAnchor] = useState<HTMLElement | null>(null);
  const [alignTargetId, setAlignTargetId] = useState<string>('');
  const [accentForAll, setAccentForAll] = useState(false);

  useEffect(() => {
    if (selectedElement?.type !== 'table') setTableEditAnchor(null);
  }, [selectedElement?.id, selectedElement?.type]);

  const resolveLiveTableEditor = (): HTMLElement | null => {
    if (!selectedElement || selectedElement.type !== 'table') return null;
    if (
      activeEditor?.closest(`[data-pres-element="${selectedElement.id}"]`) &&
      activeEditor.closest('[data-pres-table-edit]')
    ) {
      return activeEditor;
    }
    return document.querySelector(
      `[data-pres-element="${selectedElement.id}"] [data-pres-table-edit]`,
    ) as HTMLElement | null;
  };

  const runTableMutation = (
    mutator: (
      table: HTMLTableElement,
      cell: HTMLTableCellElement | null,
    ) => boolean | void,
  ) => {
    if (!selectedElement || selectedElement.type !== 'table') return;
    const live = resolveLiveTableEditor();
    const next = applyTableMutation({
      html: selectedElement.html || '',
      liveEditor: live,
      mutator,
    });
    if (next == null) return;
    onUpdateElement(selectedElement.id, { html: sanitizePresentationHtml(next) });
  };

  const renderTableEditPanel = () => {
    if (selectedElement?.type !== 'table') return null;
    const dim = readTableDimensions(selectedElement.html);
    const btnSx = {
      ...miniBtnSx,
      textTransform: 'none' as const,
      fontWeight: 700,
      minWidth: 0,
      px: 0.5,
      py: 0.15,
      fontSize: 10,
      lineHeight: 1.2,
    };
    const swatchSx = {
      width: 16,
      height: 16,
      borderRadius: '3px',
      cursor: 'pointer' as const,
      flexShrink: 0,
    };
    return (
      <Box
        data-presentation-table-tools
        onPointerDown={() => setFormatBarInteracting(true)}
        onPointerUp={() => window.setTimeout(() => setFormatBarInteracting(false), 0)}
        sx={{ p: 0.85, width: 200, display: 'flex', flexDirection: 'column', gap: 0.45 }}
      >
        <Typography sx={{ fontSize: 9, fontWeight: 700, color: PRES_EDITOR_UI.textMuted }}>
          Tabelle · {dim.rows}×{dim.cols}
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0.3 }}>
          <Button size="small" onClick={() => runTableMutation((t) => tableAddRow(t))} sx={btnSx}>
            +Zeile
          </Button>
          <Button size="small" onClick={() => runTableMutation((t) => tableAddColumn(t))} sx={btnSx}>
            +Spalte
          </Button>
          <Tooltip title="Zeilen und Spalten vertauschen">
            <Button
              size="small"
              onClick={() => runTableMutation((t) => tableTranspose(t))}
              sx={btnSx}
            >
              ⇄
            </Button>
          </Tooltip>
          <Button
            size="small"
            onClick={() =>
              runTableMutation((t, cell) => {
                if (cell && tableDeleteRow(t, cell)) return;
                tableDeleteLastRow(t);
              })
            }
            sx={btnSx}
          >
            −Zeile
          </Button>
          <Button
            size="small"
            onClick={() =>
              runTableMutation((t, cell) => {
                if (cell && tableDeleteColumn(t, cell)) return;
                tableDeleteLastColumn(t);
              })
            }
            sx={btnSx}
          >
            −Spalte
          </Button>
          <Tooltip title="Zebra: abwechselnd helle/dunkle Zeilenfarbe (Lesbarkeit)">
            <Button
              size="small"
              onClick={() => runTableMutation((t) => applyZebraStriping(t))}
              sx={btnSx}
            >
              Zebra
            </Button>
          </Tooltip>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.3 }}>
          <Tooltip title="Alle Spalten gleich breit">
            <Button
              size="small"
              onClick={() => runTableMutation((t) => distributeColumnsEvenly(t))}
              sx={btnSx}
            >
              Spalten =
            </Button>
          </Tooltip>
          <Tooltip title="Alle Zeilen gleich hoch">
            <Button
              size="small"
              onClick={() => runTableMutation((t) => distributeRowsEvenly(t))}
              sx={btnSx}
            >
              Zeilen =
            </Button>
          </Tooltip>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.35, flexWrap: 'wrap' }}>
          <Typography sx={{ fontSize: 8, color: PRES_EDITOR_UI.textMuted, mr: 0.15 }}>
            Farbe
          </Typography>
          {TABLE_COLOR_THEMES.map((t) => (
            <Tooltip key={t.id} title={`Tabelle: ${t.label}`}>
              <Box
                onClick={() => runTableMutation((table) => applyTableTheme(table, t))}
                sx={{ ...swatchSx, bgcolor: t.headerBg, border: `1px solid ${t.border}` }}
              />
            </Tooltip>
          ))}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.35, flexWrap: 'wrap' }}>
          <Typography sx={{ fontSize: 8, color: PRES_EDITOR_UI.textMuted, mr: 0.15 }}>
            Zelle
          </Typography>
          {TABLE_CELL_BG_PRESETS.map((c) => (
            <Tooltip key={c} title="Zelle einfärben">
              <Box
                onClick={() =>
                  runTableMutation((table, cell) => {
                    const target =
                      cell ||
                      getCellFromSelection(resolveLiveTableEditor()) ||
                      (table.querySelector('td, th') as HTMLTableCellElement | null);
                    if (target) applyCellBackground(target, c);
                  })
                }
                sx={{ ...swatchSx, bgcolor: c, border: '1px solid #bbb' }}
              />
            </Tooltip>
          ))}
        </Box>
      </Box>
    );
  };

  const accentColor = slide?.accentColor || JOHNNY_ACCENT_PRESETS[0];
  const stackLayer = selectedElement ? getElementStackLayer(selectedElement) : 'foreground';
  const showHomeworkSubmissionToggle = Boolean(slide && isHomeworkSlide(slide) && onUpdateSlide);
  const siblingElements = (slide?.elements || []).filter((el) => el.id !== selectedElement?.id);
  const alignTarget =
    siblingElements.find((el) => el.id === alignTargetId) ||
    (selectedElement
      ? (() => {
          const nearest = findNearestElement(
            elementToRect(selectedElement),
            siblingElements.map(elementToRect),
          );
          return siblingElements.find((el) => el.id === nearest?.id) || siblingElements[0];
        })()
      : undefined);

  const applySlideAlign = (kind: AlignKind) => {
    if (!selectedElement) return;
    onUpdateElement(selectedElement.id, alignElementToSlide(elementToRect(selectedElement), kind));
  };

  const applyTargetAlign = (kind: AlignKind) => {
    if (!selectedElement || !alignTarget) return;
    onUpdateElement(
      selectedElement.id,
      alignElementToTarget(elementToRect(selectedElement), elementToRect(alignTarget), kind),
    );
  };

  const applyMatchSize = (dim: 'w' | 'h' | 'both') => {
    if (!selectedElement || !alignTarget) return;
    onUpdateElement(
      selectedElement.id,
      matchElementSize(elementToRect(selectedElement), elementToRect(alignTarget), dim),
    );
  };


  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.15,
        flexShrink: 0,
        width: 'fit-content',
        flexWrap: 'nowrap',
      }}
    >
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
        <Tooltip title="Bild-Datei">
          <IconButton size="small" onClick={onAddImageElement} sx={iconBtnSx}>
            <ImageIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>
        {onPasteFromClipboard && (
          <>
            <Tooltip title="Aus GoodNotes einfügen: auf der Folie lange tippen → Einfügen, oder ⌘V">
              <IconButton
                size="small"
                onClick={(e) => setGoodNotesAnchor(e.currentTarget)}
                sx={iconBtnSx}
                aria-label="GoodNotes einfügen"
              >
                <PasteGoIcon sx={{ fontSize: 15 }} />
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={goodNotesAnchor}
              open={Boolean(goodNotesAnchor)}
              onClose={() => setGoodNotesAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            >
              <MenuItem
                onClick={() => {
                  setGoodNotesAnchor(null);
                  onPasteFromClipboard('image');
                }}
              >
                <ListItemIcon>
                  <ImageIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary="Als Bild"
                  secondary="Danach auf der Folie lange tippen → Einfügen, oder ⌘V"
                />
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setGoodNotesAnchor(null);
                  onPasteFromClipboard('ink');
                }}
              >
                <ListItemIcon>
                  <InkIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary="Als Stiftstriche"
                  secondary="Danach auf der Folie lange tippen → Einfügen, oder ⌘V"
                />
              </MenuItem>
            </Menu>
          </>
        )}
        {onToggleInkEdit && (
          <Box sx={{ ...toolGroupSx, flexWrap: 'wrap', maxWidth: '100%' }}>
            <Tooltip
              title={
                inkEditActive
                  ? 'Stift aus — tippen & bearbeiten (Folie und Notizen)'
                  : 'Stift an — sofort schreiben (auch Apple Pencil). Werkzeuge: Lasso, Marker, Formen — gilt für Folie und Notizen'
              }
            >
              <IconButton
                size="small"
                onClick={onToggleInkEdit}
                sx={{
                  ...iconBtnSx,
                  ...(inkEditActive
                    ? { bgcolor: `${PRES_EDITOR_UI.accent}22`, color: PRES_EDITOR_UI.accent }
                    : {}),
                }}
                aria-label="Stift & Werkzeuge"
              >
                <DrawIcon sx={{ fontSize: 15 }} />
              </IconButton>
            </Tooltip>
            {inkEditActive && onSelectInkTool && (
              <>
                <Tooltip title="Lasso: umfahren, dann verschieben">
                  <IconButton
                    size="small"
                    onClick={() => onSelectInkTool('select')}
                    sx={{
                      ...iconBtnSx,
                      ...(inkTool === 'select'
                        ? { bgcolor: `${PRES_EDITOR_UI.accent}22`, color: PRES_EDITOR_UI.accent }
                        : {}),
                    }}
                    aria-label="Lasso"
                  >
                    <LassoIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Stift">
                  <IconButton
                    size="small"
                    onClick={() => onSelectInkTool('pen')}
                    sx={{
                      ...iconBtnSx,
                      ...(inkTool === 'pen'
                        ? { bgcolor: `${PRES_EDITOR_UI.accent}22`, color: PRES_EDITOR_UI.accent }
                        : {}),
                    }}
                    aria-label="Stift"
                  >
                    <InkIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Marker">
                  <IconButton
                    size="small"
                    onClick={() => onSelectInkTool('marker')}
                    sx={{
                      ...iconBtnSx,
                      ...(inkTool === 'marker'
                        ? { bgcolor: `${PRES_EDITOR_UI.accent}22`, color: PRES_EDITOR_UI.accent }
                        : {}),
                    }}
                    aria-label="Marker"
                  >
                    <MarkerIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Radierer">
                  <IconButton
                    size="small"
                    onClick={() => onSelectInkTool('eraser')}
                    sx={{
                      ...iconBtnSx,
                      ...(inkTool === 'eraser'
                        ? { bgcolor: `${PRES_EDITOR_UI.accent}22`, color: PRES_EDITOR_UI.accent }
                        : {}),
                    }}
                    aria-label="Radierer"
                  >
                    <Box
                      sx={{
                        width: 11,
                        height: 11,
                        borderRadius: 0.5,
                        bgcolor: inkTool === 'eraser' ? PRES_EDITOR_UI.accent : '#90a4ae',
                        transform: 'rotate(-18deg)',
                      }}
                    />
                  </IconButton>
                </Tooltip>
                <Divider orientation="vertical" flexItem sx={{ mx: 0.2, my: 0.4 }} />
                <Tooltip title="Linie">
                  <IconButton
                    size="small"
                    onClick={() => onSelectInkTool('shape-line')}
                    sx={{
                      ...iconBtnSx,
                      ...(inkTool === 'shape-line'
                        ? { bgcolor: `${PRES_EDITOR_UI.accent}22`, color: PRES_EDITOR_UI.accent }
                        : {}),
                    }}
                    aria-label="Tinten-Linie"
                  >
                    <LineShapeIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Rechteck">
                  <IconButton
                    size="small"
                    onClick={() => onSelectInkTool('shape-rect')}
                    sx={{
                      ...iconBtnSx,
                      ...(inkTool === 'shape-rect'
                        ? { bgcolor: `${PRES_EDITOR_UI.accent}22`, color: PRES_EDITOR_UI.accent }
                        : {}),
                    }}
                    aria-label="Tinten-Rechteck"
                  >
                    <RectShapeIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Kreis">
                  <IconButton
                    size="small"
                    onClick={() => onSelectInkTool('shape-ellipse')}
                    sx={{
                      ...iconBtnSx,
                      ...(inkTool === 'shape-ellipse'
                        ? { bgcolor: `${PRES_EDITOR_UI.accent}22`, color: PRES_EDITOR_UI.accent }
                        : {}),
                    }}
                    aria-label="Tinten-Kreis"
                  >
                    <EllipseShapeIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
                {onToggleInkShapeFill && isBoxShapeTool(inkTool) && (
                  <Tooltip title={inkShapeFillActive ? 'Form ausgefüllt' : 'Form ausfüllen'}>
                    <IconButton
                      size="small"
                      onClick={onToggleInkShapeFill}
                      sx={{
                        ...iconBtnSx,
                        ...(inkShapeFillActive
                          ? { bgcolor: `${PRES_EDITOR_UI.accent}22`, color: PRES_EDITOR_UI.accent }
                          : {}),
                      }}
                      aria-label="Form ausfüllen"
                    >
                      <FilledRectShapeIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                )}
                <Tooltip title="Pfeil">
                  <IconButton
                    size="small"
                    onClick={() => onSelectInkTool('shape-arrow')}
                    sx={{
                      ...iconBtnSx,
                      ...(inkTool === 'shape-arrow'
                        ? { bgcolor: `${PRES_EDITOR_UI.accent}22`, color: PRES_EDITOR_UI.accent }
                        : {}),
                    }}
                    aria-label="Tinten-Pfeil"
                  >
                    <ArrowShapeIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Gebogener Pfeil">
                  <IconButton
                    size="small"
                    onClick={() => onSelectInkTool('shape-curved-arrow')}
                    sx={{
                      ...iconBtnSx,
                      ...(inkTool === 'shape-curved-arrow'
                        ? { bgcolor: `${PRES_EDITOR_UI.accent}22`, color: PRES_EDITOR_UI.accent }
                        : {}),
                    }}
                    aria-label="Tinten-Pfeil gebogen"
                  >
                    <CurvedArrowShapeIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
                {(toolUsesColor(inkTool) || inkTool === 'select') &&
                  PEN_COLORS.map((c) => (
                    <IconButton
                      key={c}
                      size="small"
                      onClick={() => onSelectInkColor?.(c)}
                      aria-label={`Stiftfarbe ${c}`}
                      sx={{
                        ...iconBtnSx,
                        width: 22,
                        height: 22,
                      }}
                    >
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          bgcolor: c,
                          boxShadow:
                            inkColor.toLowerCase() === c.toLowerCase()
                              ? `0 0 0 2px ${PRES_EDITOR_UI.accent}`
                              : '0 0 0 1px rgba(0,0,0,0.2)',
                        }}
                      />
                    </IconButton>
                  ))}
                {toolUsesLineWidth(inkTool) && onSelectInkLineWidth && (
                  <>
                    <Divider orientation="vertical" flexItem sx={{ mx: 0.2, my: 0.4 }} />
                    {lineWidthsForTool(inkTool).map((w) => (
                      <Tooltip key={w} title={`Stärke ${w}`}>
                        <IconButton
                          size="small"
                          onClick={() => onSelectInkLineWidth(w)}
                          aria-label={`Linienstärke ${w}`}
                          sx={{
                            ...iconBtnSx,
                            width: 22,
                            height: 22,
                            ...(Math.abs(inkLineWidth - w) < 0.01
                              ? { bgcolor: `${PRES_EDITOR_UI.accent}22` }
                              : {}),
                          }}
                        >
                          <Box
                            sx={{
                              width: Math.min(14, 4 + w * 0.45),
                              height: Math.min(14, 4 + w * 0.45),
                              borderRadius: '50%',
                              bgcolor: PRES_EDITOR_UI.textMuted,
                            }}
                          />
                        </IconButton>
                      </Tooltip>
                    ))}
                  </>
                )}
                {(inkTool === 'marker' || inkSelectionIsMarker) && onSelectInkMarkerOpacity && (
                  <>
                    <Divider orientation="vertical" flexItem sx={{ mx: 0.2, my: 0.4 }} />
                    {MARKER_OPACITY_PRESETS.map((op) => (
                      <Tooltip key={op} title={`Marker-Deckkraft ${Math.round(op * 100)}%`}>
                        <IconButton
                          size="small"
                          onClick={() => onSelectInkMarkerOpacity(op)}
                          aria-label={`Marker-Deckkraft ${op}`}
                          sx={{
                            ...iconBtnSx,
                            width: 22,
                            height: 22,
                            ...(Math.abs(inkMarkerOpacity - op) < 0.01
                              ? { bgcolor: `${PRES_EDITOR_UI.accent}22` }
                              : {}),
                          }}
                        >
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '2px',
                              bgcolor: inkColor,
                              opacity: Math.max(0.2, op * 2.2),
                              border: '1px solid rgba(0,0,0,0.2)',
                            }}
                          />
                        </IconButton>
                      </Tooltip>
                    ))}
                  </>
                )}
                {onUndoInk && (
                  <Tooltip title="Letzten Strich rückgängig">
                    <span>
                      <IconButton
                        size="small"
                        onClick={onUndoInk}
                        disabled={!canUndoInk}
                        sx={iconBtnSx}
                        aria-label="Strich rückgängig"
                      >
                        <UndoIcon sx={{ fontSize: 15 }} />
                      </IconButton>
                    </span>
                  </Tooltip>
                )}
                {onClearAllInk && (
                  <Tooltip title="Alle Stiftstriche auf dieser Folie löschen">
                    <span>
                      <IconButton
                        size="small"
                        onClick={onClearAllInk}
                        disabled={!canUndoInk}
                        sx={iconBtnSx}
                        aria-label="Alle Striche löschen"
                      >
                        <ClearInkIcon sx={{ fontSize: 15 }} />
                      </IconButton>
                    </span>
                  </Tooltip>
                )}
              </>
            )}
          </Box>
        )}
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
        <Tooltip title="Ecken-Pfeil zeichnen (Ecke klicken, Doppelklick = fertig)">
          <IconButton
            size="small"
            onClick={() => onStartConnectorDraw?.()}
            sx={{
              ...iconBtnSx,
              ...(connectorDrawActive
                ? { color: PRES_EDITOR_UI.accent, bgcolor: 'rgba(46,125,50,0.14)' }
                : {}),
            }}
            aria-label="Ecken-Pfeil zeichnen"
          >
            <ConnectorDrawIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Info-Karte (Titelkopf + Inhalt)">
          <IconButton
            size="small"
            onClick={() => onAddCardElement?.('single')}
            sx={iconBtnSx}
            aria-label="Karte einfügen"
          >
            <CardIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Zwei Karten nebeneinander">
          <IconButton
            size="small"
            onClick={() => onAddCardElement?.('pair')}
            sx={iconBtnSx}
            aria-label="Kartenpaar einfügen"
          >
            <CardPairIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>
        <Tooltip
          title={
            selectedElement?.type === 'table'
              ? 'Tabelle bearbeiten (Zeilen, Spalten, Farben)'
              : 'Tabelle einfügen'
          }
        >
          <IconButton
            size="small"
            onClick={(e) => {
              if (selectedElement?.type === 'table') {
                setTableAnchor(null);
                setTableEditAnchor(e.currentTarget);
              } else {
                setTableEditAnchor(null);
                setTableAnchor(e.currentTarget);
              }
            }}
            sx={{
              ...iconBtnSx,
              ...(selectedElement?.type === 'table'
                ? { color: PRES_EDITOR_UI.accent, bgcolor: 'rgba(46,125,50,0.12)' }
                : {}),
            }}
            aria-label={
              selectedElement?.type === 'table' ? 'Tabelle bearbeiten' : 'Tabelle einfügen'
            }
          >
            <TableIcon sx={{ fontSize: 15 }} />
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
        <Popover
          open={Boolean(shapeAnchor)}
          anchorEl={shapeAnchor}
          onClose={() => setShapeAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        >
          <Box sx={{ p: 1, display: 'flex', flexDirection: 'column', gap: 0.35, minWidth: 180 }}>
            <Typography sx={{ fontSize: 9, fontWeight: 700, color: PRES_EDITOR_UI.textMuted, px: 0.5 }}>
              Form einfügen
            </Typography>
            {(
              [
                ['arrow', 'Pfeil', <ArrowShapeIcon key="a" sx={{ fontSize: 18 }} />],
                ['curved-arrow', 'Gebogener Pfeil', <CurvedArrowShapeIcon key="ca" sx={{ fontSize: 18 }} />],
                ['connector', 'Ecken-Pfeil', <ConnectorDrawIcon key="c" sx={{ fontSize: 18 }} />],
                ['line', 'Linie', <LineShapeIcon key="l" sx={{ fontSize: 18 }} />],
                ['rect', 'Rechteck', <RectShapeIcon key="r" sx={{ fontSize: 18 }} />],
                ['rect-filled', 'Rechteck ausgefüllt', <FilledRectShapeIcon key="rf" sx={{ fontSize: 18 }} />],
                ['ellipse', 'Kreis / Oval', <EllipseShapeIcon key="e" sx={{ fontSize: 18 }} />],
                ['ellipse-filled', 'Kreis ausgefüllt', <FilledEllipseShapeIcon key="ef" sx={{ fontSize: 18 }} />],
              ] as const
            ).map(([kind, label, icon]) => (
              <Button
                key={kind}
                size="small"
                startIcon={icon}
                onClick={() => {
                  if (kind === 'connector') {
                    onStartConnectorDraw?.();
                  } else if (kind === 'rect-filled') {
                    onAddShapeElement('rect', { filled: true });
                  } else if (kind === 'ellipse-filled') {
                    onAddShapeElement('ellipse', { filled: true });
                  } else {
                    onAddShapeElement(kind);
                  }
                  setShapeAnchor(null);
                }}
                sx={{
                  ...miniBtnSx,
                  justifyContent: 'flex-start',
                  textTransform: 'none',
                }}
              >
                {label}
              </Button>
            ))}
            <Typography sx={{ fontSize: 9, color: PRES_EDITOR_UI.textMuted, px: 0.5, pt: 0.35 }}>
              Im Text: <code>--&gt;</code> → · <code>==&gt;</code> ⇒
            </Typography>
          </Box>
        </Popover>
        <Popover
          open={Boolean(tableAnchor)}
          anchorEl={tableAnchor}
          onClose={() => setTableAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        >
          <Box
            sx={{ p: 1.25, display: 'flex', flexDirection: 'column', gap: 0.75, minWidth: 220 }}
            data-presentation-table-tools
          >
            <Typography sx={{ fontSize: 10, fontWeight: 700, color: PRES_EDITOR_UI.textMuted }}>
              Tabelle einfügen
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.75 }}>
              <TextField
                size="small"
                type="number"
                label="Zeilen"
                value={tableRows}
                onChange={(e) => setTableRows(Math.max(2, Math.min(20, Number(e.target.value) || 2)))}
                inputProps={{ min: 2, max: 20 }}
                sx={{
                  flex: 1,
                  '& .MuiInputBase-root': { fontSize: 11, height: 32 },
                  '& .MuiInputLabel-root': { fontSize: 10 },
                }}
              />
              <TextField
                size="small"
                type="number"
                label="Spalten"
                value={tableCols}
                onChange={(e) => setTableCols(Math.max(2, Math.min(12, Number(e.target.value) || 2)))}
                inputProps={{ min: 2, max: 12 }}
                sx={{
                  flex: 1,
                  '& .MuiInputBase-root': { fontSize: 11, height: 32 },
                  '& .MuiInputLabel-root': { fontSize: 10 },
                }}
              />
            </Box>
            <Typography sx={{ fontSize: 9, color: PRES_EDITOR_UI.textMuted }}>Farbe</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.4 }}>
              {TABLE_COLOR_THEMES.map((t) => (
                <Tooltip key={t.id} title={t.label}>
                  <Box
                    onClick={() => setTableThemeId(t.id)}
                    sx={{
                      width: 22,
                      height: 22,
                      borderRadius: '4px',
                      bgcolor: t.headerBg,
                      border:
                        tableThemeId === t.id ? '2px solid #222' : `1px solid ${t.border}`,
                      cursor: 'pointer',
                    }}
                  />
                </Tooltip>
              ))}
            </Box>
            <Button
              size="small"
              variant="contained"
              onClick={() => {
                onAddTableElement?.({
                  rows: tableRows,
                  cols: tableCols,
                  themeId: tableThemeId,
                });
                setTableAnchor(null);
              }}
              sx={{
                ...miniBtnSx,
                textTransform: 'none',
                fontWeight: 700,
                bgcolor: PRES_EDITOR_UI.accent,
                color: '#fff',
                '&:hover': { bgcolor: PRES_EDITOR_UI.accent },
              }}
            >
              Einfügen
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  const matrix = parseTabularPlainText(text);
                  if (!matrix) {
                    window.alert('Zwischenablage enthält keinen Tabellen-Text (Tabs oder |).');
                    return;
                  }
                  onAddTableElement?.({
                    matrix,
                    rows: matrix.length,
                    cols: matrix[0]?.length || 2,
                    themeId: tableThemeId,
                  });
                  setTableAnchor(null);
                } catch {
                  window.alert('Zwischenablage konnte nicht gelesen werden.');
                }
              }}
              sx={{
                ...miniBtnSx,
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              Aus Zwischenablage
            </Button>
            <Typography sx={{ fontSize: 9, color: PRES_EDITOR_UI.textMuted, lineHeight: 1.35 }}>
              Danach: Zellen tippen, Spaltenränder ziehen. Text auf Folie: Formatleiste → Tabelle / x².
            </Typography>
          </Box>
        </Popover>
        <Popover
          open={Boolean(tableEditAnchor) && selectedElement?.type === 'table'}
          anchorEl={tableEditAnchor}
          onClose={() => setTableEditAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        >
          {renderTableEditPanel()}
        </Popover>
      </Box>

      {selectedElement &&
        (selectedElement.type === 'image' ||
          selectedElement.type === 'shape' ||
          selectedElement.type === 'card' ||
          selectedElement.type === 'table' ||
          selectedElement.type === 'text') && (
          <Box sx={toolGroupSx}>
            <Tooltip title="Ausschneiden (⌘X)">
              <IconButton size="small" onClick={() => onCutElement?.()} sx={iconBtnSx}>
                <CutIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Kopieren (⌘C)">
              <IconButton size="small" onClick={() => onCopyElement?.()} sx={iconBtnSx}>
                <CopyIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          </Box>
        )}

      {selectedElement && (
        <Box sx={toolGroupSx}>
          <Tooltip title="Ausrichten & Größe">
            <IconButton
              size="small"
              onClick={(e) => {
                if (!alignTargetId && alignTarget) setAlignTargetId(alignTarget.id);
                setAlignAnchor(e.currentTarget);
              }}
              sx={{ ...iconBtnSx, color: PRES_EDITOR_UI.accent }}
            >
              <AlignCenterHIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
          <Popover
            open={Boolean(alignAnchor)}
            anchorEl={alignAnchor}
            onClose={() => setAlignAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          >
            <Box sx={{ p: 1, width: 268 }}>
              <Typography sx={{ fontSize: 9, fontWeight: 700, color: PRES_EDITOR_UI.textMuted, mb: 0.35 }}>
                An Folie ausrichten
              </Typography>
              <ButtonGroup
                size="small"
                variant="outlined"
                fullWidth
                sx={{ mb: 0.75, '& .MuiButton-root': { ...miniBtnSx, flex: 1, px: 0.15 } }}
              >
                {SLIDE_ALIGN_ACTIONS.map(({ kind, title, icon }) => (
                  <Tooltip key={kind} title={title}>
                    <Button onClick={() => applySlideAlign(kind)}>{icon}</Button>
                  </Tooltip>
                ))}
              </ButtonGroup>

              <Typography sx={{ fontSize: 9, fontWeight: 700, color: PRES_EDITOR_UI.textMuted, mb: 0.35 }}>
                Größe (nächstes Element)
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.35, mb: 0.75 }}>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={!alignTarget}
                  onClick={() => applyMatchSize('w')}
                  sx={{ ...miniBtnSx, flex: 1 }}
                  startIcon={<MatchWidthIcon sx={{ fontSize: 14 }} />}
                >
                  Breite
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={!alignTarget}
                  onClick={() => applyMatchSize('h')}
                  sx={{ ...miniBtnSx, flex: 1 }}
                  startIcon={<MatchHeightIcon sx={{ fontSize: 14 }} />}
                >
                  Höhe
                </Button>
              </Box>

              <Typography sx={{ fontSize: 9, fontWeight: 700, color: PRES_EDITOR_UI.textMuted, mb: 0.5 }}>
                Bezugselement
              </Typography>
              <TextField
                select
                size="small"
                fullWidth
                disabled={siblingElements.length === 0}
                value={alignTarget?.id || ''}
                onChange={(e) => setAlignTargetId(e.target.value)}
                SelectProps={{ native: true }}
                sx={{
                  mb: 0.75,
                  '& .MuiInputBase-root': { fontSize: 11, height: 30 },
                }}
              >
                {siblingElements.length === 0 ? (
                  <option value="">Kein weiteres Element</option>
                ) : (
                  siblingElements.map((el, i) => (
                    <option key={el.id} value={el.id}>
                      {elementAlignLabel(el, i)}
                    </option>
                  ))
                )}
              </TextField>
              <Typography sx={{ fontSize: 9, fontWeight: 700, color: PRES_EDITOR_UI.textMuted, mb: 0.35 }}>
                Kanten am Bezug
              </Typography>
              <ButtonGroup
                size="small"
                variant="outlined"
                fullWidth
                sx={{ mb: 0.5, '& .MuiButton-root': { ...miniBtnSx, flex: 1, px: 0.15 } }}
              >
                {SLIDE_ALIGN_ACTIONS.map(({ kind, title, icon }) => (
                  <Tooltip key={kind} title={title.replace(' (Folie)', '').replace(' an Folie', '')}>
                    <Button disabled={!alignTarget} onClick={() => applyTargetAlign(kind)}>
                      {icon}
                    </Button>
                  </Tooltip>
                ))}
              </ButtonGroup>
              <Button
                size="small"
                variant="outlined"
                disabled={!alignTarget}
                onClick={() => applyMatchSize('both')}
                sx={{ ...miniBtnSx, width: '100%' }}
              >
                Breite + Höhe vom Bezug
              </Button>
              <Typography sx={{ fontSize: 9, color: PRES_EDITOR_UI.textMuted, mt: 0.75, lineHeight: 1.35 }}>
                Beim Ziehen: Hilfslinien · ⌘/Ctrl halten = ohne Magnet
              </Typography>
            </Box>
          </Popover>
          <Tooltip title="Einstellungen">
            <IconButton
              size="small"
              onClick={(e) => setElementAnchor(e.currentTarget)}
              sx={{ ...iconBtnSx, color: PRES_EDITOR_UI.accent }}
            >
              <SettingsIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {selectedElement && (
        <>
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
                    <Tooltip title="Eine hinten">
                      <Button onClick={() => onReorderElementLayer(selectedElement.id, 'backward')}>
                        <DownIcon sx={{ fontSize: 14 }} />
                      </Button>
                    </Tooltip>
                    <Tooltip title="Eine vorne">
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
                          variant={
                            selectedElement.imageFit !== 'cover' && !isWindowCropMode(selectedElement)
                              ? 'contained'
                              : 'outlined'
                          }
                          onClick={() =>
                            onUpdateElement(selectedElement.id, {
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
                          variant={isImageCropMode(selectedElement) ? 'contained' : 'outlined'}
                          startIcon={<CropIcon sx={{ fontSize: 14 }} />}
                          onClick={() =>
                            onUpdateElement(selectedElement.id, ensureWindowCropLock(selectedElement))
                          }
                        >
                          Zuschneiden
                        </Button>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.35, mb: 0.35 }}>
                        <Button
                          size="small"
                          sx={{ ...miniBtnSx, flex: 1 }}
                          startIcon={<RotateLeftIcon sx={{ fontSize: 14 }} />}
                          onClick={() =>
                            onUpdateElement(
                              selectedElement.id,
                              rotateElementByDegrees(selectedElement, -90),
                            )
                          }
                        >
                          90° links
                        </Button>
                        <Button
                          size="small"
                          sx={{ ...miniBtnSx, flex: 1 }}
                          startIcon={<RotateRightIcon sx={{ fontSize: 14 }} />}
                          onClick={() =>
                            onUpdateElement(
                              selectedElement.id,
                              rotateElementByDegrees(selectedElement, 90),
                            )
                          }
                        >
                          90° rechts
                        </Button>
                      </Box>
                      {isWindowCropMode(selectedElement) && selectedElement.imageSourceRect ? (
                        <Button
                          size="small"
                          fullWidth
                          variant="outlined"
                          onClick={() =>
                            onUpdateElement(selectedElement.id, {
                              x: selectedElement.imageSourceRect!.x,
                              y: selectedElement.imageSourceRect!.y,
                              w: selectedElement.imageSourceRect!.w,
                              h: selectedElement.imageSourceRect!.h,
                            })
                          }
                          sx={{ ...miniBtnSx, mb: 0.35 }}
                        >
                          Zuschnitt zurücksetzen
                        </Button>
                      ) : isImageCropMode(selectedElement) ? (
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
                      ) : null}
                      <Typography sx={{ fontSize: 9, color: PRES_EDITOR_UI.textMuted, lineHeight: 1.35, mb: 0.75 }}>
                        {isWindowCropMode(selectedElement)
                          ? 'Ecken ziehen = Größe · Kanten ziehen = Ausschnitt · Ziehen verschiebt das Bild'
                          : isImageCropMode(selectedElement)
                            ? 'Ecken ziehen = Größe · Kanten = Ausschnitt · Ziehen verschiebt den Ausschnitt'
                            : 'Ziehen verschiebt das Bild · Zuschneiden für Ausschnitt · Ecken = Größe'}
                      </Typography>
                      <Typography sx={{ fontSize: 9, fontWeight: 700, color: PRES_EDITOR_UI.textMuted, mb: 0.4 }}>
                        Rahmen
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.4, mb: 0.55 }}>
                        {IMAGE_FRAME_PRESET_ORDER.map((id) => {
                          const preview = imageFrameParts(IMAGE_FRAME_PRESETS[id], 0.28, accentColor);
                          const current = selectedElement.imageFrame?.preset || 'none';
                          const selected =
                            id === 'none'
                              ? !imageFrameIsActive(selectedElement.imageFrame)
                              : current === id;
                          return (
                            <Tooltip key={id} title={IMAGE_FRAME_PRESET_LABELS[id]} placement="top">
                              <Box
                                onClick={() =>
                                  onUpdateElement(selectedElement.id, {
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
                                  outline: selected
                                    ? `2px solid ${PRES_EDITOR_UI.accent}`
                                    : '1px solid #cfd8dc',
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
                      {imageFrameIsActive(selectedElement.imageFrame) && (
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
                                  onClick={() =>
                                    onUpdateElement(selectedElement.id, {
                                      imageFrame: withImageFrameColor(selectedElement.imageFrame, c),
                                    })
                                  }
                                  sx={{
                                    width: 16,
                                    height: 16,
                                    borderRadius: '3px',
                                    bgcolor: c,
                                    border:
                                      (selectedElement.imageFrame?.color || '') === c
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
                                variant={
                                  (selectedElement.imageFrame?.width || 0) === w
                                    ? 'contained'
                                    : 'outlined'
                                }
                                onClick={() =>
                                  onUpdateElement(selectedElement.id, {
                                    imageFrame: withImageFrameWidth(selectedElement.imageFrame, w),
                                  })
                                }
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
                                variant={
                                  (selectedElement.imageFrame?.dash || 'solid') === d.id
                                    ? 'contained'
                                    : 'outlined'
                                }
                                onClick={() =>
                                  onUpdateElement(selectedElement.id, {
                                    imageFrame: withImageFrameDash(selectedElement.imageFrame, d.id),
                                  })
                                }
                                sx={{ ...miniBtnSx, px: 0.45 }}
                              >
                                {d.label}
                              </Button>
                            ))}
                          </Box>
                        </>
                      )}
                      {onEnhanceImage && selectedElement.src?.trim() && (
                        <Button
                          size="small"
                          fullWidth
                          variant="outlined"
                          disabled={enhancingImage}
                          startIcon={<EnhanceIcon sx={{ fontSize: 14 }} />}
                          onClick={() => onEnhanceImage(selectedElement.id)}
                          sx={{ ...miniBtnSx, mb: 0.35 }}
                        >
                          {enhancingImage ? 'Verbessern…' : 'Foto verbessern'}
                        </Button>
                      )}
                      {onRemoveImageBackground && selectedElement.src?.trim() && (
                        <Button
                          size="small"
                          fullWidth
                          variant="outlined"
                          disabled={removingImageBackground}
                          startIcon={<RemoveBgIcon sx={{ fontSize: 14 }} />}
                          onClick={() => onRemoveImageBackground(selectedElement.id)}
                          sx={{ ...miniBtnSx, mb: 0.75 }}
                        >
                          {removingImageBackground ? 'Hintergrund…' : 'Weißen Hintergrund weg'}
                        </Button>
                      )}
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
                        Linie
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.35, mb: 0.5 }}>
                        {JOHNNY_ACCENT_PRESETS.slice(0, 8).map((c) => (
                          <Box
                            key={c}
                            onClick={() =>
                              onUpdateElement(selectedElement.id, {
                                strokeColor: c,
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
                      {(selectedElement.shapeKind === 'rect' ||
                        selectedElement.shapeKind === 'ellipse') && (
                        <>
                          <Typography sx={{ fontSize: 9, color: PRES_EDITOR_UI.textMuted, mb: 0.35 }}>
                            Füllung
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.35, mb: 0.5, alignItems: 'center' }}>
                            <Button
                              size="small"
                              variant={shapeFillIsNone(selectedElement.fillColor) ? 'contained' : 'outlined'}
                              onClick={() =>
                                onUpdateElement(selectedElement.id, { fillColor: 'transparent' })
                              }
                              sx={{ ...miniBtnSx, px: 0.6, minWidth: 0 }}
                            >
                              Keine
                            </Button>
                            {SHAPE_FILL_PRESETS.map((c) => (
                              <Box
                                key={c}
                                onClick={() => onUpdateElement(selectedElement.id, { fillColor: c })}
                                sx={{
                                  width: 18,
                                  height: 18,
                                  borderRadius: '4px',
                                  bgcolor: c,
                                  cursor: 'pointer',
                                  border:
                                    (selectedElement.fillColor || '').toLowerCase() === c.toLowerCase()
                                      ? '2px solid #222'
                                      : c === '#FFFFFF'
                                        ? '1px solid #bbb'
                                        : '1px solid #ccc',
                                }}
                              />
                            ))}
                          </Box>
                        </>
                      )}
                      <TextField
                        size="small"
                        type="number"
                        label="Linienstärke"
                        value={selectedElement.strokeWidth ?? 10.5}
                        onChange={(e) =>
                          onUpdateElement(selectedElement.id, {
                            strokeWidth: Math.max(1, Math.min(28, Number(e.target.value) || 10.5)),
                          })
                        }
                        sx={{
                          mb: 0.5,
                          width: '100%',
                          '& .MuiInputBase-root': { fontSize: 10, height: 28 },
                          '& .MuiInputLabel-root': { fontSize: 9 },
                        }}
                      />
                      {selectedElement.shapeKind === 'curved-arrow' && (
                        <Typography sx={{ fontSize: 9, color: PRES_EDITOR_UI.textMuted, mb: 0.5 }}>
                          Bogen: orange Griff ziehen (oder Zahl unten)
                        </Typography>
                      )}
                      {(selectedElement.shapeKind === 'arrow' ||
                        selectedElement.shapeKind === 'curved-arrow' ||
                        selectedElement.shapeKind === 'connector') && (
                        <TextField
                          size="small"
                          type="number"
                          label="Pfeilspitze"
                          value={selectedElement.arrowHeadSize ?? 22}
                          onChange={(e) =>
                            onUpdateElement(selectedElement.id, {
                              arrowHeadSize: Math.max(4, Math.min(36, Number(e.target.value) || 22)),
                            })
                          }
                          sx={{
                            mb: 0.5,
                            width: '100%',
                            '& .MuiInputBase-root': { fontSize: 10, height: 28 },
                            '& .MuiInputLabel-root': { fontSize: 9 },
                          }}
                        />
                      )}
                      {selectedElement.shapeKind === 'curved-arrow' && (
                        <TextField
                          size="small"
                          type="number"
                          label="Bogenstärke"
                          value={selectedElement.curveBend ?? 35}
                          onChange={(e) =>
                            onUpdateElement(selectedElement.id, {
                              curveBend: Math.max(-80, Math.min(80, Number(e.target.value) || 0)),
                            })
                          }
                          helperText="− = nach oben, + = nach unten"
                          FormHelperTextProps={{ sx: { fontSize: 8, m: 0, mt: 0.25 } }}
                          sx={{
                            mb: 0.5,
                            width: '100%',
                            '& .MuiInputBase-root': { fontSize: 10, height: 28 },
                            '& .MuiInputLabel-root': { fontSize: 9 },
                          }}
                        />
                      )}
                      {selectedElement.shapeKind === 'curved-arrow' ? (
                        <Button
                          size="small"
                          onClick={() =>
                            onUpdateElement(selectedElement.id, { shapeKind: 'arrow', curveBend: undefined })
                          }
                          sx={{ ...miniBtnSx, mb: 0.5, fontSize: 9, textTransform: 'none' }}
                        >
                          In geraden Pfeil umwandeln
                        </Button>
                      ) : selectedElement.shapeKind === 'arrow' ? (
                        <Button
                          size="small"
                          onClick={() =>
                            onUpdateElement(selectedElement.id, {
                              shapeKind: 'curved-arrow',
                              curveBend: selectedElement.curveBend ?? 35,
                            })
                          }
                          sx={{ ...miniBtnSx, mb: 0.5, fontSize: 9, textTransform: 'none' }}
                        >
                          In gebogenen Pfeil umwandeln
                        </Button>
                      ) : null}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.35, mb: 0.5 }}>
                        <TextField
                          size="small"
                          type="number"
                          label="Drehung °"
                          value={Math.round((((selectedElement.rotation ?? 0) % 360) + 360) % 360)}
                          onChange={(e) =>
                            onUpdateElement(selectedElement.id, {
                              rotation: (((Number(e.target.value) || 0) % 360) + 360) % 360,
                            })
                          }
                          sx={{
                            flex: 1,
                            '& .MuiInputBase-root': { fontSize: 10, height: 28 },
                            '& .MuiInputLabel-root': { fontSize: 9 },
                          }}
                        />
                        <Tooltip title="90° drehen">
                          <IconButton
                            size="small"
                            onClick={() =>
                              onUpdateElement(selectedElement.id, {
                                rotation: ((((selectedElement.rotation ?? 0) + 90) % 360) + 360) % 360,
                              })
                            }
                            sx={{ width: 28, height: 28, border: '1px solid #cfd8dc', borderRadius: 1 }}
                          >
                            <RotateRightIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.35, mb: 0.5 }}>
                        {[0, 45, 90, 135, 180].map((deg) => {
                          const current = Math.round((((selectedElement.rotation ?? 0) % 360) + 360) % 360);
                          const active = current === deg;
                          return (
                            <Typography
                              key={deg}
                              component="button"
                              onClick={() => onUpdateElement(selectedElement.id, { rotation: deg })}
                              sx={{
                                flex: 1,
                                border: active ? '1.5px solid #455a64' : '1px solid #cfd8dc',
                                bgcolor: active ? '#eceff1' : '#fff',
                                borderRadius: 1,
                                fontSize: 9,
                                fontWeight: 700,
                                py: 0.35,
                                cursor: 'pointer',
                              }}
                            >
                              {deg}°
                            </Typography>
                          );
                        })}
                      </Box>
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

                  {selectedElement.type === 'card' && (
                    <>
                      <Typography sx={{ fontSize: 9, fontWeight: 700, color: PRES_EDITOR_UI.textMuted, mb: 0.5 }}>
                        Info-Karte
                      </Typography>
                      <Typography sx={{ fontSize: 9, color: PRES_EDITOR_UI.textMuted, mb: 0.35, lineHeight: 1.35 }}>
                        Karte am Titelkopf wählen → Inhalt ist sofort tippbar (helles Feld). Doppelklick auf den Titelkopf für die Überschrift. Ziehen am Titelkopf.
                      </Typography>
                      <Typography sx={{ fontSize: 9, color: PRES_EDITOR_UI.textMuted, mb: 0.35 }}>
                        Farbe
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.35, mb: 0.5 }}>
                        {CARD_ACCENT_PRESETS.map((c) => (
                          <Box
                            key={c}
                            onClick={() =>
                              onUpdateElement(selectedElement.id, {
                                strokeColor: c,
                                fillColor: cardHeaderFill(c),
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

                  {selectedElement.type === 'table' && (
                    <>
                      <Typography sx={{ fontSize: 9, fontWeight: 700, color: PRES_EDITOR_UI.textMuted, mb: 0.5 }}>
                        Tabelle
                      </Typography>
                      {renderTableEditPanel()}
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.35, mb: 0.5, mt: 0.5 }}>
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
