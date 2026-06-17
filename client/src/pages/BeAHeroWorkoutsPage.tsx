import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Paper,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  MusicNote as MusicNoteIcon,
  EmojiEvents as EmojiEventsIcon,
  Replay as ReplayIcon,
} from '@mui/icons-material';
import { DialogCloseIconButton, dialogCloseTitleSx } from '../components/ui/dialog-close-icon-button';
import { HeroSlideRichBody } from '../components/HeroSlideRichBody';
import { parseSpotifyUrl } from '../lib/spotify';
import { finalizeTabata, isTabataActive, normalizeTabata } from '../lib/tabata';
import { finalizeCardsRandom, isCardsRandomActive, normalizeCardsRandom } from '../lib/beAHeroRandom';
import { BeAHeroTabataTimer } from '../components/BeAHeroTabataTimer';
import { BeAHeroRandomCardsPlay } from '../components/BeAHeroRandomCards';
import { BeAHeroLogo, BeAHeroWorkoutPhaseDots } from '../components/BeAHeroLogo';
import { BeAHeroWorkoutIcon } from '../components/BeAHeroWorkoutIcon';
import {
  BeAHeroPhaseRow,
  emptyHeroPhase,
  type HeroPhaseContent,
  type HeroPhaseKey,
} from '../components/BeAHeroPhaseRow';
import {
  beAHeroDialogPaperSx,
  beAHeroEmptyStateSx,
  beAHeroHeaderBandSx,
  BE_A_HERO_HEADER_LOGO_SIZE,
  beAHeroIconActionDangerSx,
  beAHeroIconActionSx,
  beAHeroListItemSx,
  beAHeroOutlinedBtnSx,
  beAHeroPlayBtnSx,
  beAHeroPlaySlideCardSx,
  beAHeroPlaySlideHeaderSx,
  beAHeroPhaseChipSx,
  beAHeroPhaseStyle,
  beAHeroPrimaryBtnSx,
  compactIconBtnSx,
  compactIconSx,
  heroNameFieldSx,
  protocolPageBgSx,
  protocolPalette,
} from '../lib/beAHeroUi';

import {
  loadWorkoutsWithSync,
  persistWorkouts,
  type BeAHeroWorkout,
} from '../lib/beAHeroWorkoutsStorage';

export type HeroWorkout = BeAHeroWorkout;

type PhaseKey = HeroPhaseKey;

type PlayEntry = {
  phase: PhaseKey;
  content: HeroPhaseContent;
};

const PHASE_LABELS: Record<PhaseKey, string> = {
  warmup: 'Warm-up',
  workout: 'Workout',
  cooldown: 'Cooldown',
};

const beAHeroHeaderBackBtnSx = {
  p: 0,
  minWidth: BE_A_HERO_HEADER_LOGO_SIZE,
  width: BE_A_HERO_HEADER_LOGO_SIZE,
  height: BE_A_HERO_HEADER_LOGO_SIZE,
  borderRadius: 2,
  transition: 'all 0.2s ease',
  bgcolor: 'white',
  border: '1px solid',
  borderColor: 'divider',
  flexShrink: 0,
  boxSizing: 'border-box',
} as const;

const beAHeroBackBtnSx = {
  ...compactIconBtnSx,
  bgcolor: 'white',
  border: '1px solid',
  borderColor: 'divider',
  flexShrink: 0,
} as const;

const beAHeroHeaderBackIconSx = { fontSize: 22 } as const;

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizePhaseContent(raw: unknown): HeroPhaseContent {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return emptyHeroPhase();
  const o = raw as Record<string, unknown>;
  return {
    songTitle: typeof o.songTitle === 'string' ? o.songTitle : '',
    songAudioUrl: typeof o.songAudioUrl === 'string' ? o.songAudioUrl : '',
    explanation: typeof o.explanation === 'string' ? o.explanation : '',
    tabata: normalizeTabata(o.tabata),
    random: normalizeCardsRandom(o.random),
  };
}

function phaseHasSong(phase: HeroPhaseContent): boolean {
  return !!(phase.songTitle.trim() || phase.songAudioUrl.trim());
}

