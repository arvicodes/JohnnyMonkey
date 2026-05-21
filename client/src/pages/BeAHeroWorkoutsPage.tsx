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
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Divider,
  Stack,
  Paper,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon,
  MusicNote as MusicNoteIcon,
} from '@mui/icons-material';
import { DialogCloseIconButton, dialogCloseTitleSx } from '../components/ui/dialog-close-icon-button';
import { SlideTextFieldWithFormatShortcuts } from '../components/SlideTextFieldWithFormatShortcuts';
import { HeroSlideMarkdownBody } from '../components/HeroSlideMarkdownBody';

const LS_KEY = 'johnnyMonkey.beAHeroWorkouts.v3';
const LS_KEY_V2 = 'johnnyMonkey.beAHeroWorkouts.v2';

export type HeroSong = {
  title: string;
  task: string;
  /** Direkte Audio-URL (MP3 etc.) zum Abspielen */
  audioUrl: string;
};

export type HeroMusicSlot = {
  song1: HeroSong;
  song2: HeroSong | null;
};

/** Einzelne Folie: nur Erklärungstext */
export type HeroSlide = {
  id: string;
  text: string;
};

export type HeroWorkout = {
  id: string;
  name: string;
  openingMusic: HeroMusicSlot;
  warmup: HeroSlide[];
  workout: HeroSlide[];
  cooldown: HeroSlide[];
  closingMusic: HeroMusicSlot;
  createdAt: string;
};

type PhaseKey = 'warmup' | 'workout' | 'cooldown';

type PlayEntry =
  | { kind: 'song'; when: 'opening' | 'closing'; song: HeroSong }
  | { kind: 'slide'; phase: PhaseKey; slide: HeroSlide };

const PHASE_LABELS: Record<PhaseKey, string> = {
  warmup: 'Warm-up',
  workout: 'Workout',
  cooldown: 'Cooldown',
};

const SONG_WHEN_LABELS: Record<'opening' | 'closing', string> = {
  opening: 'Startmusik',
  closing: 'Abschlussmusik',
};

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const emptySlide = (): HeroSlide => ({ id: newId(), text: '' });

const emptySong = (): HeroSong => ({ title: '', task: '', audioUrl: '' });

const emptyMusicSlot = (): HeroMusicSlot => ({ song1: emptySong(), song2: null });

function songHasContent(s: HeroSong | null | undefined): boolean {
  if (!s) return false;
  return !!(s.title.trim() || s.task.trim() || s.audioUrl.trim());
}

function normalizeSong(raw: unknown): HeroSong {
  if (!raw || typeof raw !== 'object') return emptySong();
  const o = raw as Record<string, unknown>;
  return {
    title: typeof o.title === 'string' ? o.title : '',
    task: typeof o.task === 'string' ? o.task : '',
    audioUrl: typeof o.audioUrl === 'string' ? o.audioUrl : '',
  };
}

function normalizeMusicSlot(raw: unknown): HeroMusicSlot {
  if (!raw || typeof raw !== 'object') return emptyMusicSlot();
  const o = raw as Record<string, unknown>;
  const song1 = normalizeSong(o.song1);
  const song2Raw = o.song2;
  const song2 =
    song2Raw === null || song2Raw === undefined
      ? null
      : songHasContent(normalizeSong(song2Raw))
        ? normalizeSong(song2Raw)
        : null;
  return { song1, song2 };
}

function normalizeSlides(raw: unknown): HeroSlide[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((s) => {
      if (!s || typeof s !== 'object') return null;
      const o = s as Record<string, unknown>;
      const id = typeof o.id === 'string' ? o.id : newId();
      const text = typeof o.text === 'string' ? o.text : '';
      return { id, text };
    })
    .filter((x): x is HeroSlide => x !== null);
}

