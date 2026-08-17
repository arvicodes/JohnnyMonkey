import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Divider,
  IconButton,
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
  PRESENTATION_SOUND_CATEGORIES,
  PRESENTATION_SOUND_DURATIONS,
  PRESENTATION_SOUND_PRESETS,
  PRESENTATION_SOUND_STORAGE_KEY,
  loadPresentationSoundSettings,
  playPresentationSound,
  presentationSoundLabel,
  presetsForCategory,
  savePresentationSoundSettings,
  togglePresentationSoundFavorite,
  type PresentationSoundId,
  type PresentationSoundSettings,
} from '../../lib/presentationSound';

export const PRESENTATION_SOUND_MENU_VERSION = 6;

export type PresentationSoundVariant = 'dashboard' | 'editor' | 'tablet' | 'laptop';

const CHIP_LABELS: Partial<Record<PresentationSoundId, string>> = {
  attention: 'Aufmerks.',
  classbell: 'Schule',
  singingbowl: 'Schale',
  windchime: 'Wind',
  retro: 'Retro',
  magic: 'Zauber',
};

function chipLabel(id: PresentationSoundId, fallback: string): string {
  return CHIP_LABELS[id] || fallback;
}

type PlayProps = {
  variant?: PresentationSoundVariant;
  title?: string;
};

function usePresentationSoundSettings(): [
  PresentationSoundSettings,
  (patch: Partial<PresentationSoundSettings>) => void,
  () => void,
] {
  const [settings, setSettings] = useState<PresentationSoundSettings>(() =>
    loadPresentationSoundSettings(),
  );

  useEffect(() => {
    const sync = () => setSettings(loadPresentationSoundSettings());
    const onStorage = (e: StorageEvent) => {
      if (e.key === PRESENTATION_SOUND_STORAGE_KEY || e.key === 'jm-presentation-sound-v1') sync();
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

  const refresh = () => setSettings(loadPresentationSoundSettings());

  return [settings, update, refresh];
}

function variantStyles(variant: PresentationSoundVariant) {
  if (variant === 'tablet') {
    return {
      play: {
        width: 24,
        height: 24,
        p: 0,
        borderRadius: 0,
        color: 'rgba(255,255,255,0.88)',
        '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
      },
      settings: {
        width: 16,
        height: 24,
        p: 0,
        borderRadius: 0,
        color: 'rgba(255,255,255,0.72)',
        '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
      },
      group: {
        border: '1px solid rgba(255,255,255,0.12)',
        bgcolor: 'rgba(255,255,255,0.04)',
        borderRadius: 1.25,
        overflow: 'hidden',
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
        borderRadius: 0,
        color: 'text.secondary',
        '&:hover': { bgcolor: 'rgba(0,0,0,0.06)' },
      },
      settings: {
        width: 18,
        height: 28,
        p: 0,
        borderRadius: 0,
        color: 'text.secondary',
        '&:hover': { bgcolor: 'rgba(0,0,0,0.06)' },
      },
      group: {
        border: '1px solid rgba(0,0,0,0.1)',
        bgcolor: '#fff',
        borderRadius: 1,
        overflow: 'hidden',
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
        width: 20,
        height: 28,
        p: 0,
        borderRadius: 0,
        color: '#78909c',
        '&:hover': { bgcolor: 'rgba(67,160,71,0.12)', color: '#2e7d32' },
      },
      group: {
        border: '1px solid #cfd8dc',
        bgcolor: '#fff',
        borderRadius: '7px',
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
      },
      icon: 17,
      drop: 18,
    };
  }
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

const pillSx = (active: boolean, favorite?: boolean) => ({
  border: active ? '1px solid #455a64' : '1px solid #d0d7de',
  bgcolor: active ? '#546e7a' : favorite ? '#fffde7' : '#fff',
  color: active ? '#fff' : favorite ? '#e65100' : '#37474f',
  borderRadius: 0.75,
  px: 0.55,
  py: 0.2,
  fontSize: '0.62rem',
  fontWeight: active ? 700 : 500,
  lineHeight: 1.2,
  cursor: 'pointer',
  whiteSpace: 'nowrap' as const,
  '&:hover': {
    bgcolor: active ? '#455a64' : '#eceff1',
    color: active ? '#fff' : '#37474f',
  },
});

type SoundPillProps = {
  preset: (typeof PRESENTATION_SOUND_PRESETS)[number];
  selected: boolean;
  favorite: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
};

function SoundPill({ preset, selected, favorite, onSelect, onToggleFavorite }: SoundPillProps) {
  const text = `${favorite ? '★ ' : ''}${chipLabel(preset.id, preset.label)}`;
  return (
    <Tooltip title={`${preset.hint} · Rechtsklick = Favorit`} enterDelay={350}>
      <Box
        component="button"
        onClick={onSelect}
        onContextMenu={(e) => {
          e.preventDefault();
          onToggleFavorite();
        }}
        sx={pillSx(selected, favorite && !selected)}
      >
        {text}
      </Box>
    </Tooltip>
  );
}

/** Kompakter Button: Lautsprecher = abspielen, Pfeil = Menü. */
function SoundSplitButton({
  variant,
  label,
  onOpenMenu,
}: {
  variant: PresentationSoundVariant;
  label: string;
  onOpenMenu: (el: HTMLElement) => void;
}) {
  const styles = variantStyles(variant);

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'stretch',
        flexShrink: 0,
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
          borderColor: variant === 'dashboard' ? 'rgba(255,255,255,0.22)' : variant === 'tablet' ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)',
        }}
      />
      <Tooltip title="Sound einstellen">
        <IconButton
          size="small"
          onClick={(e) => onOpenMenu(e.currentTarget)}
          aria-label="Sound einstellen"
          aria-haspopup="true"
          sx={styles.settings}
        >
          <ArrowDropDownIcon sx={{ fontSize: styles.drop }} />
        </IconButton>
      </Tooltip>
    </Box>
  );
}

