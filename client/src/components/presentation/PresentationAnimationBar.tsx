import React, { useMemo, useState } from 'react';
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
  AnimationOutlined as AnimationIcon,
  ArrowDownward as DownIcon,
  ArrowUpward as UpIcon,
  ChevronLeft,
  ChevronRight,
  ImageOutlined as ImageIcon,
  TextFields as TextIcon,
  SwapHoriz as TransitionIcon,
} from '@mui/icons-material';
import {
  ANIMATION_STEP_OPTIONS,
  animationStepLabel,
  collectAnimationItems,
  compactAnimationSteps,
  setAnimationItemStep,
  swapAnimationItemSteps,
  type AnimationItem,
} from '../../lib/presentationAnimation';
import { PresentationDeck, PresentationSlide } from '../../lib/presentationDeck';
import { getSlideMaxRevealSteps } from '../../lib/presentationReveal';
import {
  getSlideTransitionMeta,
  SLIDE_TRANSITION_GROUPS,
  SLIDE_TRANSITIONS,
  type SlideTransition,
} from '../../lib/presentationTransitions';
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

function itemIcon(item: AnimationItem) {
  if (item.kind === 'layoutImage' || item.label.startsWith('Bild')) {
    return <ImageIcon sx={{ fontSize: 14 }} />;
  }
  return <TextIcon sx={{ fontSize: 14 }} />;
}

interface PresentationAnimationBarProps {
  deck: PresentationDeck;
  slide: PresentationSlide;
  selectedElementId: string | null;
  revealPreviewStep: number;
  onRevealPreviewStepChange: (step: number) => void;
  onUpdateSlide: (patch: Partial<PresentationSlide>) => void;
  onUpdateDeck: (patch: Partial<PresentationDeck>) => void;
  onSelectElement: (id: string | null) => void;
  onAutoAssignParagraphs: () => void;
  onResetAllAnimations: () => void;
}

