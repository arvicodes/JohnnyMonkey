import React, { useState } from 'react';
import {
  Box,
  Button,
  FormControlLabel,
  IconButton,
  Popover,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  AnimationOutlined as AnimationIcon,
  Filter1 as StepsIcon,
  SettingsOutlined as FooterSettingsIcon,
  SwapHoriz as TransitionIcon,
} from '@mui/icons-material';
import { PresentationDeck, PresentationSlide, PresentationSlideFooter } from '../../lib/presentationDeck';
import { lessonFolderDisplayName, lessonParentFolderDisplayName, footerTitleForInput, footerRightForInput } from '../../lib/presentationSlideFooter';
import {
  getSlideTransitionMeta,
  SLIDE_TRANSITION_GROUPS,
  SLIDE_TRANSITIONS,
  type SlideTransition,
} from '../../lib/presentationTransitions';
import { PRES_EDITOR_UI } from '../../lib/presentationEditorUi';

const iconBtnSx = {
  width: 26,
  height: 26,
  p: 0.2,
  color: PRES_EDITOR_UI.textMuted,
  '&:hover': { bgcolor: '#fff', color: PRES_EDITOR_UI.accent },
};

interface PresentationAnimationBarProps {
  deck: PresentationDeck;
  slide: PresentationSlide;
  animationEditMode: boolean;
  selectedAnimationTarget: string | null;
  onAnimationEditModeChange: (enabled: boolean) => void;
  onUpdateSlide: (patch: Partial<PresentationSlide>) => void;
  onUpdateDeck: (patch: Partial<PresentationDeck>) => void;
  onAutoAssignParagraphs: () => void;
  onResetAllAnimations: () => void;
}

