import React from 'react';
import { Box, TextField, Typography } from '@mui/material';
import { MusicNote as MusicNoteIcon, Casino as CasinoIcon } from '@mui/icons-material';
import {
  beAHeroPhaseCardSx,
  beAHeroPhaseStyle,
  heroMinimalFieldSx,
} from '../lib/beAHeroUi';
import { DEFAULT_TABATA, describeTabataConfig, type TabataConfig } from '../lib/tabata';
import { BeAHeroTabataEditor } from './BeAHeroTabataEditor';
import { tabataModeIcon } from './BeAHeroTabataIcons';
import { emptyRandomConfig, type BeAHeroRandomConfig } from '../lib/beAHeroRandom';
import { BeAHeroRandomCardsEditor } from './BeAHeroRandomCards';
import {
  BeAHeroFeatureBody,
  BeAHeroFeatureToggle,
  BE_A_HERO_RANDOM_THEME,
  BE_A_HERO_TABATA_THEME,
} from './BeAHeroFeaturePanel';
import { RichTextEditor } from './ui/rich-text-editor';

export type HeroPhaseContent = {
  songTitle: string;
  songAudioUrl: string;
  explanation: string;
  tabata?: TabataConfig;
  random?: BeAHeroRandomConfig;
};

export type HeroPhaseKey = 'warmup' | 'workout' | 'cooldown';

const PHASE_LABELS: Record<HeroPhaseKey, string> = {
  warmup: 'Warm-up',
  workout: 'Workout',
  cooldown: 'Cooldown',
};

const EXPLANATION_PLACEHOLDERS: Record<HeroPhaseKey, string> = {
  warmup: 'z. B. Schultern kreisen, leichtes Einlaufen …',
  workout: 'z. B. Hampelmänner 30 Sek., Kniebeugen …',
  cooldown: 'z. B. Ausatmen, Dehnen, locker durch die Knie …',
};

type Props = {
  phase: HeroPhaseKey;
  value: HeroPhaseContent;
  onChange: (patch: Partial<HeroPhaseContent>) => void;
};

export function BeAHeroPhaseRow({ phase, value, onChange }: Props) {
  const style = beAHeroPhaseStyle(phase);
  const tabata = value.tabata ?? DEFAULT_TABATA;
  const random = value.random ?? emptyRandomConfig();

  return (
    <Box sx={{ ...beAHeroPhaseCardSx(phase), mb: 1.5 }}>
      <Typography
        sx={{
          fontWeight: 800,
          fontSize: '0.92rem',
          color: style.labelColor,
          mb: 1.35,
          letterSpacing: '0.03em',
        }}
      >
        {PHASE_LABELS[phase]}
      </Typography>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: { xs: 1, md: 1.1 },
          alignItems: 'stretch',
        }}
      >
        <Box
          sx={{
            p: 1.1,
            borderRadius: 2,
            bgcolor: style.background,
            border: '1px solid',
            borderColor: style.borderColor,
            width: '100%',
            maxWidth: { md: 360 },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
            <MusicNoteIcon sx={{ fontSize: 15, color: style.labelColor, opacity: 0.75 }} />
            <Typography variant="caption" sx={{ fontWeight: 700, color: style.labelColor, fontSize: '0.72rem' }}>
              Lied · optional
            </Typography>
          </Box>
          <TextField
            label="Liedname"
            size="small"
            fullWidth
            margin="none"
            value={value.songTitle}
            onChange={(e) => onChange({ songTitle: e.target.value })}
            placeholder="Titel"
            sx={heroMinimalFieldSx}
          />
          <TextField
            size="small"
            fullWidth
            margin="none"
            value={value.songAudioUrl}
            onChange={(e) => onChange({ songAudioUrl: e.target.value })}
            placeholder="Spotify-Link oder Audio-Datei (mp3 …)"
            sx={{
              ...heroMinimalFieldSx,
              mt: 0.65,
              '& .MuiInputBase-root': { fontSize: '0.76rem', borderRadius: 1.75, bgcolor: '#fff' },
            }}
          />
        </Box>

        {phase === 'workout' ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, minWidth: 0 }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 0.75,
                alignItems: 'stretch',
              }}
            >
              <BeAHeroFeatureToggle
                theme={BE_A_HERO_TABATA_THEME}
                icon={tabataModeIcon(tabata.enabled ? tabata.mode : 'interval')}
                title="Tabata-Timer"
                subtitle={tabata.enabled ? describeTabataConfig(tabata) : 'Tae Bo · Pyramide'}
                enabled={!!tabata.enabled}
                onToggle={(enabled) =>
                  onChange({
                    tabata: { ...tabata, enabled },
                  })
                }
              />
              <BeAHeroFeatureToggle
                theme={BE_A_HERO_RANDOM_THEME}
                icon={<CasinoIcon />}
                title="Zufall"
                subtitle={
                  random.enabled
                    ? random.kind === 'numbers'
                      ? 'Zufällige Zahlen'
                      : 'Karten'
                    : 'Zufalls-Elemente'
                }
                enabled={random.enabled}
                onToggle={(enabled) =>
                  onChange({
                    random: { ...random, enabled },
                  })
                }
              />
            </Box>

            {tabata.enabled ? (
              <BeAHeroTabataEditor
                value={tabata}
                onChange={(patch) => onChange({ tabata: { ...tabata, ...patch } })}
                theme={BE_A_HERO_TABATA_THEME}
              />
            ) : null}

            {random.enabled ? (
              <BeAHeroFeatureBody theme={BE_A_HERO_RANDOM_THEME}>
                <BeAHeroRandomCardsEditor
                  value={random}
                  onChange={(patch) => onChange({ random: { ...random, ...patch } })}
                  theme={BE_A_HERO_RANDOM_THEME}
                />
              </BeAHeroFeatureBody>
            ) : null}
          </Box>
        ) : null}

        <Box sx={{ width: '100%', minWidth: 0 }}>
          <Typography
            variant="caption"
            sx={{ display: 'block', fontWeight: 700, color: style.labelColor, fontSize: '0.72rem', mb: 0.5 }}
          >
            Übungserläuterung
          </Typography>
          <RichTextEditor
            value={value.explanation}
            onChange={(html) => onChange({ explanation: html })}
            placeholder={EXPLANATION_PLACEHOLDERS[phase]}
            rows={5}
            compact
            showLessonMarkup={false}
            showImageToolbar={false}
            allowPasteImages={false}
          />
        </Box>
      </Box>
    </Box>
  );
}

export const emptyHeroPhase = (): HeroPhaseContent => ({
  songTitle: '',
  songAudioUrl: '',
  explanation: '',
  tabata: { ...DEFAULT_TABATA },
  random: emptyRandomConfig(),
});