function phaseHasContent(phase: HeroPhaseContent): boolean {
  return phaseHasSong(phase) || !!phase.explanation.trim() || isTabataActive(phase.tabata) || isCardsRandomActive(phase.random);
}

function finalizePhase(phase: HeroPhaseContent): HeroPhaseContent {
  return {
    songTitle: phase.songTitle.trim(),
    songAudioUrl: phase.songAudioUrl.trim(),
    explanation: phase.explanation.trim(),
    tabata: finalizeTabata(phase.tabata),
    random: finalizeCardsRandom(phase.random),
  };
}

type LegacySong = { title: string; task: string; audioUrl: string };
type LegacyMusicSlot = { song1: LegacySong; song2: LegacySong | null };
type LegacySlide = { id: string; text: string };

function legacySong(raw: unknown): LegacySong {
  if (!raw || typeof raw !== 'object') return { title: '', task: '', audioUrl: '' };
  const o = raw as Record<string, unknown>;
  return {
    title: typeof o.title === 'string' ? o.title : '',
    task: typeof o.task === 'string' ? o.task : '',
    audioUrl: typeof o.audioUrl === 'string' ? o.audioUrl : '',
  };
}

function legacyMusicSlot(raw: unknown): LegacyMusicSlot {
  if (!raw || typeof raw !== 'object') return { song1: legacySong(null), song2: null };
  const o = raw as Record<string, unknown>;
  return { song1: legacySong(o.song1), song2: o.song2 ? legacySong(o.song2) : null };
}

function legacySlides(raw: unknown): LegacySlide[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((s) => {
      if (!s || typeof s !== 'object') return null;
      const o = s as Record<string, unknown>;
      return {
        id: typeof o.id === 'string' ? o.id : newId(),
        text: typeof o.text === 'string' ? o.text : '',
      };
    })
    .filter((x): x is LegacySlide => x !== null);
}

function slidesToExplanation(slides: LegacySlide[]): string {
  return slides
    .map((s) => s.text.trim())
    .filter(Boolean)
    .join('\n\n');
}

function mergeLegacySong(primary: LegacySong, secondary: LegacySong | null): { title: string; audioUrl: string } {
  const title = primary.title.trim() || secondary?.title.trim() || '';
  const audioUrl = primary.audioUrl.trim() || secondary?.audioUrl.trim() || '';
  return { title, audioUrl };
}

function migrateLegacyPhases(o: Record<string, unknown>): Pick<HeroWorkout, 'warmup' | 'workout' | 'cooldown'> {
  const opening = legacyMusicSlot(o.openingMusic);
  const closing = legacyMusicSlot(o.closingMusic);
  const warmupSlides = legacySlides(o.warmup);
  const workoutSlides = legacySlides(o.workout);
  const cooldownSlides = legacySlides(o.cooldown);

  const openingSong = mergeLegacySong(opening.song1, opening.song2);
  const closingSong = mergeLegacySong(closing.song1, closing.song2);

  const warmupExtra = [opening.song1.task, opening.song2?.task].filter((t) => t?.trim()).join('\n\n');
  const cooldownExtra = [closing.song1.task, closing.song2?.task].filter((t) => t?.trim()).join('\n\n');

  const joinExplanation = (slides: LegacySlide[], extra: string) => {
    const base = slidesToExplanation(slides);
    if (!extra) return base;
    return base ? `${base}\n\n${extra}` : extra;
  };

  return {
    warmup: {
      songTitle: openingSong.title,
      songAudioUrl: openingSong.audioUrl,
      explanation: joinExplanation(warmupSlides, warmupExtra),
    },
    workout: {
      songTitle: '',
      songAudioUrl: '',
      explanation: slidesToExplanation(workoutSlides),
    },
    cooldown: {
      songTitle: closingSong.title,
      songAudioUrl: closingSong.audioUrl,
      explanation: joinExplanation(cooldownSlides, cooldownExtra),
    },
  };
}

