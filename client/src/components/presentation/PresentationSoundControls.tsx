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
  PlayArrow as PlayArrowIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  VolumeUp as VolumeUpIcon,
} from '@mui/icons-material';
import {
  PRESENTATION_SOUND_DURATIONS,
  PRESENTATION_SOUND_PRESETS,
  PRESENTATION_SOUND_STORAGE_KEY,
  favoritePresets,
  loadPresentationSoundSettings,
  playPresentationSound,
  presentationSoundLabel,
  presetsForCategory,
  savePresentationSoundSettings,
  togglePresentationSoundFavorite,
  type PresentationSoundCategory,
  type PresentationSoundId,
  type PresentationSoundSettings,
} from '../../lib/presentationSound';

export const PRESENTATION_SOUND_MENU_VERSION = 3;

export type PresentationSoundVariant = 'dashboard' | 'editor' | 'tablet' | 'laptop';

type SoundTab = 'favorites' | PresentationSoundCategory;

const TAB_LABELS: Record<SoundTab, string> = {
  favorites: '★',
  attention: 'Aufm.',
  bells: 'Glocken',
  gentle: 'Sanft',
  quirky: 'Fun',
};

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

const miniBtnSx = (active: boolean, accent?: 'gold') => ({
  border: active ? '1px solid #455a64' : '1px solid #d0d7de',
  bgcolor: active ? (accent === 'gold' ? '#fff8e1' : '#eceff1') : '#fff',
  color: active ? (accent === 'gold' ? '#e65100' : '#37474f') : '#607d8b',
  borderRadius: 0.75,
  px: 0.55,
  py: 0.2,
  minWidth: 0,
  fontSize: '0.62rem',
  fontWeight: active ? 700 : 500,
  lineHeight: 1.2,
  cursor: 'pointer',
  whiteSpace: 'nowrap' as const,
  '&:hover': { bgcolor: accent === 'gold' ? '#fff8e1' : '#eceff1' },
});

type SoundChipProps = {
  preset: (typeof PRESENTATION_SOUND_PRESETS)[number];
  selected: boolean;
  favorite: boolean;
  onSelect: () => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
};

function SoundChip({ preset, selected, favorite, onSelect, onToggleFavorite }: SoundChipProps) {
  return (
    <Tooltip title={preset.hint} enterDelay={400}>
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'stretch',
          borderRadius: 0.75,
          overflow: 'hidden',
          border: selected ? '1px solid #455a64' : '1px solid #d0d7de',
          bgcolor: selected ? '#546e7a' : '#fff',
        }}
      >
        <Box
          component="button"
          onClick={onSelect}
          sx={{
            border: 'none',
            bgcolor: 'transparent',
            color: selected ? '#fff' : '#37474f',
            px: 0.55,
            py: 0.28,
            fontSize: '0.62rem',
            fontWeight: selected ? 700 : 500,
            cursor: 'pointer',
            lineHeight: 1.2,
            '&:hover': { bgcolor: selected ? 'rgba(255,255,255,0.08)' : '#f5f5f5' },
          }}
        >
          {chipLabel(preset.id, preset.label)}
        </Box>
        <Box
          component="button"
          onClick={onToggleFavorite}
          aria-label={favorite ? 'Favorit entfernen' : 'Favorit'}
          sx={{
            border: 'none',
            borderLeft: selected ? '1px solid rgba(255,255,255,0.2)' : '1px solid #eceff1',
            bgcolor: 'transparent',
            px: 0.25,
            minWidth: 18,
            cursor: 'pointer',
            color: favorite ? '#ffb300' : selected ? 'rgba(255,255,255,0.55)' : '#b0bec5',
            display: 'flex',
            alignItems: 'center',
            '&:hover': { color: '#ffb300' },
          }}
        >
          {favorite ? <StarIcon sx={{ fontSize: 11 }} /> : <StarBorderIcon sx={{ fontSize: 11 }} />}
        </Box>
      </Box>
    </Tooltip>
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