const PresentationAnimationBar: React.FC<PresentationAnimationBarProps> = ({
  deck,
  slide,
  selectedElementId,
  revealPreviewStep,
  onRevealPreviewStepChange,
  onUpdateSlide,
  onUpdateDeck,
  onSelectElement,
  onAutoAssignParagraphs,
  onResetAllAnimations,
}) => {
  const [panelAnchor, setPanelAnchor] = useState<HTMLElement | null>(null);
  const [transitionAnchor, setTransitionAnchor] = useState<HTMLElement | null>(null);

  const items = useMemo(() => collectAnimationItems(slide), [slide]);
  const maxReveal = useMemo(() => getSlideMaxRevealSteps(slide), [slide]);
  const revealOn = slide.revealEnabled !== false;
  const transitionMeta = getSlideTransitionMeta(slide.transition);
  const sequencedCount = items.filter((item) => item.step > 0).length;

  const pickTransition = (transition: SlideTransition) => {
    onUpdateSlide({ transition });
    setTransitionAnchor(null);
  };

  const applySlideFromItems = (next: PresentationSlide) => {
    onUpdateSlide({
      titleHtml: next.titleHtml,
      bodyHtml: next.bodyHtml,
      subtitleHtml: next.subtitleHtml,
      bodyLeftHtml: next.bodyLeftHtml,
      bodyRightHtml: next.bodyRightHtml,
      imageCaptionHtml: next.imageCaptionHtml,
      zoneRevealSteps: next.zoneRevealSteps,
      elements: next.elements,
      revealEnabled: next.revealEnabled ?? slide.revealEnabled,
    });
  };

  const applyItemStep = (itemId: string, step: number) => {
    let next = setAnimationItemStep(slide, itemId, step);
    next = compactAnimationSteps(next);
    if (step > 0) next = { ...next, revealEnabled: true };
    applySlideFromItems(next);
  };

  const moveItem = (itemId: string, direction: -1 | 1) => {
    const next = swapAnimationItemSteps(slide, itemId, direction);
    applySlideFromItems(next);
  };

  const handleItemClick = (item: AnimationItem) => {
    if (item.elementId && item.kind === 'element') {
      onSelectElement(item.elementId);
    }
  };

  const stepBack = () => onRevealPreviewStepChange(Math.max(0, revealPreviewStep - 1));
  const stepForward = () => onRevealPreviewStepChange(Math.min(maxReveal, revealPreviewStep + 1));

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        flexShrink: 0,
      }}
    >
      <Tooltip title="Folienübergang wählen">
        <Button
          size="small"
          onClick={(e) => setTransitionAnchor(e.currentTarget)}
          startIcon={<TransitionIcon sx={{ fontSize: 16 }} />}
          sx={{
            minWidth: 0,
            px: 1,
            py: 0.25,
            fontSize: 11,
            textTransform: 'none',
            color: PRES_EDITOR_UI.text,
            border: `1px solid ${PRES_EDITOR_UI.barBorder}`,
            bgcolor: '#fff',
            '&:hover': { bgcolor: PRES_EDITOR_UI.accentSoft },
          }}
        >
          {transitionMeta.label}
        </Button>
      </Tooltip>

      <Popover
        open={Boolean(transitionAnchor)}
        anchorEl={transitionAnchor}
        onClose={() => setTransitionAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <Box sx={{ p: 1.25, width: 320, maxHeight: 420, overflowY: 'auto' }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: PRES_EDITOR_UI.text, mb: 0.75 }}>
            Folienübergang
          </Typography>
          {SLIDE_TRANSITION_GROUPS.map((group) => {
            const entries = SLIDE_TRANSITIONS.filter((entry) => entry.group === group.id);
            if (entries.length === 0) return null;
            return (
              <Box key={group.id} sx={{ mb: 1 }}>
                <Typography sx={{ fontSize: 10, fontWeight: 700, color: PRES_EDITOR_UI.textMuted, mb: 0.5 }}>
                  {group.label}
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5 }}>
                  {entries.map((entry) => {
                    const active = transitionMeta.id === entry.id;
                    return (
                      <Button
                        key={entry.id}
                        size="small"
                        variant={active ? 'contained' : 'outlined'}
                        onClick={() => pickTransition(entry.id)}
                        sx={{
                          justifyContent: 'flex-start',
                          textAlign: 'left',
                          textTransform: 'none',
                          fontSize: 11,
                          lineHeight: 1.25,
                          py: 0.75,
                          px: 1,
                          alignItems: 'flex-start',
                          flexDirection: 'column',
                          bgcolor: active ? PRES_EDITOR_UI.accent : '#fff',
                          borderColor: active ? PRES_EDITOR_UI.accent : PRES_EDITOR_UI.barBorder,
                          '&:hover': {
                            bgcolor: active ? PRES_EDITOR_UI.accent : PRES_EDITOR_UI.accentSoft,
                          },
                        }}
                      >
                        <Box component="span" sx={{ fontWeight: 700 }}>
                          {entry.label}
                        </Box>
                        <Box
                          component="span"
                          sx={{
                            fontSize: 9,
                            opacity: active ? 0.92 : 0.72,
                            fontWeight: 400,
                          }}
                        >
                          {entry.hint}
                        </Box>
                      </Button>
                    );
                  })}
                </Box>
              </Box>
            );
          })}
        </Box>
      </Popover>

      <FormControlLabel
        sx={{ m: 0, gap: 0.35, flexShrink: 0 }}
        control={
          <Switch
            size="small"
            checked={deck.showSlideNumbers === true}
            onChange={(e) => onUpdateDeck({ showSlideNumbers: e.target.checked })}
          />
        }
        label={
          <Typography sx={{ fontSize: 10, color: PRES_EDITOR_UI.textMuted, whiteSpace: 'nowrap' }}>
            Nummern
          </Typography>
        }
      />

      <FormControlLabel
        sx={{ m: 0, gap: 0.35, flexShrink: 0 }}
        control={
          <Switch
            size="small"
            checked={revealOn}
            onChange={(e) => {
              onUpdateSlide({ revealEnabled: e.target.checked });
              if (!e.target.checked) onRevealPreviewStepChange(0);
            }}
          />
        }
        label={
          <Typography sx={{ fontSize: 10, color: PRES_EDITOR_UI.textMuted, whiteSpace: 'nowrap' }}>
            Schritte
          </Typography>
        }
      />

      {revealOn && maxReveal > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0 }}>
          <IconButton size="small" onClick={stepBack} disabled={revealPreviewStep <= 0} sx={iconBtnSx}>
            <ChevronLeft sx={{ fontSize: 18 }} />
          </IconButton>
          <Typography sx={{ fontSize: 10, color: PRES_EDITOR_UI.textMuted, minWidth: 52, textAlign: 'center' }}>
            {revealPreviewStep}/{maxReveal}
          </Typography>
          <IconButton
            size="small"
            onClick={stepForward}
            disabled={revealPreviewStep >= maxReveal}
            sx={iconBtnSx}
          >
            <ChevronRight sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      )}

      <Tooltip title="Einblend-Reihenfolge">
        <IconButton
          size="small"
          onClick={(e) => setPanelAnchor(e.currentTarget)}
          sx={{
            ...iconBtnSx,
            color: panelAnchor ? PRES_EDITOR_UI.accent : PRES_EDITOR_UI.textMuted,
            bgcolor: panelAnchor ? '#fff' : 'transparent',
          }}
        >
          <AnimationIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>

      <Popover
        open={Boolean(panelAnchor)}
        anchorEl={panelAnchor}
        onClose={() => setPanelAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box sx={{ p: 1.25, width: 340, maxHeight: 480, overflowY: 'auto' }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: PRES_EDITOR_UI.text, mb: 0.5 }}>
            Einblend-Reihenfolge
          </Typography>
          <Typography sx={{ fontSize: 10, color: PRES_EDITOR_UI.textMuted, mb: 1 }}>
            Alle Textabsätze, Bilder und Textfelder in der Reihenfolge des Einblendens. Pfeile
            verschieben, Schritt „Sofort“ = von Anfang an sichtbar.
          </Typography>

          {revealOn && maxReveal > 0 && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5,
                mb: 1,
                py: 0.5,
                borderRadius: 1,
                bgcolor: PRES_EDITOR_UI.accentSoft,
              }}
            >
              <IconButton size="small" onClick={stepBack} disabled={revealPreviewStep <= 0} sx={iconBtnSx}>
                <ChevronLeft sx={{ fontSize: 18 }} />
              </IconButton>
              <Typography sx={{ fontSize: 11, fontWeight: 600, color: PRES_EDITOR_UI.text }}>
                Vorschau Schritt {revealPreviewStep} / {maxReveal}
              </Typography>
              <IconButton
                size="small"
                onClick={stepForward}
                disabled={revealPreviewStep >= maxReveal}
                sx={iconBtnSx}
              >
                <ChevronRight sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>
          )}

          {items.length === 0 ? (
            <Typography sx={{ fontSize: 11, color: PRES_EDITOR_UI.textMuted, py: 1 }}>
              Noch keine Schritte — „Alles automatisch nummerieren“ erzeugt die Reihenfolge.
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {items.map((item, index) => {
                const selected = item.elementId === selectedElementId && item.kind === 'element';
                const isActiveStep = revealOn && item.step > 0 && item.step === revealPreviewStep;
                return (
                  <Box
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      px: 0.75,
                      py: 0.45,
                      borderRadius: 1,
                      border: `1px solid ${
                        isActiveStep
                          ? '#E65100'
                          : selected
                            ? PRES_EDITOR_UI.accent
                            : PRES_EDITOR_UI.barBorder
                      }`,
                      bgcolor: isActiveStep
                        ? 'rgba(230,81,0,0.08)'
                        : selected
                          ? PRES_EDITOR_UI.accentSoft
                          : '#fff',
                      cursor: item.kind === 'element' ? 'pointer' : 'default',
                    }}
                  >
                    <Box sx={{ color: PRES_EDITOR_UI.accent, display: 'flex', flexShrink: 0 }}>
                      {itemIcon(item)}
                    </Box>
                    <Typography
                      noWrap
                      sx={{ fontSize: 11, flex: 1, minWidth: 0, color: PRES_EDITOR_UI.text }}
                    >
                      {item.label}
                    </Typography>
                    <TextField
                      select
                      size="small"
                      value={String(item.step)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => applyItemStep(item.id, Number(e.target.value))}
                      sx={{
                        width: 72,
                        flexShrink: 0,
                        ...compactSelectSx,
                        '& .MuiInputBase-root': { height: 26, fontSize: 10 },
                      }}
                    >
                      {ANIMATION_STEP_OPTIONS.map((step) => (
                        <MenuItem key={step} value={String(step)} dense sx={{ fontSize: 11 }}>
                          {animationStepLabel(step)}
                        </MenuItem>
                      ))}
                    </TextField>
                    <Box sx={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                      <IconButton
                        size="small"
                        disabled={index === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          moveItem(item.id, -1);
                        }}
                        sx={{ width: 22, height: 18, p: 0 }}
                      >
                        <UpIcon sx={{ fontSize: 13 }} />
                      </IconButton>
                      <IconButton
                        size="small"
                        disabled={index === items.length - 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          moveItem(item.id, 1);
                        }}
                        sx={{ width: 22, height: 18, p: 0 }}
                      >
                        <DownIcon sx={{ fontSize: 13 }} />
                      </IconButton>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}

          {sequencedCount > 0 && (
            <Typography sx={{ fontSize: 10, color: PRES_EDITOR_UI.accent, mt: 1, fontWeight: 600 }}>
              {sequencedCount} Einblend-Schritte auf dieser Folie
            </Typography>
          )}

          <Divider sx={{ my: 1 }} />

          <Button
            size="small"
            fullWidth
            variant="outlined"
            onClick={() => {
              onAutoAssignParagraphs();
            }}
            sx={{ fontSize: 11, textTransform: 'none', mb: 0.5 }}
          >
            Alles automatisch nummerieren
          </Button>
          <Button
            size="small"
            fullWidth
            color="error"
            variant="outlined"
            onClick={() => {
              onResetAllAnimations();
              onRevealPreviewStepChange(0);
              setPanelAnchor(null);
            }}
            sx={{ fontSize: 11, textTransform: 'none', mb: 0.5 }}
          >
            Alle Animationen zurücksetzen
          </Button>
          <Button
            size="small"
            fullWidth
            onClick={() => setPanelAnchor(null)}
            sx={{ fontSize: 11, textTransform: 'none' }}
          >
            Schließen
          </Button>
        </Box>
      </Popover>
    </Box>
  );
};

export default PresentationAnimationBar;
