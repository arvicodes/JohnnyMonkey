import React, { useEffect, useState } from 'react';
import {
  Box,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Popover,
  Slider,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  ArrowDropDown as ArrowDropDownIcon,
  VolumeUp as VolumeUpIcon,
} from '@mui/icons-material';
import {
  PRESENTATION_SOUND_DURATIONS,
  PRESENTATION_SOUND_PRESETS,
  loadPresentationSoundSettings,
  playPresentationSound,
  presentationSoundLabel,
  savePresentationSoundSettings,
  type PresentationSoundId,
  type PresentationSoundSettings,
} from '../../lib/presentationSound';

export type PresentationSoundVariant = 'dashboard' | 'editor' | 'tablet' | 'laptop';

/** Ein globaler Listener — auch wenn mehrere Sound-Buttons gemountet sind. */
let soundHotkeyUsers = 0;
let soundHotkeyAttached = false;

function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement) {
    return true;
  }
  return Boolean(t.isContentEditable || t.closest('[contenteditable="true"]'));
}

function onPresentationSoundHotkey(e: KeyboardEvent) {
  if (e.key !== 's' && e.key !== 'S') return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (isTypingTarget(e.target)) return;
  e.preventDefault();
  e.stopPropagation();
  playPresentationSound();
}

function usePresentationSoundHotkey() {
  useEffect(() => {
    soundHotkeyUsers += 1;
    if (!soundHotkeyAttached) {
      window.addEventListener('keydown', onPresentationSoundHotkey, true);
      soundHotkeyAttached = true;
    }
    return () => {
      soundHotkeyUsers = Math.max(0, soundHotkeyUsers - 1);
      if (soundHotkeyUsers === 0 && soundHotkeyAttached) {
        window.removeEventListener('keydown', onPresentationSoundHotkey, true);
        soundHotkeyAttached = false;
      }
    };
  }, []);
}

type PlayProps = {
  variant?: PresentationSoundVariant;
  title?: string;
};

function usePresentationSoundSettings(): [
  PresentationSoundSettings,
  (patch: Partial<PresentationSoundSettings>) => void,
] {
  const [settings, setSettings] = useState<PresentationSoundSettings>(() =>
    loadPresentationSoundSettings(),
  );

  useEffect(() => {
    const sync = () => setSettings(loadPresentationSoundSettings());
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'jm-presentation-sound-v1') sync();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('jm-presentation-sound-changed', sync as EventListener);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('jm-presentation-sound-changed', sync as EventListener);
    };
  }, []);

  const update = (patch: Partial<PresentationSoundSettings>) => {
    const next = { ...loadPresentationSoundSettings(), ...patch };
    savePresentationSoundSettings(next);
    setSettings(next);
  };

  return [settings, update];
}

function variantStyles(variant: PresentationSoundVariant) {
  if (variant === 'tablet') {
    return {
      play: {
        width: 24,
        height: 24,
        p: 0,
        borderRadius: 1.25,
        color: 'rgba(255,255,255,0.88)',
        '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
      },
      settings: {
        width: 18,
        height: 24,
        p: 0,
        borderRadius: 1.25,
        color: 'rgba(255,255,255,0.72)',
        '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
      },
      group: {
        border: '1px solid rgba(255,255,255,0.12)',
        bgcolor: 'rgba(255,255,255,0.04)',
      },
      icon: 15,
      drop: 16,
    };
  }
  if (variant === 'laptop') {
    return {
      play: {
        width: 28,
        height: 28,
        p: 0,
        color: 'text.secondary',
        '&:hover': { bgcolor: 'rgba(0,0,0,0.06)' },
      },
      settings: {
        width: 20,
        height: 28,
        p: 0,
        color: 'text.secondary',
        '&:hover': { bgcolor: 'rgba(0,0,0,0.06)' },
      },
      group: {
        border: '1px solid rgba(0,0,0,0.1)',
        bgcolor: '#fff',
      },
      icon: 18,
      drop: 18,
    };
  }
  if (variant === 'editor') {
    return {
      play: {
        width: 32,
        height: 28,
        p: 0,
        borderRadius: 0,
        color: '#546e7a',
        '&:hover': { bgcolor: 'rgba(67,160,71,0.12)', color: '#2e7d32' },
      },
      settings: {
        width: 22,
        height: 28,
        p: 0,
        borderRadius: 0,
        color: '#78909c',
        '&:hover': { bgcolor: 'rgba(67,160,71,0.12)', color: '#2e7d32' },
      },
      group: {
        border: '1px solid #cfd8dc',
        bgcolor: '#fff',
        boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
      },
      icon: 17,
      drop: 18,
    };
  }
  // dashboard
  return {
    play: {
      width: 22,
      height: 32,
      p: 0,
      borderRadius: 0,
      color: '#fff',
      bgcolor: 'transparent',
      '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' },
    },
    settings: {
      width: 16,
      height: 32,
      p: 0,
      borderRadius: 0,
      color: 'rgba(255,255,255,0.9)',
      bgcolor: 'transparent',
      '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' },
    },
    group: {
      border: 'none',
      bgcolor: '#607d8b',
      borderRadius: 1.4,
      overflow: 'hidden',
      '&:hover': { bgcolor: '#546e7a' },
    },
    icon: 17,
    drop: 16,
  };
}