export function PresentationSoundSplitControl({ variant = 'dashboard' }: SplitProps) {
  const [settings, updateSettings, refreshSettings] = usePresentationSoundSettings();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [activeTab, setActiveTab] = useState<SoundTab>('bells');
  const styles = variantStyles(variant);
  const label = presentationSoundLabel(settings.soundId);
  const favoriteSet = useMemo(() => new Set(settings.favoriteIds), [settings.favoriteIds]);

  const tabPresets = useMemo(() => {
    if (activeTab === 'favorites') return favoritePresets();
    return presetsForCategory(activeTab);
  }, [activeTab, settings.favoriteIds]);

  const selectSound = (id: PresentationSoundId) => {
    updateSettings({ soundId: id });
    playPresentationSound({ soundId: id });
  };

  const toggleFavorite = (id: PresentationSoundId, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    togglePresentationSoundFavorite(id);
    refreshSettings();
  };

  const tabs: SoundTab[] = ['favorites', 'attention', 'bells', 'gentle', 'quirky'];

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
        <Tooltip title={`Abspielen: ${label} — Taste S`}>
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
            mt: 0.5,
            width: 268,
            borderRadius: 1.25,
            overflow: 'hidden',
            boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
          },
        }}
      >
        {/* Kopfzeile */}
        <Box
          sx={{
            px: 1,
            py: 0.65,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            bgcolor: '#f5f7f8',
            borderBottom: '1px solid #eceff1',
          }}
        >
          <Typography
            sx={{
              flex: 1,
              fontSize: '0.68rem',
              fontWeight: 700,
              color: '#37474f',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </Typography>
          <Typography
            component="span"
            sx={{
              fontSize: '0.58rem',
              fontWeight: 700,
              color: '#78909c',
              bgcolor: '#eceff1',
              px: 0.45,
              py: 0.1,
              borderRadius: 0.5,
            }}
          >
            S
          </Typography>
          <IconButton
            size="small"
            onClick={() => playPresentationSound()}
            sx={{ p: 0.2, color: '#546e7a' }}
            aria-label="Testen"
          >
            <PlayArrowIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>

        {/* Lautstärke + Dauer in einer Zeile */}
        <Box sx={{ px: 1, py: 0.65, display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Slider
            size="small"
            value={Math.round(settings.volume * 100)}
            min={0}
            max={100}
            onChange={(_, v) => updateSettings({ volume: (v as number) / 100 })}
            sx={{ flex: 1, color: '#78909c', py: 0, height: 20, minWidth: 0 }}
          />
          {PRESENTATION_SOUND_DURATIONS.map((d) => {
            const active = settings.duration === d.id;
            const short = d.id === 'normal' ? 'Kurz' : d.id === 'long' ? 'Lang' : 'XL';
            return (
              <Typography
                key={d.id}
                component="button"
                onClick={() => {
                  updateSettings({ duration: d.id });
                  playPresentationSound({ duration: d.id });
                }}
                sx={miniBtnSx(active)}
              >
                {short}
              </Typography>
            );
          })}
        </Box>

        <Divider />

        {/* Kategorie-Tabs — eine Zeile */}
        <Box sx={{ px: 1, py: 0.55, display: 'flex', gap: 0.35 }}>
          {tabs.map((tab) => {
            const active = activeTab === tab;
            const isFav = tab === 'favorites';
            return (
              <Tooltip
                key={tab}
                title={
                  isFav
                    ? 'Favoriten'
                    : tab === 'attention'
                      ? 'Aufmerksamkeit'
                      : tab === 'bells'
                        ? 'Glocken & Klänge'
                        : tab === 'gentle'
                          ? 'Sanft'
                          : 'Fun'
                }
              >
                <Typography
                  component="button"
                  onClick={() => setActiveTab(tab)}
                  sx={{
                    ...miniBtnSx(active, isFav ? 'gold' : undefined),
                    flex: 1,
                    textAlign: 'center',
                  }}
                >
                  {TAB_LABELS[tab]}
                </Typography>
              </Tooltip>
            );
          })}
        </Box>

        {/* Sound-Chips — kompaktes Grid */}
        <Box
          sx={{
            px: 1,
            pb: 0.85,
            pt: 0.35,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 0.4,
            maxHeight: 200,
            overflowY: 'auto',
          }}
        >
          {tabPresets.length === 0 ? (
            <Typography sx={{ width: '100%', textAlign: 'center', fontSize: '0.65rem', color: '#90a4ae', py: 1 }}>
              Stern ★ an einem Klang setzen
            </Typography>
          ) : (
            tabPresets.map((preset) => (
              <SoundChip
                key={`${activeTab}-${preset.id}`}
                preset={preset}
                selected={settings.soundId === preset.id}
                favorite={favoriteSet.has(preset.id)}
                onSelect={() => selectSound(preset.id)}
                onToggleFavorite={(e) => toggleFavorite(preset.id, e)}
              />
            ))
          )}
        </Box>
      </Popover>
    </>
  );
}

export type { PresentationSoundId };