function migrateFromV1Cards(o: Record<string, unknown>): HeroWorkout | null {
  if (!Array.isArray(o.cards)) return null;
  const cards = o.cards as { id?: string; title?: string; description?: string }[];
  const explanation = cards
    .map((c) => {
      const title = typeof c.title === 'string' ? c.title.trim() : '';
      const desc = typeof c.description === 'string' ? c.description.trim() : '';
      return [title, desc].filter(Boolean).join('\n\n');
    })
    .filter(Boolean)
    .join('\n\n');

  return {
    id: String(o.id),
    name: String(o.name),
    warmup: emptyHeroPhase(),
    workout: { ...emptyHeroPhase(), explanation },
    cooldown: emptyHeroPhase(),
    createdAt: typeof o.createdAt === 'string' ? o.createdAt : new Date().toISOString(),
  };
}

function parseWorkout(raw: unknown): HeroWorkout | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== 'string' || typeof o.name !== 'string') return null;

  if (o.warmup && typeof o.warmup === 'object' && !Array.isArray(o.warmup)) {
    return {
      id: o.id,
      name: o.name,
      warmup: normalizePhaseContent(o.warmup),
      workout: normalizePhaseContent(o.workout),
      cooldown: normalizePhaseContent(o.cooldown),
      createdAt: typeof o.createdAt === 'string' ? o.createdAt : new Date().toISOString(),
    };
  }

  if (Array.isArray(o.warmup) && Array.isArray(o.workout) && Array.isArray(o.cooldown)) {
    return {
      id: o.id,
      name: o.name,
      ...migrateLegacyPhases(o),
      createdAt: typeof o.createdAt === 'string' ? o.createdAt : new Date().toISOString(),
    };
  }

  return migrateFromV1Cards(o);
}

function buildPlayQueue(w: HeroWorkout): PlayEntry[] {
  return (['warmup', 'workout', 'cooldown'] as PhaseKey[]).map((phase) => ({
    phase,
    content: w[phase],
  }));
}

function playStepCount(_w: HeroWorkout): number {
  return 3;
}

function workoutHasPlayableContent(w: HeroWorkout): boolean {
  return phaseHasContent(w.warmup) || phaseHasContent(w.workout) || phaseHasContent(w.cooldown);
}

const defaultPhaseDraft = (): Record<PhaseKey, HeroPhaseContent> => ({
  warmup: emptyHeroPhase(),
  workout: emptyHeroPhase(),
  cooldown: emptyHeroPhase(),
});

const PLAY_PHASES: PhaseKey[] = ['warmup', 'workout', 'cooldown'];