/** Nur abspielen — für Tablet / Laptop / Folienleiste / Editor. */
export function PresentationSoundPlayButton({
  variant = 'editor',
  title,
}: PlayProps) {
  usePresentationSoundHotkey();
  const [settings] = usePresentationSoundSettings();
  const styles = variantStyles(variant);
  const label = presentationSoundLabel(settings.soundId);
  return (
    <Tooltip title={title || `Sound abspielen (${label}) · Taste S`}>
      <IconButton
        size="small"
        onClick={() => playPresentationSound()}
        aria-label="Sound abspielen"
        sx={styles.play}
      >
        <VolumeUpIcon sx={{ fontSize: styles.icon }} />
      </IconButton>
    </Tooltip>
  );
}

type SplitProps = {
  variant?: PresentationSoundVariant;
};

/** Hauptmenü: links abspielen, rechts Einstellungen (Sound + Lautstärke). */
export function PresentationSoundSplitControl({ variant = 'dashboard' }: SplitProps) {
  usePresentationSoundHotkey();
  const [settings, updateSettings] = usePresentationSoundSettings();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const styles = variantStyles(variant);
  const label = presentationSoundLabel(settings.soundId);

  return (
    <>
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'stretch',
          flexShrink: 0,
          overflow: 'hidden',
          ...styles.group,
        }}
      >
        <Tooltip title={`Sound abspielen (${label}) · Taste S`}>
          <IconButton
            size="small"
            onClick={() => playPresentationSound()}
            aria-label="Sound abspielen"
            sx={styles.play}
          >
            <VolumeUpIcon sx={{ fontSize: styles.icon }} />
          </IconButton>
        </Tooltip>
        <Divider
          orientation="vertical"
          flexItem
          sx={{
            borderColor: variant === 'dashboard' ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.12)',
          }}
        />
        <Tooltip title="Sound einstellen">
          <IconButton
            size="small"
            onClick={(e) => setAnchor(e.currentTarget)}
            aria-label="Sound einstellen"
            aria-haspopup="true"
            aria-expanded={Boolean(anchor)}
            sx={styles.settings}
          >
            <ArrowDropDownIcon sx={{ fontSize: styles.drop }} />
          </IconButton>
        </Tooltip>
      </Box>

      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: {
            mt: 0.75,
            width: 280,
            borderRadius: 1.5,
            overflow: 'hidden',
            boxShadow: '0 8px 28px rgba(0,0,0,0.14)',
          },
        }}
      >
        <Box sx={{ px: 1.5, pt: 1.25, pb: 0.5 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '0.82rem', color: '#37474f' }}>
            Präsentations-Sound
          </Typography>
          <Typography sx={{ fontSize: '0.7rem', color: '#78909c', mt: 0.15 }}>
            Gilt für Tablet, Laptop, Editor und Hauptmenü
          </Typography>
        </Box>

        <Box sx={{ px: 1.5, pt: 0.75, pb: 0.25 }}>
          <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: '#607d8b', mb: 0.25 }}>
            Lautstärke
          </Typography>
          <Slider
            size="small"
            value={Math.round(settings.volume * 100)}
            min={0}
            max={100}
            valueLabelDisplay="auto"
            valueLabelFormat={(v) => `${v}%`}
            onChange={(_, v) => updateSettings({ volume: (v as number) / 100 })}
            sx={{ color: '#546e7a', py: 0.5 }}
          />
        </Box>

        <Box sx={{ px: 1.5, pt: 0.25, pb: 0.75, display: 'flex', gap: 0.5 }}>
          {PRESENTATION_SOUND_DURATIONS.map((d) => {
            const active = settings.duration === d.id;
            return (
              <Typography
                key={d.id}
                component="button"
                onClick={() => {
                  updateSettings({ duration: d.id });
                  playPresentationSound({ duration: d.id });
                }}
                sx={{
                  flex: 1,
                  border: active ? '1.5px solid #455a64' : '1px solid #cfd8dc',
                  bgcolor: active ? '#eceff1' : '#fff',
                  color: '#37474f',
                  borderRadius: 1,
                  px: 0.5,
                  py: 0.45,
                  fontSize: '0.68rem',
                  fontWeight: active ? 800 : 600,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: '#eceff1' },
                }}
              >
                {d.label}
              </Typography>
            );
          })}
        </Box>

        <List dense disablePadding sx={{ maxHeight: 240, overflow: 'auto', pb: 0.5 }}>
          {PRESENTATION_SOUND_PRESETS.map((preset) => {
            const selected = settings.soundId === preset.id;
            return (
              <ListItemButton
                key={preset.id}
                selected={selected}
                onClick={() => {
                  updateSettings({ soundId: preset.id });
                  playPresentationSound({ soundId: preset.id });
                }}
                sx={{
                  py: 0.55,
                  px: 1.5,
                  '&.Mui-selected': { bgcolor: 'rgba(84,110,122,0.12)' },
                }}
              >
                <ListItemText
                  primary={preset.label}
                  secondary={preset.hint}
                  primaryTypographyProps={{ fontSize: '0.8rem', fontWeight: selected ? 800 : 600 }}
                  secondaryTypographyProps={{ fontSize: '0.68rem' }}
                />
                {selected && (
                  <VolumeUpIcon sx={{ fontSize: 16, color: '#546e7a' }} />
                )}
              </ListItemButton>
            );
          })}
        </List>

        <Box sx={{ px: 1.5, py: 1, borderTop: '1px solid #eceff1' }}>
          <Typography
            component="button"
            onClick={() => playPresentationSound()}
            sx={{
              border: '1px solid #90a4ae',
              bgcolor: '#fff',
              color: '#455a64',
              borderRadius: 1,
              px: 1,
              py: 0.45,
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
              width: '100%',
              '&:hover': { bgcolor: '#eceff1' },
            }}
          >
            Aktuellen Sound testen ({label})
          </Typography>
        </Box>
      </Popover>
    </>
  );
}

export type { PresentationSoundId };
