import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  Paper,
  Link,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Stack,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  AutoStories as AutoStoriesIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Pause as PauseIcon,
  SkipNext as SkipNextIcon,
  SkipPrevious as SkipPreviousIcon,
} from '@mui/icons-material';
import { MOVEMENT_STORIES } from '../data/movementStories';

const WIMASU_URL = 'https://wimasu.de/bewegungsgeschichten-fuer-sportlehrkraefte/';

export default function MovementStoriesPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const story = MOVEMENT_STORIES[tab];
  const headerGradient = 'linear-gradient(135deg, #3949ab 0%, #5c6bc0 45%, #00796b 100%)';
  const [ttsActive, setTtsActive] = useState(false);
  const [ttsPaused, setTtsPaused] = useState(false);
  const [ttsIndex, setTtsIndex] = useState<number | null>(null);
  const [ttsRate, setTtsRate] = useState(1.0);
  const [ttsVoiceURI, setTtsVoiceURI] = useState<string>('');
  const [ttsVoices, setTtsVoices] = useState<SpeechSynthesisVoice[]>([]);
  const runIdRef = useRef(0);
  const ttsRateRef = useRef(ttsRate);
  const ttsVoiceURIRef = useRef(ttsVoiceURI);
  const ttsVoicesRef = useRef(ttsVoices);

  useEffect(() => {
    ttsRateRef.current = ttsRate;
  }, [ttsRate]);

  useEffect(() => {
    ttsVoiceURIRef.current = ttsVoiceURI;
  }, [ttsVoiceURI]);

  useEffect(() => {
    ttsVoicesRef.current = ttsVoices;
  }, [ttsVoices]);

  const stopTts = () => {
    runIdRef.current += 1;
    try {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    } catch {
      /* ignore */
    }
    setTtsActive(false);
    setTtsPaused(false);
    setTtsIndex(null);
  };

  useEffect(() => {
    stopTts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    return () => stopTts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const synth = window.speechSynthesis;

    const updateVoices = () => {
      const list = synth.getVoices?.() ?? [];
      setTtsVoices(list);
      setTtsVoiceURI((prev) => prev || list[0]?.voiceURI || '');
    };

    updateVoices();
    synth.onvoiceschanged = updateVoices;
    return () => {
      try {
        synth.onvoiceschanged = null;
      } catch {
        /* ignore */
      }
    };
  }, []);

  const pauseTts = () => {
    if (!ttsActive || ttsPaused) return;
    try {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.pause();
        setTtsPaused(true);
      }
    } catch {
      /* ignore */
    }
  };

  const resumeTts = () => {
    if (!ttsActive || !ttsPaused) return;
    try {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.resume();
        setTtsPaused(false);
      }
    } catch {
      /* ignore */
    }
  };

  const speakStep = (index: number, runId: number) => {
    if (runId !== runIdRef.current) return;
    const beats = story.beats;
    if (!Array.isArray(beats) || beats.length === 0) return;
    if (index < 0 || index >= beats.length) return;

    setTtsIndex(index);

    const narration = beats[index]?.narration?.trim() ?? '';
    if (!narration) {
      if (index + 1 < beats.length) speakStep(index + 1, runId);
      else {
        setTtsActive(false);
        setTtsPaused(false);
        setTtsIndex(null);
      }
      return;
    }

    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const synth = window.speechSynthesis;

    const utter = new SpeechSynthesisUtterance(narration);
    utter.lang = 'de-DE';
    utter.rate = ttsRateRef.current;
    utter.pitch = 1;

    const voices = ttsVoicesRef.current;
    const selectedVoice = voices.find((v) => v.voiceURI === ttsVoiceURIRef.current);
    if (selectedVoice) utter.voice = selectedVoice;

    utter.onend = () => {
      if (runId !== runIdRef.current) return;
      if (index + 1 < beats.length) speakStep(index + 1, runId);
      else {
        setTtsActive(false);
        setTtsPaused(false);
        setTtsIndex(null);
      }
    };

    utter.onerror = () => {
      if (runId !== runIdRef.current) return;
      if (index + 1 < beats.length) speakStep(index + 1, runId);
      else {
        setTtsActive(false);
        setTtsPaused(false);
        setTtsIndex(null);
      }
    };

    try {
      synth.speak(utter);
    } catch {
      utter.onend?.(undefined as any);
    }
  };

  const startTts = (fromIndex: number) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const beats = story.beats;
    if (!Array.isArray(beats) || beats.length === 0) return;

    runIdRef.current += 1;
    const runId = runIdRef.current;

    try {
      window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }

    setTtsActive(true);
    setTtsPaused(false);
    const clamped = Math.max(0, Math.min(fromIndex, beats.length - 1));
    setTtsIndex(clamped);
    speakStep(clamped, runId);
  };

  const goPrevTts = () => {
    const beats = story.beats;
    if (!Array.isArray(beats) || beats.length === 0) return;
    const current = ttsIndex ?? 0;
    startTts(Math.max(0, current - 1));
  };

  const goNextTts = () => {
    const beats = story.beats;
    if (!Array.isArray(beats) || beats.length === 0) return;
    const current = ttsIndex ?? 0;
    startTts(Math.min(beats.length - 1, current + 1));
  };

  const handlePlayPause = () => {
    if (ttsActive && ttsPaused) return resumeTts();
    if (ttsActive) return;
    startTts(ttsIndex ?? 0);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#eceff1' }}>
      <Box
        sx={{
          background: headerGradient,
          py: 2,
          px: { xs: 1.5, sm: 3 },
          pb: 3,
        }}
      >
        <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Tooltip title="Zurück">
              <IconButton
                onClick={() => navigate(-1)}
                size="small"
                sx={{
                  p: 0,
                  minWidth: 28,
                  width: 28,
                  height: 28,
                  color: 'white',
                  bgcolor: 'rgba(0,0,0,0.22)',
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.38)' },
                }}
                aria-label="Zurück"
              >
                <ArrowBackIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </Tooltip>
            <AutoStoriesIcon sx={{ color: 'white', fontSize: 26 }} />
            <Typography component="h1" sx={{ color: 'white', fontWeight: 800, fontSize: '1.15rem' }}>
              Bewegungsgeschichten (Klassiker)
            </Typography>
          </Box>
          <Typography sx={{ color: 'rgba(255,255,255,0.92)', fontSize: '0.9rem', lineHeight: 1.55, mb: 0 }}>
            Geschichte mit Bewegungen verknüpfen – zu jedem Abschnitt gehört die passende Bewegung direkt
            daneben. Gut zum Aufwärmen ohne Material. Zuerst die Kommandos langsam üben, dann Tempo
            steigern.
          </Typography>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 1.5, sm: 3 }, py: 2, pb: 4 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            mb: 2,
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 700 },
          }}
        >
          {MOVEMENT_STORIES.map((s, i) => (
            <Tab key={s.id} label={s.title} value={i} />
          ))}
        </Tabs>

        <Typography variant="subtitle2" color="primary" sx={{ mb: 2, fontWeight: 700 }}>
          {story.subtitle}
        </Typography>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', mb: 2 }}>
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel id="tts-voice-label-page">Stimme</InputLabel>
            <Select
              labelId="tts-voice-label-page"
              value={ttsVoiceURI}
              label="Stimme"
              onChange={(e) => setTtsVoiceURI(e.target.value)}
              disabled={ttsVoices.length === 0}
            >
              {ttsVoices.map((v) => (
                <MenuItem key={v.voiceURI} value={v.voiceURI}>
                  {v.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ minWidth: 260 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, display: 'block', mb: 0.25 }}>
              Tempo {Math.round(ttsRate * 100)}%
            </Typography>
            <Slider
              value={ttsRate}
              min={0.7}
              max={1.3}
              step={0.05}
              onChange={(_, v) => setTtsRate(typeof v === 'number' ? v : v[0])}
              aria-label="Sprechgeschwindigkeit"
              size="small"
            />
          </Box>

          <Tooltip title="Zurück">
            <IconButton
              onClick={goPrevTts}
              disabled={!ttsActive || (ttsIndex ?? 0) <= 0}
              sx={{
                p: 0.5,
                minWidth: 32,
                width: 32,
                height: 32,
                borderRadius: 1.4,
                color: 'white',
                bgcolor: 'rgba(21, 101, 192, 0.65)',
                '&:hover': { bgcolor: 'rgba(21, 101, 192, 0.95)' },
                transition: 'all 0.2s ease',
              }}
              aria-label="Vorleseabschnitt zurück"
            >
              <SkipPreviousIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>

          <Tooltip title={ttsActive && ttsPaused ? 'Weiter' : 'Vorlesen'}>
            <IconButton
              onClick={handlePlayPause}
              disabled={!story?.beats?.length}
              sx={{
                p: 0.5,
                minWidth: 32,
                width: 32,
                height: 32,
                borderRadius: 1.4,
                color: 'white',
                bgcolor: 'linear-gradient(135deg, #5c6bc0 0%, #3949ab 100%)',
                boxShadow: '0 2px 8px rgba(57, 73, 171, 0.25)',
                '&:hover': { bgcolor: 'linear-gradient(135deg, #3949ab 0%, #5c6bc0 100%)' },
                transition: 'all 0.2s ease',
              }}
              aria-label="Vorlesen starten"
            >
              <PlayIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Pause">
            <IconButton
              onClick={pauseTts}
              disabled={!ttsActive || ttsPaused}
              sx={{
                p: 0.5,
                minWidth: 32,
                width: 32,
                height: 32,
                borderRadius: 1.4,
                color: 'white',
                bgcolor: '#616161',
                '&:hover': { bgcolor: '#424242' },
                transition: 'all 0.2s ease',
              }}
              aria-label="Vorlesen pausieren"
            >
              <PauseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Stoppen">
            <IconButton
              onClick={stopTts}
              disabled={!ttsActive}
              sx={{
                p: 0.5,
                minWidth: 32,
                width: 32,
                height: 32,
                borderRadius: 1.4,
                color: 'white',
                bgcolor: '#d32f2f',
                '&:hover': { bgcolor: '#b71c1c' },
                transition: 'all 0.2s ease',
              }}
              aria-label="Vorlesen stoppen"
            >
              <StopIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Vorwärts">
            <IconButton
              onClick={goNextTts}
              disabled={!ttsActive || (ttsIndex ?? 0) >= story.beats.length - 1}
              sx={{
                p: 0.5,
                minWidth: 32,
                width: 32,
                height: 32,
                borderRadius: 1.4,
                color: 'white',
                bgcolor: 'rgba(0, 137, 123, 0.7)',
                '&:hover': { bgcolor: 'rgba(0, 137, 123, 0.95)' },
                transition: 'all 0.2s ease',
              }}
              aria-label="Vorleseabschnitt vorwärts"
            >
              <SkipNextIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>

          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
            {ttsActive
              ? ttsPaused
                ? `Vorlesen pausiert – Schritt ${ttsIndex !== null ? ttsIndex + 1 : '…'}`
                : `Vorlesen läuft – Schritt ${ttsIndex !== null ? ttsIndex + 1 : '…'}`
              : 'Vorlesen optional (Text-to-Speech)'}
          </Typography>
        </Box>

        <Box
          sx={{
            borderRadius: 2,
            overflow: 'hidden',
            mb: 2,
            boxShadow: '0 8px 28px rgba(25, 40, 80, 0.12)',
            border: '1px solid rgba(0,0,0,0.06)',
          }}
        >
          <Box
            component="img"
            src={story.imageUrl}
            alt={story.imageAlt}
            sx={{
              width: '100%',
              height: { xs: 200, sm: 240 },
              objectFit: 'cover',
              display: 'block',
            }}
          />
        </Box>

        <Stack spacing={1.75}>
          {story.beats.map((b, i) => (
            <Paper
              key={i}
              elevation={0}
              sx={{
                p: { xs: 1.5, sm: 2 },
                borderRadius: 2,
                border: '1px solid rgba(0,0,0,0.08)',
                bgcolor: ttsActive && ttsIndex === i ? 'rgba(0, 121, 107, 0.08)' : '#fff',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', md: 'row' },
                  gap: { xs: 1.25, md: 2 },
                  alignItems: { md: 'flex-start' },
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    component="span"
                    variant="caption"
                    sx={{ color: 'text.secondary', fontWeight: 800, display: 'block', mb: 0.5 }}
                  >
                    Schritt {i + 1} · Erzählung
                    {ttsActive && ttsIndex === i ? (ttsPaused ? ' (pausiert)' : ' (wird vorgelesen)') : ''}
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      lineHeight: 1.75,
                      color: '#37474f',
                      fontSize: '0.98rem',
                    }}
                  >
                    {b.narration}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: { xs: '100%', md: 300 },
                    flexShrink: 0,
                    p: 1.25,
                    borderRadius: 1.5,
                    bgcolor: 'rgba(0, 121, 107, 0.08)',
                    borderLeft: '4px solid #00796b',
                  }}
                >
                  <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 800, display: 'block', mb: 0.35 }}>
                    Bewegung
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.45, color: '#1b5e20' }}>
                    {b.movement}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          ))}
        </Stack>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3, lineHeight: 1.6 }}>
          Inhaltliche Vorlage nach Ch. Walther / S. Verlemann (2022), „Klassiker der
          Bewegungsgeschichten für Sportlehrkräfte“,{' '}
          <Link href={WIMASU_URL} target="_blank" rel="noopener noreferrer" underline="hover">
            wimasu.de
          </Link>
          . Umsetzung für den Unterricht in dieser App.
        </Typography>
      </Box>
    </Box>
  );
}