function migrateFromV1Cards(o: Record<string, unknown>): HeroWorkout | null {
  if (!Array.isArray(o.cards)) return null;
  const cards = o.cards as { id?: string; title?: string; description?: string }[];
  const workout: HeroSlide[] = cards
    .map((c) => {
      const title = typeof c.title === 'string' ? c.title.trim() : '';
      const desc = typeof c.description === 'string' ? c.description.trim() : '';
      const text = [title, desc].filter(Boolean).join('\n\n');
      if (!text) return null;
      return { id: typeof c.id === 'string' ? c.id : newId(), text };
    })
    .filter((x): x is HeroSlide => x !== null);
  return {
    id: String(o.id),
    name: String(o.name),
    openingMusic: emptyMusicSlot(),
    warmup: [],
    workout: workout.length ? workout : [emptySlide()],
    cooldown: [],
    closingMusic: emptyMusicSlot(),
    createdAt: typeof o.createdAt === 'string' ? o.createdAt : new Date().toISOString(),
  };
}

function parseWorkout(raw: unknown): HeroWorkout | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== 'string' || typeof o.name !== 'string') return null;

  if (Array.isArray(o.warmup) && Array.isArray(o.workout) && Array.isArray(o.cooldown)) {
    return {
      id: o.id,
      name: o.name,
      openingMusic: normalizeMusicSlot(o.openingMusic),
      warmup: normalizeSlides(o.warmup),
      workout: normalizeSlides(o.workout),
      cooldown: normalizeSlides(o.cooldown),
      closingMusic: normalizeMusicSlot(o.closingMusic),
      createdAt: typeof o.createdAt === 'string' ? o.createdAt : new Date().toISOString(),
    };
  }

  return migrateFromV1Cards(o);
}

function loadWorkouts(): HeroWorkout[] {
  try {
    let raw = localStorage.getItem(LS_KEY);
    if (!raw) raw = localStorage.getItem(LS_KEY_V2);
    if (!raw) raw = localStorage.getItem('johnnyMonkey.beAHeroWorkouts.v1');
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(parseWorkout).filter((w): w is HeroWorkout => w !== null);
  } catch {
    return [];
  }
}

function saveWorkouts(list: HeroWorkout[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(list));
}

function flattenWorkoutSlides(w: HeroWorkout): { phase: PhaseKey; slide: HeroSlide }[] {
  const out: { phase: PhaseKey; slide: HeroSlide }[] = [];
  for (const slide of w.warmup) {
    if (slide.text.trim()) out.push({ phase: 'warmup', slide });
  }
  for (const slide of w.workout) {
    if (slide.text.trim()) out.push({ phase: 'workout', slide });
  }
  for (const slide of w.cooldown) {
    if (slide.text.trim()) out.push({ phase: 'cooldown', slide });
  }
  return out;
}

function buildPlayQueue(w: HeroWorkout): PlayEntry[] {
  const out: PlayEntry[] = [];
  const pushSlot = (slot: HeroMusicSlot, when: 'opening' | 'closing') => {
    if (songHasContent(slot.song1)) out.push({ kind: 'song', when, song: slot.song1 });
    if (songHasContent(slot.song2)) out.push({ kind: 'song', when, song: slot.song2! });
  };
  pushSlot(w.openingMusic, 'opening');
  for (const entry of flattenWorkoutSlides(w)) {
    out.push({ kind: 'slide', ...entry });
  }
  pushSlot(w.closingMusic, 'closing');
  return out;
}

function slideCount(w: HeroWorkout): number {
  return flattenWorkoutSlides(w).length;
}

function playStepCount(w: HeroWorkout): number {
  return buildPlayQueue(w).length;
}

function filterNonemptySlides(slides: HeroSlide[]): HeroSlide[] {
  return slides.map((s) => ({ ...s, text: s.text.trim() })).filter((s) => s.text.length > 0);
}

const defaultDraftSections = (): Record<PhaseKey, HeroSlide[]> => ({
  warmup: [emptySlide()],
  workout: [emptySlide()],
  cooldown: [emptySlide()],
});

type MusicDraft = {
  opening: HeroMusicSlot;
  closing: HeroMusicSlot;
  openingSong2: boolean;
  closingSong2: boolean;
};