export function PresentationSoundPlayButton({ variant = 'editor', title }: PlayProps) {
  const [settings] = usePresentationSoundSettings();
  const styles = variantStyles(variant);
  const label = presentationSoundLabel(settings.soundId);
  return (
    <Tooltip title={title || `Sound abspielen (${label}) — Taste S`}>
      <IconButton
        size="small"
        onClick={() => playPresentationSound()}
        aria-label="Sound abspielen"
        sx={{ ...styles.play, ...styles.group, width: styles.play.width, height: styles.play.height }}
      >
        <VolumeUpIcon sx={{ fontSize: styles.icon }} />
      </IconButton>
    </Tooltip>
  );
}

type SplitProps = {
  variant?: PresentationSoundVariant;
};

export function PresentationSoundSplitControl({ variant = 'dashboard' }: SplitProps) {
  const [settings, updateSettings, refreshSettings] = usePresentationSoundSettings();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const label = presentationSoundLabel(settings.soundId);
  const favoriteSet = useMemo(() => new Set(settings.favoriteIds), [settings.favoriteIds]);

  const selectSound = (id: PresentationSoundId) => {
    updateSettings({ soundId: id });
    playPresentationSound({ soundId: id });
  };

  const toggleFavorite = (id: PresentationSoundId) => {
    togglePresentationSoundFavorite(id);
    refreshSettings();
  };

  const renderPill = (preset: (typeof PRESENTATION_SOUND_PRESETS)[number]) => (
    <SoundPill
      key={preset.id}
      preset={preset}
      selected={settings.soundId === preset.id}
      favorite={favoriteSet.has(preset.id)}
      onSelect={() => selectSound(preset.id)}
      onToggleFavorite={() => toggleFavorite(preset.id)}
    />
  );

  return (
    <>
      <SoundSplitButton
        variant={variant}
        label={label}
        onOpenMenu={(el) => setAnchor(el)}
      />

      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: {
            mt: 0.5,
            width: 292,
            maxWidth: '92vw',
            borderRadius: 1.25,
            boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
          },
        }}
      >
        <Box
          sx={{
            px: 0.85,
            py: 0.55,
            display: 'flex',
            alignItems: 'center',
            gap: 0.4,
            borderBottom: '1px solid #eceff1',
            flexWrap: 'wrap',
          }}
        >
          <Slider
            size="small"
            value={Math.round(settings.volume * 100)}
            min={0}
            max={100}
            onChange={(_, v) => updateSettings({ volume: (v as number) / 100 })}
            sx={{
              flex: '1 1 72px',
              color: '#78909c',
              py: 0,
              height: 16,
              minWidth: 64,
              '& .MuiSlider-thumb': { width: 10, height: 10 },
            }}
          />
          {PRESENTATION_SOUND_DURATIONS.map((d) => {
            const active = settings.duration === d.id;
            const short = d.id === 'normal' ? 'Kurz' : d.id === 'long' ? 'Lang' : 'XL';
            return (
              <Box
                key={d.id}
                component="button"
                onClick={() => {
                  updateSettings({ duration: d.id });
                  playPresentationSound({ duration: d.id });
                }}
                sx={pillSx(active)}
              >
                {short}
              </Box>
            );
          })}
        </Box>

        {PRESENTATION_SOUND_CATEGORIES.map((cat) => (
          <Box key={cat.id} sx={{ px: 0.85, pt: 0.5, pb: cat.id === 'quirky' ? 0.65 : 0.15 }}>
            <Typography
              sx={{
                fontSize: '0.58rem',
                fontWeight: 700,
                color: '#90a4ae',
                mb: 0.35,
                letterSpacing: 0.02,
              }}
            >
              {cat.label}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.35 }}>
              {presetsForCategory(cat.id).map(renderPill)}
            </Box>
          </Box>
        ))}

        <Typography sx={{ px: 0.85, pb: 0.5, fontSize: '0.56rem', color: '#b0bec5', textAlign: 'center' }}>
          ▶ = abspielen · ▼ = Menü · S · Rechtsklick = ★
        </Typography>
      </Popover>
    </>
  );
}

export type { PresentationSoundId };