function HeroPhaseSlide({
  phase,
  content,
  slideIndex,
}: {
  phase: PhaseKey;
  content: HeroPhaseContent;
  slideIndex: number;
  slideCount?: number;
  workoutName?: string;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const style = beAHeroPhaseStyle(phase);
  const songTitle = content.songTitle.trim();
  const audioUrl = content.songAudioUrl.trim();
  const explanation = content.explanation.trim();
  const spotify = parseSpotifyUrl(audioUrl);
  const hasSong = !!(songTitle || audioUrl);
  const showTabata = phase === 'workout' && isTabataActive(content.tabata);
  const showRandomCards = phase === 'workout' && isCardsRandomActive(content.random);
  const tabataConfig = content.tabata!;
  const randomConfig = content.random!;

  useEffect(
    () => () => {
      audioRef.current?.pause();
      audioRef.current = null;
    },
    []
  );

  const togglePlay = () => {
    if (!audioUrl) return;
    if (playing && audioRef.current) {
      audioRef.current.pause();
      setPlaying(false);
      return;
    }
    audioRef.current?.pause();
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.onended = () => setPlaying(false);
    audio.onerror = () => setPlaying(false);
    audio
      .play()
      .then(() => setPlaying(true))
      .catch(() => setPlaying(false));
  };

  const stopPlay = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setPlaying(false);
  };

  return (
    <Paper elevation={0} sx={beAHeroPlaySlideCardSx}>
      <Box sx={beAHeroPlaySlideHeaderSx(phase)}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1.25 }}>
          <Box sx={beAHeroPhaseChipSx(phase, true)}>{PHASE_LABELS[phase]}</Box>
          <Typography variant="caption" sx={{ fontWeight: 700, color: style.labelColor, opacity: 0.65 }}>
            {slideIndex + 1} / 3
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
          {PLAY_PHASES.map((p, i) => (
            <Box
              key={p}
              sx={{
                flex: i === slideIndex ? 1.6 : 1,
                maxWidth: i === slideIndex ? 72 : 40,
                height: 4,
                borderRadius: 99,
                bgcolor: i <= slideIndex ? style.accentMain : 'rgba(15, 23, 42, 0.1)',
                transition: 'all 0.25s ease',
              }}
            />
          ))}
        </Box>
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: 'stretch',
        }}
      >
        {hasSong ? (
          <Box
            sx={{
              flex: '0 0 auto',
              width: { xs: '100%', sm: 240 },
              p: { xs: 1.5, sm: 1.75 },
              bgcolor: '#fafbfc',
              borderBottom: { xs: '1px solid', sm: 'none' },
              borderRight: { sm: '1px solid' },
              borderColor: 'divider',
            }}
          >
            {spotify ? (
              <Box
                sx={{
                  borderRadius: 2,
                  overflow: 'hidden',
                  border: '1px solid',
                  borderColor: style.borderColor,
                  bgcolor: 'rgba(255,255,255,0.72)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1.25, pt: 0.85, pb: 0.5 }}>
                  <MusicNoteIcon sx={{ fontSize: 15, color: style.accentMain }} />
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 700, color: style.labelColor, fontSize: '0.62rem', letterSpacing: '0.06em' }}
                  >
                    MUSIK · SPOTIFY
                  </Typography>
                </Box>
                <Box
                  component="iframe"
                  title={songTitle || 'Spotify'}
                  src={spotify.embedUrl}
                  height={spotify.type === 'track' || spotify.type === 'episode' ? 152 : 352}
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  sx={{ display: 'block', width: '100%', border: 0 }}
                />
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 1.25,
                  py: 1,
                  borderRadius: 2,
                  bgcolor: 'rgba(255,255,255,0.72)',
                  border: '1px solid',
                  borderColor: style.borderColor,
                }}
              >
                <Tooltip title={audioUrl ? (playing ? 'Pause' : 'Abspielen') : 'Kein Audio-Link hinterlegt'}>
                  <span>
                    <IconButton
                      onClick={togglePlay}
                      disabled={!audioUrl}
                      aria-label={playing ? 'Pause' : 'Abspielen'}
                      sx={{
                        width: 40,
                        height: 40,
                        flexShrink: 0,
                        bgcolor: audioUrl ? style.accentMain : 'rgba(15, 23, 42, 0.08)',
                        color: audioUrl ? '#fff' : 'rgba(15, 23, 42, 0.35)',
                        '&:hover': { bgcolor: audioUrl ? style.accentMain : 'rgba(15, 23, 42, 0.08)' },
                      }}
                    >
                      {playing ? <PauseIcon sx={{ fontSize: 22 }} /> : <PlayArrowIcon sx={{ fontSize: 22 }} />}
                    </IconButton>
                  </span>
                </Tooltip>

                <Box sx={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.45, mb: 0.2 }}>
                    <MusicNoteIcon sx={{ fontSize: 15, color: style.accentMain }} />
                    <Typography variant="caption" sx={{ fontWeight: 700, color: style.labelColor, fontSize: '0.62rem', letterSpacing: '0.06em' }}>
                      MUSIK
                    </Typography>
                  </Box>
                  <Typography
                    sx={{
                      fontWeight: 700,
                      color: style.labelColor,
                      fontSize: '0.88rem',
                      lineHeight: 1.3,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {songTitle || 'Audio bereit'}
                  </Typography>
                </Box>

                <Tooltip title="Stop">
                  <span>
                    <IconButton
                      onClick={stopPlay}
                      disabled={!audioUrl || !playing}
                      aria-label="Stop"
                      size="small"
                      sx={{
                        width: 32,
                        height: 32,
                        flexShrink: 0,
                        border: '1px solid',
                        borderColor: style.borderColor,
                        color: style.labelColor,
                        bgcolor: '#fff',
                      }}
                    >
                      <StopIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            )}
          </Box>
        ) : null}

        <Box sx={{ flex: 1, minWidth: 0, px: { xs: 2, sm: 2.75 }, py: { xs: 2.25, sm: 2.75 }, bgcolor: '#fff' }}>
          {explanation ? (
            <HeroSlideRichBody source={explanation} instruction />
          ) : !hasSong && !showTabata && !showRandomCards ? (
            <Typography color="text.secondary" sx={{ fontSize: '0.92rem', textAlign: 'center', py: 1 }}>
              Noch kein Inhalt für {PHASE_LABELS[phase]}.
            </Typography>
          ) : null}
        </Box>

        {showRandomCards ? (
          <Box
            sx={{
              flex: '0 0 auto',
              width: { xs: '100%', sm: 300 },
              p: { xs: 1.5, sm: 1.75 },
              bgcolor: '#fafbfc',
              borderTop: { xs: '1px solid', sm: 'none' },
              borderLeft: { sm: '1px solid' },
              borderColor: 'divider',
              order: { xs: 4, sm: 0 },
            }}
          >
            <BeAHeroRandomCardsPlay
              config={randomConfig}
              accentColor={style.accentMain}
              labelColor={style.labelColor}
              borderColor={style.borderColor}
            />
          </Box>
        ) : null}

        {showTabata ? (
          <Box
            sx={{
              flex: '0 0 auto',
              width: { xs: '100%', sm: 272 },
              p: { xs: 1.5, sm: 1.75 },
              bgcolor: '#fafbfc',
              borderTop: { xs: '1px solid', sm: 'none' },
              borderLeft: { sm: '1px solid' },
              borderColor: 'divider',
              order: { xs: 3, sm: 0 },
            }}
          >
            <BeAHeroTabataTimer
              config={tabataConfig}
              accentColor={style.accentMain}
              labelColor={style.labelColor}
              borderColor={style.borderColor}
            />
          </Box>
        ) : null}
      </Box>
    </Paper>
  );
}