const defaultMusicDraft = (): MusicDraft => ({
  opening: emptyMusicSlot(),
  closing: emptyMusicSlot(),
  openingSong2: false,
  closingSong2: false,
});

function HeroSongPanel({ song, when }: { song: HeroSong; when: 'opening' | 'closing' }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const url = song.audioUrl.trim();

  useEffect(
    () => () => {
      audioRef.current?.pause();
      audioRef.current = null;
    },
    []
  );

  const togglePlay = () => {
    if (!url) return;
    if (playing && audioRef.current) {
      audioRef.current.pause();
      setPlaying(false);
      return;
    }
    audioRef.current?.pause();
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = () => setPlaying(false);
    audio.onerror = () => setPlaying(false);
    audio
      .play()
      .then(() => setPlaying(true))
      .catch(() => setPlaying(false));
  };

  return (
    <Box sx={{ textAlign: 'center', py: 2 }}>
      <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 1.5, fontWeight: 700 }}>
        {SONG_WHEN_LABELS[when]}
      </Typography>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          my: 2,
        }}
      >
        <IconButton
          onClick={togglePlay}
          disabled={!url}
          aria-label={playing ? 'Pause' : 'Lied abspielen'}
          sx={{
            position: 'relative',
            width: { xs: 120, sm: 140 },
            height: { xs: 120, sm: 140 },
            borderRadius: '50%',
            bgcolor: url ? 'primary.main' : 'action.disabledBackground',
            color: '#fff',
            '&:hover': { bgcolor: url ? 'primary.dark' : 'action.disabledBackground' },
            '&.Mui-disabled': { color: 'rgba(255,255,255,0.7)' },
          }}
        >
          <MusicNoteIcon sx={{ fontSize: { xs: 56, sm: 72 } }} />
          <Box
            sx={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              bgcolor: 'rgba(0,0,0,0.35)',
              borderRadius: '50%',
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {playing ? <PauseIcon /> : <PlayArrowIcon />}
          </Box>
        </IconButton>
      </Box>
      {song.title.trim() ? (
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
          {song.title.trim()}
        </Typography>
      ) : null}
      {song.task.trim() ? (
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 560, mx: 'auto', lineHeight: 1.6 }}>
          {song.task.trim()}
        </Typography>
      ) : null}
      {!url && (song.title.trim() || song.task.trim()) ? (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
          Zum Abspielen im Workout einen Audio-Link hinterlegen.
        </Typography>
      ) : null}
    </Box>
  );
}

function renderMusicDraftFields(
  label: string,
  slot: HeroMusicSlot,
  withSong2: boolean,
  onChange: (slot: HeroMusicSlot) => void,
  onToggleSong2: (on: boolean) => void
) {
  const updateSong = (which: 'song1' | 'song2', patch: Partial<HeroSong>) => {
    if (which === 'song1') {
      onChange({ ...slot, song1: { ...slot.song1, ...patch } });
      return;
    }
    const base = slot.song2 ?? emptySong();
    onChange({ ...slot, song2: { ...base, ...patch } });
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 800 }}>
        {label}
      </Typography>
      <TextField
        label="Liedtitel"
        fullWidth
        size="small"
        margin="dense"
        value={slot.song1.title}
        onChange={(e) => updateSong('song1', { title: e.target.value })}
        placeholder="z. B. Eye of the Tiger"
      />
      <TextField
        label="Aufgabe / Hinweis"
        fullWidth
        size="small"
        margin="dense"
        multiline
        minRows={2}
        value={slot.song1.task}
        onChange={(e) => updateSong('song1', { task: e.target.value })}
        placeholder="z. B. Beim Einlaufen mitsingen"
      />
      <TextField
        label="Audio-Link (MP3 oder direkte URL)"
        fullWidth
        size="small"
        margin="dense"
        value={slot.song1.audioUrl}
        onChange={(e) => updateSong('song1', { audioUrl: e.target.value })}
        placeholder="https://…"
        helperText="Wird in der Kartei über das große Noten-Symbol abgespielt"
      />
      <FormControlLabel
        control={<Checkbox checked={withSong2} onChange={(e) => onToggleSong2(e.target.checked)} />}
        label="Zweites Lied"
        sx={{ mt: 0.5 }}
      />
      {withSong2 && (
        <Box sx={{ pl: 1, borderLeft: '3px solid', borderColor: 'divider', mt: 1 }}>
          <TextField
            label="Liedtitel (2)"
            fullWidth
            size="small"
            margin="dense"
            value={slot.song2?.title ?? ''}
            onChange={(e) => updateSong('song2', { title: e.target.value })}
          />
          <TextField
            label="Aufgabe / Hinweis (2)"
            fullWidth
            size="small"
            margin="dense"
            multiline
            minRows={2}
            value={slot.song2?.task ?? ''}
            onChange={(e) => updateSong('song2', { task: e.target.value })}
          />
          <TextField
            label="Audio-Link (2)"
            fullWidth
            size="small"
            margin="dense"
            value={slot.song2?.audioUrl ?? ''}
            onChange={(e) => updateSong('song2', { audioUrl: e.target.value })}
          />
        </Box>
      )}
    </Box>
  );
}

