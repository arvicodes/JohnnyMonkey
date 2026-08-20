import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Chip,
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
  Keyboard as KeyboardIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  VolumeUp as VolumeUpIcon,
} from '@mui/icons-material';
import {
  PRESENTATION_SOUND_CATEGORIES,
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

/** Sichtbar im Menü — wenn das fehlt, läuft noch die alte Version. */
export const PRESENTATION_SOUND_MENU_VERSION = 3;

type SoundAssignSlot = 'startSlide' | 'entryDone';

export type PresentationSoundVariant = 'dashboard' | 'editor' | 'tablet' | 'laptop';

type SoundTab = 'favorites' | PresentationSoundCategory;

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

const TAB_LABELS: Record<SoundTab, string> = {
  favorites: '★ Favoriten',
  attention: 'Aufmerksamkeit',
  bells: 'Glocken',
  gentle: 'Sanft',
  quirky: 'Fun',
};

type SoundRowProps = {
  preset: (typeof PRESENTATION_SOUND_PRESETS)[number];
  selected: boolean;
  favorite: boolean;
  onSelect: () => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
};

function SoundPresetRow({ preset, selected, favorite, onSelect, onToggleFavorite }: SoundRowProps) {
  return (
    <ListItemButton
      selected={selected}
      onClick={onSelect}
      sx={{
        py: 0.65,
        pl: 1.5,
        pr: 0.75,
        '&.Mui-selected': { bgcolor: 'rgba(84,110,122,0.14)' },
      }}
    >
      <ListItemText
        primary={preset.label}
        secondary={preset.hint}
        primaryTypographyProps={{ fontSize: '0.82rem', fontWeight: selected ? 800 : 600 }}
        secondaryTypographyProps={{ fontSize: '0.68rem', lineHeight: 1.25 }}
      />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0 }}>
        {selected && <VolumeUpIcon sx={{ fontSize: 16, color: '#546e7a' }} />}
        <Tooltip title={favorite ? 'Aus Favoriten entfernen' : 'Als Favorit speichern'}>
          <IconButton
            size="small"
            onClick={onToggleFavorite}
            aria-label={favorite ? 'Favorit entfernen' : 'Favorit setzen'}
            sx={{ p: 0.35, color: favorite ? '#f9a825' : '#b0bec5' }}
          >
            {favorite ? <StarIcon sx={{ fontSize: 18 }} /> : <StarBorderIcon sx={{ fontSize: 18 }} />}
          </IconButton>
        </Tooltip>
      </Box>
    </ListItemButton>
  );
}