export default function BeAHeroWorkoutsPage() {
  const navigate = useNavigate();
  const [workouts, setWorkouts] = useState<HeroWorkout[]>([]);
  const [storageReady, setStorageReady] = useState(false);
  const [playingWorkoutId, setPlayingWorkoutId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [workoutName, setWorkoutName] = useState('');
  const [phaseDraft, setPhaseDraft] = useState<Record<PhaseKey, HeroPhaseContent>>(() => defaultPhaseDraft());
  const [playIndex, setPlayIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loadWorkoutsWithSync(parseWorkout).then((list) => {
      if (!cancelled) {
        setWorkouts(list);
        setStorageReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    void persistWorkouts(workouts);
  }, [workouts, storageReady]);

  const playingWorkout = useMemo(
    () => workouts.find((w) => w.id === playingWorkoutId) ?? null,
    [workouts, playingWorkoutId]
  );

  const playQueue = useMemo(
    () => (playingWorkout ? buildPlayQueue(playingWorkout) : []),
    [playingWorkout]
  );

  const currentEntry = playQueue[playIndex];
  // Index === playQueue.length ist die Abschluss-Karte ("geschafft").
  const isFinishSlide = playQueue.length > 0 && playIndex >= playQueue.length;

  useEffect(() => {
    if (playQueue.length === 0) {
      setPlayIndex(0);
      return;
    }
    if (playIndex > playQueue.length) {
      setPlayIndex(playQueue.length);
    }
  }, [playQueue.length, playIndex]);

  const startWorkout = (id: string) => {
    const w = workouts.find((x) => x.id === id);
    if (!w) return;
    if (!workoutHasPlayableContent(w)) {
      window.alert('Dieses Workout hat noch keinen Inhalt.');
      return;
    }
    setPlayingWorkoutId(id);
    setPlayIndex(0);
  };

  const exitPlay = useCallback(() => {
    setPlayingWorkoutId(null);
    setPlayIndex(0);
  }, []);

  const openNew = () => {
    setEditingId(null);
    setWorkoutName('');
    setPhaseDraft(defaultPhaseDraft());
    setDialogOpen(true);
  };

  const openEdit = (w: HeroWorkout) => {
    setEditingId(w.id);
    setWorkoutName(w.name);
    setPhaseDraft({
      warmup: { ...w.warmup },
      workout: { ...w.workout },
      cooldown: { ...w.cooldown },
    });
    setDialogOpen(true);
  };

  const closeDialog = () => setDialogOpen(false);

  const updatePhaseDraft = (phase: PhaseKey, patch: Partial<HeroPhaseContent>) => {
    setPhaseDraft((prev) => ({ ...prev, [phase]: { ...prev[phase], ...patch } }));
  };

  const persistDraft = () => {
    const name = workoutName.trim();
    if (!name) return;
    const warmup = finalizePhase(phaseDraft.warmup);
    const workout = finalizePhase(phaseDraft.workout);
    const cooldown = finalizePhase(phaseDraft.cooldown);
    const hasContent =
      phaseHasContent(warmup) || phaseHasContent(workout) || phaseHasContent(cooldown);
    if (!hasContent) return;

    const payload = { name, warmup, workout, cooldown };
    if (editingId) {
      setWorkouts((prev) => prev.map((w) => (w.id === editingId ? { ...w, ...payload } : w)));
    } else {
      setWorkouts((prev) => [
        ...prev,
        { id: newId(), ...payload, createdAt: new Date().toISOString() },
      ]);
    }
    closeDialog();
  };

  const removeWorkout = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!window.confirm('Dieses Workout wirklich löschen?')) return;
    setWorkouts((prev) => prev.filter((w) => w.id !== id));
    if (playingWorkoutId === id) exitPlay();
  };

  const goPlayPrev = useCallback(() => {
    if (playQueue.length === 0) return;
    setPlayIndex((i) => (i <= 0 ? 0 : i - 1));
  }, [playQueue.length]);

  const goPlayNext = useCallback(() => {
    if (playQueue.length === 0) return;
    setPlayIndex((i) => (i >= playQueue.length ? i : i + 1));
  }, [playQueue.length]);

  const restartWorkout = useCallback(() => setPlayIndex(0), []);

  useEffect(() => {
    if (!playingWorkoutId || dialogOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPlayPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goPlayNext();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        exitPlay();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [playingWorkoutId, dialogOpen, goPlayPrev, goPlayNext, exitPlay]);

  const renderPlayContent = () => {
    if (!playingWorkout || playQueue.length === 0 || (!currentEntry && !isFinishSlide)) {
      return (
        <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
          Kein Inhalt zum Abspielen.
        </Typography>
      );
    }

    return (
      <Box
        sx={{
          ...protocolPageBgSx,
          bgcolor: '#fff',
          background: '#fff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          px: { xs: 1.5, sm: 2.5 },
          py: { xs: 1.25, sm: 1.75 },
          boxSizing: 'border-box',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2, flexShrink: 0 }}>
          <Tooltip title="Zur Liste">
            <IconButton onClick={exitPlay} aria-label="Zurück" sx={beAHeroBackBtnSx}>
              <ArrowBackIcon sx={compactIconSx} />
            </IconButton>
          </Tooltip>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{
                fontWeight: 800,
                color: protocolPalette.heading,
                fontSize: { xs: '0.95rem', sm: '1.05rem' },
                lineHeight: 1.25,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {playingWorkout.name}
            </Typography>
            <Typography sx={{ color: 'text.secondary', fontSize: '0.72rem', fontWeight: 600 }}>
              {isFinishSlide ? 'Geschafft' : `${playIndex + 1} / ${playQueue.length}`}
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            flex: 1,
            width: '100%',
            maxWidth: 1200,
            mx: 'auto',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            minHeight: 0,
            pb: 1,
          }}
        >
          {isFinishSlide || !currentEntry ? (
            <Paper elevation={0} sx={beAHeroPlaySlideCardSx}>
              <Box
                sx={{
                  px: { xs: 2, sm: 2.5 },
                  py: { xs: 1.5, sm: 1.75 },
                  background: 'linear-gradient(135deg, #fff8e1 0%, #ffe7a3 100%)',
                  borderBottom: '1px solid',
                  borderColor: 'rgba(255, 179, 0, 0.45)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1.25 }}>
                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      bgcolor: '#ffb300',
                      color: '#fff',
                    }}
                  >
                    <EmojiEventsIcon sx={{ fontSize: 18 }} />
                  </Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#b26a00', opacity: 0.85 }}>
                    {playQueue.length} / {playQueue.length}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                  {playQueue.map((_, i) => (
                    <Box
                      key={i}
                      sx={{
                        flex: 1,
                        maxWidth: 56,
                        height: 4,
                        borderRadius: 99,
                        bgcolor: '#ffb300',
                      }}
                    />
                  ))}
                </Box>
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  px: { xs: 2.5, sm: 4 },
                  py: { xs: 3, sm: 3.75 },
                  gap: 1.5,
                  bgcolor: '#fff',
                }}
              >
                <Box
                  sx={{
                    width: 84,
                    height: 84,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #ffe082 0%, #ffb300 100%)',
                    boxShadow: '0 8px 24px rgba(255, 179, 0, 0.4)',
                  }}
                >
                  <EmojiEventsIcon sx={{ fontSize: 46, color: '#fff' }} />
                </Box>

                <Typography sx={{ fontWeight: 900, fontSize: { xs: '1.6rem', sm: '2rem' }, color: protocolPalette.heading, lineHeight: 1.1 }}>
                  Geschafft!
                </Typography>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ mt: 1, width: { xs: '100%', sm: 'auto' } }}>
                  <Button
                    variant="contained"
                    startIcon={<ReplayIcon sx={{ fontSize: 18 }} />}
                    onClick={restartWorkout}
                    sx={beAHeroPrimaryBtnSx}
                  >
                    Nochmal
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<ArrowBackIcon sx={{ fontSize: 18 }} />}
                    onClick={exitPlay}
                    sx={beAHeroOutlinedBtnSx}
                  >
                    Zur Übersicht
                  </Button>
                </Stack>
              </Box>
            </Paper>
          ) : (
            <HeroPhaseSlide
              key={playIndex}
              phase={currentEntry.phase}
              content={currentEntry.content}
              slideIndex={playIndex}
              slideCount={playQueue.length}
              workoutName={playingWorkout.name}
            />
          )}
        </Box>

        <Typography
          variant="caption"
          sx={{
            display: 'block',
            textAlign: 'center',
            color: 'text.secondary',
            opacity: 0.65,
            fontSize: '0.62rem',
            fontWeight: 600,
            pb: 0.25,
            flexShrink: 0,
          }}
        >
          ← → · Esc
        </Typography>
      </Box>
    );
  };

  return (
    <>
      {playingWorkoutId ? (
        renderPlayContent()
      ) : (
        <Box sx={{ ...protocolPageBgSx, bgcolor: '#fff' }}>
          <Box sx={{ width: '100%', maxWidth: 1000, mx: 'auto', minWidth: 0, boxSizing: 'border-box', px: { xs: 1.5, sm: 2.5 } }}>
            <Box sx={{ display: 'flex', alignItems: 'stretch', gap: 1, mb: 2.5 }}>
              <Tooltip title="Dashboard">
                <IconButton
                  onClick={() => navigate('/dashboard')}
                  aria-label="Zurück"
                  sx={beAHeroHeaderBackBtnSx}
                >
                  <ArrowBackIcon sx={beAHeroHeaderBackIconSx} />
                </IconButton>
              </Tooltip>
              <Box sx={{ ...beAHeroHeaderBandSx, mb: 0, flex: 1, minWidth: 0 }}>
                <BeAHeroLogo
                  size={BE_A_HERO_HEADER_LOGO_SIZE}
                  framed
                  showWordmark
                  layout="inline"
                  sx={{ height: '100%', width: '100%' }}
                />
              </Box>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.75, gap: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: protocolPalette.heading }}>
                  Deine Workouts
                </Typography>
                {workouts.length > 0 && (
                  <Button
                    variant="contained"
                    startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                    onClick={openNew}
                    size="small"
                    sx={beAHeroPrimaryBtnSx}
                  >
                    Neu
                  </Button>
                )}
              </Stack>

                {workouts.length === 0 ? (
                  <Card elevation={0} sx={beAHeroEmptyStateSx}>
                    <CardContent sx={{ py: 5, textAlign: 'center' }}>
                      <BeAHeroLogo size={80} framed layout="stacked" sx={{ mb: 1.5, justifyContent: 'center' }} />
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.75, color: protocolPalette.heading }}>
                        Noch keine Workouts
                      </Typography>
                      <Typography color="text.secondary" sx={{ mb: 2.5, maxWidth: 380, mx: 'auto' }}>
                        Name festlegen, Lied und Übungserläuterung pro Phase — Warm-up, Workout, Cooldown.
                      </Typography>
                      <Button
                        variant="contained"
                        startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                        onClick={openNew}
                        size="small"
                        sx={beAHeroPrimaryBtnSx}
                      >
                        Erstes Workout anlegen
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Stack spacing={1.15}>
                    {workouts.map((w) => (
                      <Box
                        key={w.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => startWorkout(w.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            startWorkout(w.id);
                          }
                        }}
                        sx={beAHeroListItemSx}
                      >
                        <BeAHeroWorkoutIcon name={w.name} size={40} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 700, color: protocolPalette.heading, lineHeight: 1.3 }}>
                            {w.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.35 }}>
                            {playStepCount(w)} Schritt{playStepCount(w) === 1 ? '' : 'e'}
                          </Typography>
                          <BeAHeroWorkoutPhaseDots
                            warmup={phaseHasContent(w.warmup)}
                            workout={phaseHasContent(w.workout)}
                            cooldown={phaseHasContent(w.cooldown)}
                          />
                        </Box>
                        <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                          <Tooltip title="Abspielen">
                            <IconButton
                              size="small"
                              onClick={() => startWorkout(w.id)}
                              aria-label="Abspielen"
                              sx={beAHeroPlayBtnSx}
                            >
                              <PlayArrowIcon sx={{ fontSize: 17 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Bearbeiten">
                            <IconButton
                              size="small"
                              onClick={() => openEdit(w)}
                              aria-label="Bearbeiten"
                              sx={beAHeroIconActionSx}
                            >
                              <EditIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Löschen">
                            <IconButton
                              size="small"
                              onClick={(e) => removeWorkout(w.id, e)}
                              aria-label="Löschen"
                              sx={beAHeroIconActionDangerSx}
                            >
                              <DeleteIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                )}
            </Box>
          </Box>
        </Box>
      )}

      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        fullWidth
        maxWidth="lg"
        PaperProps={{
          sx: {
            ...beAHeroDialogPaperSx,
            maxHeight: 'min(94vh, 860px)',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        <DialogTitle
          sx={{
            ...dialogCloseTitleSx,
            background: 'linear-gradient(135deg, #ffffff 0%, #f4f8ff 100%)',
            borderBottom: '1px solid',
            borderColor: 'rgba(25, 118, 210, 0.12)',
            py: 1.5,
            px: { xs: 2, sm: 3 },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pr: 4 }}>
            <BeAHeroLogo size={48} framed showWordmark />
            <Typography
              variant="body2"
              sx={{
                fontWeight: 700,
                color: protocolPalette.textSecondary,
                px: 1,
                py: 0.25,
                borderRadius: 99,
                bgcolor: 'rgba(25, 118, 210, 0.08)',
              }}
            >
              {editingId ? 'Bearbeiten' : 'Neu'}
            </Typography>
          </Box>
          <DialogCloseIconButton onClose={closeDialog} />
        </DialogTitle>
        <DialogContent
          sx={{
            pt: 2.5,
            px: { xs: 2, sm: 3 },
            pb: 1,
            overflow: 'auto',
            flex: 1,
            bgcolor: protocolPalette.background,
          }}
        >
          <TextField
            label="Name"
            fullWidth
            size="small"
            margin="none"
            value={workoutName}
            onChange={(e) => setWorkoutName(e.target.value)}
            placeholder="z. B. Helden-Runde 10 Min"
            sx={{ ...heroNameFieldSx, mb: 2, maxWidth: 520 }}
          />

          <Box>
            {(['warmup', 'workout', 'cooldown'] as PhaseKey[]).map((phase) => (
              <BeAHeroPhaseRow
                key={phase}
                phase={phase}
                value={phaseDraft[phase]}
                onChange={(patch) => updatePhaseDraft(phase, patch)}
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions
          sx={{
            px: 3,
            py: 2,
            bgcolor: '#fff',
            borderTop: '1px solid',
            borderColor: 'divider',
            gap: 1,
            justifyContent: 'flex-end',
          }}
        >
          <Button variant="outlined" size="small" onClick={closeDialog} sx={beAHeroOutlinedBtnSx}>
            Abbrechen
          </Button>
          <Button variant="contained" size="small" onClick={persistDraft} sx={beAHeroPrimaryBtnSx}>
            Speichern
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
