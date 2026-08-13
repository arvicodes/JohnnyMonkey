import React, { useEffect, useState } from 'react';
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
  AutoFixHigh as RemoveBgIcon,
  AlignHorizontalLeft as AlignLeftIcon,
  AlignHorizontalCenter as AlignCenterHIcon,
  AlignHorizontalRight as AlignRightIcon,
  AlignVerticalTop as AlignTopIcon,
  AlignVerticalCenter as AlignCenterVIcon,
  AlignVerticalBottom as AlignBottomIcon,
  WidthWide as MatchWidthIcon,
  Height as MatchHeightIcon,
  SquareFoot as AlignToIcon,
  ViewAgendaOutlined as CardIcon,
  ViewColumnOutlined as CardPairIcon,
  TableChartOutlined as TableIcon,
} from '@mui/icons-material';
import { PresentationSoundPlayButton } from './PresentationSoundControls';
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
import { isImageCropMode } from '../../lib/presentationImageUtils';
import { SLIDE_SHAPE_LABELS } from '../../lib/presentationSlideShapes';
import { JOHNNY_ACCENT_PRESETS } from '../../lib/presentationTheme';
import { PRES_EDITOR_UI } from '../../lib/presentationEditorUi';
import { sanitizePresentationHtml } from '../../lib/presentationRichText';
import { setFormatBarInteracting } from '../../lib/presentationFormatBarGuard';

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
  onAddCardElement?: (mode?: 'single' | 'pair') => void;
  onAddTableElement?: (opts?: CreateTableOptions) => void;
  /** Live-Editor der aktuellen Tabelle (Zellen-Format). */
  activeEditor?: HTMLElement | null;
  onUpdateElement: (id: string, patch: Partial<SlideElement>) => void;
  onDeleteElement: (id: string) => void;
  onRemoveImageBackground?: (id: string) => void;
  removingImageBackground?: boolean;
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
  onAddLayoutImage,
  onAddShapeElement,
  onAddCardElement,
  onAddTableElement,
  activeEditor = null,
  onUpdateElement,
  onDeleteElement,
  onRemoveImageBackground,
  removingImageBackground = false,
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
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.35,
        flexShrink: 0,
        width: 'fit-content',
        maxWidth: '100%',
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
                {kind === 'rect'
                  ? 'Rechteck-Box (mit Text)'
                  : kind === 'ellipse'
                    ? 'Oval-Box (mit Text)'
                    : SLIDE_SHAPE_LABELS[kind]}
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
          selectedElement.type === 'table') && (
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

      {selectedElement && layerIconGroup}

      {selectedElement && (
        <Box sx={toolGroupSx}>
            {SLIDE_ALIGN_ACTIONS.map(({ kind, title, icon }) => (
              <Tooltip key={kind} title={title}>
                <IconButton size="small" onClick={() => applySlideAlign(kind)} sx={iconBtnSx}>
                  {icon}
                </IconButton>
              </Tooltip>
            ))}
            <Tooltip title="Gleiche Breite (nächstes Element)">
              <span>
                <IconButton
                  size="small"
                  disabled={!alignTarget}
                  onClick={() => applyMatchSize('w')}
                  sx={iconBtnSx}
                >
                  <MatchWidthIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Gleiche Höhe (nächstes Element)">
              <span>
                <IconButton
                  size="small"
                  disabled={!alignTarget}
                  onClick={() => applyMatchSize('h')}
                  sx={iconBtnSx}
                >
                  <MatchHeightIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="An anderes Element ausrichten…">
              <span>
                <IconButton
                  size="small"
                  disabled={siblingElements.length === 0}
                  onClick={(e) => {
                    if (!alignTargetId && alignTarget) setAlignTargetId(alignTarget.id);
                    setAlignAnchor(e.currentTarget);
                  }}
                  sx={{ ...iconBtnSx, color: PRES_EDITOR_UI.accent }}
                >
                  <AlignToIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </span>
            </Tooltip>
            <Popover
              open={Boolean(alignAnchor)}
              anchorEl={alignAnchor}
              onClose={() => setAlignAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            >
              <Box sx={{ p: 1, width: 260 }}>
                <Typography sx={{ fontSize: 9, fontWeight: 700, color: PRES_EDITOR_UI.textMuted, mb: 0.5 }}>
                  Bezugselement
                </Typography>
                <TextField
                  select
                  size="small"
                  fullWidth
                  value={alignTarget?.id || ''}
                  onChange={(e) => setAlignTargetId(e.target.value)}
                  SelectProps={{ native: true }}
                  sx={{
                    mb: 0.75,
                    '& .MuiInputBase-root': { fontSize: 11, height: 30 },
                  }}
                >
                  {siblingElements.map((el, i) => (
                    <option key={el.id} value={el.id}>
                      {elementAlignLabel(el, i)}
                    </option>
                  ))}
                </TextField>
                <Typography sx={{ fontSize: 9, fontWeight: 700, color: PRES_EDITOR_UI.textMuted, mb: 0.35 }}>
                  Kanten ausrichten
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
                <Typography sx={{ fontSize: 9, fontWeight: 700, color: PRES_EDITOR_UI.textMuted, mb: 0.35 }}>
                  Größe übernehmen
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.35 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={!alignTarget}
                    onClick={() => applyMatchSize('w')}
                    sx={{ ...miniBtnSx, flex: 1 }}
                  >
                    Breite
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={!alignTarget}
                    onClick={() => applyMatchSize('h')}
                    sx={{ ...miniBtnSx, flex: 1 }}
                  >
                    Höhe
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={!alignTarget}
                    onClick={() => applyMatchSize('both')}
                    sx={{ ...miniBtnSx, flex: 1 }}
                  >
                    Beides
                  </Button>
                </Box>
                <Typography sx={{ fontSize: 9, color: PRES_EDITOR_UI.textMuted, mt: 0.75, lineHeight: 1.35 }}>
                  Beim Ziehen: Hilfslinien · ⌘/Ctrl halten = ohne Magnet
                </Typography>
              </Box>
            </Popover>
          </Box>
          )}

      {selectedElement && (
        <>
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

      <PresentationSoundPlayButton variant="editor" />

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