/** Nur abspielen — für einfache Toolbars ohne Einstellungs-Pfeil. */
export function PresentationSoundPlayButton({
  variant = 'editor',
  title,
}: PlayProps) {
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

/** Abspielen + Einstellungsmenü (Kategorien, Favoriten, Taste S). */
export function PresentationSoundSplitControl({ variant = 'dashboard' }: SplitProps) {
  const [settings, updateSettings, refreshSettings] = usePresentationSoundSettings();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [activeTab, setActiveTab] = useState<SoundTab>('bells');
  const [assignSlot, setAssignSlot] = useState<SoundAssignSlot>('startSlide');
  const styles = variantStyles(variant);
  const startLabel = presentationSoundLabel(settings.soundId);
  const entryLabel = presentationSoundLabel(settings.entryDoneSoundId);
  const activeSoundId = assignSlot === 'entryDone' ? settings.entryDoneSoundId : settings.soundId;
  const activeLabel = assignSlot === 'entryDone' ? entryLabel : startLabel;
  const favoriteSet = useMemo(() => new Set(settings.favoriteIds), [settings.favoriteIds]);

  const tabPresets = useMemo(() => {
    if (activeTab === 'favorites') return favoritePresets();
    return presetsForCategory(activeTab);
  }, [activeTab, settings.favoriteIds]);

  const selectSound = (id: PresentationSoundId) => {
    if (assignSlot === 'entryDone') updateSettings({ entryDoneSoundId: id });
    else updateSettings({ soundId: id });
    playPresentationSound({ soundId: id });
  };

  const previewActiveSound = (patch?: Partial<PresentationSoundSettings>) => {
    playPresentationSound({ soundId: activeSoundId, ...patch });
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
        <Tooltip title={`Startfolie: ${startLabel} · Entry erledigt: ${entryLabel} — Taste S = Startfolie`}>
          <IconButton
            size="small"
            onClick={() => playPresentationSound()}
            onPointerDown={(e) => {
              if (e.pointerType === 'pen') {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
            onPointerUp={(e) => {
              if (e.pointerType !== 'pen') return;
              e.preventDefault();
              e.stopPropagation();
              playPresentationSound();
            }}
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
        <Tooltip title="Sound-Menü: Kategorien, Favoriten, Klangschale, Gong …">
          <IconButton
            size="small"
            onClick={(e) => setAnchor(e.currentTarget)}
            onPointerDown={(e) => {
              if (e.pointerType === 'pen') {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
            onPointerUp={(e) => {
              if (e.pointerType !== 'pen') return;
              e.preventDefault();
              e.stopPropagation();
              setAnchor(e.currentTarget);
            }}
            aria-label="Sound-Menü öffnen"
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
            width: 340,
            borderRadius: 1.5,
            overflow: 'hidden',
            boxShadow: '0 8px 28px rgba(0,0,0,0.14)',
          },
        }}
      >
        <Box sx={{ px: 1.5, pt: 1.25, pb: 1, bgcolor: '#eceff1' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Typography sx={{ fontWeight: 800, fontSize: '0.84rem', color: '#37474f' }}>
              Sound-Menü · {PRESENTATION_SOUND_PRESETS.length} Klänge
            </Typography>
            <Chip
              size="small"
              icon={<KeyboardIcon sx={{ fontSize: '14px !important' }} />}
              label="Taste S"
              sx={{
                height: 24,
                fontWeight: 800,
                fontSize: '0.68rem',
                bgcolor: '#455a64',
                color: '#fff',
                '& .MuiChip-icon': { color: '#fff' },
              }}
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.85 }}>
            {(
              [
                { id: 'startSlide' as const, title: 'Startfolie', sub: startLabel },
                { id: 'entryDone' as const, title: 'Entry erledigt', sub: entryLabel },
              ] as const
            ).map((slot) => {
              const active = assignSlot === slot.id;
              return (
                <Typography
                  key={slot.id}
                  component="button"
                  onClick={() => setAssignSlot(slot.id)}
                  sx={{
                    flex: 1,
                    textAlign: 'left',
                    border: active ? '1.5px solid #455a64' : '1px solid #cfd8dc',
                    bgcolor: active ? '#fff' : '#eceff1',
                    color: '#37474f',
                    borderRadius: 1,
                    px: 0.75,
                    py: 0.45,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: '#fff' },
                  }}
                >
                  <Box component="span" sx={{ display: 'block', fontSize: '0.68rem', fontWeight: 800 }}>
                    {slot.title}
                  </Box>
                  <Box component="span" sx={{ display: 'block', fontSize: '0.62rem', color: '#607d8b', fontWeight: 600 }}>
                    {slot.sub}
                  </Box>
                </Typography>
              );
            })}
          </Box>
          <Typography sx={{ fontSize: '0.68rem', color: '#607d8b', mt: 0.65 }}>
            Tippe einen Klang — er gilt für <strong>{assignSlot === 'entryDone' ? 'Entry erledigt' : 'Startfolie'}</strong>
            {' · '}Menü v{PRESENTATION_SOUND_MENU_VERSION}
          </Typography>
        </Box>

        <Box sx={{ px: 1.5, pt: 0.85, pb: 0.35 }}>
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

        <Box sx={{ px: 1.5, pt: 0.15, pb: 0.75 }}>
          <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: '#607d8b', mb: 0.45 }}>
            Dauer
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {PRESENTATION_SOUND_DURATIONS.map((d) => {
              const active = settings.duration === d.id;
              return (
                <Typography
                  key={d.id}
                  component="button"
                  onClick={() => {
                    updateSettings({ duration: d.id });
                    previewActiveSound({ duration: d.id });
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
        </Box>

        <Divider />

        <Box sx={{ px: 1, pt: 0.75, pb: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.45 }}>
          {tabs.map((tab) => {
            const active = activeTab === tab;
            const count =
              tab === 'favorites'
                ? settings.favoriteIds.length
                : presetsForCategory(tab).length;
            return (
              <Typography
                key={tab}
                component="button"
                onClick={() => setActiveTab(tab)}
                sx={{
                  border: active ? '1.5px solid #455a64' : '1px solid #cfd8dc',
                  bgcolor: active ? (tab === 'favorites' ? '#fff8e1' : '#eceff1') : '#fff',
                  color: tab === 'favorites' && active ? '#f57f17' : '#37474f',
                  borderRadius: 1,
                  px: 0.75,
                  py: 0.35,
                  fontSize: '0.66rem',
                  fontWeight: active ? 800 : 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  '&:hover': { bgcolor: tab === 'favorites' ? '#fff8e1' : '#eceff1' },
                }}
              >
                {TAB_LABELS[tab]} ({count})
              </Typography>
            );
          })}
        </Box>

        {activeTab !== 'favorites' && (
          <Typography sx={{ px: 1.5, pb: 0.35, fontSize: '0.64rem', color: '#90a4ae' }}>
            {PRESENTATION_SOUND_CATEGORIES.find((c) => c.id === activeTab)?.hint}
          </Typography>
        )}

        <List dense disablePadding sx={{ maxHeight: 280, overflow: 'auto', pb: 0.5 }}>
          {tabPresets.length === 0 ? (
            <Box sx={{ px: 1.5, py: 2, textAlign: 'center' }}>
              <StarBorderIcon sx={{ fontSize: 28, color: '#cfd8dc', mb: 0.5 }} />
              <Typography sx={{ fontSize: '0.75rem', color: '#78909c', fontWeight: 600 }}>
                Noch keine Favoriten
              </Typography>
              <Typography sx={{ fontSize: '0.68rem', color: '#90a4ae', mt: 0.35 }}>
                In Glocken, Sanft oder Fun einen Stern antippen
              </Typography>
            </Box>
          ) : (
            tabPresets.map((preset) => (
              <SoundPresetRow
                key={`${activeTab}-${preset.id}`}
                preset={preset}
                selected={activeSoundId === preset.id}
                favorite={favoriteSet.has(preset.id)}
                onSelect={() => selectSound(preset.id)}
                onToggleFavorite={(e) => toggleFavorite(preset.id, e)}
              />
            ))
          )}
        </List>

        <Box sx={{ px: 1.5, py: 1, borderTop: '1px solid #eceff1', bgcolor: '#fafbfd' }}>
          <Typography
            component="button"
            onClick={() => previewActiveSound()}
            sx={{
              border: '1px solid #90a4ae',
              bgcolor: '#fff',
              color: '#455a64',
              borderRadius: 1,
              px: 1,
              py: 0.5,
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
              width: '100%',
              '&:hover': { bgcolor: '#eceff1' },
            }}
          >
            ▶ Testen: {activeLabel}
            {assignSlot === 'startSlide' ? ' (Taste S)' : ''}
          </Typography>
        </Box>
      </Popover>
    </>
  );
}

export type { PresentationSoundId };
