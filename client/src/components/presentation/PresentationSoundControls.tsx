import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
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

export const PRESENTATION_SOUND_MENU_VERSION = 4;

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

function combinedButtonSx(variant: PresentationSoundVariant) {
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
    flexShrink: 0,
    border: 'none',
    cursor: 'pointer',
    p: 0,
  };
  if (variant === 'tablet') {
    return {
      ...base,
      height: 24,
      px: 0.5,
      borderRadius: 1.25,
      color: 'rgba(255,255,255,0.88)',
      bgcolor: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.12)',
      '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
      icon: 15,
      drop: 14,
    };
  }
  if (variant === 'laptop') {
    return {
      ...base,
      height: 28,
      px: 0.5,
      borderRadius: 1,
      color: 'text.secondary',
      bgcolor: '#fff',
      border: '1px solid rgba(0,0,0,0.1)',
      '&:hover': { bgcolor: 'rgba(0,0,0,0.06)' },
      icon: 18,
      drop: 16,
    };
  }
  if (variant === 'editor') {
    return {
      ...base,
      height: 28,
      px: 0.35,
      borderRadius: '7px',
      color: '#546e7a',
      bgcolor: '#fff',
      border: '1px solid #cfd8dc',
      boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
      '&:hover': { bgcolor: 'rgba(67,160,71,0.12)', color: '#2e7d32' },
      icon: 17,
      drop: 16,
    };
  }
  return {
    ...base,
    height: 32,
    px: 0.45,
    borderRadius: 1.4,
    color: '#fff',
    bgcolor: '#607d8b',
    '&:hover': { bgcolor: '#546e7a' },
    icon: 17,
    drop: 15,
  };
}

const pillSx = (active: boolean, favorite?: boolean) => ({
  border: active ? '1px solid #455a64' : '1px solid #d0d7de',
  bgcolor: active ? '#546e7a' : favorite ? '#fffde7' : '#fff',
  color: active ? '#fff' : favorite ? '#e65100' : '#37474f',
  borderRadius: 0.75,
  px: 0.6,
  py: 0.25,
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

/** Ein Button pro Klang — Klick = wählen/abspielen, Rechtsklick = Favorit. */
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

export function PresentationSoundPlayButton({ variant = 'editor', title }: PlayProps) {
  const [settings] = usePresentationSoundSettings();
  const sx = combinedButtonSx(variant);
  const label = presentationSoundLabel(settings.soundId);
  return (
    <Tooltip title={title || `Sound (${label}) — Taste S`}>
      <Box
        component="button"
        onClick={() => playPresentationSound()}
        aria-label="Sound abspielen"
        sx={sx}
      >
        <VolumeUpIcon sx={{ fontSize: sx.icon }} />
      </Box>
    </Tooltip>
  );
}

type SplitProps = {
  variant?: PresentationSoundVariant;
};

/** Ein Toolbar-Button — öffnet kompaktes Menü mit allen Klängen nebeneinander. */
export function PresentationSoundSplitControl({ variant = 'dashboard' }: SplitProps) {
  const [settings, updateSettings, refreshSettings] = usePresentationSoundSettings();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const btnSx = combinedButtonSx(variant);
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
      <Tooltip title={`Sound einstellen (${label}) · Taste S = abspielen`}>
        <Box
          component="button"
          onClick={(e) => setAnchor(e.currentTarget)}
          aria-label="Sound einstellen"
          aria-haspopup="true"
          aria-expanded={Boolean(anchor)}
          sx={btnSx}
        >
          <VolumeUpIcon sx={{ fontSize: btnSx.icon }} />
          <ArrowDropDownIcon sx={{ fontSize: btnSx.drop, ml: -0.15, opacity: 0.85 }} />
        </Box>
      </Tooltip>

      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: {
            mt: 0.5,
            width: 300,
            maxWidth: '92vw',
            borderRadius: 1.25,
            boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
          },
        }}
      >
        {/* Zeile 1: Lautstärke + Dauer — alles nebeneinander */}
        <Box
          sx={{
            px: 0.85,
            py: 0.6,
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
            sx={{ flex: '1 1 80px', color: '#78909c', py: 0, height: 18, minWidth: 70 }}
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
          <Box
            component="button"
            onClick={() => playPresentationSound()}
            sx={{ ...pillSx(false), color: '#546e7a', fontWeight: 700 }}
          >
            S ▶
          </Box>
        </Box>

        {/* Alle Klänge nebeneinander — ein Button pro Klang, ★ = Favorit */}
        <Box
          sx={{
            px: 0.85,
            py: 0.65,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 0.35,
            alignItems: 'center',
            maxHeight: 220,
            overflowY: 'auto',
          }}
        >
          {PRESENTATION_SOUND_CATEGORIES.map((cat, idx) => (
            <React.Fragment key={cat.id}>
              {idx > 0 && (
                <Box
                  sx={{
                    width: 1,
                    height: 14,
                    bgcolor: '#cfd8dc',
                    alignSelf: 'center',
                    flexShrink: 0,
                  }}
                />
              )}
              {presetsForCategory(cat.id).map(renderPill)}
            </React.Fragment>
          ))}
        </Box>

        <Typography
          sx={{
            px: 0.85,
            pb: 0.55,
            fontSize: '0.58rem',
            color: '#90a4ae',
            textAlign: 'center',
          }}
        >
          Rechtsklick auf Klang = Favorit · {label}
        </Typography>
      </Popover>
    </>
  );
}

export type { PresentationSoundId };
