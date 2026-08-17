import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Popover,
  Slider,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  PlayArrow as PlayArrowIcon,
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

export const PRESENTATION_SOUND_MENU_VERSION = 5;

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

function shellSx(variant: PresentationSoundVariant) {
  const base = {
    position: 'relative' as const,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    border: 'none',
    cursor: 'pointer',
    p: 0,
  };
  if (variant === 'tablet') {
    return {
      ...base,
      width: 26,
      height: 26,
      borderRadius: 1.25,
      color: 'rgba(255,255,255,0.75)',
      bgcolor: 'rgba(255,255,255,0.06)',
      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.14)',
      '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' },
      bgIcon: 13,
      playSize: 20,
    };
  }
  if (variant === 'laptop') {
    return {
      ...base,
      width: 28,
      height: 28,
      borderRadius: 1,
      color: '#78909c',
      bgcolor: '#fff',
      boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.12)',
      '&:hover': { bgcolor: '#f5f5f5' },
      bgIcon: 14,
      playSize: 22,
    };
  }
  if (variant === 'editor') {
    return {
      ...base,
      width: 28,
      height: 28,
      borderRadius: '7px',
      color: '#90a4ae',
      bgcolor: '#fff',
      boxShadow: 'inset 0 0 0 1px #cfd8dc',
      '&:hover': { bgcolor: 'rgba(67,160,71,0.08)', color: '#2e7d32' },
      bgIcon: 14,
      playSize: 22,
    };
  }
  return {
    ...base,
    width: 30,
    height: 30,
    borderRadius: 1.4,
    color: 'rgba(255,255,255,0.55)',
    bgcolor: '#607d8b',
    '&:hover': { bgcolor: '#546e7a' },
    bgIcon: 15,
    playSize: 24,
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

/** Kompakter Button: Lautsprecher dahinter, kleines ▶ darüber. Rand-Klick = Menü, ▶ = abspielen. */
function SoundCompactButton({
  variant,
  label,
  onOpenMenu,
}: {
  variant: PresentationSoundVariant;
  label: string;
  onOpenMenu: (el: HTMLElement) => void;
}) {
  const sx = shellSx(variant);
  const isDashboard = variant === 'dashboard';

  return (
    <Tooltip title={`▶ = abspielen (${label}) · Button = wählen · Taste S`}>
      <Box
        component="button"
        onClick={(e) => onOpenMenu(e.currentTarget)}
        aria-label="Sound einstellen"
        sx={sx}
      >
        <VolumeUpIcon
          sx={{
            fontSize: sx.bgIcon,
            opacity: 0.4,
            pointerEvents: 'none',
          }}
        />
        <Box
          component="span"
          onClick={(e) => {
            e.stopPropagation();
            playPresentationSound();
          }}
          aria-label="Sound abspielen"
          sx={{
            position: 'absolute',
            inset: 0,
            m: 'auto',
            width: sx.playSize,
            height: sx.playSize,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isDashboard ? '#fff' : '#37474f',
            borderRadius: '50%',
            bgcolor: isDashboard ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.92)',
            boxShadow: isDashboard ? 'none' : '0 0 0 1px rgba(0,0,0,0.08)',
            '&:hover': {
              bgcolor: isDashboard ? 'rgba(255,255,255,0.32)' : '#fff',
              transform: 'scale(1.06)',
            },
          }}
        >
          <PlayArrowIcon sx={{ fontSize: sx.playSize * 0.72, ml: 0.1 }} />
        </Box>
      </Box>
    </Tooltip>
  );
}

export function PresentationSoundPlayButton({ variant = 'editor', title }: PlayProps) {
  const [settings] = usePresentationSoundSettings();
  const sx = shellSx(variant);
  const label = presentationSoundLabel(settings.soundId);
  const isDashboard = variant === 'dashboard';
  return (
    <Tooltip title={title || `Sound abspielen (${label}) — Taste S`}>
      <Box
        component="button"
        onClick={() => playPresentationSound()}
        aria-label="Sound abspielen"
        sx={sx}
      >
        <VolumeUpIcon sx={{ fontSize: sx.bgIcon, opacity: 0.4, pointerEvents: 'none' }} />
        <PlayArrowIcon
          sx={{
            position: 'absolute',
            fontSize: sx.playSize * 0.72,
            color: isDashboard ? '#fff' : '#37474f',
            ml: 0.1,
          }}
        />
      </Box>
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
      <SoundCompactButton
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
          ▶ Mitte = abspielen · Rand = Menü · S · Rechtsklick = ★
        </Typography>
      </Popover>
    </>
  );
}

export type { PresentationSoundId };