const PresentationAnimationBar: React.FC<PresentationAnimationBarProps> = ({
  deck,
  slide,
  animationEditMode,
  onAnimationEditModeChange,
  onUpdateSlide,
  onUpdateDeck,
  onAutoAssignParagraphs,
  onResetAllAnimations,
}) => {
  const [transitionAnchor, setTransitionAnchor] = useState<HTMLElement | null>(null);
  const [toolsAnchor, setToolsAnchor] = useState<HTMLElement | null>(null);
  const [footerAnchor, setFooterAnchor] = useState<HTMLElement | null>(null);

  const revealOn = slide.revealEnabled !== false;
  const footerOn = deck.showSlideFooter !== false;
  const transitionMeta = getSlideTransitionMeta(slide.transition);
  const footer = deck.slideFooter ?? {};
  const lessonFolderLabel = lessonFolderDisplayName(deck.lessonPath);
  const lessonParentLabel = lessonParentFolderDisplayName(deck.lessonPath);
  const footerTitleValue = footerTitleForInput(footer, deck.lessonPath, deck.title);
  const footerRightValue = footerRightForInput(footer, deck.lessonPath, deck.title);
  const defaultFooterTitle = lessonFolderLabel || '';
  const defaultFooterRight = lessonParentLabel || '';

  const patchFooter = (patch: Partial<PresentationSlideFooter>) => {
    onUpdateDeck({ slideFooter: { ...footer, ...patch } });
  };

  const pickTransition = (transition: SlideTransition) => {
    onUpdateSlide({ transition });
    setTransitionAnchor(null);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.1,
        flexShrink: 0,
      }}
    >
      <Tooltip title={`Übergang: ${transitionMeta.label}`}>
        <IconButton
          size="small"
          onClick={(e) => setTransitionAnchor(e.currentTarget)}
          sx={{
            ...iconBtnSx,
            color: transitionAnchor ? PRES_EDITOR_UI.accent : PRES_EDITOR_UI.textMuted,
            bgcolor: transitionAnchor ? '#fff' : 'transparent',
          }}
        >
          <TransitionIcon sx={{ fontSize: 16 }} />
        </IconButton>
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

      <Tooltip title={animationEditMode ? 'Animations-Bearbeitung beenden' : 'Animationen bearbeiten'}>
        <IconButton
          size="small"
          onClick={() => onAnimationEditModeChange(!animationEditMode)}
          sx={{
            ...iconBtnSx,
            color: animationEditMode ? '#fff' : PRES_EDITOR_UI.textMuted,
            bgcolor: animationEditMode ? '#FF9800' : 'transparent',
            border: animationEditMode ? '1px solid #E65100' : '1px solid transparent',
            '&:hover': {
              bgcolor: animationEditMode ? '#F57C00' : '#fff',
              color: animationEditMode ? '#fff' : PRES_EDITOR_UI.accent,
            },
          }}
        >
          <AnimationIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>

      <Tooltip title={revealOn ? 'Einblend-Schritte an' : 'Einblend-Schritte aus'}>
        <IconButton
          size="small"
          onClick={() => onUpdateSlide({ revealEnabled: !revealOn })}
          sx={{
            ...iconBtnSx,
            color: revealOn ? PRES_EDITOR_UI.accent : PRES_EDITOR_UI.textMuted,
            bgcolor: revealOn ? '#fff' : 'transparent',
          }}
        >
          <StepsIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>

      <Tooltip title="Fußleiste">
        <IconButton
          size="small"
          onClick={(e) => setFooterAnchor(e.currentTarget)}
          sx={{
            ...iconBtnSx,
            color: footerAnchor || footerOn ? PRES_EDITOR_UI.accent : PRES_EDITOR_UI.textMuted,
            bgcolor: footerAnchor ? '#fff' : 'transparent',
          }}
        >
          <FooterSettingsIcon sx={{ fontSize: 15 }} />
        </IconButton>
      </Tooltip>

      <Popover
        open={Boolean(footerAnchor)}
        anchorEl={footerAnchor}
        onClose={() => setFooterAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <Box sx={{ p: 1.25, width: 280 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: PRES_EDITOR_UI.text, mb: 0.5 }}>
            Fußleiste
          </Typography>
          <FormControlLabel
            sx={{ m: 0, mb: 0.75, gap: 0.35 }}
            control={
              <Switch
                size="small"
                checked={footerOn}
                onChange={(e) =>
                  onUpdateDeck({
                    showSlideFooter: e.target.checked,
                    showSlideNumbers: e.target.checked ? true : deck.showSlideNumbers,
                  })
                }
              />
            }
            label={
              <Typography sx={{ fontSize: 11, color: PRES_EDITOR_UI.text }}>
                Anzeigen
              </Typography>
            }
          />
          <Typography sx={{ fontSize: 10, color: PRES_EDITOR_UI.textMuted, mb: 0.75 }}>
            Standard aus dem Stundenordner. Foliennummer erscheint automatisch rechts.
          </Typography>
          <TextField
            size="small"
            fullWidth
            disabled={!footerOn}
            label="Links (Stundenordner)"
            value={footerTitleValue}
            onChange={(e) => {
              const v = e.target.value;
              patchFooter({ title: v.trim() === defaultFooterTitle ? '' : v });
            }}
            sx={{ mb: 0.75, '& .MuiInputBase-root': { fontSize: 11 }, '& .MuiInputLabel-root': { fontSize: 11 } }}
          />
          <TextField
            size="small"
            fullWidth
            disabled={!footerOn}
            label="Rechts (Oberordner)"
            value={footerRightValue}
            onChange={(e) => {
              const v = e.target.value;
              patchFooter({ right: v.trim() === defaultFooterRight ? '' : v });
            }}
            sx={{ '& .MuiInputBase-root': { fontSize: 11 }, '& .MuiInputLabel-root': { fontSize: 11 } }}
          />
        </Box>
      </Popover>

      <Tooltip title="Weitere Animations-Optionen">
        <IconButton
          size="small"
          onClick={(e) => setToolsAnchor(e.currentTarget)}
          sx={{
            ...iconBtnSx,
            color: toolsAnchor ? PRES_EDITOR_UI.accent : PRES_EDITOR_UI.textMuted,
            bgcolor: toolsAnchor ? '#fff' : 'transparent',
          }}
        >
          ···
        </IconButton>
      </Tooltip>

      <Popover
        open={Boolean(toolsAnchor)}
        anchorEl={toolsAnchor}
        onClose={() => setToolsAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box sx={{ p: 1.25, width: 260 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: PRES_EDITOR_UI.text, mb: 0.5 }}>
            Animations-Hilfen
          </Typography>
          <Typography sx={{ fontSize: 10, color: PRES_EDITOR_UI.textMuted, mb: 1 }}>
            Im Animations-Modus: Element anklicken, dann Zahl 0–9 (0 = sofort sichtbar).
          </Typography>
          <Button
            size="small"
            fullWidth
            variant="outlined"
            onClick={() => {
              onAutoAssignParagraphs();
              setToolsAnchor(null);
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
              onAnimationEditModeChange(false);
              setToolsAnchor(null);
            }}
            sx={{ fontSize: 11, textTransform: 'none' }}
          >
            Alle Animationen zurücksetzen
          </Button>
        </Box>
      </Popover>
    </Box>
  );
};

export default PresentationAnimationBar;
