import React from 'react';
import { Box, TextField, Typography, Switch, FormControlLabel } from '@mui/material';
import { MusicNote as MusicNoteIcon, Timer as TimerIcon } from '@mui/icons-material';
import {
  beAHeroPhaseCardSx,
  beAHeroPhaseStyle,
  heroMinimalFieldSx,
} from '../lib/beAHeroUi';
import { DEFAULT_TABATA, type TabataConfig } from '../lib/tabata';
import { emptyCardsRandomConfig, type BeAHeroCardsRandomConfig } from '../lib/beAHeroRandom';
import { BeAHeroRandomCardsEditor } from './BeAHeroRandomCards';
import { RichTextEditor } from './ui/rich-text-editor';

export type HeroPhaseContent = {
  songTitle: string;
  songAudioUrl: string;
  explanation: string;
  tabata?: TabataConfig;
  random?: BeAHeroCardsRandomConfig;
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
          gap: { xs: 1.25, md: 1.5 },
          alignItems: 'stretch',
        }}
      >
        <Box
          sx={{
            p: 1.25,
            borderRadius: 2,
            bgcolor: style.background,
            border: '1px solid',
            borderColor: style.borderColor,
            width: '100%',
            maxWidth: { md: 360 },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.85 }}>
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
              mt: 0.75,
              '& .MuiInputBase-root': { fontSize: '0.76rem', borderRadius: 1.75, bgcolor: '#fff' },
            }}
          />
        </Box>

        {phase === 'workout' ? (
          <Box
            sx={{
              p: 1.25,
              borderRadius: 2,
              bgcolor: style.background,
              border: '1px solid',
              borderColor: style.borderColor,
              width: '100%',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: value.tabata?.enabled ? 1 : 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <TimerIcon sx={{ fontSize: 15, color: style.labelColor, opacity: 0.75 }} />
                <Typography variant="caption" sx={{ fontWeight: 700, color: style.labelColor, fontSize: '0.72rem' }}>
                  Tabata-Timer
                </Typography>
              </Box>
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={!!value.tabata?.enabled}
                    onChange={(e) =>
                      onChange({
                        tabata: {
                          ...(value.tabata ?? DEFAULT_TABATA),
                          enabled: e.target.checked,
                        },
                      })
                    }
                  />
                }
                label=""
                sx={{ m: 0 }}
              />
            </Box>
            {value.tabata?.enabled ? (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' }, gap: 0.75 }}>
                <TextField
                  label="Arbeit (Sek.)"
                  type="number"
                  size="small"
                  value={value.tabata.workSeconds}
                  onChange={(e) =>
                    onChange({
                      tabata: { ...value.tabata!, workSeconds: Number(e.target.value) || DEFAULT_TABATA.workSeconds },
                    })
                  }
                  inputProps={{ min: 5, max: 300 }}
                  sx={heroMinimalFieldSx}
                />
                <TextField
                  label="Pause (Sek.)"
                  type="number"
                  size="small"
                  value={value.tabata.restSeconds}
                  onChange={(e) =>
                    onChange({
                      tabata: { ...value.tabata!, restSeconds: Number(e.target.value) || 0 },
                    })
                  }
                  inputProps={{ min: 0, max: 300 }}
                  sx={heroMinimalFieldSx}
                />
                <TextField
                  label="Runden"
                  type="number"
                  size="small"
                  value={value.tabata.rounds}
                  onChange={(e) =>
                    onChange({
                      tabata: { ...value.tabata!, rounds: Number(e.target.value) || DEFAULT_TABATA.rounds },
                    })
                  }
                  inputProps={{ min: 1, max: 50 }}
                  sx={heroMinimalFieldSx}
                />
              </Box>
            ) : null}
          </Box>
        ) : null}

        {phase === 'workout' ? (
          <BeAHeroRandomCardsEditor
            value={value.random ?? emptyCardsRandomConfig()}
            onChange={(patch) =>
              onChange({
                random: { ...(value.random ?? emptyCardsRandomConfig()), ...patch },
              })
            }
            labelColor={style.labelColor}
            borderColor={style.borderColor}
            background={style.background}
          />
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
  random: emptyCardsRandomConfig(),
});