export default function BeAHeroWorkoutsPage() {
  const navigate = useNavigate();
  const [workouts, setWorkouts] = useState<HeroWorkout[]>(() => loadWorkouts());
  const [playingWorkoutId, setPlayingWorkoutId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [workoutName, setWorkoutName] = useState('');
  const [draft, setDraft] = useState<Record<PhaseKey, HeroSlide[]>>(() => defaultDraftSections());
  const [musicDraft, setMusicDraft] = useState<MusicDraft>(() => defaultMusicDraft());
  const [playIndex, setPlayIndex] = useState(0);

  useEffect(() => {
    saveWorkouts(workouts);
  }, [workouts]);

  const playingWorkout = useMemo(
    () => workouts.find((w) => w.id === playingWorkoutId) ?? null,
    [workouts, playingWorkoutId]
  );

  const playQueue = useMemo(
    () => (playingWorkout ? buildPlayQueue(playingWorkout) : []),
    [playingWorkout]
  );

  const currentEntry = playQueue[playIndex];

  useEffect(() => {
    if (playQueue.length === 0) {
      setPlayIndex(0);
      return;
    }
    if (playIndex >= playQueue.length) {
      setPlayIndex(Math.max(0, playQueue.length - 1));
    }
  }, [playQueue.length, playIndex]);

  const startWorkout = (id: string) => {
    const w = workouts.find((x) => x.id === id);
    if (!w) return;
    const queue = buildPlayQueue(w);
    if (queue.length === 0) {
      window.alert('Dieses Workout hat noch keine Folien oder Lieder mit Inhalt.');
      return;
    }
    setPlayingWorkoutId(id);
    setPlayIndex(0);
  };

  const exitPlay = () => {
    setPlayingWorkoutId(null);
    setPlayIndex(0);
  };

  const openNew = () => {
    setEditingId(null);
    setWorkoutName('');
    setDraft(defaultDraftSections());
    setMusicDraft(defaultMusicDraft());
    setDialogOpen(true);
  };

  const openEdit = (w: HeroWorkout) => {
    setEditingId(w.id);
    setWorkoutName(w.name);
    const nonempty = (arr: HeroSlide[]) => (arr.length ? arr.map((s) => ({ ...s })) : [emptySlide()]);
    setDraft({
      warmup: nonempty(w.warmup),
      workout: nonempty(w.workout),
      cooldown: nonempty(w.cooldown),
    });
    setMusicDraft({
      opening: {
        song1: { ...w.openingMusic.song1 },
        song2: w.openingMusic.song2 ? { ...w.openingMusic.song2 } : null,
      },
      closing: {
        song1: { ...w.closingMusic.song1 },
        song2: w.closingMusic.song2 ? { ...w.closingMusic.song2 } : null,
      },
      openingSong2: !!w.openingMusic.song2,
      closingSong2: !!w.closingMusic.song2,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => setDialogOpen(false);

  const finalizeMusicSlot = (slot: HeroMusicSlot, withSong2: boolean): HeroMusicSlot => {
    const song1 = {
      title: slot.song1.title.trim(),
      task: slot.song1.task.trim(),
      audioUrl: slot.song1.audioUrl.trim(),
    };
    if (!withSong2) return { song1, song2: null };
    const s2 = slot.song2 ?? emptySong();
    const song2 = {
      title: s2.title.trim(),
      task: s2.task.trim(),
      audioUrl: s2.audioUrl.trim(),
    };
    return { song1, song2: songHasContent(song2) ? song2 : null };
  };

  const persistDraft = () => {
    const name = workoutName.trim();
    if (!name) return;
    const warmup = filterNonemptySlides(draft.warmup);
    const workout = filterNonemptySlides(draft.workout);
    const cooldown = filterNonemptySlides(draft.cooldown);
    const openingMusic = finalizeMusicSlot(musicDraft.opening, musicDraft.openingSong2);
    const closingMusic = finalizeMusicSlot(musicDraft.closing, musicDraft.closingSong2);
    const hasSlides = warmup.length + workout.length + cooldown.length > 0;
    const hasMusic =
      songHasContent(openingMusic.song1) ||
      songHasContent(openingMusic.song2) ||
      songHasContent(closingMusic.song1) ||
      songHasContent(closingMusic.song2);
    if (!hasSlides && !hasMusic) return;

    const payload = { name, warmup, workout, cooldown, openingMusic, closingMusic };
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

  const updateDraftSlide = (phase: PhaseKey, id: string, text: string) => {
    setDraft((prev) => ({
      ...prev,
      [phase]: prev[phase].map((s) => (s.id === id ? { ...s, text } : s)),
    }));
  };

  const addDraftSlide = (phase: PhaseKey) => {
    setDraft((prev) => ({ ...prev, [phase]: [...prev[phase], emptySlide()] }));
  };

  const removeDraftSlide = (phase: PhaseKey, id: string) => {
    setDraft((prev) => {
      const arr = prev[phase];
      if (arr.length <= 1) return prev;
      return { ...prev, [phase]: arr.filter((s) => s.id !== id) };
    });
  };

  const goPlayPrev = useCallback(() => {
    if (playQueue.length === 0) return;
    setPlayIndex((i) => (i <= 0 ? playQueue.length - 1 : i - 1));
  }, [playQueue.length]);

  const goPlayNext = useCallback(() => {
    if (playQueue.length === 0) return;
    setPlayIndex((i) => (i >= playQueue.length - 1 ? 0 : i + 1));
  }, [playQueue.length]);

  const phasePaperTint = (phase: PhaseKey) => {
    switch (phase) {
      case 'warmup':
        return 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)';
      case 'workout':
        return 'linear-gradient(135deg, #fce4ec 0%, #f8bbd9 100%)';
      case 'cooldown':
        return 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)';
      default:
        return 'linear-gradient(135deg, #e8eaf6 0%, #c5cae9 100%)';
    }
  };

  const renderDraftPhase = (phase: PhaseKey) => (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 800 }}>
        {PHASE_LABELS[phase]}
      </Typography>
      {draft[phase].map((s, idx) => (
        <Box key={s.id} sx={{ mb: 1.5, p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Folie {idx + 1}
            </Typography>
            {draft[phase].length > 1 && (
              <Button size="small" color="error" onClick={() => removeDraftSlide(phase, s.id)}>
                Entfernen
              </Button>
            )}
          </Stack>
          <SlideTextFieldWithFormatShortcuts
            label="Erklärung"
            fullWidth
            size="small"
            margin="dense"
            multiline
            minRows={2}
            value={s.text}
            onChange={(text) => updateDraftSlide(phase, s.id, text)}
            placeholder={
              phase === 'warmup'
                ? 'z. B. Schultern kreisen, langsam groß werden …'
                : phase === 'workout'
                  ? 'z. B. Hampelmänner – 30 Sekunden …'
                  : 'z. B. Ausatmen, locker durch die Knie …'
            }
            helperText="Tastatur: Strg/Cmd+B fett · Strg/Cmd+I kursiv · Strg/Cmd+U unterstreichen (<u>)"
          />
        </Box>
      ))}
      <Button startIcon={<AddIcon />} onClick={() => addDraftSlide(phase)} size="small">
        Folie hinzufügen
      </Button>
    </Box>
  );

  const renderPlayContent = () => {
    if (!playingWorkout || playQueue.length === 0 || !currentEntry) {
      return (
        <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
          Kein Inhalt zum Abspielen.
        </Typography>
      );
    }

    return (
      <>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Button size="small" onClick={exitPlay} startIcon={<ArrowBackIcon />}>
            Zur Liste
          </Button>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, textAlign: 'center', flex: 1, px: 1 }}>
            {playingWorkout.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ minWidth: 72, textAlign: 'right' }}>
            {playIndex + 1} / {playQueue.length}
          </Typography>
        </Stack>

        <Paper
          elevation={4}
          sx={{
            minHeight: 280,
            p: { xs: 2, sm: 3 },
            borderRadius: 3,
            background:
              currentEntry.kind === 'slide'
                ? phasePaperTint(currentEntry.phase)
                : 'linear-gradient(135deg, #fff8e1 0%, #ffe082 100%)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            border: '2px solid rgba(0,0,0,0.06)',
          }}
        >
          {currentEntry.kind === 'song' ? (
            <HeroSongPanel song={currentEntry.song} when={currentEntry.when} />
          ) : (
            <>
              <Typography
                variant="overline"
                sx={{ color: 'text.secondary', letterSpacing: 1.5, mb: 1.5, fontWeight: 700 }}
              >
                {PHASE_LABELS[currentEntry.phase]}
              </Typography>
              <HeroSlideMarkdownBody source={currentEntry.slide.text} />
            </>
          )}
        </Paper>

        <Stack direction="row" justifyContent="center" spacing={2} sx={{ mt: 2 }}>
          <Button startIcon={<ChevronLeftIcon />} onClick={goPlayPrev} variant="outlined" size="small">
            Zurück
          </Button>
          <Button endIcon={<ChevronRightIcon />} onClick={goPlayNext} variant="outlined" size="small">
            Weiter
          </Button>
        </Stack>
      </>
    );
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        maxWidth: '100vw',
        marginLeft: 'calc(50% - 50vw)',
        marginRight: 'calc(50% - 50vw)',
        boxSizing: 'border-box',
        background: 'linear-gradient(165deg, #1a237e 0%, #311b92 42%, #6a1b9a 100%)',
        py: 2,
        px: { xs: 1.5, sm: 2.5, md: 3 },
      }}
    >
      <Box sx={{ width: '100%', maxWidth: '100%', mx: 0 }}>
        <Tooltip title="Zurück zum Dashboard">
          <IconButton
            size="small"
            onClick={() => navigate('/dashboard')}
            aria-label="Zurück zum Dashboard"
            sx={{
              width: 28,
              height: 28,
              position: 'fixed',
              top: 24,
              left: '3vw',
              p: 0,
              zIndex: 1300,
              bgcolor: 'white',
              border: '1px solid rgba(0,0,0,0.12)',
              boxShadow: '0 4px 12px rgba(15,23,42,0.16)',
              '&:hover': { bgcolor: '#eef3f8' },
            }}
          >
            <ArrowBackIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>

        <Stack direction="row" alignItems="center" sx={{ mb: 2, minHeight: 36 }}>
          <Box sx={{ width: 36, flexShrink: 0 }} aria-hidden />
          <Typography variant="h5" sx={{ color: '#fff', fontWeight: 800, flex: 1, textAlign: 'center' }}>
            Be a Hero
          </Typography>
          <Typography
            component="span"
            sx={{ width: 36, flexShrink: 0, textAlign: 'right', fontSize: '1.75rem', lineHeight: 1 }}
            aria-hidden
          >
            🦸
          </Typography>
        </Stack>

        <Card sx={{ borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            {playingWorkoutId ? (
              renderPlayContent()
            ) : (
              <Box>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  justifyContent="space-between"
                  alignItems={{ xs: 'stretch', sm: 'center' }}
                  spacing={1}
                  sx={{ mb: 2 }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Workout antippen zum Starten · Stift zum Bearbeiten
                  </Typography>
                  <Button variant="contained" startIcon={<AddIcon />} onClick={openNew} size="small">
                    Neues Workout
                  </Button>
                </Stack>
                {workouts.length === 0 ? (
                  <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                    Noch keine Workouts. Lege mit „Neues Workout“ los.
                  </Typography>
                ) : (
                  <List disablePadding>
                    {workouts.map((w) => (
                      <React.Fragment key={w.id}>
                        <ListItem
                          disablePadding
                          secondaryAction={
                            <Stack direction="row" spacing={0.5}>
                              <Tooltip title="Bearbeiten">
                                <IconButton
                                  edge="end"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEdit(w);
                                  }}
                                  size="small"
                                  aria-label="Bearbeiten"
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Löschen">
                                <IconButton
                                  edge="end"
                                  onClick={(e) => removeWorkout(w.id, e)}
                                  size="small"
                                  aria-label="Löschen"
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          }
                        >
                          <ListItemButton onClick={() => startWorkout(w.id)} sx={{ py: 1.5, pr: 10 }}>
                            <ListItemText
                              primary={w.name}
                              secondary={`${playStepCount(w)} Schritt${playStepCount(w) === 1 ? '' : 'e'} · ${slideCount(w)} Folie${slideCount(w) === 1 ? '' : 'n'}`}
                              primaryTypographyProps={{ fontWeight: 700 }}
                            />
                          </ListItemButton>
                        </ListItem>
                        <Divider component="li" />
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>

      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        fullWidth
        maxWidth={false}
        PaperProps={{
          sx: {
            width: { xs: 'calc(100vw - 16px)', sm: 'calc(100vw - 48px)' },
            maxWidth: 'none',
            m: { xs: 1, sm: 3 },
          },
        }}
      >
        <DialogTitle sx={{ ...dialogCloseTitleSx, bgcolor: '#4527a0', color: '#fff' }}>
          <Typography variant="h6" component="span">
            {editingId ? 'Workout bearbeiten' : 'Neues Workout'}
          </Typography>
          <DialogCloseIconButton
            onClose={closeDialog}
            sx={{ color: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' } }}
            iconSx={{ color: '#fff' }}
          />
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            label="Name des Workouts"
            fullWidth
            margin="normal"
            value={workoutName}
            onChange={(e) => setWorkoutName(e.target.value)}
            placeholder="z. B. Helden-Runde 10 Min"
          />
          {renderMusicDraftFields(
            'Startmusik',
            musicDraft.opening,
            musicDraft.openingSong2,
            (opening) => setMusicDraft((m) => ({ ...m, opening })),
            (openingSong2) =>
              setMusicDraft((m) => ({
                ...m,
                openingSong2,
                opening: {
                  ...m.opening,
                  song2: openingSong2 ? m.opening.song2 ?? emptySong() : null,
                },
              }))
          )}
          <Divider sx={{ my: 2 }} />
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            Folien: **fett**, *kursiv* · Strg/Cmd+B, I, U
          </Typography>
          {renderDraftPhase('warmup')}
          <Divider sx={{ my: 2 }} />
          {renderDraftPhase('workout')}
          <Divider sx={{ my: 2 }} />
          {renderDraftPhase('cooldown')}
          <Divider sx={{ my: 2 }} />
          {renderMusicDraftFields(
            'Abschlussmusik',
            musicDraft.closing,
            musicDraft.closingSong2,
            (closing) => setMusicDraft((m) => ({ ...m, closing })),
            (closingSong2) =>
              setMusicDraft((m) => ({
                ...m,
                closingSong2,
                closing: {
                  ...m.closing,
                  song2: closingSong2 ? m.closing.song2 ?? emptySong() : null,
                },
              }))
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeDialog}>Abbrechen</Button>
          <Button variant="contained" onClick={persistDraft}>
            Speichern
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
